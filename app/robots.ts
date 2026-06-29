import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/register"],
        disallow: ["/api/", "/documents/"],
      },
    ],
    sitemap: "https://collab-doc-editor-rho.vercel.app/sitemap.xml",
  };
}
