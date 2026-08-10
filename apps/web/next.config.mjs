/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 設計書 §9: データの読み書きは必ず Hono API を経由する。
  // Next.js は BFF ではなく純粋な View として扱い、Server Actions に
  // ビジネスロジックを置かない。
  transpilePackages: ["@stockpot/shared", "@stockpot/api-client"],

  // workspace パッケージ（shared / api-client）は NodeNext スタイルの
  // `./foo.js` 形式で TS を import する。webpack は `.js` → `.ts` を
  // 標準では解決しないため、拡張子エイリアスで解決させる。
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
