-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "borough" TEXT NOT NULL DEFAULT 'نيويورك',
ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'عام',
ADD COLUMN     "color" TEXT NOT NULL DEFAULT 'bg-zinc-50',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '';
