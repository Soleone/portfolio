"use server"

import { writeFile } from "node:fs/promises"
import path from "node:path"
import { formatSkillsData, validate, type SkillsData } from "@/lib/skill-graph"

export async function saveSkills(data: SkillsData): Promise<{ ok: true } | { ok: false; message: string }> {
  if (process.env.NODE_ENV !== "development") return { ok: false, message: "The skills editor only saves in development." }
  const issues = validate(data)
  if (issues.length > 0) return { ok: false, message: issues[0].message }
  await writeFile(path.join(process.cwd(), "content", "skills.json"), formatSkillsData(data))
  return { ok: true }
}
