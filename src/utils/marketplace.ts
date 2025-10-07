import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { SOLANA_CONNECTION } from '@/integrations/solana/config';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react'; // Import WalletContextState
import { NFT } from "@/types/nft";

// Fixed PixiMint wallet address for all marketplace sales and fees
const PIXI_MINT_MARKETPLACE_WALLET_ADDRESS = new PublicKey("VCvpAXWgKF3YgK9MCAcZEFQ1uTCc7ekYUWAnFYxhKFx");

export const listNft = async (nftId: string, sellerId: string, priceSol: number, wallet: WalletContextState): Promise<boolean> => {
  console.log("listNft: Initiating listing for NFT:", nftId, "by seller:", sellerId, "at price:", priceSol, "SOL");

  if (!wallet.publicKey || !wallet.connected || !wallet.sendTransaction) {
    console.error("listNft: Wallet not connected or sendTransaction not available.");
    showError("Please connect your Phantom Wallet to list NFTs.");
    return false;
  }

  try {
    // Check if the NFT is already listed
    const { data: existingListing, error: existingListingError } = await supabase
      .from('marketplace_listings')
      .select('id')
      .eq('nft_id', nftId)
      .eq('is_listed', true)
      .single();

    if (existingListingError && existingListingError.code !== 'PGRST116') { // PGRST116 means no rows found
      showError(`Failed to check existing listing: ${existingListingError.message}`);
      return false;
    }

    if (existingListing) {
      showError("This NFT is already listed for sale.");
      return false;
    }

    // Calculate the listing fee
    let feeAmountSol: number;
    if (priceSol <= 0.5) {
      feeAmountSol = 0.01; // 0.01 SOL for NFTs worth 0.5 SOL or less
    } else {
      feeAmountSol = priceSol * 0.025; // 2.5% of the price for NFTs worth more than 0.5 SOL
    }
    console.log(`listNft: Calculated listing fee: ${feeAmountSol} SOL`);

    // 1. Solana Transaction: Transfer the listing fee from seller to PixiMint marketplace address
    console.log(`listNft: Transferring listing fee of ${feeAmountSol} SOL to PixiMint marketplace address: ${PIXI_MINT_MARKETPLACE_WALLET_ADDRESS.toBase58()}`);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: PIXI_MINT_MARKETPLACE_WALLET_ADDRESS,
        lamports: Math.round(feeAmountSol * LAMPORTS_PER_SOL), // Convert SOL to lamports
      })
    );

    console.log("listNft: Getting latest blockhash...");
    const { blockhash } = await SOLANA_CONNECTION.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log("listNft: Sending fee transaction...");
    const signature = await wallet.sendTransaction(transaction, SOLANA_CONNECTION);
    console.log("listNft: Fee transaction sent, signature:", signature);
    await SOLANA_CONNECTION.confirmTransaction(signature, 'confirmed');
    console.log("listNft: Solana fee transaction confirmed.");
    showSuccess(`Marketplace listing fee of ${feeAmountSol} SOL paid successfully!`);

    // 2. Supabase Update: Insert the NFT listing
    console.log("listNft: Inserting NFT listing into Supabase.");
    const { error } = await supabase
      .from('marketplace_listings')
      .insert({
        nft_id: nftId,
        seller_id: sellerId,
        list_price_sol: priceSol,
        is_listed: true,
      });

    if (error) {
      showError(`Failed to list NFT: ${error.message}`);
      return false;
    }

    showSuccess("NFT listed successfully on the marketplace!");
    return true;
  } catch (error: any) {
    console.error("listNft: NFT listing failed with an unexpected error:", error);
    showError(`NFT listing failed: ${error.message || "Unknown error"}. Please ensure you have enough SOL for the listing fee.`);
    return false;
  }
};

export const delistNft = async (listingId: string, sellerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('marketplace_listings')
      .update({ is_listed: false, sold_at: new Date().toISOString() }) // Mark as delisted
      .eq('id', listingId)
      .eq('seller_id', sellerId); // Ensure only the seller can delist

    if (error) {
      showError(`Failed to delist NFT: ${error.message}`);
      return false;
    }

    showSuccess("NFT delisted successfully.");
    return true;
  } catch (error: any) {
    showError(`An unexpected error occurred while delisting NFT: ${error.message}`);
    return false;
  }
};

export const buyNft = async (
  listing: NFT, // The NFT object with listing details
  buyerId: string,
  wallet: WalletContextState // Solana wallet context
): Promise<boolean> => {
  console.log("buyNft: Initiating purchase for NFT:", listing.name, "by buyer:", buyerId);
  if (!wallet.publicKey || !wallet.connected || !wallet.sendTransaction) {
    console.error("buyNft: Wallet not connected or sendTransaction not available.");
    showError("Please connect your Phantom Wallet to buy NFTs.");
    return false;
  }
  if (!listing.listing_id || listing.list_price_sol === undefined) {
    console.error("buyNft: Listing information is incomplete.", listing);
    showError("Listing information is incomplete.");
    return false;
  }
  if (buyerId === listing.seller_id) {
    console.warn("buyNft: Buyer is the seller. Cannot buy own NFT.");
    showError("You cannot buy your own NFT.");
    return false;
  }

  try {
    // 1. Solana Transaction: Transfer SOL from buyer to the fixed PixiMint marketplace address
    console.log("buyNft: Transferring", listing.list_price_sol, "SOL to fixed PixiMint marketplace address:", PIXI_MINT_MARKETPLACE_WALLET_ADDRESS.toBase58());

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: PIXI_MINT_MARKETPLACE_WALLET_ADDRESS, // Use the fixed address
        lamports: listing.list_price_sol * LAMPORTS_PER_SOL,
      })
    );

    console.log("buyNft: Getting latest blockhash...");
    const { blockhash } = await SOLANA_CONNECTION.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    console.log("buyNft: Sending transaction...");
    const signature = await wallet.sendTransaction(transaction, SOLANA_CONNECTION);
    console.log("buyNft: Transaction sent, signature:", signature);
    await SOLANA_CONNECTION.confirmTransaction(signature, 'confirmed');
    console.log("buyNft: Solana transaction confirmed.");
    showSuccess("Solana transaction successful! Updating ownership...");

    // 2. Supabase Update: Update NFT ownership and listing status
    console.log("buyNft: Updating NFT ownership in Supabase for NFT ID:", listing.id, "to owner:", buyerId);
    const { error: nftUpdateError } = await supabase
      .from('nfts')
      .update({ owner_id: buyerId })
      .eq('id', listing.id);

    if (nftUpdateError) {
      console.error("buyNft: Failed to update NFT ownership in Supabase:", nftUpdateError.message);
      showError(`Failed to update NFT ownership: ${nftUpdateError.message}`);
      return false;
    }
    console.log("buyNft: NFT ownership updated successfully.");

    console.log("buyNft: Updating marketplace listing status for listing ID:", listing.listing_id);
    const { error: listingUpdateError } = await supabase
      .from('marketplace_listings')
      .update({
        is_listed: false,
        sold_at: new Date().toISOString(),
        buyer_id: buyerId,
      })
      .eq('id', listing.listing_id);

    if (listingUpdateError) {
      console.error("buyNft: Failed to update listing status in Supabase:", listingUpdateError.message);
      showError(`Failed to update listing status: ${listingUpdateError.message}`);
      return false;
    }
    console.log("buyNft: Marketplace listing status updated successfully.");

    showSuccess(`Successfully purchased ${listing.name}!`);
    return true;
  } catch (error: any) {
    console.error("buyNft: NFT purchase failed with an unexpected error:", error);
    showError(`NFT purchase failed: ${error.message || "Unknown error"}`);
    return false;
  }
};