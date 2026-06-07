/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { arrayUnion, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { 
  Phone, 
  PhoneOff, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  User, 
  ShieldAlert, 
  Camera,
  Activity,
  Maximize
} from 'lucide-react';
import { Storage } from '../lib/db';
import { UserProfile, CallSession } from '../types';
import { db, isFirebaseActive } from '../firebase';

interface CallsProps {
  session: CallSession;
  onEndCall: () => void;
}

export default function Calls({ session, onEndCall }: CallsProps) {
  const [status, setStatus] = useState<"idle" | "calling" | "ringing" | "connected" | "ended">(session.status);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(session.callType === "audio");
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isLocalPreviewReady, setIsLocalPreviewReady] = useState(false);

  // Video streams refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const signalingUnsubRef = useRef<(() => void) | null>(null);
  const addedCandidateKeysRef = useRef<Set<string>>(new Set());
  const isStartingWebRtcRef = useRef(false);
  const hasCreatedAnswerRef = useRef(false);
  const hasCreatedOfferRef = useRef(false);

  const callerProfile = Storage.getUsers().find(u => u.id === session.callerId) || Storage.getMe();
  const receiverProfile = Storage.getUsers().find(u => u.id === session.receiverId) || Storage.getMe();
  const peerProfile = session.callerId === Storage.getMe()?.id ? receiverProfile : callerProfile;

  const isBotCall = session.callerId.startsWith("bot_") || session.receiverId.startsWith("bot_");
  const currentUserId = Storage.getMe()?.id;
  const isCaller = currentUserId === session.callerId;

  useEffect(() => {
    setStatus(session.status);
    
    // Automatically accept bot incoming call after 3 seconds for simulated experience
    let botAcceptTimeout: NodeJS.Timeout;
    if (session.status === "ringing" && session.callerId.startsWith("bot_")) {
      botAcceptTimeout = setTimeout(() => {
        handleAccept();
      }, 3500);
    }

    return () => {
      clearTimeout(botAcceptTimeout);
    };
  }, [session.status]);

  useEffect(() => {
    return () => cleanupCallMedia();
  }, []);

  // Start local media for simulated calls. Real Firebase calls are managed by WebRTC setup.
  useEffect(() => {
    if (isBotCall && status === "connected" && session.callType === "video" && !isCameraOff) {
      startCamera();
    } else if (isBotCall) {
      stopTracks();
    }
  }, [status, isCameraOff, isBotCall]);

  useEffect(() => {
    if (!isFirebaseActive || isBotCall || !currentUserId || status === "idle" || status === "ended") return;
    if (!isCaller && status !== "connected") return;

    startWebRtcCall().catch((err) => {
      console.warn("WebRTC setup failed.", err);
      setStreamError("Live media connection failed");
    });
  }, [status, isBotCall, currentUserId, isCaller]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
  }, [isMuted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach(track => {
      track.enabled = !isCameraOff;
    });
    attachLocalStream();
  }, [isCameraOff]);

  useEffect(() => {
    const remoteAudio = remoteAudioRef.current;
    const remoteVideo = remoteVideoRef.current;
    if (remoteAudio) {
      remoteAudio.muted = !isSpeakerOn;
      remoteAudio.volume = isSpeakerOn ? 1 : 0;
    }
    if (remoteVideo) {
      remoteVideo.muted = !isSpeakerOn;
      remoteVideo.volume = isSpeakerOn ? 1 : 0;
    }
  }, [isSpeakerOn]);

  // Duration Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === "connected") {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  const attachLocalStream = () => {
    const localVideo = localVideoRef.current;
    const localStream = streamRef.current;
    if (!localVideo || !localStream) return;

    if (localVideo.srcObject !== localStream) {
      localVideo.srcObject = localStream;
    }
    localVideo.muted = true;
    localVideo.playsInline = true;
    localVideo.autoplay = true;

    const activeVideoTrack = localStream.getVideoTracks().some(track => track.readyState === "live" && track.enabled);
    setIsLocalPreviewReady(activeVideoTrack);

    if (activeVideoTrack) {
      localVideo.play().catch((err) => {
        console.warn("Local camera preview autoplay was blocked.", err);
      });
    }
  };

  useEffect(() => {
    if (status === "connected" && session.callType === "video" && !isCameraOff) {
      attachLocalStream();
    }
  }, [status, session.callType, isCameraOff]);

  const startCamera = async () => {
    try {
      setStreamError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, 
        audio: true 
      });
      streamRef.current = mediaStream;
      attachLocalStream();
    } catch (err) {
      console.warn("Camera streaming permission blocked or device unavailable. Falling back nicely.", err);
      setStreamError("Webcam preview restricted or occupied");
      setIsLocalPreviewReady(false);
    }
  };

  const getLocalMedia = async () => {
    if (streamRef.current) return streamRef.current;

    setStreamError(null);
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: session.callType === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
      audio: true
    });

    mediaStream.getAudioTracks().forEach(track => {
      track.enabled = !isMuted;
    });
    mediaStream.getVideoTracks().forEach(track => {
      track.enabled = !isCameraOff;
    });

    streamRef.current = mediaStream;
    attachLocalStream();
    return mediaStream;
  };

  const attachRemoteStream = () => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
      remoteVideoRef.current.play().catch(() => undefined);
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
      remoteAudioRef.current.play().catch(() => undefined);
    }
  };

  const startWebRtcCall = async () => {
    if (isStartingWebRtcRef.current || peerConnectionRef.current) return;
    isStartingWebRtcRef.current = true;

    try {
      const localStream = await getLocalMedia();
      const remoteStream = new MediaStream();
      remoteStreamRef.current = remoteStream;
      attachRemoteStream();

      const callDocRef = doc(db, 'calls', session.roomId);
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" }
        ]
      });
      peerConnectionRef.current = peerConnection;

      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });

      peerConnection.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach(track => {
          if (!remoteStream.getTracks().some(existing => existing.id === track.id)) {
            remoteStream.addTrack(track);
          }
        });
        attachRemoteStream();
      };

      const localCandidatesField = isCaller ? "callerCandidates" : "receiverCandidates";
      const remoteCandidatesField = isCaller ? "receiverCandidates" : "callerCandidates";

      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          updateDoc(callDocRef, {
            [localCandidatesField]: arrayUnion(event.candidate.toJSON())
          }).catch((err) => console.warn("Failed to publish ICE candidate.", err));
        }
      };

      signalingUnsubRef.current = onSnapshot(callDocRef, async (snapshot) => {
        const data = snapshot.data() as (CallSession & {
          offer?: RTCSessionDescriptionInit;
          answer?: RTCSessionDescriptionInit;
          callerCandidates?: RTCIceCandidateInit[];
          receiverCandidates?: RTCIceCandidateInit[];
        }) | undefined;
        if (!data || !peerConnectionRef.current) return;

        try {
          if (!isCaller && data.offer && !peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
          }

          if (!isCaller && data.offer && !data.answer && !hasCreatedAnswerRef.current) {
            hasCreatedAnswerRef.current = true;
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            await updateDoc(callDocRef, {
              answer: { type: answer.type, sdp: answer.sdp },
              status: "connected",
              updatedAt: new Date().toISOString()
            });
          }

          if (isCaller && data.answer && !peerConnection.currentRemoteDescription) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          }

          const remoteCandidates = data[remoteCandidatesField] || [];
          for (const candidate of remoteCandidates) {
            const key = `${candidate.candidate || ""}:${candidate.sdpMid || ""}:${candidate.sdpMLineIndex ?? ""}`;
            if (addedCandidateKeysRef.current.has(key)) continue;
            addedCandidateKeysRef.current.add(key);
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          }
        } catch (err) {
          console.warn("WebRTC signaling update failed.", err);
        }
      });

      if (isCaller && !hasCreatedOfferRef.current) {
        hasCreatedOfferRef.current = true;
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        await updateDoc(callDocRef, {
          offer: { type: offer.type, sdp: offer.sdp },
          status: "ringing",
          updatedAt: new Date().toISOString()
        });
      }
    } finally {
      isStartingWebRtcRef.current = false;
    }

  };

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const cleanupCallMedia = () => {
    signalingUnsubRef.current?.();
    signalingUnsubRef.current = null;
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    remoteStreamRef.current?.getTracks().forEach(track => track.stop());
    remoteStreamRef.current = null;
    addedCandidateKeysRef.current.clear();
    stopTracks();
  };

  const handleAccept = async () => {
    setStatus("connected");
    session.status = "connected";
    await Storage.updateCallStatus(session, "connected");
  };

  const handleDeclineOrEnd = async () => {
    cleanupCallMedia();
    setStatus("ended");
    session.status = "ended";
    await Storage.updateCallStatus(session, "ended", duration);
    
    // Formulate call logs text
    const text = session.callType === "video" ? "💬 Video Call" : "📞 Voice Call";
    const roomId = [session.callerId, session.receiverId].sort().join("_");
    
    // Write call logs entry to chat thread
    await Storage.sendChatMessage(
      roomId, 
      text, 
      session.callType, 
      duration
    );

    // Trigger end callback with 1 sec delay
    setTimeout(() => {
      onEndCall();
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const min = String(Math.floor(seconds / 60)).padStart(2, '0');
    const sec = String(seconds % 60).padStart(2, '0');
    return `${min}:${sec}`;
  };

  return (
    <div className="absolute inset-0 bg-neutral-950 z-50 flex flex-col justify-between p-6 overflow-hidden animate-in fade-in duration-300">
      
      {/* Blurred background profile backplate */}
      <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
        <img 
          src={peerProfile?.photoURL} 
          alt="Blur backplate" 
          className="w-full h-full object-cover blur-3xl scale-150"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* CALLING / RINGING SCREENS VIEW */}
      {(status === "calling" || status === "ringing") && (
        <div className="flex-1 flex flex-col items-center justify-around z-10 py-10">
          
          <div className="text-center">
            <div className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1 select-none animate-pulse">
              {status === "calling" ? "Initiating sweet connection..." : "Ringing match hive..."}
            </div>
            <div className="text-[11px] font-mono text-neutral-500">Secure Peer Encrypted</div>
          </div>

          {/* Centered Profile Avatar Pulsing Wave */}
          <div className="relative">
            {/* Pulsing ring elements */}
            <div className="absolute inset-0 rounded-full bg-rose-500/25 scale-125 animate-ping"></div>
            <div className="absolute -inset-4 rounded-full border border-rose-500/10 scale-150 animate-pulse delay-75"></div>
            
            <img 
              src={peerProfile?.photoURL} 
              alt={peerProfile?.displayName}
              className="w-32 h-32 rounded-full object-cover border-4 border-rose-500 relative z-10 shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center z-10">
            <h2 className="text-xl font-black text-neutral-100 mb-1.5 flex items-center justify-center gap-1">
              <span>{peerProfile?.displayName}</span>
            </h2>
            <p className="text-xs text-neutral-400">
              {session.callType === "video" ? "Honeybee Video Broadcast" : "Honeybee High-Fi Voice Link"}
            </p>
          </div>

          {/* Action Call Accept / Decline button bar */}
          <div className="flex items-center justify-center gap-12 z-10 w-full px-8">
            <button 
              onClick={handleDeclineOrEnd}
              className="w-16 h-16 bg-red-500 hover:bg-red-600 text-neutral-50 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition"
              title="Decline"
              id="btn-decline-call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>

            {status === "ringing" && (
              <button 
                onClick={handleAccept}
                className="w-16 h-16 bg-green-500 hover:bg-green-600 text-neutral-50 rounded-full flex items-center justify-center shadow-lg animate-bounce active:scale-95 transition"
                title="Accept"
                id="btn-accept-call"
              >
                <Phone className="w-6 h-6" />
              </button>
            )}
          </div>

        </div>
      )}

      {/* ONGOING CONNECTED VOICE/VIDEO ACTIVE CALL WORKSPACE */}
      {status === "connected" && (
        <div className="flex-1 flex flex-col justify-between z-10 h-full relative">
          
          {/* Header toolbar */}
          <div className="flex justify-between items-center bg-black/40 backdrop-blur-md border border-neutral-800/40 rounded-2xl px-4 py-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></span>
              <span className="font-mono text-xs text-green-400 font-bold tracking-wider">{formatTimer(duration)}</span>
            </div>
            
            <div className="text-center">
              <div className="text-xs font-black text-neutral-200">{peerProfile?.displayName}</div>
              <div className="text-[9px] text-neutral-500 font-medium">Bzzing via WebRTC Link</div>
            </div>

            <Volume2 className="w-4 h-4 text-neutral-400" />
          </div>

          {/* Video Streams Canvas wrapper (Only shown on Video Call mode) */}
          <div className="flex-1 relative bg-neutral-900 border border-neutral-850 rounded-[28px] overflow-hidden flex items-center justify-center shadow-inner">
            
            {session.callType === "video" ? (
              <>
                {/* 1. Large background Peer Static Image or mockup avatar stream wrapper */}
                <div className="absolute inset-0">
                  <img 
                    src={peerProfile?.photoURL} 
                    alt="Peer Stream" 
                    className="w-full h-full object-cover filter brightness-[0.7] contrast-[1.05]"
                    referrerPolicy="no-referrer"
                  />
                  {!isBotCall && (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="absolute inset-0 w-full h-full object-cover bg-neutral-950"
                    />
                  )}
                  <audio ref={remoteAudioRef} autoPlay />
                  
                  {/* Streaming indicator label */}
                  <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur border border-neutral-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <Activity className="w-3 h-3 text-rose-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-neutral-200">{peerProfile?.displayName}'s Stream</span>
                  </div>
                </div>

                {/* 2. Floating Small Picture in Picture User Preview video */}
                <div className="absolute top-4 right-4 w-28 h-36 bg-neutral-950 border-2 border-rose-500 rounded-2xl overflow-hidden shadow-2xl z-23">
                  {!isCameraOff ? (
                    <>
                      <video 
                        ref={(node) => {
                          localVideoRef.current = node;
                          attachLocalStream();
                        }}
                        autoPlay 
                        playsInline 
                        muted 
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {!isLocalPreviewReady && !streamError && (
                        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-2 text-center text-[7px] text-neutral-500">
                          <Camera className="w-4 h-4 text-rose-500 mb-1 animate-pulse" />
                          <span>Starting camera...</span>
                        </div>
                      )}
                      {streamError && (
                        <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center p-2 text-center text-[7px] text-neutral-500">
                          <ShieldAlert className="w-4 h-4 text-rose-500 mb-1" />
                          <span>{streamError}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-[9px] text-neutral-500">
                      <VideoOff className="w-4 h-4 mb-1" />
                      <span>CAM OFF</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 text-[7px] bg-neutral-950/80 text-rose-450 px-1 py-0.5 rounded font-black uppercase">YOU</span>
                </div>
              </>
            ) : (
              // Audio Call Mode: simple high fidelity visualizer
              <div className="flex flex-col items-center text-center p-6 bg-neutral-950/60 w-full h-full justify-center">
                <img 
                  src={peerProfile?.photoURL} 
                  alt={peerProfile?.displayName}
                  className="w-24 h-24 rounded-full object-cover border-2 border-rose-500 mb-6 scale-105"
                  referrerPolicy="no-referrer"
                />
                <audio ref={remoteAudioRef} autoPlay />
                
                <h3 className="text-sm font-bold text-neutral-200 mb-2">Voice Call Active</h3>
                <div className="flex gap-1.5 items-center justify-center">
                  <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-[bounce_1.2s_infinite_100ms]"></span>
                  <span className="w-1.5 h-8 bg-pink-500 rounded-full animate-[bounce_1.2s_infinite_300ms]"></span>
                  <span className="w-1.5 h-4 bg-rose-600 rounded-full animate-[bounce_1.2s_infinite_500ms]"></span>
                  <span className="w-1.5 h-9 bg-pink-400 rounded-full animate-[bounce_1.2s_infinite_200ms]"></span>
                  <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-[bounce_1.2s_infinite_400ms]"></span>
                </div>
              </div>
            )}

          </div>

          {/* BOTTOM CONTROLS GRID */}
          <div className="mt-4 bg-black/60 backdrop-blur-md border border-neutral-800/40 rounded-2xl p-4 flex justify-around items-center gap-4">
            
            {/* Cam Toggle Button */}
            {session.callType === "video" && (
              <button 
                onClick={() => setIsCameraOff(!isCameraOff)}
                className={`p-3 rounded-xl transition ${isCameraOff ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100"}`}
                title={isCameraOff ? "Turn Cam On" : "Turn Cam Off"}
                id="btn-call-toggle-camera"
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
            )}

            {/* Mic Mute Toggle Button */}
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-xl transition ${isMuted ? "bg-red-500/10 border border-red-500/20 text-red-400" : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100"}`}
              title={isMuted ? "Unmute Mic" : "Mute Mic"}
              id="btn-call-toggle-muted"
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Speaker Toggle Button */}
            <button 
              onClick={() => setIsSpeakerOn(!isSpeakerOn)}
              className={`p-3 rounded-xl transition ${!isSpeakerOn ? "bg-red-500/10 border border-red-500/20 text-red-500" : "bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-neutral-100"}`}
              title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
              id="btn-call-toggle-speaker"
            >
              {isSpeakerOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* RED END CALL BUTTON */}
            <button 
              onClick={handleDeclineOrEnd}
              className="bg-red-500 hover:bg-red-600 text-neutral-50 px-5 py-3 rounded-xl flex items-center justify-center shadow-lg active:scale-95 transition"
              title="Hang Up"
              id="btn-call-hangup"
            >
              <PhoneOff className="w-5 h-5" />
            </button>

          </div>

        </div>
      )}

      {/* ENDED STATE SCREEN VIEW */}
      {status === "ended" && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 py-10 scale-in duration-200">
          <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mb-4">
            <PhoneOff className="w-6 h-6 text-red-500 animate-bounce" />
          </div>
          <h2 className="text-xl font-black text-neutral-100 mb-1.5">Bzz Connection Ended</h2>
          <div className="font-mono text-xs text-neutral-500">Call Log Added into Chat</div>
        </div>
      )}

    </div>
  );
}
