import { redirect } from "next/navigation";
import { defaultLeagueSlug } from "@/lib/league";

/** The mods are the same everywhere, the prices beside them are not. */
export const revalidate = 900;

export default async function Page() {
  redirect(`/maps/${await defaultLeagueSlug()}`);
}
