import { prisma } from "./prisma";
import { requireDatabaseTarget, assertNewsOperationAllowed } from "./database-guard";
import { newsSources, isSourceApproved } from "./news-sources";
import { importRSS } from "./import-rss";
import { translateNewsToArabic } from "./translate-news";
import { attributeBrief, validateBriefNumbers } from "./factual-brief";

export async function collectScheduledNews() {
  assertNewsOperationAllowed(); requireDatabaseTarget();
  // Transaction-scoped lock serializes invocations across serverless instances.
  // All writes share this transaction so timeout releases the lock and rolls back.
  return prisma.$transaction(async tx => {
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(75213, 6017) AS acquired`;
    if (!lock.acquired) return { busy: true, imported: 0, prepared: 0, failed: 0, checkedAt: new Date().toISOString() };
    let imported = 0, prepared = 0, failed = 0;
    const started = new Date();
    for (const source of newsSources.filter(isSourceApproved).slice(0, 2)) {
      imported += (await importRSS({ feedUrl: source.feedUrl, limit: 2, store: tx })).imported;
    }
    if (process.env.NYBA_AUTO_PREPARE === "true") {
      const drafts = await tx.article.findMany({ where: { status: "DRAFT", createdAt: { gte: started }, originalTitle: { not: null } }, orderBy: { id: "asc" }, take: 2 });
      for (const draft of drafts) {
        const source = newsSources.find(s => s.name === draft.sourceName && isSourceApproved(s));
        if (!source || new URL(source.feedUrl).hostname !== new URL(draft.sourceUrl).hostname) continue;
        let text;
        try {
          const generated = await translateNewsToArabic(draft.originalTitle!, draft.originalSummary ?? "", draft.originalContent ?? "");
          validateBriefNumbers(`${draft.originalTitle} ${draft.originalSummary} ${draft.originalContent}`, generated);
          text = attributeBrief(generated, source.name);
        } catch { failed++; continue; }
        const result = await tx.article.updateMany({ where: { id: draft.id, status: "DRAFT", revision: draft.revision }, data: { ...text, revision: { increment: 1 }, approvedAt: null, approvedBy: null, reviewedAt: null, reviewedBy: null, publishedAt: null } });
        prepared += result.count;
      }
    }
    return { busy: false, imported, prepared, failed, checkedAt: new Date().toISOString() };
  }, { maxWait: 1000, timeout: 110000 });
}
