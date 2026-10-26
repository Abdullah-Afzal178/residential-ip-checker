import { ImageResponse } from "next/og";

import { PAGE_TITLE, SITE_NAME } from "@/lib/constants";

export const alt = PAGE_TITLE;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TILES = [
  { label: "RESIDENTIAL", color: "#7ee787" },
  { label: "MOBILE", color: "#6cc4ff" },
  { label: "BUSINESS", color: "#ffd23f" },
  { label: "DATACENTER", color: "#ff6b8b" },
];

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
          background: "#fff8e7",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          color: "#0a0a0a",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#0a0a0a",
              color: "#fff8e7",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "8px 16px",
            }}
          >
            {SITE_NAME.toUpperCase()}
          </div>
          <div style={{ display: "flex", marginTop: "28px", fontSize: "76px", fontWeight: 700, lineHeight: 1.02 }}>
            Is this IP residential, mobile or datacenter?
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px" }}>
          {TILES.map((tile) => (
            <div
              key={tile.label}
              style={{
                display: "flex",
                background: tile.color,
                border: "5px solid #0a0a0a",
                boxShadow: "10px 10px 0 0 #0a0a0a",
                padding: "18px 22px",
                fontSize: "30px",
                fontWeight: 700,
              }}
            >
              {tile.label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
