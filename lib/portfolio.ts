export const profile = {
  name: "Soleone",
  role: "Full-Stack Web Developer",
  tagline: "Products that feel good to use.",
  intro:
    "Intuitive, fast to load, instant to respond, and a little fun along the way. Apps, games and tooling interwoven with AI agents.",
  bio: "Software engineer based in Ottawa, Canada. Nearly 20 years at Shopify taught me how to ship software at scale, from payments to the Shop app, and I led its blockchain team. These days my own time goes to games and the tooling around AI coding agents.",
  location: "Ottawa, Canada",
  socials: [
    { label: "GitHub", href: "https://github.com/Soleone" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/dennis-theisen-8a88a57/" },
    { label: "X / Twitter", href: "https://x.com/soleone" },
  ],
}

export type ProjectPriority = "high" | "mid" | "low"

export type Project = {
  title: string
  description: string
  // Optional longer copy for the back of the card. Never restates the description.
  details?: string
  year: string
  priority: ProjectPriority
  type: string
  tech: string[]
  href: string
  icon?: string
  // From showcase's feed (see lib/showcase.ts): a looping or still image, and a one-click demo.
  image?: string
  live?: string
  // From showcase's feed: only S and A projects are listed, S first within a priority (see showcaseRank in lib/showcase.ts).
  showcaseTier?: "S" | "A" | "B" | "C" | "D" | null
  // Position in the showcase registry (portfolio.json), which the owner reorders with `showcase manage`.
  feedOrder?: number
}

export const priorityRank: Record<ProjectPriority, number> = {
  high: 0,
  mid: 1,
  low: 2,
}

export const projects: Project[] = [
  {
    title: "LogDig",
    description:
      "Turns saved Pi coding-agent sessions into a daily Markdown work journal, four sessions at a time, without touching handwritten notes.",
    year: "2026",
    priority: "high",
    type: "CLI utility",
    tech: ["Node.js", "Pi", "Obsidian"],
    href: "https://github.com/Soleone/logdig",
  },
  {
    title: "Vibestep",
    description:
      "A beatmap studio with a rhythm-game playtest mode. Align a song's beat grid, record or edit lane notes, then play the map right away, in the browser.",
    year: "2026",
    priority: "high",
    type: "Game",
    tech: ["React", "TypeScript", "Web Audio", "Electron"],
    href: "https://github.com/Soleone/vibestep",
    live: "https://vibestep.soleone.xyz",
  },
  {
    title: "Pi Tasks",
    description:
      "A pi coding-agent extension for managing task state through swappable backends, designed for agent-native project work.",
    year: "2026",
    priority: "high",
    type: "AI tooling",
    tech: ["TypeScript", "Pi", "TUI"],
    href: "https://github.com/Soleone/pi-tasks",
  },
  {
    title: "GigQuest",
    description:
      "A story-based programming game about learning software development through quests, practice, and progression.",
    year: "2026",
    priority: "high",
    type: "Game",
    tech: ["Next.js", "React", "Monaco"],
    href: "https://github.com/Soleone/gigquest",
    icon: "/projects/icons/gigquest.png",
  },
  {
    title: "Topdeck",
    description:
      "A polished public website for the Topdeck podcast, built around a clean publishing and listening experience.",
    year: "2023",
    priority: "high",
    type: "Website",
    tech: ["Remix", "Prisma", "Tailwind"],
    href: "https://github.com/Soleone/topdeck",
    icon: "/projects/icons/topdeck.png",
  },
  {
    title: "Pixelpics",
    description:
      "A JavaScript puzzle game that stored its levels as NFTs on the blockchain.",
    year: "2018",
    priority: "high",
    type: "Puzzle game",
    tech: ["Vue", "Blockchain"],
    href: "https://github.com/Soleone/pixelpics",
    icon: "/projects/icons/pixelpics.png",
  },
  {
    title: "SoulsLike",
    description: "An Unreal Engine 5.3 Souls-like game project that highlights C++ and real-time game development breadth.",
    year: "2024",
    priority: "high",
    type: "Game",
    tech: ["Unreal Engine", "C++", "C#"],
    href: "https://github.com/Soleone/SoulsLike",
  },
  {
    title: "YouTube Playlist Downloader",
    description: "A CLI utility that downloads every video from a playlist as MP3s into a folder named after the playlist.",
    year: "2026",
    priority: "high",
    type: "CLI utility",
    tech: ["Shell", "yt-dlp", "ffmpeg"],
    href: "https://github.com/Soleone/youtube-playlist-downloader",
  },
  {
    title: "Agent Memory",
    description:
      "Global and project-scoped memory for coding agents, inspired by durable context systems like OneContext.",
    year: "2026",
    priority: "high",
    type: "AI tooling",
    tech: ["JavaScript", "CLI", "Node.js"],
    href: "https://github.com/Soleone/agent-memory",
  },
  {
    title: "Agent Coach",
    description: "A skill-based plugin that turns an agent into a proactive coach for better workflows and decisions.",
    year: "2026",
    priority: "high",
    type: "AI tooling",
    tech: ["JavaScript", "Shell", "Obsidian"],
    href: "https://github.com/Soleone/agent-coach",
  },
  {
    title: "Pi Multiplayer",
    description:
      "Multiplayer coordination for coding agents, with an agnostic server and runner for experiments beyond a single-agent workflow.",
    year: "2026",
    priority: "mid",
    type: "AI tooling",
    tech: ["TypeScript", "WebSocket", "Vitest"],
    href: "https://github.com/Soleone/pi-mp",
  },
  {
    title: "Gunchained",
    description:
      "A Vue app for managing player sessions around the blockchain card game Gods Unchained.",
    year: "2021",
    priority: "mid",
    type: "Game companion",
    tech: ["Vue", "Vuetify", "Firebase"],
    href: "https://github.com/Soleone/gunchained",
    icon: "/projects/icons/gunchained.png",
  },
  {
    title: "Better YouTube",
    description:
      "A browser/script experiment for improving the YouTube experience, marked for a future README and deeper polish pass.",
    year: "2026",
    priority: "mid",
    type: "Browser script",
    tech: ["JavaScript", "CSS", "Chrome extension"],
    href: "https://github.com/Soleone/better-youtube",
  },
  {
    title: "Podcaster",
    description:
      "A local-first podcast companion: speak to it through your microphone and it answers out loud, with speech running on your own machine.",
    year: "2026",
    priority: "mid",
    type: "Local web app",
    tech: ["TypeScript", "React", "Node", "Python", "Pi"],
    href: "https://github.com/Soleone/2026-08-06-podcaster",
  },
  {
    title: "GameFAQs",
    description:
      "A Ruby gem for accessing GameFAQs data, representing older open-source library work in gaming communities.",
    year: "2008",
    priority: "low",
    type: "Library",
    tech: ["Ruby", "Gem", "API"],
    href: "https://github.com/Soleone/gamefaqs",
  },
  {
    title: "SC2Ranks",
    description:
      "A Ruby API wrapper for StarCraft II rankings data, built during an earlier era of public gaming APIs.",
    year: "2010",
    priority: "low",
    type: "Library",
    tech: ["Ruby", "API", "Gaming"],
    href: "https://github.com/Soleone/sc2ranks",
  },
  {
    title: "Pi Extensions",
    description: "Personal pi agent extensions that can be grouped under the broader Pi ecosystem work.",
    year: "2026",
    priority: "low",
    type: "AI tooling",
    tech: ["TypeScript", "Pi", "Extensions"],
    href: "https://github.com/Soleone/pi-ext",
  },
  {
    title: "Agentic Workflow",
    description: "A text protocol for LLM-based agentic workflows to build products with clearer handoffs and structure.",
    year: "2025",
    priority: "low",
    type: "Protocol",
    tech: ["Markdown", "LLM", "Workflow"],
    href: "https://github.com/Soleone/agentic-workflow",
  },
  {
    title: "Phony",
    description: "A small Twilio app for sending and listing SMS messages.",
    year: "2012",
    priority: "low",
    type: "Web app",
    tech: ["Rails", "Twilio", "CoffeeScript"],
    href: "https://github.com/Soleone/phony",
    icon: "/projects/icons/phony.ico",
  },
]

export const skillGroups: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["Ruby", "TypeScript", "JavaScript", "Java", "C++", "SQL"] },
  { label: "Frameworks", items: ["Rails", "React", "Next.js", "Vue", "Remix", "Node.js", "Three.js", "Unreal Engine"] },
  { label: "Styling", items: ["Tailwind CSS", "CSS", "Framer Motion", "shadcn/ui"] },
  { label: "Tooling", items: ["Git", "Unix", "Vercel", "Docker", "Playwright"] },
  { label: "AI", items: ["Pi agent", "Claude", "Cursor"] },
]

export const values: { label: string; description: string }[] = [
  {
    label: "Taste",
    description: "Spacing, copy, defaults, and what gets left out. The details nobody asks for and everybody feels.",
  },
  {
    label: "Joy",
    description: "Software should be fun to use. Games taught me that early, and it shapes everything I build.",
  },
  {
    label: "Snappy",
    description: "Instant feedback, fast loads, and no spinner where none is needed.",
  },
]

export const focusAreas: { label: string; description: string }[] = [
  {
    label: "AI",
    description:
      "A daily driver of coding agents, building the tooling around them: extensions for tasks, git and subagents, session journaling, memory and coaching.",
  },
  {
    label: "E-commerce",
    description:
      "Nearly two decades building commerce software at Shopify, across payments, admin, apps and the Shop app.",
  },
  {
    label: "Blockchain",
    description:
      "Former lead of Shopify's blockchain team and in crypto since 2017. Still a keen interest, with NFT and on-chain game experiments along the way.",
  },
  {
    label: "Gaming",
    description:
      "Web games, rhythm and puzzle mechanics, Unreal Engine prototypes, and community tools and APIs for games I play.",
  },
]

export const experience: { period: string; role: string; company: string; description: string }[] = [
  {
    period: "Nearly 20 years",
    role: "Software Engineer",
    company: "Shopify",
    description:
      "Worked across payments, admin, apps, the Shop app, the communications platform and core architecture, and led the blockchain team.",
  },
]
