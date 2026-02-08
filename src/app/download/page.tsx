"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Download,
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Music,
  Video,
} from "lucide-react";

type OutputFormat = "mp3" | "mp4" | "wav" | "webm";

export default function DownloadPage() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<OutputFormat>("mp3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleDownload = async () => {
    if (!url.trim()) {
      setError("Please enter a valid URL");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);
    setProgress(10);

    try {
      abortRef.current = new AbortController();
      setProgress(30);

      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortRef.current.signal,
      });

      setProgress(60);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to download file");
      }

      const contentType = response.headers.get("content-type") || "";
      const blob = await response.blob();
      setProgress(90);

      let extension = format;
      if (contentType.includes("audio")) {
        extension = format === "mp4" || format === "webm" ? "mp3" : format;
      } else if (contentType.includes("video")) {
        extension = format === "mp3" || format === "wav" ? "mp4" : format;
      }

      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `download.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      setProgress(100);
      setSuccess(true);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Download failed. Please check the URL and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formats: { value: OutputFormat; label: string; icon: typeof Music }[] = [
    { value: "mp3", label: "MP3", icon: Music },
    { value: "wav", label: "WAV", icon: Music },
    { value: "mp4", label: "MP4", icon: Video },
    { value: "webm", label: "WebM", icon: Video },
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
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
            <Download className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">
            Download Media
          </h1>
          <p className="mt-2 text-zinc-400">
            Paste a direct link to any audio or video file to download it
          </p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8">
          {/* URL Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Media URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500" />
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError("");
                  setSuccess(false);
                }}
                placeholder="https://example.com/audio.mp3"
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-all"
              />
            </div>
          </div>

          {/* Format Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Preferred Format
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {formats.map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFormat(f.value)}
                    className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                      format === f.value
                        ? "border-violet-500/50 bg-violet-500/10 text-violet-300"
                        : "border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Progress Bar */}
          {loading && (
            <div className="mb-6">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-2">Downloading... {progress}%</p>
            </div>
          )}

          {/* Error Message */}
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

          {/* Success Message */}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center gap-2 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
            >
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              File downloaded successfully!
            </motion.div>
          )}

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={loading || !url.trim()}
            className="glow-btn w-full flex items-center justify-center gap-2 py-3.5 text-base"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download
              </>
            )}
          </button>
        </div>

        {/* Info */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          Supports direct links to audio and video files. The file is fetched through our server and sent to your browser.
        </p>
      </motion.div>
    </div>
  );
}
