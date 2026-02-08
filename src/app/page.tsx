"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Download, Film, Scissors, Zap, Shield, Smartphone } from "lucide-react";

const features = [
  {
    icon: Download,
    title: "Download",
    description: "Download audio or video from any URL. Paste a link and save media instantly.",
    href: "/download",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: Film,
    title: "Audio to Video",
    description: "Extract audio from video files. Upload a video, get a downloadable audio track.",
    href: "/audio-to-video",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: Scissors,
    title: "Trim",
    description: "Trim audio and video to the exact length you need. Precision cutting made easy.",
    href: "/trim",
    gradient: "from-pink-500 to-rose-600",
  },
];

const highlights = [
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "All processing happens in your browser using WebAssembly. No uploads to servers.",
  },
  {
    icon: Shield,
    title: "100% Private",
    description: "Your files never leave your device. Everything is processed locally.",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description: "Fully responsive design. Use on desktop, tablet, or mobile with ease.",
  },
];

export default function Home() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center pt-12 sm:pt-20 pb-16"
      >
        {/* Waveform Animation */}
        <div className="flex items-center justify-center gap-[2px] mb-8 h-8">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="waveform-bar"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-white via-violet-200 to-violet-400 bg-clip-text text-transparent">
            Universal Audio Editor
          </span>
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Download, convert, and trim audio & video files directly in your browser.
          No installs. No uploads. Completely free and private.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/download" className="glow-btn text-base px-8 py-3">
            Get Started
          </Link>
          <Link
            href="/trim"
            className="rounded-xl border border-white/10 px-8 py-3 text-base font-medium text-zinc-300 hover:bg-white/5 hover:border-white/20 transition-all"
          >
            Try Trimming
          </Link>
        </div>
      </motion.div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-20">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
            >
              <Link href={feature.href} className="block group">
                <div className="glass-card p-6 h-full">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} mb-4 transition-transform group-hover:scale-110`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 text-violet-400 text-sm font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    Open tool &rarr;
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Highlights */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16"
      >
        {highlights.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-start gap-3 p-4">
              <div className="flex-shrink-0 mt-0.5">
                <Icon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">
                  {item.title}
                </h4>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Footer */}
      <div className="border-t border-white/5 pt-8 pb-4 text-center">
        <p className="text-xs text-zinc-600">
          Built with Next.js & FFmpeg WebAssembly. All processing is done locally in your browser.
        </p>
      </div>
    </div>
  );
}
