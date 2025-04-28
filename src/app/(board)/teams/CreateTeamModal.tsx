// src/app/(board)/teams/CreateTeamModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios, { AxiosError } from 'axios';

interface CreateTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CreateTeamPayload {
    name: string;
    // Whitelist will be handled by the API based on the name for now,
    // or we could add a field here if the API expects it.
    // For simplicity, let's assume the API initializes it or we add it later.
}

const CreateTeamModal: React.FC<CreateTeamModalProps> = ({ isOpen, onClose }) => {
    const queryClient = useQueryClient();
    const [teamName, setTeamName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const mutation = useMutation({
        mutationFn: (newTeam: CreateTeamPayload) => axios.post('/api/teams', newTeam),
        onSuccess: () => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ['userTeamStatus'] });
            queryClient.invalidateQueries({ queryKey: ['teams'] }); // Invalidate the infinite list
            setError(null);
            setTeamName(''); // Reset form
            onClose(); // Close modal on success
            alert('Team created successfully!');
        },
        onError: (error: AxiosError<{ error?: string }>) => {
            console.error("Error creating team:", error);
            const errorMessage = error.response?.data?.error || error.message || 'Failed to create team.';
            setError(errorMessage);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null); // Clear previous errors
        if (!teamName.trim()) {
            setError('Team name cannot be empty.');
            return;
        }
        if (teamName.length < 3 || teamName.length > 30) {
             setError('Team name must be between 3 and 30 characters.');
             return;
        }
        mutation.mutate({ name: teamName.trim() });
    };

    // Reset state when modal is closed/opened
    useEffect(() => {
        if (!isOpen) {
            setTeamName('');
            setError(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-secondary rounded-lg shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-textPrimary">Create New Team</h2>
                    <button onClick={onClose} className="text-textSecondary hover:text-textPrimary">&times;</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="teamName" className="block text-sm font-medium text-textSecondary mb-1">
                            Team Name
                        </label>
                        <input
                            type="text"
                            id="teamName"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            required
                            minLength={3}
                            maxLength={30}
                            className="w-full p-2 border border-border rounded bg-input text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter team name (3-30 characters)"
                        />
                    </div>

                    {/* Optional: Whitelist Input - Keeping it simple for now */}
                    {/* <div>
                        <label htmlFor="whitelist" className="block text-sm font-medium text-textSecondary mb-1">
                            Initial Whitelist (Optional, comma-separated usernames)
                        </label>
                        <textarea
                            id="whitelist"
                            // value={whitelistInput}
                            // onChange={(e) => setWhitelistInput(e.target.value)}
                            rows={3}
                            className="w-full p-2 border border-border rounded bg-input text-textPrimary focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., user1, anotheruser, player3"
                        />
                    </div> */}

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded border border-border text-textSecondary hover:bg-border"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600 disabled:bg-gray-400"
                        >
                            {mutation.isPending ? 'Creating...' : 'Create Team'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTeamModal;