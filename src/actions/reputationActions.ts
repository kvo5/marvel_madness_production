"use server";

import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/prisma'; // Use named import for prisma client
import { VoteType, ReputationVote, Prisma } from '@prisma/client';

interface UpdateReputationResult {
    success: boolean;
    message?: string;
    newReputation?: number;
    voteStatus?: string | null; // 'UPVOTE', 'DOWNVOTE', or 'removed'
    error?: string;
}

export async function updateReputationAction(
    targetUserId: string,
    voteType: string // Expecting 'UPVOTE' or 'DOWNVOTE'
): Promise<UpdateReputationResult> {
    try {
        const authResult = await auth();
        const voterId = authResult?.userId;

        if (!voterId) {
            return { success: false, error: 'Unauthorized' };
        }

        if (voterId === targetUserId) {
            return { success: false, error: 'Cannot vote on your own reputation' };
        }

        if (!voteType || (voteType !== VoteType.UPVOTE && voteType !== VoteType.DOWNVOTE)) {
            return { success: false, error: 'Invalid vote type provided' };
        }

        const validatedVoteType = voteType as VoteType;

        const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            const existingVote = await tx.reputationVote.findUnique({
                where: {
                    voterId_targetUserId: {
                        voterId: voterId,
                        targetUserId: targetUserId,
                    },
                },
            });

            let reputationDelta = 0;
            let updatedVote: ReputationVote | null = null;
            let voteRemoved = false;

            if (existingVote) {
                // Vote exists, check if it's the same type
                if (existingVote.voteType === validatedVoteType) {
                    // Same vote type, remove the vote (toggle off)
                    await tx.reputationVote.delete({
                        where: { id: existingVote.id },
                    });
                    reputationDelta = validatedVoteType === VoteType.UPVOTE ? -1 : 1; // Revert the previous vote
                    voteRemoved = true;
                } else {
                    // Different vote type, update the vote (toggle from up to down or vice versa)
                    updatedVote = await tx.reputationVote.update({
                        where: { id: existingVote.id },
                        data: { voteType: validatedVoteType },
                    });
                    // Delta is doubled because we remove the old vote effect and add the new one
                    reputationDelta = validatedVoteType === VoteType.UPVOTE ? 2 : -2;
                }
            } else {
                // No existing vote, create a new one
                updatedVote = await tx.reputationVote.create({
                    data: {
                        voterId: voterId,
                        targetUserId: targetUserId,
                        voteType: validatedVoteType,
                    },
                });
                reputationDelta = validatedVoteType === VoteType.UPVOTE ? 1 : -1;
            }

            // Update the target user's reputation
            const updatedUser = await tx.user.update({
                where: { id: targetUserId },
                data: {
                    reputation: {
                        increment: reputationDelta,
                    },
                },
                select: { reputation: true }, // Only select the necessary field
            });

            return { newReputation: updatedUser.reputation, updatedVote, voteRemoved };
        });

        return {
            success: true,
            message: 'Reputation updated successfully',
            newReputation: result.newReputation,
            // Provide the final status of the vote
            voteStatus: result.voteRemoved ? 'removed' : result.updatedVote?.voteType,
        };

    } catch (error) {
        console.error("Error updating reputation via Server Action:", error);
        // Consider logging the specific error for debugging
        // In a real app, you might want more specific error handling
        return { success: false, error: 'Failed to update reputation' };
    }
}