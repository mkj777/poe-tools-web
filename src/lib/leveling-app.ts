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
  setup: asset("PoELevelingGuide-win-Setup.exe"),
  portable: asset("PoELevelingGuide-win-Portable.zip"),
  repo: "https://github.com/mkj777/poe-leveling-app",
  releases: "https://github.com/mkj777/poe-leveling-app/releases",
} as const;

/**
 * The default install of Path of Exile. Only needed when the app cannot read
 * the path out of a running client, which is the one thing that can go wrong.
 * Raw, because every separator in a Windows path is an escape otherwise.
 */
const CLIENT_TXT = String.raw`C:\Program Files (x86)\Grinding Gear Games\Path of Exile\logs\Client.txt`;

/** One numbered step, and the path it ends on, if it has one. */
export type SetupStep = { title: string; detail: string; code?: string };

export const LEVELING_SETUP: readonly SetupStep[] = [
  {
    title: "Run the installer.",
    detail: "It installs for your user only, so there is no admin prompt.",
  },
  {
    title: "Start the game, then the app.",
    detail:
      "It reads the path to Client.txt out of the running client. If the game is not up it stays on \u201cClient.txt not found\u201d and you can pick the file yourself, usually:",
    code: CLIENT_TXT,
  },
  {
    title: "Wait for the walkthrough.",
    detail:
      "It comes from Exile Leveling, so the first start needs the internet. After that it is local and keeps itself current. There is no build to import.",
  },
  {
    title: "Click Start.",
    detail: "The overlay lays itself into the game window and follows it.",
  },
] as const;

export const LEVELING_HOTKEYS = [
  {
    keys: "Ctrl + Shift + Alt + F12",
    does: "Close the overlay, back to the main window",
  },
  { keys: "Ctrl + Shift + Alt + →", does: "Next step" },
  { keys: "Ctrl + Shift + Alt + ←", does: "Previous step" },
  { keys: "Ctrl + Shift + Alt + O", does: "Move the overlay, on and off" },
] as const;
