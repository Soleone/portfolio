"use client"

import Link from "next/link"
import { ArrowLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown, Search, Trash2, X } from "lucide-react"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react"
import { saveSkills } from "@/app/skills/actions"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { formatOutline, matchRank, parseOutline, slug, tidy, type Outline, type OutlineRow } from "@/lib/skill-graph"
import { cn } from "@/lib/utils"
import { Dot, fieldToken, SkillGraph } from "./skill-graph"

// The outliner for content/skills.md. Rows are a flat list with depths, the way the file is: a row
// owns the rows below it that sit deeper. Everything is keyboard first, like any outliner.

type Row = OutlineRow & { key: string }

// Rows from the file are keyed by position, so the server and the browser agree. Rows made later get a
// key from this session, which a hot reload resetting the counter cannot repeat.
const session = Math.random().toString(36).slice(2, 7)
let nextKey = 0
const newKey = () => `n${session}${nextKey++}`
const keyed = (rows: OutlineRow[], fromFile = false): Row[] => rows.map((row, i) => ({ ...row, key: fromFile ? `f${i}` : newKey() }))
const plain = (rows: Row[]): OutlineRow[] => rows.map(({ depth, text }) => ({ depth, text }))

/** Where the subtree under row i ends (exclusive). */
function subtreeEnd(rows: Row[], i: number) {
  let j = i + 1
  while (j < rows.length && rows[j].depth > rows[i].depth) j++
  return j
}

/** The nearest row above i at the same depth, if it is a sibling. */
function previousSibling(rows: Row[], i: number) {
  for (let k = i - 1; k >= 0; k--) {
    if (rows[k].depth === rows[i].depth) return k
    if (rows[k].depth < rows[i].depth) return -1
  }
  return -1
}

// The keys the outliner answers to, listed under the preview.
const keys: [string, string][] = [
  ["Enter", "new row"],
  ["Tab / ⇧Tab", "indent / outdent"],
  ["⌥↑ / ⌥↓", "move with children"],
  ["⌘↑ / ⌘↓", "fold / unfold"],
  ["⌘Z / ⇧⌘Z", "undo / redo"],
  ["⌘S", "save"],
  ["⌘K", "search"],
]

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export function SkillsOutliner({ initial }: { initial: Outline }) {
  const [rows, setRows] = useState(() => keyed(initial.rows, true))
  const [saved, setSaved] = useState(() => formatOutline(initial))
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [selected, setSelected] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [status, setStatus] = useState<{ tone: "good" | "bad"; text: string } | null>(null)
  const [query, setQuery] = useState("")
  const searching = query.trim() !== ""
  // Rows made, edited or walked to during a search stay in view, even once they no longer match it.
  const kept = useRef(new Set<string>())
  const [keptChanged, noteKept] = useReducer((n: number) => n + 1, 0)
  const searchBox = useRef<HTMLInputElement>(null)
  const [saving, startSaving] = useTransition()
  const history = useRef({ past: [] as Row[][], future: [] as Row[][], typing: "" })
  // Focus to place after the next render: a row's key and where the caret goes.
  const pendingFocus = useRef<{ key: string; caret: number | "end" } | null>(null)

  const outline = useMemo(() => ({ preamble: initial.preamble, rows: plain(rows) }), [initial.preamble, rows])
  const dirty = useMemo(() => formatOutline(outline) !== saved, [outline, saved])
  // The preview settles a moment after typing stops; laying out the map on every keystroke would stutter.
  const preview = useDebounced(useMemo(() => tidy(outline.rows), [outline]), 350)

  // How many places each name appears in; more than one is one node with several parents.
  const places = useMemo(() => {
    const count = new Map<string, number>()
    for (const row of rows) count.set(slug(row.text), (count.get(slug(row.text)) ?? 0) + 1)
    return count
  }, [rows])

  // Which top-level row each row sits under, for its color.
  const fieldOf = useMemo(() => {
    let field = -1
    return rows.map((row) => (row.depth === 0 ? ++field : field))
  }, [rows])

  // Searching shows the rows that match and the rows above them, folded or not.
  const found = useMemo(() => {
    if (!searching) return null
    const matching = new Set<number>()
    const lit = new Set<number>()
    const shown = new Set<number>()
    rows.forEach((row, i) => {
      const hit = matchRank(row.text, query) !== null
      if (!hit && !kept.current.has(row.key)) return
      if (hit) matching.add(i)
      lit.add(i)
      shown.add(i)
      let depth = row.depth
      for (let k = i - 1; k >= 0 && depth > 0; k--) {
        if (rows[k].depth < depth) {
          shown.add(k)
          depth = rows[k].depth
        }
      }
    })
    return { matching, lit, shown }
    // keptChanged is here because a walk in the preview can keep a row without the rows changing.
  }, [rows, query, searching, keptChanged])

  const visible = useMemo(() => {
    if (found) return rows.map((_, i) => i).filter((i) => found.shown.has(i))
    const shown: number[] = []
    let hiddenBelow = Infinity
    rows.forEach((row, i) => {
      if (row.depth > hiddenBelow) return
      hiddenBelow = Infinity
      shown.push(i)
      if (collapsed.has(row.key) && rows[i + 1]?.depth > row.depth) hiddenBelow = row.depth
    })
    return shown
  }, [rows, collapsed, found])

  useLayoutEffect(() => {
    const target = pendingFocus.current
    if (!target) return
    pendingFocus.current = null
    const input = document.querySelector<HTMLInputElement>(`[data-row="${target.key}"]`)
    if (!input) return
    input.focus()
    const caret = target.caret === "end" ? input.value.length : Math.min(target.caret, input.value.length)
    input.setSelectionRange(caret, caret)
  })

  /** Every change goes through here, so it can be undone. Typing into one row is one step. */
  function commit(next: Row[], typing?: string) {
    const past = history.current
    if (!typing || typing !== past.typing) {
      past.past.push(rows)
      if (past.past.length > 300) past.past.shift()
    }
    past.typing = typing ?? ""
    past.future = []
    setRows(next)
    setStatus(null)
  }

  function undo(redo = false) {
    const past = history.current
    const from = redo ? past.future : past.past
    const to = redo ? past.past : past.future
    const restored = from.pop()
    if (!restored) return
    to.push(rows)
    past.typing = ""
    setRows(restored)
  }

  const save = useCallback(() => {
    if (saving) return
    startSaving(async () => {
      const result = await saveSkills(outline)
      if (result.ok) {
        setSaved(formatOutline(outline))
        setRows((rows) => {
          // The file drops empty rows; the outliner follows, keeping keys where rows survive.
          const kept = rows.filter((row) => row.text.trim())
          return kept.length === rows.length ? rows : kept
        })
        setStatus({ tone: "good", text: "Saved to content/skills.md" })
      } else {
        setStatus({ tone: "bad", text: result.message })
      }
    })
  }, [outline, saving])

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        save()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        searchBox.current?.focus()
        searchBox.current?.select()
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

  const expand = (key: string) =>
    setCollapsed((collapsed) => {
      if (!collapsed.has(key)) return collapsed
      const next = new Set(collapsed)
      next.delete(key)
      return next
    })

  // A walk in the preview opens the outline at the first place that node appears.
  const onFocusChange = useCallback(
    (id: string | null) => {
      setSelected(id)
      if (!id) return setHighlight(null)
      const i = rows.findIndex((row) => slug(row.text) === id)
      if (i === -1) return setHighlight(null)
      if (!kept.current.has(rows[i].key)) {
        kept.current.add(rows[i].key)
        noteKept()
      }
      setCollapsed((collapsed) => {
        const next = new Set(collapsed)
        let depth = rows[i].depth
        for (let k = i - 1; k >= 0 && depth > 0; k--) {
          if (rows[k].depth < depth) {
            next.delete(rows[k].key)
            depth = rows[k].depth
          }
        }
        return next.size === collapsed.size ? collapsed : next
      })
      setHighlight(rows[i].key)
      requestAnimationFrame(() =>
        document.querySelector(`[data-row="${rows[i].key}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" })
      )
    },
    [rows]
  )

  function onRowKeyDown(event: KeyboardEvent<HTMLInputElement>, i: number) {
    const row = rows[i]
    const input = event.currentTarget
    const caret = input.selectionStart ?? 0
    const mod = event.metaKey || event.ctrlKey
    const at = visible.indexOf(i)
    const move = (by: number) => {
      const target = rows[visible[at + by]]
      const next = target && document.querySelector<HTMLInputElement>(`[data-row="${target.key}"]`)
      if (!next) return
      next.focus()
      next.setSelectionRange(Math.min(caret, next.value.length), Math.min(caret, next.value.length))
    }

    if (mod && event.key.toLowerCase() === "z") {
      event.preventDefault()
      undo(event.shiftKey)
    } else if (event.key === "Enter") {
      event.preventDefault()
      const end = subtreeEnd(rows, i)
      // An open parent gets a new first child; anything else a new sibling after its subtree.
      const opensChildren = end > i + 1 && !collapsed.has(row.key)
      const fresh: Row = { key: newKey(), depth: opensChildren ? row.depth + 1 : row.depth, text: "" }
      const at = opensChildren ? i + 1 : end
      kept.current.add(fresh.key)
      commit([...rows.slice(0, at), fresh, ...rows.slice(at)])
      pendingFocus.current = { key: fresh.key, caret: 0 }
    } else if (event.key === "Tab") {
      event.preventDefault()
      const end = subtreeEnd(rows, i)
      if (event.shiftKey) {
        if (row.depth === 0) return
        commit(rows.map((r, k) => (k >= i && k < end ? { ...r, depth: r.depth - 1 } : r)))
      } else {
        const sibling = previousSibling(rows, i)
        if (sibling === -1) return
        expand(rows[sibling].key)
        commit(rows.map((r, k) => (k >= i && k < end ? { ...r, depth: r.depth + 1 } : r)))
      }
      pendingFocus.current = { key: row.key, caret }
    } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault()
      const end = subtreeEnd(rows, i)
      const block = rows.slice(i, end)
      if (event.key === "ArrowUp") {
        const sibling = previousSibling(rows, i)
        if (sibling === -1) return
        commit([...rows.slice(0, sibling), ...block, ...rows.slice(sibling, i), ...rows.slice(end)])
      } else {
        if (rows[end]?.depth !== row.depth) return
        const after = subtreeEnd(rows, end)
        commit([...rows.slice(0, i), ...rows.slice(end, after), ...block, ...rows.slice(after)])
      }
      pendingFocus.current = { key: row.key, caret }
    } else if (mod && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault()
      if (event.key === "ArrowUp" && subtreeEnd(rows, i) > i + 1) setCollapsed((collapsed) => new Set(collapsed).add(row.key))
      if (event.key === "ArrowDown") expand(row.key)
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      move(event.key === "ArrowUp" ? -1 : 1)
    } else if (event.key === "Backspace" && row.text === "" && rows.length > 1) {
      // An empty row goes, and anything under it moves up a level.
      event.preventDefault()
      const end = subtreeEnd(rows, i)
      const next = [...rows.slice(0, i), ...rows.slice(i + 1, end).map((r) => ({ ...r, depth: r.depth - 1 })), ...rows.slice(end)]
      commit(next)
      const above = rows[visible[at - 1]]
      if (above) pendingFocus.current = { key: above.key, caret: "end" }
    }
  }

  // A pasted list becomes rows, nested from the row it lands on.
  function onPaste(event: ClipboardEvent<HTMLInputElement>, i: number) {
    const text = event.clipboardData.getData("text/plain")
    if (!text.includes("\n")) return
    event.preventDefault()
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    const parsed = parseOutline(lines.map((line) => (/^\s*[-*+]\s/.test(line) ? line : line.replace(/^(\s*)/, "$1- "))).join("\n")).rows
    const row = rows[i]
    const pasted = keyed(parsed.map((line) => ({ depth: line.depth + row.depth, text: line.text })))
    const replace = row.text.trim() === "" ? 1 : 0
    const at = replace ? i : subtreeEnd(rows, i)
    for (const line of pasted) kept.current.add(line.key)
    commit([...rows.slice(0, at), ...pasted, ...rows.slice(at + replace)])
    pendingFocus.current = { key: pasted.at(-1)!.key, caret: "end" }
  }

  function remove(i: number) {
    commit([...rows.slice(0, i), ...rows.slice(subtreeEnd(rows, i))])
  }

  const fieldCount = rows.filter((row) => row.depth === 0).length
  const nodeCount = places.size
  const allFolded = rows.some((row, i) => row.depth === 0 && rows[i + 1]?.depth > 0) &&
    rows.every((row, i) => row.depth !== 0 || !(rows[i + 1]?.depth > 0) || collapsed.has(row.key))

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-6">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/#skills" />}>
            <ArrowLeft />
            Site
          </Button>
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="font-semibold tracking-tight">Skills outliner</h1>
            <span className="hidden truncate text-xs text-muted-foreground md:inline">
              content/skills.md · {fieldCount} fields · {nodeCount} things
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
              {status?.text ?? (dirty ? "Unsaved changes" : "Up to date")}
            </span>
            {dirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  commit(keyed(parseOutline(saved).rows))
                  setStatus(null)
                }}
              >
                Discard
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
              <Kbd>⌘S</Kbd>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1440px] gap-10 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="max-w-xl text-pretty text-sm text-muted-foreground">
            The world as you see it, holding only what you have worked with. Nesting draws the edges; a name in
            two places is one node under both.
          </p>
          <div className="flex items-center justify-between gap-4">
            <InputGroup className="h-8 max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                ref={searchBox}
                type="text"
                aria-label="Search the outline"
                placeholder="Search the outline"
                spellCheck={false}
                autoComplete="off"
                value={query}
                onChange={(event) => {
                  kept.current = new Set()
                  setQuery(event.target.value)
                  // The preview lights up every match, so it lets go of the row it was showing.
                  setSelected(null)
                  setHighlight(null)
                }}
                onFocus={() => searching && setSelected(null)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault()
                    if (query) setQuery("")
                    else event.currentTarget.blur()
                  } else if ((event.key === "Enter" || event.key === "ArrowDown") && found) {
                    // Into the outline, at the first match.
                    event.preventDefault()
                    const first = rows[[...found.matching][0]]
                    const input = first && document.querySelector<HTMLInputElement>(`[data-row="${first.key}"]`)
                    input?.focus()
                    input?.setSelectionRange(input.value.length, input.value.length)
                  }
                }}
              />
              <InputGroupAddon align="inline-end">
                {searching ? (
                  <>
                    <span className="text-xs tabular-nums">
                      {found?.matching.size ? `${found.matching.size} found` : "None"}
                    </span>
                    <InputGroupButton size="icon-xs" aria-label="Clear search" onClick={() => setQuery("")}>
                      <X />
                    </InputGroupButton>
                  </>
                ) : (
                  <Kbd>⌘K</Kbd>
                )}
              </InputGroupAddon>
            </InputGroup>
            <Button
              disabled={searching}
              variant="ghost"
              size="sm"
              onClick={() =>
                setCollapsed(allFolded ? new Set() : new Set(rows.filter((row, i) => row.depth === 0 && rows[i + 1]?.depth > 0).map((row) => row.key)))
              }
            >
              {allFolded ? <ChevronsUpDown /> : <ChevronsDownUp />}
              {allFolded ? "Unfold all" : "Fold all"}
            </Button>
          </div>

          <ul className="flex flex-col pb-40" role="tree" aria-label="Skills outline">
            {visible.map((i) => {
              const row = rows[i]
              const parent = rows[i + 1]?.depth > row.depth
              const folded = parent && !searching && collapsed.has(row.key)
              // Rows only there to place a match read quieter.
              const context = found && !found.lit.has(i)
              const count = places.get(slug(row.text)) ?? 0
              return (
                <li
                  key={row.key}
                  role="treeitem"
                  aria-level={row.depth + 1}
                  aria-expanded={parent ? !folded : undefined}
                  className={cn(
                    "group/row relative flex items-center rounded-md pr-1 transition-colors",
                    highlight === row.key ? "bg-muted" : "hover:bg-muted/40",
                    context && "opacity-55"
                  )}
                >
                  {/* Indent guides, one per level. */}
                  {Array.from({ length: row.depth }, (_, level) => (
                    <span key={level} aria-hidden className={cn("h-8 w-6 shrink-0 border-l border-border/70", level === 0 && "ml-[11px]")} />
                  ))}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => parent && !searching && (folded ? expand(row.key) : setCollapsed((collapsed) => new Set(collapsed).add(row.key)))}
                    className={cn("flex size-6 shrink-0 items-center justify-center rounded", parent && "hover:bg-muted")}
                    aria-label={parent ? (folded ? "Unfold" : "Fold") : undefined}
                  >
                    {parent ? (
                      <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", !folded && "rotate-90")} />
                    ) : (
                      <Dot color={fieldToken(Math.max(fieldOf[i], 0))} className="size-1.5" />
                    )}
                  </button>
                  <input
                    data-row={row.key}
                    value={row.text}
                    placeholder="Name it"
                    spellCheck={false}
                    onChange={(event) => {
                      commit(rows.map((r, k) => (k === i ? { ...r, text: event.target.value } : r)), row.key)
                      // The preview flies to the new name once it has caught up.
                      if (event.target.value.trim()) setSelected(slug(event.target.value))
                    }}
                    onKeyDown={(event) => onRowKeyDown(event, i)}
                    onPaste={(event) => onPaste(event, i)}
                    onFocus={() => {
                      if (searching) kept.current.add(row.key)
                      setHighlight(row.key)
                      if (row.text.trim()) setSelected(slug(row.text))
                    }}
                    className={cn(
                      "h-8 min-w-0 flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground/50",
                      row.depth === 0 && "font-semibold uppercase tracking-wider text-(--field)",
                      row.depth === 1 && "font-medium"
                    )}
                    style={row.depth === 0 ? ({ "--field": fieldToken(Math.max(fieldOf[i], 0)) } as CSSProperties) : undefined}
                  />
                  {folded && (
                    <span className="mr-2 text-xs tabular-nums text-muted-foreground">{subtreeEnd(rows, i) - i - 1}</span>
                  )}
                  {count > 1 && (
                    <span
                      className="mr-2 rounded-full border border-border px-1.5 text-2xs text-muted-foreground"
                      title="This name appears in more than one place: one node, linked under each parent"
                    >
                      in {count} places
                    </span>
                  )}
                  <span className="flex opacity-0 transition-opacity group-hover/row:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      tabIndex={-1}
                      onClick={() => remove(i)}
                      aria-label={`Delete ${row.text || "row"}${parent ? " and everything under it" : ""}`}
                      title={parent ? "Delete with everything under it (⌘Z brings it back)" : "Delete (⌘Z brings it back)"}
                    >
                      <Trash2 />
                    </Button>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
          <SkillGraph outline={preview} stacked selected={selected} onFocusChange={onFocusChange} search={query} />
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {keys.map(([key, does]) => (
              <div key={key} className="contents">
                <dt>
                  <Kbd>{key}</Kbd>
                </dt>
                <dd className="self-center">{does}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </main>
    </div>
  )
}
