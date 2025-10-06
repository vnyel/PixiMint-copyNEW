import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";

export interface NftRarity {
  tier: 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
  price: number;
  diamondColor: 'Orange' | 'Purple' | 'Blue' | 'Green' | 'Gray';
  backgroundColorClass: string; // Tailwind class for background color
}

const rarityTiers = [
  { tier: 'Legendary', chance: 1, minPrice: 7.01, maxPrice: 10.00, diamondColor: 'Orange', backgroundColorClass: 'bg-orange-200' },
  { tier: 'Epic', chance: 4, minPrice: 4.51, maxPrice: 7.00, diamondColor: 'Purple', backgroundColorClass: 'bg-purple-200' },
  { tier: 'Rare', chance: 12, minPrice: 1.51, maxPrice: 4.50, diamondColor: 'Blue', backgroundColorClass: 'bg-blue-200' },
  { tier: 'Uncommon', chance: 30, minPrice: 0.51, maxPrice: 1.50, diamondColor: 'Green', backgroundColorClass: 'bg-green-200' },
  { tier: 'Common', chance: 53, minPrice: 0.01, maxPrice: 0.50, diamondColor: 'Gray', backgroundColorClass: 'bg-gray-200' },
];

export const assignRarityAndPrice = (): NftRarity => {
  const roll = Math.random() * 100;
  let cumulativeChance = 0;

  for (const tierData of rarityTiers) {
    cumulativeChance += tierData.chance;
    if (roll <= cumulativeChance) {
      const price = parseFloat((Math.random() * (tierData.maxPrice - tierData.minPrice) + tierData.minPrice).toFixed(2));
      return {
        tier: tierData.tier,
        price: price,
        diamondColor: tierData.diamondColor,
        backgroundColorClass: tierData.backgroundColorClass,
      };
    }
  }
  // Fallback to common if for some reason no tier is matched (shouldn't happen with correct chances)
  const commonTier = rarityTiers[rarityTiers.length - 1];
  const price = parseFloat((Math.random() * (commonTier.maxPrice - commonTier.minPrice) + commonTier.minPrice).toFixed(2));
  return {
    tier: commonTier.tier,
    price: price,
    diamondColor: commonTier.diamondColor,
    backgroundColorClass: commonTier.backgroundColorClass,
  };
};

export const uploadNftImage = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;
  const filePath = `public/${fileName}`;

  const { data, error } = await supabase.storage
    .from('nft_images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    showError(`Image upload failed: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('nft_images')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

export const uploadAvatar = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExt}`; // Consistent name for avatar
  const filePath = `${fileName}`; // No 'public/' prefix for avatars bucket

  // Delete existing avatar if any
  const { data: existingFiles, error: listError } = await supabase.storage
    .from('avatars')
    .list(userId, { search: 'avatar.' }); // Search for files starting with 'avatar.' in user's folder

  if (listError) {
    console.error("Error listing existing avatars:", listError.message);
    // Continue with upload even if listing fails
  } else if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filesToDelete);
    if (deleteError) {
      console.error("Error deleting old avatars:", deleteError.message);
    }
  }

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Upsert to replace if file name is the same
    });

  if (error) {
    showError(`Avatar upload failed: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

export const uploadBannerImage = async (file: File, userId: string): Promise<string | null> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/banner.${fileExt}`; // Consistent name for banner
  const filePath = `${fileName}`;

  // Delete existing banner if any
  const { data: existingFiles, error: listError } = await supabase.storage
    .from('profile_banners')
    .list(userId, { search: 'banner.' });

  if (listError) {
    console.error("Error listing existing banners:", listError.message);
  } else if (existingFiles && existingFiles.length > 0) {
    const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from('profile_banners')
      .remove(filesToDelete);
    if (deleteError) {
      console.error("Error deleting old banners:", deleteError.message);
    }
  }

  const { data, error } = await supabase.storage
    .from('profile_banners')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    showError(`Banner upload failed: ${error.message}`);
    return null;
  }

  const { data: publicUrlData } = supabase.storage
    .from('profile_banners')
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};


export const getUniqueRandomNftNumber = async (): Promise<number | null> => {
  const { data: existingNfts, error } = await supabase
    .from('nfts')
    .select('name'); // Only fetch the name column

  if (error) {
    showError(`Failed to fetch existing NFT names: ${error.message}`);
    return null;
  }

  const usedNumbers = new Set<number>();
  existingNfts.forEach(nft => {
    const match = nft.name.match(/^#(\d+)$/);
    if (match && match[1]) {
      usedNumbers.add(parseInt(match[1], 10));
    }
  });

  if (usedNumbers.size >= MAX_NFTS) {
    return null; // Collection is full
  }

  let randomNumber: number;
  do {
    randomNumber = Math.floor(Math.random() * MAX_NFTS) + 1; // 1 to MAX_NFTS
  } while (usedNumbers.has(randomNumber));

  return randomNumber;
};

export const getMintedNftCount = async (): Promise<number | null> => {
  const { count, error } = await supabase
    .from('nfts')
    .select('*', { count: 'exact' });

  if (error) {
    showError(`Failed to fetch NFT count: ${error.message}`);
    return null;
  }
  return count || 0;
};

export const toggleLikeNft = async (nftId: string, userId: string, isLiked: boolean): Promise<boolean> => {
  console.log(`Attempting to ${isLiked ? 'unlike' : 'like'} NFT ${nftId} by user ${userId}`);
  if (isLiked) {
    // User wants to unlike
    const { error } = await supabase
      .from('nft_likes')
      .delete()
      .eq('nft_id', nftId)
      .eq('user_id', userId);

    if (error) {
      console.error(`Failed to unlike NFT ${nftId}:`, error.message);
      showError(`Failed to unlike NFT: ${error.message}`);
      return false;
    }
    showSuccess("NFT unliked!");
    return true;
  } else {
    // User wants to like
    const { error } = await supabase
      .from('nft_likes')
      .insert({ nft_id: nftId, user_id: userId });

    if (error) {
      console.error(`Failed to like NFT ${nftId}:`, error.message);
      showError(`Failed to like NFT: ${error.message}`);
      return false;
    }
    showSuccess("NFT liked!");
    return true;
  }
};

export const checkIfUserLikedNft = async (nftId: string, userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('nft_likes')
    .select('id')
    .eq('nft_id', nftId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is expected
    console.error("Error checking if user liked NFT:", error.message);
    return false;
  }
  return !!data;
};


export const MAX_NFTS = 10000;