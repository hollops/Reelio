// TEMPORARY (Prompt 98 measurement) — counts how often components run. Deleted after measuring.
export function countRender(name: string) {
  const w = window as unknown as { __renders?: Record<string, number> }
  w.__renders ??= {}
  w.__renders[name] = (w.__renders[name] ?? 0) + 1
}
