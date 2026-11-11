"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * Skills spider web v2 — rectangle nodes per the approved reference:
 * sharp-cornered auto-width rects (white + gray border / brand purple /
 * deep violet) on staggered rows, a black dot on the left & right edge of
 * every rect, hairline threads running dot-to-dot between same-row
 * neighbours and fanning out from the outer dots to the section edges.
 *
 * Motion: threads draw themselves in on scroll into view, every node
 * drifts on its own slow sine loop, hovering a node lights its threads —
 * and every rect can be GRABBED and STRETCHED: it follows the pointer
 * with a rubbery lag (its neighbours get tugged along) and on release
 * the whole strand springs back home with a soft wobble, like a real
 * spider web. Reduced motion = fully drawn static web with instant
 * drag-follow / instant return; no-JS = the static fallback web.
 */

const DESIGN_W = 950;
const TAU = Math.PI * 2;

/** SSR-safe layout effect (no warning on the server pass). */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ——— spring tuning ———
const FOLLOW_K = 380; // dragged node chases the pointer (slight rubber lag)
const FOLLOW_C = 32;
const TUG_K = 260; // neighbours get pulled by the dragged node
const TUG_C = 18;
const FREE_K = 130; // release wobble back home (underdamped)
const FREE_C = 9;
const TUG_FACTOR = 0.16;
const TUG_CAP = 20;

// ——— types ———
interface PlacedNode {
  cx: number;
  cy: number;
  w: number;
  h: number;
  lines: string[];
  accent: "brand" | "deep" | null;
  fontSize: number;
}
interface PlacedEdge {
  a: number;
  aSide: number; // -1 left dot / +1 right dot of node a
  b: number | null; // other node, or null when the end is a fixed anchor
  bSide: number;
  ax: number;
  ay: number;
  dash: number;
  delay: number;
}
interface WebLayout {
  w: number;
  h: number;
  compact: boolean;
  nodes: PlacedNode[];
  edges: PlacedEdge[];
  rows: number[][];
}

interface NodeSim {
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}
interface PendingDrag {
  i: number;
  id: number;
  sx: number;
  sy: number;
  startX: number;
  startY: number;
  engaged: boolean;
  timer: number;
  preventer: ((ev: TouchEvent) => void) | null;
}

/** Balance a long label across two lines near its middle space. */
function splitTwoLines(label: string): [string, string] {
  const words = label.split(" ");
  if (words.length < 2) return [label, ""];
  let best = 1;
  let bestDiff = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(" ").length;
    const b = words.slice(k).join(" ").length;
    const diff = Math.abs(a - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = k;
    }
  }
  return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
}

/**
 * Build the web. Desktop (≥640px) = 4 staggered rows × 3 rects matching
 * the reference's zig-zag; compact (<640px) = 6 rows × 2 rects with
 * two-line labels. Empty admin labels render as solid accent rects.
 */
function buildWeb(
  labels: string[],
  w: number,
  compact: boolean,
  textW: (number | null)[] | null,
): WebLayout {
  const safe = labels.length > 0 ? labels : [""];
  const fs = compact ? 11.5 : 13.5;
  const padX = compact ? 16 : 26;
  const rectH = compact ? 34 : 38;
  const rectH2 = compact ? 46 : 38;
  const gap = compact ? 14 : 26;
  const accentW = compact ? 56 : Math.max(64, Math.min(130, Math.round(w * 0.095)));
  const padY = compact ? 22 : 30;
  const rowGap = compact ? 18 : 20;
  const ncols = compact ? 2 : 3;
  const count = Math.min(safe.length, 12);

  // node specs (width from measured text when available)
  const specs: { accent: "brand" | "deep" | null; lines: string[]; w: number; h: number }[] = [];
  let accentCount = 0;
  for (let i = 0; i < count; i++) {
    const label = (safe[i] ?? "").trim();
    const accent = label === "" ? (accentCount++ % 2 === 0 ? "brand" : "deep") : null;
    let lines: string[] = [label];
    if (label && compact && label.length > 18) lines = splitTwoLines(label);
    const tw = accent ? 0 : Math.max(1, textW?.[i] ?? label.length * fs * 0.6);
    specs.push({
      accent,
      lines,
      w: accent ? accentW : Math.round(tw + padX * 2),
      h: lines.length > 1 ? rectH2 : rectH,
    });
  }

  // rows
  const nrows = Math.ceil(count / ncols);
  const rows: number[][] = [];
  for (let r = 0; r < nrows; r++) {
    const row: number[] = [];
    for (let c = 0; c < ncols; c++) {
      const idx = r * ncols + c;
      if (idx < count) row.push(idx);
    }
    rows.push(row);
  }

  // row starts — centred, with the reference's zig-zag offsets
  const desktopOffsets = [-0.073, 0.058, -0.053, 0.044];
  const rowStart: number[] = [];
  rows.forEach((row, r) => {
    let content = -gap;
    row.forEach((idx) => {
      content += specs[idx].w + gap;
    });
    const fits = content <= w - 16;
    let start = fits
      ? (w - content) / 2 + (compact ? (r % 2 === 0 ? -8 : 8) : w * (desktopOffsets[r % 4] ?? 0))
      : (w - content) / 2;
    if (fits) start = Math.min(Math.max(start, 6), w - content - 6);
    rowStart.push(start);
  });

  // positions
  const nodes: PlacedNode[] = [];
  let yCursor = padY;
  rows.forEach((row, r) => {
    let x = rowStart[r];
    let rowH = 0;
    row.forEach((idx) => {
      rowH = Math.max(rowH, specs[idx].h);
    });
    const cy = yCursor + rowH / 2;
    row.forEach((idx) => {
      const sp = specs[idx];
      nodes[idx] = {
        cx: x + sp.w / 2,
        cy,
        w: sp.w,
        h: sp.h,
        lines: sp.lines,
        accent: sp.accent,
        fontSize: fs,
      };
      x += sp.w + gap;
    });
    yCursor += rowH + rowGap;
  });
  const h = Math.max(120, Math.round(yCursor - rowGap + padY));

  // edges — same-row dot-to-dot connectors, then strings to the edges
  const edges: PlacedEdge[] = [];
  rows.forEach((row) => {
    for (let k = 0; k + 1 < row.length; k++) {
      const a = row[k];
      const b = row[k + 1];
      const x1 = nodes[a].cx + nodes[a].w / 2;
      const x2 = nodes[b].cx - nodes[b].w / 2;
      const len = Math.hypot(x2 - x1, nodes[b].cy - nodes[a].cy);
      edges.push({ a, aSide: 1, b, bSide: -1, ax: 0, ay: 0, dash: Math.round(len + 40), delay: 0 });
    }
  });
  const fan = (r: number) => h * (nrows <= 1 ? 0.5 : 0.08 + (0.84 * r) / (nrows - 1));
  rows.forEach((row, r) => {
    const first = row[0];
    const last = row[row.length - 1];
    const fx = nodes[first].cx - nodes[first].w / 2;
    const fy = nodes[first].cy;
    edges.push({
      a: first,
      aSide: -1,
      b: null,
      bSide: 0,
      ax: 0,
      ay: fan(r),
      dash: Math.round(Math.hypot(fx, fan(r) - fy) + 40),
      delay: 0,
    });
    const lx = nodes[last].cx + nodes[last].w / 2;
    edges.push({
      a: last,
      aSide: 1,
      b: null,
      bSide: 0,
      ax: w,
      ay: fan(r),
      dash: Math.round(Math.hypot(w - lx, fan(r) - nodes[last].cy) + 40),
      delay: 0,
    });
  });
  const webCount = edges.filter((e) => e.b !== null).length;
  edges.forEach((e, i) => {
    e.delay = e.b !== null ? i * 26 : 520 + (i - webCount) * 42;
  });

  return { w, h, compact, nodes, edges, rows };
}

/** Deterministic per-node drift params (stable across renders). */
function driftFor(i: number) {
  return {
    ax: 2.4 + (i % 3) * 0.8,
    ay: 2 + ((i * 7) % 4) * 0.6,
    fx: 0.14 + ((i * 13) % 5) * 0.02,
    fy: 0.11 + ((i * 11) % 4) * 0.025,
    px: (i * 2.399) % TAU,
    py: (i * 1.7 + 1.3) % TAU,
  };
}

/**
 * Labels come from the admin portal (12 in reading order; an empty
 * string renders a solid accent rect, mirroring the reference).
 */
export function SkillsWeb({ labels }: { labels: string[] }) {
  const figureRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const nodeRefs = useRef<(SVGGElement | null)[]>([]);
  const edgeRefs = useRef<(SVGLineElement | null)[]>([]);
  const measureRefs = useRef<(SVGTextElement | null)[]>([]);

  const simRef = useRef<NodeSim[]>([]);
  const renderRef = useRef<{ x: number; y: number }[]>([]);
  const dragRef = useRef<{ i: number; grabX: number; grabY: number; px: number; py: number } | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const layoutRef = useRef<WebLayout | null>(null);
  const reducedRef = useRef(false);
  const stepRef = useRef<((dt: number | null, s: number) => void) | null>(null);

  const [width, setWidth] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [textWidths, setTextWidths] = useState<(number | null)[] | null>(null);

  const compact = width !== null && width < 640;
  const fontSize = compact ? 11.5 : 13.5;
  const layout = useMemo(
    () => buildWeb(labels, width ?? DESIGN_W, compact, textWidths),
    [labels, width, compact, textWidths],
  );

  // mark as JS-live before first paint (hides threads for the draw-in)
  useIsoLayoutEffect(() => {
    setMounted(true);
  }, []);

  // keep refs the handlers read in sync with state/layout
  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);
  useEffect(() => {
    layoutRef.current = layout;
    // fresh layout → fresh sim; any live drag is cancelled
    simRef.current = layout.nodes.map(() => ({ dx: 0, dy: 0, vx: 0, vy: 0 }));
    renderRef.current = layout.nodes.map((n) => ({ x: n.cx, y: n.cy }));
    let raf = 0;
    if (dragRef.current) {
      dragRef.current = null;
      pendingRef.current = null;
      raf = requestAnimationFrame(() => {
        setDragIdx(null);
        setHover(null);
      });
    }
    return () => cancelAnimationFrame(raf);
  }, [layout]);

  // Re-capture after the drag starts: rendering the grabbed node on top
  // re-inserts its DOM element, which releases the browser's pointer
  // capture — grab it again once React has committed the reorder.
  useEffect(() => {
    if (dragIdx === null) return;
    const p = pendingRef.current;
    if (!p || !p.engaged) return;
    try {
      nodeRefs.current[dragIdx]?.setPointerCapture(p.id);
    } catch {
      /* capture is best-effort */
    }
  }, [dragIdx]);

  // measure the real pixel width (drives layout + font sizes)
  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const apply = () => setWidth(Math.round(el.clientWidth));
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // reduced-motion preference
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // draw-in trigger — once it enters the viewport, keep it drawn
  useEffect(() => {
    const el = figureRef.current;
    if (!el || inView) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);

  // ——— exact text measurement (getBBox on a hidden measurer) ———
  const measureList = useMemo(() => {
    const list: { node: number; text: string }[] = [];
    labels.forEach((l, i) => {
      const t = l.trim();
      if (!t) return;
      if (compact && t.length > 18) {
        const [a, b] = splitTwoLines(t);
        list.push({ node: i, text: a });
        if (b) list.push({ node: i, text: b });
      } else {
        list.push({ node: i, text: t });
      }
    });
    return list;
  }, [labels, compact]);

  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const widths: (number | null)[] = labels.map((l) => (l.trim() ? 0 : null));
      measureList.forEach((m, k) => {
        const el = measureRefs.current[k];
        if (!el) return;
        try {
          const bw = el.getBBox().width;
          if (bw > (widths[m.node] ?? 0)) widths[m.node] = bw;
        } catch {
          /* geometry unavailable — keep the estimate */
        }
      });
      setTextWidths((prev) => {
        if (prev && prev.length === widths.length) {
          let same = true;
          for (let i = 0; i < widths.length; i++) {
            if (Math.abs((prev[i] ?? 0) - (widths[i] ?? 0)) > 0.75) {
              same = false;
              break;
            }
          }
          if (same) return prev;
        }
        return widths;
      });
    };
    const raf = requestAnimationFrame(measure);
    const fonts = typeof document !== "undefined" ? document.fonts : undefined;
    const fontsPromise = fonts?.ready.then(() => measure());
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      fontsPromise?.catch(() => undefined);
    };
  }, [measureList, labels]);

  // ——— the unified animation loop: drift + drag + tug + release wobble ———
  useEffect(() => {
    if (width === null || !inView) {
      stepRef.current = null;
      return;
    }
    const { nodes, edges, rows } = layout;
    if (nodes.length === 0) {
      stepRef.current = null;
      return;
    }
    const drift = nodes.map((_, i) => driftFor(i));
    const rowOf: number[] = [];
    rows.forEach((row, r) =>
      row.forEach((idx) => {
        rowOf[idx] = r;
      }),
    );
    const neighborsOf = (i: number): number[] => {
      const row = rows[rowOf[i]] ?? [];
      const k = row.indexOf(i);
      const out: number[] = [];
      if (k > 0) out.push(row[k - 1]);
      if (k < row.length - 1) out.push(row[k + 1]);
      return out;
    };
    const neighborSets = nodes.map((_, i) => neighborsOf(i));

    const step = (dt: number | null, timeS: number) => {
      const sim = simRef.current;
      const rp = renderRef.current;
      if (!sim || sim.length !== nodes.length || !rp || rp.length !== nodes.length) return;
      const drag = dragRef.current;
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const d = drift[i];
        const ox = reduced ? 0 : Math.sin(timeS * d.fx * TAU + d.px) * d.ax;
        const oy = reduced ? 0 : Math.cos(timeS * d.fy * TAU + d.py) * d.ay;
        const m = sim[i];

        let tdx = 0;
        let tdy = 0;
        let k = FREE_K;
        let c = FREE_C;
        if (drag && i === drag.i) {
          tdx = drag.px - drag.grabX - n.cx - ox;
          tdy = drag.py - drag.grabY - n.cy - oy;
          k = FOLLOW_K;
          c = FOLLOW_C;
        } else if (drag && neighborSets[i].includes(drag.i)) {
          const dd = sim[drag.i];
          const mag = Math.hypot(dd.dx, dd.dy) || 1;
          const f = Math.min(TUG_FACTOR, TUG_CAP / mag);
          tdx = dd.dx * f;
          tdy = dd.dy * f;
          k = TUG_K;
          c = TUG_C;
        }

        if (dt === null) {
          // reduced motion: direct manipulation, no oscillation
          m.dx = tdx;
          m.dy = tdy;
          m.vx = 0;
          m.vy = 0;
        } else {
          m.vx += (k * (tdx - m.dx) - c * m.vx) * dt;
          m.vy += (k * (tdy - m.dy) - c * m.vy) * dt;
          m.dx += m.vx * dt;
          m.dy += m.vy * dt;
        }

        rp[i].x = n.cx + ox + m.dx;
        rp[i].y = n.cy + oy + m.dy;
        nodeRefs.current[i]?.setAttribute(
          "transform",
          `translate(${(ox + m.dx).toFixed(2)} ${(oy + m.dy).toFixed(2)})`,
        );
      }

      for (let j = 0; j < edges.length; j++) {
        const e = edges[j];
        const el = edgeRefs.current[j];
        if (!el) continue;
        const a = rp[e.a];
        const na = nodes[e.a];
        if (!a) continue;
        el.setAttribute("x1", (a.x + (e.aSide * na.w) / 2).toFixed(2));
        el.setAttribute("y1", a.y.toFixed(2));
        if (e.b !== null && rp[e.b]) {
          const b = rp[e.b];
          const nb = nodes[e.b];
          el.setAttribute("x2", (b.x + (e.bSide * nb.w) / 2).toFixed(2));
          el.setAttribute("y2", b.y.toFixed(2));
        } else {
          el.setAttribute("x2", e.ax.toFixed(2));
          el.setAttribute("y2", e.ay.toFixed(2));
        }
      }
    };
    stepRef.current = step;

    if (reduced) return; // handlers drive the reduced path directly
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000));
      last = t;
      step(dt, t / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stepRef.current = null;
    };
  }, [inView, reduced, width, layout]);

  // ——— pointer plumbing ———
  const toSvg = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const L = layoutRef.current;
    if (!svg || !L) return null;
    const r = svg.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    return { x: (clientX - r.left) * (L.w / r.width), y: (clientY - r.top) * (L.h / r.height) };
  };

  const cancelPending = () => {
    const p = pendingRef.current;
    if (!p) return;
    if (p.timer) window.clearTimeout(p.timer);
    if (p.preventer) {
      try {
        nodeRefs.current[p.i]?.removeEventListener("touchmove", p.preventer);
      } catch {
        /* already gone */
      }
    }
    if (!p.engaged) pendingRef.current = null;
  };

  const engage = (i: number, pointerId: number) => {
    const p = pendingRef.current;
    const L = layoutRef.current;
    const rp = renderRef.current[i];
    if (!p || !L || !rp) return;
    p.engaged = true;
    if (p.timer) window.clearTimeout(p.timer);
    try {
      nodeRefs.current[i]?.setPointerCapture(pointerId);
    } catch {
      /* capture is best-effort */
    }
    dragRef.current = { i, grabX: p.sx - rp.x, grabY: p.sy - rp.y, px: p.sx, py: p.sy };
    setDragIdx(i);
    setHover(i);
    // stretch-proof the connected threads (drop their dash pattern)
    L.edges.forEach((e, j) => {
      if (e.a === i || e.b === i) edgeRefs.current[j]?.setAttribute("stroke-dasharray", "none");
    });
    // once dragging, stop touch scrolling from stealing the gesture
    const el = nodeRefs.current[i];
    const preventer = (ev: TouchEvent) => ev.preventDefault();
    el?.addEventListener("touchmove", preventer, { passive: false });
    p.preventer = preventer;
  };

  const release = () => {
    const p = pendingRef.current;
    const d = dragRef.current;
    if (p) {
      if (p.timer) window.clearTimeout(p.timer);
      if (p.preventer) {
        try {
          nodeRefs.current[p.i]?.removeEventListener("touchmove", p.preventer);
        } catch {
          /* already gone */
        }
      }
      try {
        nodeRefs.current[p.i]?.releasePointerCapture(p.id);
      } catch {
        /* capture is best-effort */
      }
    }
    pendingRef.current = null;
    if (d) {
      dragRef.current = null;
      setDragIdx(null);
      setHover(null);
      if (reducedRef.current) {
        const sim = simRef.current;
        sim.forEach((m) => {
          m.dx = 0;
          m.dy = 0;
          m.vx = 0;
          m.vy = 0;
        });
        stepRef.current?.(null, performance.now() / 1000);
      }
    }
  };

  const onNodePointerDown = (i: number) => (e: React.PointerEvent) => {
    if (dragRef.current || pendingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const s = toSvg(e.clientX, e.clientY);
    if (!s) return;
    pendingRef.current = {
      i,
      id: e.pointerId,
      sx: s.x,
      sy: s.y,
      startX: e.clientX,
      startY: e.clientY,
      engaged: false,
      timer: 0,
      preventer: null,
    };
    if (e.pointerType === "touch") {
      // hold briefly (or swipe horizontally) to grab — vertical swipes keep scrolling
      pendingRef.current.timer = window.setTimeout(() => engage(i, e.pointerId), 220);
    } else {
      e.preventDefault();
      engage(i, e.pointerId);
    }
  };

  const onNodePointerMove = (i: number) => (e: React.PointerEvent) => {
    const p = pendingRef.current;
    if (!p || p.id !== e.pointerId) return;
    const s = toSvg(e.clientX, e.clientY);
    if (!s) return;
    if (!p.engaged) {
      if (e.pointerType !== "touch") return;
      const dx = e.clientX - p.startX;
      const dy = e.clientY - p.startY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        p.sx = s.x;
        p.sy = s.y;
        engage(i, e.pointerId);
      } else if (Math.abs(dy) > 14) {
        cancelPending();
      }
      return;
    }
    const d = dragRef.current;
    if (!d) return;
    d.px = s.x;
    d.py = s.y;
    if (reducedRef.current) stepRef.current?.(null, performance.now() / 1000);
  };

  const onNodePointerEnd = (e: React.PointerEvent) => {
    const p = pendingRef.current;
    if (!p || p.id !== e.pointerId) return;
    release();
  };

  // dragged node renders last so it floats above its neighbours
  const order = useMemo(() => {
    const idx = layout.nodes.map((_, i) => i);
    if (dragIdx === null) return idx;
    return [...idx.filter((i) => i !== dragIdx), dragIdx];
  }, [layout, dragIdx]);

  const { nodes, edges, h } = layout;
  const ariaText = nodes
    .flatMap((n) => n.lines)
    .filter(Boolean)
    .join(", ")
    .toLowerCase();

  const svgClasses = [
    "sw",
    mounted ? "sw-live" : "",
    inView ? "in-view" : "",
    hover !== null || dragIdx !== null ? "hovering" : "",
    dragIdx !== null ? "dragging" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <figure ref={figureRef} className="w-full">
      <svg
        ref={svgRef}
        className={svgClasses}
        {...(width === null
          ? { viewBox: `0 0 ${DESIGN_W} ${h}`, width: "100%" }
          : { width: layout.w, height: h })}
        role="img"
        aria-label={`Skill and service web: ${ariaText}.`}
      >
        {/* threads (behind the nodes) */}
        {edges.map((e, j) => {
          const a = nodes[e.a];
          const bx = e.b !== null ? nodes[e.b].cx + (e.bSide * nodes[e.b].w) / 2 : e.ax;
          const by = e.b !== null ? nodes[e.b].cy : e.ay;
          const active = hover ?? dragIdx;
          const lit = active !== null && (e.a === active || e.b === active);
          return (
            <line
              key={j}
              ref={(el) => {
                edgeRefs.current[j] = el;
              }}
              className={`sw-line${lit ? " lit" : ""}`}
              x1={a.cx + (e.aSide * a.w) / 2}
              y1={a.cy}
              x2={bx}
              y2={by}
              strokeDasharray={e.dash}
              style={{ "--dash": `${e.dash}`, "--d": `${e.delay}ms` } as React.CSSProperties}
            />
          );
        })}

        {/* nodes */}
        {order.map((i) => {
          const n = nodes[i];
          if (!n) return null;
          return (
            <g
              key={i}
              ref={(el) => {
                nodeRefs.current[i] = el;
              }}
              className={`sw-node${hover === i ? " is-hover" : ""}${dragIdx === i ? " is-drag" : ""}`}
              data-accent={n.accent ?? undefined}
              onPointerDown={onNodePointerDown(i)}
              onPointerMove={onNodePointerMove(i)}
              onPointerUp={onNodePointerEnd}
              onPointerCancel={onNodePointerEnd}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover((cur) => (cur === i && dragIdx === null ? null : cur))}
              onContextMenu={(e) => e.preventDefault()}
            >
              <g className="sw-node-inner" style={{ "--nd": `${260 + i * 46}ms` } as React.CSSProperties}>
                <g className="sw-node-lift">
                  {/* generous invisible hit target */}
                  <rect
                    className="sw-hit"
                    x={n.cx - n.w / 2 - 6}
                    y={n.cy - n.h / 2 - 6}
                    width={n.w + 12}
                    height={n.h + 12}
                  />
                  <rect
                    className="sw-rect"
                    data-accent={n.accent ?? undefined}
                    x={n.cx - n.w / 2}
                    y={n.cy - n.h / 2}
                    width={n.w}
                    height={n.h}
                  />
                  <circle className="sw-edot" cx={n.cx - n.w / 2} cy={n.cy} r={2.1} />
                  <circle className="sw-edot" cx={n.cx + n.w / 2} cy={n.cy} r={2.1} />
                  {n.lines.map((line, li) =>
                    line ? (
                      <text
                        key={li}
                        className="sw-label"
                        x={n.cx}
                        y={n.cy + (li - (n.lines.length - 1) / 2) * (compact ? 15 : 15) + 4.5}
                        textAnchor="middle"
                        fontSize={n.fontSize}
                      >
                        {line}
                      </text>
                    ) : null,
                  )}
                </g>
              </g>
            </g>
          );
        })}
      </svg>

      {/* hidden text measurer — feeds exact widths to the layout */}
      <svg aria-hidden="true" className="sw-measure">
        {measureList.map((m, k) => (
          <text
            key={k}
            ref={(el) => {
              measureRefs.current[k] = el;
            }}
            x={0}
            y={0}
            fontSize={fontSize}
            fontWeight={500}
            style={{ fontFamily: "var(--font-sans)", visibility: "hidden" }}
          >
            {m.text}
          </text>
        ))}
      </svg>
    </figure>
  );
}
