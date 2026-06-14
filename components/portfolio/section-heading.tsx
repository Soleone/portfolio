export function SectionHeading({ label, title }: { label: string; title: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium uppercase tracking-wider text-primary">{label}</span>
      <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
    </div>
  )
}
