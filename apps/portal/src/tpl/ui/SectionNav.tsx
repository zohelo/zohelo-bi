// Sticky page header with section navigation (design template: Page sections). The third level under
// domain → page: one long page, its sections reachable by scrolling or by the buttons in the header. The
// header (title, period, section buttons) stays under the top bar while the page scrolls; the button of the
// section being read is marked with aria-current="location" (scroll-spy).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type NavTarget = { id: string; label: string };

/** Offset of the sticky stack (top bar + page header) from the top of the viewport. */
function stickyBottom(head: HTMLElement | null): number {
  return head ? head.getBoundingClientRect().bottom : 0;
}

/** The section being read: the last one whose top has passed under the sticky header (or the last, at the end). */
export function activeTarget(tops: number[], line: number, atEnd: boolean): number {
  if (!tops.length) return -1;
  if (atEnd) return tops.length - 1;
  let a = 0;
  tops.forEach((t, i) => {
    if (t <= line) a = i;
  });
  return a;
}

export function StickyPageHead({
  title,
  right,
  targets,
  navLabel,
  children,
}: {
  title: string;
  right?: ReactNode;
  targets: NavTarget[];
  navLabel: string;
  /** Rendered below the sticky part (lead, filters): scrolls away. */
  children?: ReactNode;
}) {
  const head = useRef<HTMLDivElement>(null);
  const nav = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const ids = targets.map((t) => t.id).join("|");

  // Sections scroll to just under the header: publish its height for scroll-margin-top.
  useLayoutEffect(() => {
    const el = head.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty("--dhead-h", `${Math.ceil(el.getBoundingClientRect().height)}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty("--dhead-h");
    };
  }, []);

  useEffect(() => {
    if (targets.length < 2) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = stickyBottom(head.current) + 24;
      const tops = targets.map((t) => document.getElementById(t.id)?.getBoundingClientRect().top ?? Infinity);
      const doc = document.documentElement;
      const atEnd = window.scrollY > 0 && window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      setActive(activeTarget(tops, line, atEnd));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- targets are compared by their ids
  }, [ids]);

  // Keep the current button visible in a horizontally scrolling bar (phones).
  useEffect(() => {
    const a = nav.current?.querySelector<HTMLElement>('[aria-current="location"]');
    const bar = nav.current;
    if (!a || !bar || bar.scrollWidth <= bar.clientWidth) return;
    const l = a.offsetLeft - bar.offsetLeft;
    if (l < bar.scrollLeft || l + a.offsetWidth > bar.scrollLeft + bar.clientWidth)
      bar.scrollTo({ left: l - 16, behavior: "instant" as ScrollBehavior });
  }, [active]);

  const go = (e: React.MouseEvent<HTMLAnchorElement>, id: string, i: number) => {
    const el = document.getElementById(id);
    if (!el || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
    // Move focus to the section heading so keyboard and screen-reader users continue from there.
    const h = el.querySelector<HTMLElement>("h2");
    if (h) {
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
    }
    history.replaceState(history.state, "", `${location.pathname}${location.search}#${id}`);
    setActive(i);
  };

  return (
    <>
      <div className="t-dhead" ref={head}>
        <div className="t-dhead__row">
          <h1 className="page-title t-dhead__title">{title}</h1>
          {right ? <div className="t-pagehead__right">{right}</div> : null}
        </div>
        {targets.length > 1 ? (
          <nav className="zt-tabs t-secnav" aria-label={navLabel} ref={nav}>
            {targets.map((t, i) => (
              <a key={t.id} href={`#${t.id}`} aria-current={i === active ? "location" : undefined} onClick={(e) => go(e, t.id, i)}>
                {t.label}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
      {children}
    </>
  );
}
