'use client';

import { useAuth } from '@clerk/nextjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOptimistic, useState } from 'react';
import Image from 'next/image';

type VoteType = 'UPVOTE' | 'DOWNVOTE' | null;

interface ReputationWidgetProps {
  targetUserId: string;
  initialReputation: number;
  initialVote: { voteType: VoteType } | null;
}

interface OptimisticVoteUpdate {
  reputation: number;
  voteType: VoteType;
  pending: boolean;
}

// Placeholder for the actual API call function
async function submitReputationVote({ userId, voteType }: { userId: string; voteType: VoteType }) {
  const res = await fetch(`/api/users/${userId}/reputation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ voteType }),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to submit vote');
  }

  return res.json(); // Assuming the backend returns the new reputation or confirmation
}


export default function ReputationWidget({
  targetUserId,
  initialReputation,
  initialVote,
}: ReputationWidgetProps) {
  const { userId: loggedInUserId } = useAuth();
  const queryClient = useQueryClient();

  // Optimistic state using useOptimistic
  const [optimisticState, setOptimisticState] = useOptimistic<OptimisticVoteUpdate, VoteType>(
    {
      reputation: initialReputation,
      voteType: initialVote?.voteType ?? null,
      pending: false,
    },
    (currentState, newVoteType) => {
      // Calculate the change in reputation based on the current vote and the new vote
      let reputationChange = 0;
      const currentVote = currentState.voteType;

      if (newVoteType === 'UPVOTE') {
        if (currentVote === 'UPVOTE') {
          reputationChange = -1; // Undoing upvote
          newVoteType = null;
        } else if (currentVote === 'DOWNVOTE') {
          reputationChange = 2; // Changing downvote to upvote
        } else {
          reputationChange = 1; // New upvote
        }
      } else if (newVoteType === 'DOWNVOTE') {
        if (currentVote === 'DOWNVOTE') {
          reputationChange = 1; // Undoing downvote
          newVoteType = null;
        } else if (currentVote === 'UPVOTE') {
          reputationChange = -2; // Changing upvote to downvote
        } else {
          reputationChange = -1; // New downvote
        }
      }

      return {
        reputation: currentState.reputation + reputationChange,
        voteType: newVoteType,
        pending: true, // Mark as pending until mutation settles
      };
    }
  );

  const mutation = useMutation({
    mutationFn: submitReputationVote,
    onMutate: async (newVote) => {
        // Optimistically update the UI
        setOptimisticState(newVote.voteType);

        // Optionally: Cancel any outgoing refetches (so they don't overwrite our optimistic update)
        // await queryClient.cancelQueries({ queryKey: ['userProfile', targetUserId] }); // Adjust query key as needed

        // Optionally: Snapshot the previous value
        // const previousProfileData = queryClient.getQueryData(['userProfile', targetUserId]); // Adjust query key

        // Return context object with snapshotted value
        // return { previousProfileData };
    },
    onError: (err, newVote, context) => {
        console.error("Vote submission failed:", err);
        // Optionally: Rollback to the previous value using context
        // if (context?.previousProfileData) {
        //   queryClient.setQueryData(['userProfile', targetUserId], context.previousProfileData); // Adjust query key
        // }
        // The useOptimistic hook handles reverting the state automatically on error if not settled
    },
    onSuccess: (data, newVote) => {
        // Invalidate and refetch relevant queries after success
        // queryClient.invalidateQueries({ queryKey: ['userProfile', targetUserId] }); // Adjust query key
        // Or directly update the cache if the backend returns the new state
        // queryClient.setQueryData(['userProfile', targetUserId], (oldData) => { ... update data ... });
        console.log("Vote submitted successfully:", data);
    },
    onSettled: () => {
        // This runs after success or error
        // If using useOptimistic, you might not need manual reverting here,
        // but you could potentially reset the 'pending' state if needed, though useOptimistic handles the core state revert.
    },
  });

  const handleVote = (voteType: 'UPVOTE' | 'DOWNVOTE') => {
    if (optimisticState.pending || targetUserId === loggedInUserId) return; // Prevent multiple clicks while pending or voting on self

    // Determine the actual vote type to send (null if unvoting)
    let finalVoteType: VoteType = voteType;
    if (
        (voteType === 'UPVOTE' && optimisticState.voteType === 'UPVOTE') ||
        (voteType === 'DOWNVOTE' && optimisticState.voteType === 'DOWNVOTE')
    ) {
        finalVoteType = null; // Clicking the same button again means unvoting
    }


    // Update optimistic state and trigger mutation
    // setOptimisticState(finalVoteType); // useMutation's onMutate handles this now
    mutation.mutate({ userId: targetUserId, voteType: finalVoteType });
  };

  const isOwnProfile = targetUserId === loggedInUserId;
  const isUpvoted = optimisticState.voteType === 'UPVOTE';
  const isDownvoted = optimisticState.voteType === 'DOWNVOTE';

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <button
        onClick={() => handleVote('UPVOTE')}
        disabled={isOwnProfile || mutation.isPending}
        className={`p-1 rounded ${isUpvoted ? 'bg-green-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        aria-label="Upvote"
      >
        {/* Up Arrow SVG or Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l5 5a1 1 0 01-1.414 1.414L11 6.414V16a1 1 0 11-2 0V6.414L5.707 9.707a1 1 0 01-1.414-1.414l5-5A1 1 0 0110 3z" clipRule="evenodd" />
        </svg>
      </button>

      <span className="font-semibold text-lg text-gray-800 dark:text-gray-200 min-w-[30px] text-center">
        {optimisticState.reputation}
      </span>

      <button
        onClick={() => handleVote('DOWNVOTE')}
        disabled={isOwnProfile || mutation.isPending}
        className={`p-1 rounded ${isDownvoted ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
        aria-label="Downvote"
      >
        {/* Down Arrow SVG or Icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L9 13.586V4a1 1 0 112 0v9.586l3.293-3.293a1 1 0 011.414 1.414l-5 5A1 1 0 0110 17z" clipRule="evenodd" />
        </svg>
      </button>
       {mutation.isPending && <span className="text-xs text-gray-500">Voting...</span>}
       {mutation.isError && <span className="text-xs text-red-500">Error!</span>}
    </div>
  );
}