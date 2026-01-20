import type { Metadata } from "next";

const SITE_URL = "https://distribuidora-full-sabor.netlify.app";

export const metadata: Metadata = {
  title: "Distribuidora Full Sabor",
  description: "Condimentos y especias | Pedí por WhatsApp",

  metadataBase: new URL(SITE_URL),

  openGraph: {
    title: "Distribuidora Full Sabor",
    description: "Condimentos y especias | Pedí por WhatsApp",
    url: SITE_URL,
    siteName: "Distribuidora Full Sabor",
    images: [
      {
        url: "/logo2.png",
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
    images: ["/logo2.png"],
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/logo.png",
  },
};




export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f7f7" }}>{children}</body>
    </html>
  );
}
