import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: "StealthPilot - Your Invisible AI Interview Assistant",
  description: "Real-time AI assistance for interviews, meetings, and presentations. Completely invisible to screen share.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.variable, "font-sans antialiased")}>
        {children}
      </body>
    </html>
  );
}
