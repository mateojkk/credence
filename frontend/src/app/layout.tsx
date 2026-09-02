import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Credence | Verifiable Cross-Chain Credit on the Attestcoin Protocol",
  description:
    "Cryptographically proven credit scores and undercollateralized lending on Creditcoin, powered by the Attestcoin Protocol Block Prover precompile (0x0FD2).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${manrope.variable}`}>
      <body className="bg-background text-foreground min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
