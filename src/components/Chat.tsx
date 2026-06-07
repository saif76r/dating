/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Video, 
  PhoneCall, 
  MoreVertical, 
  ChevronLeft, 
  MessageSquare, 
  PhoneMissed, 
  Calendar,
  Smile,
  BadgeCheck,
  Zap
} from 'lucide-react';
import { Storage, PRESET_INTERESTS } from '../lib/db';
import { ChatRoom, ChatMessage, UserProfile } from '../types';
import UserProfileModal from './UserProfileModal';

interface ChatProps {
  forcedRoomId?: string | null;
  onClearForcedRoom?: () => void;
  onStartCall: (botId: string, callType: "audio" | "video") => void;
}

export default function Chat({ forcedRoomId, onClearForcedRoom, onStartCall }: ChatProps) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typedMessage, setTypedMessage] = useState("");
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick reply bubbles
  const QUICK_REPLIES = [
    "Are you a tea or coffee person? ☕️🌱",
    "Loved your planting bio! 🌸🐝",
    "Let's grab a Honey Boba! 🧋✨",
    "Where is your favorite sunset spot? ⛰️🌅"
  ];

  const loadChats = () => {
    const list = Storage.getChats();
    setRooms(list);

    // If there is a forced active chat room from Swiper match, override selection
    if (forcedRoomId) {
      const match = list.find(r => r.id === forcedRoomId);
      if (match) {
        setSelectedRoom(match);
        setMessages(Storage.getMessages(match.id));
        if (onClearForcedRoom) onClearForcedRoom();
      }
    } else if (selectedRoom) {
      // Sync current active messages
      setMessages(Storage.getMessages(selectedRoom.id));
    }
  };

  useEffect(() => {
    loadChats();
    const unsub = Storage.registerListener(loadChats);
    return () => unsub();
  }, [forcedRoomId, selectedRoom?.id]);

  useEffect(() => {
    // Scroll chats to bottom
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessages(Storage.getMessages(room.id));
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || !selectedRoom) return;

    await Storage.sendChatMessage(selectedRoom.id, textToSend.trim());
    setTypedMessage("");
    // Message listener will re-dispatch update snapshot
  };

  const getPartnerProfile = (room: ChatRoom): UserProfile | undefined => {
    const me = Storage.getMe();
    const partnerId = room.participants.find(id => id !== me?.id);
    const users = Storage.getUsers();
    // Search registry
    let res = users.find(u => u.id === partnerId);
    if (!res && me) {
      // Try bot direct seed matching fallback
      res = Storage.getUsers().find(b => b.id === partnerId);
    }
    return res;
  };

  const myProfile = Storage.getMe();

  return (
    <div className="w-full max-w-full flex h-full bg-[#0A0A0A] overflow-hidden min-w-0">
      
      {/* 1. ROOM LIST SPLIT (shown if no active room, or on desktop layout) */}
      {(!selectedRoom) ? (
        <div className="flex-1 flex flex-col bg-[#0A0A0A] h-full p-4 overflow-y-auto">
          
          <div className="mb-5">
            <h2 className="text-3xl font-serif text-white italic tracking-tight flex items-center gap-2">
              <span>Hives Gossip</span>
              <MessageSquare className="w-5 h-5 text-rose-500" />
            </h2>
            <p className="text-xs text-gray-500 mt-1">Connect and buzz with your sweet matches</p>
          </div>

          <div className="flex-1 space-y-3">
            {rooms.length > 0 ? (
              rooms.map((room) => {
                const partner = getPartnerProfile(room);
                if (!partner) return null;
                return (
                  <button
                    key={room.id}
                    onClick={() => handleSelectRoom(room)}
                    className="w-full flex gap-3.5 items-center p-3.5 bg-[#141414] border border-white/5 hover:border-white/10 hover:bg-white/5 rounded-2xl text-left transition relative group"
                    id={`btn-chat-room-${room.id}`}
                  >
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingProfile(partner);
                      }}
                      className="shrink-0"
                      title="View profile"
                    >
                      <img 
                        src={partner.photoURL} 
                        alt={partner.displayName}
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs text-neutral-200 group-hover:text-rose-400 transition flex items-center gap-1">
                          {partner.displayName}
                          {partner.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-rose-500 fill-rose-500/5" />}
                        </span>
                        <span className="text-[9px] text-gray-500 font-mono">
                          {new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      
                      <p className="text-[11px] text-gray-400 truncate font-sans">
                        {room.lastMessage}
                      </p>
                    </div>

                    {/* Indicator pointer */}
                    <div className="absolute right-3.5 bottom-3.5 opacity-0 group-hover:opacity-100 transition text-[9px] text-rose-400 font-mono font-bold flex items-center gap-0.5">
                      <span>BUZZ</span>
                      <Zap className="w-2.5 h-2.5 fill-rose-500" />
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#141414] border border-white/5 rounded-[24px] mt-2 shadow-xl shadow-black/25">
                <div className="w-12 h-12 rounded-full bg-[#0D0D0D] border border-white/10 flex items-center justify-center mb-4 text-neutral-500">
                  <MessageSquare className="w-6 h-6 text-rose-500/80" />
                </div>
                <h3 className="text-sm font-serif text-white italic mb-1">No matches found yet</h3>
                <p className="text-[10px] text-gray-500 max-w-xs leading-relaxed font-sans">
                  Go to the **Discover** cards and swipe-right on dynamic profiles that share your sweet botanical spark!
                </p>
              </div>
            )}
          </div>

        </div>
      ) : (
        
        // 2. CONVERSATION VIEW (ACTIVE CHAT)
        <div className="flex-1 flex flex-col bg-[#0A0A0A] h-full relative z-10 animate-in slide-in-from-right duration-200 min-w-0 w-full max-w-full overflow-hidden">
          
          {/* Thread Header Navigation */}
          {(() => {
            const partner = getPartnerProfile(selectedRoom);
            if (!partner) return null;
            return (
              <div className="px-3.5 py-2.5 border-b border-white/10 bg-[#0D0D0D]/95 backdrop-blur flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedRoom(null)}
                    className="p-1.5 hover:bg-white/5 rounded-lg text-neutral-400 hover:text-neutral-100 transition"
                    title="Back to Chats"
                    id="btn-back-chats"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingProfile(partner)}
                    className="flex items-center gap-2 text-left hover:opacity-90 transition"
                    title="View profile"
                  >
                    <img 
                      src={partner.photoURL} 
                      alt={partner.displayName}
                      className="w-9 h-9 rounded-full object-cover border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-xs text-neutral-200 flex items-center gap-1 font-sans">
                        <span>{partner.displayName}</span>
                        {partner.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-rose-555 text-rose-500 fill-rose-500/5" />}
                      </div>
                      <div className="text-[9px] text-gray-500 font-medium font-sans">Bzzing compatible {partner.personality.split(' ')[0]}</div>
                    </div>
                  </button>
                </div>

                {/* Call Triggers Toolbar */}
                <div className="flex items-center gap-1.5 animate-in fade-in">
                  <button 
                    onClick={() => onStartCall(partner.id, "audio")}
                    className="p-2 bg-[#141414] border border-white/5 text-gray-300 hover:text-rose-450 hover:text-rose-500 hover:border-white/10 active:scale-95 rounded-xl transition-all cursor-pointer"
                    title="Voice Call"
                    id="btn-call-audio"
                  >
                    <PhoneCall className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onStartCall(partner.id, "video")}
                    className="p-2 bg-[#141414] border border-white/5 text-gray-300 hover:text-rose-450 hover:text-rose-500 hover:border-white/10 active:scale-95 rounded-xl transition-all cursor-pointer"
                    title="Video Call"
                    id="btn-call-video"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Messages Lists */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-none bg-[#0A0A0A]">
            {messages.length > 0 ? (
              messages.map((msg, index) => {
                const isMe = msg.senderId === myProfile?.id;
                const isSystem = msg.senderId === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-3 animate-in fade-in duration-250">
                      <div className="bg-rose-500/5 border border-rose-500/10 max-w-xs text-center rounded-full px-4 py-1.5 text-[10px] text-rose-450 text-rose-400 leading-relaxed font-semibold uppercase tracking-wider font-sans">
                        {msg.text}
                      </div>
                    </div>
                  );
                }

                // If styled call logs in bubbles
                const isCall = msg.callType && msg.callType !== "none";

                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-150`}
                  >
                    <div className="flex gap-2 max-w-[78%]">
                      {!isMe && (
                        <img 
                          src={getPartnerProfile(selectedRoom ?? rooms[0])?.photoURL} 
                          alt="Avatar"
                          className="w-6 h-6 rounded-full object-cover self-end mb-1 border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      <div className="flex flex-col">
                        <div 
                          className={`
                            px-4 py-2.5 rounded-2xl text-xs leading-relaxed shadow
                            ${isMe ? 'bg-gradient-to-r from-rose-500 via-pink-550 to-pink-500 text-white font-bold rounded-br-none font-sans shadow-rose-500/10' : 'bg-[#141414] border border-white/5 text-neutral-200 rounded-bl-none font-sans'}
                            ${isCall ? 'border border-white/10 bg-[#141414] flex flex-col gap-1.5' : ''}
                          `}
                        >
                          {isCall ? (
                            <>
                              <div className="flex items-center gap-1.5 font-bold">
                                {msg.callType === "video" ? <Video className="w-4 h-4 text-rose-400" /> : <PhoneCall className="w-4 h-4 text-rose-400" />}
                                <span className={isMe ? "text-white" : "text-white"}>{msg.text}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">Duration: {Math.floor((msg.callDuration || 0) / 60)}m {String((msg.callDuration || 0) % 60).padStart(2,'0')}s</span>
                            </>
                          ) : (
                            <span className="break-words select-all">{msg.text}</span>
                          )}
                        </div>
                        <span className={`text-[8px] text-gray-500 font-mono mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center p-6 text-gray-500 text-xs">
                A clean slate. Start buzzing!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick reply bar */}
          <div className="px-4 py-2 bg-[#0A0A0A] border-t border-white/5 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-none select-none z-10 sticky bottom-14 w-full max-w-full min-w-0">
            {QUICK_REPLIES.map((reply) => (
              <button
                key={reply}
                onClick={() => handleSendMessage(reply)}
                className="text-[10px] bg-[#141414] hover:bg-[#1E1E1E] hover:text-rose-400 border border-white/5 hover:border-rose-500/20 text-neutral-400 px-3 py-1.5 rounded-full transition font-medium font-sans cursor-pointer"
                id={`btn-quick-reply-${reply.split(' ')[0]}`}
              >
                {reply}
              </button>
            ))}
          </div>

          {/* Compose Text Form */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(typedMessage);
            }}
            className="p-3 border-t border-white/10 bg-[#0D0D0D] flex gap-2 items-center sticky bottom-0 z-10"
          >
            <input 
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder="Zip your buzz message..."
              className="flex-1 bg-[#0A0A0A] border border-white/5 text-xs text-neutral-200 rounded-lg px-3.5 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              maxLength={1000}
              id="input-chat-message"
            />
            <button 
              type="submit"
              disabled={!typedMessage.trim()}
              className={`p-3 rounded-lg transition ${typedMessage.trim() ? "bg-rose-500 text-white hover:bg-rose-600 active:scale-95 cursor-pointer" : "bg-white/5 text-gray-600"}`}
              id="submit-chat-message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}

      <UserProfileModal user={viewingProfile} onClose={() => setViewingProfile(null)} />

    </div>
  );
}
