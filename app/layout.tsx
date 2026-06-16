import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { TimeZoneSync } from "@/components/TimeZoneSync";

export const metadata: Metadata = {
  title: "Weekly Compass",
  description:
    "A weekly alignment ritual. Am I becoming the person I want to become?",
};

export const viewport: Viewport = {
  themeColor: "#f5f5f4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans text-ink">
        <TimeZoneSync />
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 sm:px-8">
          <Header />
          <main className="flex min-h-0 flex-1 flex-col pb-24 pt-4">{children}</main>
        </div>
      </body>
    </html>
  );
}
