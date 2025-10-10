import React from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NftGallery from "@/components/NftGallery";
import { useSolanaPrice } from "@/hooks/use-solana-price"; // Import the new hook
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator"; // Import the new component

const GalleryPage = () => {
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice(); // Use the new hook

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />
      <ScrollProgressIndicator /> {/* Add the scroll progress indicator here */}
      <main className="flex-grow flex flex-col items-center p-8 pt-12"> {/* Added pt-12 to account for the fixed header and progress bar */}
        <h2 className="text-4xl font-pixel text-primary mb-10 text-center">PixiMint Gallery</h2>
        <div className="w-full max-w-4xl">
          <NftGallery solanaPrice={solanaPrice} solanaPriceLoading={solanaPriceLoading} />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default GalleryPage;