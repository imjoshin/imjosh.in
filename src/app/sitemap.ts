import type { MetadataRoute } from "next";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/uses/", "/resume/"].map((path) => ({ url: `https://imjosh.in${path}`, changeFrequency: "monthly", priority: path ? .7 : 1 }));
}
