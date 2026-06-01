import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { QueryProvider } from "@/components/providers/query-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HireSignal Frontend",
  description: "Frontend workspace for the HireSignal recruiting intelligence platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <QueryProvider>
          <div className="min-h-screen bg-white text-black">
            <div className="flex min-h-screen">
              <AppSidebar />
              <div className="flex min-h-screen flex-1 flex-col">
                <AppHeader />
                <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
              </div>
            </div>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
