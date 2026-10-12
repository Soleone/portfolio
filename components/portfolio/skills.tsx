import { readSkillsOutline } from "@/lib/skill-outline"
import { SectionHeading } from "./section-heading"
import { SkillGraph } from "./skill-graph"

export function Skills() {
  const { rows } = readSkillsOutline()

  return (
    <section id="skills" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="Toolkit" title="A map of what I know" />

      {/* The map is drawn for the eye; this is the same outline for readers and crawlers. */}
      <ul className="sr-only">
        {rows.map((row, index) => (
          <li key={index}>
            {row.text}
          </li>
        ))}
      </ul>

      <SkillGraph outline={rows} />
    </section>
  )
}
