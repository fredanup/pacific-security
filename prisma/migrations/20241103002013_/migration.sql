-- DropForeignKey
ALTER TABLE "Calling" DROP CONSTRAINT "Calling_userId_fkey";

-- AddForeignKey
ALTER TABLE "Calling" ADD CONSTRAINT "Calling_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
