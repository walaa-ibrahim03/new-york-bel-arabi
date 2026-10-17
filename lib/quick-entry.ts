import { validateFactBrief } from "./factual-brief";

export function quickEntryInput(sourceUrl: string, facts: string) {
  const url = new URL(sourceUrl.trim());
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const names: Record<string, string> = { "abc7ny.com": "ABC7NY", "nbcnewyork.com": "NBC New York", "news12.com": "News 12", "silive.com": "SILive / Staten Island Advance", "nypost.com": "New York Post", "brooklyneagle.com": "Brooklyn Eagle" };
  const known = Object.keys(names).find(domain => host === domain || host.endsWith(`.${domain}`));
  return validateFactBrief({ sourceUrl: url.href, facts, sourceName: known ? names[known] : host, confirmed: true });
}
