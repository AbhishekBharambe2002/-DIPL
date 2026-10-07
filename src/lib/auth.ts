import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/server/db/connection";
import { User } from "@/server/models/user";
import { Role } from "@/server/models/role";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        identifier: { label: "Administrator ID or email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = String(credentials?.identifier ?? "").trim().toLowerCase();
        if (!identifier || !credentials?.password) return null;

        await connectDB();

        const user = await User.findOne({
          ...(identifier.includes("@") ? { email: identifier } : { username: identifier }),
          isDeleted: false,
          isActive: true,
        }).select("+password");

        if (!user) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );
        if (!isValid) return null;

        await User.updateOne({ _id: user._id }, { lastLogin: new Date() });

        const role = await Role.findById(user.role);

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: role?.code || "VIEWER",
          permissions: role?.permissions ? [...role.permissions] : [],
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.permissions = (user as unknown as { permissions: string[] }).permissions;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { permissions: string[] }).permissions = token.permissions as string[];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
