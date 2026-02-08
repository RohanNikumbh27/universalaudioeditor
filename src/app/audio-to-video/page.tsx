"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { getFFmpeg, formatTime } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

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
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    Audio extracted successfully!
                  </span>
                </div>
                <audio controls src={outputUrl} className="w-full mb-3" />
                <a
                  href={outputUrl}
                  download={`extracted-audio.${format}`}
                  className="glow-btn inline-flex items-center gap-2 text-sm px-4 py-2"
                >
                  <Download className="h-4 w-4" />
                  Download {format.toUpperCase()}
                </a>
              </div>
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
    </div>
  );
}
