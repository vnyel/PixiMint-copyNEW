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
  const [loading, setLoading] = useState(true); // Single loading state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("random"); // Default to random
  const [sortOrder, setSortOrder] = useState("desc");
  const [filterRarity, setFilterRarity] = useState<string | undefined>(undefined);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const profilesRef = useRef(profiles); // Keep a ref for profiles to use in real-time updates
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchMarketplaceNfts = useCallback(async () => {
    setLoading(true);
    setListedNfts([]); // Clear previous NFTs
    setProfiles(new Map()); // Clear previous profiles

    try {
      let query = supabase
        .from('marketplace_listings')
        .select(`
          *,
          nfts!inner(
            id, creator_id, owner_id, name, image_url, rarity, price_sol, rarity_color, created_at, likes_count,
            nft_likes(user_id)
          )
        `) // Removed count: 'exact' as we're fetching all
        .eq('is_listed', true);

      // Apply rarity filter
      if (filterRarity && filterRarity !== 'all') {
        query = query.eq('nfts.rarity', filterRarity);
      }

      // Apply search term filter
      if (searchTerm.trim() !== "") {
        query = query.ilike('nfts.name', `%${searchTerm.trim()}%`);
      }

      // Fetch all matching listings
      const { data: listingsData, error: listingsError } = await query;

      if (listingsError) {
        showError(`Failed to fetch marketplace listings: ${listingsError.message}`);
        return;
      }

      let fetchedNfts: NFT[] = (listingsData || []).map((listing: any) => ({
        ...listing.nfts,
        listing_id: listing.id,
        list_price_sol: listing.list_price_sol,
        is_listed: listing.is_listed,
        seller_id: listing.seller_id,
        is_liked_by_current_user: listing.nfts.nft_likes.some((like: { user_id: string }) => like.user_id === supabase.auth.getUser()?.id),
      }));

      // Apply client-side sorting/shuffling to the entire fetched dataset
      if (sortBy === 'random') {
        fetchedNfts = shuffleArray(fetchedNfts);
      } else if (sortBy === 'rarity') {
        const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
        fetchedNfts.sort((a, b) => {
          const indexA = rarityOrder.indexOf(a.rarity);
          const indexB = rarityOrder.indexOf(b.rarity);
          if (sortOrder === 'asc') {
            return indexA - indexB;
          } else {
            return indexB - indexA;
          }
        });
      } else if (sortBy === 'listed_at') {
        fetchedNfts.sort((a, b) => {
          const dateA = new Date(a.listed_at || 0).getTime();
          const dateB = new Date(b.listed_at || 0).getTime();
          return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
      } else if (sortBy === 'price_sol') {
        fetchedNfts.sort((a, b) => {
          const priceA = a.list_price_sol || 0;
          const priceB = b.list_price_sol || 0;
          return sortOrder === 'asc' ? priceA - priceB : priceB - priceA;
        });
      }

      setListedNfts(fetchedNfts);

      // Collect seller IDs for profile fetching
      const uniqueSellerIds = new Set<string>();
      fetchedNfts.forEach(nft => uniqueSellerIds.add(nft.seller_id || ''));
      
      // Fetch profiles for all sellers
      if (uniqueSellerIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', Array.from(uniqueSellerIds));

        if (profilesError) {
          console.error("Failed to fetch profiles:", profilesError.message);
        } else {
          setProfiles(prevProfiles => {
            const updatedMap = new Map(prevProfiles);
            profilesData?.forEach(profile => updatedMap.set(profile.id, profile as Profile));
            return updatedMap;
          });
        }
      }

    } catch (error: any) {
      showError(`An unexpected error occurred while fetching marketplace NFTs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, filterRarity, searchTerm]);

  // Effect to trigger a full fetch when filters/sorts/search change
  useEffect(() => {
    fetchMarketplaceNfts();
  }, [sortBy, sortOrder, filterRarity, searchTerm, fetchMarketplaceNfts]);

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

          {loading && listedNfts.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-64 w-full bg-card/50 rounded-lg p-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground mb-2 font-sans">
                Fetching NFT Security Fingerprints from PixiChain Network
              </p>
            </div>
          ) : listedNfts.length === 0 && !loading ? ( // Only show "No NFTs" if no NFTs loaded AND not currently loading
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