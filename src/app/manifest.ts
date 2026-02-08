import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Universal Audio Editor",
    short_name: "Audio Editor",
    description:
      "Download, convert, and trim audio and video files right in your browser. Fast, free, and private.",
    start_url: "/",
    display: "fullscreen",
    background_color: "#06060e",
    theme_color: "#06060e",
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
