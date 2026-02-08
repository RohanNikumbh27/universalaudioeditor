"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { formatTime } from "@/lib/ffmpeg";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

// Generate deterministic pseudo-random bar heights from index
function barHeight(index: number): number {
  const x = Math.sin(index * 12.9898 + index * 78.233) * 43758.5453;
  return 0.2 + (x - Math.floor(x)) * 0.8; // 0.2 – 1.0 range
}

const BAR_COUNT = 60;

export default function AudioPlayer({ src, className = "" }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Pre-compute bar heights so they stay stable across renders
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => barHeight(i)),
    []
  );

  useEffect(() => setMounted(true), []);

  /* ── audio event listeners ── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (!isSeeking) setCurrentTime(audio.currentTime);
    };
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src, isSeeking]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  /* ── play / pause ── */
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  /* ── seek via waveform click / drag ── */
  const seekTo = useCallback(
    (clientX: number) => {
      const audio = audioRef.current;
      const bar = waveformRef.current;
      if (!audio || !bar || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const time = ratio * duration;
      audio.currentTime = time;
      setCurrentTime(time);
    },
    [duration]
  );

  const handleWaveformDown = useCallback(
    (e: React.MouseEvent) => {
      setIsSeeking(true);
      seekTo(e.clientX);

      const onMove = (ev: MouseEvent) => seekTo(ev.clientX);
      const onUp = () => {
        setIsSeeking(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [seekTo]
  );

  /* ── volume ── */
  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !muted;
    setMuted(!muted);
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = parseFloat(e.target.value);
    audio.volume = v;
    setVolume(v);
    if (v === 0) setMuted(true);
    else if (muted) setMuted(false);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative rounded-2xl border bg-white/[0.03] backdrop-blur-md px-4 py-4 transition-colors duration-500 ${
        isPlaying
          ? "border-violet-500/20 shadow-lg shadow-violet-500/10"
          : "border-white/[0.08]"
      } ${className}`}
    >
      {/* Pulsing glow when playing */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
              boxShadow: [
                "0 0 20px rgba(139,92,246,0.08), inset 0 0 20px rgba(139,92,246,0.03)",
                "0 0 30px rgba(139,92,246,0.15), inset 0 0 30px rgba(139,92,246,0.05)",
                "0 0 20px rgba(139,92,246,0.08), inset 0 0 20px rgba(139,92,246,0.03)",
              ],
            }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />
        )}
      </AnimatePresence>

      <audio ref={audioRef} src={src} preload="metadata" />

      {/* ── Waveform Visualizer ── */}
      <div
        ref={waveformRef}
        onMouseDown={handleWaveformDown}
        className="relative h-14 rounded-xl bg-white/[0.04] border border-white/[0.06] cursor-pointer overflow-hidden select-none mb-3"
      >
        {/* Bars positioned absolutely for true edge-to-edge */}
        <div className="absolute inset-0 flex items-center">
          {barHeights.map((h, i) => {
            const barProgress = i / BAR_COUNT;
            const isPlayed = barProgress <= progress;
            // Position from 0% to 100% across the full width
            const leftPercent = BAR_COUNT > 1 ? (i / (BAR_COUNT - 1)) * 100 : 50;
            return (
              <motion.div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: "3px",
                  left: `calc(${leftPercent}% - 1.5px)`,
                  background: isPlayed
                    ? "linear-gradient(to top, rgb(139,92,246), rgb(99,102,241))"
                    : "rgba(255,255,255,0.1)",
                }}
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: isPlaying
                    ? [
                        `${h * 38}px`,
                        `${Math.max(8, h * 38 * (0.4 + Math.random() * 0.6))}px`,
                        `${h * 38}px`,
                      ]
                    : `${h * 38}px`,
                  opacity: 1,
                }}
                transition={
                  mounted && isPlaying
                    ? {
                        height: {
                          repeat: Infinity,
                          duration: 0.5 + (i % 5) * 0.12,
                          ease: "easeInOut",
                          delay: (i % 7) * 0.06,
                        },
                        opacity: { duration: 0.3, delay: i * 0.015 },
                      }
                    : {
                        height: { duration: 0.4, ease: "easeOut" },
                        opacity: { duration: 0.3, delay: i * 0.015 },
                      }
                }
              />
            );
          })}
        </div>

        {/* Played overlay gradient */}
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-500/[0.07] to-transparent pointer-events-none transition-all duration-100"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Playhead line */}
        <motion.div
          className="absolute top-0 h-full w-[2px] bg-violet-400/70 pointer-events-none"
          animate={{ left: `${progress * 100}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      {/* ── Controls Row ── */}
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {/* Play / Pause button */}
        <motion.button
          onClick={togglePlay}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.92 }}
          className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg transition-shadow duration-300 ${
            isPlaying ? "shadow-violet-500/40" : "shadow-violet-500/20"
          }`}
        >
          {/* Pulse ring when playing */}
          <AnimatePresence>
            {isPlaying && (
              <motion.span
                className="absolute inset-0 rounded-full border-2 border-violet-400/40"
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                exit={{ opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <AnimatePresence mode="wait" initial={false}>
            {isPlaying ? (
              <motion.span
                key="pause"
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Pause className="h-4 w-4" />
              </motion.span>
            ) : (
              <motion.span
                key="play"
                initial={{ scale: 0, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -90 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Play className="h-4 w-4 ml-0.5" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Time Display */}
        <motion.span
          className="flex-1 text-[11px] tabular-nums text-zinc-500 select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {formatTime(currentTime)}
          <span className="text-zinc-600 mx-1">/</span>
          {duration > 0 ? formatTime(duration) : "--:--"}
        </motion.span>

        {/* Volume Controls */}
        <motion.div
          className="flex items-center gap-1.5"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <motion.button
            onClick={toggleMute}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="text-zinc-500 hover:text-violet-400 transition-colors duration-150"
          >
            <AnimatePresence mode="wait" initial={false}>
              {muted || volume === 0 ? (
                <motion.span
                  key="muted"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <VolumeX className="h-3.5 w-3.5" />
                </motion.span>
              ) : (
                <motion.span
                  key="unmuted"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          <div className="relative w-16 h-1.5 rounded-full bg-white/[0.08] cursor-pointer overflow-hidden">
            <motion.div
              className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-violet-500/50 to-indigo-500/50"
              animate={{ width: `${(muted ? 0 : volume) * 100}%` }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={handleVolume}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
