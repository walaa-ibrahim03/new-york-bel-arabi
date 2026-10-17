import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { isNewsReadOnly } from "../../../lib/database-guard";
import { selectedLocalSource } from "../../../lib/local-news-sources";
import QuickEntry from "./QuickEntry";

export const instant = false;
export default async function QuickEntryPage({ searchParams }: { searchParams: Promise<{ source?: string }> }) {
  const session = await auth();
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) redirect("/");
  const source = selectedLocalSource((await searchParams).source);
  return <QuickEntry readOnly={isNewsReadOnly()} source={source ? { name: source.name, url: source.url } : undefined} />;
}
