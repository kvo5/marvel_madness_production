import Link from "next/link";
import CustomImage from "./Image"; // Alias the custom component for icons
import NextImage from "next/image"; // Import standard next/image for avatar
import Socket from "./Socket";
import Notification from "./Notification";
import { auth } from "@clerk/nextjs/server"; // Changed from currentUser
import { prisma } from "@/prisma"; // Corrected prisma import (named export)
import ReputationWidget from "./ReputationWidget"; // Added ReputationWidget import
import Logout from "@/components/Logout"; // Use path alias


const LeftBar = async () => {
  const { userId } = await auth(); // Await the auth() call

  let currentUserData = null;
  if (userId) {
    currentUserData = await prisma.user.findUnique({
      where: { id: userId },
      // Select necessary fields including reputation and the correct image field
      select: { id: true, reputation: true, username: true, img: true } // Removed publicMetadata, imageUrl; Added img
    });
  }
  const currentUserReputation = currentUserData?.reputation ?? 0;


  // Define menuList inside the component to access 'currentUserData'
  const menuList = [
     {
      id: 3, // Original ID for Homepage
      name: "Homepage",
      link: "/",
      icon: "home.svg",
    },
    // Remove Bookmarks entry
    // {
    //   id: 5, // Original ID for Bookmarks
    //   name: "Bookmarks",
    //   link: "/",
    //   icon: "bookmark.svg",
    // },
     {
      id: 7, // Original ID for Teams
      name: "Teams",
      link: "/teams",
      icon: "community.svg",
    },
    {
      id: 9, // Original ID for Profile
      name: "Profile",
      link: `/${currentUserData?.username || ''}`, // Dynamic link using currentUserData
      icon: "profile.svg",
    },
    {
      id: 10, // Original ID for Settings
      name: "Settings",
      link: "/settings", // Point to the new settings page
      icon: "settings.svg",
    },
  ];


  return (
    <div className="h-screen sticky top-0 flex flex-col justify-between pt-2 pb-8">
      {/* LOGO MENU BUTTON */}
      <div className="flex flex-col gap-4 text-lg items-center xxl:items-start">
        {/* LOGO */}
        <Link href="/" className="p-2 rounded-full hover:bg-[#181818] ">
          <CustomImage path="icons/logo.svg" alt="logo" w={210} h={210} />
        </Link>
        {/* MENU LIST */}
        <div className="flex flex-col gap-4">
          {menuList.map((item, i) => (
            <div key={item.id || i}>
              {i === 1 && userId && ( // Check userId instead of user
                <div>
                  <Notification />
                </div>
              )}
              <Link
                // Use currentUserData?.username for the profile link specifically
                href={item.name === "Profile" ? `/${currentUserData?.username || ''}` : item.link}
                className="p-2 rounded-full hover:bg-[#181818] flex items-center gap-4"
              >
                <CustomImage
                  path={`icons/${item.icon}`}
                  alt={item.name}
                  w={24}
                  h={24}
                />
                <span className="hidden xxl:inline">{item.name}</span>
              </Link>
            </div>
          ))}
        </div>
        {/* BUTTON */}
        <Link
          href="/compose/post"
          className="bg-white text-black rounded-full w-12 h-12 flex items-center justify-center xxl:hidden"
        >
          <CustomImage path="icons/post.svg" alt="new post" w={24} h={24} />
        </Link>
        <Link
          href="/compose/post"
          className="hidden xxl:block bg-white text-black rounded-full font-bold py-2 px-20"
        >
          Post
        </Link>
      </div>
      {userId && currentUserData && ( // Check userId and currentUserData
        <>
          <Socket />

          {/* REPUTATION WIDGET */}
          <div className="mb-4 px-2"> {/* Add margin below widget and some padding */}
            <ReputationWidget
              targetUserId={userId}
              initialReputation={currentUserReputation}
              initialVote={null} // Corrected prop name to initialVote
            />
          </div>

          {/* USER INFO */}
          <div className="flex items-center justify-between px-2"> {/* Added padding */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 relative rounded-full overflow-hidden">
                {/* Use standard next/image for the avatar */}
                <NextImage
                  // Use the 'img' field from the database, fallback to static image
                  src={currentUserData?.img || "/general/avatar.png"} // Use currentUserData.img
                  alt="User Avatar"
                  fill // Use fill to cover the container
                  className="object-cover" // Ensure image covers the area
                />
              </div>
              <div className="hidden xxl:flex flex-col">
                <span className="font-bold">{currentUserData?.username}</span> {/* Use currentUserData */}
                <span className="text-sm text-textGray">@{currentUserData?.username}</span> {/* Use currentUserData */}
              </div>
            </div>
            {/* <div className="hidden xxl:block cursor-pointer font-bold">...</div> */}
            {/* ADD LOGOUT */}
            <Logout/>
          </div>
        </>
      )}
    </div>
  );
};

export default LeftBar;