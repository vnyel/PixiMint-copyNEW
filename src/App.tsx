import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import HomePage from "./pages/HomePage";
import NftLabPage from "./pages/NftLabPage";
import GalleryPage from "./pages/GalleryPage";
import MarketplacePage from "./pages/MarketplacePage";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProfilePage from "./pages/Profile";
import PixiTokensPage from "./pages/PixiTokensPage";
import LeaderboardPage from "./pages/LeaderboardPage"; // Import new page
import { SessionContextProvider, useSession } from "./contexts/SessionContext";
import { SolanaWalletContextProvider } from "./contexts/SolanaWalletContext";
import CustomCursor from "./components/CustomCursor";
import ChatButton from "./components/ChatButton";
import ChatWindow from "./components/ChatWindow";
import ChatList from "./components/ChatList";
import { Profile } from "./types/nft";
import { supabase } from "./integrations/supabase/client";
import { MessageSquare, ArrowLeft, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

const AppContent = () => {
  const { user: currentUser, loading: sessionLoading } = useSession();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<Profile | null>(null);
  const [chatView, setChatView] = useState<'list' | 'conversation'>('list');
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const location = useLocation();

  const openChatWithRecipient = (recipient: Profile) => {
    setChatRecipient(recipient);
    setChatView('conversation');
    setIsChatOpen(true);
  };

  const handleMessagesRead = () => {
    setUnreadMessagesCount(0);
  };

  const handleBackToChatList = () => {
    setChatRecipient(null);
    setChatView('list');
  };

  useEffect(() => {
    if (!currentUser || sessionLoading) return;

    const channel = supabase
      .channel(`unread_messages_for_${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${currentUser.id}`
        },
        (payload) => {
          if (!isChatOpen || (chatRecipient && payload.new.sender_id !== chatRecipient.id)) {
            setUnreadMessagesCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, sessionLoading, isChatOpen, chatRecipient]);

  const isOnAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <>
      <CustomCursor />
      {!sessionLoading && (
        <>
          <ChatButton onClick={() => {
            setIsChatOpen(!isChatOpen);
            if (!isChatOpen) setChatView('list');
          }} unreadCount={unreadMessagesCount} />

          {isChatOpen && (
            <Card className="fixed bottom-28 left-8 z-50 w-80 h-96 flex flex-col bg-card text-card-foreground border border-border rounded-lg shadow-xl">
              <div className="flex flex-row items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2">
                  {chatView === 'conversation' && (
                    <Button variant="ghost" size="icon" onClick={handleBackToChatList} aria-label="Back to chats">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <h3 className="text-lg font-pixel text-primary flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {chatView === 'list' ? "Chats" : (chatRecipient ? `@${chatRecipient.username}` : "Chat")}
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setIsChatOpen(false);
                  setChatRecipient(null);
                  setChatView('list');
                }} aria-label="Close chat">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-grow overflow-y-auto">
                {chatView === 'list' ? (
                  <ChatList onSelectChat={openChatWithRecipient} currentUser={currentUser} isOnAuthPage={isOnAuthPage} />
                ) : (
                  <ChatWindow
                    onClose={() => {
                      setIsChatOpen(false);
                      setChatRecipient(null);
                      setChatView('list');
                    }}
                    recipient={chatRecipient}
                    setRecipient={setChatRecipient}
                    onMessagesRead={handleMessagesRead}
                    onBack={handleBackToChatList}
                  />
                )}
              </div>
            </Card>
          )}
        </>
      )}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/nft-lab" element={<NftLabPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/profile/:username"
          element={<ProfilePage openChatWithRecipient={openChatWithRecipient} />}
        />
        <Route path="/pixi-tokens" element={<PixiTokensPage />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} /> {/* New route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SessionContextProvider>
            <SolanaWalletContextProvider>
              <AppContent />
            </SolanaWalletContextProvider>
          </SessionContextProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;