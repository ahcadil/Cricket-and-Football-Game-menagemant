import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ArenaCast — Tournament Hub",
  description: "Cricket & football tournament management: player registration, live auction, live scoring.",
};

export const viewport: Viewport = {
  themeColor: "#061410",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        <Navbar user={user ? { name: user.name, role: user.role as any } : null} />
        <main className="mx-auto max-w-7xl px-3 sm:px-4 py-5 sm:py-8 min-h-[calc(100vh-180px)]">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
