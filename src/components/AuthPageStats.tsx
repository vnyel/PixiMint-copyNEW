import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { getMintedNftCount, MAX_NFTS } from "@/utils/nft";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { Loader2, Gem, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const AuthPageStats = () => {
  const [nftCount, setNftCount] = useState<number | null>(null);
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const count = await getMintedNftCount();
      if (count !== null) {
        setNftCount(count);
      }

      const { data, error } = await supabase
        .from('nfts')
        .select('price_sol');

      if (error) {
        showError(`Failed to fetch market cap: ${error.message}`);
        setMarketCap(null);
      } else {
        const totalWorth = data.reduce((sum, nft) => sum + nft.price_sol, 0);
        setMarketCap(totalWorth);
      }
    } catch (err: any) {
      showError(`An unexpected error occurred while fetching stats: ${err.message}`);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();

    const subscription = supabase
      .channel('auth_page_stats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nfts' }, payload => {
        const newNft = payload.new as { price_sol: number };
        setNftCount(prevCount => (prevCount !== null ? prevCount + 1 : 1));
        setMarketCap(prevCap => (prevCap !== null ? prevCap + newNft.price_sol : newNft.price_sol));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const marketCapUsd = (marketCap !== null && solanaPrice !== null) ? (marketCap * solanaPrice).toFixed(2) : null;

  return (
    <Card className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 w-64 text-card-foreground font-sans">
      <CardContent className="p-0 space-y-2">
        {loadingStats || solanaPriceLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading stats...</span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-foreground">
                <Gem className="h-4 w-4 text-mint-green" /> Minted NFTs:
              </span>
              <span className="font-bold text-primary">{nftCount !== null ? `${nftCount} / ${MAX_NFTS}` : "N/A"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-foreground">
                <DollarSign className="h-4 w-4 text-green-500" /> Total Value:
              </span>
              <span className="font-bold text-primary">
                {marketCap !== null ? `${marketCap.toFixed(2)} SOL` : "N/A"}
              </span>
            </div>
            {marketCapUsd && (
              <div className="flex items-center justify-end text-xs text-muted-foreground">
                <span>~${marketCapUsd} USD</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AuthPageStats;