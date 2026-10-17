// Known attribution obligations survive the compact display. This is not a license grant.
export function sourceCredit(sourceName: string | null | undefined, sourceUrl: string) {
  try {
    const url = new URL(sourceUrl), host = url.hostname.toLowerCase().replace(/^www\./, "");
    const requiresLink = host === "thecity.nyc" || host.endsWith(".thecity.nyc") || host === "thecityreporter.nyc" || host.endsWith(".thecityreporter.nyc");
    return { name: sourceName?.trim() || ({ "gothamist.com": "Gothamist", "thecity.nyc": "THE CITY", "thecityreporter.nyc": "The City Reporter", "nasa.gov": "NASA", "amny.com": "amNewYork" } as Record<string, string>)[host] || "مصدر الخبر", href: requiresLink && url.protocol === "https:" && !url.username && !url.password ? url.href : undefined };
  } catch { return { name: sourceName?.trim() || "مصدر الخبر", href: undefined }; }
}
