/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Sparkles, 
  MessageCircle, 
  Heart, 
  MessageSquare, 
  Video, 
  Award, 
  ShieldCheck, 
  ChevronLeft,
  X,
  CheckCheck
} from 'lucide-react';
import { Storage } from '../lib/db';
import { NotificationItem } from '../types';

interface NotificationsProps {
  onClose: () => void;
  onOpenRoom: (roomId: string) => void;
}

export function NotificationsList({ onClose, onOpenRoom }: NotificationsProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadNotifications = () => {
    setNotifications(Storage.getNotifications());
  };

  useEffect(() => {
    loadNotifications();
    const unsub = Storage.registerListener(loadNotifications);
    return () => unsub();
  }, []);

  const handleMarkAllRead = () => {
    Storage.markAllNotificationsRead();
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // If it's a message or match, open appropriate chatroom immediately
    if (item.senderId && (item.type === "message" || item.type === "match" || item.type === "call")) {
      const me = Storage.getMe();
      if (me) {
        const roomId = [me.id, item.senderId].sort().join("_");
        onOpenRoom(roomId);
        onClose();
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "match":
        return <Sparkles className="w-4 h-4 text-rose-500 fill-rose-500/10" />;
      case "message":
        return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case "like":
        return <Heart className="w-4 h-4 text-red-400 fill-red-400/15" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-teal-400" />;
      case "call":
        return <Video className="w-4 h-4 text-green-400" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-rose-500" />;
    }
  };

  return (
    <div className="absolute inset-0 bg-[#0A0A0A] z-50 flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Header bar */}
      <div className="px-4 py-3.5 border-b border-white/10 bg-[#0D0D0D] flex items-center justify-between">
        <button 
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white transition"
          id="btn-close-notifs-panel"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>
        <div className="text-xs font-serif text-white italic tracking-tight">Notification Vault</div>
        
        {notifications.length > 0 ? (
          <button 
            onClick={handleMarkAllRead}
            className="text-[10px] text-rose-400 hover:text-rose-500 flex items-center gap-1 font-bold cursor-pointer"
            title="Mark all as read"
            id="btn-mark-all-read"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark read</span>
          </button>
        ) : (
          <div className="w-5"></div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {notifications.length > 0 ? (
          notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={`w-full flex gap-3 text-left p-3.5 border rounded-xl transition-all relative ${notif.read ? 'bg-[#141414]/40 border-white/5 text-neutral-400' : 'bg-[#141414] border-white/15 text-neutral-200 shadow'}`}
              id={`btn-notif-item-${notif.id}`}
            >
              <div className="p-2 bg-[#0D0D0D] border border-white/10 rounded-xl self-start">
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0 pr-2">
                <div className="font-bold text-xs truncate mb-0.5 font-sans">{notif.title}</div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans break-words">{notif.body}</p>
                <span className="text-[8px] text-gray-500 font-mono mt-1.5 block">
                  {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {!notif.read && (
                <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
              )}
            </button>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-[#141414] border border-white/5 rounded-[24px] shadow-inner">
            <Bell className="w-8 h-8 mb-3 text-rose-500/85" />
            <span className="text-xs font-serif text-white italic">Your notification Vault is silent</span>
          </div>
        )}
      </div>

    </div>
  );
}

// BUMPER TOP-BANNER PUSH TOASTS SIMULATION SYSTEM
export function PushToast() {
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  useEffect(() => {
    const handlePushEvent = (e: Event) => {
      const customEvent = e as CustomEvent<NotificationItem>;
      setActiveToast(customEvent.detail);
      
      // Auto dismiss after 4 seconds
      const timeout = setTimeout(() => {
        setActiveToast(null);
      }, 4000);
    };

    window.addEventListener("honeybee-notif", handlePushEvent);
    return () => window.removeEventListener("honeybee-notif", handlePushEvent);
  }, []);

  if (!activeToast) return null;

  return (
    <div className="absolute top-12 left-4 right-4 bg-[#0D0D0D]/95 backdrop-blur border border-rose-500/20 text-neutral-100 rounded-lg p-3 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 z-50">
      
      <div className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
        <Bell className="w-5 h-5 animate-bounce text-rose-500" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-xs text-neutral-100 truncate font-sans">{activeToast.title}</div>
        <p className="text-[10px] text-gray-400 truncate mt-0.5 font-sans">{activeToast.body}</p>
      </div>

      <button 
        onClick={() => setActiveToast(null)}
        className="text-gray-500 hover:text-white p-1"
        id="btn-close-toast"
      >
        <X className="w-4 h-4" />
      </button>

    </div>
  );
}
