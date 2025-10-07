import React, { useState, useEffect } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import { logoutUser } from "@/utils/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, DollarSign, Gem, Store, Wallet as WalletIcon, Trophy, Home, ImagePlus, GalleryVertical, LogIn, UserPlus, User as UserIconL } from "lucide-react"; // Import new icons
import VerifiedBadge from "@/components/VerifiedBadge";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Loader2 } from "lucide-react";

const Header = () => {
  const { session, user, loading } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [marketCap, setMarketCap] = useState<number | null>(null);
  const [marketCapLoading, setLoadingMarketCap] = useState(true);
  const [isCurrentUserVerified, setIsCurrentUserVerified] = useState(false);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  // Solana Wallet Hooks
  const { publicKey, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const fetchMarketCap = async () => {
    setLoadingMarketCap(true);
    try {
      const { data, error } = await supabase
        .from('nfts')
        .select('price_sol');

      if (error) {
        showError(`Failed to fetch market cap: ${error.message}`);
        setMarketCap(null);
        return;
      }

      const totalWorth = data.reduce((sum, nft) => sum + nft.price_sol, 0);
      setMarketCap(totalWorth);
    } catch (err: any) {
      showError(`An unexpected error occurred while fetching market cap: ${err.message}`);
    } finally {
      setLoadingMarketCap(false);
    }
  };

  const fetchCurrentUserProfile = async () => {
    if (user) {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_verified')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error("Error fetching current user verification status:", error.message);
        setIsCurrentUserVerified(false);
      } else {
        setIsCurrentUserVerified(data?.is_verified || false);
      }
    }
  };

  useEffect(() => {
    fetchMarketCap();
    fetchCurrentUserProfile();

    const subscription = supabase
      .channel('header_updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'nfts' }, payload => {
        const newNft = payload.new as { price_sol: number };
        setMarketCap(prevCap => (prevCap !== null ? prevCap + newNft.price_sol : newNft.price_sol));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user?.id}` }, payload => {
        const updatedProfile = payload.new as { is_verified: boolean };
        setIsCurrentUserVerified(updatedProfile.is_verified || false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const marketCapUsd = (marketCap !== null && solanaPrice !== null) ? (marketCap * solanaPrice).toFixed(2) : null;

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background shadow-sm relative">
      {/* Left section: Market Cap */}
      <div className="flex-1 flex justify-start items-center min-w-0 pr-4">
        {marketCapLoading ? (
          <span className="text-sm text-muted-foreground font-sans truncate">Loading Market Cap...</span>
        ) : marketCap !== null ? (
          <p className="text-sm text-foreground font-sans truncate">
            Marketcap: <span className="font-bold">{marketCap.toFixed(2)} SOL</span>
            {marketCapUsd && <span className="text-sm text-muted-foreground ml-2">(${marketCapUsd})</span>}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground font-sans truncate">Market Cap: N/A</p>
        )}
      </div>

      {/* Center section: PixiMint Logo */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-3xl font-pixel text-primary whitespace-nowrap flex items-center gap-2">
        <img src="/favicon.png" alt="PixiMint Logo" className="h-7 w-7" />
        <span className="text-foreground">Pixi</span>
        <span className="text-mint-green">Mint</span>
      </h1>

      {/* Right section: SOL Price, Connect Wallet Button, and Dropdown Menu */}
      <div className="flex-1 flex justify-end items-center min-w-0 pl-4 space-x-4">
        {solanaPriceLoading ? (
          <span className="text-sm text-muted-foreground font-sans whitespace-nowrap">Loading SOL Price...</span>
        ) : solanaPrice !== null ? (
          <p className="text-sm text-foreground font-sans flex items-center gap-1 whitespace-nowrap">
            <DollarSign className="h-4 w-4 text-green-500" />
            SOL Price: <span className="font-bold">${solanaPrice.toFixed(2)}</span>
          </p>
        ) : (
          <p className="text-sm text-muted-foreground font-sans whitespace-nowrap">SOL Price: N/A</p>
        )}

        {/* Permanent Connect Wallet Button */}
        <Button
          variant="outline"
          className="h-10 px-4 border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-150 ease-in-out shadow-md flex items-center gap-2"
          onClick={() => setVisible(true)}
        >
          <WalletIcon className="h-5 w-5" />
          {connected && publicKey ? (
            <span className="font-sans text-sm">
              {publicKey.toBase58().substring(0, 6)}...{publicKey.toBase58().slice(-6)}
            </span>
          ) : (
            <span className="font-sans text-sm">Connect Wallet</span>
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-150 ease-in-out shadow-md">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card text-card-foreground border border-border rounded-lg shadow-lg font-sans">
            <DropdownMenuItem onClick={() => navigate("/")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/" ? "font-bold text-primary" : ""}`}>
              <Home className="h-4 w-4" /> Home
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/nft-lab")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/nft-lab" ? "font-bold text-primary" : ""}`}>
              <ImagePlus className="h-4 w-4" /> Mint NFT
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/gallery")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/gallery" ? "font-bold text-primary" : ""}`}>
              <GalleryVertical className="h-4 w-4" /> Gallery
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/marketplace")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/marketplace" ? "font-bold text-blue-500" : ""}`}>
              <Store className="h-4 w-4 text-blue-500" /> Marketplace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/pixi-tokens")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/pixi-tokens" ? "font-bold text-primary" : ""}`}>
              <Gem className="h-4 w-4 text-mint-green" /> Pixi Tokens
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/leaderboard")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/leaderboard" ? "font-4 w-4 text-yellow-500" : ""}`}>
              <Trophy className="h-4 w-4 text-yellow-500" /> Leaderboard
            </DropdownMenuItem>
            {session && user?.user_metadata?.username && (
              <DropdownMenuItem onClick={() => navigate(`/profile/${user.user_metadata.username}`)} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center justify-between ${location.pathname === `/profile/${user.user_metadata.username}` ? "font-bold text-primary" : ""}`}>
                <UserIconL className="h-4 w-4" /> My Profile
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            {!loading && (
              session ? (
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
                  <LogIn className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => navigate("/login")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/login" ? "font-bold text-primary" : ""}`}>
                    <LogIn className="h-4 w-4" /> Login
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/register")} className={`cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2 ${location.pathname === "/register" ? "font-bold text-primary" : ""}`}>
                    <UserPlus className="h-4 w-4" /> Register
                  </DropdownMenuItem>
                </>
              )
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setVisible(true)} className="cursor-pointer hover:bg-accent hover:text-accent-foreground flex items-center gap-2">
              <WalletIcon className="h-4 w-4" /> Connect Wallet
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;