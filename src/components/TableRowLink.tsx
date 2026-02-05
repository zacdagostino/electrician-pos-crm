"use client";

import { useRouter } from "next/navigation";

type TableRowLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
};

export default function TableRowLink({ href, children, className }: TableRowLinkProps) {
  const router = useRouter();

  return (
    <tr
      className={`cursor-pointer bg-slate-950/40 transition-[background-color,box-shadow] duration-200 hover:bg-slate-900/70 hover:shadow-[inset_0_0_0_1px_rgba(16,185,129,0.25)] ${
        className ?? ""
      }`.trim()}
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
    >
      {children}
    </tr>
  );
}
