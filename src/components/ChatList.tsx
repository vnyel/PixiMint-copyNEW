import React, { useState, useEffect } from 'react';
import { MessageSquare, User as UserIcon, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { User } from "@supabase/supabase-js"; // Import User type
import { showError } from '@/utils/toast';
import { Profile } from '@/types/nft';
import VerifiedBadge from './VerifiedBadge';

interface ChatListProps {
  onSelectChat: (recipient: Profile) => void;
  currentUser: User | null; // Pass currentUser
  isOnAuthPage: boolean; // Pass isOnAuthPage flag
}

interface ConversationSummary {
  recipientProfile: Profile;
  lastMessage: string;
  lastMessageTimestamp: string;
  unreadCount: number; // Placeholder for future per-chat unread count
}

const ChatList = ({ onSelectChat, currentUser, isOnAuthPage }: ChatListProps) => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || isOnAuthPage) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const fetchConversations = async () => {
      setLoading(true);
      try {
        // Fetch distinct users current user has messaged or received messages from
        const { data: sentMessages, error: sentError } = await supabase
          .from('messages')
          .select('receiver_id')
          .eq('sender_id', currentUser.id);

        if (sentError) throw sentError;

        const { data: receivedMessages, error: receivedError } = await supabase
          .from('messages')
          .select('sender_id')
          .eq('receiver_id', currentUser.id);

        if (receivedError) throw receivedError;

        const participantIds = new Set<string>();
        sentMessages.forEach(msg => participantIds.add(msg.receiver_id));
        receivedMessages.forEach(msg => participantIds.add(msg.sender_id));

        if (participantIds.size === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, is_verified')
          .in('id', Array.from(participantIds));

        if (profilesError) throw profilesError;

        const profilesMap = new Map<string, Profile>();
        profilesData.forEach(p => profilesMap.set(p.id, p as Profile));

        const conversationSummaries: ConversationSummary[] = [];

        for (const participantId of participantIds) {
          const { data: lastMessageData, error: lastMessageError } = await supabase
            .from('messages')
            .select('content, created_at')
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${participantId}),and(sender_id.eq.${participantId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (lastMessageError && lastMessageError.code !== 'PGRST116') { // PGRST116 means no rows found
            console.error(`Error fetching last message for ${participantId}:`, lastMessageError.message);
            continue;
          }

          const recipientProfile = profilesMap.get(participantId);
          if (recipientProfile) {
            conversationSummaries.push({
              recipientProfile,
              lastMessage: lastMessageData?.content || "No messages yet.",
              lastMessageTimestamp: lastMessageData?.created_at || "",
              unreadCount: 0, // Placeholder
            });
          }
        }

        // Sort conversations by last message timestamp
        conversationSummaries.sort((a, b) => {
          if (!a.lastMessageTimestamp) return 1;
          if (!b.lastMessageTimestamp) return -1;
          return new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime();
        });

        setConversations(conversationSummaries);

      } catch (error: any) {
        showError(`Failed to load chats: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();

    // Real-time listener for new messages to update the list
    const channel = supabase
      .channel(`chat_list_updates_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          const newMessage = payload.new as any;
          // Re-fetch conversations to update the list with the new message
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${currentUser.id}`
        },
        (payload) => {
          // Re-fetch conversations to update the list with the new message
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, isOnAuthPage]);

  if (!currentUser && isOnAuthPage) {
    return (
      <div className="p-4 flex flex-col items-center justify-center h-full text-center text-muted-foreground font-sans">
        <MessageSquare className="h-10 w-10 mb-4" />
        <p className="text-lg font-bold">Login to use the chat.</p>
        <p className="text-sm mt-2">Connect with other PixiMint users!</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-xl font-pixel text-primary mb-4 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> Your Chats
      </h3>
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-center text-muted-foreground">No active conversations. Send a message from a profile!</p>
      ) : (
        <div className="space-y-3">
          {conversations.map((conv) => (
            <div
              key={conv.recipientProfile.id}
              className="flex items-center gap-3 p-3 hover:bg-accent/50 rounded-md transition-colors cursor-pointer"
              onClick={() => onSelectChat(conv.recipientProfile)}
            >
              <Avatar className="h-12 w-12 border border-border">
                <AvatarImage src={conv.recipientProfile.avatar_url || undefined} alt={`${conv.recipientProfile.username}'s avatar`} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserIcon className="h-6 w-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <div className="flex items-center gap-1">
                  <span className="font-sans text-foreground font-medium text-lg">
                    @{conv.recipientProfile.username}
                  </span>
                  {conv.recipientProfile.is_verified && <VerifiedBadge />}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {conv.lastMessage}
                </p>
              </div>
              {/* Future: Add unread badge per conversation */}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatList;