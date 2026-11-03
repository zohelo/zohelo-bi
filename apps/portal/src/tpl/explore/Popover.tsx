// Filter button with a popover (design template: query bar of the explorer). The button shows the filter's
// name, a summary of the current value, a count badge (two or more chosen) and a chevron; it opens a non-modal
// dialog. Focus moves into the dialog ([data-autofocus] or the first control); Esc, the close button, an outside
// click or tabbing out closes it, and Esc / close return focus to the button. Desktop: an anchored popover kept
// inside the window. Phones (< 768px): a full-width bottom sheet over a scrim, at most 80vh, scrolling.

import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../ui/icons";

const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const PHONE = "(max-width: 767px)";

export function FilterPopover({
  label,
  value,
  count = 0,
  title,
  closeLabel,
  size = "md",
  overflow,
  quiet,
  children,
}: {
  /** Filter name, e.g. "Wskaźniki" (shown on the button and as the dialog title). */
  label: string;
  /** Summary of the current choice, e.g. "CPI, Płace +1". */
  value: string;
  /** Number of chosen items: a badge shows from two. */
  count?: number;
  /** Dialog title (default: the label). */
  title?: string;
  closeLabel: string;
  size?: "sm" | "md" | "lg";
  /** Let an inner popup (combobox list) extend beyond the popover on desktop. */
  overflow?: boolean;
  /** A quieter button that is not a filter: "<label> <value>" without the colon (e.g. "Zapisane widoki (2)"). */
  quiet?: boolean;
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const id = useId();
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) btn.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!wrap.current?.contains(t) || t.closest(".xp-scrim")) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    const p = pop.current;
    (p?.querySelector<HTMLElement>("[data-autofocus]") ?? p?.querySelector<HTMLElement>(`.xp-pop__body :is(${FOCUSABLE})`))?.focus({
      preventScroll: true,
    });
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Desktop: shift the popover left when it would leave the window.
  useLayoutEffect(() => {
    const p = pop.current;
    if (!open || !p) return;
    p.style.removeProperty("--xp-shift");
    if (window.matchMedia(PHONE).matches) return;
    const over = p.getBoundingClientRect().right - (document.documentElement.clientWidth - 16);
    if (over > 0) p.style.setProperty("--xp-shift", `${-Math.ceil(over)}px`);
  }, [open]);

  return (
    <div
      className="xp-fwrap"
      ref={wrap}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        if (open && to && !wrap.current?.contains(to)) setOpen(false);
      }}
    >
      <button
        ref={btn}
        type="button"
        className={`zt-filter xp-fbtn${quiet ? " xp-fbtn--quiet" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        {quiet ? (
          <span>
            {label} {value}
          </span>
        ) : (
          <>
            <span>{label}:</span>
            <strong>{value}</strong>
          </>
        )}
        {count > 1 ? <b className="xp-fbtn__n">{count}</b> : null}
        <Icon name="chevronDown" size={14} className="xp-fbtn__chev" />
      </button>
      {open ? (
        <>
          <div className="xp-scrim" aria-hidden="true" />
          <div
            ref={pop}
            className={`zt-menu xp-pop xp-pop--${size}${overflow ? " xp-pop--overflow" : ""}`}
            role="dialog"
            id={id}
            aria-labelledby={`${id}-t`}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !e.defaultPrevented) {
                e.preventDefault();
                close(true);
              }
            }}
          >
            <div className="xp-pop__head">
              <p className="xp-pop__title" id={`${id}-t`}>
                {title ?? label}
              </p>
              <button type="button" className="xp-icon" aria-label={closeLabel} onClick={() => close(true)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="xp-pop__body">{typeof children === "function" ? children(() => setOpen(false)) : children}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
