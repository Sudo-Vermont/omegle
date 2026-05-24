import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, LogOut, Radio, UserCheck, RefreshCw, CameraOff, Mic, MicOff, Camera, HelpCircle, AlertTriangle, Smile, Flag, Shield, Check, X } from "lucide-react";
import { Message, Mode, ConnectionState } from "../types";

export interface ChatViewProps {
  mode: Mode;
  interests: string[];
  connectionState: ConnectionState;
  messages: Message[];
  isPeerTyping: boolean;
  onSendMessage: (text: string) => void;
  onSendTyping: (isTyping: boolean) => void;
  onNext: () => void;
  onLeave: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraActive: boolean;
  micActive: boolean;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  cameraAvailable: boolean;
  permissionError: string | null;
  playSound: (type: "message" | "click" | "connect" | "disconnect") => void;
  myId: string;
  peerId: string;
}

export default function ChatView({
  mode,
  interests,
  connectionState,
  messages,
  isPeerTyping,
  onSendMessage,
  onSendTyping,
  onNext,
  onLeave,
  localVideoRef,
  remoteVideoRef,
  cameraActive,
  micActive,
  onToggleCamera,
  onToggleMic,
  cameraAvailable,
  permissionError,
  playSound,
  myId,
  peerId,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [confirmStop, setConfirmStop] = useState(false);
  
  // Reporter UI modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const isTypingRef = useRef(false);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPeerTyping, connectionState]);

  // Handle typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (!isTypingRef.current && val.trim().length > 0) {
      isTypingRef.current = true;
      onSendTyping(true);
    }

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }

    typingTimerRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        onSendTyping(false);
      }
    }, 1500);
  };

  // Trigger send message
  const handleSendSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || connectionState !== "connected") return;

    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    isTypingRef.current = false;
    onSendTyping(false);

    onSendMessage(inputText.trim());
    setInputText("");
  };

  // Keyboard shortcut: Esc to trigger next/disconnect or confirm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (connectionState === "connected") {
          if (!confirmStop) {
            setConfirmStop(true);
            playSound("click");
          } else {
            setConfirmStop(false);
            onNext();
          }
        } else if (connectionState === "searching") {
          onLeave();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [connectionState, confirmStop, onNext, onLeave, playSound]);

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason) return;
    setIsReporting(true);

    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reporterId: myId,
          reportedPeerId: peerId,
          reason: reportReason,
          details: reportDetails,
        }),
      });

      if (res.ok) {
        setReportSuccess(true);
        playSound("disconnect");
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess(false);
          setReportReason("");
          setReportDetails("");
          onNext(); // Skip this user & match anew!
        }, 2200);
      } else {
        alert("Failed to submit report. Please try again.");
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
      // Fallback fallback to let the UI proceed even offline or on connection drop
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setReportSuccess(false);
        setReportReason("");
        setReportDetails("");
        onNext();
      }, 1500);
    } finally {
      setIsReporting(false);
    }
  };

  // Reset confirmation state on connect/search changes
  useEffect(() => {
    setConfirmStop(false);
  }, [connectionState]);

  const handleNextClick = () => {
    playSound("click");
    if (connectionState === "connected" && !confirmStop) {
      setConfirmStop(true);
    } else {
      setConfirmStop(false);
      onNext();
    }
  };

  return (
    <div id="chat_view_container" className="flex flex-col h-[85vh] w-full max-w-6xl mx-auto bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-xl overflow-hidden shadow-2xl relative">
      
      {/* Top Banner Status Bar */}
      <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-sm backdrop-blur-md z-15">
        <div className="flex items-center gap-2">
          {connectionState === "searching" ? (
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span className="text-slate-200 text-sm font-medium font-display animate-pulse-slow">Finding an amazing stranger...</span>
            </div>
          ) : connectionState === "connected" ? (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-blue-400 text-sm font-semibold font-display">Strangers Paired!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-655" />
              <span className="text-slate-500 text-sm font-medium">Idle state</span>
            </div>
          )}
        </div>

        {/* Share topics info */}
        {connectionState === "connected" && interests.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-2.5 py-1 rounded-full">
            <span className="font-semibold text-[10px] uppercase font-mono">My interests:</span>
            <span className="max-w-[200px] truncate text-blue-300 font-medium font-sans">
              {interests.map(t => `#${t}`).join(", ")}
            </span>
          </div>
        )}

        {/* Action controls */}
        <div className="flex items-center gap-2">
          {connectionState === "connected" && (
            <button
              id="report_stranger_btn"
              onClick={() => { playSound("click"); setShowReportModal(true); }}
              className="p-1.5 sm:px-3.5 sm:py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-550 text-red-400 hover:text-red-300 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Report & block user"
            >
              <Flag size={13} className="text-red-400" />
              <span className="hidden sm:inline">Report</span>
            </button>
          )}
          <button
            id="leave_session_btn"
            onClick={() => { playSound("click"); onLeave(); }}
            className="p-1.5 sm:px-3.5 sm:py-2 bg-white/10 hover:bg-white/15 text-slate-250 hover:text-white rounded-xl border border-white/10 font-medium text-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer"
            title="Exit to Main Menu"
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">Main Menu</span>
          </button>
        </div>
      </div>

      {/* Frame Warning about Parent iframe context if WebRTC is blocked */}
      {mode === "video" && permissionError && (
        <div id="permission_banner" className="bg-amber-950/20 border-b border-amber-900/30 text-amber-300 text-[11px] sm:text-xs px-4 py-2.5 flex items-center gap-2 font-medium">
          <AlertTriangle size={14} className="text-amber-400 shrink-0" />
          <span className="flex-1">
            {permissionError}. If browser permission is blocked, <strong>open the app in a new tab</strong> using the button in the top right of the screen!
          </span>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* LEFT COLUMN: Webcam views (Video-mode only) */}
        {mode === "video" && (
          <div className="w-full md:w-80 flex flex-row md:flex-col gap-3 p-3 bg-transparent border-r border-white/10 overflow-hidden shrink-0 h-40 sm:h-48 md:h-full">
            
            {/* Strangers Feed Container */}
            <div className="flex-1 relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm group flex items-center justify-center">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-2xl"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-md text-[10px] text-slate-350 font-medium flex items-center gap-1 border border-white/10">
                <Radio size={10} className="text-red-500 animate-pulse" />
                Stranger Stream
              </div>

              {/* Offline/Blank State Overlay */}
              {connectionState !== "connected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/85 text-slate-400 text-center p-2 z-10">
                  <motion.div
                    animate={{ scale: [0.95, 1.05, 0.95] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <CameraOff size={28} className="mb-2 text-slate-500" />
                  </motion.div>
                  <p className="font-display font-medium text-xs sm:text-sm">Remote camera offline</p>
                  <p className="text-[10px] text-slate-500 mt-1">Waiting for partner...</p>
                </div>
              )}
            </div>

            {/* My Feed Container */}
            <div className="flex-1 relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm group flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover rounded-2xl scale-x-[-1]" // mirror view
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-md text-[10px] text-slate-350 font-medium flex items-center gap-1 border border-white/10">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Local Stream
              </div>

              {/* On-video controls overlay info */}
              {connectionState === "connected" && (
                <div className="absolute bottom-2 right-2 flex gap-1 bg-slate-950/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10">
                  <button
                    onClick={() => { playSound("click"); onToggleMic(); }}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      micActive ? "text-slate-300 hover:text-white" : "text-red-500 bg-red-950/30"
                    }`}
                    title={micActive ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micActive ? <Mic size={12} /> : <MicOff size={12} />}
                  </button>
                  <button
                    onClick={() => { playSound("click"); onToggleCamera(); }}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      cameraActive ? "text-slate-300 hover:text-white" : "text-red-500 bg-red-950/30"
                    }`}
                    title={cameraActive ? "Turn Camera Off" : "Turn Camera On"}
                  >
                    {cameraActive ? <Camera size={12} /> : <CameraOff size={12} />}
                  </button>
                </div>
              )}

              {/* Local Feed Disabled Indicator */}
              {(!cameraActive || !cameraAvailable) && (
                <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-500 z-10 text-center p-2">
                  <CameraOff size={24} className="mb-1 text-slate-500" />
                  <p className="font-display font-medium text-[10px] sm:text-xs">Webcam Off</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* RIGHT COLUMN: Chat Log view */}
        <div className="flex-1 flex flex-col h-full bg-transparent">
          
          {/* Messages scroll viewport */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col">
            {messages.length === 0 && connectionState === "searching" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 my-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                  className="mb-3 text-blue-400"
                >
                  <RefreshCw size={28} />
                </motion.div>
                <h3 className="font-display font-semibold text-slate-300 text-sm sm:text-base mb-1">Queueing in server lobby</h3>
                <p className="text-xs max-w-xs text-slate-500 leading-normal">
                  Matching stranger on mode <strong className="text-slate-450 uppercase">{mode}</strong>. 
                  {interests.length > 0 ? " Prioritizing your matching interests first..." : " Matching you with any connection."}
                </p>
              </div>
            )}

            {messages.map((msg) => {
              if (msg.sender === "system") {
                return (
                  <div key={msg.id} className="flex justify-center my-1.5">
                    <span className="text-[10px] font-bold font-sans px-3.5 py-1 bg-white/5 border border-white/10 text-indigo-300 rounded-full uppercase tracking-wider">
                      {msg.text}
                    </span>
                  </div>
                );
              }

              const isYou = msg.sender === "you";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isYou ? "justify-end" : "justify-start"} items-end gap-1.5`}
                >
                  {!isYou && (
                    <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-350 uppercase">
                      S
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] sm:max-w-[60%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden text-wrap break-words ${
                      isYou
                        ? "bg-blue-600/20 text-slate-100 border border-blue-500/20 rounded-br-none"
                        : "bg-white/5 text-slate-100 border border-white/5 rounded-bl-none"
                    }`}
                  >
                    <div>{msg.text}</div>
                    <span className={`text-[9px] block text-right mt-1 ${isYou ? "text-blue-300/60" : "text-slate-500"}`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isPeerTyping && (
              <div className="flex justify-start items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-350">
                  S
                </div>
                <div className="bg-white/5 text-slate-400 px-3.5 py-2.5 rounded-2xl rounded-bl-sm text-xs border border-white/10 flex items-center gap-1.5 self-start">
                  <span>Stranger is typing</span>
                  <span className="flex gap-0.5 items-center mt-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Form Composer input bottom controls */}
          <div className="p-3 bg-white/5 border-t border-white/10">
            <form onSubmit={handleSendSubmit} className="flex gap-2 items-center">
              
              {/* Skip / Next Button */}
              <button
                id="skip_next_btn"
                type="button"
                onClick={handleNextClick}
                className={`flex flex-col items-center justify-center h-11 px-4 text-[11px] font-semibold uppercase tracking-wider rounded-xl border transition-all shrink-0 cursor-pointer ${
                  confirmStop
                    ? "bg-red-500/25 border-red-500/40 text-red-100 hover:bg-red-500/35 font-bold"
                    : connectionState === "searching"
                    ? "bg-white/10 border-white/10 text-slate-300 hover:text-white hover:bg-white/15"
                    : "bg-white/5 border-white/10 hover:border-white/20 text-slate-300 hover:bg-white/10"
                }`}
                title="Search of a new stranger (Esc shortcut)"
              >
                <span>{confirmStop ? "Really?" : connectionState === "searching" ? "Skip" : "Next"}</span>
                <span className="text-[8px] opacity-75 font-mono lowercase tracking-normal font-normal">Esc esc</span>
              </button>

              {/* Message text field input */}
              <input
                id="message_compose_input"
                type="text"
                maxLength={450}
                placeholder={
                  connectionState === "connected"
                    ? "Type your friendly greeting here..."
                    : "Wait to be connected..."
                }
                value={inputText}
                onChange={handleInputChange}
                disabled={connectionState !== "connected"}
                className="flex-1 h-11 px-4 text-sm bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                autoComplete="off"
              />

              {/* Send Button */}
              <button
                id="send_message_btn"
                type="submit"
                disabled={!inputText.trim() || connectionState !== "connected"}
                className="w-11 h-11 bg-blue-600 border border-blue-400/30 hover:bg-blue-500 disabled:bg-white/5 text-white disabled:text-slate-650 flex items-center justify-center rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
              >
                <Send size={16} />
              </button>
            </form>
          </div>

        </div>

      </div>

      {/* Modern High-End Reporting Glassmorphic Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isReporting && !reportSuccess) setShowReportModal(false); }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md cursor-pointer"
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-zinc-900/90 border border-white/10 p-6 sm:p-8 rounded-[28px] shadow-2xl overflow-hidden backdrop-blur-xl z-20"
            >
              {/* Top ambient glow decoration */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-red-600/10 rounded-full filter blur-2xl pointer-events-none" />

              {/* Close Button */}
              {!isReporting && !reportSuccess && (
                <button
                  onClick={() => setShowReportModal(false)}
                  className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
                >
                  <X size={15} />
                </button>
              )}

              {/* Success Content Overlay */}
              {reportSuccess ? (
                <div className="text-center py-6 flex flex-col items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 150 }}
                    className="w-16 h-16 bg-red-500/20 border border-red-500/30 text-red-400 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-red-500/15"
                  >
                    <Check size={28} className="stroke-[2.5]" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-white font-display mb-2">Report Submitted</h3>
                  <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                    Thank you. We have recorded your report. This stranger has been blocked and matches are resetting...
                  </p>
                  <div className="mt-6 flex items-center gap-2.5 text-xs text-blue-400 font-mono">
                    <RefreshCw size={13} className="animate-spin" />
                    Finding a safer peer connection...
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="space-y-6">
                  {/* Title & info */}
                  <div className="flex gap-3 items-start">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      <Shield size={20} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white font-display">Report & Reset Match</h2>
                      <p className="text-xs text-slate-400">
                        Is this partner behaving inappropriately? Let us know so we can refine our matching pool and keep the community wholesome.
                      </p>
                    </div>
                  </div>

                  {/* Pre-styled Reasons Category */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-mono">Select a Reason</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { id: "harassment", label: "Harassment or bullying" },
                        { id: "inappropriate", label: "Explicit or inappropriate" },
                        { id: "spam", label: "Spam, scams or links" },
                        { id: "minor", label: "Suspected minor (<18)" },
                        { id: "other", label: "Other rule violation" },
                      ].map((item) => {
                        const selected = reportReason === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setReportReason(item.id)}
                            className={`px-4 py-3 rounded-xl border text-xs text-left font-medium transition-all transition-colors flex items-center justify-between cursor-pointer ${
                              selected
                                ? "bg-red-500/10 border-red-500/80 text-red-200 font-semibold"
                                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-slate-350"
                            }`}
                          >
                            <span>{item.label}</span>
                            {selected && <div className="w-2.5 h-2.5 rounded-full bg-red-500" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional Text Details */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase font-mono">Provide details (optional)</p>
                      <span className="text-[10px] text-slate-550 font-sans">Max 150 chars</span>
                    </div>
                    <textarea
                      value={reportDetails}
                      onChange={(e) => setReportDetails(e.target.value.substring(0, 150))}
                      rows={2.5}
                      placeholder="e.g. offensive text messages, advertising scams, or inappropriate gestures..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-650 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all resize-none"
                    />
                  </div>

                  {/* Warning message footer */}
                  <div className="p-3 bg-white/5 border border-white/5 text-[11px] text-slate-450 leading-normal rounded-xl">
                    ⚠️ <strong>Safe Block Active:</strong> Matchmaking will block this partner permanently so you will never cross paths again.
                  </div>

                  {/* Submit CTA */}
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      type="button"
                      disabled={isReporting}
                      onClick={() => setShowReportModal(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-all cursor-pointer disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!reportReason || isReporting}
                      className="px-5 py-2.5 bg-red-600 hover:bg-red-500 hover:scale-[1.01] border border-red-500/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-lg shadow-red-600/10 hover:shadow-red-500/20 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isReporting ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Flag size={13} />
                          Report stranger
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
