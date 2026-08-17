/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@codelens/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;

