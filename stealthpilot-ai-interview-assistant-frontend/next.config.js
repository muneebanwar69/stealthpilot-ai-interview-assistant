/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],
  images: {
    domains: ['images.unsplash.com', 'prod.spline.design'],
  },
}

module.exports = nextConfig
