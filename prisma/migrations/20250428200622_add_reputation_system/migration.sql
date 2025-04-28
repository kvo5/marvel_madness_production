-- AlterTable
ALTER TABLE `User` ADD COLUMN `reputation` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `ReputationVote` (
    `id` VARCHAR(191) NOT NULL,
    `voterId` VARCHAR(191) NOT NULL,
    `targetUserId` VARCHAR(191) NOT NULL,
    `voteType` ENUM('UPVOTE', 'DOWNVOTE') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReputationVote_voterId_idx`(`voterId`),
    INDEX `ReputationVote_targetUserId_idx`(`targetUserId`),
    UNIQUE INDEX `ReputationVote_voterId_targetUserId_key`(`voterId`, `targetUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ReputationVote` ADD CONSTRAINT `ReputationVote_voterId_fkey` FOREIGN KEY (`voterId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReputationVote` ADD CONSTRAINT `ReputationVote_targetUserId_fkey` FOREIGN KEY (`targetUserId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
