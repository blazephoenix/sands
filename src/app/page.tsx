import type { Metadata } from "next"

import { WorldsHome } from "./worlds-home"

export const metadata: Metadata = { title: "Worlds" }

/** The Worlds home: every World, and "New World" (ticket 02). */
export default function HomePage() {
  return <WorldsHome />
}
