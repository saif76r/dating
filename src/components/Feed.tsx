/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageSquare, 
  Send, 
  Image, 
  MapPin, 
  BadgeCheck, 
  Smile, 
  Bookmark, 
  Eye, 
  UserPlus,
  Compass,
  Sparkles,
  ChevronLeft,
  Calendar
} from 'lucide-react';
import { Storage } from '../lib/db';
import { Post, Comment, UserProfile } from '../types';

interface FeedProps {
  onOpenDirectChat?: (targetId: string) => void;
}

export default function Feed({ onOpenDirectChat }: FeedProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostText, setNewPostText] = useState("");
  const [selectedPresetImage, setSelectedPresetImage] = useState("");
  const [postStatus, setPostStatus] = useState("");
  
  // Comment drawer/section modal state
  const [activePostComments, setActivePostComments] = useState<Post | null>(null);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [typedComment, setTypedComment] = useState("");

  // Visited profile popup state
  const [visitedProfile, setVisitedProfile] = useState<UserProfile | null>(null);

  // Static Preset Images suitable for dating app feed
  const IMAGE_PRESETS = [
    { label: "Garden 🌸", url: "https://images.unsplash.com/photo-1473201938096-7723af7e1892?auto=format&fit=crop&w=600&q=80" },
    { label: "Cozy Cafe ☕️", url: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=600&q=80" },
    { label: "Sunset Peak ⛰️", url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80" },
    { label: "Record Player 🎵", url: "https://images.unsplash.com/photo-1484755560695-a4c7300c5c99?auto=format&fit=crop&w=600&q=80" },
    { label: "Studio Pots 🏺", url: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=600&q=80" }
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 750 * 1024) {
        setPostStatus("Choose an image under 750KB, or use a preset image.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setSelectedPresetImage(reader.result as string);
          setPostStatus("");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const loadFeed = () => {
    setPosts(Storage.getPosts());
    if (activePostComments) {
      setCommentsList(Storage.getComments(activePostComments.id));
    }
  };

  useEffect(() => {
    loadFeed();
    Storage.refreshRemotePosts().catch((err) => {
      console.warn("Could not refresh remote feed posts.", err);
      setPostStatus("Could not load friends' posts. Deploy the latest Firestore rules and refresh.");
    });
    const unsub = Storage.registerListener(loadFeed);
    return () => unsub();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    try {
      setPostStatus("");
      await Storage.craftPost(newPostText, selectedPresetImage || undefined);
      setNewPostText("");
      setSelectedPresetImage("");
      setPostStatus("Posted.");
      setTimeout(() => setPostStatus(""), 2200);
    } catch (err) {
      console.warn("Post creation failed.", err);
      setPostStatus("Post saved only on this device. Deploy Firestore rules, sign in, and try again.");
    }
  };

  const handleLikePost = async (postId: string) => {
    await Storage.likePost(postId);
  };

  const handleLeaveComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedComment.trim() || !activePostComments) return;

    await Storage.leaveComment(activePostComments.id, typedComment);
    setTypedComment("");
    // Re-verify comment count
    loadFeed();
  };

  const openCommentDrawer = (post: Post) => {
    setActivePostComments(post);
    setCommentsList(Storage.getComments(post.id));
  };

  const handleVisitUser = (userId: string) => {
    // Lookup profiles
    const users = Storage.getUsers();
    const poster = users.find(u => u.id === userId);
    if (poster) {
      setVisitedProfile(poster);
    } else {
      // Is it me?
      const me = Storage.getMe();
      if (me && me.id === userId) {
        setVisitedProfile(me);
      }
    }
  };

  const myProfile = Storage.getMe();

  return (
    <div className="flex flex-col bg-[#0A0A0A] p-4 relative">
      
      {/* Feed Elegant Header */}
      <div className="mb-5">
        <h2 className="text-3xl font-serif text-white italic tracking-tight">The Honey Feed</h2>
        <p className="text-gray-500 text-xs mt-1">Discovery based on your interest in <span className="text-rose-500 font-semibold">Art & Minimalism</span></p>
      </div>

      {/* Create Post Card */}
      {myProfile ? (
        <form onSubmit={handleCreatePost} className="bg-[#141414] border border-white/5 rounded-2xl p-4 mb-5 shadow-lg">
          <div className="flex gap-3 mb-3">
            <img 
              src={myProfile.photoURL} 
              alt={myProfile.displayName}
              className="w-9 h-9 rounded-full object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1">
              <textarea 
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                placeholder="Buzz something sweet in the community feed..."
                className="w-full bg-transparent text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none resize-none pt-1"
                rows={2}
                maxLength={400}
                id="input-feed-text"
              />
            </div>
          </div>

          {/* Preset image selector */}
          <div className="mb-3.5">
            <div className="text-[10px] uppercase tracking-[0.15em] font-medium text-gray-500 mb-1.5 flex items-center gap-1">
              <Image className="w-3.5 h-3.5" />
              <span>Attach photography preset or custom image</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Device Photo Upload label triggering input */}
              <label 
                className={`text-[10px] px-2.5 py-1 rounded-lg border border-dashed font-bold transition cursor-pointer flex items-center gap-1 ${
                  selectedPresetImage && !IMAGE_PRESETS.some(p => p.url === selectedPresetImage)
                    ? 'bg-rose-500 border-rose-500 text-white'
                    : 'bg-[#0A0A0A] border-rose-500/40 text-rose-450 hover:bg-rose-500/10'
                }`}
                title="Upload custom image from phone or computer"
                id="btn-upload-custom-photo"
              >
                <span>📷 Upload Custom Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />
              </label>

              {IMAGE_PRESETS.map((img) => (
                <button
                  type="button"
                  key={img.label}
                  onClick={() => setSelectedPresetImage(selectedPresetImage === img.url ? "" : img.url)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg border font-medium transition ${selectedPresetImage === img.url ? 'bg-rose-500 border-rose-500 text-white font-bold' : 'bg-[#0A0A0A] border-white/5 text-gray-400 hover:bg-white/5'}`}
                  id={`btn-preset-${img.label.split(' ')[0]}`}
                >
                  {img.label}
                </button>
              ))}
            </div>
            {selectedPresetImage && (
              <div className="mt-2.5 relative rounded-xl overflow-hidden h-24 border border-white/5 bg-[#0D0D0D]">
                <img 
                  src={selectedPresetImage} 
                  alt="Post preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  type="button"
                  onClick={() => setSelectedPresetImage("")}
                  className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/70 text-neutral-100 rounded-full flex items-center justify-center text-[10px]"
                >
                  ✕
                </button>
              </div>
            )}
            {postStatus && (
              <div className="mt-2 text-[10px] text-rose-400 font-medium">
                {postStatus}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-white/5 pt-3">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Be kind and respect hive integrity</span>
            <button 
              type="submit"
              disabled={!newPostText.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${newPostText.trim() ? "bg-rose-500 text-white hover:bg-rose-600 active:scale-95 cursor-pointer" : "bg-white/5 text-gray-600 cursor-not-allowed"}`}
              id="submit-feed-post"
            >
              <span>Buzz Post</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-[#141414] rounded-2xl p-4 mb-4 text-center text-xs text-neutral-400 border border-white/5">
          Create a profile to buzz your posts!
        </div>
      )}

      {/* Social Posts Roll */}
      <div className="space-y-4 pb-16">
        {posts.length > 0 ? (
          posts.map((post) => {
            const hasLiked = myProfile ? post.likes.includes(myProfile.id) : false;
            return (
              <article key={post.id} className="bg-[#141414] border border-white/5 rounded-2xl p-5 shadow-lg shadow-black/20">
                
                {/* Header author info */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-2.5 items-center">
                    <button 
                      type="button"
                      onClick={() => handleVisitUser(post.userId)}
                      className="relative block"
                      id={`btn-visit-user-avatar-${post.id}`}
                    >
                      <img 
                        src={post.userPhoto} 
                        alt={post.userName}
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                    <div>
                      <button 
                        type="button"
                        onClick={() => handleVisitUser(post.userId)}
                        className="font-bold text-xs text-neutral-200 flex items-center gap-1 hover:text-rose-450 transition"
                        id={`btn-visit-user-name-${post.id}`}
                      >
                        <span>{post.userName}</span>
                        {post.userVerified && <BadgeCheck className="w-3.5 h-3.5 text-rose-500 fill-rose-500/5" />}
                      </button>
                      <span className="text-[10px] text-gray-500 font-mono">{new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>

                {/* Body Text */}
                <p className="text-xs text-gray-300 leading-relaxed mb-3 break-words whitespace-pre-wrap font-sans">
                  {post.content}
                </p>

                {/* Post Art Media */}
                {post.mediaUrl && (
                  <div className="rounded-xl overflow-hidden mb-3.5 border border-white/5 bg-[#0A0A0A] aspect-video">
                    <img 
                      src={post.mediaUrl} 
                      alt="Shared Post Attachment" 
                      className="w-full h-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex items-center gap-5 pt-3.5 border-t border-white/5 text-neutral-400">
                  <button 
                    onClick={() => handleLikePost(post.id)}
                    className={`flex items-center gap-1.5 text-xs hover:text-rose-500 transition ${hasLiked ? "text-rose-500 font-bold" : ""}`}
                    id={`btn-like-post-${post.id}`}
                  >
                    <Heart className={`w-4 h-4 ${hasLiked ? "fill-rose-500 stroke-rose-400" : ""}`} />
                    <span>{post.likes.length}</span>
                  </button>

                  <button 
                    onClick={() => openCommentDrawer(post)}
                    className="flex items-center gap-1.5 text-xs hover:text-rose-400 transition"
                    id={`btn-comments-drawer-${post.id}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{post.commentCount}</span>
                  </button>

                  <div className="flex-1 text-right">
                    <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-[0.1em]">Honeybee Community</span>
                  </div>
                </div>

              </article>
            );
          })
        ) : (
          <div className="text-center p-6 text-neutral-500 text-xs">
            No hive chatter yet. Start the buzz!
          </div>
        )}
      </div>

      {/* POST DETAILS & COMMENT DRAWER OVERLAY */}
      {activePostComments && (
        <div className="fixed inset-0 bg-[#0A0A0A] z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
          
          {/* Drawer Header Navbar */}
          <div className="px-4 py-3.5 border-b border-white/10 bg-[#0D0D0D] flex items-center justify-between">
            <button 
              onClick={() => setActivePostComments(null)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-rose-400 transition"
              id="btn-close-comments-drawer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Hive</span>
            </button>
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-300">Chatter & Gossip</div>
            <div className="w-5"></div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* Thread post context card */}
            <div className="bg-[#141414] border border-white/5 rounded-xl p-3.5 mb-4 shadow">
              <div className="flex gap-2 items-center mb-2">
                <img 
                  src={activePostComments.userPhoto} 
                  alt={activePostComments.userName}
                  className="w-8 h-8 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <div className="text-xs font-bold text-neutral-200">{activePostComments.userName}</div>
                  <div className="text-[9px] text-gray-500 font-mono">Original Poster</div>
                </div>
              </div>
              <p className="text-xs text-neutral-300 italic">"{activePostComments.content}"</p>
            </div>

            {/* List existing comments */}
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-[0.15em] font-medium text-gray-500">Comments ({commentsList.length})</div>
              {commentsList.length > 0 ? (
                commentsList.map(comment => (
                  <div key={comment.id} className="flex gap-3 bg-[#141414] border border-white/5 p-3.5 rounded-xl animate-in fade-in duration-150">
                    <button 
                      type="button"
                      onClick={() => {
                        setActivePostComments(null);
                        handleVisitUser(comment.userId);
                      }}
                      id={`btn-visit-commenter-${comment.id}`}
                    >
                      <img 
                        src={comment.userPhoto} 
                        alt={comment.userName}
                        className="w-8 h-8 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <button 
                          type="button" 
                          onClick={() => {
                            setActivePostComments(null);
                            handleVisitUser(comment.userId);
                          }}
                          className="text-xs font-bold text-neutral-200 hover:text-rose-500 text-left transition"
                          id={`btn-visit-commenter-name-${comment.id}`}
                        >
                          {comment.userName}
                        </button>
                        <span className="text-[9px] text-gray-500 font-mono">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed break-words font-sans">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center p-6 text-neutral-600 text-xs">
                  A perfect silence. Add your honey chatter!
                </div>
              )}
            </div>

          </div>

          {/* Form to leave comment */}
          {myProfile ? (
            <form onSubmit={handleLeaveComment} className="p-3 border-t border-white/10 bg-[#0D0D0D] flex gap-2 items-center sticky bottom-0">
              <input 
                type="text"
                value={typedComment}
                onChange={(e) => setTypedComment(e.target.value)}
                placeholder="Write your chatter spill..."
                className="flex-1 bg-[#0A0A0A] border border-white/5 text-xs text-neutral-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                maxLength={200}
                id="input-comment-text"
              />
              <button 
                type="submit"
                disabled={!typedComment.trim()}
                className={`p-2.5 rounded-lg transition ${typedComment.trim() ? "bg-rose-500 text-white hover:bg-rose-600 active:scale-95 cursor-pointer" : "bg-white/5 text-gray-600"}`}
                id="submit-comment"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-4 bg-[#141414] text-center text-xs text-neutral-500">
              Log in to leave a comment.
            </div>
          )}

        </div>
      )}

      {/* VISITED USER PROFILE CARD MODAL */}
      {visitedProfile && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#141414] border border-white/10 rounded-[24px] overflow-hidden w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            
            {/* Visual banner */}
            <div className="relative h-44 bg-[#0A0A0A]">
              <img 
                src={visitedProfile.photoURL} 
                alt={visitedProfile.displayName} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent"></div>
              
              <button 
                onClick={() => setVisitedProfile(null)}
                className="absolute top-4 right-4 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-xs border border-white/10"
                id="btn-close-visit-profile"
              >
                ✕
              </button>
            </div>

            {/* Profile specifications */}
            <div className="p-5 overflow-y-auto max-h-[400px] scrollbar-none">
              <div className="flex items-center gap-2 mb-1.5">
                <h3 className="text-2xl font-serif text-white italic leading-none">{visitedProfile.displayName}, {visitedProfile.age}</h3>
                {visitedProfile.isVerified && <BadgeCheck className="w-5 h-5 text-rose-500" />}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-rose-450 font-bold mb-3">
                <Calendar className="w-3.5 h-3.5" />
                <span>{visitedProfile.personality}</span>
              </div>

              {/* Bio block */}
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.15em] mb-1">Introduction</div>
              <p className="text-xs text-neutral-300 leading-relaxed italic mb-4 font-sans">
                "{visitedProfile.bio || 'This bee is busy crafting a bio...'}"
              </p>

              {/* Hobbies list */}
              <div className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.15em] mb-2">Interests</div>
              <div className="flex flex-wrap gap-1.5 mb-5">
                {visitedProfile.interests && visitedProfile.interests.map(i => (
                  <span key={i} className="text-[10px] bg-[#0A0A0A] border border-white/5 text-neutral-300 px-2.5 py-1 rounded-lg font-medium">
                    {i}
                  </span>
                ))}
              </div>

              {/* Directly message */}
              {visitedProfile.id !== myProfile?.id && (
                <button 
                  onClick={async () => {
                    setVisitedProfile(null);
                    // Force trigger like to automatically match with bot and navigate
                    const result = await Storage.likeProfile(visitedProfile.id);
                    if (result.room && onOpenDirectChat) {
                      onOpenDirectChat(result.room.id);
                    }
                  }}
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer"
                  id="btn-visit-chat"
                >
                  Buzz Directly 🐝
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
