import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import MessengerWidget from "@/components/MessengerWidget";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthPromptProvider } from "@/components/AuthPromptModal";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TCG Hub - Trade & Collect",
  description: "Your ultimate TCG trading and collection platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100`}
      >
        <ThemeProvider>
          <AuthPromptProvider>
            {children}
            <MessengerWidget />
            <Toaster 
              position="bottom-right"
              toastOptions={{
                className: 'dark:bg-gray-800 dark:text-white',
              }}
            />
          </AuthPromptProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
