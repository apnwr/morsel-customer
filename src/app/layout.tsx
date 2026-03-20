import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FirebaseAuthProvider } from "@/components/providers/FirebaseAuthProvider";
import { RestaurantProvider } from "@/contexts/RestaurantContext";
import { CartProvider } from "@/contexts/CartContext";
import { OrderProvider } from "@/contexts/OrderContext";
import { SplitProvider } from "@/contexts/SplitContext";
import { SessionProvider } from "@/contexts/SessionContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import DebugPanelWrapper from "@/components/layout/DebugPanelWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MORSEL - Enjoy every meal, not the math",
  description: "Restaurant ordering made simple with MORSEL",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover', // Important for iOS safe areas
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <FirebaseAuthProvider>
          <LocaleProvider>
            <SessionProvider>
              <RestaurantProvider>
                <ThemeProvider>
                  <CartProvider>
                    <OrderProvider>
                      <SplitProvider>
                        {children}
                        <DebugPanelWrapper />
                      </SplitProvider>
                    </OrderProvider>
                  </CartProvider>
                </ThemeProvider>
              </RestaurantProvider>
            </SessionProvider>
          </LocaleProvider>
        </FirebaseAuthProvider>
      </body>
    </html>
  );
}
