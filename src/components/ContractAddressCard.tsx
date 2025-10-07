import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface ContractAddressCardProps {
  contractAddress: string;
}

const ContractAddressCard = ({ contractAddress }: ContractAddressCardProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(contractAddress);
      showSuccess("Contract Address copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy contract address:", err);
      showError("Failed to copy address. Please try again.");
    }
  };

  // Shorten the address for display
  const displayAddress = `${contractAddress.substring(0, 6)}...${contractAddress.slice(-6)}`;

  return (
    <Card className="bg-card/80 backdrop-blur-sm border border-border rounded-lg shadow-lg p-4 w-full text-card-foreground font-sans text-center">
      <CardContent className="p-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/pill-icon.png" alt="Pill Icon" className="h-8 w-8" />
          <span className="text-lg font-bold text-primary">Copy CA:</span>
          <span className="text-base text-foreground font-mono">{displayAddress}</span>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          className="h-9 w-9 border border-input rounded-lg hover:bg-accent hover:text-accent-foreground transition-all duration-150 ease-in-out shadow-sm"
          aria-label="Copy contract address"
        >
          <Copy className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default ContractAddressCard;