import { skillsData } from "@/lib/skill-graph"
import { SectionHeading } from "./section-heading"
import { SkillGraph } from "./skill-graph"

export function Skills() {
  return (
    <section id="skills" className="mx-auto max-w-5xl px-6 py-16 md:py-24">
      <SectionHeading label="Toolkit" title="Skills & how they connect" />

      {/* The graph is drawn for the eye; this is the same list for readers and crawlers. */}
      <ul className="sr-only">
        {skillsData.groups.map((group) => (
          <li key={group.id}>
            {group.label}:{" "}
            {skillsData.skills
              .filter((skill) => skill.group === group.id)
              .map((skill) => skill.label)
              .join(", ")}
          </li>
        ))}
      </ul>

      <SkillGraph />
    </section>
  )
}
