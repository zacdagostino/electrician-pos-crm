import AppNavPanel from "@/components/AppNavPanel";
import Breadcrumbs, { type BreadcrumbItem } from "@/components/Breadcrumbs";
import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
  userName?: string | null;
  orgName?: string | null;
  orgLogoUrl?: string | null;
  userRole?: "electrician" | "apprentice" | "office" | null;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  backLink?: { href: string; label?: string };
};

export default function AppShell({
  children,
  userName,
  orgName,
  orgLogoUrl,
  userRole,
  title,
  subtitle,
  breadcrumbs,
  backLink,
}: AppShellProps) {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
        <AppNavPanel
          userName={userName}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          userRole={userRole}
        />
        <section className="px-3 py-6 sm:px-6 sm:py-8 lg:py-10">
          {(title || subtitle || breadcrumbs?.length || backLink) ? (
            <header className="mb-8 space-y-2">
              {(backLink || breadcrumbs?.length) ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {backLink ? (
                    <Link
                      href={backLink.href}
                      className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                    >
                      <span aria-hidden="true">←</span>
                      {backLink.label ?? "Back"}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
                </div>
              ) : null}
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
