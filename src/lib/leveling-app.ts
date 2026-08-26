/**
 * The leveling overlay is the one tool in the bar that is not a page of this
 * site: it is a Windows app that lives in its own repository. What is here is
 * what a download page has to say about it, which is a download and the three
 * steps to the first one. Everything else the app explains better than a page
 * about the app can.
 */

const RELEASE = "v0.91.0";

const asset = (name: string) =>
  `https://github.com/mkj777/poe-leveling-app/releases/download/${RELEASE}/${name}`;

export const LEVELING_APP = {
  version: RELEASE,
  setup: asset("PoELevelingGuide-win-Setup.exe"),
  portable: asset("PoELevelingGuide-win-Portable.zip"),
  repo: "https://github.com/mkj777/poe-leveling-app",
} as const;

export const LEVELING_SETUP: readonly string[] = [
  "Run the installer.",
  "Start Path of Exile and the app.",
  "Click Start.",
] as const;
