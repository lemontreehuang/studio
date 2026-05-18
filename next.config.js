/* eslint-disable @typescript-eslint/no-var-requires */
const withMDX = require("@next/mdx")();
const pkg = require("./package.json");
const withSerwistInit = require("@serwist/next").default;

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: false,
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  env: {
    NEXT_PUBLIC_STUDIO_VERSION: pkg.version,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.NEXT_PUBLIC_OB_API ?? "https://app.dev.outerbase.com/api/v1"}/:path*`,
      },
    ];
  },
};

module.exports = withSerwist({ ...withMDX(nextConfig), output: "standalone" });
