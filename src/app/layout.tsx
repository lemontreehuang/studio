import { WEBSITE_NAME } from "@/const";
import type { Metadata, Viewport } from "next";

import "./codemirror-override.css";
import "./globals.css";

const siteDescription = `${WEBSITE_NAME} 是一个功能完整、轻量级的 SQLite 数据库管理工具。它完全运行在浏览器中，无需下载任何软件。`;

import { DialogProvider } from "@/components/create-dialog";
import I18nProvider from "@/components/i18n-provider";

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: WEBSITE_NAME,
  keywords: [
    "sqlite",
    "数据库",
    "在线编辑器",
    "studio",
    "browser",
    "editor",
    "gui",
    "online",
    "client",
  ],
  description: siteDescription,
  openGraph: {
    siteName: WEBSITE_NAME,
    description: siteDescription,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <I18nProvider>
          {children}
          <DialogProvider slot="default" />
        </I18nProvider>
      </body>
    </html>
  );
}
