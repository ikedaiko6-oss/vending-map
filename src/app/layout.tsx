import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "自販機マップ",
  description: "みんなで作る自販機マップ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
