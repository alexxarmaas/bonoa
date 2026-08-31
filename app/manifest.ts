import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bonoa",
    short_name: "Bonoa",
    description: "Carnets, bonos, recompensas y fidelización. Un solo QR.",
    start_url: "/wallet",
    display: "standalone",
    background_color: "#f8fbff",
    theme_color: "#2563eb",
    orientation: "portrait",
    categories: ["lifestyle", "utilities", "shopping"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
