import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider } from "@/components/BrandingProvider";
import { AdBlockerProvider } from "@/components/AdBanner";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Minevo - Minecraft Server Hosting",
  description: "Free Minecraft Server Hosting - Manage your servers with Minevo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXX" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen antialiased">
        <BrandingProvider>
          <AdBlockerProvider>
            {children}
            <Toaster position="bottom-right" toastOptions={{ style: { background: "var(--brand-card)", color: "var(--brand-text)", border: "1px solid var(--brand-border)", borderRadius: "10px" } }} />
          </AdBlockerProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
