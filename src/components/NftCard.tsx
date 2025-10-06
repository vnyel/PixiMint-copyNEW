import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Gem, ImageOff, Heart } from "lucide-react"; // Changed Diamond to Gem
import { NFT, Profile } from "@/types/nft";
import VerifiedBadge from "@/components/VerifiedBadge";
import NftDetailDialog from "./NftDetailDialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";

interface NftCardProps {
  nft: NFT;
  creatorUsername: string;
  creatorIsVerified?: boolean;
  creatorProfile?: Profile;
  solanaPrice: number | null;
  onLikeToggle: (nftId: string, isLiked: boolean) => void;
}

const getDiamondColorClass = (color: string) => {
  const lowerCaseColor = color.toLowerCase();
  switch (lowerCaseColor) {
    case 'orange': return 'text-orange-500';
    case 'purple': return 'text-purple-500';
    case 'blue': return 'text-blue-500';
    case 'green': return 'text-green-500';
    case 'gray': return 'text-gray-500';
    default: return 'text-gray-500';
  }
};

const getRarityGlowClasses = (color: string) => {
  const lowerCaseColor = color.toLowerCase();
  switch (lowerCaseColor) {
    case 'orange': return 'shadow-orange-glow';
    case 'purple': return 'shadow-purple-glow';
    case 'blue': return 'shadow-blue-glow';
    case 'green': return 'shadow-green-glow';
    case 'gray': return 'shadow-gray-glow';
    default: return 'shadow-gray-glow';
  }
};

const getBorderColorClass = (rarityColor: string) => {
  const lowerCaseColor = rarityColor.toLowerCase();
  switch (lowerCaseColor) {
    case 'orange': return 'border-orange-500';
    case 'purple': return 'border-purple-500';
    case 'blue': return 'border-blue-500';
    case 'green': return 'border-green-500';
    case 'gray': return 'border-gray-500';
    default: return 'border-border';
  }
};

const NftCard = ({ nft, creatorUsername, creatorIsVerified, creatorProfile, solanaPrice, onLikeToggle }: NftCardProps) => {
  const { user: currentUser } = useSession();
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTransformStyle, setCardTransformStyle] = useState({});
  const [shadowStyle, setShadowStyle] = useState({});
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const handleImageError = () => {
    console.error("Error loading NFT image:", nft.image_url);
    setImageError(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const { clientX, clientY } = e;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();

    const centerX = left + width / 2;
    const centerY = top + height / 2;

    const offsetX = (clientX - centerX) / (width / 2); // -1 to 1
    const offsetY = (clientY - centerY) / (height / 2); // -1 to 1

    const rotateX = -offsetY * 10; // Max 10 degrees rotation
    const rotateY = offsetX * 10;  // Max 10 degrees rotation

    const cardTranslateX = offsetX * 5; // Max 5px translation for the card
    const cardTranslateY = offsetY * 5; // Max 5px translation for the card

    setCardTransformStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateX(${cardTranslateX}px) translateY(${cardTranslateY}px) scale(1.02)`,
      transition: 'transform 0.1s ease-out',
    });
    setShadowStyle({
      boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2), 0 0 15px rgba(0, 0, 0, 0.1) inset',
      transition: 'box-shadow 0.1s ease-out',
    });
  };

  const handleMouseLeave = () => {
    setCardTransformStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateX(0px) translateY(0px) scale(1)',
      transition: 'transform 0.3s ease-out',
    });
    setShadowStyle({
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      transition: 'box-shadow 0.3s ease-out',
    });
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog
    console.log("NftCard: Like button clicked for NFT:", nft.id, "Current liked status:", nft.is_liked_by_current_user);
    onLikeToggle(nft.id, nft.is_liked_by_current_user || false);
  };

  const rarityGlowClass = getRarityGlowClasses(nft.rarity_color);
  const rarityBorderClass = getBorderColorClass(nft.rarity_color);

  const usdValue = solanaPrice !== null ? (nft.price_sol * solanaPrice).toFixed(2) : null;

  return (
    <>
      <div
        ref={cardRef}
        className="relative w-full rounded-none shadow-lg p-4 flex flex-col items-center text-center bg-card text-card-foreground cursor-pointer transition-all duration-300 ease-in-out transform-gpu"
        style={{
          ...cardTransformStyle,
          boxShadow: (shadowStyle as React.CSSProperties).boxShadow || '0 4px 6px rgba(0, 0, 0, 0.1)',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setIsDetailDialogOpen(true)}
      >
        <div className="w-full h-48 flex items-center justify-center overflow-hidden mb-4 border border-border bg-background rounded-none">
          {imageError ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground bg-muted">
              <ImageOff className="w-12 h-12 mb-2" />
              <p className="text-sm font-sans">Image failed to load</p>
            </div>
          ) : (
            <img
              src={nft.image_url}
              alt={nft.name}
              className="max-w-full max-h-full object-contain rounded-none"
              onError={handleImageError}
            />
          )}
        </div>
        <div className={`w-full p-3 mt-2 border-2 rounded-md ${rarityBorderClass} ${rarityGlowClass} animate-pulse-glow`} style={{ '--tw-shadow-color': `var(--${nft.rarity_color.toLowerCase()}-glow)` } as React.CSSProperties}>
          <h3 className="text-xl font-pixel text-primary mb-1">{nft.name}</h3>
          <p className="text-lg font-bold text-foreground mb-2 font-sans">
            {nft.price_sol} SOL
            {usdValue && <span className="text-sm text-muted-foreground ml-2">(${usdValue})</span>}
          </p>
          <div className="flex items-center gap-2 mb-2 font-sans justify-center">
            <Gem className={`w-5 h-5 ${getDiamondColorClass(nft.rarity_color)}`} /> {/* Changed to Gem */}
            <span className="font-bold text-foreground">{nft.rarity}</span>
          </div>
          {/* Changed <p> to <div> here */}
          <div className="text-sm text-muted-foreground font-sans flex items-center justify-center gap-1">
            Creator:{" "}
            <Link to={`/profile/${creatorUsername}`} className="text-foreground hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              {creatorUsername}
              {creatorIsVerified && <VerifiedBadge />}
            </Link>
          </div>
          <div className="flex items-center justify-center mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLikeClick}
              className="flex items-center gap-1 text-muted-foreground hover:text-red-500 hover:bg-transparent"
              disabled={!currentUser}
            >
              <Heart
                className={`h-5 w-5 transition-colors ${nft.is_liked_by_current_user ? 'text-red-500 fill-red-500' : ''}`}
              />
              <span className="font-sans text-sm">{nft.likes_count}</span>
            </Button>
          </div>
        </div>
      </div>

      {isDetailDialogOpen && (
        <NftDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          nft={nft}
          creatorProfile={creatorProfile || null}
          solanaPrice={solanaPrice}
          onLikeToggle={onLikeToggle}
        />
      )}
    </>
  );
};

export default NftCard;