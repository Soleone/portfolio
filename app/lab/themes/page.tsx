import type { Metadata } from "next"
import { ThemeLab } from "@/components/lab/theme-lab"

// Unlinked playground for prototyping the theme picker; kept out of search.
export const metadata: Metadata = {
  title: "Theme lab",
  robots: { index: false, follow: false },
}

export default function ThemeLabPage() {
  return <ThemeLab />
}
