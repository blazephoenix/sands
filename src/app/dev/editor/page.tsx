import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EditorPlayground } from "./playground"

export const metadata: Metadata = { title: "Editor playground" }

/** Dev-only: the shared editor's two surfaces side by side, with their live conversions. */
export default function EditorPlaygroundPage() {
  if (process.env.NODE_ENV === "production") notFound()
  return <EditorPlayground />
}
