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
        <div className="flex align-middle justify-between">
          <h1 className="text-4xl font-bold">Welcome to Sands</h1>
          <SignInButton>
            <button className="text-black bg-orange-300 px-6 rounded-lg hover:bg-orange-600">
              Sign in
            </button>
          </SignInButton>
        </div>

        <p className="mt-2">
          A{" "}
          <a
          target="_blank"
            className="text-blue-400 hover:text-blue-600 no-underline"
            href="https://agathachristie.fandom.com/wiki/Closed_circle#:~:text=The%20closed%20circle%20of%20suspects,a%20closed%20circle%20of%20suspects."
          >
            closed circle murder mystery
          </a>{" "}
          simulation game where you are the detective!
        </p>
      </SignedOut>
    </main>
  );
}
