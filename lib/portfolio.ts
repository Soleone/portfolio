export const profile = {
  name: "Alex Rivera",
  role: "Full-Stack Web Developer",
  tagline: "I build accessible, performant web experiences for the modern web.",
  intro:
    "I'm a freelance developer who partners with founders and teams to ship polished products. My favorite work lives at the intersection of thoughtful design and robust engineering — interfaces that look great and are built to last.",
  location: "Remote · Lisbon, PT",
  email: "hello@alexrivera.dev",
  socials: [
    { label: "GitHub", href: "https://github.com" },
    { label: "LinkedIn", href: "https://linkedin.com" },
    { label: "X / Twitter", href: "https://x.com" },
    { label: "Read.cv", href: "https://read.cv" },
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
  { label: "Languages", items: ["TypeScript", "JavaScript", "Python", "SQL"] },
  { label: "Frameworks", items: ["React", "Next.js", "Node.js", "Express"] },
  { label: "Styling", items: ["Tailwind CSS", "CSS", "Framer Motion", "shadcn/ui"] },
  { label: "Tooling", items: ["Git", "Vercel", "Docker", "Playwright"] },
]

export const experience: { period: string; role: string; company: string; description: string }[] = [
  {
    period: "2022 — Present",
    role: "Freelance Web Developer",
    company: "Independent",
    description:
      "Partnering with startups and agencies to design and build production web apps from the ground up.",
  },
  {
    period: "2020 — 2022",
    role: "Frontend Engineer",
    company: "Northwind Labs",
    description:
      "Led the rebuild of the core product UI, improving Lighthouse scores and shipping a new design system.",
  },
  {
    period: "2018 — 2020",
    role: "Junior Developer",
    company: "Bright Pixel",
    description:
      "Built client marketing sites and internal tools across a range of industries and stacks.",
  },
]
