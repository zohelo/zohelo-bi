// Filter button that opens a listbox (design template: FilterBar). The button shows the filter's name and
// current value; options move with arrow keys, Home/End, select with Enter/Space, close with Esc or Tab
// (focus returns to the button).

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "../ui/icons";

export type ListOption = { value: string; label: string; hint?: string };

export function ListboxButton({
  label,
  value,
  options,
  onChange,
  trigger,
  buttonClass = "zt-filter",
  align = "left",
}: {
  /** Name of the filter (shown and used as the listbox label). */
  label: string;
  value: string;
  options: ListOption[];
  onChange: (v: string) => void;
  /** Custom button content (default: "<label>: <value label>"). */
  trigger?: ReactNode;
  buttonClass?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    const opts = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    (opts.find((o) => o.getAttribute("aria-selected") === "true") ?? opts[0])?.focus();
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };
  const pick = (v: string) => {
    onChange(v);
    close(true);
  };
  const onKey = (e: KeyboardEvent) => {
    const opts = [...(wrap.current?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
    const i = opts.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => {
      e.preventDefault();
      opts[Math.max(0, Math.min(opts.length - 1, n))]?.focus();
    };
    if (e.key === "ArrowDown") go(i + 1);
    else if (e.key === "ArrowUp") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(opts.length - 1);
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") close(false);
  };

  return (
    <div className="ex-lb" ref={wrap}>
      <button
        ref={button}
        type="button"
        className={buttonClass}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {trigger ?? (
          <>
            <span>{label}:</span>
            <strong>{current?.label ?? value}</strong>
            <Icon name="chevronDown" size={14} />
          </>
        )}
      </button>
      {open ? (
        <div
          className={`zt-menu ex-lb__pop${align === "right" ? " ex-lb__pop--right" : ""}`}
          role="listbox"
          id={listId}
          aria-label={label}
          onKeyDown={onKey}
        >
          {options.map((o) => (
            <div
              key={o.value}
              role="option"
              tabIndex={-1}
              aria-selected={o.value === value}
              className="ex-lb__opt"
              onClick={() => pick(o.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  pick(o.value);
                }
              }}
            >
              <span>{o.label}</span>
              {o.hint ? <small>{o.hint}</small> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
