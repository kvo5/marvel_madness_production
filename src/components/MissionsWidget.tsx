"use client";

import { useState, useTransition } from "react";
import { claimDailyReward, claimTeamReward } from "../actions/missionActions";

const MissionsWidget = () => {
  const [isPending, startTransition] = useTransition();
  const [dailyMessage, setDailyMessage] = useState<string | null>(null);
  const [teamMessage, setTeamMessage] = useState<string | null>(null);
  const [isDailyClaimed, setIsDailyClaimed] = useState(false); // Assume not claimed initially

  const handleClaimDaily = () => {
    startTransition(async () => {
      setDailyMessage(null); // Clear previous message
      try {
        const result = await claimDailyReward();
        if (result.success) {
          setDailyMessage("Daily reward claimed! +10 Reputation.");
          setIsDailyClaimed(true); // Disable button after successful claim
        } else {
          setDailyMessage(result.error || "Failed to claim daily reward.");
          // Optionally disable based on specific errors, e.g., already claimed
          if (result.error?.includes("already claimed")) {
            setIsDailyClaimed(true);
          }
        }
      } catch (error) {
        console.error("Error claiming daily reward:", error);
        setDailyMessage("An unexpected error occurred.");
      }
    });
  };

  const handleClaimTeam = () => {
    startTransition(async () => {
      setTeamMessage(null); // Clear previous message
      try {
        const result = await claimTeamReward();
        if (result.success) {
          setTeamMessage("Team reward claimed! +20 Reputation.");
          // Team reward might be claimable multiple times or based on server logic,
          // so we don't disable it permanently here unless the action confirms it.
        } else {
          setTeamMessage(result.error || "Failed to claim team reward.");
        }
      } catch (error) {
        console.error("Error claiming team reward:", error);
        setTeamMessage("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="bg-neutral-800 rounded-lg p-4 flex flex-col gap-4 text-neutral-100">
      <h2 className="text-xl font-semibold mb-4">Missions</h2>

      {/* Daily Check-in */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-neutral-200">Daily Check-in</h3>
        <p className="text-xs text-neutral-400">
          Claim 10 reputation points every 24 hours.
        </p>
        <button
          onClick={handleClaimDaily}
          disabled={isPending || isDailyClaimed}
          className="bg-blue-600 text-white text-sm font-semibold rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isPending ? "Claiming..." : "Claim Daily Reward"}
        </button>
        {dailyMessage && (
          <p
            className={`text-xs mt-1 ${
              dailyMessage.includes("claimed") ? "text-green-600" : "text-red-600"
            }`}
          >
            {dailyMessage}
          </p>
        )}
      </div>

      {/* Team Player */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-neutral-200">Team Player</h3>
        <p className="text-xs text-neutral-400">
          Claim 20 reputation points for being in a team.
        </p>
        <button
          onClick={handleClaimTeam}
          disabled={isPending} // Only disable during transition, server handles eligibility
          className="bg-blue-600 text-white text-sm font-semibold rounded-full px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {isPending ? "Claiming..." : "Claim Team Reward"}
        </button>
        {teamMessage && (
          <p
            className={`text-xs mt-1 ${
              teamMessage.includes("claimed") ? "text-green-600" : "text-red-600"
            }`}
          >
            {teamMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default MissionsWidget;