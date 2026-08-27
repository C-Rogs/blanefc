import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "No Knees FC",
  description: "Vote, see who's in, drop out, and pay for 5-a-side.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "No Knees FC",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1a12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${bebas.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
