import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata: Metadata = {
  title: "Account Management",
  description: "Analyze and present Autodesk product usage data across multiple customer accounts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black text-white">
      <body className="antialiased bg-black text-white min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
