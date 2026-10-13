import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],

  callbacks: {
    async signIn({ account, profile }) {
      return (
        account?.provider === "google" &&
        profile?.email_verified === true &&
        typeof profile.email === "string" &&
        profile.email.toLowerCase() ===
          process.env.ADMIN_EMAIL?.toLowerCase()
      );
    },
  },
});