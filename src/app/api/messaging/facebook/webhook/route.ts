import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getMetaAppConfig, processInboundMessengerText } from "@/lib/messenger";

type MetaWebhookEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

type MetaWebhookEntry = {
  id?: string;
  messaging?: MetaWebhookEvent[];
};

export const GET = async (req: Request) => {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const cfg = getMetaAppConfig();
  if (mode === "subscribe" && cfg.verifyToken && token === cfg.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
};

export const POST = async (req: Request) => {
  const payload = (await req.json().catch(() => ({}))) as {
    object?: string;
    entry?: MetaWebhookEntry[];
  };

  if (payload.object !== "page" || !Array.isArray(payload.entry)) {
    return NextResponse.json({ received: true });
  }

  for (const entry of payload.entry) {
    const pageId = String(entry.id ?? "").trim();
    if (!pageId) continue;

    const integration = await db.messengerIntegration.findFirst({
      where: {
        channel: "facebook_messenger",
        pageId,
        active: true,
      },
    });
    if (!integration) continue;

    await db.messengerIntegration.update({
      where: { id: integration.id },
      data: { lastWebhookAt: new Date() },
    });

    const events = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const event of events) {
      const senderId = String(event.sender?.id ?? "").trim();
      if (!senderId) continue;
      const text = String(event.message?.text ?? "").trim();
      const isEcho = Boolean(event.message?.is_echo);
      if (!text || isEcho) continue;

      await processInboundMessengerText({
        integration,
        senderId,
        text,
        externalMessageId: String(event.message?.mid ?? "").trim() || null,
      });
    }
  }

  return NextResponse.json({ received: true });
};
