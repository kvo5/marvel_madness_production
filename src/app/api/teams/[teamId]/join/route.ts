import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/prisma';

const MAX_TEAM_MEMBERS = 6;

// PUT /api/teams/[teamId]/join - Join a team
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function PUT(request: NextRequest, context: any) {
    const { userId } = await auth(); // Await the auth() call
    const user = await currentUser();

    if (!userId || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId } = context.params;

    if (!teamId || typeof teamId !== 'string') {
        return NextResponse.json({ error: 'Invalid Team ID' }, { status: 400 });
    }

    try {
        // Check if team exists and get member count
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            include: { _count: { select: { members: true } } },
        });

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Check if user is already in a team by checking TeamMember
        const existingMembership = await prisma.teamMember.findUnique({
            where: { userId: userId }, // Use the unique constraint name if needed, but userId should work
        });

        if (existingMembership) {
            // User is already a member of a team (potentially this one or another)
            if (existingMembership.teamId === teamId) {
                 return NextResponse.json({ error: 'User already in this team' }, { status: 400 });
            } else {
                 return NextResponse.json({ error: 'User already in another team' }, { status: 400 });
            }
        }

        // Check if team is full
        if (team._count.members >= MAX_TEAM_MEMBERS) {
            return NextResponse.json({ error: 'Team is full' }, { status: 400 });
        }

        // Add user to the team by creating a TeamMember record
        const newMembership = await prisma.teamMember.create({
            data: {
                userId: userId,
                teamId: teamId,
            },
        });

        // Return confirmation including the new membership details
        return NextResponse.json({ message: 'Successfully joined team', membership: newMembership });
    } catch (error) {
        console.error('Error joining team:', error);
        // Consider more specific error handling based on Prisma errors if needed
        return NextResponse.json({ error: 'Failed to join team due to server error' }, { status: 500 });
    }
}