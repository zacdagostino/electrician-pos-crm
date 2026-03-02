import { MessagingMessageStatus, type MessengerIntegration } from "@prisma/client";
import { db } from "@/lib/db";

const GRAPH_API_BASE = "https://graph.facebook.com/v23.0";
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const getMetaAppConfig = () => {
  const appId = process.env.META_APP_ID?.trim();
  const appSecret = process.env.META_APP_SECRET?.trim();
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN?.trim();
  return {
    appId,
    appSecret,
    verifyToken,
    configured: Boolean(appId && appSecret && verifyToken),
  };
};

const getOpenAiConfig = () => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  return { apiKey, model, configured: Boolean(apiKey) };
};

const parseJsonSafe = async (res: Response) => {
  return res.json().catch(() => ({})) as Promise<Record<string, unknown>>;
};

export const buildMetaOAuthUrl = (origin: string, state: string) => {
  const cfg = getMetaAppConfig();
  if (!cfg.appId) throw new Error("META_APP_ID is missing.");
  const callback = `${origin}/api/settings/messaging/facebook/callback`;
  const params = new URLSearchParams({
    client_id: cfg.appId,
    redirect_uri: callback,
    state,
    response_type: "code",
    scope: "pages_show_list,pages_manage_metadata,pages_messaging",
  });
  return `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;
};

export const exchangeFacebookCode = async (origin: string, code: string) => {
  const cfg = getMetaAppConfig();
  if (!cfg.appId || !cfg.appSecret) {
    throw new Error("META_APP_ID / META_APP_SECRET is missing.");
  }

  const redirectUri = `${origin}/api/settings/messaging/facebook/callback`;
  const params = new URLSearchParams({
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
  const payload = await parseJsonSafe(res);
  if (!res.ok || typeof payload.access_token !== "string") {
    throw new Error(String(payload.error?.toString?.() ?? payload.error_description ?? "Unable to exchange Facebook code."));
  }

  return String(payload.access_token);
};

export const listFacebookPages = async (userAccessToken: string) => {
  const params = new URLSearchParams({
    access_token: userAccessToken,
    fields: "id,name,access_token,tasks",
  });
  const res = await fetch(`${GRAPH_API_BASE}/me/accounts?${params.toString()}`);
  const payload = await parseJsonSafe(res);
  if (!res.ok || !Array.isArray(payload.data)) {
    throw new Error("Unable to fetch Facebook pages for this account.");
  }

  return (payload.data as Array<Record<string, unknown>>)
    .map((page) => ({
      id: String(page.id ?? ""),
      name: String(page.name ?? ""),
      accessToken: String(page.access_token ?? ""),
      tasks: Array.isArray(page.tasks) ? page.tasks.map((task) => String(task)) : [],
    }))
    .filter((page) => page.id && page.name && page.accessToken);
};

export const subscribeAppToFacebookPage = async (pageId: string, pageAccessToken: string) => {
  const params = new URLSearchParams({ access_token: pageAccessToken });
  const res = await fetch(`${GRAPH_API_BASE}/${encodeURIComponent(pageId)}/subscribed_apps?${params.toString()}`, {
    method: "POST",
  });
  const payload = await parseJsonSafe(res);
  if (!res.ok) {
    throw new Error(String(payload.error?.toString?.() ?? "Unable to subscribe app to page."));
  }
};

export const sendFacebookPageMessage = async (input: {
  pageId: string;
  pageAccessToken: string;
  recipientId: string;
  text: string;
}) => {
  const body = {
    recipient: { id: input.recipientId },
    messaging_type: "RESPONSE",
    message: { text: input.text },
  };

  const params = new URLSearchParams({ access_token: input.pageAccessToken });
  const res = await fetch(`${GRAPH_API_BASE}/${encodeURIComponent(input.pageId)}/messages?${params.toString()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = await parseJsonSafe(res);
  if (!res.ok || typeof payload.message_id !== "string") {
    throw new Error(String(payload.error?.toString?.() ?? "Unable to send Messenger message."));
  }

  return {
    messageId: String(payload.message_id),
  };
};

export const generateMessengerDraft = async (input: {
  orgName: string;
  lastMessages: Array<{ direction: "inbound" | "outbound"; body: string }>;
}) => {
  const cfg = getOpenAiConfig();
  if (!cfg.configured || !cfg.apiKey) {
    return {
      text: "Thanks for your message. We can help with your electrical job. Can you share your address and best time for us to quote?",
      model: null,
      reason: "OPENAI_API_KEY not configured. Used fallback template.",
    };
  }

  const convo = input.lastMessages
    .slice(-12)
    .map((m) => `${m.direction === "inbound" ? "Customer" : "Team"}: ${m.body}`)
    .join("\n");

  const system = [
    `You are an assistant for ${input.orgName}, an electrical services business.`,
    "Write short, clear customer replies in Australian English.",
    "Focus on booking jobs, clarifying scope, and preparing quote details.",
    "Do not invent final prices unless customer asked for estimate; if unsure ask 1-2 clarifying questions.",
    "Output only the reply message text.",
  ].join(" ");

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Conversation:\n${convo}\n\nDraft the next reply now.` },
      ],
    }),
  });

  const payload = await parseJsonSafe(res);
  const text =
    (payload.choices as Array<{ message?: { content?: string } }> | undefined)?.[0]?.message?.content?.trim() || "";

  if (!res.ok || !text) {
    return {
      text: "Thanks for your message. We can help with your electrical job. Can you share your address and best time for us to quote?",
      model: cfg.model,
      reason: "OpenAI call failed. Used fallback template.",
    };
  }

  return {
    text,
    model: cfg.model,
    reason: null,
  };
};

export const processInboundMessengerText = async (input: {
  integration: MessengerIntegration;
  senderId: string;
  senderName?: string | null;
  text: string;
  externalMessageId?: string | null;
}) => {
  const thread = await db.messengerThread.upsert({
    where: {
      integrationId_externalUserId: {
        integrationId: input.integration.id,
        externalUserId: input.senderId,
      },
    },
    create: {
      orgId: input.integration.orgId,
      integrationId: input.integration.id,
      channel: "facebook_messenger",
      externalUserId: input.senderId,
      externalUserName: input.senderName ?? null,
      lastMessageAt: new Date(),
    },
    update: {
      externalUserName: input.senderName ?? undefined,
      lastMessageAt: new Date(),
    },
  });

  await db.messengerMessage.create({
    data: {
      orgId: input.integration.orgId,
      integrationId: input.integration.id,
      threadId: thread.id,
      channel: "facebook_messenger",
      direction: "inbound",
      status: "received",
      externalMessageId: input.externalMessageId ?? null,
      body: input.text,
    },
  });

  const contextMessages = await db.messengerMessage.findMany({
    where: { threadId: thread.id },
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { direction: true, body: true },
  });

  const org = await db.org.findUnique({ where: { id: input.integration.orgId }, select: { name: true } });
  const draft = await generateMessengerDraft({
    orgName: org?.name ?? "your electrical team",
    lastMessages: contextMessages.map((msg) => ({
      direction: msg.direction === "inbound" ? "inbound" : "outbound",
      body: msg.body,
    })),
  });

  const draftRecord = await db.messengerMessage.create({
    data: {
      orgId: input.integration.orgId,
      integrationId: input.integration.id,
      threadId: thread.id,
      channel: "facebook_messenger",
      direction: "outbound",
      status: "draft",
      body: draft.text,
      aiModel: draft.model,
      aiReason: draft.reason,
    },
  });

  if (input.integration.autoReplyEnabled && !input.integration.reviewBeforeSend) {
    try {
      const sent = await sendFacebookPageMessage({
        pageId: input.integration.pageId,
        pageAccessToken: input.integration.pageAccessToken,
        recipientId: input.senderId,
        text: draftRecord.body,
      });

      await db.messengerMessage.update({
        where: { id: draftRecord.id },
        data: {
          status: MessagingMessageStatus.sent,
          externalMessageId: sent.messageId,
          error: null,
        },
      });
    } catch (error) {
      await db.messengerMessage.update({
        where: { id: draftRecord.id },
        data: {
          status: MessagingMessageStatus.failed,
          error: error instanceof Error ? error.message : "Failed to auto-send reply.",
        },
      });
    }
  }

  return { threadId: thread.id, draftMessageId: draftRecord.id };
};

export { getMetaAppConfig };
