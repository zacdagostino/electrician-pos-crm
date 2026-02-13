import { randomUUID } from "crypto";
import { SWILibraryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";

type Params = { params: Promise<{ serviceId: string }> };

type AiMeta = {
  jobName: string;
  classification: string;
  standards: string;
  equipment: string;
  parts: string;
  whoCanPerform: "licensed" | "apprentice" | "apprentice-supervised" | "";
};

type AiPhase = {
  title: string;
  description: string;
  locked: boolean;
};

type AiStep = {
  phaseTitle: string;
  title: string;
  whatToDo: string[];
  why: string;
  ppe: string[];
  tools: string[];
  parts: string[];
  tests: string[];
  hazards: string[];
  photoRequired: string;
  gate: boolean;
  stopAndThink: boolean;
  caution: string;
  who: "licensed" | "apprentice" | "apprentice-supervised" | "any";
  notes: string;
};

type AiParsed = {
  meta: AiMeta;
  phases: AiPhase[];
  steps: AiStep[];
};

type SynchronizedStep = Omit<AiStep, "phaseTitle"> & {
  phaseId: string;
  id: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const TRANSIENT_OPENAI_STATUSES = new Set([429, 500, 502, 503, 504]);

const LIBRARY_FIELD_TO_TYPE: Record<"ppe" | "tools" | "parts" | "tests" | "hazards", SWILibraryType> = {
  ppe: "ppe",
  tools: "tool",
  parts: "part",
  tests: "test",
  hazards: "hazard",
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

const sanitizeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const sanitizeList = (value: unknown) => {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.map((item) => sanitizeString(item)).filter(Boolean)));
};

const sanitizeBool = (value: unknown) => value === true;

const sanitizeWho = (value: unknown): AiStep["who"] => {
  if (value === "licensed" || value === "apprentice" || value === "apprentice-supervised") {
    return value;
  }
  return "any";
};

const sanitizeMetaWho = (value: unknown): AiMeta["whoCanPerform"] => {
  if (value === "licensed" || value === "apprentice" || value === "apprentice-supervised") {
    return value;
  }
  return "";
};

const dedupe = (values: string[]) =>
  values
    .map((value) => sanitizeString(value))
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);

const splitInstructionLines = (instruction: string) =>
  instruction
    .split(/\n|[.;](?:\s+|$)/g)
    .map((line) => line.trim())
    .filter(Boolean);

const sanitizeAiPayload = (payload: unknown, serviceName: string): AiParsed => {
  const data = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const rawMeta = data.meta && typeof data.meta === "object" ? (data.meta as Record<string, unknown>) : {};
  const rawPhases = Array.isArray(data.phases) ? data.phases : [];
  const rawSteps = Array.isArray(data.steps) ? data.steps : [];

  const phases = rawPhases
    .map((phase) => {
      const item = phase && typeof phase === "object" ? (phase as Record<string, unknown>) : {};
      return {
        title: sanitizeString(item.title),
        description: sanitizeString(item.description),
        locked: sanitizeBool(item.locked),
      };
    })
    .filter((phase) => phase.title);

  const steps = rawSteps
    .map((step) => {
      const item = step && typeof step === "object" ? (step as Record<string, unknown>) : {};
      const whatToDo = sanitizeList(item.whatToDo);
      const title = sanitizeString(item.title) || whatToDo[0] || "";
      return {
        phaseTitle: sanitizeString(item.phaseTitle),
        title,
        whatToDo,
        why: sanitizeString(item.why),
        ppe: sanitizeList(item.ppe),
        tools: sanitizeList(item.tools),
        parts: sanitizeList(item.parts),
        tests: sanitizeList(item.tests),
        hazards: sanitizeList(item.hazards),
        photoRequired: sanitizeString(item.photoRequired),
        gate: sanitizeBool(item.gate),
        stopAndThink: sanitizeBool(item.stopAndThink),
        caution: sanitizeString(item.caution),
        who: sanitizeWho(item.who),
        notes: sanitizeString(item.notes),
      };
    })
    .filter((step) => step.title || step.whatToDo.length > 0);

  const normalizedPhases = phases.length
    ? phases
    : [
        {
          title: "Main work",
          description: "",
          locked: false,
        },
      ];

  return {
    meta: {
      jobName: sanitizeString(rawMeta.jobName) || serviceName,
      classification: sanitizeString(rawMeta.classification),
      standards: sanitizeString(rawMeta.standards),
      equipment: sanitizeString(rawMeta.equipment),
      parts: sanitizeString(rawMeta.parts),
      whoCanPerform: sanitizeMetaWho(rawMeta.whoCanPerform),
    },
    phases: normalizedPhases,
    steps,
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readCompletionText = (aiPayload: unknown) => {
  const choice = (aiPayload as { choices?: Array<{ message?: { content?: unknown; refusal?: unknown } }> })?.choices?.[0];
  const message = choice?.message;
  if (!message) return { text: "", refusal: "" };

  if (typeof message.content === "string") {
    return { text: message.content, refusal: "" };
  }

  if (Array.isArray(message.content)) {
    const joined = message.content
      .map((part) => {
        if (!part || typeof part !== "object") return "";
        const typed = part as { type?: unknown; text?: unknown };
        return typed.type === "text" && typeof typed.text === "string" ? typed.text : "";
      })
      .join("\n")
      .trim();
    return { text: joined, refusal: "" };
  }

  return {
    text: "",
    refusal: typeof message.refusal === "string" ? message.refusal : "",
  };
};

const stripCodeFence = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
};

const createSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    meta: {
      type: "object",
      additionalProperties: false,
      properties: {
        jobName: { type: "string" },
        classification: { type: "string" },
        standards: { type: "string" },
        equipment: { type: "string" },
        parts: { type: "string" },
        whoCanPerform: {
          type: "string",
          enum: ["licensed", "apprentice", "apprentice-supervised", ""],
        },
      },
      required: ["jobName", "classification", "standards", "equipment", "parts", "whoCanPerform"],
    },
    phases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          locked: { type: "boolean" },
        },
        required: ["title", "description", "locked"],
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          phaseTitle: { type: "string" },
          title: { type: "string" },
          whatToDo: { type: "array", items: { type: "string" } },
          why: { type: "string" },
          ppe: { type: "array", items: { type: "string" } },
          tools: { type: "array", items: { type: "string" } },
          parts: { type: "array", items: { type: "string" } },
          tests: { type: "array", items: { type: "string" } },
          hazards: { type: "array", items: { type: "string" } },
          photoRequired: { type: "string" },
          gate: { type: "boolean" },
          stopAndThink: { type: "boolean" },
          caution: { type: "string" },
          who: {
            type: "string",
            enum: ["licensed", "apprentice", "apprentice-supervised", "any"],
          },
          notes: { type: "string" },
        },
        required: [
          "phaseTitle",
          "title",
          "whatToDo",
          "why",
          "ppe",
          "tools",
          "parts",
          "tests",
          "hazards",
          "photoRequired",
          "gate",
          "stopAndThink",
          "caution",
          "who",
          "notes",
        ],
      },
    },
  },
  required: ["meta", "phases", "steps"],
} as const;

const getServiceId = async (params: Params["params"]) => {
  const resolved = await params;
  return resolved.serviceId;
};

export const POST = async (req: Request, { params }: Params) => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return NextResponse.json({ error: "No org selected" }, { status: 400 });
  }

  const serviceId = await getServiceId(params);
  const service = await db.service.findFirst({ where: { id: serviceId, orgId } });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const instruction = sanitizeString((body as { instruction?: unknown })?.instruction);
  if (!instruction) {
    return NextResponse.json({ error: "Instruction is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  const library = await db.sWILibraryItem.findMany({
    where: { orgId, type: { in: ["ppe", "tool", "part", "test", "hazard"] } },
    orderBy: { createdAt: "desc" },
  });

  const libraryContext = [
    `PPE: ${library.filter((item) => item.type === "ppe").map((item) => item.name).join(", ") || "none"}`,
    `Tools: ${library.filter((item) => item.type === "tool").map((item) => item.name).join(", ") || "none"}`,
    `Parts: ${library.filter((item) => item.type === "part").map((item) => item.name).join(", ") || "none"}`,
    `Tests: ${library.filter((item) => item.type === "test").map((item) => item.name).join(", ") || "none"}`,
    `Hazards: ${library.filter((item) => item.type === "hazard").map((item) => item.name).join(", ") || "none"}`,
  ].join("\n");

  const systemPrompt = [
    "You generate structured Safe Work Instruction (SWI) drafts for electrical services.",
    "Return JSON only and strictly follow the response schema.",
    "Use clear, practical step titles and concise actions.",
    "Prefer using existing library item names when available.",
    "If an item is missing, you may introduce a new concise name.",
    "Keep whatToDo short bullet-style lines.",
  ].join(" ");

  const userPrompt = [
    `Service: ${service.name}`,
    `Instruction:\n${instruction}`,
    "\nExisting library (reuse these names where possible):",
    libraryContext,
  ].join("\n\n");

  let aiPayload: unknown = {};
  let lastErrorDetails = "";

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const aiResponse = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "swi_generation",
            strict: true,
            schema: createSchema,
          },
        },
      }),
    });

    if (aiResponse.ok) {
      aiPayload = await aiResponse.json().catch(() => ({}));
      lastErrorDetails = "";
      break;
    }

    const errorPayload = await aiResponse.text().catch(() => "");
    lastErrorDetails = errorPayload.slice(0, 500);

    if (TRANSIENT_OPENAI_STATUSES.has(aiResponse.status) && attempt < 2) {
      await sleep(400);
      continue;
    }

    return NextResponse.json(
      { error: "AI generation failed.", details: lastErrorDetails || `HTTP ${aiResponse.status}` },
      { status: 502 }
    );
  }

  const extracted = readCompletionText(aiPayload);
  if (!extracted.text) {
    if (extracted.refusal) {
      return NextResponse.json(
        { error: "AI could not generate this instruction.", details: extracted.refusal.slice(0, 500) },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "AI response format was invalid.", details: lastErrorDetails || "No assistant content returned." },
      { status: 502 }
    );
  }

  let parsedResponse: unknown;
  try {
    parsedResponse = JSON.parse(stripCodeFence(extracted.text));
  } catch {
    return NextResponse.json({ error: "AI response was not valid JSON." }, { status: 502 });
  }

  const parsed = sanitizeAiPayload(parsedResponse, service.name);

  const phaseIdByTitle = new Map<string, string>();
  const phases = parsed.phases.map((phase) => {
    const id = randomUUID();
    phaseIdByTitle.set(normalize(phase.title), id);
    return { id, ...phase };
  });

  const defaultPhaseId = phases[0]?.id;
  if (!defaultPhaseId) {
    return NextResponse.json({ error: "Unable to create phases." }, { status: 500 });
  }

  const existingByType = library.reduce<Record<SWILibraryType, Map<string, string>>>(
    (acc, item) => {
      acc[item.type].set(normalize(item.name), item.name);
      return acc;
    },
    {
      ppe: new Map<string, string>(),
      tool: new Map<string, string>(),
      part: new Map<string, string>(),
      test: new Map<string, string>(),
      hazard: new Map<string, string>(),
      step: new Map<string, string>(),
      definition: new Map<string, string>(),
    }
  );

  const missingByType: Record<SWILibraryType, string[]> = {
    ppe: [],
    tool: [],
    part: [],
    test: [],
    hazard: [],
    step: [],
    definition: [],
  };

  const synchronizeNames = (field: keyof typeof LIBRARY_FIELD_TO_TYPE, values: string[]) => {
    const type = LIBRARY_FIELD_TO_TYPE[field];
    const typeMap = existingByType[type];

    return values
      .map((name) => sanitizeString(name))
      .filter(Boolean)
      .map((name) => {
        const key = normalize(name);
        const existing = typeMap.get(key);
        if (existing) return existing;
        typeMap.set(key, name);
        missingByType[type].push(name);
        return name;
      })
      .filter((name, index, arr) => arr.indexOf(name) === index);
  };

  const normalizedRawSteps =
    parsed.steps.length > 0
      ? parsed.steps
      : splitInstructionLines(instruction).map((line, index) => ({
          phaseTitle: phases[0]?.title ?? "Main work",
          title: line.length > 72 ? `${line.slice(0, 69)}...` : line,
          whatToDo: [line],
          why: "",
          ppe: [] as string[],
          tools: [] as string[],
          parts: [] as string[],
          tests: [] as string[],
          hazards: [] as string[],
          photoRequired: "",
          gate: false,
          stopAndThink: false,
          caution: "",
          who: "any" as const,
          notes: index === 0 ? "Generated from plain text instruction." : "",
        }));

  const steps: SynchronizedStep[] = normalizedRawSteps.map((step) => {
    const phaseId = phaseIdByTitle.get(normalize(step.phaseTitle)) ?? defaultPhaseId;

    return {
      id: randomUUID(),
      phaseId,
      title: step.title,
      whatToDo: step.whatToDo,
      why: step.why,
      ppe: synchronizeNames("ppe", step.ppe),
      tools: synchronizeNames("tools", step.tools),
      parts: synchronizeNames("parts", step.parts),
      tests: synchronizeNames("tests", step.tests),
      hazards: synchronizeNames("hazards", step.hazards),
      photoRequired: step.photoRequired,
      gate: step.gate,
      stopAndThink: step.stopAndThink,
      caution: step.caution,
      who: step.who,
      notes: step.notes,
    };
  });

  const createPayload = (Object.keys(missingByType) as SWILibraryType[]).flatMap((type) => {
    if (type === "step" || type === "definition") return [];
    return Array.from(new Set(missingByType[type])).map((name) => ({
      orgId,
      type,
      name,
      usage: null,
      howTo: null,
    }));
  });

  if (createPayload.length) {
    await db.sWILibraryItem.createMany({ data: createPayload });
  }

  const createdLibraryItems = createPayload.map((item) => ({ type: item.type, name: item.name }));
  const equipmentFromSteps = dedupe(steps.flatMap((step) => [...step.tools, ...step.ppe]));
  const partsFromSteps = dedupe(steps.flatMap((step) => step.parts));
  const nextMeta: AiMeta = {
    ...parsed.meta,
    equipment: parsed.meta.equipment || equipmentFromSteps.join(", "),
    parts: parsed.meta.parts || partsFromSteps.join(", "),
  };

  return NextResponse.json({
    content: {
      meta: nextMeta,
      phases,
      steps,
    },
    createdLibraryItems,
  });
};
