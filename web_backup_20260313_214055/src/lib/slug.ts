export function slugifyVendorName(
  rawName: string | null | undefined,
  id?: string | null | undefined
): string {
  const fallback = "vendor";
  const name = (rawName ?? "").trim().toLowerCase();

  const base = name
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  const safeBase = base || fallback;

  if (!id) {
    return safeBase;
  }

  const compactId = String(id)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const shortId = compactId.slice(0, 8);

  return shortId ? `${safeBase}-${shortId}` : safeBase;
}
