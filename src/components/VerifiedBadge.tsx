import React from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const VerifiedBadge = () => {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {/* Explicitly wrapping the Badge in a span for the TooltipTrigger */}
        <span>
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white px-1.5 py-0.5 rounded-full flex items-center gap-1 h-5">
            <Check className="h-3 w-3" />
            <span className="sr-only">Verified</span>
          </Badge>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-primary text-primary-foreground p-2 rounded-md font-sans text-xs shadow-lg">
        Verified Minter
      </TooltipContent>
    </Tooltip>
  );
};

export default VerifiedBadge;