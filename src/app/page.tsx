import { redirect } from "next/navigation";
import { defaultLeagueSlug } from "@/lib/league";

/**
 * The league lives in the path so the pages can be prerendered, so a bare visit
 * has to pick one. Revalidated on the same window as everything else, which is
 * how a new league becomes the landing page without a deployment.
 */
export const revalidate = 900;

export default async function Page() {
  redirect(`/${await defaultLeagueSlug()}`);
}
