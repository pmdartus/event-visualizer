export function classMap(obj: { [name: string]: boolean }): string {
  return Object.entries(obj)
    .filter(([, value]) => value)
    .map(([name]) => name)
    .join(" ");
}
