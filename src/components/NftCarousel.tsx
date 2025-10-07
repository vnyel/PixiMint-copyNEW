import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { NFT, Profile } from "@/types/nft";
import NftCard from "./NftCard";
import { Loader2 } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay"; // Import Autoplay
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { useSession } from "@/contexts/SessionContext";

interface NftCarouselProps {
  nftNames: string[];
}

const NftCarousel = ({ nftNames }: NftCarouselProps) => {
  const { user: currentUser } = useSession();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const fetchFeaturedNfts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: nftsData, error: nftsError } = await supabase
        .from('nfts')
        .select(`
          *,
          nft_likes(user_id)
        `)
        .in('name', nftNames);

      if (nftsError) {
        showError(`Failed to fetch featured NFTs: ${nftsError.message}`);
        setLoading(false);
        return;
      }

      const processedNfts: NFT[] = nftsData.map((nft: any) => ({
        ...nft,
        is_liked_by_current_user: currentUser ? nft.nft_likes.some((like: { user_id: string }) => like.user_id === currentUser.id) : false,
      }));
      setNfts(processedNfts);

      const creatorIds = Array.from(new Set(nftsData?.map(nft => nft.creator_id)));

      if (creatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', creatorIds);

        if (profilesError) {
          showError(`Failed to fetch profiles for featured NFTs: ${profilesError.message}`);
          setLoading(false);
          return;
        }

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile as Profile);
        });
        setProfiles(profilesMap);
      } else {
        setProfiles(new Map());
      }

    } catch (error: any) {
      showError(`An unexpected error occurred while fetching featured NFTs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [nftNames, currentUser]);

  useEffect(() => {
    fetchFeaturedNfts();
  }, [fetchFeaturedNfts]);

  // Dummy like toggle for carousel, as liking is typically done in gallery/profile
  const handleLikeToggle = async (nftId: string, isLiked: boolean) => {
    showError("Please view NFTs in the gallery or profile to like them.");
  };

  if (loading || solanaPriceLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (nfts.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
        No featured NFTs found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto mb-12">
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[
          Autoplay({
            delay: 3000, // Advance every 3 seconds
            stopOnInteraction: false, // Keep playing even if user interacts
          }),
        ]}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {nfts.map((nft) => (
            <CarouselItem key={nft.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <div className="p-1">
                <NftCard
                  nft={nft}
                  creatorUsername={profiles.get(nft.creator_id)?.username || "Unknown"}
                  creatorIsVerified={profiles.get(nft.creator_id)?.is_verified || false}
                  creatorProfile={profiles.get(nft.creator_id) || null}
                  solanaPrice={solanaPrice}
                  onLikeToggle={handleLikeToggle}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="bg-mint-green text-black hover:bg-mint-green/90 hover:text-black border-mint-green" />
        <CarouselNext className="bg-mint-green text-black hover:bg-mint-green/90 hover:text-black border-mint-green" />
      </Carousel>
    </div>
  );
};

export default NftCarousel;