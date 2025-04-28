import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/prisma';

const MAX_TEAM_MEMBERS = 6;

// PUT /api/teams/[teamId]/join - Join a team
export async function PUT(
    request: Request, // Keep request parameter even if unused for now
    context: { params: { teamId: string } }
) {
    const { teamId } = context.params; // Use context
    try {
        const user = await currentUser(); // Need user details (username) for whitelist check
        const userId = user?.id;

        if (!userId || !user?.username) {
            return NextResponse.json({ error: 'Unauthorized or username missing' }, { status: 401 });
        }

        // No longer needed: const { teamId } = params;

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        // 1. Check if user is already on a team (either member or leader)
        const existingUserTeam = await prisma.user.findUnique({
            where: { id: userId },
            include: { ledTeam: true, membership: true },
        });

        if (existingUserTeam?.ledTeam || existingUserTeam?.membership) {
            return NextResponse.json({ error: 'User is already part of a team' }, { status: 400 });
        }

        // 2. Fetch the target team and check conditions in a transaction for consistency
        const result = await prisma.$transaction(async (tx) => {
            const team = await tx.team.findUnique({
                where: { id: teamId },
                include: {
                    _count: { // Count members efficiently
                        select: { members: true },
                    },
                    members: { // Fetch members to check if user is already (redundant but safe)
                        where: { userId: userId },
                        select: { id: true }
                    }
                },
            });

            if (!team) {
                return { status: 404, error: 'Team not found' };
            }

            // User is leader? (Should have been caught by earlier check, but good safeguard)
            if (team.leaderId === userId) {
                 // Leader is implicitly joined via the initial POST /teams creation
                 // Or decide if this endpoint should handle a leader re-joining (unlikely scenario)
                return { status: 200, message: 'Leader is already part of the team' };
            }

            // Check if user is already a member (again, redundant safeguard)
            if (team.members.length > 0) {
                 return { status: 400, error: 'User is already a member of this team' };
            }

            // 3. Check if team is full
            if (team._count.members >= MAX_TEAM_MEMBERS) {
                return { status: 400, error: `Team is full (max ${MAX_TEAM_MEMBERS} members)` };
            }

            // 4. Check whitelist
            let whitelist: string[] = [];
            try {
                // Safely parse the JSON whitelist
                const parsedWhitelist = JSON.parse(team.whitelist as string);
                if (Array.isArray(parsedWhitelist) && parsedWhitelist.every(item => typeof item === 'string')) {
                    whitelist = parsedWhitelist;
                } else {
                    console.warn(`Team ${teamId} has invalid whitelist format: ${team.whitelist}`);
                    // Decide behavior: fail open (allow join) or closed (deny join)? Let's deny.
                     return { status: 500, error: 'Internal error processing team whitelist' };
                }
            } catch (parseError) {
                console.error(`Error parsing whitelist for team ${teamId}:`, parseError);
                 return { status: 500, error: 'Internal error processing team whitelist' };
            }

            if (!whitelist.includes(user.username!)) { // username is checked for null earlier
                return { status: 403, error: 'User not on team whitelist' };
            }

            // 5. Create the TeamMember record
            await tx.teamMember.create({
                data: {
                    teamId: teamId,
                    userId: userId,
                },
            });

            return { status: 200, message: 'Successfully joined team' };
        });

        // Return the response based on the transaction outcome
        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: result.status });
        } else {
            return NextResponse.json({ message: result.message }, { status: result.status });
        }

    } catch (error) {
        console.error(`Error joining team ${context.params.teamId}:`, error); // Use context
        // Handle potential Prisma errors like unique constraint violation if checks fail
        if (error instanceof Error && 'code' in error && error.code === 'P2002') { // Unique constraint failed (e.g., user already member)
             return NextResponse.json({ error: 'User is already part of a team' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}