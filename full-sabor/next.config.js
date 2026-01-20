/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", //

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**' }
    ]
  }
};

module.exports = nextConfig;
