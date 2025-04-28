import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/prisma';

// DELETE /api/teams/[teamId] - Delete a team
export async function DELETE(
    request: Request,
    { params }: { params: { teamId: string } }
) {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = params;

        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        // Find the team first to check ownership
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { leaderId: true }, // Only need leaderId for the check
        });

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Check if the authenticated user is the leader
        if (team.leaderId !== userId) {
            return NextResponse.json({ error: 'Forbidden: Only the team leader can delete the team' }, { status: 403 });
        }

        // Delete the team (related TeamMember records should cascade delete)
        await prisma.team.delete({
            where: { id: teamId },
        });

        return new NextResponse(null, { status: 204 }); // No Content

    } catch (error) {
        console.error(`Error deleting team ${params.teamId}:`, error);
        // Handle potential Prisma errors, e.g., record not found if deleted between check and delete
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
             return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}