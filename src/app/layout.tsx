import type { Metadata } from "next";

import { DemoBanner } from "@/components/demo-banner";
import { isDemoMode } from "@/db";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Job Tracker", template: "%s | Job Tracker" },
  description: "Track job applications from wishlist to offer, with reminders, stats and CSV export.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {isDemoMode() && <DemoBanner />}
        {children}
      </body>
    </html>
  );
}
