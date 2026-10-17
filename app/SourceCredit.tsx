import { sourceCredit } from "../lib/source-credit";
export default function SourceCredit({ sourceName, sourceUrl }: { sourceName?: string | null; sourceUrl: string }) {
  const credit = sourceCredit(sourceName, sourceUrl);
  return <p>المصدر: {credit.href ? <a href={credit.href} rel="noopener noreferrer" target="_blank" className="underline">{credit.name}</a> : credit.name}</p>;
}
