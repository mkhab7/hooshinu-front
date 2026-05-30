"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
  hint?: string;
  icon?: React.ReactNode;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Constrain the popover width to the trigger (default true). */
  matchWidth?: boolean;
};

/**
 * Fully custom, accessible dropdown — keyboard navigation, type-ahead,
 * animated popover, and first-class dark-mode styling.
 */
export function Select({
  value,
  onChange,
  options,
  placeholder = "انتخاب کنید",
  disabled,
  className,
  matchWidth = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const typeahead = useRef({ buf: "", t: 0 });
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setOpen(false);
    setActive(-1);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  // When opening, focus the selected (or first enabled) option.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value && !o.disabled);
    setActive(idx >= 0 ? idx : options.findIndex((o) => !o.disabled));
  }, [open, options, value]);

  // Keep the active option in view.
  useEffect(() => {
    if (!open || active < 0) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${active}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function moveActive(dir: 1 | -1) {
    setActive((cur) => {
      let next = cur;
      for (let i = 0; i < options.length; i++) {
        next = (next + dir + options.length) % options.length;
        if (!options[next].disabled) return next;
      }
      return cur;
    });
  }

  function commit(idx: number) {
    const opt = options[idx];
    if (!opt || opt.disabled) return;
    onChange(opt.value);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else moveActive(-1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) setOpen(true);
        else if (active >= 0) commit(active);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
      default:
        // Type-ahead search.
        if (e.key.length === 1) {
          window.clearTimeout(typeahead.current.t);
          typeahead.current.buf += e.key.toLowerCase();
          const buf = typeahead.current.buf;
          const idx = options.findIndex(
            (o) => !o.disabled && o.label.toLowerCase().startsWith(buf)
          );
          if (idx >= 0) {
            setActive(idx);
            if (!open) commit(idx);
          }
          typeahead.current.t = window.setTimeout(() => {
            typeahead.current.buf = "";
          }, 600);
        }
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-xl border px-3.5 text-sm transition-colors",
          "border-gray-300 bg-white text-gray-900 hover:border-gray-400",
          "dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-100 dark:hover:border-white/20",
          "focus:outline-none focus-visible:border-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/30",
          open && "border-brand-500 ring-2 ring-brand-500/30 dark:border-brand-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 truncate",
            !selected && "text-gray-400 dark:text-gray-500"
          )}
        >
          {selected?.icon}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-gray-400 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          ref={listRef}
          className={cn(
            "animate-scale-in absolute z-50 mt-2 max-h-64 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-1.5 shadow-xl shadow-black/10 origin-top",
            "dark:border-white/10 dark:bg-surface-3 dark:shadow-black/50",
            matchWidth ? "w-full" : "min-w-full"
          )}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isActive = idx === active;
            return (
              <div
                key={opt.value}
                data-idx={idx}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled}
                onMouseEnter={() => !opt.disabled && setActive(idx)}
                onClick={() => commit(idx)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  opt.disabled && "cursor-not-allowed opacity-40",
                  isActive &&
                    !opt.disabled &&
                    "bg-brand-50 dark:bg-brand-500/15",
                  isSelected && "font-medium text-brand-600 dark:text-brand-300"
                )}
              >
                {opt.icon}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{opt.label}</span>
                  {opt.hint && (
                    <span className="block truncate text-xs text-gray-400">
                      {opt.hint}
                    </span>
                  )}
                </span>
                {isSelected && (
                  <Check className="size-4 shrink-0 text-brand-500" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
