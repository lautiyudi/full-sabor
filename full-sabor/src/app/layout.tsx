import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Distribuidora Full Sabor",
  description: "Condimentos y especias | Pedí por WhatsApp",

  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },

  appleWebApp: {
    capable: true,
    title: "Full Sabor",
    statusBarStyle: "default",
  },

  openGraph: {
    title: "Distribuidora Full Sabor",
    description: "Condimentos y especias | Pedí por WhatsApp",
    url: "https://distribuidora-fullsabor.netlify.app",
    siteName: "Distribuidora Full Sabor",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Distribuidora Full Sabor",
      },
    ],
    locale: "es_AR",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Distribuidora Full Sabor",
    description: "Condimentos y especias | Pedí por WhatsApp",
    images: ["/logo.png"],
  },
};



export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f7f7" }}>{children}</body>
    </html>
  );
}
