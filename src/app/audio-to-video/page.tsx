"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Film,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  Download,
  X,
  FileVideo,
  Scissors,
  Play,
  Pause,
} from "lucide-react";
import { getFFmpeg, formatTime } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import AudioPlayer from "@/components/AudioPlayer";

type AudioFormat = "mp3" | "wav" | "aac" | "ogg";

export default function AudioToVideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [loading, setLoading] = useState(false);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Trim state
  const [showTrim, setShowTrim] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimming, setTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [trimmedUrl, setTrimmedUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const trimAudioRef = useRef<HTMLAudioElement>(null);
  const [toast, setToast] = useState("");

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("video/")) {
      setError("Please upload a video file");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError("File is too large. Max 500MB.");
      return;
    }
    setFile(f);
    setError("");
    setOutputUrl("");

    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setDuration(video.duration);
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleExtract = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    setProgress(0);
    setOutputUrl("");

    try {
      setLoadingFFmpeg(true);
      const ffmpeg = await getFFmpeg();
      setLoadingFFmpeg(false);
      setProgress(20);

      const inputName = "input" + file.name.substring(file.name.lastIndexOf("."));
      const outputName = `output.${format}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      setProgress(40);

      const codecMap: Record<AudioFormat, string[]> = {
        mp3: ["-acodec", "libmp3lame", "-ab", "192k"],
        wav: ["-acodec", "pcm_s16le"],
        aac: ["-acodec", "aac", "-ab", "192k"],
        ogg: ["-acodec", "libvorbis", "-ab", "192k"],
      };

      await ffmpeg.exec([
        "-i", inputName,
        "-vn",
        ...codecMap[format],
        outputName,
      ]);
      setProgress(80);

      const data = await ffmpeg.readFile(outputName);
      const uint8 = new Uint8Array(data as Uint8Array);
      const blob = new Blob([uint8], { type: `audio/${format}` });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setProgress(100);
      setToast("Audio extracted successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed. Try a different format.");
    } finally {
      setLoading(false);
      setLoadingFFmpeg(false);
    }
  };

  const formats: { value: AudioFormat; label: string }[] = [
    { value: "mp3", label: "MP3" },
    { value: "wav", label: "WAV" },
    { value: "aac", label: "AAC" },
    { value: "ogg", label: "OGG" },
  ];

  // When outputUrl changes, get extracted audio duration
  useEffect(() => {
    if (!outputUrl) {
      setAudioDuration(0);
      setShowTrim(false);
      setTrimmedUrl("");
      return;
    }
    const audio = new Audio(outputUrl);
    audio.addEventListener("loadedmetadata", () => {
      setAudioDuration(audio.duration);
      setTrimEnd(audio.duration);
    });
  }, [outputUrl]);

  // Playback tracking for trim preview
  useEffect(() => {
    const audio = trimAudioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.currentTime >= trimEnd) {
        audio.pause();
        setIsPlaying(false);
      }
    };
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [trimEnd, showTrim]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const toggleTrimPreview = () => {
    const audio = trimAudioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.currentTime = trimStart;
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleTrimAudio = async () => {
    if (!outputUrl) return;
    setTrimming(true);
    setTrimProgress(0);
    setTrimmedUrl("");

    try {
      const ffmpeg = await getFFmpeg();
      setTrimProgress(20);

      const resp = await fetch(outputUrl);
      const audioData = await resp.arrayBuffer();
      const inputName = `trim-input.${format}`;
      const outputName = `trim-output.${format}`;

      await ffmpeg.writeFile(inputName, new Uint8Array(audioData));
      setTrimProgress(40);

      const startStr = formatTime(trimStart).replace(".", ":");
      const durationSecs = trimEnd - trimStart;

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startStr,
        "-t", durationSecs.toString(),
        "-c", "copy",
        outputName,
      ]);
      setTrimProgress(80);

      const data = await ffmpeg.readFile(outputName);
      const uint8 = new Uint8Array(data as Uint8Array);
      const blob = new Blob([uint8], { type: `audio/${format}` });
      const url = URL.createObjectURL(blob);
      setTrimmedUrl(url);
      setTrimProgress(100);
      setToast("Audio trimmed successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trimming failed. Try again.");
    } finally {
      setTrimming(false);
    }
  };

  const trimmedDuration = trimEnd - trimStart;
  const selectionLeft = audioDuration > 0 ? (trimStart / audioDuration) * 100 : 0;
  const selectionWidth = audioDuration > 0 ? ((trimEnd - trimStart) / audioDuration) * 100 : 100;
  const playheadPos = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4">
            <Film className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Audio to Video
          </h1>
          <p className="mt-2 text-zinc-400">
            Upload a video file and extract its audio track
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8">
          {/* Drop Zone */}
          {!file ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`drop-zone ${isDragging ? "active" : ""}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-violet-400 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium">
                Drop your video file here
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                or click to browse (max 500MB)
              </p>
            </div>
          ) : (
            /* File Info */
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <FileVideo className="h-8 w-8 text-blue-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {(file.size / (1024 * 1024)).toFixed(1)} MB
                    {duration > 0 && ` • ${formatTime(duration)}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setOutputUrl("");
                  setError("");
                }}
                className="ml-3 flex-shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Format Selection */}
          {file && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-zinc-300 mb-3">
                Output Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {formats.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                      format === f.value
                        ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    <Music className="h-4 w-4" />
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress */}
          {loading && (
            <div className="mb-6">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                {loadingFFmpeg
                  ? "Loading audio engine..."
                  : `Extracting audio... ${progress}%`}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Output */}
          {outputUrl && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <AudioPlayer src={outputUrl} className="mb-3" />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={outputUrl}
                    download={`extracted-audio.${format}`}
                    className="glow-btn inline-flex items-center gap-2 text-sm px-4 py-2"
                  >
                    <Download className="h-4 w-4" />
                    Download {format.toUpperCase()}
                  </a>
                  <button
                    onClick={() => {
                      setShowTrim(!showTrim);
                      setTrimmedUrl("");
                      setTrimStart(0);
                      if (audioDuration > 0) setTrimEnd(audioDuration);
                    }}
                    className={`inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl border font-semibold transition-all ${
                      showTrim
                        ? "border-pink-500/50 bg-pink-500/10 text-pink-300"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    <Scissors className="h-4 w-4" />
                    {showTrim ? "Hide Trim" : "Trim Audio"}
                  </button>
                </div>
              </div>

              {/* Inline Trim Panel */}
              {showTrim && audioDuration > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 rounded-xl border border-pink-500/15 bg-pink-500/5 p-4"
                >
                  {/* Hidden audio for trim preview */}
                  <audio ref={trimAudioRef} src={outputUrl} preload="metadata" />

                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-pink-400" />
                    Trim Extracted Audio
                  </h4>

                  {/* Visual Timeline */}
                  <div className="relative h-12 rounded-lg bg-white/5 border border-white/10 mb-4 overflow-hidden">
                    <div
                      className="absolute top-0 h-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 border-x-2 border-pink-400/50"
                      style={{
                        left: `${selectionLeft}%`,
                        width: `${selectionWidth}%`,
                      }}
                    />
                    {isPlaying && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/70 transition-all duration-75"
                        style={{ left: `${playheadPos}%` }}
                      />
                    )}
                    <div className="absolute inset-0 flex items-center opacity-30">
                      {Array.from({ length: 60 }).map((_, i) => {
                        const x = Math.sin(i * 12.9898 + i * 78.233) * 43758.5453;
                        const height = 4 + (x - Math.floor(x)) * 24;
                        const leftPercent = (i / 59) * 100;
                        return (
                          <div
                            key={i}
                            className="absolute bg-pink-400 rounded-full"
                            style={{
                              width: "2px",
                              height: `${height}px`,
                              left: `calc(${leftPercent}% - 1px)`,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Range Controls */}
                  <div className="space-y-3 mb-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>Start: {formatTime(trimStart)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={audioDuration}
                        step={0.01}
                        value={trimStart}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v < trimEnd) setTrimStart(v);
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>End: {formatTime(trimEnd)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={audioDuration}
                        step={0.01}
                        value={trimEnd}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v > trimStart) setTrimEnd(v);
                        }}
                      />
                    </div>
                  </div>

                  {/* Duration and preview */}
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-xs text-zinc-500">
                      Selected: {formatTime(trimmedDuration)} of{" "}
                      {formatTime(audioDuration)}
                    </p>
                    <button
                      onClick={toggleTrimPreview}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10 transition-colors"
                    >
                      {isPlaying ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {isPlaying ? "Pause" : "Preview"}
                    </button>
                  </div>

                  {/* Trim progress */}
                  {trimming && (
                    <div className="mb-4">
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${trimProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        Trimming... {trimProgress}%
                      </p>
                    </div>
                  )}

                  {/* Trimmed output */}
                  {trimmedUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 rounded-lg border border-violet-500/20 bg-violet-500/5 p-3"
                    >
                      <AudioPlayer src={trimmedUrl} className="mb-2" />
                      <a
                        href={trimmedUrl}
                        download={`trimmed-audio.${format}`}
                        className="glow-btn inline-flex items-center gap-2 text-xs px-3 py-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download Trimmed {format.toUpperCase()}
                      </a>
                    </motion.div>
                  )}

                  {/* Trim button */}
                  {!trimmedUrl && (
                    <button
                      onClick={handleTrimAudio}
                      disabled={trimming || trimmedDuration <= 0}
                      className="glow-btn w-full flex items-center justify-center gap-2 py-2.5 text-sm"
                    >
                      {trimming ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Trimming...
                        </>
                      ) : (
                        <>
                          <Scissors className="h-4 w-4" />
                          Trim & Download
                        </>
                      )}
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Extract Button */}
          {file && !outputUrl && (
            <button
              onClick={handleExtract}
              disabled={loading}
              className="glow-btn w-full flex items-center justify-center gap-2 py-3.5 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {loadingFFmpeg ? "Loading Engine..." : "Extracting..."}
                </>
              ) : (
                <>
                  <Music className="h-5 w-5" />
                  Extract Audio
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          All processing is done locally in your browser. Your file never leaves your device.
        </p>
      </motion.div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/15 backdrop-blur-lg px-5 py-3 shadow-xl shadow-violet-500/10"
          >
            <CheckCircle2 className="h-4 w-4 text-violet-400 flex-shrink-0" />
            <span className="text-sm font-medium text-violet-300">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
