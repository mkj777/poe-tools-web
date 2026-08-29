import { redirect } from "next/navigation";
import { defaultLeagueSlug } from "@/lib/league";

/** The tool without a league picks the one a bare visit would land on. */
export const revalidate = 900;

export default async function Page() {
  redirect(`/beasts/${await defaultLeagueSlug()}`);
}
