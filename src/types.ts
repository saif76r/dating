/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  photoURL: string;
  bio: string;
  interests: string[];
  personality: string; // e.g. "Adventurer (ISFP)", "Protagonist (ENFJ)"
  isVerified: boolean;
  verificationSelfie?: string; // Data URL or mock image
  verificationStatus: "none" | "pending" | "verified";
  location: string;
  age: number;
  gender: string;
  lookingFor: string;
  likes: string[]; // List of user IDs liked
  dislikes: string[]; // List of user IDs disliked
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userVerified: boolean;
  content: string;
  mediaUrl?: string;
  likes: string[]; // Array of user IDs
  commentCount: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  participants: string[]; // Dual UID array
  lastMessage: string;
  lastMessageAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  isRead: boolean;
  callType?: "none" | "audio" | "video";
  callDuration?: number; // duration in seconds
}

export interface NotificationItem {
  id: string;
  type: "match" | "message" | "like" | "comment" | "call" | "verification";
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  senderId?: string; // payload context
}

export interface CallSession {
  roomId: string;
  callerId: string;
  receiverId: string;
  participants?: string[];
  status: "idle" | "calling" | "ringing" | "connected" | "ended";
  callType: "audio" | "video";
  duration: number; // seconds
  createdAt?: string;
  updatedAt?: string;
}
