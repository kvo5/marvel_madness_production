import Feed from "@/components/Feed";
import FollowButton from "@/components/FollowButton";
import ReputationWidget from "@/components/ReputationWidget"; // Import ReputationWidget
// Keep custom Image component for cover for now
// Remove custom Image import if no longer needed
// import Image from "@/components/Image";
// Import standard next/image for avatar and cover
import NextImage from "next/image";
import { prisma } from "@/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { notFound } from "next/navigation";

const UserPage = async ({
  params,
}: {
  params: Promise<{ username: string }>;
}) => {
  const { userId } = await auth();

  const username = (await params).username;

  const user = await prisma.user.findUnique({
    where: { username: username },
    // Select role and rank explicitly, along with other needed fields
    select: {
      id: true,
      // email: true, // Not needed on profile page
      username: true,
      displayName: true,
      bio: true,
      location: true,
      role: true, // Fetch role
      rank: true, // Fetch rank
      img: true,
      cover: true,
      createdAt: true,
      // updatedAt: true, // Not needed on profile page
      reputation: true, // Fetch reputation score
      _count: { select: { followers: true, followings: true } },
      followings: userId ? { where: { followerId: userId } } : undefined,
    }
  });

  // Fetch the current logged-in user's vote for this target user
  let currentUserVote = null;
  if (userId && user) {
    currentUserVote = await prisma.reputationVote.findUnique({
      where: {
        voterId_targetUserId: {
          voterId: userId,
          targetUserId: user.id,
        },
      },
      select: { // Select only the necessary field
        voteType: true, // Correct field name
      }
    });
  }

  console.log(userId);
  if (!user) return notFound();

  return (
    <div className="">
      {/* PROFILE TITLE */}
      <div className="flex items-center gap-8 sticky top-0 backdrop-blur-md p-4 z-10 bg-[#00000084]">
        <Link href="/">
          {/* Use standard img tag */}
          <img src="/icons/back.svg" alt="back" width={24} height={24} />
        </Link>
        <h1 className="font-bold text-lg">{user.displayName}</h1>
      </div>
      {/* INFO */}
      <div className="">
        {/* COVER & AVATAR CONTAINER */}
        <div className="relative w-full -z-10">
          {/* COVER */}
          <div className="w-full aspect-[3/1] relative">
            {/* Use standard NextImage for cover */}
            <NextImage
              src={user.cover || "/general/noCover.png"} // Use src prop with URL from DB
              alt="Cover image"
              fill // Use fill to cover the container
              className="object-cover" // Ensure image covers the area
              priority // Add priority for LCP element
            />
          </div>
          {/* AVATAR */}
          <div className="w-1/5 aspect-square rounded-full overflow-hidden border-4 border-black bg-gray-300 absolute left-4 -translate-y-1/2">
            {/* Use standard NextImage for avatar */}
            <NextImage
              src={user.img || "/general/noAvatar.png"} // Use src prop with URL from DB
              alt="User avatar"
              fill // Use fill to cover the container
              className="object-cover" // Ensure image covers the area
            />

          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-4 p-2"> {/* Increased gap */}
          {userId && (
            <>
              {/* Reputation Widget - Moved and scaled */}
              <div className="scale-90">
                <ReputationWidget
                  targetUserId={user.id}
                  initialReputation={user.reputation}
                  initialVote={currentUserVote}
                />
              </div>
              {/* Follow Button */}
              <FollowButton
                userId={user.id}
                isFollowed={!!user.followings.length}
                username={username}
              />
            </>
          )}
        </div>
        {/* USER DETAILS */}
        <div className="p-4 flex flex-col gap-2">
          {/* USERNAME & HANDLE */}
          <div className="">
            <h1 className="text-2xl font-bold">{user.displayName}</h1>
            <span className="text-textGray text-sm">@{user.username}</span>
          </div>
          {user.bio && <p className="mb-2">{user.bio}</p>}
          {/* ROLE & RANK */}
          <div className="flex gap-4 text-textGray text-[15px] mb-2">
            {user.role && (
              <div className="flex items-center gap-1">
                {/* Use standard img tag for local public assets */}
                <img
                  src={`/ranks/${user.role}.svg`} // Dynamic Path
                  alt={user.role || 'Role'} // Dynamic Alt
                  width={16}
                  height={16}
                  className="object-contain"
                />
                <span className="capitalize">{user.role.toLowerCase()}</span>
              </div>
            )}
            {user.rank && (
              <div className="flex items-center gap-1">
                 {/* Use standard img tag for local public assets */}
                <img
                  // Extract rank name, format to match filename case (e.g., "Grandmaster" from "GRANDMASTER III")
                  src={`/ranks/${user.rank}.svg`} // Dynamic Path
                  alt={user.rank || 'Rank'} // Dynamic Alt
                  width={16}
                  height={16}
                  className="object-contain"
                />
                <span>{user.rank}</span>
              </div>
            )}
          </div>
          {/* LOCATION & DATE */}
          <div className="flex gap-4 text-textGray text-[15px]">
            {user.location && (
              <div className="flex items-center gap-2">
                 {/* Use standard img tag */}
                <img src="/icons/userLocation.svg" alt="location" width={20} height={20} />
                <span>{user.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
               {/* Use standard img tag */}
              <img src="/icons/date.svg" alt="date" width={20} height={20} />
              <span>
                Joined{" "}
                {new Date(user.createdAt.toString()).toLocaleDateString(
                  "en-US",
                  { month: "long", year: "numeric" }
                )}
              </span>
            </div>
          </div>
          {/* FOLLOWINGS & FOLLOWERS */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold">{user._count.followers}</span>
              <span className="text-textGray text-[15px]">Following</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{user._count.followings}</span>
              <span className="text-textGray text-[15px]">followers</span>
            </div>
          </div>
          {/* ReputationWidget moved near FollowButton */}
        </div>
      </div>
      {/* FEED */}
      <Feed userProfileId={user.id} />
    </div>
  );
};

export default UserPage;