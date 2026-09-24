import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EditorPlayground } from "./playground"

export const metadata: Metadata = { title: "Editor playground" }

/**
 * Dev-only: the shared editor's two surfaces side by side, with their live
 * conversions. `?world=<id>` picks the World; without it, the most recently
 * updated one.
 */
export default async function EditorPlaygroundPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  if (process.env.NODE_ENV === "production") notFound()
  const { world } = await searchParams
  return <EditorPlayground worldId={typeof world === "string" ? world : null} />
}
