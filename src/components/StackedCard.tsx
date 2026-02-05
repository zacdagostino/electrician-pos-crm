"use client";

type StackedCardProps = {
  children: React.ReactNode;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  topRight?: React.ReactNode;
  className?: string;
  dataId?: string;
  shine?: boolean;
};

export default function StackedCard({
  children,
  onClick,
  onKeyDown,
  topRight,
  className,
  dataId,
  shine,
}: StackedCardProps) {
  return (
    <div
      data-quote-id={dataId}
      role={onClick ? "link" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40 p-5 transition-[background-color,box-shadow] duration-200 hover:bg-slate-900/70 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.25)] ${
        className ?? ""
      }`.trim()}
    >
      {shine ? (
        <div className="pointer-events-none absolute inset-0">
          <div className="shine-sweep" />
        </div>
      ) : null}
      {topRight ? (
        <div className="absolute right-4 top-4 text-[10px] uppercase tracking-[0.2em] lg:static lg:text-right">
          {topRight}
        </div>
      ) : null}
      {children}
    </div>
  );
}
