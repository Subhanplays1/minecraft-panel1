import type { Metadata } from "next";
import "./globals.css";
import { BrandingProvider } from "@/components/BrandingProvider";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Minecraft Panel",
  description: "Minecraft Server Management Panel",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <BrandingProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--brand-card)",
                color: "var(--brand-text)",
                border: "1px solid var(--brand-border)",
              },
            }}
          />
        </BrandingProvider>
      </body>
    </html>
  );
}
