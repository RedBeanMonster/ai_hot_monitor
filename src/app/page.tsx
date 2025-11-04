"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Terminal, Plus, Trash2, Cpu, Activity, Clock, Zap, RefreshCw } from "lucide-react";

export default function Home() {
  const [keywords, setKeywords] = useState(["AI编程", "Claude 3.5", "Next.js", "GPT-5"]);
  const [newKeyword, setNewKeyword] = useState("");
  const [time, setTime] = useState("");
  const [topics, setTopics] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const previouslySeenIds = useRef<Set<string>>(new Set());

  // Wait for React Hydration and setup Notification polling
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);

    // Request desktop notification if we want it lightweight
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const fetchLatestTopics = async () => {
      try {
        const res = await fetch("/api/hot-topics");
        const data = await res.json();
        
        if (data.topics && data.topics.length > 0) {
          // Check if there's any new topic since last refresh
          data.topics.forEach((t: any) => {
            if (!previouslySeenIds.current.has(t.id) && previouslySeenIds.current.size > 0) {
              // Only alert if we've successfully initiated previously Seen ids
              if (Notification.permission === "granted") {
                 new Notification(`🔥 新热点: ${t.keyword?.text || "AI"}`, {
                    body: t.title,
                 });
                 console.log(`🚨 Notification Sent for: ${t.title}`);
              }
            }
            previouslySeenIds.current.add(t.id);
          });
          setTopics(data.topics);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchLatestTopics(); // Initial Fetch
    // Polling every 5 minutes (300_000ms) for browser realtime update without refresh
    const syncTimer = setInterval(fetchLatestTopics, 300_000); 

    return () => {
      clearInterval(timer);
      clearInterval(syncTimer);
    };
  }, []);

  const triggerManualSync = async () => {
     setIsSyncing(true);
     try {
       await fetch("/api/sync");
       // Re-fetch topics after manual sync finishes
       const res = await fetch("/api/hot-topics");
       const data = await res.json();
       if (data.topics) {
          data.topics.forEach((t: any) => previouslySeenIds.current.add(t.id));
          setTopics(data.topics);
       }
     } catch(e) {
       console.error("Sync Error", e);
     }
     setIsSyncing(false);
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter(k => k !== kw));
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col md:flex-row gap-6">
      
      {/* Sidebar - Control Panel */}
      <motion.aside 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full md:w-80 glass-panel rounded-xl p-5 flex flex-col h-fit md:sticky top-8"
      >
        <div className="flex items-center gap-3 mb-8 border-b border-white/10 pb-4">
          <Terminal className="neon-text w-6 h-6" />
          <h1 className="text-xl font-bold tracking-wider uppercase text-white">
            <span className="neon-text">SYS</span>.MONITOR_
          </h1>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Cpu className="text-white/50 w-4 h-4" />
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest">Target Keywords</h2>
        </div>

        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Add node..."
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-neon-blue transition-colors text-white"
          />
          <button 
            onClick={addKeyword}
            className="bg-neon-blue/20 hover:bg-neon-blue/30 text-neon-blue p-2 rounded border border-neon-blue/50 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {keywords.map((kw, i) => (
            <motion.div 
              key={kw}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="group flex items-center justify-between bg-white/5 border border-white/10 rounded px-3 py-2 hover:border-white/30 transition-colors"
            >
              <span className="text-sm text-white/90 font-medium">#{kw}</span>
              <button 
                onClick={() => removeKeyword(kw)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-white/10">
           <div className="flex justify-between items-center text-xs text-white/50">
             <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> STATUS: <span className="text-green-400 animate-pulse">ACTIVE</span></span>
             <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time || "--:--:--"}</span>
           </div>
        </div>
      </motion.aside>

      {/* Main Content - Data Stream */}
      <motion.main 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="flex-1 glass-panel rounded-xl p-5 md:p-8 neon-border flex flex-col"
      >
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Zap className="neon-text w-6 h-6" />
            <h2 className="text-xl font-bold tracking-wider text-white">DATA_STREAM <span className="text-white/30 text-sm font-normal">/ LATEST EVENTS</span></h2>
          </div>
          <button 
            onClick={triggerManualSync}
            disabled={isSyncing}
            className={`flex items-center gap-2 px-3 py-1.5 bg-neon-blue/10 hover:bg-neon-blue/20 text-neon-blue text-xs font-bold rounded border border-neon-blue/50 transition-colors ${isSyncing ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "SYNCING..." : "FORCE SYNC"}
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
          {topics.length === 0 ? (
            <div className="text-center text-white/30 mt-10">No latest hot topics found. Wait for 10 AM sync or trigger Force Sync.</div>
          ) : (
            topics.map((topic, index) => (
              <motion.div 
                key={topic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="relative pl-6 pb-6 border-l border-white/10 last:border-0 last:pb-0"
              >
                <div className="absolute w-3 h-3 rounded-full bg-neon-blue -left-[6px] top-1 shadow-[0_0_10px_#00f0ff]"></div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 hover:bg-white/10 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-neon-blue/20 text-neon-blue text-[10px] rounded-bl-lg font-bold">
                    {(topic.confidence * 100).toFixed(0)}% CONFIDENCE
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/70">#{topic.keyword?.text || "General"}</span>
                    <span className="text-xs text-white/40">Sources: {topic.source} • {new Date(topic.createdAt).toLocaleString()}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-neon-blue transition-colors">{topic.title}</h3>
                  <p className="text-sm text-white/60 mb-4 leading-relaxed">{topic.summary}</p>
                  {topic.url && (
                    <a href={topic.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-neon-blue hover:underline">
                      _VIEW_SOURCE
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.main>
      
    </div>
  );
}
