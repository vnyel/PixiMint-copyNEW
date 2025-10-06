import React, { useState, useEffect } from "react";
import { showError } from "@/utils/toast";

interface SolanaPriceHook {
  solanaPrice: number | null;
  solanaPriceLoading: boolean;
  fetchSolanaPrice: () => Promise<void>;
}

export const useSolanaPrice = (): SolanaPriceHook => {
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [solanaPriceLoading, setSolanaPriceLoading] = useState(true);

  const fetchSolanaPrice = async () => {
    setSolanaPriceLoading(true);
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch Solana price: HTTP error!", response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        setSolanaPrice(data.solana.usd);
      } else {
        console.error("Failed to parse Solana price data: Unexpected response structure.", data);
        showError("Failed to parse Solana price data.");
        setSolanaPrice(null);
      }
    } catch (err: any) {
      console.error("An unexpected error occurred while fetching Solana price:", err);
      showError(`Failed to fetch Solana price: ${err.message}`);
      setSolanaPrice(null);
    } finally {
      setSolanaPriceLoading(false);
    }
  };

  useEffect(() => {
    fetchSolanaPrice(); // Fetch on mount

    const priceInterval = setInterval(fetchSolanaPrice, 60000); // Refresh every 60 seconds

    return () => {
      clearInterval(priceInterval); // Clear interval on unmount
    };
  }, []);

  return { solanaPrice, solanaPriceLoading, fetchSolanaPrice };
};