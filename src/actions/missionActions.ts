"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/prisma";
import { revalidatePath } from "next/cache"; // Keep for potential future use

const DAILY_REWARD_AMOUNT = 10;
const TEAM_REWARD_AMOUNT = 20;
const DAILY_REWARD_COOLDOWN_HOURS = 24;

export async function claimDailyReward(): Promise<{ success: boolean; newReputation?: number; error?: string }> {
    try {
        const { userId } = await auth();
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { reputation: true, lastDailyRewardClaimedAt: true },
        });

        if (!user) {
            throw new Error("User not found");
        }

        const now = new Date();
        if (user.lastDailyRewardClaimedAt) {
            const cooldownPeriod = DAILY_REWARD_COOLDOWN_HOURS * 60 * 60 * 1000; // 24 hours in milliseconds
            const timeSinceLastClaim = now.getTime() - user.lastDailyRewardClaimedAt.getTime();

            if (timeSinceLastClaim < cooldownPeriod) {
                 const hoursRemaining = Math.ceil((cooldownPeriod - timeSinceLastClaim) / (60 * 60 * 1000));
                 throw new Error(`Daily reward already claimed. Try again in ${hoursRemaining} hour(s).`);
            }
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                reputation: {
                    increment: DAILY_REWARD_AMOUNT,
                },
                // lastDailyRewardClaimedAt is handled by @updatedAt in schema
            },
            select: { reputation: true },
        });

        // Potentially revalidate user profile or relevant pages
        // revalidatePath('/profile');
        // revalidatePath('/');

        return { success: true, newReputation: updatedUser.reputation };

    } catch (error) {
        console.error("Error claiming daily reward:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
    }
}


export async function claimTeamReward(): Promise<{ success: boolean; newReputation?: number; error?: string }> {
     try {
        const { userId } = await auth();
        if (!userId) {
            throw new Error("User not authenticated");
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { reputation: true, membership: true }, // Select the membership relation
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.membership) { // Check if the user has a team membership
            throw new Error("Must be in a team to claim this reward.");
        }

        // Note: As per instructions, currently no check if this has been claimed before.
        // This will grant the reward every time the action is called by a team member.
        // A dedicated field (e.g., `hasClaimedTeamReward`) should be added to the User schema
        // and checked here for a one-time claim implementation.

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                reputation: {
                    increment: TEAM_REWARD_AMOUNT,
                },
                // Add tracking field update here once schema is modified
                // hasClaimedTeamReward: true,
            },
            select: { reputation: true },
        });

        // Potentially revalidate user profile or relevant pages
        // revalidatePath('/profile');
        // revalidatePath('/');

        return { success: true, newReputation: updatedUser.reputation };

    } catch (error) {
        console.error("Error claiming team reward:", error);
        return { success: false, error: error instanceof Error ? error.message : "An unknown error occurred" };
    }
}