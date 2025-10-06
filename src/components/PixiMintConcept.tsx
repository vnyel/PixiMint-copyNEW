import React from "react";
import { Sparkles, Image, Gem, Users, MessageSquare, Fingerprint } from "lucide-react";

const PixiMintConcept = () => {
  return (
    <section className="w-full max-w-4xl mx-auto mt-12 p-8 bg-card border border-border rounded-xl shadow-xl text-card-foreground font-sans">
      <h3 className="text-4xl font-pixel text-primary mb-8 text-center">
        The PixiMint Vision: A New Era for NFTs
      </h3>

      <div className="space-y-8 text-lg leading-relaxed">
        <p>
          Welcome to PixiMint, where the digital art world meets nostalgic 8-bit aesthetics and a truly unique minting experience. Unlike traditional NFT projects, PixiMint empowers *you* to be the creator, transforming your personal images into one-of-a-kind pixelated masterpieces.
        </p>

        <div className="bg-muted p-6 rounded-lg border border-border shadow-inner space-y-4">
          <h4 className="text-2xl font-pixel text-primary flex items-center gap-3 mb-4">
            <Sparkles className="h-7 w-7 text-yellow-400" /> How PixiMint Works: Your Creative Journey
          </h4>
          <p>
            The process is simple, engaging, and entirely in your hands:
          </p>
          <ul className="list-disc list-inside space-y-2 pl-4">
            <li className="flex items-start gap-2">
              <Image className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <strong>Upload Your Image:</strong> Start by uploading any image you desire. This could be a cherished photo, a piece of digital art, or anything that inspires you.
            </li>
            <li className="flex items-start gap-2">
              <Gem className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <strong>8-Bit Transformation:</strong> Our unique algorithm instantly pixelates your image, giving it a distinct 8-bit retro charm. This ensures every NFT in the PixiMint collection shares a cohesive aesthetic.
            </li>
            <li className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <strong>Algorithmic Rarity & Pricing:</strong> Once pixelated, your NFT is assigned a rarity tier (Common, Uncommon, Rare, Epic, Legendary) and a corresponding price in SOL, all determined by a transparent algorithm. This adds an exciting element of chance to each mint!
            </li>
            <li className="flex items-start gap-2">
              <Fingerprint className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <strong>Mint & Own:</strong> With a click, your unique PixiNFT is minted and added to the limited 10,000-piece collection, becoming a verifiable asset on the blockchain.
            </li>
          </ul>
        </div>

        <div className="space-y-4">
          <h4 className="text-2xl font-pixel text-primary mb-4 text-center">
            PixiMint vs. Traditional NFT Mints: A Paradigm Shift
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-accent p-6 rounded-lg border border-border shadow-md space-y-3">
              <h5 className="text-xl font-pixel text-accent-foreground mb-3">Traditional NFT Mints</h5>
              <ul className="list-disc list-inside space-y-2 text-base">
                <li>Often involve pre-generated collections (e.g., 10,000 PFP avatars).</li>
                <li>"Blind mints" where you don't know what you get until after purchase.</li>
                <li>Focus is typically on the artist or project team's vision.</li>
                <li>Limited direct creative input from the community on individual NFTs.</li>
                <li>Rarity is often based on pre-defined traits and distribution.</li>
              </ul>
            </div>
            <div className="bg-primary p-6 rounded-lg border border-primary shadow-md space-y-3 text-primary-foreground">
              <h5 className="text-xl font-pixel text-primary-foreground mb-3">The PixiMint Difference</h5>
              <ul className="list-disc list-inside space-y-2 text-base">
                <li><strong>User-Generated Content:</strong> You bring the art, we pixelate it.</li>
                <li><strong>On-Demand Minting:</strong> Mint your NFT when you're ready, with an image you chose.</li>
                <li><strong>Personal Connection:</strong> Every NFT has a story, a personal touch from its creator.</li>
                <li><strong>Algorithmic Rarity:</strong> A fair and exciting system determines your NFT's tier and value.</li>
                <li><strong>Community-Driven Collection:</strong> The entire 10,000-piece collection is built by its members.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-muted p-6 rounded-lg border border-border shadow-inner space-y-4">
          <h4 className="text-2xl font-pixel text-primary flex items-center gap-3 mb-4">
            <Users className="h-7 w-7 text-blue-500" /> Join the PixiMint Community
          </h4>
          <p>
            Beyond minting, PixiMint is a vibrant community. Explore the gallery, follow other minters, and engage in direct messages. Track your collection's worth, climb the leaderboard, and showcase your unique 8-bit creations.
          </p>
          <p>
            With a strict limit of 10,000 NFTs, every PixiMint is a rare piece of digital history. Be part of this groundbreaking collection and mint your legacy today!
          </p>
        </div>
      </div>
    </section>
  );
};

export default PixiMintConcept;