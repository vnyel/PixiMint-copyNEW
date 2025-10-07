/** @jsxImportSource react */
import React, { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { getMintedNftCount, MAX_NFTS } from "@/utils/nft";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Loader2, Sparkles, GalleryVertical, Fingerprint } from "lucide-react";
import { useSession } from "@/contexts/SessionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import PixiMintConcept from "@/components/PixiMintConcept";
import NftCarousel from "@/components/NftCarousel"; // Import the new NftCarousel component

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useSession();
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
      .channel('home_page_stats')
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

  const mintedPercentage = nftCount !== null ? (nftCount / MAX_NFTS) * 100 : 0;
  const marketCapUsd = (marketCap !== null && solanaPrice !== null) ? (marketCap * solanaPrice).toFixed(2) : null;

  const featuredNftNames = [
    "#426", "#6639", "#9075", "#9724", "#1956", "#3522", "#9925", "#6695", "#2114",
    "#595", "#5739", "#1193" // Added new NFTs here
  ];

  return (
    <div className="min-h-screen flex flex-col bg-home-image text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center p-4 md:p-8">
        {/* NFT Carousel Hero Section */}
        <section className="w-full max-w-6xl mx-auto mb-12">
          <h2 className="text-5xl md:text-7xl font-pixel mb-6 leading-tight text-center text-primary animate-pulse-text">
            Featured PixiNFTs
          </h2>
          <NftCarousel nftNames={featuredNftNames} />
        </section>

        {/* Collection Statistics */}
        <section className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="bg-card border border-border rounded-lg shadow-lg p-6 flex flex-col justify-between">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-pixel text-primary flex items-center gap-2">
                <GalleryVertical className="h-6 w-6" /> Collection Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {loadingStats ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-lg font-sans">
                    <span className="text-foreground">NFTs Minted:</span>
                    <span className="font-bold text-primary">{nftCount !== null ? nftCount : "N/A"} / {MAX_NFTS}</span>
                  </div>
                  <Progress value={mintedPercentage} className="w-full h-4 bg-muted-foreground/20" />
                  <div className="flex justify-between items-center text-lg font-sans">
                    <span className="text-foreground">Completion:</span>
                    <span className="font-bold text-primary">{mintedPercentage.toFixed(2)}%</span>
                  </div>
                  {nftCount !== null && nftCount >= MAX_NFTS && (
                    <div className="p-3 bg-yellow-100 border border-yellow-500 text-yellow-800 rounded-md shadow-sm font-sans text-sm">
                      <p className="font-bold">Minting complete!</p>
                      <p>The 10,000-piece PixiMint Collection is now finalized.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg shadow-lg p-6 flex flex-col justify-between">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-2xl font-pixel text-primary flex items-center gap-2">
                <Sparkles className="h-6 w-6" /> Market Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {loadingStats || solanaPriceLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-lg font-sans">
                    <span className="text-foreground">Total Market Cap:</span>
                    <span className="font-bold text-primary">{marketCap !== null ? `${marketCap.toFixed(2)} SOL` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-sans">
                    <span className="text-foreground">Estimated USD Value:</span>
                    <span className="font-bold text-primary">{marketCapUsd ? `$${marketCapUsd}` : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-sans">
                    <span className="text-foreground">Current SOL Price:</span>
                    <span className="font-bold text-primary">{solanaPrice !== null ? `$${solanaPrice.toFixed(2)}` : "N/A"}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Navigation Buttons */}
        <section className="w-full max-w-4xl flex flex-col sm:flex-row justify-center gap-6 mb-12">
          <Button
            onClick={() => navigate("/gallery")}
            className="flex-1 bg-secondary text-secondary-foreground border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-4 px-6 flex items-center justify-center gap-2"
          >
            <GalleryVertical className="h-5 w-5" /> View Gallery
          </Button>
        </section>

        {/* PixiMint Concept Explanation */}
        <PixiMintConcept />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;