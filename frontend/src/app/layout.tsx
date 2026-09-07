import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BrandingProvider } from "@/components/BrandingProvider";
import { AdBlockerProvider } from "@/components/AdBanner";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Minevo — Minecraft Server Hosting",
  description: "Premium Minecraft Server Hosting — Manage your servers with Minevo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased" style={{ fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif" }}>
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
                },
              }}
            />
          </AdBlockerProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
