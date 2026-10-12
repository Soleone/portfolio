import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SkillsOutliner } from "@/components/portfolio/skills-outliner"
import { readSkillsOutline } from "@/lib/skill-outline"

export const metadata: Metadata = { title: "Skills outliner · Soleone", robots: { index: false } }

// The outliner writes content/skills.md on disk, which only exists to write to in development.
// Deployed, the page is not there; edits land on the site by committing the file.
export default function SkillsOutlinerPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <SkillsOutliner initial={readSkillsOutline()} />
}
