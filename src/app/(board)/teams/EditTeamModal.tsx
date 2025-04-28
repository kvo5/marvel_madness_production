// src/app/(board)/teams/EditTeamModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

// Re-using Team type - consider shared types file
interface Team {
    id: string;
    name: string;
    leaderId: string;
    isWhitelisted: boolean; // Added for whitelist status
    whitelist: string[]; // JSON in DB, parsed as array here - Note: This seems unused for the boolean toggle logic
    // Add other fields if needed by the modal or API
}

interface EditTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team; // Pass the current team data
}

const EditTeamModal: React.FC<EditTeamModalProps> = ({ isOpen, onClose, team }) => {
    const queryClient = useQueryClient();
    const [teamName, setTeamName] = useState(team.name);
    const [isWhitelisted, setIsWhitelisted] = useState(team.isWhitelisted); // State for whitelist toggle
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens with new team data or closes
    useEffect(() => {
        if (isOpen) {
            setTeamName(team.name);
            setIsWhitelisted(team.isWhitelisted); // Reset whitelist state
            setError(null);
        }
    }, [isOpen, team]);

    const editTeamMutation = useMutation({
        mutationFn: async (updatedData: { name: string; isWhitelisted: boolean }) => { // Updated type
            // Actual API call to the PUT endpoint
            const { data } = await axios.put(`/api/teams/${team.id}`, updatedData);
            return data; // Return the response data (updated team)
        },
        onSuccess: (data) => {
            setError(null);
            // Invalidate relevant queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['teams'] }); // Invalidate list/search
            queryClient.invalidateQueries({ queryKey: ['userTeamStatus'] }); // Invalidate user status
            queryClient.invalidateQueries({ queryKey: ['teams', team.id] }); // Invalidate specific team details if used elsewhere
            onClose(); // Close modal on success
            alert('Team updated successfully!'); // Placeholder feedback
        },
        onError: (err: AxiosError | Error) => {
            console.error("Error updating team:", err);
            if (axios.isAxiosError(err) && err.response?.data?.error) {
                setError(err.response.data.error);
            } else {
                setError(err.message || 'Failed to update team. Please try again.');
            }
        },
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!teamName.trim()) {
            setError("Team name cannot be empty.");
            return;
        }
        // Basic validation example (add more as needed)
        if (teamName.length > 50) {
             setError("Team name cannot exceed 50 characters.");
             return;
        }

        const updatedData: { name: string; isWhitelisted: boolean } = { // Include isWhitelisted
            name: teamName.trim(),
            isWhitelisted: isWhitelisted,
        };

        editTeamMutation.mutate(updatedData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-secondary rounded-lg shadow-xl p-6 w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4 text-textPrimary">Edit Team</h2>
                <form onSubmit={handleSave}>
                    {/* Team Name Input */}
                    <div className="mb-4">
                        <label htmlFor="teamName" className="block text-sm font-medium text-textSecondary mb-1">
                            Team Name
                        </label>
                        <input
                            id="teamName"
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                            maxLength={50} // Example constraint
                            className="w-full p-2 border border-border rounded bg-input text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={editTeamMutation.isPending}
                        />
                    </div>

                    {/* Whitelist Toggle */}
                    <div className="mb-4 flex items-center">
                        <input
                            id="isWhitelisted"
                            type="checkbox"
                            checked={isWhitelisted}
                            onChange={(e) => setIsWhitelisted(e.target.checked)}
                            disabled={editTeamMutation.isPending}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-2"
                        />
                        <label htmlFor="isWhitelisted" className="text-sm font-medium text-textSecondary">
                            Team is Whitelisted (Allows joining without invite)
                        </label>
                    </div>


                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={editTeamMutation.isPending}
                            className="px-4 py-2 rounded font-semibold border border-border text-textSecondary hover:bg-hover"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editTeamMutation.isPending || !teamName.trim()}
                            className="px-4 py-2 rounded font-semibold bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {editTeamMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTeamModal;