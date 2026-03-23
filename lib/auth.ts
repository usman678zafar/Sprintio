import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import connectDB from "./mongodb";
import User from "@/models/User";

const providers: NonNullable<NextAuthOptions["providers"]> = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) {
        throw new Error("Missing email or password");
      }

      await connectDB();

      const user = await User.findOne({ email: credentials.email }).select("+password");

      if (!user || !user.password) {
        throw new Error("Invalid email or password");
      }

      const isPasswordMatch = await bcrypt.compare(credentials.password, user.password);

      if (!isPasswordMatch) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image || null,
      };
    },
  }),
];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return true;
      }

      await connectDB();

      const existingUser = await User.findOne({ email: user.email });

      if (existingUser) {
        const updates: { name?: string; image?: string | null } = {};

        if (user.name && user.name !== existingUser.name) {
          updates.name = user.name;
        }

        if (user.image && user.image !== existingUser.image) {
          updates.image = user.image;
        }

        if (Object.keys(updates).length > 0) {
          await User.updateOne({ _id: existingUser._id }, { $set: updates });
        }

        (user as any).id = existingUser._id.toString();
        return true;
      }

      const createdUser = await User.create({
        name: user.name || user.email.split("@")[0],
        email: user.email,
        image: user.image || undefined,
      });

      (user as any).id = createdUser._id.toString();
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.image = user.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        session.user.image = token.image as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "fallback_secret_for_development",
};
