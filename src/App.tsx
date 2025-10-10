import React, { useState, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner"; // Keep only Sonner
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
import LeaderboardPage from "./pages/LeaderboardPage";
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
import SplashScreen from "@/components/SplashScreen"; // Import SplashScreen

const queryClient = new QueryClient();

// New wrapper component to manage the global splash screen
const GlobalSplashScreenWrapper = () => {
  const location = useLocation();
  const [showSplash, setShowSplash] = useState(true);
  const [currentPathname, setCurrentPathname] = useState(location.pathname);

  useEffect(() => {
    // Reset splash state and path when location changes
    if (location.pathname !== currentPathname) {
      setShowSplash(true);
      setCurrentPathname(location.pathname);
    }
  }, [location.pathname, currentPathname]);

  useEffect(() => {
    if (showSplash) {
      const duration = location.pathname === "/" ? 2000 : 1000; // 2 seconds for home, 1 second for others
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [showSplash, location.pathname]); // Depend on location.pathname to re-evaluate duration

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} duration={location.pathname === "/" ? 2000 : 1000} />}
      {!showSplash && (
        <SessionContextProvider>
          <SolanaWalletContextProvider>
            <AppContent />
          </SolanaWalletContextProvider>
        </SessionContextProvider>
      )}
    </>
  );
};


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
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <GlobalSplashScreenWrapper />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;