-- CreateTable
CREATE TABLE `attempted` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,

    UNIQUE INDEX `attempted_userId_questionId_key`(`userId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `attempted` ADD CONSTRAINT `attempted_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attempted` ADD CONSTRAINT `attempted_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `quizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
