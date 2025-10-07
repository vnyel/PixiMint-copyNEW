import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { Profile } from "@/types/nft";
import { Loader2, Trophy, User as UserIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import VerifiedBadge from "./VerifiedBadge";
import { useSolanaPrice } from "@/hooks/use-solana-price";

interface LeaderboardEntry {
  rank: number;
  profile: Profile;
  totalNftWorth: number;
  totalNftWorthUsd: string | null;
  nftCount: number; // Added: Count of NFTs minted by the user
}

const LeaderboardTable = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        // Fetch all NFTs to calculate total worth and count per owner
        const { data: nftsData, error: nftsError } = await supabase
          .from('nfts')
          .select('owner_id, price_sol');

        if (nftsError) {
          showError(`Failed to fetch NFTs for leaderboard: ${nftsError.message}`);
          setLoading(false);
          return;
        }

        const userWorthMap = new Map<string, number>();
        const userNftCountMap = new Map<string, number>(); // New map for NFT count

        nftsData?.forEach(nft => {
          userWorthMap.set(nft.owner_id, (userWorthMap.get(nft.owner_id) || 0) + nft.price_sol);
          userNftCountMap.set(nft.owner_id, (userNftCountMap.get(nft.owner_id) || 0) + 1); // Increment NFT count
        });

        // Sort users by total NFT worth and take only the top 10
        const sortedUserIds = Array.from(userWorthMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10) // Limit to top 10 users
          .map(([userId]) => userId);

        if (sortedUserIds.length === 0) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        // Fetch profiles for the top users (public data only)
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_verified') // Select only public fields
          .in('id', sortedUserIds);

        if (profilesError) {
          showError(`Failed to fetch profiles for leaderboard: ${profilesError.message}`);
          setLoading(false);
          return;
        }

        const profilesMap = new Map<string, Profile>();
        profilesData?.forEach(p => profilesMap.set(p.id, p as Profile));

        const leaderboardEntries: LeaderboardEntry[] = [];
        let rank = 1;
        for (const userId of sortedUserIds) {
          const profile = profilesMap.get(userId);
          const totalWorth = userWorthMap.get(userId) || 0;
          const nftCount = userNftCountMap.get(userId) || 0; // Get NFT count

          if (profile) {
            const totalNftWorthUsd = solanaPrice !== null ? (totalWorth * solanaPrice).toFixed(2) : null;
            leaderboardEntries.push({
              rank,
              profile,
              totalNftWorth: totalWorth,
              totalNftWorthUsd,
              nftCount, // Include NFT count
            });
            rank++;
          }
        }
        setLeaderboard(leaderboardEntries);

      } catch (error: any) {
        showError(`An unexpected error occurred while fetching leaderboard: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [solanaPrice]); // Re-fetch if solanaPrice changes to update USD values

  if (loading || solanaPriceLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm font-sans">
        No users on the leaderboard yet. Mint some NFTs to join!
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-card border border-border rounded-lg shadow-lg p-6">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="w-[80px] text-primary font-pixel text-base">Rank</TableHead>
            <TableHead className="text-primary font-pixel text-base">User</TableHead>
            <TableHead className="text-right text-primary font-pixel text-base">NFTs Minted</TableHead> {/* New TableHead */}
            <TableHead className="text-right text-primary font-pixel text-base">Total NFT Worth</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaderboard.map((entry) => (
            <TableRow key={entry.profile.id} className="hover:bg-accent/50 transition-colors">
              <TableCell className="font-medium text-lg font-sans">
                {entry.rank === 1 && <Trophy className="inline-block h-5 w-5 text-yellow-500 mr-2" />}
                {entry.rank}
              </TableCell>
              <TableCell>
                <Link to={`/profile/${entry.profile.username}`} className="flex items-center gap-3 p-2 -ml-2 hover:bg-accent/50 rounded-md transition-colors w-fit">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={entry.profile.avatar_url || undefined} alt={`${entry.profile.username}'s avatar`} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <UserIcon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-sans text-foreground font-medium text-lg flex items-center gap-1">
                    @{entry.profile.username}
                    {entry.profile.is_verified && <VerifiedBadge />}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-right text-lg font-bold font-sans">
                {entry.nftCount} {/* Display NFT count */}
              </TableCell>
              <TableCell className="text-right text-lg font-bold font-sans">
                {entry.totalNftWorth.toFixed(2)} SOL
                {entry.totalNftWorthUsd && <span className="text-sm text-muted-foreground ml-2">(${entry.totalNftWorthUsd})</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LeaderboardTable;