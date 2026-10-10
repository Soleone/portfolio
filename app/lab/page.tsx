import type { Metadata } from "next"
import { CardLab } from "@/components/lab/card-lab"

// Unlinked playground for prototyping project cards; kept out of search.
export const metadata: Metadata = {
  title: "Lab",
  robots: { index: false, follow: false },
}

export default function LabPage() {
  return <CardLab />
}
