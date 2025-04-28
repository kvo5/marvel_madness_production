"use client"; // Required for react-countdown

import React, { useState, useEffect } from "react";
import Countdown, { CountdownRenderProps } from "react-countdown";
import { useUser } from "@clerk/nextjs";

// Renderer callback with condition
const renderer = ({ hours, minutes, seconds, completed }: CountdownRenderProps) => {
  if (completed) {
    // Render a completed state
    return <span>REDEEM!</span>; // Or potentially enable the button
  } else {
    // Render a countdown
    return (
      <span>
        {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:
        {String(seconds).padStart(2, "0")}
      </span>
    );
  }
};

const MissionsWidget = () => {
  const { user, isLoaded } = useUser();
  const [points, setPoints] = useState<number>(0); // Default to 0
  const [isLoadingPoints, setIsLoadingPoints] = useState(true);

  useEffect(() => {
    // Fetch points only if the user is loaded and exists (logged in)
    if (isLoaded && user) {
      const fetchPoints = async () => {
        setIsLoadingPoints(true);
        try {
          const response = await fetch("/api/users/me/points");
          if (!response.ok) {
            throw new Error("Failed to fetch points");
          }
          const data = await response.json();
          setPoints(data.points ?? 0); // Set points from API, default to 0 if null/undefined
        } catch (error) {
          console.error("Error fetching points:", error);
          setPoints(0); // Default to 0 on error
        } finally {
          setIsLoadingPoints(false);
        }
      };

      fetchPoints();
    } else if (isLoaded && !user) {
      // User is loaded but not logged in, set points to 0 and stop loading
      setPoints(0);
      setIsLoadingPoints(false);
    }
    // Dependency array: run effect when Clerk loading state or user object changes
  }, [isLoaded, user]);


  const dailyTarget = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
  const weeklyTarget = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now

  return (
    <div className="p-4 rounded-2xl border-[1px] border-borderGray flex flex-col gap-4">
      <h1 className="text-xl font-bold text-textGrayLight text-center mb-2">
        Missions
      </h1>

      <div className="flex flex-col gap-3 items-center">
        <button
          className="bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg w-full disabled:opacity-70 disabled:cursor-not-allowed"
          disabled // Initially disabled
        >
          <Countdown date={dailyTarget} renderer={renderer} />
        </button>

        <button
          className="bg-yellow-400 text-black font-semibold py-2 px-4 rounded-lg w-full disabled:opacity-70 disabled:cursor-not-allowed"
          disabled // Initially disabled
        >
          <Countdown date={weeklyTarget} renderer={renderer} />
        </button>
      </div>

      <p className="text-textGray text-center mt-4">
        Current Points: {isLoadingPoints ? "[Loading...]" : points ?? 0}
      </p>
    </div>
  );
};

export default MissionsWidget;