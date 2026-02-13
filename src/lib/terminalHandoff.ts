import crypto from "crypto";

type TerminalHandoffPayload = {
  sub: string;
  orgId: string;
  saleId: string;
  iat: number;
  exp: number;
};

const header = { alg: "HS256", typ: "JWT" } as const;

const getSecret = () => {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET is required for terminal handoff tokens.");
  }
  return secret;
};

const encodeBase64Url = (input: string) => Buffer.from(input, "utf8").toString("base64url");

const signPart = (unsigned: string) => {
  return crypto.createHmac("sha256", getSecret()).update(unsigned).digest("base64url");
};

export const createTerminalHandoffToken = (input: {
  userId: string;
  orgId: string;
  saleId: string;
  expiresInSeconds?: number;
}) => {
  const now = Math.floor(Date.now() / 1000);
  const payload: TerminalHandoffPayload = {
    sub: input.userId,
    orgId: input.orgId,
    saleId: input.saleId,
    iat: now,
    exp: now + (input.expiresInSeconds ?? 10 * 60),
  };

  const unsigned = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
  const signature = signPart(unsigned);
  return `${unsigned}.${signature}`;
};

export const verifyTerminalHandoffToken = (token: string): TerminalHandoffPayload | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [rawHeader, rawPayload, signature] = parts;
  const unsigned = `${rawHeader}.${rawPayload}`;
  const expected = signPart(unsigned);
  if (signature !== expected) return null;

  let parsedHeader: { alg?: string; typ?: string } | null = null;
  let payload: TerminalHandoffPayload | null = null;
  try {
    parsedHeader = JSON.parse(Buffer.from(rawHeader, "base64url").toString("utf8"));
    payload = JSON.parse(Buffer.from(rawPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (parsedHeader?.alg !== "HS256" || parsedHeader?.typ !== "JWT") return null;
  if (!payload?.sub || !payload?.orgId || !payload?.saleId) return null;
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(payload.exp) || payload.exp <= now) return null;
  return payload;
};

export type { TerminalHandoffPayload };
