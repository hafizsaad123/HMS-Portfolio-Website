"use client";

/**
 * StudioCursor — the brand pixel becomes the pointer.
 *
 * One idea, carried everywhere: the purple pixel square that lives in the
 * page corners IS the cursor. The core square tracks the pointer with zero
 * lag (a real cursor must never lie about where it points), and everything
 * layered on top adds life without ever costing precision:
 *
 *   · velocity — it stretches like jelly along the direction of travel
 *                and springs back to a crisp square when you stop
 *   · focus    — over links and buttons it opens into a frosted square
 *                "focus frame" with reticle ticks; external links get an
 *                arrow, actions a pixel dot
 *   · reading  — over paragraphs it narrows into a violet caret beam
 *   · press    — it squashes to 74% and pops back with a small overshoot
 *   · rest     — after ~2s of stillness it breathes on the same 3.6s
 *                rhythm as the corner pixel clusters
 *   · the path — moving sheds brand pixels along the trail (a fixed
 *                canvas riding under the nav): each inherits a fraction
 *                of the pointer's momentum, decelerates, drifts down a
 *                whisper, shrinks and fades — the page remembers where
 *                you've been, then forgets
 *   · click    — a small burst of pixels scatters from the press point
 *
 * Architecture: the cursor DOM always exists (invisible until the pointer
 * arrives); the physics run in one rAF loop writing transforms directly —
 * no React renders while moving. `mode` and `variant` are the only state,
 * and they change only on element boundaries. The system state lives in a
 * ref so client-side route changes never interrupt a live cursor. Form
 * fields hand the pointer back to the native caret (usability first).
 * Touch devices and the admin portal opt out entirely;
 * prefers-reduced-motion keeps a precise, instantly-morphing cursor with
 * no theatrics.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";

type CursorMode = "default" | "text" | "focus" | "hidden";
type FocusVariant = "dot" | "arrow";

/** Elements that open the "focus frame". */
const INTERACTIVE =
  "a, button, input:is([type='checkbox'],[type='radio'],[type='range']," +
  "[type='button'],[type='submit'],[type='reset'],[type='color'],[type='file']), " +
  "[role='button'], [role='link'], [role='tab'], [role='switch'], [role='checkbox'], " +
  "[role='radio'], [role='option'], [role='slider'], summary, label, select, " +
  "[data-cursor='focus']";

/** Elements where the cursor becomes the reading beam. */
const TEXTUAL =
  "p, h1, h2, h3, h4, h5, h6, li, blockquote, figcaption, td, th, dt, dd, " +
  "pre, time, .rich-surface, [data-cursor='text']";

/** Elements that keep the native text caret — the custom cursor steps aside. */
const NATIVE_TEXT =
  "input:is([type='text'],[type='email'],[type='url'],[type='password']," +
  "[type='search'],[type='tel'],[type='number'],[type='date']," +
  "[type='datetime-local'],[type='month'],[type='week'],[type='time']," +
  ":not([type])), textarea, [contenteditable='true'], .ProseMirror";

type Pixel = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  age: number;
};

const MAX_PIXELS = 110;

/** One shed pixel — the color spectrum is weighted toward the brand purple. */
function makePixel(
  x: number,
  y: number,
  vx: number,
  vy: number,
  alphaOverride?: number,
  lifeOverride?: number
): Pixel {
  const roll = Math.random();
  const color = roll < 0.72 ? "#8750f6" : roll < 0.9 ? "#c3a7ff" : "#170146";
  const size = 2.4 + Math.pow(Math.random(), 1.7) * 3.2;
  return {
    x: x + (Math.random() - 0.5) * 3,
    y: y + (Math.random() - 0.5) * 3,
    vx: vx * 0.14 + (Math.random() - 0.5) * 34,
    vy: vy * 0.14 + (Math.random() - 0.5) * 34,
    size,
    radius: size * 0.34,
    color,
    alpha:
      alphaOverride ??
      (color === "#c3a7ff" ? 0.6 : color === "#170146" ? 0.32 : 0.46),
    life: lifeOverride ?? 0.65 + Math.random() * 0.5,
    age: 0,
  };
}

/** Everything the frame loop touches — persists across route changes. */
type System = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  stretch: number;
  angle: number;
  targetAngle: number;
  press: number;
  pressV: number;
  pressed: boolean;
  breathAmp: number;
  live: boolean;
  lastMove: number;
  lastNow: number;
  mode: CursorMode;
  lastSX: number;
  lastSY: number;
  lastT: number;
  spawnAcc: number;
  pixels: Pixel[];
};

function createSystem(): System {
  return {
    x: -100,
    y: -100,
    tx: -100,
    ty: -100,
    vx: 0,
    vy: 0,
    stretch: 1,
    angle: 0,
    targetAngle: 0,
    press: 0.35, // intro: pops open from 0.35 on first appearance
    pressV: 0,
    pressed: false,
    breathAmp: 0,
    live: false,
    lastMove: 0,
    lastNow: 0,
    mode: "default",
    lastSX: 0,
    lastSY: 0,
    lastT: 0,
    spawnAcc: 0,
    pixels: [],
  };
}

export function StudioCursor() {
  const pathname = usePathname();
  const [mode, setMode] = useState<CursorMode>("default");
  const [variant, setVariant] = useState<FocusVariant>("dot");

  const rootRef = useRef<HTMLDivElement>(null);
  const stretchRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sysRef = useRef<System>(createSystem());

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const isPublic = !(pathname ?? "").startsWith("/admin");
    if (!fine || !isPublic) return;

    const root = rootRef.current;
    const stretchEl = stretchRef.current;
    const canvas = canvasRef.current;
    if (!root || !stretchEl || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = sysRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("has-cursor");
    // a live cursor survives route changes — keep it exactly where it was
    if (s.live) root.classList.add("sc-live");

    let canvasDirty = s.pixels.length > 0;
    const hasRoundRect = "roundRect" in ctx;

    // ——— canvas sizing, dpr-aware ———
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    window.addEventListener("resize", fit);

    const applyMode = (m: CursorMode) => {
      if (s.mode !== m) {
        s.mode = m;
        setMode(m);
      }
    };
    const applyVariant = (v: FocusVariant) => {
      setVariant((prev) => (prev === v ? prev : v));
    };

    // ——— what sits under the pointer? ———
    const detect = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      if (!el) return;
      if (el.closest(NATIVE_TEXT)) {
        applyMode("hidden");
        return;
      }
      const inter = el.closest(INTERACTIVE);
      if (inter) {
        applyMode("focus");
        const a = inter.closest("a");
        const external =
          a instanceof HTMLAnchorElement &&
          (a.target === "_blank" ||
            a.protocol === "mailto:" ||
            a.protocol === "tel:" ||
            (a.host !== "" && a.host !== window.location.host));
        applyVariant(external ? "arrow" : "dot");
        return;
      }
      if (el.closest(TEXTUAL)) {
        applyMode("text");
        return;
      }
      applyMode("default");
    };

    const spawn = (
      x: number,
      y: number,
      vx: number,
      vy: number,
      alpha?: number,
      life?: number
    ) => {
      if (s.pixels.length >= MAX_PIXELS) s.pixels.shift();
      s.pixels.push(makePixel(x, y, vx, vy, alpha, life));
    };

    // ——— pointer tracking + trail spawning ———
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      s.tx = e.clientX;
      s.ty = e.clientY;
      s.lastMove = performance.now() / 1000;

      if (!s.live) {
        // first appearance: land exactly where the pointer is, pop open
        s.live = true;
        s.x = e.clientX;
        s.y = e.clientY;
        s.lastSX = e.clientX;
        s.lastSY = e.clientY;
        s.lastT = e.timeStamp;
        root.classList.add("sc-live");
        return;
      }
      if (reduce) {
        s.lastSX = e.clientX;
        s.lastSY = e.clientY;
        s.lastT = e.timeStamp;
        return;
      }

      const dx = e.clientX - s.lastSX;
      const dy = e.clientY - s.lastSY;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.75) return;
      const dtE = Math.max((e.timeStamp - s.lastT) / 1000, 0.004);
      const evx = dx / dtE;
      const evy = dy / dtE;

      s.spawnAcc += dist;
      const spacing = 13 + Math.min(dist * 0.55, 20);
      let n = 0;
      while (s.spawnAcc >= spacing && n < 3) {
        spawn(e.clientX, e.clientY, evx, evy);
        s.spawnAcc -= spacing;
        n++;
      }
      if (n === 3) s.spawnAcc = 0; // fast flicks never queue a backlog
      s.lastSX = e.clientX;
      s.lastSY = e.clientY;
      s.lastT = e.timeStamp;
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      detect(e.target);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      s.pressed = true;
      detect(e.target); // re-read what's under the pointer (content may have moved)
      if (!reduce) {
        for (let i = 0; i < 7; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 70 + Math.random() * 150;
          spawn(
            e.clientX,
            e.clientY,
            Math.cos(a) * sp,
            Math.sin(a) * sp,
            0.5,
            0.38 + Math.random() * 0.26
          );
        }
      }
    };
    const onUp = () => {
      s.pressed = false;
    };

    // hiding also forgets liveness, so the next pointermove walks the full
    // appear path again (snap to the pointer + pop open) — without this a
    // window blur would leave the cursor invisible forever
    const hide = () => {
      s.live = false;
      root.classList.remove("sc-live");
    };
    const show = () => {
      if (s.live) root.classList.add("sc-live");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("blur", hide);
    document.documentElement.addEventListener("mouseleave", hide);
    document.documentElement.addEventListener("mouseenter", show);

    const TAU = Math.PI * 2;
    const normAngle = (d: number) => ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;

    // ——— the single frame loop: cursor + canvas, direct writes only ———
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(Math.max((now - s.lastNow) / 1000, 0.0001), 0.05);
      s.lastNow = now;
      const t = now / 1000;

      // pointer position — immediate, never eased
      const dx = s.tx - s.x;
      const dy = s.ty - s.y;
      s.x = s.tx;
      s.y = s.ty;
      root.style.transform = `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0)`;

      // smoothed velocity
      const kv = 1 - Math.exp(-24 * dt);
      s.vx += (dx / dt - s.vx) * kv;
      s.vy += (dy / dt - s.vy) * kv;
      const speed = Math.hypot(s.vx, s.vy);

      // jelly stretch along the direction of travel
      let targetS = 1;
      if (!reduce && speed > 60) targetS = 1 + Math.min(speed / 2600, 1) * 0.34;
      if (s.mode === "focus") targetS = 1 + (targetS - 1) * 0.4;
      else if (s.mode === "text") targetS = 1 + (targetS - 1) * 0.3;
      s.stretch += (targetS - s.stretch) * (1 - Math.exp(-14 * dt));
      if (speed > 140) {
        s.targetAngle = Math.atan2(s.vy, s.vx);
      } else if (s.stretch < 1.02) {
        // at rest each form stands upright — settle to the nearest
        // symmetric equivalent so the correction is never visible as a
        // wrong pose: the square every 90°, the beam every 180°, the
        // focus frame (arrow + ticks) only full circle
        const unit =
          s.mode === "focus"
            ? Math.PI * 2
            : s.mode === "text"
              ? Math.PI
              : Math.PI / 2;
        s.targetAngle = Math.round(s.angle / unit) * unit;
      }
      s.angle += normAngle(s.targetAngle - s.angle) * (1 - Math.exp(-16 * dt));

      // press — a small underdamped spring (pops back with a hint of overshoot)
      const pressTarget = s.pressed ? 0.74 : 1;
      s.pressV += (pressTarget - s.press) * 850 * dt;
      s.pressV *= Math.exp(-24 * dt);
      s.press += s.pressV * dt;

      // breathing at rest — the same 3.6s rhythm as the corner pixels
      const idle = t - s.lastMove;
      const wantBreath =
        !reduce && s.mode === "default" && s.live && idle > 2.2
          ? Math.min((idle - 2.2) / 0.9, 1)
          : 0;
      s.breathAmp += (wantBreath - s.breathAmp) * (1 - Math.exp(-3 * dt));
      const breath = 1 + s.breathAmp * 0.05 * Math.sin(t * 1.745);

      const k = s.press * breath;
      const sx = s.stretch * k;
      const sy = (1 / (s.stretch * 0.55 + 0.45)) * k;
      stretchEl.style.transform = `translate(-50%, -50%) rotate(${s.angle.toFixed(
        4
      )}rad) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;

      // ——— the pixel trail ———
      if (s.pixels.length > 0) {
        const drag = Math.exp(-3.4 * dt);
        let w = 0;
        for (let i = 0; i < s.pixels.length; i++) {
          const p = s.pixels[i];
          p.age += dt;
          if (p.age >= p.life) continue;
          p.vx *= drag;
          p.vy = p.vy * drag + 30 * dt; // a whisper of gravity
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          s.pixels[w++] = p;
        }
        s.pixels.length = w;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        canvasDirty = s.pixels.length > 0;
        for (const p of s.pixels) {
          const q = p.age / p.life;
          const fade = 1 - q;
          const sz = p.size * (1 - 0.4 * q);
          ctx.globalAlpha = p.alpha * fade * fade; // quick to land, soft to leave
          ctx.fillStyle = p.color;
          if (hasRoundRect) {
            ctx.beginPath();
            ctx.roundRect(p.x - sz / 2, p.y - sz / 2, sz, sz, p.radius * (1 - 0.4 * q));
            ctx.fill();
          } else {
            ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
          }
        }
        ctx.globalAlpha = 1;
      } else if (canvasDirty) {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        canvasDirty = false;
      }
    };
    s.lastNow = performance.now();
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-cursor");
      root.classList.remove("sc-live");
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      canvasDirty = false;
      s.pressed = false;
      window.removeEventListener("resize", fit);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", hide);
      document.documentElement.removeEventListener("mouseleave", hide);
      document.documentElement.removeEventListener("mouseenter", show);
    };
  }, [pathname]);

  return (
    <>
      {/* the pixel trail — a full-viewport canvas riding under the nav */}
      <canvas ref={canvasRef} className="sc-canvas print:hidden" aria-hidden="true" />
      <div
        ref={rootRef}
        className="studio-cursor print:hidden"
        data-mode={mode}
        data-variant={variant}
        aria-hidden="true"
      >
        <div ref={stretchRef} className="sc-stretch">
          <div className="sc-morph">
            <span className="sc-dot" />
            <ArrowUpRight className="sc-arrow" strokeWidth={2.4} aria-hidden="true" />
            <span className="sc-tick t-n" />
            <span className="sc-tick t-e" />
            <span className="sc-tick t-s" />
            <span className="sc-tick t-w" />
          </div>
        </div>
      </div>
    </>
  );
}
