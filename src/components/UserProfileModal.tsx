/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BadgeCheck, Heart, MapPin, MessageSquare, X } from 'lucide-react';
import { UserProfile } from '../types';

interface UserProfileModalProps {
  user: UserProfile | null;
  onClose: () => void;
  onMessage?: (user: UserProfile) => void;
}

export default function UserProfileModal({ user, onClose, onMessage }: UserProfileModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-[#121212] border border-white/10 rounded-3xl shadow-2xl">
        <div className="relative h-64 bg-[#0A0A0A]">
          <img
            src={user.photoURL}
            alt={user.displayName}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/30" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/55 border border-white/10 text-white hover:bg-black/75 transition"
            title="Close profile"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-serif italic text-white tracking-tight">{user.displayName}, {user.age}</h2>
              {user.isVerified && <BadgeCheck className="w-5 h-5 text-rose-400 fill-rose-500/10" />}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-300">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>{user.location}</span>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-rose-400 font-bold mb-2">About</div>
            <p className="text-sm text-neutral-200 leading-relaxed font-sans">{user.bio}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-3">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Personality</div>
              <div className="text-xs text-neutral-200 font-semibold">{user.personality}</div>
            </div>
            <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-3">
              <div className="text-[9px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Looking For</div>
              <div className="text-xs text-neutral-200 font-semibold">{user.lookingFor}</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-neutral-500 font-bold mb-2">Interests</div>
            <div className="flex flex-wrap gap-2">
              {user.interests.map((interest) => (
                <span key={interest} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300">
                  <Heart className="w-3 h-3" />
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {onMessage && (
            <button
              onClick={() => onMessage(user)}
              className="w-full bg-rose-500 hover:bg-rose-600 text-white py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Message
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
