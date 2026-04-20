import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Lomi Lomi — Rencontres discrètes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #09090b 0%, #1e1b4b 50%, #09090b 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 96, marginBottom: 16 }}>💜</div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 800,
          background: "linear-gradient(90deg, #a78bfa, #ec4899)",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        Lomi Lomi
      </div>
      <div
        style={{
          fontSize: 28,
          color: "#a1a1aa",
          marginTop: 12,
        }}
      >
        Rencontres discrètes &amp; affinités authentiques
      </div>
    </div>,
    { ...size },
  );
}
