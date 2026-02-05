import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-emerald-200">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "text-slate-200" : "text-slate-400"}>
                  {item.label}
                </span>
              )}
              {!isLast ? <span className="text-slate-600">/</span> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
