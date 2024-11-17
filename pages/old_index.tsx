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
        <div className="flex rounded justify-between p-4 bg-slate-100">
          <div>
            <h1 className="text-2xl font-bold">Sands</h1>
            <span className="text-sm text-slate-600">
              Murder Mystery Simulator
            </span>
          </div>
          <div>
            <UserButton showName />
          </div>
        </div>
        <Play />
      </SignedIn>
      <SignedOut>
        <div className="bg-slate-100 border-b-4 border-orange-300 shadow-inner hover:shadow-none py-24 px-48 rounded-lg">
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
        </div>
        <footer className="fixed bottom-20 mx-auto w-screen">
          <div className="text-slate-600">
            Made with &#10084; at{" "}
            <a
              className="text-orange-500 hover:cursor-pointer"
              href="https://bitmonk.tech"
            >
              Bitmonk
            </a>
          </div>
        </footer>
      </SignedOut>
    </main>
  );
}
