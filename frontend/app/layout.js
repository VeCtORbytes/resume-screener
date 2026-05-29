import { DM_Serif_Display, Inter } from "next/font/google";
import "./globals.css";

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "HireLens — Recruiter Workspace",
  description: "Modern editorial hiring software built for recruiters.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSerifDisplay.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
