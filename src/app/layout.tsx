import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISINVESTMENT",
  description:
    "South African property investment platform with SARS-aware bookkeeping",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900">{children}</body>
    </html>
  );
}
