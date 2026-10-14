import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Instagram Studio",
    short_name: "Studio",
    description: "Piano editoriale e promemoria per i contenuti Instagram",
    lang: "it",
    start_url: "/piano",
    display: "standalone",
    background_color: "#f2f2f2",
    theme_color: "#1e1e1e",
    icons: [
      { src: "/icona-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icona-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icona-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
