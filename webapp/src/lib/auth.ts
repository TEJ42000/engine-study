import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

// Extend the built-in session types so session.user.id is always present.
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    // Persist the Google subject ID (stable, unique per user) into the JWT.
    jwt({ token, account, profile }) {
      if (account?.provider === "google" && profile?.sub) {
        token.sub = profile.sub;
      }
      return token;
    },
    // Expose user.id on every session object.
    session({ session, token }) {
      session.user.id = token.sub!;
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
