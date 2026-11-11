"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

/** Colors used by the reveal: ink black + the muted grey from the design. */
const BLACK = "#000000";
const GREY = "#8a8a8a";

/** How many px of wheel / keyboard scrolling fill the whole headline. */
const WHEEL_BUDGET = 900;
/** Keyboard step, in px-equivalent, per key press. */
const KEY_STEP = 130;
/** Per-frame damping of the displayed progress (higher = snappier). */
const EASE = 0.18;
/** Scroll positions beyond this during the lock mean "restored scroll" → abandon. */
const RESTORE_THRESHOLD = 240;

type AboutHeroRevealProps = {
  /** Words that start black, e.g. "Multidisciplinary". */
  bold: string;
  /** The rest of the headline — grey until the visitor scrolls. */
  rest: string;
};

function splitWords(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

/** Nearest ancestor that actually scrolls (desktop: <main>; mobile: null → document). */
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/**
 * About page headline. On landing only the first word(s) are black and the
 * page refuses to scroll: wheel / touch / arrow input instead inks the
 * remaining words from grey to black, word by word. Once every word is
 * black the input is released and the page scrolls normally.
 */
export function AboutHeroReveal({ bold, rest }: AboutHeroRevealProps) {
  const boldText = bold.trim();
  const restWords = useMemo(() => splitWords(rest), [rest]);
  const restCount = restWords.length;

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const restCountRef = useRef(restCount);

  // Keep the count readable from the mount-only effect below.
  useEffect(() => {
    restCountRef.current = restCount;
  }, [restCount]);

  const [display, setDisplay] = useState(0);
  const displayRef = useRef(0);
  const targetRef = useRef(0);
  const lockedRef = useRef(false);

  /** Grey → black gradient fill for one word, given the global progress. */
  const wordStyle = (index: number): CSSProperties => {
    const count = restCount;
    if (count === 0) return { color: BLACK };
    const start = index / count;
    const end = (index + 1) / count;
    const local = (display - start) / (end - start);
    if (local <= 0) return { color: GREY };
    if (local >= 1) return { color: BLACK };
    const pct = Math.round(local * 1000) / 10;
    return {
      color: "transparent",
      backgroundImage: `linear-gradient(90deg, ${BLACK} ${pct}%, ${GREY} ${pct}%)`,
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
    };
  };

  useEffect(() => {
    const heading = headingRef.current;
    if (!heading) return;

    // Skip the theatrical version for reduced motion, mid-page landings
    // or an empty grey part — those visitors simply get the black headline.
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scroller = getScrollParent(heading);
    const landedMidPage = scroller ? scroller.scrollTop > 10 : window.scrollY > 10;
    if (reduced || landedMidPage || restCountRef.current === 0) {
      targetRef.current = 1;
      const rafId = requestAnimationFrame(() => {
        displayRef.current = 1;
        setDisplay(1);
      });
      return () => cancelAnimationFrame(rafId);
    }

    let raf: number | null = null;
    let touchY: number | null = null;
    const touchBudget = Math.max(300, window.innerHeight * 0.7);

    const tick = () => {
      const diff = targetRef.current - displayRef.current;
      if (Math.abs(diff) < 0.0015) displayRef.current = targetRef.current;
      else displayRef.current += diff * EASE;
      setDisplay(displayRef.current);
      if (displayRef.current !== targetRef.current) raf = requestAnimationFrame(tick);
      else raf = null;
    };

    function detach() {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
      window.removeEventListener("touchcancel", onTouchEnd, { capture: true });
      window.removeEventListener("keydown", onKey, { capture: true });
      window.removeEventListener("scroll", onScroll, { capture: true });
    }

    function release() {
      if (!lockedRef.current) return;
      lockedRef.current = false;
      detach();
      // Let the running animation ease the tail to full black.
      if (raf == null) raf = requestAnimationFrame(tick);
    }

    /** Advance the fill; returns true when the reveal completed. */
    function bump(delta: number): boolean {
      if (!lockedRef.current) return true;
      let next = targetRef.current + delta;
      // Tolerance handles float drift (0.999999… from exact-budget input).
      if (next >= 1 - 1e-4) {
        targetRef.current = 1;
        release();
        return true;
      }
      if (next < 0) next = 0;
      if (next === targetRef.current) return false;
      targetRef.current = next;
      if (raf == null) raf = requestAnimationFrame(tick);
      return false;
    }

    function onWheel(event: WheelEvent) {
      if (!lockedRef.current) return;
      const down = event.deltaY > 0;
      if (!down && targetRef.current <= 0) return; // scrolling up at the top: nothing to fill
      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= 16; // lines
      else if (event.deltaMode === 2) delta *= window.innerHeight; // pages
      const completed = bump(delta / WHEEL_BUDGET);
      // Hold the page while the words ink in; once complete, let the very
      // same gesture continue as a normal scroll.
      if (!completed) event.preventDefault();
    }

    function onTouchStart(event: TouchEvent) {
      touchY = event.touches[0]?.clientY ?? null;
    }

    function onTouchMove(event: TouchEvent) {
      if (!lockedRef.current || touchY == null) return;
      const y = event.touches[0]?.clientY;
      if (y == null) return;
      const delta = touchY - y; // positive while swiping up
      touchY = y;
      if (delta === 0) return;
      bump(delta / touchBudget);
      event.preventDefault();
    }

    function onTouchEnd() {
      touchY = null;
    }

    function onKey(event: KeyboardEvent) {
      if (!lockedRef.current) return;
      const target = event.target as HTMLElement | null;
      // Never hijack keys aimed at real controls (Space activates buttons…).
      if (
        target?.closest?.(
          "button, a, input, textarea, select, iframe, svg, [contenteditable], [role='button']"
        )
      )
        return;
      let delta = 0;
      if (event.key === "ArrowDown") delta = KEY_STEP;
      else if (event.key === "ArrowUp") delta = -KEY_STEP;
      else if (event.key === "PageDown" || event.key === " ") delta = KEY_STEP * 3;
      else if (event.key === "PageUp") delta = -KEY_STEP * 3;
      else return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const completed = bump(delta / WHEEL_BUDGET);
      if (!completed) event.preventDefault();
    }

    // Belt & braces: if anything still scrolls during the lock (scrollbar
    // drag, restored position…), snap back to the top — or abandon the
    // reveal entirely for big jumps.
    function onScroll() {
      if (!lockedRef.current) return;
      const top = scroller ? scroller.scrollTop : window.scrollY;
      if (top > RESTORE_THRESHOLD) {
        targetRef.current = 1;
        displayRef.current = 1;
        setDisplay(1);
        release();
        return;
      }
      if (scroller) scroller.scrollTop = 0;
      else window.scrollTo(0, 0);
    }

    function attach() {
      window.addEventListener("wheel", onWheel, { passive: false, capture: true });
      window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
      window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
      window.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true });
      window.addEventListener("keydown", onKey, { capture: true });
      window.addEventListener("scroll", onScroll, { capture: true });
    }

    lockedRef.current = true;
    attach();

    return () => {
      lockedRef.current = false;
      if (raf != null) cancelAnimationFrame(raf);
      detach();
    };
  }, []);

  return (
    <h1
      id="about-heading"
      ref={headingRef}
      className="max-w-[53rem] text-[1.8rem] font-medium leading-[1.32] tracking-tight sm:text-4xl lg:text-[2.45rem]"
    >
      {boldText ? (
        <>
          <span className="text-black">{boldText}</span>{" "}
        </>
      ) : null}
      {restWords.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          <span style={wordStyle(index)}>{word}</span>{" "}
        </Fragment>
      ))}
    </h1>
  );
}
