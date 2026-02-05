"use client";

import { useEffect, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

type SelectMenuProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  align?: "left" | "right";
};

export default function SelectMenu({
  value,
  onChange,
  options,
  label,
  disabled,
  className,
  buttonClassName,
  menuClassName,
  align = "left",
}: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [openUp, setOpenUp] = useState(false);
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const button = buttonRef.current;
    if (button) {
      const rect = button.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUp(spaceBelow < 220 && spaceAbove > spaceBelow);
    }
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        ref={buttonRef}
        className={`flex w-full items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-900 disabled:opacity-60 ${
          buttonClassName ?? ""
        }`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label ? (
          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            {label}
          </span>
        ) : null}
        <span className="inline-flex flex-1 items-center gap-2 text-xs font-semibold text-slate-100">
          {current?.icon ? <span className="h-3.5 w-3.5">{current.icon}</span> : null}
          {current?.label ?? "Select"}
        </span>
        <span className="text-slate-400">▼</span>
      </button>
      {open ? (
        <div
          className={`absolute ${align === "right" ? "right-0" : "left-0"} ${
            openUp ? "bottom-full mb-2" : "top-full mt-2"
          } z-20 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-xl ${
            menuClassName ?? ""
          }`.trim()}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-slate-900"
              role="option"
              aria-selected={option.value === value}
            >
              {option.icon ? <span className="h-3.5 w-3.5 text-slate-300">{option.icon}</span> : null}
              <span className="flex-1 truncate">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
