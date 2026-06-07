import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Rss, 
  MessageCircle, 
  User, 
  Bell, 
  Sparkles,
  Heart
} from 'lucide-react';
import { Storage } from '../lib/db';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNotifications: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, onOpenNotifications }: LayoutProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Sync notification unreads
    const syncNotifs = () => {
      const notifs = Storage.getNotifications();
      setUnreadCount(notifs.filter(n => !n.read).length);
    };
    syncNotifs();
    const unsubscribe = Storage.registerListener(syncNotifs);

    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-neutral-200 flex items-center justify-center overflow-x-hidden selection:bg-rose-500 selection:text-white">
      
      {/* Centered responsive container envelope representing a clean modern application viewport */}
      <div className="w-full max-w-xl md:max-w-2xl h-screen max-h-screen bg-[#0A0A0A] flex flex-col relative shadow-[0_0_50px_rgba(244,63,94,0.06)] border-x border-white/5 animate-fade-in" id="mobile-container-shell">
        
        {/* Nav Header */}
        <header className="px-5 py-4 border-b border-white/10 bg-[#0D0D0D]/95 backdrop-blur-md flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-1.5 select-none hover:opacity-90 active:scale-98 transition">
            <span className="font-serif italic font-extrabold text-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent tracking-tight">
              honeybee
            </span>
            <div className="w-4 h-4 bg-rose-500 rounded-sm rotate-45 flex items-center justify-center border border-neutral-950 shadow-sm shadow-rose-500/20">
              <span className="text-[9px] text-white font-bold -rotate-45">b</span>
            </div>
          </div>

          {/* Header Right Trigger Notifications */}
          <button 
            onClick={onOpenNotifications}
            className="relative p-2 hover:bg-white/5 rounded-xl transition text-neutral-300 hover:text-rose-450 focus:outline-none"
            id="btn-header-notifs"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-rose-500/35">
                {unreadCount}
              </span>
            )}
          </button>
        </header>

        {/* Content body wrapper */}
        <main className="flex-1 flex flex-col min-h-0 relative bg-[#0A0A0A] overflow-y-auto overflow-x-hidden">
          {children}
        </main>

        {/* Persistent bottom phone nav */}
        <nav className="border-t border-white/10 bg-[#0D0D0D]/95 backdrop-blur-md py-2 px-3 flex items-center justify-around z-40 select-none">
          <button 
            onClick={() => setActiveTab("discover")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${activeTab === 'discover' ? 'text-rose-500 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            id="tab-discover"
          >
            <Compass className="w-5 h-5 transition-transform active:scale-90" />
            <span className="text-[10px]">Discover</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("feed")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${activeTab === 'feed' ? 'text-rose-500 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            id="tab-feed"
          >
            <Rss className="w-5 h-5 transition-transform active:scale-90" />
            <span className="text-[10px]">Feed</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("chats")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${activeTab === 'chats' ? 'text-rose-500 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            id="tab-chats"
          >
            <MessageCircle className="w-5 h-5 transition-transform active:scale-90" />
            <span className="text-[10px]">Chats</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all ${activeTab === 'profile' ? 'text-rose-500 font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            id="tab-profile"
          >
            <User className="w-5 h-5 transition-transform active:scale-90" />
            <span className="text-[10px]">Profile</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
