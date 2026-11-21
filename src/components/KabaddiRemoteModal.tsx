import { FormEvent, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { Language } from '../data/content';
import { sanitizeRoomIdClient } from '../hooks/useOverlaySync';

interface KabaddiRemoteModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  currentRoomId: string;
  onBindMatchId: (matchId: string) => void;
  vmixBrowserUrl: string;
  connectedDisplays: number;
  connectedControllers: number;
  controllerNames: string[];
}

export function KabaddiRemoteModal({
  open,
  onClose,
  lang,
  currentRoomId,
  onBindMatchId,
  vmixBrowserUrl,
  connectedDisplays,
  connectedControllers,
  controllerNames,
}: KabaddiRemoteModalProps) {
  const [matchId, setMatchId] = useState(currentRoomId);
  const [pin, setPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [pinProtected, setPinProtected] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const [networkMode, setNetworkMode] = useState<'cloud' | 'lan'>('cloud');
  const [lanUrls, setLanUrls] = useState<string[]>([]);
  const [customLanBase, setCustomLanBase] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMatchId(currentRoomId);
    setError(null);
    setSuccessMsg(null);
  }, [open, currentRoomId]);

  // Check if current matchId already has a PIN and load local LAN IPv4 addresses
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const safeId = sanitizeRoomIdClient(matchId);

    fetch(`/api/remote/match/${encodeURIComponent(safeId)}/info`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok) {
          setPinProtected(Boolean(data.pinProtected));
        }
      })
      .catch(() => {});

    fetch('/api/remote/network-info', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.ok && Array.isArray(data.lanUrls)) {
          setLanUrls(data.lanUrls);
          setCustomLanBase((prev) => prev || data.lanUrls[0] || 'http://192.168.1.10:3000');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomLanBase((prev) => prev || 'http://192.168.1.10:3000');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, matchId]);

  const effectiveBaseUrl = useMemo(() => {
    if (networkMode === 'lan') {
      const cleaned = customLanBase.trim().replace(/\/+$/, '');
      if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        return cleaned;
      }
      return cleaned ? `http://${cleaned}` : 'http://192.168.1.10:3000';
    }
    return typeof window !== 'undefined' ? window.location.origin : 'https://starevent.live';
  }, [networkMode, customLanBase]);

  const safeMatchId = sanitizeRoomIdClient(matchId);

  const remoteControllerUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('remote', '1');
    params.set('match', safeMatchId);
    if (networkMode === 'lan') {
      params.set('mode', 'lan');
    }
    return `${effectiveBaseUrl}/?${params.toString()}`;
  }, [effectiveBaseUrl, safeMatchId, networkMode]);

  const effectiveVmixUrl = useMemo(() => {
    try {
      const parsed = new URL(vmixBrowserUrl);
      parsed.searchParams.set('room', safeMatchId);
      if (networkMode === 'lan') {
        const lan = new URL(effectiveBaseUrl);
        parsed.protocol = lan.protocol;
        parsed.host = lan.host;
      }
      return parsed.toString();
    } catch {
      return vmixBrowserUrl;
    }
  }, [vmixBrowserUrl, safeMatchId, networkMode, effectiveBaseUrl]);

  // Generate crisp QR Code whenever Remote Controller URL changes
  useEffect(() => {
    if (!open) return;
    let active = true;
    QRCode.toDataURL(remoteControllerUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#09090B', light: '#FFFFFF' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [open, remoteControllerUrl]);

  if (!open) return null;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      setCopiedKey(null);
    }
  };

  const handleGenerateNewMatchId = () => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const nextId = `kbd-${rand}`;
    setMatchId(nextId);
    setPinProtected(false);
    setActiveToken(null);
    setCurrentPin('');
    setSuccessMsg(null);
    setError(null);
    onBindMatchId(nextId);
  };

  const handleSavePin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedPin = pin.trim();
    if (trimmedPin.length < 4 || trimmedPin.length > 12) {
      setError(
        lang === 'mr'
          ? 'कृपया 4 ते 12 अंकी सुरक्षित Admin PIN टाका (उदा. 4829).'
          : 'Please enter a 4 to 12 character Admin PIN (e.g. 4829).'
      );
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeToken) {
        headers.Authorization = `Bearer ${activeToken}`;
      }
      const res = await fetch('/api/remote/match/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          matchId: safeMatchId,
          pin: trimmedPin,
          currentPin: currentPin.trim() || undefined,
          deviceName: 'vMix PC Operator',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setError(data?.error || 'Could not save Admin PIN.');
        return;
      }

      setPinProtected(true);
      setActiveToken(data.token || null);
      setCurrentPin('');
      setPin('');
      onBindMatchId(data.matchId || safeMatchId);
      setSuccessMsg(
        lang === 'mr'
          ? `Match ID "${(data.matchId || safeMatchId).toUpperCase()}" सुरक्षित Admin PIN ने लॉक झाला! आता मोबाईल/टॅबलेटवरून QR स्कॅन करा.`
          : `Match ID "${(data.matchId || safeMatchId).toUpperCase()}" is locked with your Admin PIN! Scan the QR on mobile, tablet, or laptop to control live.`
      );
    } catch {
      setError('Server connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kabaddi-remote-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-5 overflow-y-auto"
    >
      <div className="relative w-full max-w-3xl bg-[#0F1319] border border-white/15 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#141A23]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/50 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-[#FACC15]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="kabaddi-remote-modal-title"
                className="font-display text-base sm:text-lg font-extrabold text-white truncate"
              >
                {lang === 'mr'
                  ? 'कबड्डी रिमोट कंट्रोल सिस्टीम (मोबाईल / टॅबलेट / लॅपटॉप)'
                  : 'Kabaddi Remote Control System (Mobile / Tablet / Laptop)'}
              </h2>
              <p className="text-[11px] text-zinc-400 truncate">
                {lang === 'mr'
                  ? 'रिअल-टाइम WebSocket सिंक · मल्टी-डिव्हाइस PIN सुरक्षा · लोकल Wi-Fi LAN सपोर्ट'
                  : 'Real-Time WebSocket Sync · Multi-Device Admin PIN · Offline Local Wi-Fi LAN Mode'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close remote pairing dialog"
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Live Presence Status Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-[#151C26] border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Monitor className="w-4 h-4 text-[#4ADE80]" aria-hidden="true" />
                <span>vMix / OBS Displays</span>
              </div>
              <span className="font-mono font-extrabold text-sm text-[#4ADE80] tabular-nums">
                {connectedDisplays}
              </span>
            </div>

            <div className="bg-[#151C26] border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Smartphone className="w-4 h-4 text-[#FACC15]" aria-hidden="true" />
                <span>Remote Controllers</span>
              </div>
              <span className="font-mono font-extrabold text-sm text-[#FACC15] tabular-nums">
                {connectedControllers}
              </span>
            </div>

            <div className="bg-[#151C26] border border-white/10 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <ShieldCheck
                  className={`w-4 h-4 ${pinProtected ? 'text-[#4ADE80]' : 'text-[#F59E0B]'}`}
                  aria-hidden="true"
                />
                <span>Admin PIN</span>
              </div>
              <span
                className={`font-mono font-bold text-xs ${
                  pinProtected ? 'text-[#4ADE80]' : 'text-[#F59E0B]'
                }`}
              >
                {pinProtected ? 'PROTECTED' : 'SET PIN'}
              </span>
            </div>
          </div>

          {controllerNames.length > 0 && (
            <p className="text-[11px] font-mono text-zinc-400">
              Active devices: <span className="text-zinc-200">{controllerNames.join(' · ')}</span>
            </p>
          )}

          {/* Main 2-Column Layout: Step 1 (Match ID + PIN) & Step 2 (QR + Links + LAN Mode) */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* LEFT: Match ID + Admin PIN Setup */}
            <div className="md:col-span-6 space-y-4 bg-[#141A23] border border-white/10 rounded-xl p-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#FACC15] uppercase tracking-wider">
                  Step 1 · Match ID & Secure Admin PIN
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {lang === 'mr'
                    ? 'प्रत्येक मॅचसाठी युनिक Match ID व Admin PIN सेट करा. एकाच वेळी अनेक मोबाईल / लॅपटॉप सुरक्षितपणे कंट्रोल करू शकतात.'
                    : 'Set a unique Match ID & Admin PIN. Multiple phones, tablets, or laptops can control the match simultaneously once verified.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="remote-match-id-input" className="block text-xs font-medium text-zinc-300">
                  Unique Match ID
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="remote-match-id-input"
                    type="text"
                    value={matchId}
                    onChange={(e) => {
                      const clean = sanitizeRoomIdClient(e.target.value);
                      setMatchId(clean);
                      onBindMatchId(clean);
                    }}
                    className="flex-1 min-w-0 px-3 py-2 font-mono text-sm font-bold uppercase bg-[#0B0F14] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateNewMatchId}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#1E2734] hover:bg-[#273345] border border-white/15 rounded-lg text-zinc-100 whitespace-nowrap"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#FACC15]" aria-hidden="true" />
                    <span>New ID</span>
                  </button>
                </div>
              </div>

              <form onSubmit={handleSavePin} className="space-y-3">
                {pinProtected && !activeToken && (
                  <div className="space-y-1">
                    <label htmlFor="remote-current-pin" className="block text-xs font-medium text-zinc-300">
                      Current Admin PIN (to update PIN)
                    </label>
                    <input
                      id="remote-current-pin"
                      type="password"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      placeholder="Enter existing PIN"
                      autoComplete="off"
                      className="w-full px-3 py-2 text-sm font-mono bg-[#0B0F14] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="remote-admin-pin" className="block text-xs font-medium text-zinc-300">
                    {pinProtected ? 'New / Reset Admin PIN (4–12 chars)' : 'Set Secure Admin PIN (4–12 chars)'}
                  </label>
                  <input
                    id="remote-admin-pin"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="e.g. 4829 or STAR26"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 text-sm font-mono bg-[#0B0F14] border border-white/15 rounded-lg text-white focus:outline-none focus:border-[#FACC15]"
                  />
                </div>

                {error && (
                  <p className="text-xs text-[#FCA5A5] bg-[#2D1418] border border-[#EF4444]/40 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                {successMsg && (
                  <p className="text-xs text-[#86EFAC] bg-[#10271A] border border-[#4ADE80]/40 rounded-lg px-3 py-2">
                    {successMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-black bg-[#FACC15] hover:bg-[#EAB308] disabled:opacity-60 rounded-lg transition-colors"
                >
                  <KeyRound className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {saving
                      ? 'Saving PIN...'
                      : pinProtected
                        ? 'Update Admin PIN'
                        : 'Activate Match ID & Admin PIN'}
                  </span>
                </button>
              </form>

              {/* Matched vMix Browser Input URL */}
              <div className="pt-3 border-t border-white/10 space-y-1.5">
                <p className="text-[11px] font-bold text-zinc-200">
                  vMix 1920×1080 Browser Input URL (Auto-Synced to {safeMatchId.toUpperCase()})
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={effectiveVmixUrl}
                    aria-label="vMix 1920x1080 Transparent URL"
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono bg-[#0B0F14] border border-white/10 rounded text-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('vmix-modal', effectiveVmixUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded shrink-0"
                  >
                    {copiedKey === 'vmix-modal' ? (
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedKey === 'vmix-modal' ? 'Copied' : 'Copy vMix'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT: QR Code + Cloud / Offline Local Wi-Fi LAN Mode */}
            <div className="md:col-span-6 space-y-4 bg-[#141A23] border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-[#FACC15] uppercase tracking-wider">
                  Step 2 · Scan QR on Phone / Tablet
                </p>
                <div className="inline-flex rounded-lg bg-[#0B0F14] p-0.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setNetworkMode('cloud')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      networkMode === 'cloud'
                        ? 'bg-[#3B9E6D] text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Wifi className="w-3 h-3" aria-hidden="true" />
                    <span>Internet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNetworkMode('lan')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                      networkMode === 'lan'
                        ? 'bg-[#FACC15] text-black'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <WifiOff className="w-3 h-3" aria-hidden="true" />
                    <span>Local LAN</span>
                  </button>
                </div>
              </div>

              {networkMode === 'lan' && (
                <div className="bg-[#1B180C] border border-[#FACC15]/40 rounded-lg p-3 space-y-2">
                  <p className="text-[11px] text-[#FEF08A] leading-relaxed">
                    <strong>Offline Local Network Mode:</strong>{' '}
                    {lang === 'mr'
                      ? 'इंटरनेट बंद झाल्यावर vMix PC व मोबाईल एकाच Wi-Fi राऊटर किंवा हॉटस्पॉटवर कनेक्ट करा आणि खालील LAN IP वापरा.'
                      : 'When internet disconnects, connect vMix PC & mobile to the same Wi-Fi router/hotspot and use the PC local IP below (no internet required).'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={customLanBase}
                      onChange={(e) => setCustomLanBase(e.target.value)}
                      placeholder="http://192.168.1.10:3000"
                      aria-label="Local LAN Server URL"
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs font-mono bg-[#0B0F14] border border-white/15 rounded text-white focus:outline-none focus:border-[#FACC15]"
                    />
                  </div>
                  {lanUrls.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {lanUrls.map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setCustomLanBase(u)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded border ${
                            customLanBase === u
                              ? 'bg-[#FACC15] text-black border-[#FACC15] font-bold'
                              : 'bg-[#0B0F14] text-zinc-300 border-white/15'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* QR Display */}
              <div className="flex flex-col items-center justify-center bg-white rounded-xl p-3.5 mx-auto w-fit shadow-lg">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`Scan QR code to open Kabaddi Remote Controller for ${safeMatchId}`}
                    className="w-44 h-44 sm:w-48 sm:h-48 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-xs text-zinc-500">
                    Generating QR...
                  </div>
                )}
                <p className="mt-2 font-mono text-xs font-extrabold text-zinc-900 tracking-wider">
                  MATCH ID: {safeMatchId.toUpperCase()}
                </p>
              </div>

              {/* Copyable Remote Controller URL + Open Button */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    readOnly
                    value={remoteControllerUrl}
                    aria-label="Remote Controller URL"
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] font-mono bg-[#0B0F14] border border-white/10 rounded text-zinc-200"
                  />
                  <button
                    type="button"
                    onClick={() => copyText('remote-url', remoteControllerUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-[#242E3D] hover:bg-[#313E52] text-white rounded shrink-0"
                  >
                    {copiedKey === 'remote-url' ? (
                      <Check className="w-3.5 h-3.5 text-[#4ADE80]" aria-hidden="true" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{copiedKey === 'remote-url' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <a
                  href={remoteControllerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#3B9E6D] hover:bg-[#338C60] rounded-lg transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Open Remote Controller in New Tab</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
