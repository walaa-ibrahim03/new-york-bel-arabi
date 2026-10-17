export type EditorText = { title: string; summary: string; content: string };
export type EditorOperation = "translate" | "simplify";
export function detectNewsLanguage(text: string): "ar" | "en" | "mixed" | "unknown" {
  const ar = [...text].filter(c => /\p{Script=Arabic}/u.test(c) && /\p{L}/u.test(c)).length;
  const en = (text.match(/[a-z]/gi) ?? []).length;
  if (ar + en < 8) return "unknown";
  if (ar > 0 && en > 0 && Math.min(ar, en) / (ar + en) > 0.3) return "mixed";
  return ar > en ? "ar" : "en";
}
export function validateEditorText(text: EditorText): EditorText {
  if (!text || typeof text.title !== "string" || typeof text.summary !== "string" || typeof text.content !== "string" || !text.title.trim() || !text.content.trim() || text.title.length > 180 || text.summary.length > 500 || text.content.length > 8000) throw new Error("أدخلي عنوانًا ونصًا حتى 8000 حرف قبل المعالجة.");
  return { title: text.title, summary: text.summary, content: text.content };
}
export function readPendingOriginal(value: FormDataEntryValue | null, sourceUrl: string) {
  if (value === null || value === "") return {};
  if (typeof value !== "string" || value.length > 60000) throw new Error("Invalid original snapshot");
  const parsed = JSON.parse(value);
  const text = validateEditorText(parsed);
  if (parsed.sourceUrl !== sourceUrl) throw new Error("Original source changed");
  return { originalTitle: text.title, originalSummary: text.summary, originalContent: text.content };
}
