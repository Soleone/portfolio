export const profile = {
  name: "Dennis Theisen",
  role: "Full-Stack Web Developer",
  tagline: "I build accessible, performant web experiences for the modern web.",
  intro:
    "I'm a freelance developer who partners with founders and teams to ship polished products. My favorite work lives at the intersection of thoughtful design and robust engineering: interfaces that look great and are built to last.",
  location: "Ottawa, Canada",
  email: "dev@soleone.xyz",
  socials: [
    { label: "GitHub", href: "https://github.com/Soleone" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/dennis-theisen-8a88a57/" },
    { label: "X / Twitter", href: "https://x.com/soleone" },
  ],
}

export type Project = {
  title: string
  description: string
  year: string
  image: string
  tags: string[]
  href: string
}

export const projects: Project[] = [
  {
    title: "Pulse Analytics",
    description:
      "A real-time analytics dashboard for SaaS teams, featuring live charts, custom reports, and role-based access.",
    year: "2024",
    image: "/projects/analytics-dashboard.png",
    tags: ["Next.js", "TypeScript", "PostgreSQL", "Tailwind"],
    href: "#",
  },
  {
    title: "Atelier Store",
    description:
      "A headless e-commerce storefront with a custom CMS, instant search, and a checkout that converts.",
    year: "2024",
    image: "/projects/ecommerce-store.png",
    tags: ["React", "Shopify", "GraphQL", "Stripe"],
    href: "#",
  },
  {
    title: "Vault Banking",
    description:
      "A mobile-first banking experience with secure auth, transaction insights, and a delightful onboarding flow.",
    year: "2023",
    image: "/projects/mobile-banking.png",
    tags: ["React Native", "Node.js", "Plaid", "Expo"],
    href: "#",
  },
]

export const skillGroups: { label: string; items: string[] }[] = [
  { label: "Languages", items: ["Ruby", "TypeScript", "JavaScript", "Java", "C++", "SQL"] },
  { label: "Frameworks", items: ["Rails", "React", "Next.js", "Vue", "Remix", "Node.js", "Three.js", "Unreal Engine"] },
  { label: "Styling", items: ["Tailwind CSS", "CSS", "Framer Motion", "shadcn/ui"] },
  { label: "Tooling", items: ["Git", "Unix", "Vercel", "Docker", "Playwright"] },
  { label: "AI", items: ["Pi agent", "Claude", "Cursor"] },
]

export const experience: { period: string; role: string; company: string; description: string }[] = [
  {
    period: "2008 - Present",
    role: "Software Engineer",
    company: "Shopify",
    description:
      "Worked across a broad range of Shopify areas, including Payments, Admin, Apps, technical support, internal tools, the home screen, core architecture, blockchain, Shop app authentication, and the communications platform.",
  },
  {
    period: "2008",
    role: "Computer Science",
    company: "University of Koblenz-Landau",
    description: "Studied computer science before eventually dropping out and relocating to Canada.",
  },
]
