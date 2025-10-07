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

const ITEMS_PER_BATCH = 20; // Define how many NFTs to load in each batch for infinite scroll

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
  const [loadingInitial, setLoadingInitial] = useState(true); // For the very first load
  const [loadingMore, setLoadingMore] = useState(false); // For subsequent loads in infinite scroll
  const [hasMore, setHasMore] = useState(true); // To know if there are more NFTs to load (for paginated sorts)
  const [page, setPage] = useState(0); // Current page/offset for fetching (for paginated sorts)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("random"); // Default to random
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const observerTarget = useRef<HTMLDivElement>(null);
  const profilesRef = useRef(profiles); // Keep a ref for profiles to use in real-time updates
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchMarketplaceNfts = useCallback(async () => {
    const isFullFetch = sortBy === 'random' || sortBy === 'rarity';

    if (!isFullFetch && (!hasMore || loadingMore)) return; // Prevent fetching if already loading or no more items for paginated sorts

    if (page === 0) { // Only show initial loading spinner for the very first fetch or a reset
      setLoadingInitial(true);
      setListedNfts([]);
      setProfiles(new Map());
      setHasMore(true); // Reset hasMore for new fetches
    } else {
      setLoadingMore(true);
    }

    const currentPage = page;
    const offset = currentPage * ITEMS_PER_BATCH;

    try {
      let baseQuery = supabase
        .from('marketplace_listings')
        .select(`
          *,
          nfts!inner(
            id, creator_id, owner_id, name, image_url, rarity, price_sol, rarity_color, created_at, likes_count,
            nft_likes(user_id)
          )
        `, { count: 'exact' })
        .eq('is_listed', true);

      // Apply rarity filter
      if (filterRarity && filterRarity !== 'all') {
        baseQuery = baseQuery.eq('nfts.rarity', filterRarity);
      }

      // Apply search term filter
      if (searchTerm.trim() !== "") {
        baseQuery = baseQuery.ilike('nfts.name', `%${searchTerm.trim()}%`);
      }

      let listingsData: any[] | null = null;
      let totalCount: number | null = null;
      let listingsError: any = null;

      if (isFullFetch) {
        // Fetch ALL for random/rarity to ensure global sort
        const { data, error, count } = await baseQuery;
        listingsData = data;
        listingsError = error;
        totalCount = count;
      } else {
        // Paginated fetch for listed_at/price_sol
        let paginatedQuery = baseQuery.order(sortBy === 'listed_at' ? 'listed_at' : `nfts.${sortBy}`, { ascending: sortOrder === 'asc' });
        paginatedQuery = paginatedQuery.range(offset, offset + ITEMS_PER_BATCH - 1);

        const { data, error, count } = await paginatedQuery;
        listingsData = data;
        listingsError = error;
        totalCount = count;
      }

      if (listingsError) {
        showError(`Failed to fetch marketplace listings: ${listingsError.message}`);
        setHasMore(false);
        return;
      }

      let newNfts: NFT[] = (listingsData || []).map((listing: any) => ({
        ...listing.nfts,
        listing_id: listing.id,
        list_price_sol: listing.list_price_sol,
        is_listed: listing.is_listed,
        seller_id: listing.seller_id,
        is_liked_by_current_user: listing.nfts.nft_likes.some((like: { user_id: string }) => like.user_id === supabase.auth.getUser()?.id),
      }));

      // Apply client-side sorting for 'random' and 'rarity' AFTER all data is fetched (if full fetch)
      if (isFullFetch) {
        if (sortBy === 'random') {
          newNfts = shuffleArray(newNfts);
        } else if (sortBy === 'rarity') {
          const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
          newNfts.sort((a, b) => {
            const indexA = rarityOrder.indexOf(a.rarity);
            const indexB = rarityOrder.indexOf(b.rarity);
            if (sortOrder === 'asc') {
              return indexA - indexB;
            } else {
              return indexB - indexA;
            }
          });
        }
        setListedNfts(newNfts); // Set all at once
        setHasMore(false); // No more to load for full fetch
      } else {
        // For paginated sorts, append
        setListedNfts(prevNfts => [...prevNfts, ...newNfts]);
        setPage(currentPage + 1);
        setHasMore(totalCount ? (offset + ITEMS_PER_BATCH < totalCount) : false);
      }

      // Collect seller IDs for profile fetching
      const uniqueSellerIds = new Set<string>();
      newNfts.forEach(nft => uniqueSellerIds.add(nft.seller_id || ''));
      
      // Fetch profiles for new sellers
      if (uniqueSellerIds.size > 0) {
        const existingProfileIds = Array.from(profilesRef.current.keys());
        const newSellerIdsToFetch = Array.from(uniqueSellerIds).filter(id => id && !existingProfileIds.includes(id));

        if (newSellerIdsToFetch.length > 0) {
          const { data: newProfilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', newSellerIdsToFetch);

          if (profilesError) {
            console.error("Failed to fetch new profiles:", profilesError.message);
          } else {
            setProfiles(prevProfiles => {
              const updatedMap = new Map(prevProfiles);
              newProfilesData?.forEach(profile => updatedMap.set(profile.id, profile as Profile));
              return updatedMap;
            });
          }
        }
      }

    } catch (error: any) {
      showError(`An unexpected error occurred while fetching marketplace NFTs: ${error.message}`);
      setHasMore(false);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [page, sortBy, sortOrder, filterRarity, searchTerm, hasMore, loadingMore]);

  // Effect to reset page and trigger a new fetch when filters/sorts change
  useEffect(() => {
    setPage(0); // Reset page to 0
    setHasMore(true); // Assume there's more data for new filter/sort
    // fetchMarketplaceNfts will be called by the page dependency change
  }, [sortBy, sortOrder, filterRarity, searchTerm]);

  // Effect to trigger fetch when page changes (including the reset to 0)
  useEffect(() => {
    fetchMarketplaceNfts();
  }, [fetchMarketplaceNfts, page]);

  // Intersection Observer for infinite scrolling (only active for paginated sorts)
  useEffect(() => {
    const isFullFetch = sortBy === 'random' || sortBy === 'rarity';
    if (isFullFetch) return; // Disable observer for full fetch modes

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loadingInitial) {
        setPage(prevPage => prevPage + 1); // Increment page to trigger next batch fetch
      }
    }, { threshold: 1.0 }); // Trigger when the target is fully visible

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loadingMore, loadingInitial, sortBy]); // sortBy is a dependency to re-evaluate if observer should be active

  // Real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('marketplace_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, payload => {
        console.log("Marketplace real-time update:", payload);
        setPage(0); // Reset page to 0 to trigger a full re-fetch
        setHasMore(true);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfts' }, payload => {
        console.log("NFT ownership update:", payload);
        setPage(0); // Reset page to 0 to trigger a full re-fetch
        setHasMore(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // No dependencies, runs once on mount

  const handleNftSold = () => {
    setPage(0); // Reset page to 0 to trigger a full re-fetch
    setHasMore(true);
  };

  const isFullFetchMode = sortBy === 'random' || sortBy === 'rarity';

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

          {loadingInitial && listedNfts.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 w-full bg-card/50 rounded-lg p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2 font-sans">
                Fetching NFT Security Fingerprints from PixiChain Network
              </p>
            </div>
          ) : listedNfts.length === 0 && !hasMore && !loadingInitial ? ( // Only show "No NFTs" if no NFTs loaded AND no more to load
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

          {/* Intersection Observer target for infinite scroll */}
          {!isFullFetchMode && (
            <div ref={observerTarget} className="py-4 flex justify-center">
              {loadingMore && hasMore && (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              )}
              {!hasMore && listedNfts.length > 0 && !loadingMore && (
                <p className="text-muted-foreground text-sm font-sans">You've reached the end of the listings!</p>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketplacePage;