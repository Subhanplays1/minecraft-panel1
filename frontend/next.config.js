/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.csb.app", "*.codesandbox.io"],
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
      {
        source: "/uploads/:path*",
        destination: "http://localhost:3001/uploads/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
