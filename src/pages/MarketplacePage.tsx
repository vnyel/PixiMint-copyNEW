/** @jsxImportSource react */
import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { NFT, Profile } from "@/types/nft";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import MarketplaceNftCard from "@/components/MarketplaceNftCard";

const ITEMS_PER_LOAD = 30; // Define how many NFTs to load per scroll

// Fisher-Yates (Knuth) shuffle algorithm
const shuffleArray = (array: any[]) => {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
};

const MarketplacePage = () => {
  const [listedNfts, setListedNfts] = useState<NFT[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("random"); // Default to random
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null); // Ref for the infinite scroll loader

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchMarketplaceNfts = useCallback(async (reset = false) => {
    if (!hasMore && !reset) return; // Don't fetch if no more items and not resetting
    if (loading && !reset) return; // Prevent multiple fetches while one is in progress

    setLoading(true);
    try {
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          nfts!inner(
            id, creator_id, owner_id, name, image_url, rarity, price_sol, rarity_color, created_at, likes_count,
            nft_likes(user_id)
          )
        `)
        .eq('is_listed', true);

      // Apply rarity filter
      if (filterRarity && filterRarity !== 'all') {
        query = query.eq('nfts.rarity', filterRarity);
      }

      // Apply search term filter
      if (searchTerm.trim() !== "") {
        query = query.ilike('nfts.name', `%${searchTerm.trim()}%`);
      }

      // Apply server-side sorting for non-random/non-rarity fields
      if (sortBy !== 'random' && sortBy !== 'rarity') {
        query = query.order(sortBy === 'listed_at' ? 'listed_at' : `nfts.${sortBy}`, { ascending: sortOrder === 'asc' });
      }

      // Apply limit and offset for infinite scroll
      query = query.range(reset ? 0 : offset, (reset ? 0 : offset) + ITEMS_PER_LOAD - 1);

      const { data: listingsData, error: listingsError } = await query;

      if (listingsError) {
        showError(`Failed to fetch marketplace listings: ${listingsError.message}`);
        setLoading(false);
        return;
      }

      let processedNfts: NFT[] = listingsData.map((listing: any) => ({
        ...listing.nfts,
        listing_id: listing.id,
        list_price_sol: listing.list_price_sol,
        is_listed: listing.is_listed,
        seller_id: listing.seller_id,
        is_liked_by_current_user: listing.nfts.nft_likes.some((like: { user_id: string }) => like.user_id === supabase.auth.getUser()?.id),
      }));

      // Apply client-side sorting for 'random' and 'rarity'
      if (sortBy === 'random') {
        processedNfts = shuffleArray(processedNfts);
      } else if (sortBy === 'rarity') {
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

      setListedNfts(prevNfts => reset ? processedNfts : [...prevNfts, ...processedNfts]);
      setOffset(prevOffset => prevOffset + processedNfts.length);
      setHasMore(processedNfts.length === ITEMS_PER_LOAD);

      const sellerIds = Array.from(new Set(listingsData?.map(listing => listing.seller_id)));
      const ownerIds = Array.from(new Set(processedNfts?.map(nft => nft.owner_id)));
      const allUserIds = Array.from(new Set([...sellerIds, ...ownerIds]));

      if (allUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', allUserIds);

        if (profilesError) {
          showError(`Failed to fetch profiles: ${profilesError.message}`);
          setLoading(false);
          return;
        }

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(profile => {
          profilesMap.set(profile.id, profile as Profile);
        });
        setProfiles(prevProfiles => new Map([...prevProfiles, ...profilesMap]));
      }

    } catch (error: any) {
      showError(`An unexpected error occurred while fetching marketplace NFTs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [offset, hasMore, loading, sortBy, sortOrder, filterRarity, searchTerm]);

  // Initial fetch and reset on filter/sort/search change
  useEffect(() => {
    setListedNfts([]);
    setOffset(0);
    setHasMore(true);
    fetchMarketplaceNfts(true); // Perform an initial fetch with reset
  }, [sortBy, sortOrder, filterRarity, searchTerm]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('marketplace_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, payload => {
        console.log("Marketplace real-time update:", payload);
        setListedNfts([]); // Clear existing NFTs
        setOffset(0); // Reset offset
        setHasMore(true); // Assume there's more data
        fetchMarketplaceNfts(true); // Re-fetch all listings from start
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfts' }, payload => {
        console.log("NFT ownership update:", payload);
        setListedNfts([]); // Clear existing NFTs
        setOffset(0); // Reset offset
        setHasMore(true); // Assume there's more data
        fetchMarketplaceNfts(true); // Re-fetch all listings from start
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketplaceNfts]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMarketplaceNfts();
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loading, fetchMarketplaceNfts]);

  const handleNftSold = () => {
    setListedNfts([]); // Clear existing NFTs
    setOffset(0); // Reset offset
    setHasMore(true); // Assume there's more data
    fetchMarketplaceNfts(true); // Re-fetch all listings from start
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center p-8">
        <h2 className="text-5xl font-pixel text-primary mb-12 text-center tracking-tight">
          PixiMint Marketplace
        </h2>

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
                <SelectItem value="random">Random</SelectItem>
                <SelectItem value="listed_at">Newest Listing</SelectItem>
                <SelectItem value="price_sol">Price</SelectItem>
                <SelectItem value="rarity">Rarity</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder} disabled={sortBy === 'random'}>
              <SelectTrigger className="w-full sm:w-[150px] border border-input rounded-lg font-sans shadow-sm">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent className="font-sans border border-border rounded-lg shadow-md">
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
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

          {listedNfts.length === 0 && !loading ? (
            <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
              No NFTs currently listed for sale.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listedNfts.map((nft) => (
                <MarketplaceNftCard
                  key={nft.listing_id} // Use listing_id as key for marketplace cards
                  nft={nft}
                  sellerProfile={profiles.get(nft.seller_id || '') || null}
                  solanaPrice={solanaPrice}
                  onNftSold={handleNftSold}
                />
              ))}
            </div>
          )}

          {/* Infinite scroll loader */}
          <div ref={loaderRef} className="flex justify-center items-center py-8">
            {loading && hasMore && <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />}
            {!hasMore && listedNfts.length > 0 && !loading && (
              <p className="text-muted-foreground text-center font-sans">You've reached the end of the listings!</p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketplacePage;