import type { MetadataRoute } from "next";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/projects/", "/uses/", "/music/", "/resume/"].map((path) => ({ url: `https://imjosh.in${path}`, changeFrequency: path === "/music/" ? "daily" : "monthly", priority: path ? .7 : 1 }));
}
