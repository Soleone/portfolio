// Reads content/skills.md, the source of the skills map. Server only: it touches the file system.
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseOutline } from "@/lib/skill-graph"

export const SKILLS_FILE = path.join(process.cwd(), "content", "skills.md")

export const readSkillsSource = () => readFileSync(SKILLS_FILE, "utf8")

export const readSkillsOutline = () => parseOutline(readSkillsSource())
