import React, { useState, useEffect, useCallback, useRef } from "react";
import { showError } from "@/utils/toast";

interface SolanaPriceHook {
  solanaPrice: number | null;
  solanaPriceLoading: boolean;
  fetchSolanaPrice: () => Promise<void>;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

export const useSolanaPrice = (): SolanaPriceHook => {
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [solanaPriceLoading, setSolanaPriceLoading] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchSolanaPriceInternal = useCallback(async (attempt = 0) => {
    // Clear any existing retry timeout before starting a new fetch
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setSolanaPriceLoading(true); // Set loading true for this fetch attempt
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch Solana price (attempt ${attempt + 1}): HTTP error!`, response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      const data = await response.json();
      if (data.solana && data.solana.usd) {
        setSolanaPrice(data.solana.usd);
        setSolanaPriceLoading(false); // Successfully fetched, stop loading
      } else {
        console.error(`Failed to parse Solana price data (attempt ${attempt + 1}): Unexpected response structure.`, data);
        throw new Error("Failed to parse Solana price data: Unexpected response structure.");
      }
    } catch (err: any) {
      console.error(`An unexpected error occurred while fetching Solana price (attempt ${attempt + 1}):`, err);
      setSolanaPrice(null); // Clear price on error

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
        console.log(`Retrying Solana price fetch in ${delay / 1000} seconds (Attempt ${attempt + 2}/${MAX_RETRIES + 1})...`);
        timeoutRef.current = setTimeout(() => {
          fetchSolanaPriceInternal(attempt + 1); // Re-call itself with incremented attempt count
        }, delay);
      } else {
        showError(`Failed to fetch Solana price after ${MAX_RETRIES + 1} attempts: ${err.message}`);
        setSolanaPriceLoading(false); // Stop loading after max retries
      }
    }
  }, []); // No dependencies for fetchSolanaPriceInternal, as 'attempt' is passed as an argument

  // Public facing function to trigger a fetch, always starting from attempt 0
  const fetchSolanaPrice = useCallback(() => {
    fetchSolanaPriceInternal(0);
  }, [fetchSolanaPriceInternal]);

  useEffect(() => {
    fetchSolanaPrice(); // Initial fetch on mount

    const priceInterval = setInterval(() => {
      fetchSolanaPrice(); // Trigger a new fetch sequence every 60 seconds
    }, 60000);

    return () => {
      clearInterval(priceInterval); // Clear interval on unmount
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Clear any pending retry timeout
      }
    };
  }, [fetchSolanaPrice]); // fetchSolanaPrice is a dependency

  return { solanaPrice, solanaPriceLoading, fetchSolanaPrice };
};