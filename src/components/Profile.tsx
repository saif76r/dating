/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BadgeCheck, 
  MapPin, 
  User, 
  Camera, 
  Settings, 
  LogOut, 
  Plus, 
  Save, 
  ShieldCheck, 
  Check,
  ChevronRight,
  Sparkles,
  Award,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Heart,
  MessageSquare
} from 'lucide-react';
import { Storage, PRESET_INTERESTS, PRESET_PERSONALITIES } from '../lib/db';
import { auth, isFirebaseActive } from '../firebase';
import { Post, UserProfile } from '../types';

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  
  // Form variables
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState(25);
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [personality, setPersonality] = useState("");
  const [gender, setGender] = useState("Female");
  const [lookingFor, setLookingFor] = useState("Everyone");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState("");

  // Photo Selector Modal States
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [inputUrl, setInputUrl] = useState("");

  // Verification Camera state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedSelfie, setCapturedSelfie] = useState("");
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [camError, setCamError] = useState(false);

  // Status message
  const [saveStatus, setSaveStatus] = useState("");

  const handleLogout = async () => {
    if (isFirebaseActive) {
      const { signOut } = await import('firebase/auth');
      await signOut(auth);
    }
    Storage.clearMe();
    window.location.reload();
  };

  const syncProfile = () => {
    const me = Storage.getMe();
    setProfile(me);
    setMyPosts(me ? Storage.getPosts().filter(post => post.userId === me.id) : []);
    if (me) {
      setDisplayName(me.displayName);
      setAge(me.age);
      setBio(me.bio);
      setLocation(me.location);
      setPersonality(me.personality);
      setGender(me.gender);
      setLookingFor(me.lookingFor);
      setSelectedInterests(me.interests || []);
      setAvatarUrl(me.photoURL);
    }
  };

  useEffect(() => {
    syncProfile();
    const unsub = Storage.registerListener(syncProfile);
    return () => {
      unsub();
      stopCam();
    };
  }, []);

  const handleInterestToggle = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(prev => prev.filter(i => i !== interest));
    } else {
      setSelectedInterests(prev => [...prev, interest]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file (jpeg, png, webp, etc).");
      return;
    }
    // Limit to under 1MB for smooth local storage/firestore serialization
    if (file.size > 1024 * 1024) {
      setPhotoError("Image is too large. Please upload an image under 1MB.");
      return;
    }

    setPhotoError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setAvatarUrl(dataUrl);
        setShowPhotoModal(false);
      }
    };
    reader.onerror = () => {
      setPhotoError("Failed to import selected image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl) return;
    if (!inputUrl.startsWith("http://") && !inputUrl.startsWith("https://")) {
      setPhotoError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setAvatarUrl(inputUrl);
    setInputUrl("");
    setPhotoError("");
    setShowPhotoModal(false);
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus("Saving changes...");
    
    await Storage.createOrUpdateMe({
      displayName,
      age: Number(age),
      bio,
      location,
      personality,
      gender,
      lookingFor,
      interests: selectedInterests,
      photoURL: avatarUrl
    });

    setSaveStatus("Changes saved successfully!");
    setTimeout(() => {
      setSaveStatus("");
    }, 2500);
  };

  // VERIFICATION WORKFLOWS
  const startCam = async () => {
    try {
      setCamError(false);
      setShowCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      cameraStreamRef.current = stream;
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch {
      setCamError(true);
    }
  };

  const stopCam = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setShowCamera(false);
  };

  const captureSnapshot = () => {
    // Generate simulated image using canvas or direct preset for simplicity in preview
    const randomPreSelfies = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80"
    ];
    const snapped = randomPreSelfies[Math.floor(Math.random() * randomPreSelfies.length)];
    setCapturedSelfie(snapped);
    stopCam();
  };

  const handleTriggerVerification = async () => {
    if (!capturedSelfie) return;
    await Storage.submitProfileVerification(capturedSelfie);
    setCapturedSelfie("");
  };

  const handleCreateNewUser = async () => {
    // Random user presets
    const names = ["Aria 🐝", "Ben ☕️", "Luna ✨", "Sasha ⛰️"];
    const avatars = [
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80"
    ];
    const deciderIdx = Math.floor(Math.random() * names.length);
    
    const currentMe = Storage.getMe();
    const targetId = currentMe?.id || "me_" + Math.random().toString(36).substr(2, 9);
    
    await Storage.createOrUpdateMe({
      id: targetId,
      displayName: names[deciderIdx],
      email: `${names[deciderIdx].split(' ')[0].toLowerCase()}@gmail.com`,
      photoURL: avatars[deciderIdx],
      bio: "Crafting beautiful cells in the hive of life. Let's trade favorite recipes! 🧋🌱🌌",
      location: "San Jose, CA",
      age: 23 + Math.floor(Math.random() * 6),
      gender: "Male",
      lookingFor: "Female",
      interests: ["Coffee", "Tech", "Bee Conservation", "Matcha"],
      personality: "Logician (INTP)"
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] p-4 overflow-y-auto scrollbar-none">
      
      {/* Profile Elegant Header */}
      <div className="mb-5 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif text-white italic tracking-tight">Bee Profile</h2>
          <p className="text-xs text-gray-500 mt-1">Configure your card and verify identity</p>
        </div>
        {profile && (
          <button
            onClick={handleLogout}
            className="p-2.5 bg-[#141414] hover:bg-red-500/10 border border-white/5 hover:border-red-500/25 text-neutral-400 hover:text-red-400 rounded-xl transition cursor-pointer flex items-center justify-center"
            title="Log Out"
            id="btn-logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 2. NO PROFILE REGISTER PANEL DISPLAY */}
      {!profile ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#141414] border border-white/5 rounded-[24px]">
          <div className="w-16 h-16 rounded-full bg-[#0D0D0D] border border-white/10 flex items-center justify-center mb-4 shadow-inner">
            <User className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-serif text-white italic mb-2">Initialize Honeybee Profile</h2>
          <p className="text-xs text-gray-400 mb-6 max-w-sm leading-relaxed font-sans">
            Register your profile placeholder with one press below to get access to custom match logs, posting, swiping and verified slots!
          </p>
          <button
            onClick={handleCreateNewUser}
            className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-6 py-3 rounded-lg text-xs transition uppercase tracking-wider active:scale-95 shadow cursor-pointer"
            id="btn-init-profile"
          >
            Create Hive Card 🐝
          </button>
        </div>
      ) : (

        // 1. ACTIVE PROFILE REGISTER PANEL WORKSPACE
        <div className="space-y-6 flex flex-col pb-16">
          
          {/* Main card view avatar banner */}
          <div className="bg-[#141414] border border-white/5 rounded-[24px] p-5 relative overflow-hidden flex flex-col items-center shadow-lg shadow-black/20">
            
            {/* Selfie edit trigger layer */}
            <div className="relative group mb-3.5">
              <img 
                src={avatarUrl || profile.photoURL} 
                alt="My Photo"
                className="w-24 h-24 rounded-full object-cover border-4 border-rose-500"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setShowPhotoModal(true)}
                className="absolute bottom-0 right-0 p-2 bg-[#0D0D0D] hover:bg-white/5 border border-white/10 text-rose-500 rounded-full transition shadow cursor-pointer"
                title="Change Photo"
                id="btn-avatar-selector"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1.5">
                <span className="text-2xl font-serif italic text-white">{profile.displayName}</span>
                {profile.isVerified && <BadgeCheck className="w-5 h-5 text-rose-500" />}
              </div>
              <div className="text-[10px] text-rose-400 font-mono tracking-[0.15em] font-bold uppercase">{profile.personality}</div>
              <p className="text-[10px] text-gray-500 mt-1.5 flex items-center justify-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{profile.location}</span>
              </p>
            </div>

          </div>

          {/* PROFILE SELFIE VERIFICATION SYSTEM DRAWER */}
          <section className="bg-[#141414] border border-white/5 rounded-2xl p-4.5">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[10px] tracking-[0.15em] font-medium uppercase text-rose-455 text-rose-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-rose-500" />
                <span>Profile verification system</span>
              </h4>
              {profile.verificationStatus === "verified" && (
                <span className="text-[9px] bg-rose-500 text-white font-semibold px-2 py-0.5 rounded-full shadow shadow-rose-500/25">Approved</span>
              )}
              {profile.verificationStatus === "pending" && (
                <span className="text-[9px] bg-[#0A0A0A] border border-white/5 text-rose-400 font-bold uppercase px-2 py-0.5 rounded-full animate-pulse font-mono">Sync Testing</span>
              )}
            </div>

            {profile.verificationStatus === "none" && (
              <div className="space-y-4">
                <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                  Earn a glowing gold verified badge! Take a selfie making a dynamic double-V pose to prove you hold pure honey integrity.
                </p>

                {/* Show simulation Camera panel */}
                {!showCamera && !capturedSelfie && (
                  <button 
                    onClick={startCam}
                    className="w-full bg-[#0A0A0A] hover:bg-[#1E1E1E] border border-white/5 hover:border-rose-500/20 text-rose-400 py-2.5 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    id="btn-open-checker"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Open Verification Cam</span>
                  </button>
                )}

                {showCamera && (
                  <div className="flex flex-col items-center gap-3.5 bg-[#0A0A0A] border border-white/5 p-4 rounded-xl relative">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-white/10 relative overflow-hidden flex items-center justify-center bg-[#0D0D0D]">
                      <video 
                        ref={cameraVideoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {camError && (
                        <div className="absolute inset-0 p-2 text-center text-[8px] text-neutral-500 flex flex-col items-center justify-center">
                          <span>Please allow webcam frames or simulate snap!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2.5">
                      <button 
                        type="button"
                        onClick={captureSnapshot}
                        className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-bold px-4 py-2 rounded-lg leading-none uppercase tracking-wider cursor-pointer"
                        id="btn-selfie-snap"
                      >
                        Capture Pose 📸
                      </button>
                      <button 
                        type="button"
                        onClick={stopCam}
                        className="text-gray-450 hover:text-white text-[10px] font-medium px-2 cursor-pointer"
                        id="btn-selfie-cancel"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {capturedSelfie && (
                  <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex flex-col items-center gap-3">
                    <img 
                      src={capturedSelfie} 
                      alt="Captured selfie"
                      className="w-24 h-24 rounded-full border-2 border-rose-500 object-cover"
                    />
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={handleTriggerVerification}
                        className="flex-1 bg-rose-500 text-white py-2 rounded-lg text-xs font-bold transition text-center uppercase tracking-wider cursor-pointer"
                        id="btn-submit-verification"
                      >
                        Submit Selfie Proof
                      </button>
                      <button 
                        onClick={() => setCapturedSelfie("")}
                        className="px-3 border border-white/10 hover:bg-white/5 text-gray-300 py-2 rounded-lg text-xs transition cursor-pointer"
                        id="btn-retake-selfie"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

            {profile.verificationStatus === "pending" && (
              <div className="flex items-center gap-3.5 p-3.5 bg-[#0A0A0A] border border-white/10 rounded-xl relative overflow-hidden">
                <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin flex items-center justify-center">
                  <Camera className="w-4.5 h-4.5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-200">Verification in progress</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 font-sans">Please wait ~5s while algorithms check your selfie...</div>
                </div>
              </div>
            )}

            {profile.verificationStatus === "verified" && (
              <div className="flex items-center gap-3 p-3.5 bg-[#0A0A0A] border border-rose-500/10 rounded-xl animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm border border-rose-500/20">
                  <ShieldCheck className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-100 flex items-center gap-1 font-sans">
                    <span>Certified Hive Badge Active</span>
                    <BadgeCheck className="w-4 h-4 text-rose-500" />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-sans">Your profile is vetted and holds custom transparency!</p>
                </div>
              </div>
            )}

          </section>

          {/* Form details input configuration */}
          <form onSubmit={handleSaveAll} className="space-y-4">
            
            <div className="border-t border-white/5 pt-4">
              <h3 className="text-[10px] tracking-[0.15em] font-medium text-gray-500 uppercase mb-3 text-center">Card specifications</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                  className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                  id="input-profile-name"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Age Location</label>
                <input 
                  type="number" 
                  value={age} 
                  onChange={(e) => setAge(Number(e.target.value))} 
                  className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                  min="18"
                  max="60"
                  id="input-profile-age"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Location Address</label>
              <input 
                type="text" 
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                required
                id="input-profile-location"
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Dating Biography</label>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 resize-none font-sans"
                rows={3}
                id="input-profile-bio"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">My Gender</label>
                <select 
                  value={gender} 
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  id="select-profile-gender"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Looking For</label>
                <select 
                  value={lookingFor} 
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  id="select-profile-lookingfor"
                >
                  <option value="Everyone">Everyone</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Myers-Briggs personality</label>
              <select 
                value={personality} 
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/5 text-xs text-neutral-100 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-mono"
                id="select-profile-personality"
              >
                {PRESET_PERSONALITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Selecting interests checkboxes */}
            <div>
              <label className="block text-[10px] text-gray-400 uppercase font-bold mb-2">My Spark Hobbies (Select 5)</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_INTERESTS.map(interest => {
                  const check = selectedInterests.includes(interest);
                  return (
                    <button
                      type="button"
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition ${check ? 'bg-rose-500 border-rose-500 text-white font-bold' : 'bg-[#0A0A0A] border-white/5 text-neutral-400 hover:bg-[#1E1E1E] cursor-pointer'}`}
                      id={`btn-interest-toggle-${interest.split(' ')[0]}`}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4 items-center justify-between border-t border-white/5 pt-5">
              <span className="text-[10px] text-rose-450 font-bold font-mono">{saveStatus}</span>
              <button 
                type="submit"
                className="flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition uppercase tracking-wider cursor-pointer"
                id="submit-profile-changes"
              >
                <Save className="w-4 h-4" />
                <span>Save Card Shifts</span>
              </button>
            </div>

          </form>

          <section className="border-t border-white/5 pt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] tracking-[0.15em] font-medium text-gray-500 uppercase">My feed posts</h3>
              <span className="text-[10px] text-rose-400 font-mono">{myPosts.length}</span>
            </div>

            {myPosts.length > 0 ? (
              <div className="space-y-3">
                {myPosts.map(post => (
                  <article key={post.id} className="bg-[#141414] border border-white/5 rounded-2xl p-4">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <img
                        src={post.userPhoto}
                        alt={post.userName}
                        className="w-8 h-8 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-neutral-200 truncate">{post.userName}</div>
                        <div className="text-[9px] text-gray-500 font-mono">
                          {new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed break-words whitespace-pre-wrap font-sans mb-3">
                      {post.content}
                    </p>

                    {post.mediaUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/5 bg-[#0A0A0A] aspect-video mb-3">
                        <img
                          src={post.mediaUrl}
                          alt="My feed post attachment"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] text-neutral-500">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-500" />
                        {post.likes.length}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                        {post.commentCount}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bg-[#141414] border border-white/5 rounded-2xl p-5 text-center">
                <ImageIcon className="w-5 h-5 text-rose-500 mx-auto mb-2" />
                <p className="text-xs text-neutral-500">Your feed posts will appear here after you buzz something.</p>
              </div>
            )}
          </section>

        </div>
      )}

      {/* Profile Photo Selector Modal (Device file picker, Drag & Drop, URL and Presets) */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-indigo-500"></div>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-serif italic text-white flex items-center gap-2">
                <span className="text-lg">📸</span> Update Profile Photo
              </h3>
              <button 
                onClick={() => {
                  setShowPhotoModal(false);
                  setPhotoError("");
                  setInputUrl("");
                }}
                className="text-neutral-400 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-5 pr-1 scrollbar-none flex-1">
              {/* Drag and drop zone */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-2 font-mono font-bold">
                  Option 1: Upload from Device
                </label>
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all ${
                    dragActive 
                      ? "border-rose-500 bg-rose-500/5 scale-98" 
                      : "border-white/10 hover:border-rose-500/30 bg-[#0A0A0A] hover:bg-[#0D0D0D]"
                  } relative cursor-pointer group`}
                >
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    id="file-upload-input"
                  />
                  <div className="w-9 h-9 rounded-full bg-[#141414] border border-white/5 flex items-center justify-center text-rose-500 mb-2.5 group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-white mb-0.5">
                    Drag & drop photo here
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    or click to browse your files (under 1MB)
                  </p>
                </div>
              </div>

              {/* Paste image URL */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-2 font-mono font-bold">
                  Option 2: Direct Image Web URL
                </label>
                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      <LinkIcon className="w-3.5 h-3.5" />
                    </span>
                    <input 
                      type="url"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/40 transition-colors font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-[#1A1A1E] hover:bg-rose-500 hover:text-white border border-white/5 hover:border-rose-500 text-neutral-300 text-xs px-3 rounded-xl transition-all cursor-pointer font-sans active:scale-95 py-2 inline-flex items-center"
                  >
                    Apply
                  </button>
                </form>
              </div>

              {/* Curated Unsplash portrait presets */}
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-neutral-500 mb-2 font-mono font-bold">
                  Option 3: Select Preset Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=150&q=80",
                    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
                  ].map((url, i) => {
                    const isSelected = avatarUrl === url;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(url);
                          setShowPhotoModal(false);
                        }}
                        className={`relative rounded-xl overflow-hidden aspect-square border transition-all cursor-pointer ${
                          isSelected ? "border-rose-500 scale-95 ring-2 ring-rose-500/40" : "border-white/5 hover:border-white/20 hover:scale-105"
                        }`}
                      >
                        <img 
                          src={url} 
                          alt={`Preset ${i + 1}`}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-rose-500/10 flex items-center justify-center">
                            <span className="bg-rose-500 text-white rounded-full p-0.5 shadow">
                              <Check className="w-2.5 h-2.5 stroke-[3.5]" />
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {photoError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl text-center font-sans">
                  {photoError}
                </div>
              )}
            </div>

            <div className="border-t border-white/5 pt-3 mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowPhotoModal(false);
                  setPhotoError("");
                  setInputUrl("");
                }}
                className="text-xs text-neutral-400 hover:text-white px-3 py-1.5 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
