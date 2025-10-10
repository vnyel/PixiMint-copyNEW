import React, { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NftGallery from "@/components/NftGallery";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import ScrollProgressIndicator from "@/components/ScrollProgressIndicator";

// Define RGB values for the colors
const WHITE = [255, 255, 255];
const LIGHT_BLUE = [173, 216, 230]; // A common light blue
const LAVENDER = [230, 230, 250]; // A common lavender

// Helper to interpolate between two colors
const interpolateColor = (color1: number[], color2: number[], factor: number) => {
  const result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
  }
  return `rgb(${result[0]}, ${result[1]}, ${result[2]})`;
};

const GalleryPage = () => {
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  const handleScroll = useCallback(() => {
    const scrollY = window.scrollY;
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollProgress = totalHeight > 0 ? Math.min(1, Math.max(0, scrollY / totalHeight)) : 0;

    let newColor;
    if (scrollProgress <= 0.5) {
      // From white to light blue (first half of scroll)
      const factor = scrollProgress / 0.5; // Scale factor from 0 to 1
      newColor = interpolateColor(WHITE, LIGHT_BLUE, factor);
    } else {
      // From light blue to lavender (second half of scroll)
      const factor = (scrollProgress - 0.5) / 0.5; // Scale factor from 0 to 1
      newColor = interpolateColor(LIGHT_BLUE, LAVENDER, factor);
    }
    document.body.style.backgroundColor = newColor;
  }, []);

  useEffect(() => {
    // Set initial background color to white
    document.body.style.backgroundColor = `rgb(${WHITE[0]}, ${WHITE[1]}, ${WHITE[2]})`;

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Call handleScroll once on mount to set the correct color if the page is already scrolled
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      // Reset body background color when component unmounts to avoid affecting other pages
      document.body.style.backgroundColor = '';
    };
  }, [handleScroll]);

  return (
    <div className="min-h-screen flex flex-col text-foreground font-sans">
      <Header />
      <ScrollProgressIndicator />
      <main className="flex-grow flex flex-col items-center p-8 pt-12">
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