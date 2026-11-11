/**
 * Services network diagram — inline SVG recreation of the About export:
 * 12 nodes (4 rows × 3 columns), three of them solid (2 purple + 1 deep
 * violet), white nodes with side dots, thin connector lines running to the
 * diagram edges. Decorative; the service names are exposed as text.
 */

const ROW_Y = [8, 84, 160, 236];
const ROW_H = 58;

interface NodeSpec {
  row: 0 | 1 | 2 | 3;
  col: 0 | 1 | 2;
  x: number;
  w: number;
  label?: string;
  fill?: "brand" | "deep";
}

const nodes: NodeSpec[] = [
  { row: 0, col: 0, x: 60, w: 150, label: "UI/UX Design" },
  { row: 0, col: 1, x: 330, w: 200, label: "Brand Identity Design" },
  { row: 0, col: 2, x: 640, w: 190, fill: "brand" },
  { row: 1, col: 0, x: 60, w: 190, fill: "deep" },
  { row: 1, col: 1, x: 330, w: 250, label: "Conversion Focused Landing Pages" },
  { row: 1, col: 2, x: 640, w: 190, label: "Social Media Posts" },
  { row: 2, col: 0, x: 60, w: 190, fill: "brand" },
  { row: 2, col: 1, x: 330, w: 200, label: "Web Design" },
  { row: 2, col: 2, x: 640, w: 200, label: "AI Assisted Frontend Dev" },
  { row: 3, col: 0, x: 60, w: 190, label: "Brand Strategy" },
  { row: 3, col: 1, x: 330, w: 200, label: "Branding Expert" },
  { row: 3, col: 2, x: 640, w: 190, label: "Ad Creatives" },
];

const nodeByRC = (r: number, c: number) => nodes.find((n) => n.row === r && n.col === c)!;
const centerY = (r: number) => ROW_Y[r] + ROW_H / 2;

/**
 * Node labels are managed from the admin portal: pass `labels` (12
 * strings in reading order — an empty string renders the solid node).
 * The bundled labels are the approved default.
 */
export function ServicesDiagram({ labels }: { labels?: string[] }) {
  const nodeLabels: string[] = nodes.map((n, i) =>
    labels && i < labels.length ? labels[i] : (n.label ?? ""),
  );
  const ariaText = nodeLabels.filter(Boolean).join(", ").toLowerCase();
  const line = "#d9d9d9";
  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 950 302"
        role="img"
        aria-label={`Service network covering ${ariaText}.`}
        className="h-auto w-full"
      >
        {/* connector lines: horizontal between neighbours + outward to edges */}
        {([0, 1, 2, 3] as const).map((r) => {
          const n0 = nodeByRC(r, 0);
          const n1 = nodeByRC(r, 1);
          const n2 = nodeByRC(r, 2);
          const y = centerY(r);
          return (
            <g key={r} stroke={line} strokeWidth="1.6">
              {/* left edge outward */}
              <line x1="0" y1={y} x2={n0.x} y2={y} />
              {/* between col0 — col1 */}
              <line x1={n0.x + n0.w} y1={y} x2={n1.x} y2={y} />
              {/* between col1 — col2 */}
              <line x1={n1.x + n1.w} y1={y} x2={n2.x} y2={y} />
              {/* right edge outward */}
              <line x1={n2.x + n2.w} y1={y} x2="950" y2={y} />
              {/* faint verticals linking rows at the outer edges */}
              {r < 3 ? (
                <>
                  <line x1={n0.x + n0.w / 2} y1={y + ROW_H / 2} x2={n0.x + n0.w / 2} y2={ROW_Y[r + 1]} opacity="0.55" />
                  <line x1={n2.x + n2.w / 2} y1={y + ROW_H / 2} x2={n2.x + n2.w / 2} y2={ROW_Y[r + 1]} opacity="0.55" />
                </>
              ) : null}
            </g>
          );
        })}

        {/* nodes */}
        {nodes.map((n, i) => {
          const y = ROW_Y[n.row];
          if (n.fill) {
            return (
              <rect
                key={i}
                x={n.x}
                y={y}
                width={n.w}
                height={ROW_H}
                rx="10"
                fill={n.fill === "brand" ? "#8750f6" : "#170146"}
              />
            );
          }
          const label = nodeLabels[i] ?? "";
          const cym = y + ROW_H / 2;
          let fontSize = 15;
          if (label.length > 26) fontSize = 12.5;
          else if (label.length > 20) fontSize = 13.5;
          return (
            <g key={i}>
              <rect x={n.x} y={y} width={n.w} height={ROW_H} rx="10" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1.6" />
              <text
                x={n.x + n.w / 2}
                y={cym + fontSize * 0.36}
                textAnchor="middle"
                fontSize={fontSize}
                fill="#111827"
                fontFamily="var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
              >
                {label}
              </text>
              {/* side dots */}
              <circle cx={n.x} cy={cym} r="3.2" fill="#111827" />
              <circle cx={n.x + n.w} cy={cym} r="3.2" fill="#111827" />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
