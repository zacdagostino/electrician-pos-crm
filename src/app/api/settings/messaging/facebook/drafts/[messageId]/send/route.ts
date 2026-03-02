import { NextResponse } from "next/server";
import { MessagingMessageStatus, type OrgRole } from "@prisma/client";
import { getServerAuthSession } from "@/auth";
import { getSelectedOrgId } from "@/lib/authz";
import { db } from "@/lib/db";
import { sendFacebookPageMessage } from "@/lib/messenger";

type Params = { params: Promise<{ messageId: string }> };

const requireSalesPermission = async () => {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const orgId = await getSelectedOrgId();
  if (!orgId) {
    return { error: NextResponse.json({ error: "No org selected" }, { status: 400 }) };
  }

  const membership = await db.orgMember.findFirst({
    where: { userId: session.user.id, orgId, status: "active" },
    select: { role: true },
  });

  if (!membership || !["owner", "admin", "staff"].includes(membership.role as OrgRole)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { orgId };
};

export const POST = async (req: Request, { params }: Params) => {
  const auth = await requireSalesPermission();
  if ("error" in auth) return auth.error;

  const { messageId } = await params;
  const draft = await db.messengerMessage.findFirst({
    where: {
      id: messageId,
      orgId: auth.orgId,
      direction: "outbound",
      status: { in: ["draft", "failed"] },
    },
    include: {
      integration: true,
      thread: true,
    },
  });

  if (!draft) {
    return NextResponse.json({ error: "Draft message not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const editedText = String(body.body ?? "").trim();
  const textToSend = editedText || draft.body;
  if (!textToSend) {
    return NextResponse.json({ error: "Message body is empty." }, { status: 400 });
  }

  try {
    const sent = await sendFacebookPageMessage({
      pageId: draft.integration.pageId,
      pageAccessToken: draft.integration.pageAccessToken,
      recipientId: draft.thread.externalUserId,
      text: textToSend,
    });

    const updated = await db.messengerMessage.update({
      where: { id: draft.id },
      data: {
        body: textToSend,
        status: MessagingMessageStatus.sent,
        externalMessageId: sent.messageId,
        error: null,
      },
      select: {
        id: true,
        body: true,
        status: true,
      },
    });

    return NextResponse.json({ message: updated });
  } catch (error) {
    const updated = await db.messengerMessage.update({
      where: { id: draft.id },
      data: {
        body: textToSend,
        status: MessagingMessageStatus.failed,
        error: error instanceof Error ? error.message : "Failed to send message.",
      },
      select: {
        id: true,
        body: true,
        status: true,
        error: true,
      },
    });

    return NextResponse.json({ error: updated.error ?? "Failed to send message." }, { status: 500 });
  }
};
