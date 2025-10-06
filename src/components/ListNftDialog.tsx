import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NFT } from "@/types/nft";
import { useSession } from "@/contexts/SessionContext";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { listNft } from "@/utils/marketplace";
import { Loader2 } from "lucide-react";

interface ListNftDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userOwnedNfts: NFT[]; // NFTs owned by the current user
  onNftListed: () => void;
}

const ListNftDialog = ({ isOpen, onClose, userOwnedNfts, onNftListed }: ListNftDialogProps) => {
  const { user: currentUser } = useSession();
  const [selectedNftId, setSelectedNftId] = useState<string | undefined>(undefined);
  const [listingPrice, setListingPrice] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [selectedNftDetails, setSelectedNftDetails] = useState<NFT | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSelectedNftId(undefined);
      setListingPrice("");
      setSelectedNftDetails(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedNftId) {
      const nft = userOwnedNfts.find(n => n.id === selectedNftId);
      setSelectedNftDetails(nft || null);
      if (nft) {
        setListingPrice(nft.price_sol.toString()); // Default to minted price
      }
    } else {
      setSelectedNftDetails(null);
      setListingPrice("");
    }
  }, [selectedNftId, userOwnedNfts]);

  const handleListNft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedNftId || !listingPrice) {
      showError("Please select an NFT and enter a listing price.");
      return;
    }

    const price = parseFloat(listingPrice);
    if (isNaN(price) || price <= 0) {
      showError("Please enter a valid positive number for the listing price.");
      return;
    }

    setLoading(true);
    const success = await listNft(selectedNftId, currentUser.id, price);
    setLoading(false);

    if (success) {
      onNftListed();
      onClose();
    }
  };

  const unlistedNfts = userOwnedNfts.filter(nft => !nft.is_listed);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card text-card-foreground border border-border rounded-lg shadow-lg font-sans">
        <DialogHeader>
          <DialogTitle className="text-2xl font-pixel text-primary">List NFT for Sale</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select an NFT you own and set its listing price in SOL.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleListNft} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nft-select" className="font-sans text-foreground">Select NFT</Label>
            <Select value={selectedNftId} onValueChange={setSelectedNftId} disabled={loading || unlistedNfts.length === 0}>
              <SelectTrigger id="nft-select" className="w-full border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans">
                <SelectValue placeholder={unlistedNfts.length > 0 ? "Choose an NFT" : "No unlisted NFTs available"} />
              </SelectTrigger>
              <SelectContent className="font-sans border border-border rounded-lg shadow-md">
                {unlistedNfts.map(nft => (
                  <SelectItem key={nft.id} value={nft.id}>
                    {nft.name} (Minted Price: {nft.price_sol} SOL)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedNftDetails && (
            <div className="grid gap-2">
              <Label htmlFor="listing-price" className="font-sans text-foreground">Listing Price (SOL)</Label>
              <Input
                id="listing-price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Enter price in SOL"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                className="col-span-3 border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
                disabled={loading}
                required
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground border border-primary rounded-lg hover:bg-primary/90 transition-all duration-150 ease-in-out shadow-md font-pixel text-lg py-2 px-4"
              disabled={loading || !selectedNftId || !listingPrice || parseFloat(listingPrice) <= 0}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              {loading ? "Listing..." : "List NFT"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ListNftDialog;