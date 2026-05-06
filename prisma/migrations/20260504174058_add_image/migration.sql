/*
  Warnings:

  - You are about to drop the column `imageURL` on the `quizes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `quizes` DROP COLUMN `imageURL`,
    ADD COLUMN `imageUrl` VARCHAR(255) NULL;
