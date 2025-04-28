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
// PUT /api/teams/[teamId] - Update a team (e.g., name)
export async function PUT(
    request: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any
) {
    try {
        const authResult = await auth();
        const userId = authResult?.userId;
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId } = context.params;
        if (!teamId) {
            return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch (e) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { name, isWhitelisted } = body; // Extract name and isWhitelisted

        // --- Input Validation ---
        if (typeof name !== 'string' || !name.trim()) {
            return NextResponse.json({ error: 'Team name is required and must be a string' }, { status: 400 });
        }
        const trimmedName = name.trim();
        if (trimmedName.length > 50) { // Example length limit
            return NextResponse.json({ error: 'Team name cannot exceed 50 characters' }, { status: 400 });
        }
        // Validate isWhitelisted
        if (typeof isWhitelisted !== 'boolean') {
            return NextResponse.json({ error: 'isWhitelisted must be a boolean value' }, { status: 400 });
        }

        // --- Authorization & Team Check ---
        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { leaderId: true }, // Only need leaderId for the check
        });

        if (!team) {
            return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        // Check if the authenticated user is the leader
        if (team.leaderId !== userId) {
            return NextResponse.json({ error: 'Forbidden: Only the team leader can update the team' }, { status: 403 });
        }

        // --- Update Team ---
        const updatedTeam = await prisma.team.update({
            where: { id: teamId },
            data: {
                name: trimmedName,
                isWhitelisted: isWhitelisted, // Add isWhitelisted to the update data
            },
            // Optionally select fields to return - including isWhitelisted might be useful
            select: { id: true, name: true, leaderId: true, isWhitelisted: true, _count: { select: { members: true } } }
        });

        return NextResponse.json(updatedTeam, { status: 200 });

    } catch (error: any) { // Catch specific errors
        console.error(`Error updating team ${context.params.teamId}:`, error);

        // Handle Prisma unique constraint violation (e.g., team name already exists)
        if (error?.code === 'P2002' && error?.meta?.target?.includes('name')) {
             return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 }); // 409 Conflict
        }

        // Handle other potential Prisma errors
        if (error?.code === 'P2025') { // Record to update not found
             return NextResponse.json({ error: 'Team not found' }, { status: 404 });
        }

        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
