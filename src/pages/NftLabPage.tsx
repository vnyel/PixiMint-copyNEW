import React, { useState, useEffect } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import UploadNFT from "@/components/UploadNFT";
import { useSession } from "@/contexts/SessionContext";
import { getMintedNftCount, MAX_NFTS } from "@/utils/nft";
import { showError } from "@/utils/toast";
import { useSolanaPrice } from "@/hooks/use-solana-price"; // Import the hook

const NftLabPage = () => {
  const { session, loading: sessionLoading } = useSession();
  const [nftCount, setNftCount] = useState<number | null>(null);
  const [collectionFull, setCollectionFull] = useState(false);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice(); // Use the hook

  const fetchNftCount = async () => {
    const count = await getMintedNftCount();
    if (count !== null) {
      setNftCount(count);
      setCollectionFull(count >= MAX_NFTS);
    }
  };

  useEffect(() => {
    fetchNftCount();
  }, []);

  const handleNftMinted = () => {
    fetchNftCount(); // Refresh count after an NFT is minted
  };

  return (
    <div className="min-h-screen flex flex-col bg-nft-lab-image text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center p-8">
        <div className="text-center mb-10 max-w-2xl">
          {nftCount !== null && (
            <p className="text-lg font-bold text-foreground mb-4">
              {nftCount} / {MAX_NFTS} minted
            </p>
          )}
          {collectionFull && (
            <div className="p-4 bg-yellow-100 border border-yellow-500 text-yellow-800 rounded-lg shadow-md mb-8 font-sans">
              <p className="font-bold text-lg">Minting complete!</p>
              <p className="text-sm">The 10,000-piece PixiMint Collection will launch as-is on a major NFT Exchange.</p>
            </div>
          )}
        </div>

        {!sessionLoading && session ? (
          <UploadNFT
            onNftMinted={handleNftMinted}
            solanaPrice={solanaPrice} // Pass solanaPrice
            solanaPriceLoading={solanaPriceLoading} // Pass solanaPriceLoading
          />
        ) : (
          <div className="border border-dashed border-border p-12 rounded-lg text-muted-foreground text-lg shadow-sm font-sans">
            Login to start minting NFTs!
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default NftLabPage;