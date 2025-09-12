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
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-3 sm:py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <span className="text-orange-600 font-bold text-sm">🎭</span>
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900">Sands</h1>
                  <span className="text-xs sm:text-sm text-slate-600 hidden sm:block">
                    Murder Mystery Simulator
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-600">
                  <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                  <span>Active Case</span>
                </div>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8 sm:w-10 sm:h-10"
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <Play />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col">
          <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl w-full">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-12">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900">
                      Welcome to Sands
                    </h1>
                    <p className="text-lg text-slate-600 mt-2">
                      Murder Mystery Simulator
                    </p>
                  </div>
                  <SignInButton>
                    <button className="bg-orange-400 hover:bg-orange-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg">
                      Sign in to Play
                    </button>
                  </SignInButton>
                </div>

                <div className="prose prose-slate max-w-none">
                  <p className="text-lg text-slate-700 leading-relaxed">
                    Step into the shoes of a detective in this AI-powered{" "}
                    <a
                      target="_blank"
                      className="text-orange-500 hover:text-orange-600 underline decoration-2 underline-offset-2"
                      href="https://agathachristie.fandom.com/wiki/Closed_circle#:~:text=The%20closed%20circle%20of%20suspects,a%20closed%20circle%20of%20suspects."
                    >
                      closed circle murder mystery
                    </a>{" "}
                    game. Each case is uniquely generated with compelling suspects, 
                    hidden motives, and intricate clues waiting to be discovered.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">🏚️ Dynamic Settings</h3>
                      <p className="text-sm text-slate-600">Country houses, boats, trains, and more</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h3 className="font-semibold text-slate-900 mb-2">🕵️ Interactive Investigation</h3>
                      <p className="text-sm text-slate-600">Question suspects and examine evidence</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-4 sm:col-span-2 lg:col-span-1">
                      <h3 className="font-semibold text-slate-900 mb-2">🧩 Unique Cases</h3>
                      <p className="text-sm text-slate-600">AI-generated mysteries every time</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <footer className="text-center py-6 px-4">
            <p className="text-slate-500 text-sm">
              Made with ❤️ at{" "}
              <a
                className="text-orange-500 hover:text-orange-600 font-medium"
                href="https://bitmonk.tech"
                target="_blank"
                rel="noopener noreferrer"
              >
                Bitmonk
              </a>
            </p>
          </footer>
        </div>
      </SignedOut>
    </main>
  );
}
