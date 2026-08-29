import type { MetadataRoute } from "next";
import { robotsRules } from "@/lib/seo";
import { canonical } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: robotsRules(),
    sitemap: canonical("/sitemap.xml"),
    host: canonical("/"),
  };
}
