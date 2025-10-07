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
import { Progress } from "@/components/ui/progress"; // Import Progress component

const ITEMS_PER_BATCH = 50; // Define how many NFTs to load in each batch

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
  const [loading, setLoading] = useState(true); // Overall loading state
  const [nftsDataLoaded, setNftsDataLoaded] = useState(false); // Tracks if NFT data is loaded
  const [profilesDataLoaded, setProfilesDataLoaded] = useState(false); // Tracks if profile data is loaded
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("random"); // Default to random
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const [totalNftsCount, setTotalNftsCount] = useState(0);
  const [loadedNftsCount, setLoadedNftsCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchMarketplaceNfts = useCallback(async () => {
    setLoading(true);
    setNftsDataLoaded(false);
    setProfilesDataLoaded(false);
    setListedNfts([]); // Clear previous NFTs
    setLoadedNftsCount(0);
    setLoadingProgress(0);
    setProfiles(new Map()); // Clear profiles

    try {
      // 1. Fetch total count first (0-5% progress)
      let countQuery = supabase
        .from('marketplace_listings')
        .select(`id`, { count: 'exact' })
        .eq('is_listed', true);

      if (filterRarity && filterRarity !== 'all') {
        countQuery = countQuery.eq('nfts.rarity', filterRarity);
      }
      if (searchTerm.trim() !== "") {
        countQuery = countQuery.ilike('nfts.name', `%${searchTerm.trim()}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        showError(`Failed to fetch total NFT count: ${countError.message}`);
        setLoading(false);
        return;
      }
      const totalCount = count || 0;
      setTotalNftsCount(totalCount);
      setLoadingProgress(5); // Initial progress after getting count

      if (totalCount === 0) {
        setLoading(false);
        setNftsDataLoaded(true); // No NFTs to load, so NFT data is "loaded"
        setProfilesDataLoaded(true); // No profiles to load
        setLoadingProgress(100);
        return;
      }

      // 2. Fetch all actual NFT listings in batches (5%-85% progress)
      const allFetchedNfts: any[] = [];
      const uniqueSellerIds = new Set<string>();

      for (let offset = 0; offset < totalCount; offset += ITEMS_PER_BATCH) {
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

        // Apply limit and offset for batch fetching
        query = query.range(offset, offset + ITEMS_PER_BATCH - 1);

        const { data: listingsData, error: listingsError } = await query;

        if (listingsError) {
          showError(`Failed to fetch marketplace listings: ${listingsError.message}`);
          setLoading(false);
          return;
        }

        allFetchedNfts.push(...listingsData);
        setLoadedNftsCount(allFetchedNfts.length);
        setLoadingProgress(5 + (allFetchedNfts.length / totalCount) * 80); // 5% for count, 80% for NFT data

        // Collect seller IDs for profile fetching later
        listingsData.forEach(listing => uniqueSellerIds.add(listing.seller_id));

        // Add a small delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      let processedNfts: NFT[] = allFetchedNfts.map((listing: any) => ({
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

      setListedNfts(processedNfts);
      setNftsDataLoaded(true); // NFT data is now loaded
      setLoadingProgress(85); // Progress after NFT data is processed

      // 3. Fetch profiles for all unique sellers (85%-100% progress)
      const allUserIds = Array.from(uniqueSellerIds);

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
        setProfiles(profilesMap);
      } else {
        setProfiles(new Map());
      }
      setProfilesDataLoaded(true); // Profile data is now loaded
      setLoadingProgress(100); // Final progress after fetching profiles

    } catch (error: any) {
      showError(`An unexpected error occurred while fetching marketplace NFTs: ${error.message}`);
    } finally {
      setLoading(false); // Overall loading is complete
    }
  }, [sortBy, sortOrder, filterRarity, searchTerm]);

  // Initial fetch and re-fetch on filter/sort/search change
  useEffect(() => {
    fetchMarketplaceNfts();
  }, [fetchMarketplaceNfts]);

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('marketplace_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, payload => {
        console.log("Marketplace real-time update:", payload);
        fetchMarketplaceNfts(); // Re-fetch all listings on any change
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfts' }, payload => {
        console.log("NFT ownership update:", payload);
        fetchMarketplaceNfts(); // Re-fetch all listings on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketplaceNfts]);

  const handleNftSold = () => {
    fetchMarketplaceNfts(); // Refresh the list after a sale
  };

  // Determine if the loading message should be "Calculating live prices..."
  const showCalculatingPricesMessage = (loading || solanaPriceLoading) && nftsDataLoaded && !profilesDataLoaded;

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

          {(loading || solanaPriceLoading) && (!nftsDataLoaded || !profilesDataLoaded) ? (
            <div className="flex flex-col justify-center items-center h-64 w-full bg-card/50 rounded-lg p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              {showCalculatingPricesMessage ? (
                <p className="text-lg text-muted-foreground mb-2 font-sans">
                  Fetching creator profiles and calculating live prices...
                </p>
              ) : (
                <p className="text-lg text-muted-foreground mb-2 font-sans">
                  Loading {loadedNftsCount} of {totalNftsCount} NFTs ({Math.round(loadingProgress)}%)
                </p>
              )}
              <Progress value={loadingProgress} className="w-full max-w-sm h-2" />
            </div>
          ) : listedNfts.length === 0 ? (
            <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
              No NFTs currently listed for sale.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listedNfts.map((nft) => (
                <MarketplaceNftCard
                  key={nft.listing_id}
                  nft={nft}
                  sellerProfile={profiles.get(nft.seller_id || '') || null}
                  solanaPrice={solanaPrice}
                  onNftSold={handleNftSold}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketplacePage;