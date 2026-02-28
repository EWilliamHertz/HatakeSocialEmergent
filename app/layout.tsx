import type { Metadata, Viewport } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import MessengerWidget from "@/components/MessengerWidget";
import { ThemeProvider } from "@/components/ThemeProvider";
import MobileNav from "@/components/MobileNav";
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatake Social",
  description: "The premier trading card community.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Hatake",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${syne.variable} ${inter.variable} antialiased bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <div className="flex-1 flex flex-col pb-16 md:pb-0">
            {children}
          </div>
           <PWAInstallPrompt />
          <footer className="hidden md:block w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8 mt-auto">
            <div className="container mx-auto px-4 max-w-7xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  © {new Date().getFullYear()} Hatake Social. All rights reserved.
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                  <a href="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">About Us</a>
                  <a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Terms of Service</a>
                  <a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Privacy Policy</a>
                  <a href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">Contact</a>
                </div>
              </div>
            </div>
          </footer>
          <MobileNav />
          <MessengerWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
