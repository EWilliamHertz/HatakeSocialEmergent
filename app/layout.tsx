import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MessengerWidget from "@/components/MessengerWidget";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hatake Social",
  description: "The premier trading card community.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          
          {/* Global Footer */}
          <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-8 mt-auto">
            <div className="container mx-auto px-4 max-w-7xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-gray-500 dark:text-gray-400 text-sm">
                  © {new Date().getFullYear()} Hatake Social. All rights reserved.
                </div>
                <div className="flex items-center gap-6 text-sm font-medium">
                  <a href="/about" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    About Us
                  </a>
                  <a href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    Terms of Service
                  </a>
                  <a href="/privacy" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    Privacy Policy
                  </a>
                  <a href="/contact" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition">
                    Contact
                  </a>
                </div>
              </div>
            </div>
          </footer>
          
          <MessengerWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}