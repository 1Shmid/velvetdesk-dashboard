import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VelvetDesk Dashboard",
  description: "AI Receptionist Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}