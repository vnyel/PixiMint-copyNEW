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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 30; // Define how many NFTs to show per page

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

  const [currentPage, setCurrentPage] = useState(1);
  const [totalNftsCount, setTotalNftsCount] = useState(0);

  const profilesRef = useRef(profiles);
  useEffect(() => {
    profilesRef.current = profiles;
  }, [profiles]);

  const fetchMarketplaceNfts = useCallback(async () => {
    setLoading(true);
    try {
      // Base query for counting and fetching
      let baseQuery = supabase
        .from('marketplace_listings')
        .select(`
          *,
          nfts!inner(
            id, creator_id, owner_id, name, image_url, rarity, price_sol, rarity_color, created_at, likes_count,
            nft_likes(user_id)
          )
        `, { count: 'exact' }) // Request count for pagination
        .eq('is_listed', true);

      // Apply rarity filter
      if (filterRarity && filterRarity !== 'all') {
        baseQuery = baseQuery.eq('nfts.rarity', filterRarity);
      }

      // Apply search term filter
      if (searchTerm.trim() !== "") {
        baseQuery = baseQuery.ilike('nfts.name', `%${searchTerm.trim()}%`);
      }

      // Fetch total count first
      const { count, error: countError } = await baseQuery.limit(0); // Fetch 0 rows, just get the count

      if (countError) {
        showError(`Failed to fetch total NFT count: ${countError.message}`);
        setLoading(false);
        return;
      }
      setTotalNftsCount(count || 0);

      // Calculate the range for the current page
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Clone the base query for fetching paginated data
      let paginatedQuery = baseQuery;

      // Apply server-side sorting for non-random/non-rarity fields
      if (sortBy !== 'random' && sortBy !== 'rarity') {
        paginatedQuery = paginatedQuery.order(sortBy === 'listed_at' ? 'listed_at' : `nfts.${sortBy}`, { ascending: sortOrder === 'asc' });
      }

      // Apply pagination range
      paginatedQuery = paginatedQuery.range(from, to);

      const { data: listingsData, error: listingsError } = await paginatedQuery;

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

      setListedNfts(processedNfts);

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
        setProfiles(profilesMap);
      } else {
        setProfiles(new Map());
      }

    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [sortBy, sortOrder, filterRarity, currentPage, searchTerm]); // Add searchTerm to dependencies

  useEffect(() => {
    fetchMarketplaceNfts();

    const channel = supabase
      .channel('marketplace_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings' }, payload => {
        console.log("Marketplace real-time update:", payload);
        fetchMarketplaceNfts(); // Re-fetch all listings on any change
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'nfts' }, payload => {
        // Listen for NFT ownership changes to update the cards if needed
        console.log("NFT ownership update:", payload);
        fetchMarketplaceNfts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketplaceNfts]);

  const handleNftSold = () => {
    fetchMarketplaceNfts(); // Refresh the list after a sale
  };

  // No longer need client-side filtering by searchTerm here, as it's done in fetchMarketplaceNfts
  const displayedNfts = listedNfts;

  const totalPages = Math.ceil(totalNftsCount / ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to top on page change
    }
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxPageButtons = 5; // Max number of page buttons to show

    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink onClick={() => handlePageChange(1)} isActive={currentPage === 1}>
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 2) {
        items.push(<PaginationEllipsis key="ellipsis-start" />);
      }

      let startPage = Math.max(2, currentPage - Math.floor(maxPageButtons / 2) + 1);
      let endPage = Math.min(totalPages - 1, currentPage + Math.floor(maxPageButtons / 2) - 1);

      if (currentPage <= Math.floor(maxPageButtons / 2)) {
        endPage = maxPageButtons - 1;
      } else if (currentPage > totalPages - Math.floor(maxPageButtons / 2)) {
        startPage = totalPages - maxPageButtons + 2;
      }

      for (let i = startPage; i <= endPage; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink onClick={() => handlePageChange(i)} isActive={currentPage === i}>
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 1) {
        items.push(<PaginationEllipsis key="ellipsis-end" />);
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink onClick={() => handlePageChange(totalPages)} isActive={currentPage === totalPages}>
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }
    return items;
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
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans shadow-sm"
            />
            <Select value={sortBy} onValueChange={(value) => {
              setSortBy(value);
              setCurrentPage(1); // Reset to first page on sort change
            }}>
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
            <Select value={sortOrder} onValueChange={(value) => {
              setSortOrder(value);
              setCurrentPage(1); // Reset to first page on order change
            }} disabled={sortBy === 'random'}>
              <SelectTrigger className="w-full sm:w-[150px] border border-input rounded-lg font-sans shadow-sm">
                <SelectValue placeholder="Order" />
              </SelectTrigger>
              <SelectContent className="font-sans border border-border rounded-lg shadow-md">
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRarity} onValueChange={(value) => {
              setFilterRarity(value);
              setCurrentPage(1); // Reset to first page on filter change
            }}>
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
          ) : displayedNfts.length === 0 ? (
            <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
              No NFTs currently listed for sale.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedNfts.map((nft) => (
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

          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  />
                </PaginationItem>
                {renderPaginationItems()}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MarketplacePage;