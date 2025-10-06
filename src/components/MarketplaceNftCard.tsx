import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Gem, ImageOff, Heart, ShoppingCart, Wallet } from "lucide-react";
import { NFT, Profile } from "@/types/nft";
import VerifiedBadge from "@/components/VerifiedBadge";
import NftDetailDialog from "./NftDetailDialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { buyNft } from "@/utils/marketplace";
import { showError } from "@/utils/toast";

interface MarketplaceNftCardProps {
  nft: NFT;
  sellerProfile: Profile | null;
  solanaPrice: number | null;
  onNftSold: () => void;
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

const MarketplaceNftCard = ({ nft, sellerProfile, solanaPrice, onNftSold }: MarketplaceNftCardProps) => {
  const { user: currentUser } = useSession();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
  const [imageError, setImageError] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardTransformStyle, setCardTransformStyle] = useState({});
  const [shadowStyle, setShadowStyle] = useState({});
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [buying, setBuying] = useState(false);

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

    const offsetX = (clientX - centerX) / (width / 2);
    const offsetY = (clientY - centerY) / (height / 2);

    const rotateX = -offsetY * 10;
    const rotateY = offsetX * 10;

    const cardTranslateX = offsetX * 5;
    const cardTranslateY = offsetY * 5;

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

  const handleBuyClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the detail dialog

    if (!currentUser) {
      showError("You must be logged in to buy NFTs.");
      return;
    }

    if (!wallet.connected) {
      setVisible(true); // Open wallet modal
      return; // Stop here, user needs to connect wallet first
    }

    // If wallet is connected, proceed with purchase logic
    console.log("MarketplaceNftCard: Buy button clicked.");
    console.log("MarketplaceNftCard: Current User:", currentUser);
    console.log("MarketplaceNftCard: Wallet Connected:", wallet.connected);
    console.log("MarketplaceNftCard: NFT Seller ID:", nft.seller_id);
    console.log("MarketplaceNftCard: Seller Profile:", sellerProfile);

    if (currentUser.id === nft.seller_id) {
      showError("You cannot buy your own listed NFT.");
      return;
    }

    setBuying(true);
    const success = await buyNft(nft, currentUser.id, wallet);
    setBuying(false);

    if (success) {
      onNftSold(); // Notify parent to refresh the list
    }
  };

  const handleLikeToggle = async (nftId: string, isLiked: boolean) => {
    showError("Please view NFTs in the gallery or profile to like them.");
  };

  const rarityGlowClass = getRarityGlowClasses(nft.rarity_color);
  const rarityBorderClass = getBorderColorClass(nft.rarity_color);

  const usdValue = solanaPrice !== null && nft.list_price_sol !== undefined
    ? (nft.list_price_sol * solanaPrice).toFixed(2)
    : null;

  // The button is disabled if buying, or if current user is not logged in, or is the seller.
  const isCurrentUserLoggedIn = !!currentUser;
  const isSeller = currentUser && currentUser.id === nft.seller_id;
  const isBuyButtonDisabled = buying || !isCurrentUserLoggedIn || isSeller;

  console.log(`--- MarketplaceNftCard Debug for NFT ${nft.name} ---`);
  console.log(`  isCurrentUserLoggedIn: ${isCurrentUserLoggedIn}`);
  console.log(`  isWalletConnected: ${wallet.connected}`);
  console.log(`  isSeller (currentUser.id === nft.seller_id): ${isSeller}`);
  console.log(`  buying: ${buying}`);
  console.log(`  FINAL isBuyButtonDisabled: ${isBuyButtonDisabled}`);
  console.log(`-------------------------------------------------`);

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
            {nft.list_price_sol !== undefined ? `${nft.list_price_sol} SOL` : "N/A"}
            {usdValue && <span className="text-sm text-muted-foreground ml-2">(${usdValue})</span>}
          </p>
          <div className="flex items-center gap-2 mb-2 font-sans justify-center">
            <Gem className={`w-5 h-5 ${getDiamondColorClass(nft.rarity_color)}`} />
            <span className="font-bold text-foreground">{nft.rarity}</span>
          </div>
          <div className="text-sm text-muted-foreground font-sans flex items-center justify-center gap-1">
            Seller:{" "}
            <Link to={`/profile/${sellerProfile?.username}`} className="text-foreground hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              @{sellerProfile?.username || "Unknown"}
              {sellerProfile?.is_verified && <VerifiedBadge />}
            </Link>
          </div>
          <div className="flex items-center justify-center mt-3">
            <Button
              onClick={handleBuyClick}
              className="bg-mint-green text-black border border-mint-green rounded-lg hover:bg-mint-green/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4 flex items-center gap-2"
              disabled={isBuyButtonDisabled}
            >
              <ShoppingCart className="h-5 w-5" /> {wallet.connected ? (buying ? "Buying..." : "Buy Now") : "Connect Wallet"}
            </Button>
          </div>
        </div>
      </div>

      {isDetailDialogOpen && (
        <NftDetailDialog
          isOpen={isDetailDialogOpen}
          onClose={() => setIsDetailDialogOpen(false)}
          nft={nft}
          creatorProfile={sellerProfile || null}
          solanaPrice={solanaPrice}
          onLikeToggle={handleLikeToggle}
        />
      )}
    </>
  );
};

export default MarketplaceNftCard;