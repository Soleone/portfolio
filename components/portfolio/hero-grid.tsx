"use client"

import { useEffect, useRef } from "react"
import { useReducedMotion } from "motion/react"
import { useTheme } from "@/components/soleone/theme"

const CELL_WIDTH = 9
const CELL_HEIGHT = 20
const FONT = "12px ui-monospace, SFMono-Regular, Menlo, monospace"
const FADE_MS = 1600
// How many cells around the pointer light up.
const REACH = 6.5

// The text the grid is made of. Each line appears once, so mix shell, code and the odd secret.
const LINES = [
  "git log --oneline | grep feat | wc -l",
  'export const tagline = "Products that feel good to use."',
  "find . -name '*.tsx' -not -path './node_modules/*' | xargs wc -l | sort -n | tail -5",
  "await agent.run({ task, tools: [read, edit, bash] })",
  "tail -f ~/.pi/sessions/*.jsonl | jq -c 'select(.role == \"assistant\")'",
  'type Theme = { name: string; mode: "dark" | "light" }',
  "curl -s api.github.com/users/Soleone/repos | jq -r '.[].name' | sort",
  "for await (const event of session.stream()) render(event)",
  "tmux new -d -s agents 'pi --task 42' && tmux attach -t agents",
  "const coins = useSyncExternalStore(subscribe, () => count)",
  "ffmpeg -i demo.mov -vf fps=12,scale=640:-1 demo.gif",
  "jq '.notes | map(select(.lane == 2)) | length' beatmap.json",
  "const feelsGood = (app: App) => app.latency < 100 && app.delight > 0",
  "rg -l 'TODO' src | xargs -n1 git blame --line-porcelain | grep author | sort | uniq -c",
  "pnpm typecheck && pnpm build && vercel --prod",
  "if (devtools.isOpen) console.info(notes.forTheCurious)",
  "awk -F, '$3 > 120 { print $1 }' tracks.csv | sort -u",
  "git rebase -i HEAD~3 # no. never mind. git commit --amend",
  "const [state, dispatch] = useReducer(reducer, initialState)",
  "ls -la ~/src/products | grep -v '^total'",
  "export default defineConfig({ plugins: [react()] })",
  "while true; do pnpm test --silent || say 'it broke'; sleep 5; done",
  "function lerp(a: number, b: number, t: number) { return a + (b - a) * t }",
  "du -sh node_modules # don't look",
  "git worktree add ../portfolio-hero -b feat/hero",
  "const reduced = useReducedMotion() ?? false",
  "cat ~/.config/omarchy/themes/gilt/colors.toml | grep accent",
  "ssh ottawa.local 'uptime'",
  "requestAnimationFrame(function loop(now) { tick(now); requestAnimationFrame(loop) })",
  "sed -n '/^## Skills/,/^## /p' content/skills.md",
  "pi --resume $(ls -t ~/.pi/sessions | head -1)",
  "interface Card { title: string; tier: 'S' | 'A'; live?: string }",
  "xargs -P4 -I{} pi --task {} < tasks.txt",
  "const bpm = 60_000 / (beats.at(-1)! - beats[0]) * (beats.length - 1)",
  "git stash && git pull --ff-only && git stash pop",
  "export function collectCoin() { coins += 1; notify() }",
  "watch -n1 'tasks list --open | wc -l'",
  "localStorage.getItem('portfolio.theme') ?? 'gilt'",
  "history | awk '{ print $2 }' | sort | uniq -c | sort -rn | head",
  "const deck = shuffle(cards).slice(0, 7)",
  "grep -rn 'any' src --include=*.ts | wc -l # keep it low",
  "logdig --today >> ~/notes/$(date +%F).md",
  "type Lane = 0 | 1 | 2 | 3",
  "curl -sI https://soleone.xyz | head -1",
  "const ease = (t: number) => 1 - Math.pow(1 - t, 3)",
  "tmux split-window -h 'pnpm dev' \\; split-window -v 'tasks watch'",
  "new ResizeObserver(() => draw()).observe(canvas)",
  "fd -e png public | xargs -I{} cwebp -q 80 {} -o {}.webp",
  "if (event.repeat || isInteractiveTarget(event.target)) return",
  "git log --author=Soleone --since='1 year ago' --oneline | wc -l",
  "const audio = new AudioContext({ latencyHint: 'interactive' })",
  "jq -s 'map(.tokens) | add' sessions/*.json",
  "export const gilt = { accent: '#D4AF37', background: '#0D0F12' }",
  "kill -9 $(lsof -t -i:3000)",
  "for (const [cell, since] of lit) fade(cell, since)",
  "echo $SHELL # bash, and that's fine",
  "await Promise.all(projects.map((project) => capture(project.live)))",
  "git bisect start && git bisect bad && git bisect good v1.0",
  "document.startViewTransition(() => setTheme(next))",
  "tar -czf notes-$(date +%F).tgz ~/notes",
  "const score = hits.filter((hit) => Math.abs(hit.offset) < 40).length",
  "vercel env pull .env.local",
  "useEffect(() => { if (greeted) return; greeted = true }, [])",
  "cat /dev/urandom | tr -dc 'a-z' | head -c 8",
  "type Stage = 'product' | 'prototype' | 'proof of concept'",
  "ps aux | grep -v grep | grep -c 'pi '",
  "pnpm dlx shadcn add @soleone/theme-picker",
  "const sorted = projects.toSorted((a, b) => rank(a) - rank(b))",
  "git push origin --delete old-experiment",
  "z portfolio && nvim app/page.tsx",
  "export async function sendMail(form: FormData) { 'use server' }",
  "yes | head -3",
  "const snap = Math.round(time / grid) * grid",
  "rsync -av --exclude node_modules ~/src/ /mnt/backup/src/",
  "matchMedia('(prefers-color-scheme: dark)').matches",
  "git diff --stat main...HEAD",
  "const spring = { type: 'spring', stiffness: 500, damping: 30 }",
  "crontab -l | grep showcase",
  "Object.groupBy(skills, (skill) => skill.area)",
  "uniq -c < coffee.log | tail -1",
  "export type Coin = { collected: boolean; at: number }",
  "make -j$(nproc) 2>&1 | tee build.log",
  "const latency = performance.now() - pressedAt",
  "openssl rand -hex 16",
  "if (!response.ok) throw new Error(`fetch failed: ${response.status}`)",
  "git commit -m 'feat(hero): terminal cell grid'",
]

// Blocks set over the stream at fixed spots the hero's content leaves free. A negative row counts from the bottom.
const BLOCKS: { side: "left" | "right"; row: number; lines: string[] }[] = [
  {
    // Where it all started. Narrow enough to stay left of the headline on a laptop.
    side: "left",
    row: 1,
    lines: [
      "class Portfolio",
      "  include Enumerable",
      "",
      "  def shipped",
      "    projects",
      "      .select(&:live?)",
      "      .sort_by(&:year)",
      "  end",
      "",
      "  def feels_good? = true",
      "end",
    ],
  },
  {
    // Bait. The hex spells out "nice try. now say hi in #contact".
    side: "right",
    row: 1,
    lines: [
      "// TODO: move this to .env before launch",
      'const PRIVATE_KEY = "0x6e696365207472792e206e6f772073617920686920696e2023636f6e74616374"',
    ],
  },
  {
    side: "right",
    row: -5,
    lines: ['if (konami.every((key, i) => key === pressed[i])) unlock("game-boy")'],
  },
]

// Places the blocks, then lays every line out once around them, sharing the lines evenly between the rows. The gaps are
// uneven so it reads like scrollback rather than a pattern. A line that would run into a block or off the edge is left
// out rather than cut.
function buildRows(columns: number, rows: number) {
  const grid = Array.from({ length: rows }, () => Array<string>(columns).fill(" "))
  // Per row, the cell ranges the blocks hold, with a four cell margin so they stand apart from the stream.
  const taken = Array.from({ length: rows }, () => [] as { from: number; to: number }[])
  const put = (row: number, start: number, text: string) => [...text].forEach((c, i) => (grid[row][start + i] = c))

  for (const block of BLOCKS) {
    const width = Math.max(...block.lines.map((line) => line.length))
    const start = block.side === "left" ? 1 : columns - width - 4
    const top = block.row < 0 ? rows + block.row : block.row
    if (start < 0 || top < 0 || top + block.lines.length > rows) continue
    block.lines.forEach((line, i) => {
      taken[top + i].push({ from: start - 4, to: start + width + 4 })
      put(top + i, start, line)
    })
  }

  for (let row = 0; row < rows; row++) {
    const share = LINES.slice(Math.floor((row * LINES.length) / rows), Math.floor(((row + 1) * LINES.length) / rows))
    const room = columns - share.reduce((sum, line) => sum + line.length, 0)
    const gap = Math.max(4, room / (share.length + 1))
    let column = Math.round(gap * (((row * 37) % 100) / 100))
    share.forEach((line, i) => {
      const end = column + line.length
      if (end <= columns && !taken[row].some((range) => column < range.to && end > range.from)) put(row, column, line)
      column = end + Math.round(gap * (0.5 + (((row + i) * 53) % 100) / 100))
    })
  }
  return grid.map((cells) => cells.join(""))
}

// A faint grid of terminal cells behind the hero, one dot wherever a character of LINES sits. The pointer reveals
// the characters under it, which fade back into dots. Nothing moves until the pointer does.
export function HeroGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion() ?? false
  const { theme } = useTheme()

  useEffect(() => {
    const canvas = canvasRef.current
    const area = canvas?.parentElement
    const context = canvas?.getContext("2d")
    if (!canvas || !area || !context) return

    let rows: string[] = []
    let columns = 0
    let width = 0
    let height = 0
    // Cell index → when it lit up. Cells further from the pointer get an earlier time, so they start out fainter.
    const lit = new Map<number, number>()
    let frame = 0

    const draw = () => {
      const style = getComputedStyle(canvas)
      const now = performance.now()
      context.clearRect(0, 0, width, height)

      context.fillStyle = style.getPropertyValue("--muted-foreground")
      context.globalAlpha = 0.18
      rows.forEach((text, row) => {
        for (let column = 0; column < columns; column++) {
          if (text[column] !== " ") context.fillRect(column * CELL_WIDTH + 4, row * CELL_HEIGHT + 10, 1.2, 1.2)
        }
      })

      context.fillStyle = style.getPropertyValue("--primary")
      for (const [cell, since] of lit) {
        const age = (now - since) / FADE_MS
        if (age >= 1) {
          lit.delete(cell)
          continue
        }
        const row = Math.floor(cell / columns)
        const column = cell % columns
        context.globalAlpha = (1 - age) * 0.45
        context.fillText(rows[row][column], column * CELL_WIDTH + 4.5, row * CELL_HEIGHT + 10)
      }
      context.globalAlpha = 1

      frame = lit.size > 0 ? requestAnimationFrame(draw) : 0
    }

    const resize = () => {
      const scale = devicePixelRatio || 1
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = width * scale
      canvas.height = height * scale
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.font = FONT
      context.textAlign = "center"
      context.textBaseline = "middle"
      columns = Math.ceil(width / CELL_WIDTH)
      // Only whole rows, so no line is cut in half by the header or the divider below.
      rows = buildRows(columns, Math.floor(height / CELL_HEIGHT))
      lit.clear()
      draw()
    }

    const reveal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const pointerColumn = (event.clientX - rect.left) / CELL_WIDTH
      const pointerRow = (event.clientY - rect.top) / CELL_HEIGHT
      const now = performance.now()
      // Cells are about twice as tall as they are wide, so reach half as many rows to keep the patch round.
      for (let row = Math.floor(pointerRow - REACH / 2); row <= pointerRow + REACH / 2; row++) {
        for (let column = Math.floor(pointerColumn - REACH); column <= pointerColumn + REACH; column++) {
          const character = rows[row]?.[column]
          if (character === undefined || character === " ") continue
          const distance = Math.hypot(column - pointerColumn, (row - pointerRow) * 2) / REACH
          if (distance > 1) continue
          const since = now - distance * FADE_MS * 0.7
          const cell = row * columns + column
          if ((lit.get(cell) ?? 0) < since) lit.set(cell, since)
        }
      }
      if (!frame) frame = requestAnimationFrame(draw)
    }

    // Also runs once right away, which does the first draw.
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    if (!reduced) area.addEventListener("pointermove", reveal)
    return () => {
      observer.disconnect()
      area.removeEventListener("pointermove", reveal)
      cancelAnimationFrame(frame)
    }
  }, [reduced, theme])

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 -z-10 size-full" />
}
