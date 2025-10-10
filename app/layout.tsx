import type { Metadata } from "next";
import "./globals.css";
import "lite-youtube-embed/src/lite-yt-embed.css";
import { AuthProvider } from "@/lib";

export const metadata: Metadata = {
  title: "Kakioki - Simple Messaging",
  description: "A lightweight MSN messenger-style messaging app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className="antialiased text-gray-900">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
