import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bonoa, wallet digital de fidelización";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        background: "#f8fbff",
        color: "#0f172a",
        padding: "72px 82px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ position: "absolute", width: 460, height: 460, borderRadius: 999, right: -110, top: -125, background: "#dbeafe" }} />
      <div style={{ position: "absolute", width: 300, height: 300, borderRadius: 999, right: 210, bottom: -160, background: "#cffafe" }} />

      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", width: 58, height: 58, borderRadius: 18, background: "linear-gradient(135deg,#2563eb,#06b6d4)", color: "white", alignItems: "center", justifyContent: "center", fontSize: 31, fontWeight: 900 }}>B</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, letterSpacing: -1 }}>BONŌA</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 790 }}>
          <div style={{ display: "flex", fontSize: 17, textTransform: "uppercase", letterSpacing: 4, fontWeight: 800, color: "#2563eb" }}>Fidelización digital para negocios locales</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 66, lineHeight: 1.02, letterSpacing: -3.5, fontWeight: 900 }}>Tus clientes vuelven. Tú sabes por qué.</div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 25, lineHeight: 1.4, color: "#475569" }}>Carnets, bonos, recompensas y campañas en un único lugar.</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 19, fontWeight: 800, color: "#334155" }}>
          <div style={{ display: "flex", padding: "11px 18px", borderRadius: 999, background: "white", border: "1px solid #dbe7f5" }}>Un QR</div>
          <div style={{ display: "flex", padding: "11px 18px", borderRadius: 999, background: "white", border: "1px solid #dbe7f5" }}>Todos tus beneficios</div>
          <div style={{ display: "flex", marginLeft: "auto", color: "#64748b" }}>bonoa.tramassso.com</div>
        </div>
      </div>
    </div>,
    size,
  );
}
