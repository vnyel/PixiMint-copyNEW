import React, { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';

interface EmojiPickerButtonProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPickerButton = ({ onEmojiSelect }: EmojiPickerButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false); // Close popover after selecting an emoji
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
          aria-label="Open emoji picker"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-lg bg-card">
        <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width={300} height={400} />
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPickerButton;