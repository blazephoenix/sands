import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  UserButton,
} from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Head from "next/head";
import Play from "../components/play";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  return (
    <main className={`${inter.className}`}>
      <Head>
        <title>Sands</title>
      </Head>
      <SignedIn>
        <div className="flex rounded justify-end p-4 bg-slate-100">
          <UserButton showName />
        </div>

        <Play />
      </SignedIn>
      <SignedOut>
        <SignInButton />
        <h1 className="text-4xl font-bold">Welcome to Sands</h1>
      </SignedOut>
    </main>
  );
}
