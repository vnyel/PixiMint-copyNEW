import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { NFT, Profile } from "@/types/nft";
import NftCard from "@/components/NftCard";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Loader2, ExternalLink, Twitter, User as UserIcon, Edit, UserPlus, UserMinus, Trophy, MessageSquare, Gem, Store } from "lucide-react"; // Import Store icon
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useSession } from "@/contexts/SessionContext";
import ProfileSettings from "@/components/ProfileSettings";
import { followUser, unfollowUser, isFollowing, getFollowCounts } from "@/utils/profile";
import FollowsListDialog from "@/components/FollowsListDialog";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSolanaPrice } from "@/hooks/use-solana-price";
import { toggleLikeNft } from "@/utils/nft";
import ListNftDialog from "@/components/ListNftDialog"; // Import ListNftDialog
import { delistNft } from "@/utils/marketplace"; // Import delistNft

interface ProfilePageProps {
  openChatWithRecipient: (recipient: Profile) => void;
}

const ProfilePage = ({ openChatWithRecipient }: ProfilePageProps) => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userOwnedNfts, setUserOwnedNfts] = useState<NFT[]>([]); // Changed from userNfts to userOwnedNfts
  const [loading, setLoading] = useState(true);
  const [totalNftWorth, setTotalNftWorth] = useState(0);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUserFollowing, setIsUserFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersDialog, setShowFollowersDialog] = useState(false);
  const [showFollowingDialog, setShowFollowingDialog] = useState(false);
  const [isLeader, setIsLeader] = useState(false);
  const [userRank, setUserRank] = useState<number | null>(null);
  const { solanaPrice, solanaPriceLoading } = useSolanaPrice();
  const [isListingNft, setIsListingNft] = useState(false); // State for ListNftDialog

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      // Determine if the current user is viewing their own profile
      const isOwner = currentUser && currentUser.user_metadata.username === username;

      // Conditionally select pixi_tokens, solana_public_key, and banner_url only if it's the owner's profile
      let selectColumns = `
        id,
        username,
        first_name,
        last_name,
        avatar_url,
        updated_at,
        description,
        website_url,
        twitter_url,
        is_verified,
        banner_url
      `;
      if (isOwner) {
        selectColumns += `, pixi_tokens, solana_public_key`;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(selectColumns)
        .eq('username', username)
        .single();

      if (profileError) {
        showError(`Failed to fetch profile: ${profileError.message}`);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      // Fetch NFTs owned by this profile, and their listing status
      const { data: nftsData, error: nftsError } = await supabase
        .from('nfts')
        .select(`
          *,
          nft_likes(user_id),
          marketplace_listings(id, list_price_sol, is_listed, seller_id)
        `)
        .eq('owner_id', profileData.id) // Fetch by owner_id
        .order('created_at', { ascending: false });

      if (nftsError) {
        showError(`Failed to fetch NFTs: ${nftsError.message}`);
        setLoading(false);
        return;
      }

      const processedNfts: NFT[] = (nftsData || []).map((nft: any) => ({
        ...nft,
        is_liked_by_current_user: currentUser ? nft.nft_likes.some((like: { user_id: string }) => like.user_id === currentUser.id) : false,
        listing_id: nft.marketplace_listings.length > 0 ? nft.marketplace_listings[0].id : undefined,
        list_price_sol: nft.marketplace_listings.length > 0 ? nft.marketplace_listings[0].list_price_sol : undefined,
        is_listed: nft.marketplace_listings.length > 0 ? nft.marketplace_listings[0].is_listed : false,
        seller_id: nft.marketplace_listings.length > 0 ? nft.marketplace_listings[0].seller_id : undefined,
      }));

      setUserOwnedNfts(processedNfts);
      const worth = (processedNfts || []).reduce((sum, nft) => sum + nft.price_sol, 0);
      setTotalNftWorth(worth);

      // Fetch follow counts
      const counts = await getFollowCounts(profileData.id);
      if (counts) {
        setFollowerCount(counts.followers);
        setFollowingCount(counts.following);
      }

      // Check if current user is following this profile
      if (currentUser && currentUser.id !== profileData.id) {
        const followingStatus = await isFollowing(currentUser.id, profileData.id);
        setIsUserFollowing(followingStatus);
      } else {
        setIsUserFollowing(true); // User is "following" themselves
      }

      // Determine league ranking and if this user is the leader
      const { data: allNfts, error: allNftsError } = await supabase
        .from('nfts')
        .select('owner_id, price_sol'); // Use owner_id for total worth calculation

      if (allNftsError) {
        console.error("Error fetching all NFTs for league ranking check:", allNftsError.message);
        setIsLeader(false);
        setUserRank(null);
      } else {
        const userStats = new Map<string, number>();
        allNfts?.forEach(nft => {
          userStats.set(nft.owner_id, (userStats.get(nft.owner_id) || 0) + nft.price_sol);
        });

        const sortedUsers = Array.from(userStats.entries()).sort((a, b) => b[1] - a[1]);
        
        const rankIndex = sortedUsers.findIndex(([userId]) => userId === profileData.id);
        if (rankIndex !== -1) {
          setUserRank(rankIndex + 1);
          setIsLeader(rankIndex === 0);
        } else {
          setUserRank(null);
          setIsLeader(false);
        }
      }

    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [username, currentUser]);

  useEffect(() => {
    fetchProfileData();

    // Real-time listener for NFT ownership changes or listing changes
    const channel = supabase
      .channel(`profile_updates_${username}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nfts', filter: `owner_id=eq.${profile?.id}` }, payload => {
        console.log("Profile NFT update:", payload);
        fetchProfileData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketplace_listings', filter: `seller_id=eq.${profile?.id}` }, payload => {
        console.log("Profile listing update:", payload);
        fetchProfileData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProfileData, profile?.id, username]);


  const handleProfileUpdated = (updatedProfile: Profile) => {
    setProfile(updatedProfile);
  };

  const handleFollowToggle = async () => {
    if (!currentUser || !profile) return;

    setLoading(true);
    let success = false;
    if (isUserFollowing) {
      success = await unfollowUser(currentUser.id, profile.id);
      if (success) setFollowerCount(prev => Math.max(0, prev - 1));
    } else {
      success = await followUser(currentUser.id, profile.id);
      if (success) setFollowerCount(prev => prev + 1);
    }
    if (success) {
      setIsUserFollowing(!isUserFollowing);
    }
    setLoading(false);
  };

  const handleLikeToggle = async (nftId: string, isLiked: boolean) => {
    if (!currentUser) {
      showError("You must be logged in to like NFTs.");
      return;
    }
    const success = await toggleLikeNft(nftId, currentUser.id, isLiked);
    if (success) {
      setUserOwnedNfts(prevNfts => prevNfts.map(nft => {
        if (nft.id === nftId) {
          return {
            ...nft,
            is_liked_by_current_user: !isLiked,
            likes_count: isLiked ? nft.likes_count - 1 : nft.likes_count + 1
          };
        }
        return nft;
      }));
    }
  };

  const handleSendMessageClick = () => {
    if (profile) {
      openChatWithRecipient(profile);
    }
  };

  const handleDelistNft = async (listingId: string) => {
    if (!currentUser || !profile) return;
    setLoading(true);
    const success = await delistNft(listingId, currentUser.id);
    if (success) {
      fetchProfileData(); // Re-fetch data to update listing status
    }
    setLoading(false);
  };

  const isOwner = currentUser && profile && currentUser.id === profile.id;
  const totalNftWorthUsd = solanaPrice !== null ? (totalNftWorth * solanaPrice).toFixed(2) : null;

  if (loading || solanaPriceLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
        <Header />
        <main className="flex-grow flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm">
            Profile not found.
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const listedNfts = userOwnedNfts.filter(nft => nft.is_listed);
  const unlistedNfts = userOwnedNfts.filter(nft => !nft.is_listed);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      <Header />
      <main className="flex-grow flex flex-col items-center">
        {profile.banner_url && (
          <div className="w-full h-48 md:h-64 bg-muted overflow-hidden relative">
            <img src={profile.banner_url} alt={`${profile.username}'s banner`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div> {/* Overlay for text readability */}
          </div>
        )}
        <div className={`text-center mb-10 max-w-2xl w-full ${profile.banner_url ? '-mt-20 md:-mt-24 z-10' : 'mt-8'}`}>
          <div className="relative inline-block mb-4">
            <Avatar className="h-32 w-32 border-4 border-primary shadow-md">
              <AvatarImage src={profile.avatar_url || undefined} alt={`${profile.username}'s avatar`} />
              <AvatarFallback className="bg-muted text-muted-foreground text-6xl">
                <UserIcon className="h-16 w-16" />
              </AvatarFallback>
            </Avatar>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-0 right-0 bg-background rounded-full border border-border shadow-sm hover:bg-accent"
                onClick={() => setIsEditingProfile(true)}
              >
                <Edit className="h-4 w-4 text-primary" />
              </Button>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <h2 className="text-4xl font-pixel text-primary">@{profile.username}</h2>
            {isLeader && (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Trophy className="h-7 w-7 text-yellow-500" />
                </TooltipTrigger>
                <TooltipContent className="bg-primary text-primary-foreground p-2 rounded-md font-sans text-xs shadow-lg">
                  King of the Mint
                </TooltipContent>
              </Tooltip>
            )}
            {profile.is_verified && <VerifiedBadge />}
          </div>
          {userRank !== null && (
            <p className="text-lg text-foreground mb-2">League Ranking: <span className="font-bold">#{userRank}</span></p>
          )}
          {profile.description && (
            <p className="text-md text-foreground mb-4 max-w-prose mx-auto">{profile.description}</p>
          )}
          <div className="flex justify-center items-center space-x-4 mb-4">
            {profile.website_url && (
              <a
                href={profile.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline flex items-center gap-1 text-sm"
              >
                Website <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {profile.twitter_url && (
              <a
                href={profile.twitter_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:underline flex items-center gap-1 text-sm"
              >
                Twitter <Twitter className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="flex justify-center items-center space-x-6 mb-4">
            <p
              className="text-lg text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setShowFollowersDialog(true)}
            >
              Followers: <span className="font-bold">{followerCount}</span>
            </p>
            <p
              className="text-lg text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => setShowFollowingDialog(true)}
            >
              Following: <span className="font-bold">{followingCount}</span>
            </p>
          </div>
          {/* Conditionally display Pixi Tokens only if it's the owner's profile */}
          {isOwner && profile.pixi_tokens !== undefined && (
            <p className="text-lg text-foreground flex items-center justify-center gap-2 mb-2">
              <Gem className="h-5 w-5 text-mint-green" /> Pixi Tokens: <span className="font-bold">{profile.pixi_tokens}</span>
            </p>
          )}
          <p className="text-lg text-foreground">Total Owned NFTs: <span className="font-bold">{userOwnedNfts.length}</span></p>
          <p className="text-lg text-foreground">
            Total NFT Worth: <span className="font-bold">{totalNftWorth.toFixed(2)} SOL</span>
            {totalNftWorthUsd && <span className="text-sm text-muted-foreground ml-2">(${totalNftWorthUsd})</span>}
          </p>

          {!isOwner && currentUser && (
            <div className="flex justify-center gap-4 mt-6">
              <Button
                onClick={handleFollowToggle}
                className="bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4 flex items-center gap-2"
                disabled={loading}
              >
                {isUserFollowing ? (
                  <>
                    <UserMinus className="h-5 w-5" /> Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" /> Follow
                  </>
                )}
              </Button>
              <Button
                onClick={handleSendMessageClick}
                className="bg-secondary text-secondary-foreground border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4 flex items-center gap-2"
                disabled={loading}
              >
                <MessageSquare className="h-5 w-5" /> Send Message
              </Button>
            </div>
          )}
        </div>

        {isOwner && (
          <div className="w-full max-w-4xl mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-3xl font-pixel text-primary">My Owned NFTs</h3>
              <Button
                onClick={() => setIsListingNft(true)}
                className="bg-mint-green text-black border border-mint-green rounded-lg hover:bg-mint-green/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4 flex items-center gap-2"
              >
                <Store className="h-5 w-5" /> List NFT
              </Button>
            </div>

            {userOwnedNfts.length === 0 ? (
              <div className="text-center text-muted-foreground text-lg p-8 border border-dashed border-border rounded-lg shadow-sm">
                You don't own any NFTs yet. Mint one or buy from the marketplace!
              </div>
            ) : (
              <div className="p-6 rounded-lg shadow-xl"> {/* Removed bg-black */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userOwnedNfts.map((nft) => (
                    <div key={nft.id} className="relative">
                      <NftCard
                        nft={nft}
                        creatorUsername={profile.username} // Display original minter's username
                        creatorIsVerified={profile.is_verified}
                        creatorProfile={profile}
                        solanaPrice={solanaPrice}
                        onLikeToggle={handleLikeToggle}
                      />
                      {nft.is_listed ? (
                        <div className="absolute top-6 right-6 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md flex items-center gap-1">
                          <Store className="h-3 w-3" /> Listed for {nft.list_price_sol} SOL
                          {isOwner && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-0 ml-2 text-white hover:text-gray-200"
                              onClick={() => nft.listing_id && handleDelistNft(nft.listing_id)}
                              disabled={loading}
                            >
                              (Delist)
                            </Button>
                          )}
                        </div>
                      ) : (
                        isOwner && (
                          <div className="absolute top-6 right-6 bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                            Not Listed
                          </div>
                        )
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!isOwner && userOwnedNfts.length > 0 && (
          <div className="w-full max-w-4xl mt-8">
            <h3 className="text-3xl font-pixel text-primary mb-6 text-center">NFTs Owned by @{profile.username}</h3>
            <div className="p-6 rounded-lg shadow-xl"> {/* Removed bg-black */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userOwnedNfts.map((nft) => (
                  <NftCard
                    key={nft.id}
                    nft={nft}
                    creatorUsername={profile.username}
                    creatorIsVerified={profile.is_verified}
                    creatorProfile={profile}
                    solanaPrice={solanaPrice}
                    onLikeToggle={handleLikeToggle}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      {profile && (
        <>
          <ProfileSettings
            isOpen={isEditingProfile}
            onClose={() => setIsEditingProfile(false)}
            currentProfile={profile}
            onProfileUpdated={handleProfileUpdated}
          />
          <FollowsListDialog
            isOpen={showFollowersDialog}
            onClose={() => setShowFollowersDialog(false)}
            userId={profile.id}
            type="followers"
          />
          <FollowsListDialog
            isOpen={showFollowingDialog}
            onClose={() => setShowFollowingDialog(false)}
            userId={profile.id}
            type="following"
          />
          <ListNftDialog
            isOpen={isListingNft}
            onClose={() => setIsListingNft(false)}
            userOwnedNfts={userOwnedNfts}
            onNftListed={fetchProfileData} // Re-fetch profile data to update NFT listing status
          />
        </>
      )}
      <Footer />
    </div>
  );
};

export default ProfilePage;