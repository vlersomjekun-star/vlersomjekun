import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VlersoMjekun",
    short_name: "VlersoMjekun",
    description:
      "Vlerësime të verifikuara për mjekë dhe klinika në Shqipëri.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1e6fb8",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
