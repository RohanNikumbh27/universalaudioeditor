"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Scissors,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
  Play,
  Pause,
  FileAudio,
  FileVideo,
} from "lucide-react";
import { getFFmpeg, formatTime } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

export default function TrimPage() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<"audio" | "video">("audio");
  const [loading, setLoading] = useState(false);
  const [loadingFFmpeg, setLoadingFFmpeg] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [outputUrl, setOutputUrl] = useState("");
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((f: File) => {
    const isAudio = f.type.startsWith("audio/");
    const isVideo = f.type.startsWith("video/");
    if (!isAudio && !isVideo) {
      setError("Please upload an audio or video file");
      return;
    }
    if (f.size > 500 * 1024 * 1024) {
      setError("File is too large. Max 500MB.");
      return;
    }
    setFile(f);
    setFileType(isAudio ? "audio" : "video");
    setError("");
    setOutputUrl("");
    setStartTime(0);

    const el = document.createElement(isAudio ? "audio" : "video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      setDuration(el.duration);
      setEndTime(el.duration);
      URL.revokeObjectURL(el.src);
    };
    el.src = URL.createObjectURL(f);
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

  // Update current time during playback
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;
    const onTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      if (media.currentTime >= endTime) {
        media.pause();
        setIsPlaying(false);
      }
    };
    const onEnded = () => setIsPlaying(false);
    media.addEventListener("timeupdate", onTimeUpdate);
    media.addEventListener("ended", onEnded);
    return () => {
      media.removeEventListener("timeupdate", onTimeUpdate);
      media.removeEventListener("ended", onEnded);
    };
  }, [endTime]);

  const togglePlayback = () => {
    const media = mediaRef.current;
    if (!media || !file) return;
    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      media.currentTime = startTime;
      media.play();
      setIsPlaying(true);
    }
  };

  const handleTrim = async () => {
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

      const ext = file.name.substring(file.name.lastIndexOf(".")) || (fileType === "audio" ? ".mp3" : ".mp4");
      const inputName = `input${ext}`;
      const outputName = `trimmed${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      setProgress(40);

      const startStr = formatTime(startTime).replace(".", ":");
      const durationSecs = endTime - startTime;

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", startStr,
        "-t", durationSecs.toString(),
        "-c", "copy",
        outputName,
      ]);
      setProgress(80);

      const data = await ffmpeg.readFile(outputName);
      const uint8 = new Uint8Array(data as Uint8Array);
      const mimeType = fileType === "audio" ? `audio/${ext.replace(".", "")}` : `video/${ext.replace(".", "")}`;
      const blob = new Blob([uint8], { type: mimeType });
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      setProgress(100);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Trimming failed. Try again.");
    } finally {
      setLoading(false);
      setLoadingFFmpeg(false);
    }
  };

  const trimmedDuration = endTime - startTime;
  const selectionLeft = duration > 0 ? (startTime / duration) * 100 : 0;
  const selectionWidth = duration > 0 ? ((endTime - startTime) / duration) * 100 : 100;
  const playheadPos = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Page Header */}
        <div className="text-center mb-10">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 mb-4">
            <Scissors className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Trim Media
          </h1>
          <p className="mt-2 text-zinc-400">
            Upload an audio or video file and trim it to the perfect length
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
                accept="audio/*,video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
                className="hidden"
              />
              <Upload className="h-10 w-10 text-pink-400 mx-auto mb-3" />
              <p className="text-zinc-300 font-medium">
                Drop your audio or video file here
              </p>
              <p className="text-zinc-500 text-sm mt-1">
                or click to browse (max 500MB)
              </p>
            </div>
          ) : (
            <>
              {/* File Info */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  {fileType === "audio" ? (
                    <FileAudio className="h-8 w-8 text-pink-400 flex-shrink-0" />
                  ) : (
                    <FileVideo className="h-8 w-8 text-pink-400 flex-shrink-0" />
                  )}
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
                    setDuration(0);
                    setStartTime(0);
                    setEndTime(0);
                  }}
                  className="ml-3 flex-shrink-0 rounded-lg p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Hidden media element */}
              {fileType === "audio" ? (
                <audio
                  ref={mediaRef as React.RefObject<HTMLAudioElement>}
                  src={URL.createObjectURL(file)}
                  preload="metadata"
                />
              ) : (
                <video
                  ref={mediaRef as React.RefObject<HTMLVideoElement>}
                  src={URL.createObjectURL(file)}
                  preload="metadata"
                  className="hidden"
                />
              )}

              {/* Timeline/Trim Control */}
              {duration > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-zinc-300 mb-3">
                    Trim Selection
                  </label>

                  {/* Visual Timeline */}
                  <div className="relative h-14 rounded-xl bg-white/5 border border-white/10 mb-4 overflow-hidden">
                    {/* Selected region */}
                    <div
                      className="absolute top-0 h-full bg-gradient-to-r from-violet-500/20 to-pink-500/20 border-x-2 border-violet-400/50"
                      style={{
                        left: `${selectionLeft}%`,
                        width: `${selectionWidth}%`,
                      }}
                    />
                    {/* Playhead */}
                    {isPlaying && (
                      <div
                        className="absolute top-0 h-full w-0.5 bg-white/70 transition-all duration-75"
                        style={{ left: `${playheadPos}%` }}
                      />
                    )}
                    {/* Waveform decoration */}
                    <div className="absolute inset-0 flex items-center justify-center gap-[1px] px-2 opacity-30">
                      {Array.from({ length: 80 }).map((_, i) => (
                        <div
                          key={i}
                          className="bg-violet-400 rounded-full"
                          style={{
                            width: "2px",
                            height: `${Math.random() * 32 + 6}px`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Range Controls */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>Start: {formatTime(startTime)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.01}
                        value={startTime}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v < endTime) setStartTime(v);
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                        <span>End: {formatTime(endTime)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.01}
                        value={endTime}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          if (v > startTime) setEndTime(v);
                        }}
                      />
                    </div>
                  </div>

                  {/* Duration info and play */}
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-xs text-zinc-500">
                      Selected: {formatTime(trimmedDuration)} of{" "}
                      {formatTime(duration)}
                    </p>
                    <button
                      onClick={togglePlayback}
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
                </div>
              )}
            </>
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
                  : `Trimming... ${progress}%`}
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
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    File trimmed successfully!
                  </span>
                </div>
                {fileType === "audio" ? (
                  <audio controls src={outputUrl} className="w-full mb-3" />
                ) : (
                  <video
                    controls
                    src={outputUrl}
                    className="w-full rounded-lg mb-3 max-h-64"
                  />
                )}
                <a
                  href={outputUrl}
                  download={`trimmed-${file?.name || "file"}`}
                  className="glow-btn inline-flex items-center gap-2 text-sm px-4 py-2"
                >
                  <Download className="h-4 w-4" />
                  Download Trimmed File
                </a>
              </div>
            </motion.div>
          )}

          {/* Trim Button */}
          {file && !outputUrl && duration > 0 && (
            <button
              onClick={handleTrim}
              disabled={loading || trimmedDuration <= 0}
              className="glow-btn w-full flex items-center justify-center gap-2 py-3.5 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {loadingFFmpeg ? "Loading Engine..." : "Trimming..."}
                </>
              ) : (
                <>
                  <Scissors className="h-5 w-5" />
                  Trim {fileType === "audio" ? "Audio" : "Video"}
                </>
              )}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          All processing is done locally in your browser. Your file never leaves your device.
        </p>
      </motion.div>
    </div>
  );
}
