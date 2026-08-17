import NextAuth, { type NextAuthResult } from 'next-auth';
import GitHub from 'next-auth/providers/github';

const authResult: NextAuthResult = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID || 'placeholder_client_id',
      clientSecret: process.env.AUTH_GITHUB_SECRET || 'placeholder_client_secret',
      authorization: {
        params: {
          scope: 'read:user user:email read:org',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile) {
        token.githubLogin = (profile as any).login;
        token.githubId = String((profile as any).id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).githubLogin = token.githubLogin;
        (session.user as any).githubId = token.githubId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});

export const { handlers, auth } = authResult;
// Explicit type annotations to avoid NextAuth v5 beta declaration emit issue in pnpm monorepos
// (TypeScript cannot name the inferred type that references internal @auth/core/providers)
export const signIn = authResult.signIn as (...args: any[]) => Promise<any>;
export const signOut = authResult.signOut as (...args: any[]) => Promise<any>;
