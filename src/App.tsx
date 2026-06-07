/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Discover from './components/Discover';
import Feed from './components/Feed';
import Chat from './components/Chat';
import Calls from './components/Calls';
import { NotificationsList, PushToast } from './components/Notifications';
import Profile from './components/Profile';
import Login from './components/Login';
import { Storage } from './lib/db';
import { CallSession } from './types';
import { auth, isFirebaseActive } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("discover");
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [showNotificationsList, setShowNotificationsList] = useState(false);
  const [forcedRoomId, setForcedRoomId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const syncCurrentUser = () => {
    const me = Storage.getMe();
    setCurrentUser(me);
    setIsLoadingAuth(false);
  };

  useEffect(() => {
    if (isFirebaseActive) {
      const unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (user) {
          const me = Storage.getMe();
          if (!me || me.id !== user.uid) {
            const updatedProfile = await Storage.createOrUpdateMe({
              id: user.uid,
              displayName: user.displayName || me?.displayName || "Gossip Bee 🐝",
              email: user.email || me?.email || "explorationbee@gmail.com",
              photoURL: user.photoURL || me?.photoURL || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
              bio: me?.bio || "Curious botanical explorer, looking for sweet honeycomb connections, cafe talks, and green garden designs! 🌸☕️⛰️",
              location: me?.location || "San Jose, CA",
              age: me?.age || 25,
              gender: me?.gender || "Female",
              lookingFor: me?.lookingFor || "Everyone",
              interests: me?.interests || ["Coffee", "Art & Design", "Tech", "Bee Conservation", "Yoga"],
              personality: me?.personality || "Campaigner (ENFP)"
            });
            setCurrentUser(updatedProfile);
          } else {
            setCurrentUser(me);
          }
          setIsLoadingAuth(false);
        } else {
          setCurrentUser(null);
          setIsLoadingAuth(false);
        }
      });
      return () => unsubAuth();
    } else {
      const me = Storage.getMe();
      if (me) {
        setCurrentUser(me);
      } else {
        setCurrentUser(null);
      }
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    const handleIncomingCall = (e: Event) => {
      const customEvent = e as CustomEvent<CallSession>;
      setActiveCall(customEvent.detail);
    };

    window.addEventListener("honeybee-ringing", handleIncomingCall);
    return () => window.removeEventListener("honeybee-ringing", handleIncomingCall);
  }, []);

  const handleStartCall = async (userId: string, callType: "audio" | "video") => {
    const session = await Storage.startCall(userId, callType);
    setActiveCall(session);
  };

  const handleRouteToMatchesChat = (roomId: string) => {
    setForcedRoomId(roomId);
    setActiveTab("chats");
  };

  if (isLoadingAuth) {
    return (
      <div className="w-full h-screen bg-[#0A0A0A] flex flex-col justify-center items-center gap-6">
        <div className="relative flex justify-center items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-rose-500"></div>
          <div className="absolute text-2xl font-bold text-rose-500 animate-pulse">🐝</div>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold font-sans text-stone-100 tracking-wider">Syncing Honeybee Hive</h2>
          <p className="text-xs font-mono text-rose-500/85 mt-1 uppercase tracking-widest animate-pulse">Establishing secure connection...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLoginSuccess={syncCurrentUser} />;
  }

  return (
    <div className="relative w-full h-full min-h-screen bg-[#0A0A0A] flex justify-center items-center">
      
      {/* Dynamic Push Toast Alerts */}
      <PushToast />

      {/* Main Framework Shell */}
      <Layout 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // Auto close panels
          setShowNotificationsList(false);
        }}
        onOpenNotifications={() => setShowNotificationsList(true)}
      >
        
        {/* Render Tab Contents */}
        {activeTab === "discover" && (
          <Discover onOpenChat={handleRouteToMatchesChat} />
        )}

        {activeTab === "feed" && (
          <Feed onOpenDirectChat={handleRouteToMatchesChat} />
        )}

        {activeTab === "chats" && (
          <Chat 
            forcedRoomId={forcedRoomId}
            onClearForcedRoom={() => setForcedRoomId(null)}
            onStartCall={handleStartCall}
          />
        )}

        {activeTab === "profile" && (
          <Profile />
        )}

        {/* Global Notifications Panel layer overlay inside layout */}
        {showNotificationsList && (
          <NotificationsList 
            onClose={() => setShowNotificationsList(false)} 
            onOpenRoom={handleRouteToMatchesChat}
          />
        )}

      </Layout>

      {/* High priority full scale Peer call overlays panel */}
      {activeCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 bg-neutral-950/80 backdrop-blur-md">
          <div className="relative w-full max-w-sm h-full md:h-[840px] rounded-none md:rounded-[40px] overflow-hidden border-none md:border-8 md:border-neutral-900 bg-neutral-950 shadow-2xl">
            <Calls 
              session={activeCall} 
              onEndCall={() => {
                setActiveCall(null);
                setActiveTab("chats");
              }} 
            />
          </div>
        </div>
      )}

    </div>
  );
}
