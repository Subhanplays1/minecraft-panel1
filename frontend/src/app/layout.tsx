import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider } from "@/components/BrandingProvider";
import { AdBlockerProvider } from "@/components/AdBanner";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Minevo — Minecraft Server Hosting",
  description: "Premium Minecraft Server Hosting — Manage your servers with Minevo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: "Inter, system-ui, -apple-system, sans-serif" }}>
        <BrandingProvider>
          <AdBlockerProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "var(--brand-card)",
                  color: "var(--brand-text)",
                  border: "1px solid var(--brand-border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontFamily: "Inter, system-ui, sans-serif",
                },
              }}
            />
          </AdBlockerProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
