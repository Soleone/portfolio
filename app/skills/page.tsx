import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { SkillsEditor } from "@/components/portfolio/skills-editor"
import { skillsData } from "@/lib/skill-graph"

export const metadata: Metadata = { title: "Skills editor · Soleone", robots: { index: false } }

// The editor writes content/skills.json on disk, which only exists to write to in development.
// Deployed, the page is not there; edits land on the site by committing the file.
export default function SkillsEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound()
  return <SkillsEditor initial={skillsData} />
}
