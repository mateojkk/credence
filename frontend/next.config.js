/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  async redirects() {
    return [
      {
        source: "/dashboard",
        destination: "/check",
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
