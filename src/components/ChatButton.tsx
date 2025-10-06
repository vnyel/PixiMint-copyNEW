import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Import Badge

interface ChatButtonProps {
  onClick: () => void;
  unreadCount: number; // New prop for unread message count
}

const ChatButton = ({ onClick, unreadCount }: ChatButtonProps) => {
  return (
    <div className="fixed bottom-8 left-8 z-50">
      <Button
        onClick={onClick}
        className="w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center relative"
        aria-label="Open chat"
      >
        <MessageSquare className="h-8 w-8" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs font-bold">
            {unreadCount}
          </Badge>
        )}
      </Button>
    </div>
  );
};

export default ChatButton;