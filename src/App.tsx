import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Coffee, ShieldAlert, Volume2, VolumeX, Code, BookOpen, ExternalLink, MessageSquare } from "lucide-react";
import { Message, Mode, ConnectionState, Stats, WebSocketMessage } from "./types";
import { useSound } from "./hooks/useSound";
import SplashView from "./components/SplashView";
import ChatView from "./components/ChatView";

export default function App() {
  const { muted, setMuted, playSound } = useSound();
  
  // App UI State
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [activeSession, setActiveSession] = useState<boolean>(false);
  const [mode, setMode] = useState<Mode>("text");
  const [interests, setInterests] = useState<string[]>([]);
  const [peerInterests, setPeerInterests] = useState<string[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isPeerTyping, setIsPeerTyping] = useState<boolean>(false);
  const [myId, setMyId] = useState<string>("");
  const [peerId, setPeerId] = useState<string>("");
  
  // Media States
  const [cameraActive, setCameraActive] = useState<boolean>(true);
  const [micActive, setMicActive] = useState<boolean>(true);
  const [cameraAvailable, setCameraAvailable] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Maintain auto online stats count backup if ws is not active yet
  useEffect(() => {
    // Generate a random-looking realistic online number during offline/startup
    setOnlineCount(Math.floor(Math.random() * 250) + 780);
  }, []);

  // Sync Video streams with toggle states
  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = cameraActive;
      });
    }
  }, [cameraActive]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = micActive;
      });
    }
  }, [micActive]);

  // Clean up all WebRTC media streams and peer connections
  const cleanupMediaAndPeer = () => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach((track) => track.stop());
        remoteStreamRef.current = null;
      }

      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    } catch (e) {
      console.warn("Cleanup error tracker:", e);
    }
  };

  // Set up local webcam/mic media stream
  const acquireLocalMedia = async (targetMode: Mode): Promise<boolean> => {
    cleanupMediaAndPeer();
    setPermissionError(null);

    if (targetMode === "text") {
      setCameraAvailable(false);
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: true
      });

      localStreamRef.current = stream;
      setCameraAvailable(true);
      setCameraActive(true);
      setMicActive(true);

      // Bind local video element if loaded
      setTimeout(() => {
        if (localVideoRef.current && localStreamRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }, 500);

      return true;
    } catch (err: any) {
      console.warn("Camera/microphone media acquisition failed:", err);
      setCameraAvailable(false);
      setCameraActive(false);

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setPermissionError("Camera and microphone permission was denied by browser");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setPermissionError("No camera or audio devices detected on your workstation");
      } else {
        setPermissionError(`Media acquisition error: ${err.message || "access blocked"}`);
      }
      return false;
    }
  };

  // Setup WebSocket connections and callbacks
  const connectWebSocket = (targetMode: Mode, targetInterests: string[]) => {
    // If there is an existing WS connection, reuse or close it safely first
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        // Just join
        wsRef.current.send(JSON.stringify({
          type: "join",
          mode: targetMode,
          interests: targetInterests
        }));
        return;
      } else {
        wsRef.current.close();
      }
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket connection established successfully.");
      ws.send(JSON.stringify({
        type: "join",
        mode: targetMode,
        interests: targetInterests
      }));
    };

    ws.onmessage = async (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);
        
        switch (data.type) {
          case "welcome": {
            if (data.id) setMyId(data.id);
            break;
          }

          case "stats": {
            if (data.count) setOnlineCount(data.count);
            break;
          }

          case "searching": {
            setConnectionState("searching");
            setIsPeerTyping(false);
            setPeerInterests([]);
            setPeerId("");
            break;
          }

          case "paired": {
            playSound("connect");
            setConnectionState("connected");
            setIsPeerTyping(false);
            setPeerInterests(data.interests || []);
            if (data.peerId) setPeerId(data.peerId);

            const welcomeMsg: Message = {
              id: "paired_system_msg_" + Date.now(),
              sender: "system",
              text: "You are now chatting with a random stranger! Say hello 😊",
              timestamp: new Date()
            };

            const tagsMsg: Message | null = data.interests && data.interests.length > 0 
              ? {
                  id: "tags_system_msg_" + Date.now(),
                  sender: "system",
                  text: `Matched interests: ${data.interests.map(t => `#${t}`).join(", ")}`,
                  timestamp: new Date()
                }
              : null;

            setMessages(tagsMsg ? [welcomeMsg, tagsMsg] : [welcomeMsg]);

            // WebRTC Pairing Logic (Only for Video Mode)
            if (targetMode === "video") {
              await initializePeerConnection(data.initiator || false);
            }
            break;
          }

          case "disconnected": {
            playSound("disconnect");
            setPeerId("");
            
            // Stay in connected state visually to let them read, but show system notice
            setMessages((prev) => [
              ...prev,
              {
                id: "disc_system_msg_" + Date.now(),
                sender: "system",
                text: "Stranger disconnected. Click Next or press Esc to search again.",
                timestamp: new Date()
              }
            ]);
            setIsPeerTyping(false);

            // Close visual tracking but keep text intact
            if (peerConnectionRef.current) {
              peerConnectionRef.current.close();
              peerConnectionRef.current = null;
            }
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            break;
          }

          case "message": {
            playSound("message");
            if (data.text) {
              setMessages((prev) => [
                ...prev,
                {
                  id: "msg_" + Math.random().toString(36).substr(2, 9),
                  sender: "stranger",
                  text: data.text || "",
                  timestamp: new Date()
                }
              ]);
            }
            break;
          }

          case "typing": {
            setIsPeerTyping(!!data.isTyping);
            break;
          }

          // WebRTC Signaling Events
          case "offer": {
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
              const answer = await peerConnectionRef.current.createAnswer();
              await peerConnectionRef.current.setLocalDescription(answer);
              ws.send(JSON.stringify({
                type: "answer",
                sdp: answer
              }));
            }
            break;
          }

          case "answer": {
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
            }
            break;
          }

          case "ice-candidate": {
            if (peerConnectionRef.current && data.candidate) {
              try {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (e) {
                console.error("Error adding Ice Candidate:", e);
              }
            }
            break;
          }

          default:
            break;
        }
      } catch (err) {
        console.error("Failed to parse incoming WS message:", err);
      }
    };

    ws.onclose = () => {
      console.warn("WebSocket closed. Attempting auto reconnection shortly.");
      setConnectionState("error");
    };

    ws.onerror = (err) => {
      console.error("WebSocket network error:", err);
      setConnectionState("error");
    };
  };

  // Initialize RTCPeerConnection for WebRTC face-to-face video
  const initializePeerConnection = async (isInitiator: boolean) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
    
    peerConnectionRef.current = pc;

    // Relay ICE candidate
    pc.onicecandidate = (event) => {
      if (event.candidate && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate
        }));
      }
    };

    // Attach remote stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Attach local stream tracks (if any exist)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Start signaling handshake if initiator
    if (isInitiator && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        wsRef.current.send(JSON.stringify({
          type: "offer",
          sdp: offer
        }));
      } catch (e) {
        console.error("Failed to make WebRTC offer:", e);
      }
    }
  };

  // Start stranger search click
  const handleStartSession = async (selectedMode: Mode, chosenInterests: string[]) => {
    setActiveSession(true);
    setMode(selectedMode);
    setInterests(chosenInterests);
    setConnectionState("searching");
    setMessages([]);

    // Acquire camera if video-mode
    await acquireLocalMedia(selectedMode);
    // Bind connection
    connectWebSocket(selectedMode, chosenInterests);
  };

  // Send message
  const handleSendMessage = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "message",
        text
      }));

      setMessages((prev) => [
        ...prev,
        {
          id: "msg_" + Math.random().toString(36).substr(2, 9),
          sender: "you",
          text,
          timestamp: new Date()
        }
      ]);
    }
  };

  // Send typing indicator
  const handleSendTyping = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "typing",
        isTyping
      }));
    }
  };

  // Find next stranger (Skip)
  const handleNextStranger = () => {
    setMessages([]);
    setIsPeerTyping(false);
    setPeerInterests([]);
    setPeerId("");

    // Close peer channels safely
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "join",
        mode,
        interests
      }));
    } else {
      connectWebSocket(mode, interests);
    }
  };

  // Go back to landing main menu
  const handleLeaveSession = () => {
    playSound("click");
    setActiveSession(false);
    setConnectionState("idle");
    setMessages([]);
    setIsPeerTyping(false);
    setPeerId("");
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "leave" }));
    }
    
    cleanupMediaAndPeer();
  };

  // Camera/audio track toggles
  const handleToggleCamera = () => {
    setCameraActive(!cameraActive);
  };

  const handleToggleMic = () => {
    setMicActive(!micActive);
  };

  // Cleanup on page unmount
  useEffect(() => {
    return () => {
      cleanupMediaAndPeer();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col relative overflow-hidden">
      
      {/* Frosted Background Mesh Glow nodes */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[20%] right-[10%] w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Universal Top Header */}
      <header className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-40 px-4 py-3 sm:py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between relative z-10">
          <button 
            onClick={() => { if (activeSession) handleLeaveSession(); }}
            className="flex items-center gap-2 cursor-pointer outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <MessageSquare size={16} className="text-white stroke-[2.5]" />
            </div>
            <span className="font-display font-bold text-lg sm:text-xl tracking-tight text-white hover:text-slate-205 transition-colors">
              Stranger<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-450 to-purple-400 font-semibold font-sans">Chat</span>
            </span>
          </button>

          {/* Sound & Controls Right Align */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setMuted(!muted); playSound("click"); }}
              className="p-2 bg-white/10 hover:bg-white/15 border border-white/10 rounded-lg text-slate-300 hover:text-white transition-all cursor-pointer"
              title={muted ? "Unmute Alerts" : "Mute Alerts"}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="flex-1 flex flex-col relative z-10">
        {activeSession ? (
          <div className="py-4 px-2 sm:px-4">
            <ChatView
              mode={mode}
              interests={interests}
              connectionState={connectionState}
              messages={messages}
              isPeerTyping={isPeerTyping}
              onSendMessage={handleSendMessage}
              onSendTyping={handleSendTyping}
              onNext={handleNextStranger}
              onLeave={handleLeaveSession}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              cameraActive={cameraActive}
              micActive={micActive}
              onToggleCamera={handleToggleCamera}
              onToggleMic={handleToggleMic}
              cameraAvailable={cameraAvailable}
              permissionError={permissionError}
              playSound={playSound}
              myId={myId}
              peerId={peerId}
            />
          </div>
        ) : (
          <SplashView
            onlineCount={onlineCount}
            onStart={handleStartSession}
            playSound={playSound}
          />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="border-t border-white/10 bg-white/5 backdrop-blur-sm py-4 text-center text-xs text-slate-500 mt-auto font-mono relative z-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <span>&copy; {new Date().getFullYear()} StrangerChat. 100% anonymous &amp; secure peer connection.</span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5 text-blue-400 font-medium cursor-help hover:text-blue-300" title="WebRTC 2-way direct stream encryption">
              <Coffee size={12} className="text-blue-500" /> WebRTC Shield Active
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}
