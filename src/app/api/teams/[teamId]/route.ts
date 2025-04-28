import { NextResponse, NextRequest } from 'next/server'; // Added NextRequest
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/prisma';

// DELETE /api/teams/[teamId] - Delete a team
export async function DELETE(
    request: NextRequest, // Corrected back to NextRequest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any
) {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = context.params; // Changed params to context.params

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
        console.error(`Error deleting team ${context.params.teamId}:`, error); // Changed params.teamId to context.params.teamId
        // Handle potential Prisma errors, e.g., record not found if deleted between check and delete
        if (error instanceof Error && 'code' in error && error.code === 'P2025') {
             return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}