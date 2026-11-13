import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import type { AlarmRecord, AlarmSeverity } from '../types/substation';

type Sound = 'critical' | 'major' | 'minor' | 'ack' | 'clear';
type Entry = { id: string; timestamp: string; label: string; severity: AlarmSeverity; state: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED'; source: 'station' | 'test'; firstOut: boolean };
type EventLog = { id: string; timestamp: string; event: string; label: string };
const URLS: Record<Sound, string> = {
  critical: '/assets/audio/critical_alarm.mp3', major: '/assets/audio/major_alarm.mp3', minor: '/assets/audio/minor_alarm.mp3',
  ack: '/assets/audio/alarm_acknowledged.mp3', clear: '/assets/audio/alarm_cleared.mp3',
};
const rank = (s: AlarmSeverity) => s === 'CRITICAL' ? 3 : s === 'MAJOR' ? 2 : s === 'MINOR' || s === 'WARNING' ? 1 : 0;
const soundFor = (r: number): Sound => r >= 3 ? 'critical' : r === 2 ? 'major' : 'minor';
const stamp = () => new Date().toISOString();
const displayTime = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? value : d.toLocaleString(); };

/** Global training annunciator. Station alarm states remain owned by the existing simulation store. */
export function ScadaAlarmAudio() {
  const alarms = useSubstationStore(s => s.alarms);
  const acknowledgeAlarm = useSubstationStore(s => s.acknowledgeAlarm);
  const acknowledgeAllAlarms = useSubstationStore(s => s.acknowledgeAllAlarms);
  const clearClearedAlarms = useSubstationStore(s => s.clearClearedAlarms);
  const [enabled, setEnabled] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hornSilenced, setHornSilenced] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [local, setLocal] = useState<Entry[]>([]);
  const [history, setHistory] = useState<EventLog[]>([]);
  const [firstOut, setFirstOut] = useState<string | null>(null);
  const [message, setMessage] = useState('Enable sound to activate audible annunciation');
  const player = useRef<HTMLAudioElement | null>(null);
  const known = useRef<Map<string, AlarmRecord>>(new Map());
  const initialized = useRef(false);
  const previousActive = useRef(0);
  const localCounter = useRef(0);
  const hornRef = useRef(false);
  const enabledRef = useRef(false);
  const mutedRef = useRef(false);
  const firstOutRef = useRef<string | null>(null);
  const localRef = useRef<Entry[]>([]);
  const append = useCallback((event: string, label: string) => {
    setHistory(old => [{ id: `${Date.now()}-${Math.random()}`, timestamp: stamp(), event, label }, ...old].slice(0, 500));
  }, []);
  const stop = useCallback(() => {
    if (player.current) { player.current.pause(); player.current.currentTime = 0; player.current = null; }
  }, []);
  const play = useCallback((sound: Sound, loop = false) => {
    stop();
    if (!enabledRef.current || mutedRef.current) return;
    const audio = new Audio(URLS[sound]);
    audio.volume = sound === 'critical' ? 0.35 : 0.28;
    audio.loop = loop;
    player.current = audio;
    void audio.play().catch(() => setMessage('Browser blocked sound; click Enable Sound again'));
  }, [stop]);
  const stationEntries: Entry[] = useMemo(() => alarms.map(a => ({
    id: a.id, timestamp: a.timestamp, label: `${a.bayName}: ${a.signalName}`, severity: a.severity,
    state: a.state, source: 'station' as const, firstOut: firstOut === a.id,
  })), [alarms, firstOut]);
  const entries = useMemo(() => [...stationEntries, ...local].sort((a, b) => b.timestamp.localeCompare(a.timestamp)), [stationEntries, local]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sas:annunciator-snapshot', { detail: { entries, history, firstOut, hornSilenced, enabled, muted } }));
  }, [entries, history, firstOut, hornSilenced, enabled, muted]);
  useEffect(() => {
    const onRequest = (event: Event) => {
      const d = (event as CustomEvent<{ action?: string; id?: string }>).detail;
      if (!d) return;
      if (d.action === 'open') setExpanded(true);
      if (d.action === 'ack' && d.id) {
        const target = entries.find(a => a.id === d.id && a.state === 'ACTIVE_UNACK');
        if (target) { if (target.source === 'station') acknowledgeAlarm(target.id); else setLocal(old => old.map(a => a.id === target.id ? { ...a, state: 'ACTIVE_ACK' } : a)); append('ACK', target.label); }
      }
    };
    window.addEventListener('sas:annunciator-command', onRequest);
    return () => window.removeEventListener('sas:annunciator-command', onRequest);
  }, [entries, acknowledgeAlarm, append]);
  const active = entries.filter(a => a.state !== 'CLEARED');
  const unack = active.filter(a => a.state === 'ACTIVE_UNACK');
  const topRank = unack.reduce((m, a) => Math.max(m, rank(a.severity)), 0);
  const hornRank = hornSilenced ? 0 : topRank;
  useEffect(() => { enabledRef.current = enabled; mutedRef.current = muted; hornRef.current = hornSilenced; }, [enabled, muted, hornSilenced]);
  useEffect(() => { localRef.current = local; }, [local]);
  useEffect(() => { firstOutRef.current = firstOut; }, [firstOut]);

  useEffect(() => {
    const prior = known.current;
    if (!initialized.current) {
      alarms.forEach(a => prior.set(a.id, a));
      initialized.current = true;
      previousActive.current = alarms.filter(a => a.state !== 'CLEARED').length;
      return;
    }
    for (const a of alarms) {
      const old = prior.get(a.id);
      if (a.state === 'ACTIVE_UNACK' && old?.state !== 'ACTIVE_UNACK') {
        append('ALARM', `${a.severity} · ${a.bayName} · ${a.signalName}`);
        if (!firstOutRef.current && previousActive.current === 0) { firstOutRef.current = a.id; setFirstOut(a.id); append('FIRST OUT', a.signalName); }
        hornRef.current = false; setHornSilenced(false);
      } else if (a.state === 'ACTIVE_ACK' && old?.state === 'ACTIVE_UNACK') append('ACK', a.signalName);
      else if (a.state === 'CLEARED' && old && old.state !== 'CLEARED') append('RETURN TO NORMAL', a.signalName);
    }
    for (const [id, a] of prior) if (!alarms.some(current => current.id === id)) append('REMOVED', a.signalName);
    known.current = new Map(alarms.map(a => [a.id, a]));
    previousActive.current = alarms.filter(a => a.state !== 'CLEARED').length + localRef.current.filter(a => a.state !== 'CLEARED').length;
  }, [alarms, append]);

  useEffect(() => {
    const onLocal = (event: Event) => {
      const d = (event as CustomEvent<{ action?: 'fault' | 'ack' | 'clear'; severity?: AlarmSeverity; id?: string; label?: string }>).detail;
      if (!d?.action) return;
      const id = `TEST-${d.id || 'SIMULATION'}`;
      const label = d.label || 'Testing Guidance simulated fault';
      const old = localRef.current;
      if (d.action === 'fault') {
        const next: Entry = { id, label, severity: d.severity || 'CRITICAL', timestamp: stamp(), state: 'ACTIVE_UNACK', source: 'test', firstOut: false };
        localRef.current = [...old.filter(a => a.id !== id), next]; setLocal(localRef.current);
        append('ALARM', `${next.severity} · ${label}`);
        if (!firstOutRef.current && previousActive.current === 0) { firstOutRef.current = id; setFirstOut(id); append('FIRST OUT', label); }
        hornRef.current = false; setHornSilenced(false);
      } else {
        const nextState = d.action === 'ack' ? 'ACTIVE_ACK' : 'CLEARED';
        const candidates = old.some(a => a.id === id && a.state !== 'CLEARED') ? old.filter(a => a.id === id) : old.filter(a => a.state !== 'CLEARED');
        if (!candidates.length) return;
        const target = candidates[candidates.length - 1];
        localRef.current = old.map(a => a.id === target.id ? { ...a, state: nextState } : a); setLocal(localRef.current);
        append(d.action === 'ack' ? 'ACK' : 'RETURN TO NORMAL', target.label);
      }
    };
    window.addEventListener('sas:alarm-audio', onLocal);
    return () => window.removeEventListener('sas:alarm-audio', onLocal);
  }, [append]);

  useEffect(() => {
    if (!enabled || muted) { stop(); return; }
    if (hornRank) { play(soundFor(hornRank), true); setMessage('Unacknowledged alarm · horn active'); }
    else { stop(); }
    return () => stop();
  }, [enabled, muted, hornRank, play, stop]);
  const activate = () => {
    if (enabled) { enabledRef.current = false; setEnabled(false); stop(); setMessage('Sound disabled'); return; }
    enabledRef.current = true; mutedRef.current = false;
    setEnabled(true); setMuted(false);
    const audio = new Audio(URLS.ack); audio.volume = 0.18;
    void audio.play().catch(() => setMessage('Allow sound in browser settings'));
    setMessage('Audible annunciator enabled');
  };
  const silence = () => { hornRef.current = true; setHornSilenced(true); stop(); append('HORN SILENCE', 'Operator silenced horn; alarms remain active'); setMessage('Horn silenced; visual alarms remain active'); };
  const ackOne = (a: Entry) => {
    if (a.state !== 'ACTIVE_UNACK') return;
    if (a.source === 'station') acknowledgeAlarm(a.id);
    else { setLocal(old => old.map(x => x.id === a.id ? { ...x, state: 'ACTIVE_ACK' } : x)); append('ACK', a.label); }
    if (enabled && !muted) play('ack');
  };
  const ackAll = () => {
    acknowledgeAllAlarms();
    setLocal(old => old.map(a => a.state === 'ACTIVE_UNACK' ? { ...a, state: 'ACTIVE_ACK' } : a));
    append('ACK ALL', `${unack.length} unacknowledged alarms`);
    if (enabled && !muted) play('ack');
  };
  const reset = () => {
    // Reset never clears an active process fault. Only returned-to-normal entries are removable.
    const count = entries.filter(a => a.state === 'CLEARED').length;
    clearClearedAlarms(); setLocal(old => old.filter(a => a.state !== 'CLEARED'));
    if (active.length === 0) { firstOutRef.current = null; setFirstOut(null); }
    append('RESET', `${count} cleared indications reset; ${active.length} active retained`);
    setMessage(active.length ? 'Active alarms retained; reset cleared lamps only' : 'Annunciator reset');
  };
  const prevUnack = useRef(0);
  useEffect(() => {
    if (!initialized.current) return;
    if (prevUnack.current > 0 && unack.length === 0 && enabled && !muted) play('ack');
    prevUnack.current = unack.length;
  }, [unack.length, enabled, muted, play]);
  const previousCleared = useRef(0);
  useEffect(() => {
    const count = entries.filter(a => a.state === 'CLEARED').length;
    if (count > previousCleared.current && topRank === 0 && enabled && !muted) play('clear');
    previousCleared.current = count;
  }, [entries, topRank, enabled, muted, play]);
  return <>
    {!expanded && <button type="button" aria-label={`Open SCADA annunciator, ${unack.length} unacknowledged alarms`} title={`SCADA Annunciator · ${active.length} active alarms`} onClick={() => setExpanded(true)} style={{ position: 'fixed', right: 19, bottom: 84, zIndex: 9999, width: 54, height: 54, borderRadius: '50%', border: `2px solid ${unack.length ? '#ff5965' : '#00cfff'}`, background: '#06243a', color: unack.length ? '#ff5965' : '#00e5ff', boxShadow: '0 5px 20px #000a, 0 0 14px #00cfff44', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, animation: unack.length ? 'sasAnnBubblePulse 1.2s ease-in-out infinite' : 'none' }}>
      <span aria-hidden="true">🔔</span>
      {active.length > 0 && <span style={{ position: 'absolute', top: -5, right: -7, background: '#ff5965', color: '#fff', borderRadius: 12, padding: '1px 5px', fontSize: 10, fontWeight: 800, minWidth: 17 }}>{active.length}</span>}
    </button>}
    <style>{`@keyframes sasAnnBubblePulse{0%,100%{box-shadow:0 5px 20px #000a,0 0 8px #ff596566}50%{box-shadow:0 5px 20px #000a,0 0 22px #ff5965bb}}`}</style>
    {expanded && <div aria-label="SCADA training annunciator" style={{ position: 'fixed', right: 16, bottom: 84, zIndex: 9999, width: 'min(440px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 110px)', overflowY: 'auto', background: '#061b30', border: '1px solid #00cfff', borderRadius: 12, color: '#e5f8ff', boxShadow: '0 4px 22px #000b', fontSize: 11, padding: 11 }}>
    <style>{`@keyframes sasAnnFlash{0%,49%{opacity:1}50%,100%{opacity:.25}}`}</style>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
      <strong style={{ color: '#00e5ff', fontSize: 12 }}>SCADA ANNUNCIATOR</strong>
      <button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} style={btn}>{expanded ? 'Collapse' : 'Open Panel'}</button>
    </div>
    <div style={{ display: 'flex', gap: 7, margin: '8px 0', alignItems: 'center' }}>
      {(['CRITICAL', 'MAJOR', 'MINOR'] as const).map(sev => {
        const count = active.filter(a => sev === 'MINOR' ? rank(a.severity) === 1 : a.severity === sev).length;
        const blinking = unack.some(a => sev === 'MINOR' ? rank(a.severity) === 1 : a.severity === sev);
        const color = sev === 'CRITICAL' ? '#ff5965' : sev === 'MAJOR' ? '#ffb547' : '#e7d45b';
        return <div key={sev} title={`${sev} active: ${count}`} style={{ flex: 1, border: `1px solid ${color}`, borderRadius: 5, padding: '6px 3px', textAlign: 'center', background: count ? `${color}35` : '#0b2537', color, fontWeight: 800, animation: blinking ? 'sasAnnFlash 1s steps(1,end) infinite' : 'none' }}>{sev} {count}</div>;
      })}
    </div>
    <div style={{ color: '#d4e9f3', marginBottom: 7 }}>{unack.length} unacknowledged · {active.length} active · Horn {hornSilenced ? 'SILENCED' : hornRank ? 'ACTIVE' : 'IDLE'}</div>
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
      <button type="button" onClick={activate} style={btn}>{enabled ? 'Disable Sound' : 'Enable Sound'}</button>
      <button type="button" disabled={!enabled} onClick={() => { mutedRef.current = !muted; setMuted(!muted); if (!muted) stop(); }} style={btn}>{muted ? 'Unmute' : 'Mute'}</button>
      <button type="button" onClick={silence} style={btn}>Horn Silence</button>
      <button type="button" onClick={ackAll} disabled={!unack.length} style={btn}>ACK All</button>
      <button type="button" onClick={reset} style={btn}>Reset</button>
    </div>
    {firstOut && active.some(a => a.id === firstOut) && <div style={{ marginTop: 7, color: '#ffb547', fontWeight: 700 }}>FIRST OUT: {active.find(a => a.id === firstOut)?.label}</div>}
    {expanded && <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}><button type="button" onClick={() => setTab('active')} style={btn}>Alarm Lamps ({active.length})</button><button type="button" onClick={() => setTab('history')} style={btn}>SOE / History ({history.length})</button></div>
      <div style={{ maxHeight: 275, overflowY: 'auto', borderTop: '1px solid #28506a' }}>
        {tab === 'active' ? (active.length ? active.map(a => <div key={a.id} style={{ borderBottom: '1px solid #25465b', padding: '7px 2px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ width: 9, height: 9, flexShrink: 0, borderRadius: 2, background: rank(a.severity) >= 3 ? '#ff5965' : rank(a.severity) === 2 ? '#ffb547' : '#f2db63', animation: a.state === 'ACTIVE_UNACK' ? 'sasAnnFlash 1s steps(1,end) infinite' : 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}><strong>{a.label}</strong><div style={{ opacity: .75 }}>{a.severity} · {a.state === 'ACTIVE_ACK' ? 'ACKNOWLEDGED' : 'UNACKNOWLEDGED'} · {displayTime(a.timestamp)}</div></div>
          {a.state === 'ACTIVE_UNACK' && <button type="button" onClick={() => ackOne(a)} style={btn}>ACK</button>}
        </div>) : <div style={{ padding: 10, opacity: .7 }}>No active alarms</div>) : (history.length ? history.map(h => <div key={h.id} style={{ borderBottom: '1px solid #25465b', padding: '6px 2px' }}><strong>{h.event}</strong> · {h.label}<div style={{ opacity: .65 }}>{displayTime(h.timestamp)}</div></div>) : <div style={{ padding: 10, opacity: .7 }}>No recorded events in this session</div>)}
      </div>
      <div style={{ marginTop: 6, opacity: .7 }}>Training simulator · timestamps use browser time · history kept for this session</div>
    </div>}
    <div role="status" style={{ opacity: .7, marginTop: 6 }}>{message}</div>
  </div>}
  </>;
}
const btn: React.CSSProperties = { background: '#103c54', color: '#e5f8ff', border: '1px solid #3a7894', borderRadius: 5, padding: '5px 7px', cursor: 'pointer', fontSize: 11 };
