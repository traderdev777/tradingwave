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
      <body className="bg-[var(--bg)] text-[var(--text)] antialiased selection:bg-[#FF7722] selection:text-white">
        {children}
      </body>
    </html>
  );
}
