import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { JsonLd } from "@/components/json-ld";
import { MobileBar } from "@/components/mobile-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLeagues, leagueSlug } from "@/lib/ninja";
import { websiteLd } from "@/lib/seo";
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/site";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Everything relative in the metadata below, and every Open Graph image the
  // routes generate, is resolved against this. Without it they stay paths, and
  // a path is not a thing a crawler on another host can follow.
  metadataBase: new URL(SITE_URL),
  title: {
    // What the site is called plus what it is for. A tab says the first half,
    // a search result needs the second: nobody searches for a name they have
    // not heard of yet.
    default: "Path of Tools: Every Path of Exile Tool in One Place",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "games",
  creator: "mkj777",
  // No canonical here on purpose: a layout hands its metadata down, so one
  // canonical set once would claim every page of the site is the home page.
  // Each route declares its own.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // A full length snippet and a large thumbnail. Both default to something
      // shorter, and a truncated snippet is the version an answer engine quotes.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the token Search Console hands
  // out, and the tag it wants to find appears. Absent, nothing is rendered.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // The sidebar has no league picker: it follows whichever page you are on,
  // and needs the list only to hand the two tools that ask for one a league
  // that exists. A page with no league in its path falls back to the first.
  const leagues = await getLeagues().catch(() => []);
  const fallback = leagueSlug(leagues[0]?.id ?? "Standard");

  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-svh">
        {/* Who the site is and what it is called, once, for the crawlers that
            would otherwise have to infer both from the chrome. */}
        <JsonLd data={websiteLd()} />
        <TooltipProvider>
          <SidebarProvider>
            <AppSidebar leagues={leagues} fallback={fallback} />
            <SidebarInset className="min-w-0">
              <MobileBar />
              {children}
            </SidebarInset>
          </SidebarProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
