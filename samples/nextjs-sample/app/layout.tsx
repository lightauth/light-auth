import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Auth Test App",
  description: "A simple app to test login and logout functionality",
};
export const dynamic = "force-dynamic"; // Force dynamic rendering for this page

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Header />

        <main className={`${inter.className} bg-gray-50`}>{children}</main>
      </body>
    </html>
  );
}
