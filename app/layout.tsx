import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARIA — gODtECH Command Center",
  description: "Personal operating view for projects, priorities, signals, and development state.",
  applicationName: "ARIA",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
