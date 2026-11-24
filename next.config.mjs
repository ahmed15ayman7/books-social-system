/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["sharp", "pg", "@prisma/client"],
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
};
export default nextConfig;
