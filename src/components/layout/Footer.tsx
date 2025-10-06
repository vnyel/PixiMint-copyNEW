import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/contexts/SessionContext";

const Footer = () => {
  const { user } = useSession();
  const location = useLocation();

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Mint NFT", path: "/nft-lab" },
    { name: "Gallery", path: "/gallery" },
    { name: "Marketplace", path: "/marketplace" },
    { name: "Pixi Tokens", path: "/pixi-tokens" },
    { name: "Leaderboard", path: "/leaderboard" }, // New link
  ];

  return (
    <footer className="p-6 text-center border-t border-border bg-background mt-auto shadow-sm flex flex-col items-center gap-6">
      <nav className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-lg font-sans">
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`text-foreground hover:text-primary transition-colors ${location.pathname === link.path ? "font-bold text-primary" : ""}`}
          >
            {link.name}
          </Link>
        ))}
        {user?.user_metadata?.username && (
          <Link
            to={`/profile/${user.user_metadata.username}`}
            className={`text-foreground hover:text-primary transition-colors ${location.pathname === `/profile/${user.user_metadata.username}` ? "font-bold text-primary" : ""}`}
          >
            My Profile
          </Link>
        )}
      </nav>
      <div className="w-full max-w-4xl flex justify-center">
        <img
          src="/Pump.fun (3).png"
          alt="Supported Platforms and Partners"
          className="h-auto"
        />
      </div>
    </footer>
  );
};

export default Footer;