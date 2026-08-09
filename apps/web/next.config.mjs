/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 設計書 §9: データの読み書きは必ず Hono API を経由する。
  // Next.js は BFF ではなく純粋な View として扱い、Server Actions に
  // ビジネスロジックを置かない。
  transpilePackages: ["@stockpot/shared", "@stockpot/api-client"],
};

export default nextConfig;
