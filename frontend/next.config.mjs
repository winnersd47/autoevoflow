/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    workerThreads: false,
    cpus: 1,
  },
  webpack(config) {
    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil",
      });
    }
    return config;
  },
};

export default nextConfig;
