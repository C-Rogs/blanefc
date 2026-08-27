import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "No Knees FC",
    short_name: "No Knees",
    description: "Vote, see who's in, and pay for 5-a-side.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1a12",
    theme_color: "#0b1a12",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
