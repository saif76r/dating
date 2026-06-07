/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserProfile, Post, Comment, ChatRoom, ChatMessage, NotificationItem, CallSession } from '../types';
import { db, isFirebaseActive, handleFirestoreError, OperationType, auth } from '../firebase';
import { onAuthStateChanged, signInAnonymously, User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  query, 
  orderBy, 
  getDoc,
  deleteDoc,
  where
} from 'firebase/firestore';

// --- SEED SEED DATA FOR BOT PROFILES ---
const PRESET_INTERESTS = [
  "Art & Design", "Coffee", "Tech", "Museums", "Yoga", "Astrology", 
  "Hiking", "Photography", "Books", "Ceramics", "Matcha", "Coding",
  "Music Festivals", "Wanderlust", "Pet Lover", "Bee Conservation", "Cooking"
];

const PRESET_PERSONALITIES = [
  "Architect (INTJ)", "Protagonist (ENFJ)", "Campaigner (ENFP)", 
  "Advocate (INFJ)", "Mediator (INFP)", "Logician (INTP)", 
  "Adventurer (ISFP)", "Executive (ESTJ)"
];

const BOT_CHAMBERS: UserProfile[] = [
  {
    id: "bot_seraphina",
    displayName: "Seraphina 🌸",
    email: "seraphina@honeybee.co",
    photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    bio: "Obsessed with modern architecture, slow-drip matcha espresso, and botanical gardens. Let's design a cozy hexagon hive.",
    interests: ["Art & Design", "Coffee", "Tech", "Books", "Matcha"],
    personality: "Architect (INTJ)",
    isVerified: true,
    verificationStatus: "verified",
    location: "Brooklyn, NY",
    age: 24,
    gender: "Female",
    lookingFor: "Everyone",
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "bot_alexander",
    displayName: "Alexander ⛰️",
    email: "alex@honeybee.co",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    bio: "Gravel bike enthusiast, landscape photographer, and coffee brewer. Always looking for the next ridge or hidden trail.",
    interests: ["Hiking", "Photography", "Tech", "Coffee", "Wanderlust"],
    personality: "Campaigner (ENFP)",
    isVerified: true,
    verificationStatus: "verified",
    location: "Austin, TX",
    age: 27,
    gender: "Male",
    lookingFor: "Everyone",
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "bot_elena",
    displayName: "Elena 🐝",
    email: "elena@honeybee.co",
    photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
    bio: "Cider maker, organic bee fosterer, and occasional celestial stargazer. Looking for deep conversations about space over campfire honey tea.",
    interests: ["Bee Conservation", "Yoga", "Astrology", "Books", "Cooking"],
    personality: "Advocate (INFJ)",
    isVerified: true,
    verificationStatus: "verified",
    location: "Portland, OR",
    age: 26,
    gender: "Female",
    lookingFor: "Everyone",
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "bot_marcus",
    displayName: "Marcus 🐕",
    email: "marcus@honeybee.co",
    photoURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
    bio: "Fullstack developer who cooks gourmet pasta. Dog father to two goldens. Let's trade favorite sourdough secret codes.",
    interests: ["Coding", "Tech", "Pet Lover", "Cooking", "Coffee"],
    personality: "Logician (INTP)",
    isVerified: false,
    verificationStatus: "none",
    location: "Seattle, WA",
    age: 29,
    gender: "Male",
    lookingFor: "Female",
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  },
  {
    id: "bot_chloe",
    displayName: "Chloe ✨",
    email: "chloe@honeybee.co",
    photoURL: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
    bio: "Acoustic guitarist and ceramic crafter. If you love classic indie music and cozy museum rainy days, let's connect!",
    interests: ["Music Festivals", "Ceramics", "Museums", "Books", "Yoga"],
    personality: "Mediator (INFP)",
    isVerified: true,
    verificationStatus: "verified",
    location: "San Francisco, CA",
    age: 25,
    gender: "Female",
    lookingFor: "Male",
    likes: [],
    dislikes: [],
    createdAt: new Date().toISOString()
  }
];

const INITIAL_POST_CHAMBERS: Post[] = [
  {
    id: "post_1",
    userId: "bot_elena",
    userName: "Elena 🐝",
    userPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=500&q=80",
    userVerified: true,
    content: "Bees need our help! Just completed planting wildflower seed carpets (borage, milkweed, lavender) in the local urban pollination garden. Every hexagon counts! 🌺💛🐝",
    mediaUrl: "https://images.unsplash.com/photo-1473201938096-7723af7e1892?auto=format&fit=crop&w=800&q=80",
    likes: ["bot_seraphina", "bot_chloe"],
    commentCount: 2,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: "post_2",
    userId: "bot_seraphina",
    userName: "Seraphina 🌸",
    userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    userVerified: true,
    content: "Drafting a sustainable timber hexagon dome concept. The honeycomb shape has incredible weight distribution. Nature is the ultimate engineer.",
    mediaUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80",
    likes: ["bot_marcus"],
    commentCount: 1,
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: "post_3",
    userId: "bot_alexander",
    userName: "Alexander ⛰️",
    userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    userVerified: true,
    content: "Caught the golden hour light beaming off the misty pine ridges this morning. This is my kind of medicine. 🌲⛰️☀️",
    mediaUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    likes: ["bot_elena", "bot_chloe"],
    commentCount: 0,
    createdAt: new Date(Date.now() - 3600000 * 15).toISOString()
  }
];

const INITIAL_COMMENTS: Comment[] = [
  {
    id: "comment_1",
    postId: "post_1",
    userId: "bot_seraphina",
    userName: "Seraphina 🌸",
    userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    content: "This is beautiful! Let me know if you need any geometric signage designed for the garden gates!",
    createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString()
  },
  {
    id: "comment_2",
    postId: "post_1",
    userId: "bot_chloe",
    userName: "Chloe ✨",
    userPhoto: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=80",
    content: "Absolutely sweet. I will write an acoustic song about the honeybees this weekend.",
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: "comment_3",
    postId: "post_2",
    userId: "bot_marcus",
    userName: "Marcus 🐕",
    userPhoto: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=500&q=80",
    content: "I'd love to help compile physical mock models for this concept in my woodworking shed!",
    createdAt: new Date(Date.now() - 3600000 * 7).toISOString()
  }
];

// LocalStorage Storage Keys
const KEY_ME = "honeybee_current_user";
const KEY_USERS = "honeybee_user_registry";
const KEY_POSTS = "honeybee_posts_registry";
const KEY_COMMENTS = "honeybee_posts_comments";
const KEY_CHATS = "honeybee_chats";
const KEY_MESSAGES = "honeybee_chat_messages";
const KEY_NOTIFS = "honeybee_notifications";

// Helper checking function
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Local storage error:", err);
  }
}

// MATCHING ALGORITHM
// Computes overlap of interests and Myers-Briggs/Personality affinities
export function calculateMatchScore(userA: { interests: string[], personality: string }, userB: { interests: string[], personality: string }): number {
  if (!userA || !userB) return 50;
  
  // Calculate Interest Overlap Percentage
  const setA = new Set(userA.interests.map(i => i.toLowerCase()));
  const setB = new Set(userB.interests.map(i => i.toLowerCase()));
  const common = [...setA].filter(i => setB.has(i));
  const maxInterestsCount = Math.max(1, Math.min(10, setA.size + setB.size));
  const interestScore = Math.min(100, Math.round((common.length / maxInterestsCount) * 100));

  // Personality Scoring (Dynamic compatibility matrix)
  const codeA = userA.personality.split('(')[1]?.replace(')', '') || "INFP";
  const codeB = userB.personality.split('(')[1]?.replace(')', '') || "INFP";

  // Compatibility rule: Introvert paired with Extrovert (balance) or shared values
  let personalityMatchCount = 0;
  for (let i = 0; i < 4; i++) {
    if (codeA[i] === codeB[i]) {
      personalityMatchCount += 1.5; // Shared cognitive dimension
    } else {
      // Complementary is good on Extraversion/Introversion and Judging/Perceiving
      if (i === 0 || i === 3) personalityMatchCount += 2;
    }
  }
  const personalityScore = Math.round((personalityMatchCount / 7) * 100);

  // Blend weighted 60% Interests, 40% Personality
  const finalScore = Math.min(99, Math.max(48, Math.round((interestScore * 0.6) + (personalityScore * 0.4))));
  return finalScore;
}

// DATABASE CLASS DEFINITION - Dual mode supporting Firestore and LocalStorage
class DatingStorage {
  private localUsers: UserProfile[] = [];
  private localPosts: Post[] = [];
  private localComments: Comment[] = [];
  private localChats: ChatRoom[] = [];
  private localMessages: Record<string, ChatMessage[]> = {}; // chatId -> messages
  private localNotifications: NotificationItem[] = [];
  private activeMe: UserProfile | null = null;
  private changeListeners: Set<() => void> = new Set();

  private firebaseSubscriptions: (() => void)[] = [];
  private messageSubscriptions: Record<string, () => void> = {};
  private commentSubscriptions: Record<string, () => void> = {};
  private dispatchedCallIds: Set<string> = new Set();
  
  constructor() {
    this.bootLocalData();
    if (isFirebaseActive) {
      onAuthStateChanged(auth, (user) => {
        if (user) {
          const me = this.getMe();
          if (!me || me.id !== user.uid) {
            console.log("Healing active profile ID with restored Firebase Auth UID:", user.uid);
            this.createOrUpdateMe({
              id: user.uid,
              displayName: user.displayName || me?.displayName || "Garden Explorer 🐝",
              email: user.email || me?.email || "user@example.com",
              photoURL: user.photoURL || me?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            }).then(() => {
              this.setupFirebaseRealtimeSync();
            });
          } else {
            this.setupFirebaseRealtimeSync();
          }
        } else {
          this.setupFirebaseRealtimeSync();
        }
      });
    }
  }

  private setupFirebaseRealtimeSync() {
    if (!isFirebaseActive) return;

    // Unsubscribe from any ongoing subscriptions
    this.firebaseSubscriptions.forEach(unsub => unsub());
    this.firebaseSubscriptions = [];

    const me = this.getMe();
    if (!me) return;

    // 1. Sync User registry
    try {
      const usersQuery = collection(db, 'users');
      const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
        const remoteUsers: UserProfile[] = [];
        snapshot.forEach((doc) => {
          remoteUsers.push(doc.data() as UserProfile);
        });

        if (remoteUsers.length > 0) {
          const merged = [...BOT_CHAMBERS];
          remoteUsers.forEach(ru => {
            const idx = merged.findIndex(u => u.id === ru.id);
            if (idx !== -1) {
              merged[idx] = ru;
            } else if (ru.id !== me.id) {
              merged.push(ru);
            }
          });
          this.localUsers = merged;
          saveJSON(KEY_USERS, this.localUsers);
          this.triggerChange();
        }
      }, (err) => {
        console.warn("Firestore users sync failed:", err);
      });
      this.firebaseSubscriptions.push(unsubUsers);
    } catch (e) {
      console.error("Error setting up users sync:", e);
    }

    // 2. Sync Community Posts
    try {
      const postsQuery = collection(db, 'posts');
      const unsubPosts = onSnapshot(postsQuery, (snapshot) => {
        const remotePosts: Post[] = [];
        snapshot.forEach((doc) => {
          remotePosts.push(doc.data() as Post);
        });

        this.mergeRemotePosts(remotePosts);
      }, (err) => {
        console.warn("Firestore posts sync failed:", err);
      });
      this.firebaseSubscriptions.push(unsubPosts);
    } catch (e) {
      console.error("Error setting up posts sync:", e);
    }

    // 3. Sync Chatrooms where participants contain user
    try {
      const chatsQuery = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', me.id)
      );
      const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
        const remoteChats: ChatRoom[] = [];
        snapshot.forEach((doc) => {
          remoteChats.push(doc.data() as ChatRoom);
        });

        if (remoteChats.length > 0) {
          this.localChats = remoteChats.sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
          saveJSON(KEY_CHATS, this.localChats);
          this.triggerChange();
        }
      }, (err) => {
        console.warn("Firestore chats sync failed:", err);
      });
      this.firebaseSubscriptions.push(unsubChats);
    } catch (e) {
      console.error("Error setting up chats sync:", e);
    }

    // 4. Sync call sessions where this user is a participant
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('participants', 'array-contains', me.id)
      );
      const unsubCalls = onSnapshot(callsQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const call = change.doc.data() as CallSession;
          if (!call || call.status === "ended") return;

          const displayStatus = call.callerId === me.id && call.status === "ringing" ? "calling" : call.status;
          const session = { ...call, roomId: call.roomId || change.doc.id, status: displayStatus };
          const dedupeKey = `${change.doc.id}:${call.status}:${call.updatedAt || call.createdAt || ""}`;

          if (call.status === "ringing" && call.receiverId === me.id && !this.dispatchedCallIds.has(dedupeKey)) {
            this.dispatchedCallIds.add(dedupeKey);
            const caller = this.localUsers.find(u => u.id === call.callerId);
            this.addNotification({
              type: "call",
              title: `Incoming ${call.callType} Call`,
              body: `${caller?.displayName || "A match"} is calling you...`,
              senderId: call.callerId
            });
          }

          window.dispatchEvent(new CustomEvent("honeybee-ringing", { detail: session }));
        });
      }, (err) => {
        console.warn("Firestore calls sync failed:", err);
      });
      this.firebaseSubscriptions.push(unsubCalls);
    } catch (e) {
      console.error("Error setting up calls sync:", e);
    }
  }

  private subscribeToMessagesIfActive(chatId: string) {
    if (!isFirebaseActive) return;
    if (this.messageSubscriptions[chatId]) return;

    try {
      const messagesQuery = query(
        collection(db, 'chats', chatId, 'messages'),
        orderBy('createdAt', 'asc')
      );
      const unsub = onSnapshot(messagesQuery, (snapshot) => {
        const msgs: ChatMessage[] = [];
        snapshot.forEach((doc) => {
          msgs.push(doc.data() as ChatMessage);
        });
        
        this.localMessages[chatId] = msgs;
        saveJSON(KEY_MESSAGES, this.localMessages);
        this.triggerChange();
      }, (err) => {
        console.warn(`Firestore messages sync active at chats/${chatId}/messages failed:`, err);
      });
      this.messageSubscriptions[chatId] = unsub;
    } catch (e) {
      console.error("Error setting up messages sync:", e);
    }
  }

  private subscribeToCommentsIfActive(postId: string) {
    if (!isFirebaseActive) return;
    if (this.commentSubscriptions[postId]) return;

    try {
      const commentsQuery = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'asc')
      );
      const unsub = onSnapshot(commentsQuery, (snapshot) => {
        const comms: Comment[] = [];
        snapshot.forEach((doc) => {
          comms.push(doc.data() as Comment);
        });

        if (comms.length > 0) {
          const filterLocal = this.localComments.filter(c => c.postId !== postId);
          this.localComments = [...filterLocal, ...comms];
          saveJSON(KEY_COMMENTS, this.localComments);
          this.triggerChange();
        }
      }, (err) => {
        console.warn(`Firestore comments sync active at posts/${postId}/comments failed:`, err);
      });
      this.commentSubscriptions[postId] = unsub;
    } catch (e) {
      console.error("Error setting up comments sync:", e);
    }
  }

  private bootLocalData() {
    this.localUsers = loadJSON<UserProfile[]>(KEY_USERS, BOT_CHAMBERS);
    this.localPosts = loadJSON<Post[]>(KEY_POSTS, INITIAL_POST_CHAMBERS);
    this.localComments = loadJSON<Comment[]>(KEY_COMMENTS, INITIAL_COMMENTS);
    this.localChats = loadJSON<ChatRoom[]>(KEY_CHATS, []);
    this.localMessages = loadJSON<Record<string, ChatMessage[]>>(KEY_MESSAGES, {});
    this.localNotifications = loadJSON<NotificationItem[]>(KEY_NOTIFS, []);
    
    const savedMe = localStorage.getItem(KEY_ME);
    if (savedMe) {
      try {
        this.activeMe = JSON.parse(savedMe);
        const idx = this.localUsers.findIndex(u => u.id === this.activeMe?.id);
        if (idx !== -1 && this.activeMe) {
          this.localUsers[idx] = this.activeMe;
        } else if (this.activeMe) {
          this.localUsers.push(this.activeMe);
        }
      } catch {
        this.activeMe = null;
      }
    }
  }

  public registerListener(callback: () => void) {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  private triggerChange() {
    this.changeListeners.forEach(cb => cb());
  }

  private async ensureFirebaseUser(): Promise<FirebaseUser | null> {
    if (!isFirebaseActive) return null;
    if (auth.currentUser) return auth.currentUser;

    try {
      const result = await signInAnonymously(auth);
      return result.user;
    } catch (err) {
      console.warn("Firebase anonymous auth is unavailable, so remote sync cannot run.", err);
      return null;
    }
  }

  private mergeRemotePosts(remotePosts: Post[]) {
    const merged = [...INITIAL_POST_CHAMBERS];

    [...this.localPosts, ...remotePosts].forEach(post => {
      const idx = merged.findIndex(p => p.id === post.id);
      if (idx !== -1) {
        merged[idx] = post;
      } else {
        merged.push(post);
      }
    });

    this.localPosts = merged.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    saveJSON(KEY_POSTS, this.localPosts);
    this.triggerChange();
  }

  // ME USER METHODS
  public getMe(): UserProfile | null {
    return this.activeMe;
  }

  public clearMe() {
    this.activeMe = null;
    localStorage.removeItem(KEY_ME);
    this.triggerChange();
  }

  public async createOrUpdateMe(profile: Partial<UserProfile>): Promise<UserProfile> {
    const firebaseUser = isFirebaseActive ? await this.ensureFirebaseUser() : null;
    const uid = profile.id || firebaseUser?.uid || (this.activeMe ? this.activeMe.id : "temp_user");
    const isDifferentUser = this.activeMe && this.activeMe.id !== uid;
    
    let baseMe = isDifferentUser ? null : this.activeMe;
    if (!baseMe) {
      baseMe = {
        id: uid,
        displayName: profile.displayName || "Honeybee Explorer",
        email: profile.email || "bee@honeybee.com",
        photoURL: profile.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=500&q=80",
        bio: profile.bio || "Busy bee looking for honey sweetness. 🌱🐝",
        interests: profile.interests || ["Coffee", "Tech", "Wanderlust"],
        personality: profile.personality || "Campaigner (ENFP)",
        isVerified: false,
        verificationStatus: "none",
        location: profile.location || "San Francisco, CA",
        age: profile.age || 26,
        gender: profile.gender || "Everyone",
        lookingFor: profile.lookingFor || "Everyone",
        likes: profile.likes || [],
        dislikes: profile.dislikes || [],
        createdAt: profile.createdAt || new Date().toISOString()
      };
    }

    const mergedProfile = { ...baseMe, ...profile, id: uid };

    if (isFirebaseActive) {
      try {
        const docRef = doc(db, 'users', uid);
        await setDoc(docRef, mergedProfile, { merge: true });
      } catch (err) {
        console.warn("Profile saved locally, but Firebase profile sync failed:", err);
      }
    }

    this.activeMe = mergedProfile;
    saveJSON(KEY_ME, this.activeMe);
    
    const idx = this.localUsers.findIndex(u => u.id === this.activeMe?.id);
    if (idx !== -1) {
      this.localUsers[idx] = this.activeMe;
    } else {
      this.localUsers.push(this.activeMe);
    }
    saveJSON(KEY_USERS, this.localUsers);

    if (isFirebaseActive) {
      this.setupFirebaseRealtimeSync();
    }

    this.triggerChange();
    return this.activeMe;
  }

  // VIEW USERS (EXCLUDING OWN PROFILE)
  public getUsers(): UserProfile[] {
    const me = this.getMe();
    if (!me) return this.localUsers;
    return this.localUsers.filter(u => u.id !== me.id);
  }

  // ENHANCED ALGORITHM SEARCH / DISCOVERY MATCH
  public getDiscoveredMatches(filters: { interest?: string, personality?: string, minAge?: number, maxAge?: number, search?: string }): { user: UserProfile, score: number }[] {
    const users = this.getUsers();
    const me = this.getMe();
    if (!me) {
      return users.map(u => ({ user: u, score: calculateMatchScore(BOT_CHAMBERS[0], u) }));
    }

    const unswiped = users.filter(u => !me.likes.includes(u.id) && !me.dislikes.includes(u.id));

    let results = unswiped.map(user => {
      const score = calculateMatchScore(me, user);
      return { user, score };
    });

    if (filters.interest) {
      results = results.filter(r => r.user.interests.some(i => i.toLowerCase().includes(filters.interest!.toLowerCase())));
    }

    if (filters.personality) {
      results = results.filter(r => r.user.personality.toLowerCase().includes(filters.personality!.toLowerCase()));
    }

    if (filters.search) {
      const needle = filters.search.toLowerCase().trim();
      results = results.filter(r => {
        const searchable = [
          r.user.displayName,
          r.user.email,
          r.user.bio,
          r.user.location,
          r.user.personality,
          r.user.gender,
          r.user.lookingFor,
          ...r.user.interests
        ].join(" ").toLowerCase();
        return searchable.includes(needle);
      });
    }

    if (filters.minAge) {
      results = results.filter(r => r.user.age >= filters.minAge!);
    }
    if (filters.maxAge) {
      results = results.filter(r => r.user.age <= filters.maxAge!);
    }

    return results.sort((a, b) => b.score - a.score);
  }

  // SWIPING / LIKING PROFILES
  public async likeProfile(targetId: string): Promise<{ matched: boolean, room?: ChatRoom }> {
    const me = this.getMe();
    if (!me) return { matched: false };

    if (!me.likes.includes(targetId)) {
      me.likes.push(targetId);
      await this.createOrUpdateMe({ likes: me.likes });
    }

    const targetUser = this.localUsers.find(u => u.id === targetId);
    let matched = false;
    let room: ChatRoom | undefined;

    if (targetUser && (targetUser.id.startsWith("bot_") || targetUser.likes.includes(me.id))) {
      matched = true;
      
      if (targetUser.id.startsWith("bot_") && !targetUser.likes.includes(me.id)) {
        targetUser.likes.push(me.id);
        const idx = this.localUsers.findIndex(u => u.id === targetId);
        if (idx !== -1) {
          this.localUsers[idx] = targetUser;
          saveJSON(KEY_USERS, this.localUsers);
        }

        if (isFirebaseActive) {
          try {
            await setDoc(doc(db, 'users', targetId), targetUser, { merge: true });
          } catch (e) {
            console.warn("Could not save simulated likes for bot on Firebase:", e);
          }
        }
      }

      const roomId = [me.id, targetId].sort().join("_");
      let existingRoom = this.localChats.find(c => c.id === roomId);
      if (!existingRoom) {
        existingRoom = {
          id: roomId,
          participants: [me.id, targetId],
          lastMessage: "Honeycomb match! Start buzzing 🐝✨",
          lastMessageAt: new Date().toISOString()
        };
        this.localChats.unshift(existingRoom);
        saveJSON(KEY_CHATS, this.localChats);

        const welcomeMsg: ChatMessage = {
          id: "sys_" + Math.random().toString(36).substr(2, 9),
          senderId: "system",
          text: `You and ${targetUser.displayName} shared a sweet honeycomb! You both love ${this.getSharedInterests(me, targetUser).slice(0,2).join(', ') || 'chatting'}. Send a buzzer!`,
          createdAt: new Date().toISOString(),
          isRead: false
        };
        this.localMessages[roomId] = [welcomeMsg];
        saveJSON(KEY_MESSAGES, this.localMessages);

        if (isFirebaseActive) {
          try {
            await setDoc(doc(db, 'chats', roomId), existingRoom);
            await setDoc(doc(db, 'chats', roomId, 'messages', welcomeMsg.id), welcomeMsg);
          } catch (err) {
            handleFirestoreError(err, OperationType.CREATE, `chats/${roomId}`);
          }
        }
      }
      room = existingRoom;

      this.addNotification({
        type: "match",
        title: "Hive Alert! Match Found 🐝🏆",
        body: `You matched with ${targetUser.displayName}! Say hello and buzz together!`,
        senderId: targetId
      });
    }

    this.triggerChange();
    return { matched, room };
  }

  public async dislikeProfile(targetId: string) {
    const me = this.getMe();
    if (!me) return;
    if (!me.dislikes.includes(targetId)) {
      me.dislikes.push(targetId);
      await this.createOrUpdateMe({ dislikes: me.dislikes });
    }
    this.triggerChange();
  }

  private getSharedInterests(u1: UserProfile, u2: UserProfile): string[] {
    return u1.interests.filter(i => u2.interests.includes(i));
  }

  // FEEDS & SOCIAL FEED POSTS
  public getPosts(): Post[] {
    return this.localPosts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async refreshRemotePosts(): Promise<Post[]> {
    if (!isFirebaseActive) return this.getPosts();

    try {
      const snapshot = await getDocs(collection(db, 'posts'));
      const remotePosts: Post[] = [];
      snapshot.forEach((doc) => {
        remotePosts.push(doc.data() as Post);
      });
      this.mergeRemotePosts(remotePosts);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'posts');
    }

    return this.getPosts();
  }

  public async craftPost(content: string, mediaUrl?: string): Promise<Post> {
    const me = this.getMe();
    if (!me) throw new Error("Anonymous cannot post");
    const firebaseUser = isFirebaseActive ? await this.ensureFirebaseUser() : null;
    const firebaseUid = firebaseUser?.uid || null;
    const authorId = firebaseUid || me.id;
    const author = firebaseUid && me.id !== firebaseUid
      ? await this.createOrUpdateMe({ ...me, id: firebaseUid })
      : me;

    const newPost: Post = {
      id: "post_" + Math.random().toString(36).substr(2, 9),
      userId: authorId,
      userName: author.displayName,
      userPhoto: author.photoURL,
      userVerified: author.isVerified,
      content,
      mediaUrl,
      likes: [],
      commentCount: 0,
      createdAt: new Date().toISOString()
    };

    this.localPosts.unshift(newPost);
    saveJSON(KEY_POSTS, this.localPosts);
    this.triggerChange();

    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, 'posts', newPost.id), newPost);
      } catch (err) {
        if (mediaUrl?.startsWith("data:")) {
          try {
            const postWithoutUpload = { ...newPost, mediaUrl: undefined };
            await setDoc(doc(db, 'posts', newPost.id), postWithoutUpload);
            console.warn("Post synced without uploaded image because Firestore rejected the image payload.", err);
            this.addNotification({
              type: "verification",
              title: "Post synced without photo",
              body: "The uploaded photo was too large for Firestore, but the text post is visible to others.",
              senderId: me.id
            });
          } catch (retryErr) {
            console.warn("Post saved locally, but Firebase post sync failed:", retryErr);
            this.addNotification({
              type: "verification",
              title: "Post saved locally",
              body: "Firebase rejected the post sync. Deploy the latest Firestore rules and try again.",
              senderId: me.id
            });
            throw retryErr;
          }
        } else {
          console.warn("Post saved locally, but Firebase post sync failed:", err);
          this.addNotification({
            type: "verification",
            title: "Post saved locally",
            body: "Firebase rejected the post sync. Deploy the latest Firestore rules and try again.",
            senderId: me.id
          });
          throw err;
        }
      }
    }

    this.runRandomSocialInteraction(newPost.id);

    return newPost;
  }

  public async likePost(postId: string): Promise<Post | null> {
    const me = this.getMe();
    if (!me) return null;

    const idx = this.localPosts.findIndex(p => p.id === postId);
    if (idx === -1) return null;

    const post = this.localPosts[idx];
    const userLikeIdx = post.likes.indexOf(me.id);
    if (userLikeIdx === -1) {
      post.likes.push(me.id);
      if (post.userId !== me.id) {
        this.addNotification({
          type: "like",
          title: "Sweet reaction 🐝",
          body: `${me.displayName} liked your post: "${post.content.substring(0, 30)}..."`,
          senderId: me.id
        });
      }
    } else {
      post.likes.splice(userLikeIdx, 1);
    }

    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, 'posts', postId), post, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
      }
    }

    this.localPosts[idx] = post;
    saveJSON(KEY_POSTS, this.localPosts);
    this.triggerChange();
    return post;
  }

  // COMMENTS
  public getComments(postId: string): Comment[] {
    this.subscribeToCommentsIfActive(postId);
    return this.localComments.filter(c => c.postId === postId)
                             .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public async leaveComment(postId: string, content: string): Promise<Comment> {
    const me = this.getMe();
    if (!me) throw new Error("Not logged in");
    const firebaseUid = isFirebaseActive ? auth.currentUser?.uid : null;
    const authorId = firebaseUid || me.id;

    const newComment: Comment = {
      id: "comment_" + Math.random().toString(36).substr(2, 9),
      postId,
      userId: authorId,
      userName: me.displayName,
      userPhoto: me.photoURL,
      content,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, `posts/${postId}/comments`, newComment.id), newComment);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `posts/${postId}/comments/${newComment.id}`);
      }
    }

    this.localComments.push(newComment);
    saveJSON(KEY_COMMENTS, this.localComments);

    const postIdx = this.localPosts.findIndex(p => p.id === postId);
    if (postIdx !== -1) {
      this.localPosts[postIdx].commentCount += 1;
      saveJSON(KEY_POSTS, this.localPosts);
      
      const post = this.localPosts[postIdx];
      if (post.userId !== me.id) {
        this.addNotification({
          type: "comment",
          title: "New hive chatter",
          body: `${me.displayName} commented: "${content.substring(0, 30)}..."`,
          senderId: me.id
        });
      }

      if (isFirebaseActive) {
        try {
          await setDoc(doc(db, 'posts', postId), this.localPosts[postIdx], { merge: true });
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
        }
      }
    }

    this.triggerChange();
    return newComment;
  }

  // CHATS
  public getChats(): ChatRoom[] {
    const me = this.getMe();
    if (!me) return [];
    return this.localChats.filter(c => c.participants.includes(me.id))
                          .sort((a,b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }

  public async openChatWithUser(userId: string): Promise<ChatRoom> {
    const me = this.getMe();
    if (!me) throw new Error("Log in required");

    const roomId = [me.id, userId].sort().join("_");
    let room = this.localChats.find(c => c.id === roomId);
    if (!room) {
      room = {
        id: roomId,
        participants: [me.id, userId],
        lastMessage: "Chat opened",
        lastMessageAt: new Date().toISOString()
      };
      this.localChats.unshift(room);
      saveJSON(KEY_CHATS, this.localChats);

      if (isFirebaseActive) {
        try {
          await setDoc(doc(db, 'chats', roomId), room);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chats/${roomId}`);
        }
      }
      this.triggerChange();
    }
    this.subscribeToMessagesIfActive(roomId);
    return room;
  }

  public getMessages(chatId: string): ChatMessage[] {
    this.subscribeToMessagesIfActive(chatId);
    return this.localMessages[chatId] || [];
  }

  public async sendChatMessage(chatId: string, text: string, callType?: "none" | "audio" | "video", callDuration?: number): Promise<ChatMessage> {
    const me = this.getMe();
    if (!me) throw new Error("Log in required");

    const newMsg: ChatMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      senderId: me.id,
      text,
      createdAt: new Date().toISOString(),
      isRead: false,
      callType: callType || "none",
      callDuration: callDuration || 0
    };

    if (!this.localMessages[chatId]) {
      this.localMessages[chatId] = [];
    }
    this.localMessages[chatId].push(newMsg);
    saveJSON(KEY_MESSAGES, this.localMessages);

    const roomIdx = this.localChats.findIndex(r => r.id === chatId);
    if (roomIdx !== -1) {
      this.localChats[roomIdx].lastMessage = text;
      this.localChats[roomIdx].lastMessageAt = newMsg.createdAt;
      saveJSON(KEY_CHATS, this.localChats);
    }

    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, 'chats', chatId, 'messages', newMsg.id), newMsg);
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: text,
          lastMessageAt: newMsg.createdAt
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${newMsg.id}`);
      }
    }

    this.triggerChange();

    const participants = this.localChats[roomIdx]?.participants || chatId.split('_');
    const botId = participants.find(id => id !== me.id);
    if (botId && botId.startsWith("bot_") && !callType) {
      this.simulateIncomingBotReply(chatId, botId);
    }

    return newMsg;
  }

  public getUserById(userId: string): UserProfile | undefined {
    const me = this.getMe();
    if (me?.id === userId) return me;
    return this.localUsers.find(u => u.id === userId);
  }

  private simulateIncomingBotReply(chatId: string, botId: string) {
    const bot = this.localUsers.find(u => u.id === botId);
    const botName = bot?.displayName || "Honeybee";
    
    setTimeout(async () => {
      const messages = this.getMessages(chatId);
      const userLastMsg = [...messages].reverse().find(m => m.senderId !== "system" && m.senderId !== "bot");
      
      let replyText = `Bzzzz! That sounds absolutely honey-sweet! Tell me more! 🍯🐝`;
      if (userLastMsg) {
        const txt = userLastMsg.text.toLowerCase();
        if (txt.includes("hello") || txt.includes("hi") || txt.includes("hey")) {
          replyText = `Hey there explorer! 🐝 How has your week in the hive been? I was just reading about ${bot?.interests[0] || 'nature'}.`;
        } else if (txt.includes("coffee") || txt.includes("tea") || txt.includes("matcha")) {
          replyText = `Oh matches made in cafe heaven! ☕️ Dynamic honey matcha in a porcelain mug is my pure weakness. Let's do a matching date soon!`;
        } else if (txt.includes("personality") || txt.includes("type")) {
          replyText = `Fascinating topic! I am a proud ${bot?.personality || "INFJ"}. I think our values create a beautiful honey harmony!`;
        } else if (txt.includes("call") || txt.includes("video") || txt.includes("talk")) {
          replyText = `I would love to voice call! Tap the call button in our header and we can chat now! 📞🐝`;
        } else if (txt.includes("verified") || txt.includes("verify")) {
          replyText = `Verification is so quick! Have you snapped your selfie pose yet? Let's get matching hexagon badges! 👑✨`;
        }
      }

      const botMsg: ChatMessage = {
        id: "msg_bot_" + Math.random().toString(36).substr(2, 9),
        senderId: botId,
        text: replyText,
        createdAt: new Date().toISOString(),
        isRead: false
      };

      this.localMessages[chatId].push(botMsg);
      saveJSON(KEY_MESSAGES, this.localMessages);

      const roomIdx = this.localChats.findIndex(r => r.id === chatId);
      if (roomIdx !== -1) {
        this.localChats[roomIdx].lastMessage = replyText;
        this.localChats[roomIdx].lastMessageAt = botMsg.createdAt;
        saveJSON(KEY_CHATS, this.localChats);
      }

      if (isFirebaseActive) {
        try {
          await setDoc(doc(db, 'chats', chatId, 'messages', botMsg.id), botMsg);
          await updateDoc(doc(db, 'chats', chatId), {
            lastMessage: replyText,
            lastMessageAt: botMsg.createdAt
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${botMsg.id}`);
        }
      }

      this.addNotification({
        type: "message",
        title: `${botName} 🐝`,
        body: replyText,
        senderId: botId
      });

      this.triggerChange();
    }, 1500);
  }

  // NOTIFICATION UTILS
  public getNotifications(): NotificationItem[] {
    return this.localNotifications.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public addNotification(item: Omit<NotificationItem, "id" | "timestamp" | "read">) {
    const newNotif: NotificationItem = {
      ...item,
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    };

    this.localNotifications.unshift(newNotif);
    saveJSON(KEY_NOTIFS, this.localNotifications);
    this.triggerChange();

    window.dispatchEvent(new CustomEvent("honeybee-notif", { detail: newNotif }));
  }

  public markAllNotificationsRead() {
    this.localNotifications.forEach(n => n.read = true);
    saveJSON(KEY_NOTIFS, this.localNotifications);
    this.triggerChange();
  }

  // VERIFICATION WORKFLOW
  public async submitProfileVerification(selfieDataUrl: string): Promise<UserProfile> {
    const me = await this.createOrUpdateMe({
      verificationStatus: "pending",
      verificationSelfie: selfieDataUrl
    });

    this.addNotification({
      type: "verification",
      title: "Hive Proof Submitted 📸",
      body: "Thanks! Our honey protectors are reviewing your selfie now.",
    });

    setTimeout(async () => {
      await this.createOrUpdateMe({
        isVerified: true,
        verificationStatus: "verified"
      });

      this.addNotification({
        type: "verification",
        title: "Profile Verified! 👑🌟",
        body: "Yay! You snapped a golden hexagon verified badge. Enjoy full honey integrity!",
      });
    }, 5000);

    return me;
  }

  // SOCIAL POST INTERACTIVE BOT SIMULATOR
  private runRandomSocialInteraction(postId: string) {
    setTimeout(() => {
      const bots = BOT_CHAMBERS;
      const decider = Math.random();
      const me = this.getMe();
      if (!me) return;

      if (decider > 0.1) {
        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        const postIdx = this.localPosts.findIndex(p => p.id === postId);
        if (postIdx !== -1) {
          const post = this.localPosts[postIdx];
          if (!post.likes.includes(randomBot.id)) {
            post.likes.push(randomBot.id);
            saveJSON(KEY_POSTS, this.localPosts);

            if (isFirebaseActive) {
              setDoc(doc(db, 'posts', postId), post, { merge: true }).catch(console.warn);
            }

            this.addNotification({
              type: "like",
              title: "Post Sweetener! 🍯",
              body: `${randomBot.displayName} liked your new feed post!`,
              senderId: randomBot.id
            });
            this.triggerChange();
          }
        }
      }

      setTimeout(() => {
        const randomBot = bots[Math.floor(Math.random() * bots.length)];
        const comments = [
          "This hexagon vibe is absolutely delicious! 🍯😍",
          "Simply love how you write about community connection!",
          "Wow matching with gorgeous minds on here is real!",
          "So pure! Let's get together in the garden soon! 🐝🌾"
        ];
        
        const postIdx = this.localPosts.findIndex(p => p.id === postId);
        if (postIdx !== -1) {
          const commentId = "comment_" + Math.random().toString(36).substr(2, 9);
          const newComment: Comment = {
            id: commentId,
            postId,
            userId: randomBot.id,
            userName: randomBot.displayName,
            userPhoto: randomBot.photoURL,
            content: comments[Math.floor(Math.random() * comments.length)],
            createdAt: new Date().toISOString()
          };
          this.localComments.push(newComment);
          saveJSON(KEY_COMMENTS, this.localComments);

          this.localPosts[postIdx].commentCount += 1;
          saveJSON(KEY_POSTS, this.localPosts);

          if (isFirebaseActive) {
            setDoc(doc(db, `posts/${postId}/comments`, commentId), newComment).catch(console.warn);
            setDoc(doc(db, 'posts', postId), this.localPosts[postIdx], { merge: true }).catch(console.warn);
          }

          this.addNotification({
            type: "comment",
            title: "Hive Comment 💬",
            body: `${randomBot.displayName} commented on your post!`,
            senderId: randomBot.id
          });
          this.triggerChange();
        }
      }, 3000);

    }, 3000);
  }

  // CALL WORKFLOW
  public async startCall(receiverId: string, callType: "audio" | "video"): Promise<CallSession> {
    const me = this.getMe();
    if (!me) throw new Error("Log in required");

    const roomId = [me.id, receiverId].sort().join("_");
    const now = new Date().toISOString();
    const session: CallSession = {
      roomId,
      callerId: me.id,
      receiverId,
      participants: [me.id, receiverId],
      status: receiverId.startsWith("bot_") ? "calling" : "ringing",
      callType,
      duration: 0,
      createdAt: now,
      updatedAt: now
    };

    if (receiverId.startsWith("bot_")) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("honeybee-ringing", {
          detail: { ...session, status: "connected", updatedAt: new Date().toISOString() }
        }));
      }, 2500);
      return session;
    }

    if (isFirebaseActive) {
      try {
        await setDoc(doc(db, 'calls', roomId), session);
      } catch (err) {
        console.warn("Call signaling create failed. Check that firestore.rules has been deployed.", err);
        this.addNotification({
          type: "call",
          title: "Call blocked by Firebase rules",
          body: "Deploy the latest firestore.rules file in Firebase, then try calling again.",
          senderId: receiverId
        });
      }
    }

    return { ...session, status: "calling" };
  }

  public async updateCallStatus(session: CallSession, status: CallSession["status"], duration = 0) {
    const updatedAt = new Date().toISOString();
    if (isFirebaseActive && session.roomId && !session.receiverId.startsWith("bot_") && !session.callerId.startsWith("bot_")) {
      try {
        await updateDoc(doc(db, 'calls', session.roomId), {
          status,
          duration,
          updatedAt
        });
      } catch (err) {
        console.warn("Call signaling update failed. Check that firestore.rules has been deployed.", err);
      }
    }
  }

  public triggerIncomingCallSimulation(botId: string, callType: "audio" | "video"): CallSession {
    const bot = this.localUsers.find(u => u.id === botId);
    const me = this.getMe();
    
    const sess: CallSession = {
      roomId: ["caller", botId].join("_"),
      callerId: botId,
      receiverId: me?.id || "me",
      status: "ringing",
      callType,
      duration: 0
    };

    window.dispatchEvent(new CustomEvent("honeybee-ringing", { detail: sess }));
    
    this.addNotification({
      type: "call",
      title: `Incoming ${callType} Call 📞`,
      body: `${bot?.displayName || "Honeybee Match"} is buzzing you...`,
      senderId: botId
    });

    return sess;
  }
}

export const Storage = new DatingStorage();
export { PRESET_INTERESTS, PRESET_PERSONALITIES };
