/**
 * The leveling overlay is the one tool in the bar that is not a page of this
 * site: it is a Windows app that lives in its own repository. What is here is
 * what a download page has to say about it, kept in one place so a release only
 * ever moves one line.
 */

const RELEASE = "v0.91.0";

const asset = (name: string) =>
  `https://github.com/mkj777/poe-leveling-app/releases/download/${RELEASE}/${name}`;

export const LEVELING_APP = {
  version: RELEASE,
  /** The installer, rounded the way a download page rounds it. */
  size: "11.8 MB",
  setup: asset("PoELevelingGuide-win-Setup.exe"),
  portable: asset("PoELevelingGuide-win-Portable.zip"),
  repo: "https://github.com/mkj777/poe-leveling-app",
  releases: "https://github.com/mkj777/poe-leveling-app/releases",
} as const;

/**
 * The default install of Path of Exile, which is where the log is for most.
 * Raw, because every separator in a Windows path is an escape otherwise.
 */
const CLIENT_TXT = String.raw`C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt`;

/** One numbered step, and the path or menu item it ends on, if it has one. */
export type SetupStep = { title: string; detail: string; code?: string };

export const LEVELING_SETUP: readonly SetupStep[] = [
  {
    title: "Run the installer.",
    detail: "No admin rights, and the app updates itself from then on.",
  },
  {
    title: "Point it at Client.txt.",
    detail: "The zone changes it reads are written to that log. Usually:",
    code: CLIENT_TXT,
  },
  {
    title: "Place the steps window.",
    detail: "Wherever it does not cover anything you look at mid fight.",
  },
  {
    title: "Build a route on Exile Leveling.",
    detail: "Pick the acts, gems and gear you want, then copy the build.",
  },
  {
    title: "Menu, then Load from Clipboard.",
    detail: "That is the whole import. Hit Start and play.",
  },
] as const;

export const LEVELING_HOTKEYS = [
  { keys: "Ctrl + Shift + Alt + F12", does: "Show or hide the overlay" },
  { keys: "Ctrl + Shift + Alt + →", does: "Next step" },
  { keys: "Ctrl + Shift + Alt + ←", does: "Previous step" },
] as const;
