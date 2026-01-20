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
};


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "Arial, sans-serif", background: "#f7f7f7" }}>{children}</body>
    </html>
  );
}
