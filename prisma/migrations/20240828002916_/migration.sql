-- AlterTable
ALTER TABLE "JobApplication" ALTER COLUMN "review" DROP NOT NULL,
ALTER COLUMN "review" DROP DEFAULT,
ALTER COLUMN "review" SET DATA TYPE TEXT;
