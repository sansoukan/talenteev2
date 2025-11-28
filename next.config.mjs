/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  experimental: {
    // ⚠️ allowedDevOrigins SUPPRIMÉ (clé invalide en Next 14)
    
    // ⬅️ La seule ligne dont PDFKit a besoin
    serverComponentsExternalPackages: ["pdfkit"],
  },
};

export default nextConfig;
