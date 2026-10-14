
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import ArticleForm from "../ArticleForm";

export const instant = false;

export default async function NewArticlePage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    redirect("/");
  }

  return <ArticleForm />;
}
