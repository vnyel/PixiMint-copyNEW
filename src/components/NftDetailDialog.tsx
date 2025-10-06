import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Gem, ImageOff, ExternalLink, Twitter, User as UserIcon, Fingerprint, Heart } from "lucide-react"; // Changed Diamond to Gem
import { NFT, Profile } from "@/types/nft";
import { Link } from "react-router-dom";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";

interface NftDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  nft: NFT;
  creatorProfile: Profile | null;
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

const NftDetailDialog = ({ isOpen, onClose, nft, creatorProfile, solanaPrice, onLikeToggle }: NftDetailDialogProps) => {
  const { user: currentUser } = useSession();
  const [imageError, setImageError] = React.useState(false);

  React.useEffect(() => {
    setImageError(false);
  }, [nft]);

  const handleImageError = () => {
    setImageError(true);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onLikeToggle(nft.id, nft.is_liked_by_current_user || false);
  };

  const formattedDate = new Date(nft.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const usdValue = solanaPrice !== null ? (nft.price_sol * solanaPrice).toFixed(2) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] bg-card text-card-foreground border border-border rounded-lg shadow-lg font-sans p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-pixel text-primary mb-2">{nft.name}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-lg">
            Details of this unique PixiNFT.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="w-full h-64 flex items-center justify-center overflow-hidden border border-border bg-background rounded-md">
            {imageError ? (
              <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground bg-muted">
                <ImageOff className="w-16 h-16 mb-2" />
                <p className="text-base font-sans">Image failed to load</p>
              </div>
            ) : (
              <img
                src={nft.image_url}
                alt={nft.name}
                className="max-w-full max-h-full object-contain rounded-md"
                onError={handleImageError}
              />
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm text-muted-foreground font-sans flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              Unique ID: <span className="font-mono text-foreground text-xs">{nft.id}</span>
            </p>
            <p className="text-xl font-bold text-foreground font-sans">
              Price: {nft.price_sol} SOL
              {usdValue && <span className="text-sm text-muted-foreground ml-2">(${usdValue})</span>}
            </p>
            <div className="flex items-center gap-2 text-xl font-sans">
              <Gem className={`w-6 h-6 ${getDiamondColorClass(nft.rarity_color)}`} /> {/* Changed to Gem */}
              <span className="font-bold text-foreground">Rarity: {nft.rarity}</span>
            </div>
            <p className="text-sm text-muted-foreground font-sans">Minted On: {formattedDate}</p>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <span>
                  <Badge className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-2 w-fit">
                    <Fingerprint className="h-4 w-4" />
                    Authentic Hologram
                  </Badge>
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-primary text-primary-foreground p-2 rounded-md font-sans text-xs shadow-lg">
                AuthHoloID-PIXICHAIN-PIXIMINT2025-StudioVNYEL-NFT-Security-Badge
              </TooltipContent>
            </Tooltip>
            <div className="flex items-center mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLikeClick}
                className="flex items-center gap-1 text-muted-foreground hover:text-red-500 hover:bg-transparent"
                disabled={!currentUser}
              >
                <Heart
                  className={`h-6 w-6 transition-colors ${nft.is_liked_by_current_user ? 'text-red-500 fill-red-500' : ''}`}
                />
                <span className="font-sans text-lg">{nft.likes_count}</span>
              </Button>
            </div>
          </div>

          {creatorProfile && (
            <div className="border-t border-border pt-4 mt-4">
              <h4 className="text-lg font-bold text-primary mb-2">Creator Details:</h4>
              <Link to={`/profile/${creatorProfile.username}`} onClick={onClose} className="flex items-center gap-3 p-2 hover:bg-accent/50 rounded-md transition-colors">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={creatorProfile.avatar_url || undefined} alt={`${creatorProfile.username}'s avatar`} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-sans text-foreground font-medium text-lg flex items-center gap-1">
                  @{creatorProfile.username}
                  {creatorProfile.is_verified && <VerifiedBadge />}
                </span>
              </Link>
              {creatorProfile.description && (
                <p className="text-sm text-muted-foreground mt-2">{creatorProfile.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-3">
                {creatorProfile.website_url && (
                  <a
                    href={creatorProfile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline flex items-center gap-1 text-sm"
                  >
                    Website <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {creatorProfile.twitter_url && (
                  <a
                    href={creatorProfile.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:underline flex items-center gap-1 text-sm"
                  >
                    Twitter <Twitter className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NftDetailDialog;