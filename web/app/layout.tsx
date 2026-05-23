import type { Metadata } from "next";
import { Tiro_Bangla } from "next/font/google";
import { AppNav } from "@/components/app-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

const tiroBangla = Tiro_Bangla({
  weight: "400",
  subsets: ["bengali", "latin"],
  variable: "--font-tiro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ক্লাস মনিটরিং",
  description: "শিবগঞ্জ ফাযিল ডিগ্রী মাদ্রাসা — ক্লাস মনিটরিং সিস্টেম",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn">
      <body className={`${tiroBangla.variable} min-h-screen antialiased`}>
        <Providers>
          <AppNav />
          <main className="mx-auto px-4 py-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
