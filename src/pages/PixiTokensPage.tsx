/** @jsxImportSource react */
import React, { useState, useEffect } from "react"; // Changed import to include useState and useEffect
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { Loader2, Wallet, Gem } from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SOLANA_CONNECTION } from '@/integrations/solana/config';
import { Profile } from "@/types/nft";
import { useSolanaPrice } from "@/hooks/use-solana-price";

interface TokenPackage {
  tokens: number;
  solPrice: number;
}

const tokenPackages: TokenPackage[] = [
  { tokens: 1, solPrice: 0.1 },
  { tokens: 10, solPrice: 1.0 },
  { tokens: 50, solPrice: 5.0 },
];

const PixiTokensPage = () => {
  const { user: currentUser, session } = useSession();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const { solanaPrice } = useSolanaPrice(); // For USD conversion

  const PIXI_MINT_WALLET_ADDRESS = new PublicKey("VCvpAXWgKF3YgK9MCAcZEFQ1uTCc7ekYUWAnFYxhKFx"); // Replaced with your actual Pixi Mint wallet address

  const fetchUserProfile = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (error) {
      showError(`Failed to fetch profile: ${error.message}`);
      setUserProfile(null);
    } else {
      setUserProfile(data as Profile);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();
  }, [currentUser, session]);

  // Effect to update solana_public_key in profile when wallet connects
  useEffect(() => {
    const updateSolanaPublicKey = async () => {
      if (currentUser && publicKey && connected && userProfile && userProfile.solana_public_key !== publicKey.toBase58()) {
        const { error } = await supabase
          .from('profiles')
          .update({ solana_public_key: publicKey.toBase58() })
          .eq('id', currentUser.id);

        if (error) {
          console.error("Failed to update Solana public key in profile:", error.message);
        } else {
          setUserProfile(prev => prev ? { ...prev, solana_public_key: publicKey.toBase58() } : null);
          console.log("Solana public key updated in profile.");
        }
      }
    };
    updateSolanaPublicKey();
  }, [currentUser, publicKey, connected, userProfile]);


  const handlePurchaseTokens = async (pkg: TokenPackage) => {
    if (!publicKey || !connected || !currentUser) {
      showError("Please connect your Phantom Wallet and ensure you are logged in.");
      return;
    }

    setTransactionLoading(true);
    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: PIXI_MINT_WALLET_ADDRESS,
          lamports: pkg.solPrice * LAMPORTS_PER_SOL,
        })
      );

      const { blockhash } = await SOLANA_CONNECTION.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, SOLANA_CONNECTION);
      await SOLANA_CONNECTION.confirmTransaction(signature, 'confirmed');

      // Update user's Pixi Tokens and Solana Public Key in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update({
          pixi_tokens: (userProfile?.pixi_tokens || 0) + pkg.tokens,
          solana_public_key: publicKey.toBase58(), // Ensure public key is saved/updated
        })
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        showError(`Failed to update Pixi Tokens in database: ${error.message}`);
        // Consider a rollback or manual intervention if the transaction went through but DB update failed
        return;
      }

      setUserProfile(data as Profile);
      showSuccess(`Successfully purchased ${pkg.tokens} Pixi Tokens!`);

    } catch (error: any) {
      console.error("Solana transaction failed:", error);
      showError(`Transaction failed: ${error.message || "Unknown error"}`);
    } finally {
      setTransactionLoading(false);
    }
  };

  const pixiTokensUsdValue = userProfile?.pixi_tokens !== undefined && solanaPrice !== null
    ? (userProfile.pixi_tokens * 0.1 * solanaPrice).toFixed(2)
    : null;

  return (
    <div className="min-h-screen flex flex-col bg-pixi-tokens-image text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center p-8">
        <h2 className="text-5xl font-pixel text-primary mb-12 text-center tracking-tight">
          Get Pixi Tokens
        </h2>

        <div className="w-full max-w-3xl space-y-10">
          <Card className="bg-card border border-border rounded-lg shadow-lg p-8 text-center">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-3xl font-pixel text-primary flex items-center justify-center gap-3">
                <Gem className="h-8 w-8 text-mint-green" /> Your Pixi Tokens
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
              ) : currentUser ? (
                <>
                  <p className="text-5xl font-bold text-foreground mb-3">
                    {userProfile?.pixi_tokens !== undefined ? userProfile.pixi_tokens : "N/A"}
                  </p>
                  <p className="text-lg text-muted-foreground">
                    1 NFT Mint = 1 Pixi Token
                  </p>
                  {pixiTokensUsdValue && (
                    <p className="text-md text-muted-foreground mt-3">
                      Estimated Value: ~${pixiTokensUsdValue}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg text-muted-foreground">Please log in to view your tokens.</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border border-border rounded-lg shadow-lg p-8">
            <CardHeader className="p-0 mb-8 text-center">
              <CardTitle className="text-3xl font-pixel text-primary mb-3">
                Purchase Pixi Tokens
              </CardTitle>
              <CardDescription className="text-muted-foreground text-lg">
                Connect your Phantom Wallet to buy Pixi Tokens with Solana.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 space-y-8">
              <div className="flex justify-center">
                <WalletMultiButton className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-lg py-3 px-6 rounded-lg shadow-md flex items-center gap-2" />
              </div>

              {connected && publicKey && currentUser ? (
                <div className="space-y-6">
                  <p className="text-center text-muted-foreground">
                    Connected: <span className="font-mono text-foreground">{publicKey.toBase58().substring(0, 6)}...{publicKey.toBase58().slice(-6)}</span>
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tokenPackages.map((pkg) => (
                      <Button
                        key={pkg.tokens}
                        onClick={() => handlePurchaseTokens(pkg)}
                        className="bg-mint-green text-black border border-mint-green rounded-lg hover:bg-mint-green/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-5 flex flex-col h-auto whitespace-normal"
                        disabled={transactionLoading}
                      >
                        <span className="text-xl font-bold">{pkg.tokens} Pixi Tokens</span>
                        <span className="text-base mt-1">{pkg.solPrice.toFixed(1)} SOL</span>
                        {solanaPrice && (
                          <span className="text-xs text-gray-700 mt-1">~${(pkg.solPrice * solanaPrice).toFixed(2)} USD</span>
                        )}
                      </Button>
                    ))}
                  </div>
                  {transactionLoading && (
                    <div className="flex justify-center items-center mt-6">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="ml-2 text-primary">Processing transaction...</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground">
                  Connect your wallet to see purchase options.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PixiTokensPage;