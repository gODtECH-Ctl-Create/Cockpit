import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "gODtECH Cockpit",
  description: "Personal command center for projects, priorities, and development state."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}