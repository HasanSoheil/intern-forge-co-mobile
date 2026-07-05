/** Small shared helpers. */

export function initials(name?: string | null, email?: string | null): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const s = Math.round(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(iso).toLocaleDateString();
}

export function clockTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function capitalize(s?: string | null): string {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Deterministic thread id for a 1:1 conversation tied to an internship. */
export function threadId(internshipId: string, otherUserId: string): string {
  return `${internshipId}__${otherUserId}`;
}

export function parseThreadId(id: string): { internshipId: string; otherUserId: string } {
  const [internshipId, otherUserId] = id.split("__");
  return { internshipId, otherUserId };
}

export function isDeadlinePassed(deadline?: string | null): boolean {
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}
