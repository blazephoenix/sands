import type { Metadata } from "next"

import { BriefPage } from "./brief-page"

export const metadata: Metadata = { title: "Brief" }

/** A World's Brief: write it, see what is missing, run setup. */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <BriefPage key={id} worldId={id} />
}
