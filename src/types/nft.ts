export interface NFT {
  id: string;
  creator_id: string; // Original minter
  owner_id: string; // Current owner
  name: string; // e.g., "#1"
  image_url: string;
  rarity: 'Legendary' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
  price_sol: number;
  rarity_color: 'Orange' | 'Purple' | 'Blue' | 'Green' | 'Gray'; // Stored as string, e_g_, 'Orange'
  created_at: string;
  likes_count: number; // New field for total likes
  is_liked_by_current_user?: boolean; // New transient field to indicate if the current user liked it

  // Marketplace specific fields (optional, for when an NFT is listed)
  listing_id?: string;
  list_price_sol?: number;
  is_listed?: boolean;
  seller_id?: string;
}

export interface Profile {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  updated_at?: string;
  description?: string; // New field
  website_url?: string; // New field
  twitter_url?: string; // New field
  is_verified?: boolean; // New field for verification status
  pixi_tokens?: number; // New field for Pixi Tokens balance
  solana_public_key?: string; // New field for Solana wallet public key
  banner_url?: string; // New field for banner image URL
}