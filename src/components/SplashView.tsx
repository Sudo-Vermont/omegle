import React, { useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, Video, RefreshCw, Hash, CheckSquare, Square, X, Users, MessageSquareCode } from "lucide-react";
import { Mode } from "../types";

export interface SplashViewProps {
  onlineCount: number;
  onStart: (mode: Mode, interests: string[]) => void;
  playSound: (type: "click") => void;
}

const PRESET_TAGS = ["Coding", "Gaming", "Music", "Anime", "Movies", "Art", "Crypto", "Memes", "Books", "Chat"];

export default function SplashView({ onlineCount, onStart, playSound }: SplashViewProps) {
  const [selectedMode, setSelectedMode] = useState<Mode>("text");
  const [interests, setInterests] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAddTag = (tag: string) => {
    playSound("click");
    const cleaned = tag.trim().toLowerCase();
    if (!cleaned) return;
    
    // Capitalize beautifully
    const formatted = tag.trim().charAt(0).toUpperCase() + tag.trim().slice(1);
    
    if (interests.length >= 10) {
      setErrorMsg("Maximum of 10 interest tags allowed.");
      return;
    }

    if (!interests.find(i => i.toLowerCase() === cleaned)) {
      setInterests([...interests, formatted]);
      setErrorMsg("");
    }
  };

  const handleRemoveTag = (indexToRemove: number) => {
    playSound("click");
    setInterests(interests.filter((_, idx) => idx !== indexToRemove));
  };

  const handleCustomTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tagInput.trim()) {
      handleAddTag(tagInput);
      setTagInput("");
    }
  };

  const handleStartSession = () => {
    playSound("click");
    if (!acceptedTerms) {
      setErrorMsg("Please accept the terms of service to start chatting.");
      return;
    }
    setErrorMsg("");
    onStart(selectedMode, interests);
  };

  return (
    <div id="splash_root" className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-xl shadow-2xl p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Subtle background ambient glows matching theme mesh */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full filter blur-3xl pointer-events-none" />

        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-indigo-300 font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Users size={12} className="text-indigo-400" />
            <span>{onlineCount?.toLocaleString() ?? "1"} Strangers Online</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-white mb-2">
            Stranger<span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 font-semibold font-sans">Chat</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Meet interesting people, converse on your favorite topics, and make new screen pals instantly.
          </p>
        </div>

        {/* Selector Panel option */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            id="mode_text_btn"
            onClick={() => { playSound("click"); setSelectedMode("text"); }}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border backdrop-blur-sm transition-all text-center group cursor-pointer ${
              selectedMode === "text"
                ? "bg-blue-600/20 border-blue-500/80 text-blue-400 shadow-lg shadow-blue-500/10"
                : "border-white/10 hover:border-white/20 bg-white/5 text-slate-400 hover:text-slate-250 hover:bg-white/10"
            }`}
          >
            <MessageSquare size={24} className="mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-display font-medium text-sm sm:text-base">Text Mode</span>
            <span className="text-[10px] sm:text-xs opacity-75 mt-0.5">Classic fast typing chat</span>
          </button>

          <button
            id="mode_video_btn"
            onClick={() => { playSound("click"); setSelectedMode("video"); }}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border backdrop-blur-sm transition-all text-center group cursor-pointer ${
              selectedMode === "video"
                ? "bg-blue-600/20 border-blue-500/80 text-blue-400 shadow-lg shadow-blue-500/10"
                : "border-white/10 hover:border-white/20 bg-white/5 text-slate-400 hover:text-slate-250 hover:bg-white/10"
            }`}
          >
            <Video size={24} className="mb-2 group-hover:scale-110 transition-transform" />
            <span className="font-display font-medium text-sm sm:text-base">Video Mode</span>
            <span className="text-[10px] sm:text-xs opacity-75 mt-0.5">Face-to-face WebRTC video</span>
          </button>
        </div>

        {/* Interests Box */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 backdrop-blur-md">
          <label className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 font-mono">
            <Hash size={12} className="text-blue-400" />
            Add Interest Tags (Optional Matchmaker)
          </label>

          <form onSubmit={handleCustomTagSubmit} className="flex gap-2 mb-3">
            <input
              id="tag_input"
              type="text"
              placeholder="e.g. Anime, Coding, Music..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              maxLength={20}
              className="flex-1 px-4 py-2 text-sm bg-white/5 border border-white/10 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-colors"
            />
            <button
              id="add_tag_btn"
              type="submit"
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-xs text-slate-200 hover:text-white rounded-xl border border-white/15 font-medium transition-colors cursor-pointer"
            >
              Add
            </button>
          </form>

          {/* Current tags display */}
          {interests.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {interests.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-300 rounded-full font-medium"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(idx)}
                    className="p-0.5 text-blue-300/60 hover:text-blue-200 rounded-full hover:bg-blue-500/20 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-xs italic mb-2">No custom tags added yet.</p>
          )}

          {/* Preset quick recommendations */}
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-slate-500 text-[11px] mb-2 font-medium">Quick Preset Tags:</p>
            <div className="flex flex-wrap gap-1">
              {PRESET_TAGS.map((tag) => {
                const added = interests.find(i => i.toLowerCase() === tag.toLowerCase());
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleAddTag(tag)}
                    disabled={!!added}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                      added
                        ? "bg-white/5 border-white/5 text-slate-600 cursor-not-allowed"
                        : "bg-white/5 border-white/10 hover:border-white/25 text-slate-350 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    +{tag}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Safety Agreement */}
        <div className="mb-6">
          <label
            onClick={() => { playSound("click"); setAcceptedTerms(!acceptedTerms); }}
            className="flex items-start gap-3 cursor-pointer group text-slate-300 text-xs sm:text-sm select-none"
          >
            <span className="mt-0.5 text-blue-400 shrink-0">
              {acceptedTerms ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-650 group-hover:text-slate-500 transition-colors" />}
            </span>
            <span>
              I certify that I am at least 18 years old and agree to act safely and cordially. I will not engage in harassment, explicit behavior, or spam.
            </span>
          </label>
        </div>

        {/* Error / Warnings display */}
        {errorMsg && (
          <div className="p-3 mb-6 bg-red-950/25 border border-red-900/30 text-red-300 text-xs rounded-xl text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Action Call to Action */}
        <button
          id="start_chat_btn"
          onClick={handleStartSession}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:scale-[1.01] text-white font-display font-semibold rounded-2xl border border-blue-400/30 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/25 transition-all text-sm sm:text-base cursor-pointer"
        >
          <RefreshCw size={18} className="animate-spin-slow" />
          Start Stranger Chat!
        </button>

        {/* Tiny security warning footer */}
        <div className="mt-6 pt-5 border-t border-white/10 text-center text-[10px] text-slate-500 leading-relaxed max-w-sm mx-auto">
          StrangerChat is a sandboxed WebRTC signaling workspace. Video calls are directly peer-to-peer. Keep sensitive personal details private!
        </div>
      </motion.div>
    </div>
  );
}
