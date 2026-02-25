-- CreateEnum
CREATE TYPE "TodoCategory" AS ENUM ('PENSION', 'CART', 'PROGRAM', 'ETC');

-- AlterTable
ALTER TABLE "todos" ADD COLUMN     "category" "TodoCategory" NOT NULL DEFAULT 'ETC';

-- CreateIndex
CREATE INDEX "todos_user_id_category_idx" ON "todos"("user_id", "category");
