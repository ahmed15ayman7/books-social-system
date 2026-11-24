/** Claude على جهازك بيكلم السيستم بـ Authorization: Bearer $AGENT_TOKEN */
export function agentOk(req: Request): boolean {
  const t = process.env.AGENT_TOKEN;
  return !!t && t.length >= 16 && req.headers.get("authorization") === `Bearer ${t}`;
}

export const deny = () => Response.json({ error: "unauthorized" }, { status: 401 });
