import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CollabDocs — Local-First Collaborative Editor",
    short_name: "CollabDocs",
    description:
      "A local-first, real-time collaborative document editor with offline sync, CRDT conflict resolution, and version history.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3b82f6",
    orientation: "portrait",
    categories: ["productivity", "utilities"],
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
