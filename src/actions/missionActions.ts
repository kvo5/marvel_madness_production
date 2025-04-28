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
            select: { reputation: true, membership: true, claimedTeamReward: true }, // Select the membership relation and claim flag
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.membership) { // Check if the user has a team membership
            throw new Error("Must be in a team to claim this reward.");
        }

        // The check for team membership ended on line 80

        // Check if the team reward has already been claimed
        if (user.claimedTeamReward) {
            throw new Error("Team reward already claimed.");
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                reputation: {
                    increment: TEAM_REWARD_AMOUNT,
                },
                claimedTeamReward: true, // Mark the reward as claimed
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