import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "web.poecdn.com" }],
  },

  /**
   * Every URL of this site used to begin with a league, back when the site was
   * one tool with a league picker over it. Links from that time still work: the
   * three pages that moved are sent to where they live now, and the old landing
   * page is answered by `app/[league]/page.tsx`, which has to look the league up
   * before it can send anyone anywhere.
   */
  async redirects() {
    return [
      {
        source: "/:league/maps",
        destination: "/maps/:league",
        permanent: false,
      },
      {
        source: "/:league/simulation",
        destination: "/beasts/:league/simulation",
        permanent: false,
      },
      {
        source: "/:league/leveling",
        destination: "/leveling",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
