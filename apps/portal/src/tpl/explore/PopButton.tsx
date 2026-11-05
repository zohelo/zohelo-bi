// A button with a non-modal popover for explorer v3 (field "Dodaj do…" menus, well chips, the chart picker). Same
// behaviour as FilterPopover (focus moves in, Esc / close / outside click / tabbing out closes, Esc and close return
// focus; bottom sheet on phones) with any trigger content. The accessible name is the trigger's visible text.

import { useEffect, useId, useLayoutEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Icon } from "../ui/icons";

const FOCUSABLE = 'input:not([disabled]), select:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const PHONE = "(max-width: 767px)";

export function PopButton({
  trigger,
  title,
  closeLabel,
  className,
  size = "md",
  draggable,
  onDragStart,
  onDragEnd,
  children,
}: {
  trigger: ReactNode;
  /** Dialog title. */
  title: string;
  closeLabel: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  draggable?: boolean;
  onDragStart?: (e: DragEvent<HTMLButtonElement>) => void;
  onDragEnd?: () => void;
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
  // A choice inside the popover closes it and returns focus to the trigger (through state: no ref in render).
  const [refocus, setRefocus] = useState(0);
  const done = () => {
    setOpen(false);
    setRefocus((n) => n + 1);
  };
  useEffect(() => {
    if (refocus) btn.current?.focus();
  }, [refocus]);
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
  useLayoutEffect(() => {
    const p = pop.current;
    if (!open || !p) return;
    p.style.removeProperty("--xp-shift");
    if (window.matchMedia(PHONE).matches) return;
    const over = p.getBoundingClientRect().right - (document.documentElement.clientWidth - 16);
    if (over > 0) p.style.setProperty("--xp-shift", `${-Math.ceil(over)}px`);
    // Opened near the bottom of the field list or the page: bring the whole popover into view.
    p.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [open]);
  return (
    <div
      className="xp-fwrap x3-popwrap"
      ref={wrap}
      onBlur={(e) => {
        const to = e.relatedTarget as Node | null;
        if (open && to && !wrap.current?.contains(to)) setOpen(false);
      }}
    >
      <button
        ref={btn}
        type="button"
        className={className ?? "zt-btn"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onClick={() => setOpen(!open)}
      >
        {trigger}
      </button>
      {open ? (
        <>
          <div className="xp-scrim" aria-hidden="true" />
          <div
            ref={pop}
            className={`zt-menu xp-pop xp-pop--${size}`}
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
                {title}
              </p>
              <button type="button" className="xp-icon" aria-label={closeLabel} onClick={() => close(true)}>
                <Icon name="close" size={14} />
              </button>
            </div>
            <div className="xp-pop__body">{typeof children === "function" ? children(done) : children}</div>
          </div>
        </>
      ) : null}
    </div>
  );
}
