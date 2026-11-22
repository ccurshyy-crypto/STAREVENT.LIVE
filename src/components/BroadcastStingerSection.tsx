import { useEffect, useRef, useState } from 'react';
import {
  ExternalLink,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Youtube,
} from 'lucide-react';
import { Language, STUDIO_CONTACT } from '../data/content';
import { ScrollReveal } from './ScrollReveal';

interface BroadcastStingerSectionProps {
  lang: Language;
  onOpenOverlays: () => void;
}

export function BroadcastStingerSection({
  lang,
  onOpenOverlays,
}: BroadcastStingerSectionProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      video.pause();
      setIsPlaying(false);
      return;
    }

    const playPromise = video.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        setIsPlaying(false);
      });
    }
  }, []);

  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => setIsPlaying(false));
      }
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && video.paused) {
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {});
      }
      setIsPlaying(true);
    }
  };

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    const p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {});
    }
    setIsPlaying(true);
  };

  return (
    <section
      id="youtube-channel"
      className="py-12 sm:py-20 lg:py-24 border-b border-white/10 bg-[#090B12]/36 backdrop-blur-[2px]"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: 16:9 Broadcast Stinger Motion Showcase */}
          <ScrollReveal direction="left" className="lg:col-span-7">
            <div className="studio-card-animate bg-[#121216] border border-[#FACC15]/25 rounded-2xl p-3 sm:p-4 shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
              <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
                {!videoError ? (
                  <video
                    ref={videoRef}
                    src={STUDIO_CONTACT.stingerVideoPath}
                    autoPlay
                    muted={isMuted}
                    loop
                    playsInline
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => setVideoError(true)}
                    aria-label="Star Event Live official broadcast stinger transition video — STAREVENT.LIVE Subscribe"
                    className="w-full h-full object-cover block"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#FACC15] via-[#EAB308] to-[#CA8A04] flex flex-col items-center justify-center p-6 text-center">
                    <p className="font-display text-3xl sm:text-5xl font-black tracking-tight text-black">
                      STAREVENT.LIVE
                    </p>
                    <p className="text-sm sm:text-base font-semibold tracking-widest text-black/80 mt-2">
                      SUBSCRIBE
                    </p>
                  </div>
                )}
              </div>

              {/* Clean Broadcast Transport Bar */}
              <div className="mt-3 px-1 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-mono font-semibold text-[#FACC15]">16:9 HD</span>
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span>
                    {lang === 'mr'
                      ? 'अधिकृत ब्रॉडकास्ट स्टिंगर · STAREVENT.LIVE'
                      : 'Official Broadcast Stinger · STAREVENT.LIVE'}
                  </span>
                </div>

                {!videoError && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                      )}
                      <span>
                        {isPlaying
                          ? lang === 'mr'
                            ? 'थांबवा'
                            : 'Pause'
                          : lang === 'mr'
                            ? 'प्ले करा'
                            : 'Play'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReplay}
                      aria-label={lang === 'mr' ? 'पुन्हा प्ले करा' : 'Replay stinger'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-zinc-300" aria-hidden="true" />
                      <span>{lang === 'mr' ? 'रिप्ले' : 'Replay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleToggleMute}
                      aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
                    >
                      {isMuted ? (
                        <VolumeX className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                      )}
                      <span>
                        {isMuted
                          ? lang === 'mr'
                            ? 'आवाज'
                            : 'Sound'
                          : lang === 'mr'
                            ? 'म्यूट'
                            : 'Mute'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ScrollReveal>

          {/* Right: YouTube Channel Subscribe & Broadcast Transition Context */}
          <ScrollReveal direction="right" delay={100} className="lg:col-span-5 space-y-6">
            <div className="space-y-3.5">
              <p className="text-xs sm:text-sm font-medium text-[#FACC15]">
                {lang === 'mr'
                  ? 'अधिकृत YouTube चॅनेल · ब्रॉडकास्ट ट्रान्झिशन'
                  : 'Official YouTube Channel · Broadcast Stinger'}
              </p>
              <h2
                className={`font-display text-2xl sm:text-4xl font-bold text-white [text-wrap:balance] ${
                  lang === 'mr' ? 'leading-[1.38] tracking-normal' : 'leading-[1.2] tracking-tight'
                }`}
              >
                {lang === 'mr'
                  ? 'STAREVENT.LIVE चॅनेलला Subscribe करा'
                  : 'Subscribe to STAREVENT.LIVE on YouTube'}
              </h2>
              <p className="text-sm sm:text-base text-zinc-300 leading-[1.75]">
                {lang === 'mr'
                  ? 'क्रिकेट महासंग्राम, कबड्डी स्पर्धा, लग्न-हळदी सोहळे आणि सर्व स्थानिक कार्यक्रमांचे 4K व Full HD थेट प्रक्षेपण पाहण्यासाठी आमच्या अधिकृत YouTube चॅनेलशी जोडले जा. प्रत्येक लाईव्ह ब्रॉडकास्टमध्ये कस्टम स्टिंगर ट्रान्झिशन व स्कोअरबोर्ड ग्राफिक्स वापरले जातात.'
                  : 'Watch live 4K & Full HD broadcasts of Cricket championships, Kabaddi leagues, weddings, and community festivals directly on our official YouTube channel — complete with custom stinger transitions, replays, and live graphics.'}
              </p>
            </div>

            <div className="pt-4 border-t border-white/10 space-y-2.5 text-xs sm:text-sm text-zinc-400 leading-relaxed">
              <p>
                <span className="font-mono text-[#FACC15] font-semibold mr-2">01.</span>
                {lang === 'mr'
                  ? 'चॅनेल हँडल: YouTube (@stareventlive01)'
                  : 'Official Handle: YouTube (@stareventlive01)'}
              </p>
              <p>
                <span className="font-mono text-[#FACC15] font-semibold mr-2">02.</span>
                {lang === 'mr'
                  ? 'OBS Studio व vMix साठी कस्टम ब्रॉडकास्ट ट्रान्झिशन व ओव्हरले'
                  : 'Custom broadcast stinger transitions & live overlays for OBS & vMix'}
              </p>
              <p>
                <span className="font-mono text-[#FACC15] font-semibold mr-2">03.</span>
                {lang === 'mr'
                  ? 'वेबसाईट: starevent.live · थेट संपर्क: 9890175727'
                  : 'Portal: starevent.live · Direct Desk: 9890175727'}
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3.5">
              <a
                href={STUDIO_CONTACT.youtubeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary-pro w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-5 sm:px-6 py-3.5 text-sm font-bold rounded-xl text-center sm:whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090B]"
              >
                <Youtube className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {lang === 'mr'
                    ? 'YouTube Subscribe करा'
                    : 'Subscribe on YouTube'}
                </span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              </a>

              <button
                type="button"
                onClick={onOpenOverlays}
                className="btn-glass-pro w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-bold text-zinc-100 rounded-xl text-center sm:whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FACC15]"
              >
                <span>{lang === 'mr' ? 'लाईव्ह ओव्हरले पहा' : 'Explore Live Overlays'}</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
