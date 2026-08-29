import { redirect } from "next/navigation";
import { defaultLeagueSlug } from "@/lib/league";

/**
 * A bare visit lands on the beasts, which is the tool this site started as and
 * still the only one it hosts prices for. Revalidated on the same window as
 * everything else, so a new league becomes the landing page without a deploy.
 */
export const revalidate = 900;

export default async function Page() {
  redirect(`/beasts/${await defaultLeagueSlug()}`);
}
