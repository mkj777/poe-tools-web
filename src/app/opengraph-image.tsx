import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";
import { EXTERNAL_TOOLS } from "@/lib/tools";

export const alt = `${SITE_NAME}: every Path of Exile tool in one place`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card a link to this site unfurls into, on every route that does not
 * override it.
 *
 * Drawn rather than shipped as a file, so it stays in step with the palette and
 * costs nothing in the repository. The colours are the dark theme read out of
 * `globals.css` as hex, because the renderer knows no custom properties and no
 * oklch.
 */
export default function Image() {
  const marble = "#cfd3d6";
  const muted = "#919496";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0f1113",
        padding: 72,
        // The one flourish: a light that falls from the top left, the way the
        // sidebar is lit.
        backgroundImage:
          "radial-gradient(900px 500px at 12% -10%, #1c2024 0%, #0f1113 70%)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* The same mark as the favicon and the bar, see wordmark.tsx. */}
        <svg width="56" height="56" viewBox="0 0 24 24">
          <path
            fill={marble}
            fillRule="evenodd"
            d="M12 2.25 21.75 12 12 21.75 2.25 12Z M12 6.75 17.25 12 12 17.25 6.75 12Z"
          />
          <path fill={marble} d="M12 9.375 14.625 12 12 14.625 9.375 12Z" />
        </svg>
        <div style={{ fontSize: 34, color: marble, letterSpacing: -0.5 }}>
          Path of Tools
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 76,
            color: "#e8ebed",
            lineHeight: 1.1,
            letterSpacing: -2,
            maxWidth: 900,
          }}
        >
          Every Path of Exile tool in one place
        </div>
        <div style={{ fontSize: 30, color: muted, maxWidth: 880 }}>
          Live Bestiary beast prices, the cost of every Atlas exclusion, and the
          tools worth having next to them.
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 24, color: muted }}>
        {[
          "Bestiary prices",
          "Scarab nodes",
          "Leveling overlay",
          `${EXTERNAL_TOOLS.length} more tools`,
        ].map((item) => (
          <div
            key={item}
            style={{
              display: "flex",
              border: `1px solid ${marble}33`,
              borderRadius: 999,
              padding: "10px 22px",
            }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
