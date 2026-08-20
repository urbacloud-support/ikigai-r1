import React, { useState, useEffect, useRef, useCallback } from 'react';

const R2_API = import.meta.env.VITE_IKIGAI2_API_BASE || 'https://ikigai2-backend.up.railway.app';
const TIMER_KEY = import.meta.env.VITE_TIMER_API_KEY || 'ikigai2_hackathon_timer_2026_x9k';
const SYNC_INTERVAL_MS = 30000; // 30 seconds

function formatMs(ms) {
  if (ms <= 0) return { h: '00', m: '00', s: '00' };
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return {
    h: String(h).padStart(2, '0'),
    m: String(m).padStart(2, '0'),
    s: String(s).padStart(2, '0')
  };
}

export default function HackathonCountdown() {
  const [status, setStatus] = useState('stopped'); // 'running' | 'stopped' | 'expired'
  const [remainingMs, setRemainingMs] = useState(0);
  const [fetchError, setFetchError] = useState(false);

  const tickRef = useRef(null);
  const syncRef = useRef(null);
  const lastSyncRef = useRef({ remainingMs: 0, syncedAt: null });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${R2_API}/api/timer/status`, {
        headers: { 'X-Timer-Key': TIMER_KEY }
      });
      if (!res.ok) { setFetchError(true); return; }
      const data = await res.json();
      if (!data.success) return;

      const t = data.timer;
      setStatus(t.status);
      setFetchError(false);

      lastSyncRef.current = {
        remainingMs: t.remainingMs,
        syncedAt: Date.now()
      };
      setRemainingMs(t.remainingMs);
    } catch (_) {
      setFetchError(true);
    }
  }, []);

  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setRemainingMs(() => {
        const { remainingMs: synced, syncedAt } = lastSyncRef.current;
        if (!syncedAt) return 0;
        const elapsed = Date.now() - syncedAt;
        return Math.max(0, synced - elapsed);
      });
    }, 1000);
  }, []);

  useEffect(() => {
    fetchStatus();
    startTick();
    syncRef.current = setInterval(fetchStatus, SYNC_INTERVAL_MS);
    return () => {
      clearInterval(tickRef.current);
      clearInterval(syncRef.current);
    };
  }, [fetchStatus, startTick]);

  useEffect(() => {
    if (status === 'running') {
      startTick();
    } else {
      clearInterval(tickRef.current);
    }
  }, [status, startTick]);

  const time = formatMs(remainingMs);

  // ── State: Timer not yet started ──────────────────────────────────────────
  if (status === 'stopped' || fetchError) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 mb-6 flex items-center justify-center gap-3 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <p className="font-semibold text-sm">
          {fetchError ? 'Countdown unavailable — check connection.' : 'Hackathon timer not yet started.'}
        </p>
      </div>
    );
  }

  // ── State: Timer expired ──────────────────────────────────────────────────
  if (status === 'expired') {
    return (
      <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl p-5 mb-6 text-white text-center shadow-lg">
        <p className="text-3xl font-black mb-1">🎉 Time's Up!</p>
        <p className="text-sm opacity-90 font-medium">The 36-hour hackathon has concluded. Great work, everyone!</p>
      </div>
    );
  }

  // ── State: Timer running ──────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-5 mb-6 shadow-lg overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #753a99 0%, #ba3b78 50%, #e34e89 100%)' }}
    >
      {/* Subtle animated background pulse */}
      <div
        className="absolute inset-0 opacity-10"
        style={{ background: 'radial-gradient(circle at 30% 50%, white 0%, transparent 60%)' }}
      />

      <div className="relative z-10 text-white text-center">
        <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-3">
          ⏱ Hackathon Countdown — 36 Hours
        </p>

        {/* Flip-clock style digit display */}
        <div className="flex items-center justify-center gap-3">
          {[{ label: 'HRS', value: time.h }, { label: 'MIN', value: time.m }, { label: 'SEC', value: time.s }].map((seg, i) => (
            <React.Fragment key={seg.label}>
              {i > 0 && (
                <span
                  className="text-4xl font-black opacity-60 mb-4 animate-pulse"
                  style={{ animationDuration: '1s' }}
                >:</span>
              )}
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-3xl shadow-inner"
                  style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)' }}
                >
                  {seg.value}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 mt-1">{seg.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        <p className="text-xs opacity-70 mt-3 font-medium">
          Server-authoritative · Updates every 30 seconds
        </p>
      </div>
    </div>
  );
}
