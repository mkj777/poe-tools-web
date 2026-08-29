import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileBar } from "@/components/mobile-bar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLeagues, leagueSlug } from "@/lib/ninja";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Path of Tools",
    template: "%s · Path of Tools",
  },
  description:
    "One place to reach every Path of Exile tool: beast prices and map searches here, and the sites that do the rest a click away.",
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
