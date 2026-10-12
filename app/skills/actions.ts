"use server"

import { writeFile } from "node:fs/promises"
import { formatOutline, type Outline } from "@/lib/skill-graph"
import { SKILLS_FILE } from "@/lib/skill-outline"

export async function saveSkills(outline: Outline): Promise<{ ok: true } | { ok: false; message: string }> {
  if (process.env.NODE_ENV !== "development") return { ok: false, message: "The outliner only saves in development." }
  await writeFile(SKILLS_FILE, formatOutline(outline))
  return { ok: true }
}
