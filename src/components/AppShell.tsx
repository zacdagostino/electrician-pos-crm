import AppNavPanel from "@/components/AppNavPanel";

type AppShellProps = {
  children: React.ReactNode;
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  title?: string;
  subtitle?: string;
};

export default function AppShell({
  children,
  userName,
  orgName,
  orgLogoUrl,
  title,
  subtitle,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <AppNavPanel userName={userName} orgName={orgName} orgLogoUrl={orgLogoUrl} />
        <section className="px-6 py-8 lg:py-10">
          {(title || subtitle) ? (
            <header className="mb-8 space-y-2">
              {title ? <h1 className="text-3xl font-semibold">{title}</h1> : null}
              {subtitle ? <p className="text-sm text-slate-400">{subtitle}</p> : null}
            </header>
          ) : null}
          {children}
        </section>
      </div>
    </main>
  );
}
