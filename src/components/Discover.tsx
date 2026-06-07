/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  X, 
  Flame, 
  Sparkles, 
  Filter, 
  Search, 
  MapPin, 
  Award, 
  BadgeCheck, 
  HelpCircle,
  MessageSquare,
  Compass,
  Eye
} from 'lucide-react';
import { Storage, PRESET_INTERESTS, PRESET_PERSONALITIES, calculateMatchScore } from '../lib/db';
import { UserProfile, ChatRoom } from '../types';
import UserProfileModal from './UserProfileModal';

interface DiscoverProps {
  onOpenChat: (roomId: string) => void;
}

export default function Discover({ onOpenChat }: DiscoverProps) {
  const [candidates, setCandidates] = useState<{ user: UserProfile, score: number }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  // Advanced Filter state variables
  const [interestFilter, setInterestFilter] = useState("");
  const [personalityFilter, setPersonalityFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [minAge, setMinAge] = useState<number>(18);
  const [maxAge, setMaxAge] = useState<number>(45);
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);

  // Match Confetti/Alert
  const [matchedOverlay, setMatchedOverlay] = useState<{ active: boolean, bot?: UserProfile, room?: ChatRoom }>({ active: false });

  const loadCandidates = () => {
    const scored = Storage.getDiscoveredMatches({
      interest: interestFilter || undefined,
      personality: personalityFilter || undefined,
      search: searchTerm || undefined,
      minAge: minAge || undefined,
      maxAge: maxAge || undefined
    });
    setCandidates(scored);
    setCurrentIndex(0);
  };

  useEffect(() => {
    loadCandidates();
    const unsub = Storage.registerListener(loadCandidates);
    return () => unsub();
  }, [interestFilter, personalityFilter, searchTerm, minAge, maxAge]);

  const handleSwipe = async (like: boolean) => {
    if (candidates.length === 0 || currentIndex >= candidates.length) return;
    
    const candidate = candidates[currentIndex].user;
    if (like) {
      const result = await Storage.likeProfile(candidate.id);
      if (result.matched) {
        setMatchedOverlay({
          active: true,
          bot: candidate,
          room: result.room
        });
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      await Storage.dislikeProfile(candidate.id);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const getMyProfile = () => Storage.getMe();

  const resetSwipes = () => {
    const me = Storage.getMe();
    if (me) {
      Storage.createOrUpdateMe({ likes: [], dislikes: [] });
      setCurrentIndex(0);
    }
  };

  const currentScored = candidates[currentIndex];

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] p-4">
      
      {/* Search Filter Banner */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 bg-[#141414] border border-white/5 rounded-xl px-3 py-1.5 flex-1">
          <Search className="w-4 h-4 text-neutral-500" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, city, bio, interests..."
            className="w-full bg-transparent text-xs text-neutral-200 placeholder:text-neutral-500 focus:outline-none font-sans"
            id="input-discover-search"
          />
        </div>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border ${showFilters ? 'bg-rose-500 border-rose-500 text-white font-semibold' : 'bg-[#141414] border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10'} transition-all`}
          title="Toggle Filter Panel"
          id="btn-toggle-filters"
        >
          <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Expandable Algorithmic Filters */}
      {showFilters && (
        <div className="bg-[#0D0D0D]/90 backdrop-blur border border-white/10 rounded-xl p-3.5 mb-3 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="text-[10px] tracking-[0.2em] text-gray-500 font-bold uppercase">Select hive criteria</div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Shared Interest</label>
              <select 
                value={interestFilter}
                onChange={(e) => setInterestFilter(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg py-1.5 px-2 text-xs text-gray-200 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                id="select-interest-filter"
              >
                <option value="">Any Interest</option>
                {PRESET_INTERESTS.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Personality Type</label>
              <select 
                value={personalityFilter}
                onChange={(e) => setPersonalityFilter(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/5 rounded-lg py-1.5 px-2 text-xs text-gray-200 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                id="select-personality-filter"
              >
                <option value="">Any Type</option>
                {PRESET_PERSONALITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>


          <div>
            <div className="flex justify-between text-[10px] mb-1 font-bold text-neutral-400 uppercase">
              <span>Age Range Limit</span>
              <span className="text-rose-500">{minAge} - {maxAge}</span>
            </div>
            <div className="flex gap-3">
              <input 
                type="range" 
                min="18" 
                max="50" 
                value={minAge} 
                onChange={(e) => setMinAge(Number(e.target.value))}
                className="w-full accent-rose-500 bg-neutral-950 h-1 rounded"
                id="range-age-min"
              />
              <input 
                type="range" 
                min="18" 
                max="50" 
                value={maxAge} 
                onChange={(e) => setMaxAge(Number(e.target.value))}
                className="w-full accent-rose-500 bg-neutral-950 h-1 rounded"
                id="range-age-max"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Swiper Deck Panel */}
      <div className="flex-1 flex flex-col justify-center min-h-0 relative">
        {currentScored ? (
          <div className="flex flex-col h-full justify-between gap-4">
            
            {/* Swiper Card */}
            <div className="flex-1 bg-[#141414] border border-white/5 rounded-[24px] overflow-hidden flex flex-col relative group">
              
              {/* Main Photo */}
              <div className="relative w-full h-[58%] overflow-hidden bg-[#0A0A0A]">
                <img 
                  src={currentScored.user.photoURL} 
                  alt={currentScored.user.displayName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/20 to-transparent"></div>

                {/* Algorithmic Compatibility badge */}
                <div className="absolute top-4 right-4 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-550 text-rose-500 fill-rose-500/20 animate-pulse" />
                  <span className="font-mono text-xs text-rose-450 text-rose-400 font-bold tracking-tight">{currentScored.score}% Match</span>
                </div>

                {/* Hover Quick MBTI pill overlay */}
                <div className="absolute bottom-4 left-4 bg-white/10 border border-white/10 backdrop-blur text-rose-300 text-[10px] tracking-wider uppercase font-semibold px-2.5 py-1 rounded-lg">
                  {currentScored.user.personality}
                </div>
              </div>

              {/* Bio & Files contents */}
              <div className="flex-1 p-5 overflow-y-auto flex flex-col justify-between scrollbar-none">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <button
                      type="button"
                      onClick={() => setViewingProfile(currentScored.user)}
                      className="text-left hover:text-rose-300 transition"
                      title="View profile"
                    >
                      <h2 className="text-2xl font-serif text-white italic tracking-tight">{currentScored.user.displayName}, {currentScored.user.age}</h2>
                    </button>
                    {currentScored.user.isVerified && (
                      <div className="flex items-center gap-1 bg-rose-550 bg-rose-500 text-white text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                        <BadgeCheck className="w-3 h-3 text-white" />
                        <span>Verified</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium mb-3">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{currentScored.user.location}</span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed italic mb-4 font-sans">
                    "{currentScored.user.bio}"
                  </p>
                </div>

                {/* Sub Hobbies chips */}
                <div className="mt-1">
                  <div className="text-[10px] tracking-[0.15em] font-medium text-gray-500 uppercase tracking-wider mb-2">Interests Overlay</div>
                  <div className="flex flex-wrap gap-1.5">
                    {currentScored.user.interests.map(interest => {
                      const ownUser = getMyProfile();
                      const common = ownUser?.interests.includes(interest);
                      return (
                        <span 
                          key={interest} 
                          className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium ${common ? 'bg-rose-500/15 border-rose-500/30 text-rose-400' : 'bg-[#0A0A0A] border-white/5 text-neutral-400'}`}
                        >
                          {interest} {common && "🌸"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>


            {/* Tap controls buttons */}
            <div className="flex justify-center items-center gap-6 mb-2">
              <button 
                onClick={() => handleSwipe(false)}
                className="w-14 h-14 bg-[#141414] border border-white/5 rounded-full flex items-center justify-center hover:bg-white/5 transition shadow-lg text-neutral-400 hover:text-red-400 active:scale-95"
                title="Pass"
                id="btn-actions-dislike"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-1 border border-white/5 bg-[#0D0D0D] rounded-full gap-1 flex items-center">
                <button
                  onClick={() => setViewingProfile(currentScored.user)}
                  className="text-[10px] tracking-[0.15em] font-medium text-gray-400 hover:text-rose-400 px-3 uppercase flex items-center gap-1 transition"
                  title="View profile"
                >
                  <Eye className="w-3 h-3" />
                  Profile
                </button>
              </div>

              <button 
                onClick={() => handleSwipe(true)}
                className="w-14 h-14 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center hover:shadow-[0_0_20px_rgba(244,63,94,0.35)] transition shadow-lg active:scale-95 cursor-pointer"
                title="Buzz Sweetener"
                id="btn-actions-like"
              >
                <Heart className="w-6 h-6 fill-neutral-950 stroke-neutral-950 animate-pulse" />
              </button>
            </div>

          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[#141414] border border-white/5 rounded-[24px] shadow-xl shadow-black/30 animate-fade-in">
            <div className="w-16 h-16 bg-[#0D0D0D] border border-white/10 rounded-full flex items-center justify-center mb-4 shadow-inner">
              <Compass className="w-8 h-8 text-rose-500 fill-rose-500/5" />
            </div>
            <h3 className="text-2xl font-serif text-white italic mb-2">Hive Sweep Complete!</h3>
            <p className="text-xs text-neutral-400 leading-relaxed max-w-sm mb-6">
              You've buzz-swiped all potential matches. Tweak your search filters to find more sweet petals!
            </p>
            <button 
              onClick={resetSwipes}
              className="px-5 py-2.5 bg-rose-500 text-white text-xs font-bold rounded-lg uppercase tracking-wider transition hover:bg-rose-600 active:scale-95 cursor-pointer"
              id="btn-reset-swipes"
            >
              Reset Swipes Array
            </button>
          </div>
        )}
      </div>

      {/* MATCH CONFETTI overlay popup */}
      {matchedOverlay.active && (
        <div className="absolute inset-0 bg-neutral-950/98 z-50 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300">
          
          <div className="absolute inset-0 opacity-15 overflow-hidden">
            <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-500 via-pink-600 to-transparent rounded-full blur-2xl"></div>
          </div>

          <div className="relative text-center z-10 max-w-sm">
            <div className="inline-flex p-3 bg-rose-500 text-white rounded-full mb-6 shadow-xl shadow-rose-500/20 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            
            <h1 className="text-3xl font-black text-neutral-100 mb-2 italic tracking-tighter uppercase pointer-events-none">
              Honey, It's a <span className="text-rose-400 bg-gradient-to-r from-rose-450 to-pink-500 bg-clip-text text-transparent">Match!</span> 🌸
            </h1>
            <p className="text-xs text-neutral-400 mb-8 px-4">
              You and {matchedOverlay.bot?.displayName} shared a deep spark on honeybee!
            </p>

            {/* Double Circle Face */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="relative">
                <img 
                  src={getMyProfile()?.photoURL} 
                  alt="My photo"
                  className="w-20 h-20 rounded-full border-4 border-rose-500 object-cover shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 text-lg">🌸</span>
              </div>

              <div className="h-0.5 w-6 bg-rose-500/30"></div>

              <div className="relative">
                <img 
                  src={matchedOverlay.bot?.photoURL} 
                  alt="Match photo"
                  className="w-20 h-20 rounded-full border-4 border-rose-400 object-cover shadow-lg"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute -bottom-1 -right-1 text-lg">🐝</span>
              </div>
            </div>

            {/* Interest alignment detail */}
            <div className="bg-[#141414] border border-white/5 rounded-2xl p-4 mb-8 text-left">
              <div className="text-[10px] tracking-[0.15em] font-medium text-rose-400 uppercase mb-1.5 text-center">Honey Harmony</div>
              <div className="text-xs text-neutral-300 text-center font-medium font-sans">
                You both shared similar sparks for {matchedOverlay.bot?.interests.slice(0, 2).join(" & ")} and aligned personalities!
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setMatchedOverlay({ active: false });
                  if (matchedOverlay.room) {
                    onOpenChat(matchedOverlay.room.id);
                  }
                }}
                className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-lg text-xs tracking-wider uppercase transition shadow-lg shadow-rose-500/10 active:scale-95 cursor-pointer"
                id="btn-match-chat"
              >
                Send First Buzz! 💬
              </button>
              
              <button 
                onClick={() => {
                  setMatchedOverlay({ active: false });
                  setCurrentIndex(prev => prev + 1);
                }}
                className="w-full bg-[#141414] hover:bg-white/5 text-neutral-300 font-medium py-3 rounded-lg text-xs transition border border-white/5 uppercase tracking-wider cursor-pointer"
                id="btn-match-continue"
              >
                Keep Exploring
              </button>
            </div>

          </div>
        </div>
      )}

      <UserProfileModal
        user={viewingProfile}
        onClose={() => setViewingProfile(null)}
        onMessage={async (user) => {
          setViewingProfile(null);
          const room = await Storage.openChatWithUser(user.id);
          onOpenChat(room.id);
        }}
      />

    </div>
  );
}
