import AppShell from "@/components/AppShell";
import { Prisma } from "@prisma/client";
import { requireOrg } from "@/lib/authz";
import { db } from "@/lib/db";
import { getMetaAppConfig } from "@/lib/messenger";
import MessagingSettingsClient from "@/app/settings/messaging/MessagingSettingsClient";

type MessagingSettingsPageProps = {
  searchParams: Promise<{ connected?: string; error?: string }>;
};

export default async function MessagingSettingsPage({ searchParams }: MessagingSettingsPageProps) {
  const { session, orgId, membership } = await requireOrg();
  const resolvedSearchParams = await searchParams;

  const [org, user] = await Promise.all([
    db.org.findUnique({ where: { id: orgId } }),
    db.user.findUnique({ where: { id: session.user.id } }),
  ]);
  let integration:
    | {
        id: string;
        pageName: string;
        reviewBeforeSend: boolean;
        autoReplyEnabled: boolean;
        lastWebhookAt: Date | null;
      }
    | null = null;
  let draftMessages: Array<{
    id: string;
    threadId: string;
    status: "draft" | "failed";
    body: string;
    error: string | null;
    createdAt: Date;
    thread: {
      externalUserName: string | null;
      externalUserId: string;
    };
  }> = [];
  let tablesMissing = false;
  try {
    const [integrationResult, draftsResult] = await Promise.all([
      db.messengerIntegration.findFirst({
        where: { orgId, channel: "facebook_messenger", active: true },
        select: {
          id: true,
          pageName: true,
          reviewBeforeSend: true,
          autoReplyEnabled: true,
          lastWebhookAt: true,
        },
      }),
      db.messengerMessage.findMany({
        where: {
          orgId,
          channel: "facebook_messenger",
          direction: "outbound",
          status: { in: ["draft", "failed"] },
        },
        include: {
          thread: {
            select: { externalUserName: true, externalUserId: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    integration = integrationResult;
    draftMessages = draftsResult as typeof draftMessages;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2021" || error.code === "P2022")
    ) {
      tablesMissing = true;
      integration = null;
      draftMessages = [];
    } else {
      throw error;
    }
  }

  const canManage = membership.role === "owner" || membership.role === "admin";
  const metaCfg = getMetaAppConfig();

  return (
    <AppShell
      userName={user?.name}
      orgName={org?.name ?? orgId}
      orgLogoUrl={org?.logoUrl ?? null}
      userRole={membership?.tradeRole ?? null}
      title="Messaging"
      subtitle="Connect Facebook Messenger and manage AI-assisted replies."
    >
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Facebook Messenger</p>
            <h2 className="mt-2 text-lg font-semibold">AI reply automation</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Incoming customer messages generate draft replies with optional auto-send.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <a
                href="/api/settings/messaging/facebook/connect"
                className="inline-flex items-center justify-center rounded-lg border border-emerald-400/60 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                {integration ? "Reconnect Facebook" : "Connect Facebook"}
              </a>
            ) : null}
            {canManage && integration ? (
              <form action="/api/settings/messaging/facebook/disconnect" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Disconnect
                </button>
              </form>
            ) : null}
          </div>
        </div>

        {resolvedSearchParams.connected === "1" ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200">
            Facebook Messenger connected.
          </div>
        ) : null}
        {resolvedSearchParams.error ? (
          <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            Setup error: {resolvedSearchParams.error.replaceAll("_", " ")}
          </div>
        ) : null}
        {tablesMissing ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            Messaging tables are not in the database yet. Run <code>npm run db:migrate</code>, then restart the dev
            server.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Meta env</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                metaCfg.configured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {metaCfg.configured ? "Configured" : "Missing"}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Connection</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                integration ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"
              }`}
            >
              {integration ? "Connected" : "Not connected"}
            </p>
            {integration ? <p className="mt-1 text-xs text-slate-500">{integration.pageName}</p> : null}
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Last webhook</p>
            <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              {integration?.lastWebhookAt ? new Date(integration.lastWebhookAt).toLocaleString() : "No events yet"}
            </p>
          </div>
        </div>

        {!metaCfg.configured ? (
          <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Required env vars
            </summary>
            <code className="mt-3 block rounded bg-slate-950 px-3 py-2 text-xs text-slate-200">
              META_APP_ID=...{"\n"}
              META_APP_SECRET=...{"\n"}
              META_WEBHOOK_VERIFY_TOKEN=choose_a_random_secret
            </code>
          </details>
        ) : null}

        <details className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
          <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Meta setup checklist
          </summary>
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>1. In Meta app dashboard, add Messenger product.</p>
            <p>
              2. Add webhook callback URL:
              <code className="ml-1 rounded bg-slate-950 px-2 py-0.5 text-slate-200">
                {`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/messaging/facebook/webhook`}
              </code>
            </p>
            <p>3. Use verify token from <code>META_WEBHOOK_VERIFY_TOKEN</code>.</p>
            <p>4. Subscribe to Page events: messages + messaging_postbacks.</p>
            <p>5. Click Connect Facebook above and finish Page permission consent.</p>
          </div>
        </details>

        <MessagingSettingsClient
          canManage={canManage}
          connected={Boolean(integration)}
          reviewBeforeSend={integration?.reviewBeforeSend ?? true}
          autoReplyEnabled={integration?.autoReplyEnabled ?? false}
          drafts={draftMessages.map((msg) => ({
            id: msg.id,
            threadId: msg.threadId,
            customerLabel: msg.thread.externalUserName ?? `Customer ${msg.thread.externalUserId.slice(-6)}`,
            body: msg.body,
            status: msg.status,
            error: msg.error,
            createdAt: msg.createdAt.toISOString(),
          }))}
        />
      </section>
    </AppShell>
  );
}
