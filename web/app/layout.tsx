import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { FeedbackProvider } from "@/components/providers/feedback-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asset Hub 资产管理插件",
  description:
    "Asset Hub 是 DooTask 的资产管理插件，提供资产全生命周期管理能力。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          storageKey="asset_hub_theme"
          enableSystem
          disableTransitionOnChange
        >
          <FeedbackProvider>
            {children}
            <Toaster position="top-center" />
          </FeedbackProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
