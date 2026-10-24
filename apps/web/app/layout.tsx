import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TradingWave — AI-Powered Algorithmic Trading for Indian Markets",
  description: "Deterministic strategy creation, backtesting, and paper trading for Indian equity and derivative markets.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
