import { MetadataRoute } from "next";
import { WEBSITE_NAME } from "@/const";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: WEBSITE_NAME,
    short_name: WEBSITE_NAME,
    description: `${WEBSITE_NAME} 是一个功能完整、轻量级的 SQLite 数据库管理工具。`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
