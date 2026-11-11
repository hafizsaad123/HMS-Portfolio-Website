import { ImageResponse } from "next/og";

export const alt = "Hafiz Muhammad Saad — UI/UX Designer & Brand Designer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Branded Open Graph card — the pixel staircase motif, the identity
 * block, and the signature gradient bar. Static (no data fetching),
 * so it renders once at build time.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#ffffff",
          padding: "72px 88px",
          fontFamily: "sans-serif",
        }}
      >
        {/* pixel staircase — the brand motif */}
        <div style={{ display: "flex", flexDirection: "row", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ width: 26, height: 26, background: "#8750ff", borderRadius: 6 }} />
            <div style={{ width: 26, height: 26, background: "#170146", borderRadius: 6, marginTop: 12 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ width: 26, height: 26, background: "#170146", borderRadius: 6 }} />
            <div style={{ width: 26, height: 26, background: "#8750ff", borderRadius: 6, marginTop: 12 }} />
          </div>
        </div>

        {/* identity block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 30,
              color: "#6b7280",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                background: "#8750ff",
                borderRadius: 3,
                marginRight: 14,
              }}
            />
            UI/UX Designer &amp; Brand Designer · Karachi, Pakistan
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-2px",
              lineHeight: 1.05,
            }}
          >
            Hafiz Muhammad
          </div>
          <div
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#8750f6",
              letterSpacing: "-2px",
              lineHeight: 1.05,
            }}
          >
            Saad
          </div>
          <div style={{ fontSize: 26, color: "#9ca3af", marginTop: 26 }}>
            hafiz-m-saad.vercel.app
          </div>
        </div>

        {/* signature gradient bar */}
        <div
          style={{
            width: "100%",
            height: 18,
            marginTop: 40,
            background: "linear-gradient(to right, #160144 0%, #8750ff 72%)",
            borderRadius: 4,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
