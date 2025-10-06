import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Send, ArrowLeft, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Profile } from '@/types/nft';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from '@/contexts/SessionContext';
import { showError } from '@/utils/toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import VerifiedBadge from '@/components/VerifiedBadge';
import EmojiPickerButton from './EmojiPickerButton'; // Import the new component

interface ChatWindowProps {
  onClose: () => void;
  recipient: Profile | null;
  setRecipient: (recipient: Profile | null) => void;
  onMessagesRead: () => void;
  onBack: () => void;
}

interface Message {
  id: string; // This will be the DB ID, or a tempId if pending
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  status?: 'pending' | 'sent' | 'failed'; // New status field
}

const ChatWindow = ({ onClose, recipient, setRecipient, onMessagesRead, onBack }: ChatWindowProps) => {
  const { user: currentUser } = useSession();
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch historical messages
  useEffect(() => {
    if (!currentUser || !recipient) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${recipient.id}),and(sender_id.eq.${recipient.id},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        showError(`Failed to fetch messages: ${error.message}`);
      } else {
        setMessages(data || []);
      }
      setLoadingMessages(false);
      onMessagesRead();
    };

    fetchMessages();
  }, [currentUser, recipient, onMessagesRead]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUser || !recipient) return;

    const channelId = `chat_room_${[currentUser.id, recipient.id].sort().join('_')}`;
    const chatChannel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${recipient.id}.and(sender_id=eq.${currentUser.id})`
        },
        (payload) => {
          const newMessageFromDb = payload.new as Message;
          setMessages((prevMessages) => {
            // Find and update the optimistic message, or add if not found
            const existingIndex = prevMessages.findIndex(
              (msg) =>
                msg.status === 'pending' && // Only target pending messages
                msg.sender_id === newMessageFromDb.sender_id &&
                msg.receiver_id === newMessageFromDb.receiver_id &&
                msg.content === newMessageFromDb.content
            );

            if (existingIndex !== -1) {
              const updatedMessages = [...prevMessages];
              updatedMessages[existingIndex] = { ...newMessageFromDb, status: 'sent' }; // Replace with DB message, set status
              return updatedMessages;
            }
            // If not found (e.g., if it was a message from another session or a very fast update), just add it.
            return [...prevMessages, { ...newMessageFromDb, status: 'sent' }];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}.and(sender_id=eq.${recipient.id})`
        },
        (payload) => {
          setMessages((prevMessages) => [...prevMessages, { ...(payload.new as Message), status: 'sent' }]);
          onMessagesRead();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
    };
  }, [currentUser, recipient, onMessagesRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (messageInput.trim() && currentUser && recipient) {
      const tempId = crypto.randomUUID(); // Generate a temporary client-side ID
      const newMessage: Message = {
        id: tempId, // Use tempId as the primary ID for optimistic message
        sender_id: currentUser.id,
        receiver_id: recipient.id,
        content: messageInput.trim(),
        created_at: new Date().toISOString(), // Use client-side timestamp for optimistic display
        status: 'pending',
      };

      setMessages((prevMessages) => [...prevMessages, newMessage]);
      setMessageInput(""); // Clear input immediately

      const { error } = await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: recipient.id,
        content: newMessage.content, // Use content from optimistic message
      });

      if (error) {
        showError(`Failed to send message: ${error.message}`);
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.id === tempId ? { ...msg, status: 'failed' } : msg
          )
        );
      }
      // Real-time listener will handle updating the status to 'sent' and replacing tempId with actual DB ID
    }
  };

  const handleClose = () => {
    onClose();
    setRecipient(null);
    setMessages([]);
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessageInput((prevInput) => prevInput + emoji);
  };

  return (
    <Card className="fixed bottom-28 left-8 z-50 w-80 h-96 flex flex-col bg-card text-card-foreground border border-border rounded-lg shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          {recipient && (
            <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to chats">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {recipient ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={recipient.avatar_url || undefined} alt={`${recipient.username}'s avatar`} />
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserIcon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <CardTitle className="text-lg font-pixel text-primary flex items-center gap-1">
                @{recipient.username}
                {recipient.is_verified && <VerifiedBadge />}
              </CardTitle>
            </div>
          ) : (
            <CardTitle className="text-lg font-pixel text-primary flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Chat
            </CardTitle>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose} aria-label="Close chat">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-4 overflow-y-auto text-sm text-muted-foreground">
        {loadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <p>Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center">No messages yet. Start the conversation!</p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-2 rounded-lg ${
                    msg.sender_id === currentUser?.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  } ${msg.status === 'pending' ? 'opacity-70' : ''} ${msg.status === 'failed' ? 'bg-destructive text-destructive-foreground' : ''}`}
                >
                  <p className="text-base">{msg.content}</p>
                  <span className="block text-xs opacity-75 mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {msg.status === 'pending' && ' (Sending...)'}
                    {msg.status === 'failed' && ' (Failed)'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="p-4 border-t border-border flex items-center gap-2">
        <EmojiPickerButton onEmojiSelect={handleEmojiSelect} /> {/* Add the emoji picker button */}
        <Input
          placeholder={recipient ? `Message @${recipient.username}...` : "Type your message..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-grow border border-input rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans"
          disabled={!recipient}
        />
        <Button
          size="icon"
          onClick={handleSendMessage}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          disabled={!recipient || !messageInput.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ChatWindow;