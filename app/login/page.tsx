import { signIn } from "../../auth";
export default function LoginPage() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-zinc-50 p-6"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-4 text-2xl font-bold text-zinc-900">
          تسجيل دخول المدير
        </h1>

        <p className="text-zinc-600">
          لوحة إدارة موقع نيويورك بالعربي
        </p>
        <form
  action={async () => {
    "use server";
    await signIn("google", { redirectTo: "/admin" });
  }}
>
  <button
    type="submit"
    className="mt-6 w-full rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700"
  >
    تسجيل الدخول باستخدام Google
  </button>
</form>
      </div>
    </main>
  );
}