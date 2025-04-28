import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/prisma';

// GET /api/users/me/team - Get the current user's team status and details
export async function GET(request: Request) {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch user with their potential team leadership or membership
        const userWithTeam = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                // Check if the user leads a team
                ledTeam: {
                    include: {
                        leader: { // Include leader details
                            select: { id: true, username: true, img: true, displayName: true },
                        },
                        members: { // Include all members of the led team
                            include: {
                                user: {
                                    select: { id: true, username: true, img: true, displayName: true },
                                },
                            },
                            orderBy: { createdAt: 'asc' }
                        },
                    },
                },
                // Check if the user is a member of a team
                membership: {
                    include: {
                        team: { // Include the team details if they are a member
                            include: {
                                leader: { // Include leader details
                                    select: { id: true, username: true, img: true, displayName: true },
                                },
                                members: { // Include all members of the team they belong to
                                    include: {
                                        user: {
                                            select: { id: true, username: true, img: true, displayName: true },
                                        },
                                    },
                                    orderBy: { createdAt: 'asc' }
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!userWithTeam) {
            // This case should ideally not happen if the user is authenticated
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Determine the team to return: the one they lead or the one they are a member of
        const team = userWithTeam.ledTeam ?? userWithTeam.membership?.team ?? null;

        // Return the team details or null if not part of any team
        return NextResponse.json(team);

    } catch (error) {
        console.error("Error fetching user's team:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}