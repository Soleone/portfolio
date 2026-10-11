import type { Metadata } from "next"
import { LetterLab } from "@/components/lab/letter-lab"

// Unlinked playground for the contact form's folding animation; kept out of search.
export const metadata: Metadata = {
  title: "Letter lab",
  robots: { index: false, follow: false },
}

export default function LetterLabPage() {
  return <LetterLab />
}
