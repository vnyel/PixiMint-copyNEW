import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useSession } from "@/contexts/SessionContext";
import { assignRarityAndPrice, uploadNftImage, getUniqueRandomNftNumber, MAX_NFTS } from "@/utils/nft";
import { showError, showSuccess } from "@/utils/toast";
import { Diamond, Gem } from "lucide-react"; // Import Gem icon
import { supabase } from "@/integrations/supabase/client";
import NftCard from "./NftCard"; // Import NftCard
import { NFT, Profile } from "@/types/nft"; // Import NFT and Profile types
import { Loader2 } from "lucide-react"; // For loading state

interface UploadNFTProps {
  onNftMinted: () => void;
  solanaPrice: number | null;
  solanaPriceLoading: boolean;
}

const UploadNFT = ({ onNftMinted, solanaPrice, solanaPriceLoading }: UploadNFTProps) => {
  const { user, session } = useSession();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mintedNftInfo, setMintedNftInfo] = useState<NFT | null>(null); // Type as NFT
  const [creatorProfile, setCreatorProfile] = useState<Profile | null>(null); // State for current user's profile
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const fetchCreatorProfile = async () => {
      if (user) {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          showError(`Failed to fetch your profile: ${error.message}`);
          setCreatorProfile(null);
        } else {
          setCreatorProfile(data as Profile);
        }
        setProfileLoading(false);
      } else {
        setCreatorProfile(null);
        setProfileLoading(false);
      }
    };
    fetchCreatorProfile();
  }, [user]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showError("Please upload an image file.");
        setSelectedFile(null);
        setImagePreview(null);
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10 MB limit
        showError("Image size cannot exceed 10MB.");
        setSelectedFile(null);
        setImagePreview(null);
        return;
      }
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setMintedNftInfo(null); // Clear previous minted NFT info
    } else {
      setSelectedFile(null);
      setImagePreview(null);
      setMintedNftInfo(null);
    }
  };

  const pixelateImage = (imageFile: File): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(imageFile);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          showError("Failed to get canvas context for pixelation.");
          resolve(null);
          return;
        }

        const originalWidth = img.width;
        const originalHeight = img.height;
        
        canvas.width = originalWidth;
        canvas.height = originalHeight;

        const targetPixelArtResolution = 64; 
        
        ctx.imageSmoothingEnabled = false;

        ctx.drawImage(img, 0, 0, targetPixelArtResolution, targetPixelArtResolution);

        ctx.drawImage(canvas, 0, 0, targetPixelArtResolution, targetPixelArtResolution, 0, 0, originalWidth, originalHeight);

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            showError("Failed to pixelate image.");
            resolve(null);
          }
        }, 'image/png');
      };
      img.onerror = (error) => {
        showError("Failed to load image for pixelation.");
        console.error("Image load error for pixelation:", error);
        resolve(null);
      };
    });
  };

  const handleMintNFT = async () => {
    if (!user || !selectedFile || !session || !creatorProfile) {
      showError("Please select an image and ensure you are logged in and your profile is loaded.");
      return;
    }

    if ((creatorProfile.pixi_tokens || 0) < 1) {
      showError("You need at least 1 Pixi Token to mint an NFT. Purchase more from the Pixi Tokens page!");
      return;
    }

    setLoading(true);
    try {
      const nftNumber = await getUniqueRandomNftNumber();
      if (nftNumber === null) {
        showError("Minting is complete! The collection has reached its maximum capacity or an error occurred.");
        setLoading(false);
        return;
      }

      const pixelatedBlob = await pixelateImage(selectedFile);
      if (!pixelatedBlob) {
        setLoading(false);
        return;
      }

      const pixelatedFile = new File([pixelatedBlob], `pixelated_${selectedFile.name}`, { type: 'image/png' });

      const pixelatedImageUrl = await uploadNftImage(pixelatedFile, user.id);
      if (!pixelatedImageUrl) {
        setLoading(false);
        return;
      }

      const rarityData = assignRarityAndPrice();
      const nftName = `#${nftNumber}`;

      // Deduct 1 Pixi Token
      const { error: tokenUpdateError } = await supabase
        .from('profiles')
        .update({ pixi_tokens: (creatorProfile.pixi_tokens || 0) - 1 })
        .eq('id', user.id);

      if (tokenUpdateError) {
        showError(`Failed to deduct Pixi Token: ${tokenUpdateError.message}`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('nfts')
        .insert({
          creator_id: user.id,
          owner_id: user.id, // Set owner_id to the current user's ID
          name: nftName,
          image_url: pixelatedImageUrl,
          rarity: rarityData.tier,
          price_sol: rarityData.price,
          rarity_color: rarityData.diamondColor,
        })
        .select()
        .single();

      if (error) {
        showError(`Failed to mint NFT: ${error.message}`);
        // Consider rolling back token deduction if NFT mint fails
        return;
      }

      showSuccess(`NFT "${nftName}" minted successfully! Rarity: ${rarityData.tier}, Price: ${rarityData.price} SOL`);
      setMintedNftInfo({ ...data, is_liked_by_current_user: false }); // Add is_liked_by_current_user for NftCard
      setSelectedFile(null);
      setImagePreview(null);
      onNftMinted();
      // Update local profile state to reflect token deduction
      setCreatorProfile(prev => prev ? { ...prev, pixi_tokens: (prev.pixi_tokens || 0) - 1 } : null);
    } catch (error: any) {
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMintAnother = () => {
    setMintedNftInfo(null);
    setSelectedFile(null);
    setImagePreview(null);
  };

  // NftCard needs a onLikeToggle handler, even if it's a no-op for a newly minted NFT view
  const handleLikeToggle = async (nftId: string, isLiked: boolean) => {
    showError("Please view NFTs in the gallery or profile to like them.");
  };

  if (profileLoading || solanaPriceLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-3xl border border-border rounded-lg shadow-md p-10 bg-card text-card-foreground">
      <CardHeader className="text-center mb-8">
        <CardTitle className="text-5xl font-pixel text-primary mb-4">Mint Your PixiNFT</CardTitle>
        <CardDescription className="text-xl text-muted-foreground font-sans">Upload an image to transform it into a unique 8-bit NFT.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-10">
        {creatorProfile && (
          <p className="text-center text-lg font-bold text-foreground flex items-center justify-center gap-2">
            <Gem className="h-5 w-5 text-mint-green" /> Your Pixi Tokens: {creatorProfile.pixi_tokens !== undefined ? creatorProfile.pixi_tokens : "Loading..."}
          </p>
        )}
        {mintedNftInfo && creatorProfile ? (
          <div className="flex flex-col items-center space-y-6">
            <h3 className="text-3xl font-pixel text-primary mb-4">Your New PixiNFT!</h3>
            <div className="w-full max-w-sm">
              <NftCard
                nft={mintedNftInfo}
                creatorUsername={creatorProfile.username}
                creatorIsVerified={creatorProfile.is_verified}
                creatorProfile={creatorProfile}
                solanaPrice={solanaPrice}
                onLikeToggle={handleLikeToggle} // Pass the handler
              />
            </div>
            <Button
              onClick={handleMintAnother}
              className="bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-xl py-4 px-8"
            >
              Mint Another NFT
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <Label htmlFor="nft-image" className="font-sans text-xl text-foreground block text-left">Upload Image (Max 10MB)</Label>
              <Input
                id="nft-image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 file:text-primary file:bg-secondary file:border-0 file:rounded-md file:font-sans py-3 h-14 text-lg"
                disabled={loading}
              />
            </div>
            {imagePreview && (
              <div className="relative w-full h-96 border border-dashed border-border flex items-center justify-center overflow-hidden rounded-lg bg-muted p-6">
                <img src={imagePreview} alt="Image Preview" className="max-w-full max-h-full object-contain rounded-lg" />
              </div>
            )}
            <Button
              onClick={handleMintNFT}
              className="w-full bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-2xl py-5"
              disabled={!selectedFile || loading || (creatorProfile && (creatorProfile.pixi_tokens || 0) < 1)}
            >
              {loading ? "Minting..." : "Mint NFT (1 Pixi Token)"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UploadNFT;