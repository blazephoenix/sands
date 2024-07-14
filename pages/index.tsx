import { useAuth } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  if (isSignedIn) {
    router.push("/start");
  }

  return (
    <main className={`${inter.className}`}>
      <Head>
        <title>Sands</title>
      </Head>
      <h1 className="text-4xl font-bold">Welcome to Sands</h1>
    </main>
  );
}
