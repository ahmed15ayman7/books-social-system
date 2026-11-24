/** extname من غير node:path (عشان يشتغل في المتصفح) */
export function extname(p: string): string {
  const name = p.split(/[\\/]/).pop() ?? "";
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i) : "";
}
