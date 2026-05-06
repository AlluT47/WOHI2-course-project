/*
  Warnings:

  - You are about to drop the `attempted` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `attempted` DROP FOREIGN KEY `attempted_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `attempted` DROP FOREIGN KEY `attempted_userId_fkey`;

-- DropTable
DROP TABLE `attempted`;

-- CreateTable
CREATE TABLE `solved` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,

    UNIQUE INDEX `solved_userId_questionId_key`(`userId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `solved` ADD CONSTRAINT `solved_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `solved` ADD CONSTRAINT `solved_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
