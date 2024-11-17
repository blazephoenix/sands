import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BellRing, Check, LogInIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
  UserButton,
} from "@clerk/nextjs";
import Head from "next/head";
import Play from "../components/play";

type Props = {
  className?: string;
  props?: React.HTMLAttributes<HTMLDivElement>;
};

export default function Home({ className, ...props }: Props) {
  const { isSignedIn } = useAuth();

  return (
    <main>
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
        <Card className={cn("w-[380px]", className)} {...props}>
          <CardHeader>
            <CardTitle>
              {" "}
              <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
                Welcome to Sands
              </h3>
            </CardTitle>
            <CardDescription>
              A closed circle murder mystery simulation game where you are the
              detective!
            </CardDescription>
          </CardHeader>

          <CardFooter>
            <SignInButton>
              <Button className="w-full">
                <LogInIcon /> Sign in
              </Button>
            </SignInButton>
          </CardFooter>
        </Card>
      </SignedOut>
    </main>
  );
}
