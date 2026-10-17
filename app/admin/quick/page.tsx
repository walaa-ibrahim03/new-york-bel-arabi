import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import { isNewsReadOnly } from "../../../lib/database-guard";
import QuickEntry from "./QuickEntry";

export const instant = false;
export default async function QuickEntryPage() {
  const session = await auth();
  const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) redirect("/");
  return <QuickEntry readOnly={isNewsReadOnly()} />;
}
