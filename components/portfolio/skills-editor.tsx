"use client"

import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, CircleAlert, Plus, Trash2, X } from "lucide-react"
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react"
import { saveSkills } from "@/app/skills/actions"
import { Button } from "@/components/ui/button"
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox"
import { Kbd } from "@/components/ui/kbd"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { projects } from "@/lib/portfolio"
import { buildGraph, formatSkillsData, neighborsOf, slug, validate, type SkillsData } from "@/lib/skill-graph"
import { cn } from "@/lib/utils"
import { groupToken, SkillGraph } from "./skill-graph"

// The editor for content/skills.json. The data is a graph, so the outline lists every node with its
// connections underneath: each link shows under both of its ends, and editing either edits the same
// link. The live graph beside it is the same component the site renders.

type Data = SkillsData
type NodeKind = "skill" | "domain"

// Ids are what links point at. A node keeps its id once saved; until then the id follows its name,
// settled when the name field is left (the id is also the row's key, so it cannot change mid-word).
function uniqueId(base: string, taken: Set<string>) {
  const root = base || "node"
  let id = root
  for (let n = 2; taken.has(id); n++) id = `${root}-${n}`
  return id
}

const nodeIds = (data: Data) => new Set([...data.skills, ...data.domains].map((node) => node.id))

function settleId(data: Data, id: string, saved: Set<string>): { data: Data; id: string } {
  const node = [...data.skills, ...data.domains].find((candidate) => candidate.id === id)
  const taken = nodeIds(data)
  taken.delete(id)
  const next = !node || saved.has(id) || !slug(node.label) ? id : uniqueId(slug(node.label), taken)
  const rename = <T extends { id: string }>(node: T) => (node.id === id ? { ...node, id: next } : node)
  return {
    id: next,
    data: {
      ...data,
      skills: data.skills.map(rename),
      domains: data.domains.map(rename),
      links: next === id ? data.links : data.links.map((link) => ({ ...link, a: link.a === id ? next : link.a, b: link.b === id ? next : link.b })),
    },
  }
}

function removeNode(data: Data, id: string): Data {
  return {
    ...data,
    skills: data.skills.filter((node) => node.id !== id),
    domains: data.domains.filter((node) => node.id !== id),
    links: data.links.filter((link) => link.a !== id && link.b !== id),
  }
}

const inline =
  "h-7 min-w-0 rounded-md border border-transparent bg-transparent px-1.5 outline-none transition-colors hover:border-border focus:border-ring focus:bg-background"

export function SkillsEditor({ initial }: { initial: Data }) {
  const [data, setData] = useState(initial)
  const [saved, setSaved] = useState(() => formatSkillsData(initial))
  const [selected, setSelected] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [status, setStatus] = useState<{ tone: "quiet" | "good" | "bad"; text: string } | null>(null)
  const [saving, startSaving] = useTransition()
  // Rows keep their React key when a new node's id settles, so focus stays where it went.
  const rowKeys = useRef(new Map<string, string>())
  const keyOf = (id: string) => rowKeys.current.get(id) ?? id
  // Typing stays instant; the preview catches up when there is time.
  const preview = useDeferredValue(data)

  const issues = useMemo(() => validate(data), [data])
  const dirty = useMemo(() => formatSkillsData(data) !== saved, [data, saved])
  const savedIds = useMemo(() => nodeIds(JSON.parse(saved) as Data), [saved])
  const savedGroups = useMemo(() => new Set((JSON.parse(saved) as Data).groups.map((group) => group.id)), [saved])
  // Joined with the projects for what the file does not say itself: "used in", and skills linked only
  // because a project uses both.
  const joined = useMemo(() => buildGraph(data, projects), [data])

  const change = (next: Data) => {
    setData(next)
    setStatus(null)
  }

  const reveal = useCallback((id: string) => {
    setOpen((open) => (open.has(id) ? open : new Set(open).add(id)))
    requestAnimationFrame(() => document.querySelector(`[data-node="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }))
  }, [])

  const select = (id: string) => {
    setSelected(id)
    reveal(id)
  }

  // A walk in the preview opens the node it lands on, so the graph doubles as navigation.
  const onFocusChange = useCallback(
    (id: string | null) => {
      setSelected(id)
      if (id && !id.startsWith("project:")) reveal(id)
    },
    [reveal]
  )

  const toggle = (id: string) =>
    setOpen((open) => {
      const next = new Set(open)
      if (!next.delete(id)) next.add(id)
      return next
    })

  const save = useCallback(() => {
    if (issues.length > 0 || saving) return
    startSaving(async () => {
      const result = await saveSkills(data)
      if (result.ok) {
        setSaved(formatSkillsData(data))
        setStatus({ tone: "good", text: "Saved to content/skills.json" })
      } else {
        setStatus({ tone: "bad", text: result.message })
      }
    })
  }, [data, issues.length, saving])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        save()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [save])

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function addSkill(group: string) {
    const id = uniqueId("new-skill", nodeIds(data))
    change({ ...data, skills: [...data.skills, { id, label: "", group }] })
    setSelected(id)
    setOpen((open) => new Set(open).add(id))
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-node="${id}"] input`)?.focus())
  }

  function addDomain() {
    const id = uniqueId("new-domain", nodeIds(data))
    change({ ...data, domains: [...data.domains, { id, label: "" }] })
    setSelected(id)
    setOpen((open) => new Set(open).add(id))
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-node="${id}"] input`)?.focus())
  }

  function addGroup() {
    const id = uniqueId("new-group", new Set(data.groups.map((group) => group.id)))
    change({ ...data, groups: [...data.groups, { id, label: "" }] })
    requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-group="${id}"] input`)?.focus())
  }

  const renameGroup = (id: string, label: string) =>
    change({ ...data, groups: data.groups.map((group) => (group.id === id ? { ...group, label } : group)) })

  function settleGroupId(id: string) {
    const group = data.groups.find((candidate) => candidate.id === id)
    const taken = new Set(data.groups.map((candidate) => candidate.id))
    taken.delete(id)
    if (!group || savedGroups.has(id) || !slug(group.label)) return
    const next = uniqueId(slug(group.label), taken)
    if (next === id) return
    change({
      ...data,
      groups: data.groups.map((candidate) => (candidate.id === id ? { ...candidate, id: next } : candidate)),
      skills: data.skills.map((skill) => (skill.group === id ? { ...skill, group: next } : skill)),
    })
  }

  function moveGroup(index: number, by: number) {
    const groups = [...data.groups]
    const [group] = groups.splice(index, 1)
    groups.splice(index + by, 0, group)
    change({ ...data, groups })
  }

  const rename = (id: string, label: string) =>
    change({
      ...data,
      skills: data.skills.map((node) => (node.id === id ? { ...node, label } : node)),
      domains: data.domains.map((node) => (node.id === id ? { ...node, label } : node)),
    })

  function settle(id: string) {
    const result = settleId(data, id, savedIds)
    if (result.id === id) return
    change(result.data)
    rowKeys.current.set(result.id, keyOf(id))
    if (selected === id) setSelected(result.id)
    setOpen((open) => {
      const next = new Set(open)
      if (next.delete(id)) next.add(result.id)
      return next
    })
  }

  const options = useMemo(
    () => [
      ...data.domains.map((node) => ({ id: node.id, label: node.label || node.id, kind: "Domain", token: "var(--foreground)" })),
      ...data.skills.map((node) => {
        const group = data.groups.findIndex((candidate) => candidate.id === node.group)
        return { id: node.id, label: node.label || node.id, kind: data.groups[group]?.label ?? "", token: groupToken(Math.max(group, 0)) }
      }),
    ],
    [data]
  )
  const labelOf = (id: string) => options.find((option) => option.id === id)

  function nodeProps(kind: NodeKind, id: string, label: string) {
    const links = data.links.flatMap((link, index) => (link.a === id ? [{ index, other: link.b, note: link.note }] : link.b === id ? [{ index, other: link.a, note: link.note }] : []))
    const linked = new Set([id, ...links.map((link) => link.other)])
    const derived = neighborsOf(joined, id).flatMap(({ id: other, edge }) =>
      linked.has(other) ? [] : [{ other, projects: edge.projects, target: labelOf(other) }]
    )
    return {
      id,
      kind,
      label,
      open: open.has(id),
      selected: selected === id,
      issues: issues.filter((issue) => issue.id === id).map((issue) => issue.message),
      links: links.map((link) => ({ ...link, target: labelOf(link.other) })),
      derived,
      candidates: options.filter((option) => !linked.has(option.id)),
      onSelect: () => select(id),
      onToggle: () => toggle(id),
      onRename: (label: string) => rename(id, label),
      onSettle: () => settle(id),
      onRemove: () => {
        change(removeNode(data, id))
        if (selected === id) setSelected(null)
      },
      onLink: (other: string) => {
        change({ ...data, links: [...data.links, { a: id, b: other, note: "" }] })
        // A new link asks for its reason straight away.
        requestAnimationFrame(() => document.querySelector<HTMLInputElement>(`[data-link="${data.links.length}"]`)?.focus())
      },
      onNote: (index: number, note: string) => change({ ...data, links: data.links.map((link, i) => (i === index ? { ...link, note } : link)) }),
      onUnlink: (index: number) => change({ ...data, links: data.links.filter((_, i) => i !== index) }),
      onFollow: (other: string) => select(other),
    }
  }

  const loose = issues.filter((issue) => !issue.id || !options.some((option) => option.id === issue.id))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-6">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/#skills" />}>
            <ArrowLeft />
            Site
          </Button>
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="font-semibold tracking-tight">Skills editor</h1>
            <span className="hidden truncate text-xs text-muted-foreground md:inline">
              content/skills.json · {data.skills.length} skills · {data.domains.length} domains · {data.links.length} links
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              aria-live="polite"
              className={cn(
                "text-xs",
                status?.tone === "good" && "text-success",
                status?.tone === "bad" && "text-destructive",
                !status && "text-muted-foreground"
              )}
            >
              {status?.text ?? (issues.length > 0 ? `${issues.length} to fix before saving` : dirty ? "Unsaved changes" : "Up to date")}
            </span>
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  change(JSON.parse(saved) as Data)
                  setSelected(null)
                }}
              >
                Discard
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || issues.length > 0 || saving}>
              {saving ? "Saving…" : "Save"}
              <Kbd className="bg-primary-foreground/15 text-primary-foreground">⌘S</Kbd>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <div className="flex min-w-0 flex-col gap-10">
          {loose.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
              {loose.map((issue) => (
                <li key={issue.message} className="flex items-center gap-2">
                  <CircleAlert className="size-4" />
                  {issue.message}
                </li>
              ))}
            </ul>
          )}

          <Section title="Skills" hint="Grouped by kind. Each group takes the next chart color of the active theme.">
            {data.groups.map((group, index) => {
              const skills = data.skills.filter((skill) => skill.group === group.id)
              return (
                // By position: a new group's id settles on blur, and its block must not remount under the click that caused it.
                <div key={index} className="flex flex-col gap-1">
                  <div data-group={group.id} className="group/row flex items-center gap-2 border-b border-border pb-1.5">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: groupToken(index) }} />
                    <input
                      value={group.label}
                      onChange={(event) => renameGroup(group.id, event.target.value)}
                      onBlur={() => settleGroupId(group.id)}
                      placeholder="Group name"
                      aria-label="Group name"
                      className={cn(inline, "flex-1 font-semibold")}
                    />
                    <span className="text-xs tabular-nums text-muted-foreground">{skills.length}</span>
                    <div className="flex opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100">
                      <Button variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => moveGroup(index, -1)} aria-label="Move group up">
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-xs" disabled={index === data.groups.length - 1} onClick={() => moveGroup(index, 1)} aria-label="Move group down">
                        <ArrowDown />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={skills.length > 0}
                        title={skills.length > 0 ? "Move or delete its skills first" : "Delete group"}
                        onClick={() => change({ ...data, groups: data.groups.filter((candidate) => candidate.id !== group.id) })}
                        aria-label="Delete group"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <ul className="flex flex-col">
                    {skills.map((skill) => (
                      <NodeItem
                        key={keyOf(skill.id)}
                        {...nodeProps("skill", skill.id, skill.label)}
                        token={groupToken(index)}
                        extra={
                          <>
                            <Field label="Group">
                              <NativeSelect
                                size="sm"
                                value={skill.group}
                                onChange={(event) =>
                                  change({ ...data, skills: data.skills.map((node) => (node.id === skill.id ? { ...node, group: event.target.value } : node)) })
                                }
                              >
                                {data.groups.map((option) => (
                                  <NativeSelectOption key={option.id} value={option.id}>
                                    {option.label || option.id}
                                  </NativeSelectOption>
                                ))}
                              </NativeSelect>
                            </Field>
                            <Field label="Also called" hint="Other spellings in project tech lists, comma separated">
                              <AliasInput
                                value={skill.aliases ?? []}
                                onChange={(aliases) =>
                                  change({ ...data, skills: data.skills.map((node) => (node.id === skill.id ? { ...node, aliases } : node)) })
                                }
                              />
                            </Field>
                            <Field label="Used in" hint="From each project's tech list in lib/portfolio.ts">
                              <span className="flex flex-wrap gap-1 py-1 text-xs text-muted-foreground">
                                {(joined.byId.get(skill.id)?.projects ?? []).map((project) => (
                                  <span key={project.title} className="rounded-full border border-border px-2 py-0.5">
                                    {project.title}
                                  </span>
                                ))}
                                {!joined.byId.get(skill.id)?.projects.length && "No project lists it yet"}
                              </span>
                            </Field>
                          </>
                        }
                      />
                    ))}
                  </ul>
                  <AddButton onClick={() => addSkill(group.id)}>Add skill to {group.label || "this group"}</AddButton>
                </div>
              )
            })}
            <AddButton onClick={addGroup}>Add group</AddButton>
          </Section>

          <Section title="Domains" hint="The areas the skills serve. Hubs in the graph, pinned apart in the Domain arrangement.">
            <ul className="flex flex-col">
              {data.domains.map((domain) => (
                <NodeItem key={keyOf(domain.id)} {...nodeProps("domain", domain.id, domain.label)} token="var(--foreground)" />
              ))}
            </ul>
            <AddButton onClick={addDomain}>Add domain</AddButton>
          </Section>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <SkillGraph data={preview} stacked selected={selected} onFocusChange={onFocusChange} />
          <p className="text-xs text-muted-foreground">
            Live preview. Click a node to open it in the outline; pick a row to fly the graph there.
          </p>
        </aside>
      </main>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid items-start gap-x-3 sm:grid-cols-[96px_minmax(0,1fr)]">
      <span className="pt-1.5 text-xs text-muted-foreground" title={hint}>
        {label}
      </span>
      {children}
    </div>
  )
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Plus className="size-3.5" />
      {children}
    </button>
  )
}

// Comma separated while typing; split into a list as it changes, so a trailing comma survives.
function AliasInput({ value, onChange }: { value: string[]; onChange: (aliases: string[]) => void }) {
  const [text, setText] = useState(value.join(", "))
  useEffect(() => {
    if (text.split(",").map((word) => word.trim()).filter(Boolean).join("|") !== value.join("|")) setText(value.join(", "))
    // Only an outside change (discard) should rewrite what is being typed.
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <input
      value={text}
      placeholder="None yet"
      onChange={(event) => {
        setText(event.target.value)
        onChange(event.target.value.split(",").map((word) => word.trim()).filter(Boolean))
      }}
      className={cn(inline, "w-full border-border text-sm")}
    />
  )
}

type Option = { id: string; label: string; kind: string; token: string }

function NodeItem({
  id,
  kind,
  label,
  token,
  open,
  selected,
  issues,
  links,
  derived,
  candidates,
  extra,
  onSelect,
  onToggle,
  onRename,
  onSettle,
  onRemove,
  onLink,
  onNote,
  onUnlink,
  onFollow,
}: {
  id: string
  kind: NodeKind
  label: string
  token: string
  open: boolean
  selected: boolean
  issues: string[]
  links: { index: number; other: string; note?: string; target?: Option }[]
  derived: { other: string; projects: string[]; target?: Option }[]
  candidates: Option[]
  extra?: ReactNode
  onSelect: () => void
  onToggle: () => void
  onRename: (label: string) => void
  onSettle: () => void
  onRemove: () => void
  onLink: (other: string) => void
  onNote: (index: number, note: string) => void
  onUnlink: (index: number) => void
  onFollow: (other: string) => void
}) {
  return (
    <li data-node={id} className="scroll-mt-20">
      <div
        onClick={onSelect}
        className={cn(
          "group/row flex items-center gap-1.5 rounded-lg py-0.5 pr-1 pl-0.5 transition-colors",
          selected ? "bg-muted" : "hover:bg-muted/50"
        )}
      >
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
        >
          <ChevronRight className={cn("transition-transform", open && "rotate-90")} />
        </Button>
        <span className={cn("size-2 shrink-0", kind === "domain" ? "rotate-45 rounded-[2px]" : "rounded-full")} style={{ background: token }} />
        <input
          value={label}
          onChange={(event) => onRename(event.target.value)}
          onBlur={onSettle}
          onFocus={onSelect}
          placeholder={kind === "domain" ? "Domain name" : "Skill name"}
          aria-label={kind === "domain" ? "Domain name" : "Skill name"}
          className={cn(inline, "w-48 text-sm font-medium")}
        />
        <span className="font-mono text-[11px] text-muted-foreground/70">{id}</span>
        <span className="ml-auto text-xs tabular-nums text-muted-foreground">
          {links.length} {links.length === 1 ? "link" : "links"}
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          className="opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          aria-label={`Delete ${label || id}`}
          title={links.length > 0 ? `Delete, with its ${links.length} links` : "Delete"}
        >
          <Trash2 />
        </Button>
      </div>

      {issues.map((issue) => (
        <p key={issue} className="ml-8 flex items-center gap-1.5 text-xs text-destructive">
          <CircleAlert className="size-3.5" />
          {issue}
        </p>
      ))}

      {open && (
        <div className="mt-1 mb-3 ml-[13px] flex flex-col gap-2 border-l border-border pl-5">
          <ul className="flex flex-col gap-0.5">
            {links.map((link) => (
              <li key={link.index} className="group/link flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onFollow(link.other)}
                  className="flex w-36 shrink-0 items-center gap-1.5 truncate rounded px-1 py-1 text-left text-sm transition-colors hover:bg-muted"
                  title={`Go to ${link.target?.label ?? link.other}`}
                >
                  <span className="text-muted-foreground">→</span>
                  <span className="size-1.5 shrink-0 rounded-full" style={{ background: link.target?.token }} />
                  <span className="truncate">{link.target?.label ?? link.other}</span>
                </button>
                <input
                  data-link={link.index}
                  value={link.note ?? ""}
                  onChange={(event) => onNote(link.index, event.target.value)}
                  placeholder="Why are these connected?"
                  aria-label={`Why ${label} and ${link.target?.label} are connected`}
                  className={cn(inline, "flex-1 text-sm text-muted-foreground focus:text-foreground")}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity group-hover/link:opacity-100 group-focus-within/link:opacity-100"
                  onClick={() => onUnlink(link.index)}
                  aria-label={`Remove link to ${link.target?.label ?? link.other}`}
                >
                  <X />
                </Button>
              </li>
            ))}
            {derived.map((link) => (
              <li key={link.other} className="group/link flex items-center gap-2 text-muted-foreground">
                <button
                  type="button"
                  onClick={() => onFollow(link.other)}
                  className="flex w-36 shrink-0 items-center gap-1.5 truncate rounded px-1 py-1 text-left text-sm transition-colors hover:bg-muted"
                  title={`Go to ${link.target?.label ?? link.other}`}
                >
                  <span>⋯</span>
                  <span className="size-1.5 shrink-0 rounded-full opacity-60" style={{ background: link.target?.token }} />
                  <span className="truncate">{link.target?.label ?? link.other}</span>
                </button>
                <span className="flex-1 px-1.5 text-xs italic">Together in {link.projects.join(", ")}, from project tech</span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="opacity-0 transition-opacity group-hover/link:opacity-100 group-focus-within/link:opacity-100"
                  onClick={() => onLink(link.other)}
                  aria-label={`Give the link to ${link.target?.label ?? link.other} a reason`}
                  title="Make it a link with a reason"
                >
                  <Plus />
                </Button>
              </li>
            ))}
          </ul>
          <LinkPicker candidates={candidates} onPick={onLink} />
          {extra && <div className="mt-1 flex flex-col gap-2">{extra}</div>}
        </div>
      )}
    </li>
  )
}

function LinkPicker({ candidates, onPick }: { candidates: Option[]; onPick: (id: string) => void }) {
  const [query, setQuery] = useState("")
  return (
    <Combobox
      items={candidates}
      value={null}
      inputValue={query}
      onInputValueChange={setQuery}
      onValueChange={(option: Option | null) => {
        if (!option) return
        onPick(option.id)
        setQuery("")
      }}
      itemToStringLabel={(option: Option) => option.label}
      autoHighlight
    >
      <ComboboxInput placeholder="Link to…" showTrigger={false} className="h-7 w-56 text-sm" />
      <ComboboxContent>
        <ComboboxEmpty>{candidates.length > 0 ? "No match, or already linked" : "Nothing left to link"}</ComboboxEmpty>
        <ComboboxList>
          {(option: Option) => (
            <ComboboxItem key={option.id} value={option}>
              <span className="size-2 shrink-0 rounded-full" style={{ background: option.token }} />
              {option.label}
              <span className="ml-auto text-xs text-muted-foreground">{option.kind}</span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
