-- CreateTable
CREATE TABLE `quizes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `question` TEXT NOT NULL,
    `answer` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `keywords` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `keywords_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_KeywordToQuiz` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_KeywordToQuiz_AB_unique`(`A`, `B`),
    INDEX `_KeywordToQuiz_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `_KeywordToQuiz` ADD CONSTRAINT `_KeywordToQuiz_A_fkey` FOREIGN KEY (`A`) REFERENCES `keywords`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_KeywordToQuiz` ADD CONSTRAINT `_KeywordToQuiz_B_fkey` FOREIGN KEY (`B`) REFERENCES `quizes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
