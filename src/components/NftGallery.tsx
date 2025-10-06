import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { NFT, Profile } from "@/types/nft";
import NftCard from "./NftCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useSession } from "@/contexts/SessionContext"; // Import useSession
import { toggleLikeNft } from "@/utils/nft"; // Ensure toggleLikeNft is imported

interface NftGalleryProps {
  solanaPrice: number | null;
  solanaPriceLoading: boolean;
}

const NftGallery = ({ solanaPrice, solanaPriceLoading }: NftGalleryProps) => {
  const { user: currentUser } = useSession(); // Get current user
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined); // New state for rarity filter

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchNftsAndProfiles = useCallback(async () => {
    setLoading(true);
    console.log("NftGallery: Fetching NFTs and Profiles...");
    try {
      let query = supabase
        .from('nfts')
        .select(`
          *,
          nft_likes(user_id)
        `);

      // Apply rarity filter if not "all"
      if (filterRarity && filterRarity !== 'all') {
        query = query.eq('rarity', filterRarity);
      }

      // Only apply server-side sorting if not sorting by rarity (which requires custom client-side logic)
      if (sortBy !== 'rarity') {
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
      }

      const { data: nftsData, error: nftsError } = await query;

      if (nftsError) {
        showError(`Failed to fetch NFTs: ${nftsError.message}`);
        console.error("NftGallery: Error fetching NFTs:", nftsError);
        return;
      }

      let processedNfts: NFT[] = nftsData.map((nft: any) => ({
        ...nft,
        is_liked_by_current_user: currentUser ? nft.nft_likes.some((like: { user_id: string }) => like.user_id === currentUser.id) : false,
      }));

      // Apply client-side sorting for rarity
      if (sortBy === 'rarity') {
        const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        processedNfts.sort((a, b) => {
          const indexA = rarityOrder.indexOf(a.rarity);
          const indexB = rarityOrder.indexOf(b.rarity);
          if (sortOrder === 'asc') {
            return indexA - indexB;
          } else {
            return indexB - indexA;
          }
        });
      }
      // For other sorts, the server-side order is already applied.

      console.log("NftGallery: Fetched NFTs. Current user:", currentUser?.id, "Processed NFTs (first 2):", processedNfts.slice(0, 2));
      setNfts(processedNfts || []);

      const creatorIds = Array.from(new Set(nftsData?.map(nft => nft.creator_id)));

      if (creatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*') // Fetch all profile details
          .in('id', creatorIds);

        if (profilesError) {
          showError(`Failed to fetch profiles: ${profilesError.message}`);
          console.error("NftGallery: Error fetching profiles:", profilesError);
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
      showError(`An unexpected error occurred: ${error.message}`);
      console.error("NftGallery: Unexpected error in fetchNftsAndProfiles:", error);
    } finally {
      setLoading(false);
      console.log("NftGallery: Finished fetching NFTs and Profiles.");
    }
  }, [sortBy, sortOrder, currentUser, filterRarity]); // Add filterRarity to dependencies

  useEffect(() => {
    fetchNftsAndProfiles();
  }, [fetchNftsAndProfiles]);

  useEffect(() => {
    console.log("NftGallery: Setting up real-time subscriptions.");

    // Listener for new NFTs (INSERT on nfts table)
    const nftsInsertSubscription = supabase
      .channel('nfts_gallery_insert')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nfts' }, payload => {
        console.log("NftGallery: Real-time INSERT event (nfts) received:", payload.new);
        const newNft = payload.new as NFT;
        setNfts(prevNfts => [{ ...newNft, is_liked_by_current_user: false }, ...prevNfts]);

        if (!profilesRef.current.has(newNft.creator_id)) {
          supabase.from('profiles').select('*').eq('id', newNft.creator_id).single()
            .then(({ data, error }) => {
              if (data && !error) {
                setProfiles(prevProfiles => new Map(prevProfiles).set(data.id, data as Profile));
              } else if (error) {
                console.error("NftGallery: Error fetching new creator profile from INSERT event:", error.message);
              }
            });
        }
      })
      .subscribe();

    // Listener for NFT likes count updates (UPDATE on nfts table)
    const nftsUpdateSubscription = supabase
      .channel('nfts_gallery_update')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfts' }, payload => {
        console.log("NftGallery: Real-time UPDATE event (nfts) received:", payload.new);
        const updatedNftFromDb = payload.new as { id: string; likes_count: number };
        setNfts(prevNfts => prevNfts.map(nft => {
          if (nft.id === updatedNftFromDb.id) {
            console.log("NftGallery: Updating NFT likes_count from real-time UPDATE. NFT ID:", nft.id, "Old likes:", nft.likes_count, "New likes from DB:", updatedNftFromDb.likes_count);
            return {
              ...nft,
              likes_count: updatedNftFromDb.likes_count,
              // is_liked_by_current_user is explicitly NOT updated here, it's handled by nft_likes listener
            };
          }
          return nft;
        }));
      })
      .subscribe();

    // Listener for current user's likes/unlikes (INSERT/DELETE on nft_likes table)
    // This is crucial for updating `is_liked_by_current_user`
    let nftLikesSubscription: any;
    if (currentUser) {
      nftLikesSubscription = supabase
        .channel(`nft_likes_for_user_${currentUser.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nft_likes', filter: `user_id=eq.${currentUser.id}` }, payload => {
          console.log("NftGallery: Real-time INSERT event (nft_likes) received for current user:", payload.new);
          const likedNftId = (payload.new as { nft_id: string }).nft_id;
          setNfts(prevNfts => prevNfts.map(nft => {
            if (nft.id === likedNftId) {
              console.log("NftGallery: Setting is_liked_by_current_user to TRUE for NFT:", likedNftId);
              return { ...nft, is_liked_by_current_user: true };
            }
            return nft;
          }));
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'nft_likes', filter: `user_id=eq.${currentUser.id}` }, payload => {
          console.log("NftGallery: Real-time DELETE event (nft_likes) received for current user:", payload.old);
          const unlikedNftId = (payload.old as { nft_id: string }).nft_id;
          setNfts(prevNfts => prevNfts.map(nft => {
            if (nft.id === unlikedNftId) {
              console.log("NftGallery: Setting is_liked_by_current_user to FALSE for NFT:", unlikedNftId);
              return { ...nft, is_liked_by_current_user: false };
            }
            return nft;
          }));
        })
        .subscribe();
    }


    return () => {
      console.log("NftGallery: Unsubscribing from real-time channels.");
      supabase.removeChannel(nftsInsertSubscription);
      supabase.removeChannel(nftsUpdateSubscription);
      if (nftLikesSubscription) {
        supabase.removeChannel(nftLikesSubscription);
      }
    };
  }, [currentUser]); // currentUser is a dependency because the nft_likes subscription depends on it.

  const handleLikeToggle = async (nftId: string, isLiked: boolean) => {
    if (!currentUser) {
      showError("You must be logged in to like NFTs.");
      console.log("NftGallery: Like toggle failed, no current user.");
      return;
    }

    // Optimistic update
    setNfts(prevNfts => prevNfts.map(nft => {
      if (nft.id === nftId) {
        const newLikesCount = isLiked ? nft.likes_count - 1 : nft.likes_count + 1;
        console.log(`NftGallery: Optimistically updating NFT ${nftId}. is_liked_by_current_user: ${!isLiked}, likes_count: ${newLikesCount}`);
        return {
          ...nft,
          is_liked_by_current_user: !isLiked,
          likes_count: newLikesCount,
        };
      }
      return nft;
    }));

    console.log("NftGallery: Calling toggleLikeNft for NFT:", nftId, "isLiked (before toggle):", isLiked);
    const success = await toggleLikeNft(nftId, currentUser.id, isLiked);
    console.log("NftGallery: toggleLikeNft returned success:", success);

    if (!success) {
      // Revert optimistic update if API call failed
      setNfts(prevNfts => prevNfts.map(nft => {
        if (nft.id === nftId) {
          const originalLikesCount = isLiked ? nft.likes_count + 1 : nft.likes_count - 1; // Revert to original
          console.log(`NftGallery: Reverting optimistic update for NFT ${nftId} due to API failure. is_liked_by_current_user: ${isLiked}, likes_count: ${originalLikesCount}`);
          return {
            ...nft,
            is_liked_by_current_user: isLiked,
            likes_count: originalLikesCount,
          };
        }
        return nft;
      }));
    }
    // If successful, real-time listeners will confirm/correct the likes_count from DB.
    // The is_liked_by_current_user is already optimistically updated and confirmed by nft_likes listener.
  };

  const filteredNfts = nfts.filter(nft =>
    nft.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    nft.price_sol.toString().includes(searchTerm)
  );

  return (
    <div className="w-full max-w-4xl">
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          type="text"
          placeholder="Search by # or price..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans shadow-sm"
        />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[180px] border border-input rounded-lg font-sans shadow-sm">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent className="font-sans border border-border rounded-lg shadow-md">
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="price_sol">Price</SelectItem>
            <SelectItem value="rarity">Rarity</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={setSortOrder}>
          <SelectTrigger className="w-full sm:w-[150px] border border-input rounded-lg font-sans shadow-sm">
            <SelectValue placeholder="Order" />
          </SelectTrigger>
          <SelectContent className="font-sans border border-border rounded-lg shadow-md">
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
        {/* New Rarity Filter */}
        <Select value={filterRarity} onValueChange={setFilterRarity}>
          <SelectTrigger className="w-full sm:w-[180px] border border-input rounded-lg font-sans shadow-sm">
            <SelectValue placeholder="Filter by Rarity" />
          </SelectTrigger>
          <SelectContent className="font-sans border border-border rounded-lg shadow-md">
            <SelectItem value="all">All Rarity</SelectItem>
            <SelectItem value="Common">Common</SelectItem>
            <SelectItem value="Uncommon">Uncommon</SelectItem>
            <SelectItem value="Rare">Rare</SelectItem>
            <SelectItem value="Epic">Epic</SelectItem>
            <SelectItem value="Legendary">Legendary</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading || solanaPriceLoading ? (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredNfts.length === 0 ? (
        <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
          No NFTs found. Be the first to mint one!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNfts.map((nft) => (
            <NftCard
              key={nft.id}
              nft={nft}
              creatorUsername={profiles.get(nft.creator_id)?.username || "Unknown"}
              creatorIsVerified={profiles.get(nft.creator_id)?.is_verified || false}
              creatorProfile={profiles.get(nft.creator_id) || null}
              solanaPrice={solanaPrice}
              onLikeToggle={handleLikeToggle} // Pass the handler
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NftGallery;