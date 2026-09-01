import { redirect } from "next/navigation";
import { defaultLeagueSlug } from "@/lib/league";

/** The keystones are the same everywhere, the scarab prices under them are not. */
export const revalidate = 900;

export default async function Page() {
  redirect(`/scarabs/${await defaultLeagueSlug()}`);
}
