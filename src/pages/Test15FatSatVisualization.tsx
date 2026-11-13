import { GuidanceStepDetail } from './GuidanceStepDetail';
import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Download,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
} from 'lucide-react';

interface Test15Props {
  initialDone?: boolean[];
  allChecked?: Record<string, boolean>;
  testSummaries?: { title: string; stepCount: number }[];
  onStepChange?: (index: number, checked: boolean) => void;
  onBackToAllTests?: () => void;
}

const TEST15_STEPS = [
  'Review completion of all previous test cases (T1–T14).',
  'Consolidate test reports, logs and screenshots.',
  'Verify and close punch points and defects.',
  'Perform final end-to-end system validation.',
  'Conduct client / utility joint SAT inspection.',
  'Obtain required approvals and handover documents.',
  'Back up configurations and finalize as-built data.',
  'Issue FAT / SAT completion and handover report.',
];

export function Test15FatSatVisualization({
  initialDone,
  allChecked = {},
  testSummaries = [],
  onStepChange,
  onBackToAllTests,
}: Test15Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'HMI' | 'INTERVIEW'>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: TEST15_STEPS.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Interactive Punch List (P-01..P-05)
  const [punches, setPunches] = useState([
    { id: 'P-01', desc: 'HMI Tag Label Correction', cat: 'HMI / SCADA', closed: true, evidence: 'Screenshot verified' },
    { id: 'P-02', desc: 'SOE Timestamp Format', cat: 'Time Sync', closed: true, evidence: 'UTC ms verified' },
    { id: 'P-03', desc: 'IED Event Text Mapping', cat: 'IEC 61850', closed: true, evidence: 'SCD Rev C matched' },
    { id: 'P-04', desc: 'IEC 104 Point Description', cat: 'Gateway', closed: true, evidence: 'IOA list signed' },
    { id: 'P-05', desc: 'SLD Graphic Alignment', cat: 'HMI', closed: false, evidence: '' },
  ]);
  const [reviewer, setReviewer] = useState('');
  const [handoverApproved, setHandoverApproved] = useState(false);

  useEffect(() => {
    if (initialDone) setDone(Array.from({ length: TEST15_STEPS.length }, (_, i) => !!initialDone[i]));
  }, [initialDone?.join('|')]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  // Derive real T1-T14 completion status from allChecked
  const coverageRows = Array.from({ length: 14 }, (_, idx) => {
    const info = testSummaries[idx] || { title: `Test ${idx + 1}`, stepCount: 7 };
    const completed = Array.from({ length: info.stepCount }, (_, s) => !!allChecked[`${idx}-${s}`]).filter(Boolean).length;
    const status =
      completed === 0
        ? 'Not Started'
        : completed >= info.stepCount
        ? 'Passed'
        : `In Progress (${completed}/${info.stepCount})`;
    return { no: `T${idx + 1}`, area: info.title, status };
  });

  const allPunchesClosed = punches.every((p) => p.closed);
  const canCompleteHandover = allPunchesClosed && reviewer.trim().length > 0;

  return (
    <div
      ref={containerRef}
      style={{
        background: 'radial-gradient(circle at 50% 0%, #092C48 0%, #061B30 48%, #03101F 100%)',
        color: '#F1F7FF',
        border: '1.5px solid #00DFFF',
        borderRadius: isFullscreen ? 0 : 12,
        padding: isFullscreen ? '12px 16px' : '10px 14px',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        width: '100%',
        minHeight: isFullscreen ? '100vh' : undefined,
        boxSizing: 'border-box',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, paddingBottom: 7, marginBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
          <span style={{ width: 25, height: 25, borderRadius: '50%', background: '#06263E', border: '1.5px solid #00DFFF', display: 'grid', placeItems: 'center', color: '#FFC400' }}>⚡</span>
          <button type="button" onClick={onBackToAllTests} style={{ background: 'transparent', border: 'none', color: '#F1F7FF', fontWeight: 700, fontSize: 14.5, cursor: 'pointer', padding: 0 }}>
            Testing Guidance
          </button>
          <span style={{ color: '#68A8C8' }}>›</span>
          <span style={{ color: '#00DFFF', fontWeight: 800 }}>FAT / SAT – TEST 15</span>
        </div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {onBackToAllTests && (
            <button type="button" onClick={onBackToAllTests} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, border: '1px solid #00DFFF', background: '#072238', color: '#D6F2FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              <ArrowLeft size={13} /> Back to All Tests
            </button>
          )}
          <button type="button" onClick={toggleFullscreen} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F7FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />} {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>
          <button type="button" onClick={() => window.print()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 6, border: '1px solid #1E6E91', background: '#08283D', color: '#F1F7FF', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={13} /> Export Report (PDF)
          </button>
          <button
            type="button"
            onClick={() => {
              const all = done.every(Boolean);
              const next = Array(TEST15_STEPS.length).fill(!all);
              setDone(next);
              next.forEach((v, i) => onStepChange?.(i, v));
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 13px', borderRadius: 6, border: '1.5px solid #00FF70', background: '#094E2B', color: '#F1F7FF', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF70' }} /> {done.every(Boolean) ? 'Completed (8/8)' : 'Mark as Complete'}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 9, paddingBottom: 8, borderBottom: '1px solid rgba(0,223,255,0.25)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>FAT / SAT Final Acceptance and Handover</h1>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9CCBE4' }}>Close test evidence and project punch points.</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['PROCEDURE', 'VISUALIZATION', 'SIGNALS', 'HMI', 'INTERVIEW'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setActiveTab(t)} style={{ padding: '6px 12px', borderRadius: 7, border: activeTab === t ? '1.5px solid #80F5FF' : '1px solid #1C6588', background: activeTab === t ? '#1CEBFF' : '#08283D', color: activeTab === t ? '#011627' : '#D8F3FF', fontSize: 12, fontWeight: activeTab === t ? 800 : 600, cursor: 'pointer' }}>
              {t === 'PROCEDURE' ? 'Test Procedure' : t === 'VISUALIZATION' ? 'Visualization' : t === 'SIGNALS' ? 'IED Signals' : t === 'HMI' ? 'HMI/SCADA' : 'Interview Focus'}
            </button>
          ))}
        </div>
      </div>

      <div className="sas-t15-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(255px, 23.5%) minmax(0, 1fr)', gap: 10 }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><ClipboardList size={14} style={{ color: '#00DFFF' }} /> Before you start</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Approved FAT/SAT test plan &amp; acceptance criteria</div>
            <div><span style={{ color: '#00FF70' }}>●</span> Test 1–14 reports &amp; punch-point register</div>
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '6px 10px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 12.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ListChecks size={14} style={{ color: '#00DFFF' }} /> Step-by-step test process</span>
              <span style={{ color: '#00FF70', fontSize: 10.5 }}>{done.filter(Boolean).length}/8</span>
            </div>
            <div style={{ padding: 7, display: 'grid', gap: 3.5 }}>
              {TEST15_STEPS.map((txt, idx) => {
                const isDone = done[idx];
                const isSel = activeStep === idx;
                return (
                  <React.Fragment key={idx}>
                  <div key={idx} onClick={() => setActiveStep(idx)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 7px', borderRadius: 6, border: isSel ? '1.5px solid #00DFFF' : '1px solid rgba(30,102,138,0.6)', background: isSel ? 'rgba(0,185,220,0.24)' : '#071B2E', cursor: 'pointer', fontSize: 11 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDone((p) => {
                          const next = p.map((v, i) => (i === idx ? !v : v));
                          onStepChange?.(idx, next[idx]);
                          return next;
                        });
                      }}
                      style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, display: 'grid', placeItems: 'center', border: isDone ? '1.5px solid #00FF70' : '1.5px solid #4A7A96', background: isDone ? '#00FF70' : '#051525', color: '#01200B', fontWeight: 900, fontSize: 11, cursor: 'pointer', padding: 0 }}
                    >
                      {isDone ? '✓' : ''}
                    </button>
                    <span><strong style={{ color: isDone ? '#00FF70' : '#00DFFF', marginRight: 4 }}>{idx + 1}.</strong>{txt}</span>
                  </div>
                  {activeStep === idx && <GuidanceStepDetail number={idx + 1} step={txt} testTitle="FAT / SAT Final Acceptance" />}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          <section style={{ background: '#052920', border: '1.5px solid #00FF70', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>✓ Expected result</div>
            All mandatory tests pass, punch points are closed, configuration backups are verified, and client approves handover.
          </section>

          <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '7px 10px', fontSize: 11 }}>
            <div style={{ fontWeight: 800, marginBottom: 3 }}>🎓 Interview focus</div>
            FAT vs SAT, punch-point closure, as-built drawings, and configuration backup control.
          </section>
        </aside>

        <main style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
          {/* SAS Architecture */}
          <section style={{ background: '#061B30', border: '1.5px solid #00DFFF', borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid rgba(0,223,255,0.3)', fontSize: 13.5, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
              <Monitor size={15} style={{ color: '#00DFFF' }} /> Visualization – FAT / SAT Final Acceptance and Handover
            </div>
            <div style={{ padding: '8px 10px', overflowX: 'auto' }}>
              <svg viewBox="0 0 900 175" style={{ width: '100%', minWidth: 720, height: 168 }}>
                {/* Area 1: Field IEDs */}
                <g transform="translate(8, 8)">
                  <rect x="0" y="0" width="170" height="158" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="85" y="16" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">Field IEDs (IEC 61850)</text>
                  <image href="/assets/devices/siemens-siprotec-5.png" x="10" y="22" width="42" height="38" preserveAspectRatio="xMidYMid meet" />
                  <text x="58" y="42" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Siemens SIPROTEC 5</text>
                  <image href="/assets/devices/abb-relion-ref615.png" x="10" y="66" width="42" height="38" preserveAspectRatio="xMidYMid meet" />
                  <text x="58" y="86" fill="#F1F7FF" fontSize="8.5" fontWeight="700">ABB REF615</text>
                  <image href="/assets/ieds/schneider-c264.webp" x="10" y="110" width="42" height="38" preserveAspectRatio="xMidYMid meet" />
                  <text x="58" y="130" fill="#F1F7FF" fontSize="8.5" fontWeight="700">Schneider MiCOM C264</text>
                </g>

                <line x1="180" y1="86" x2="225" y2="86" stroke="#00DFFF" strokeWidth="2.8" />

                {/* Area 2 & 3: Engineering & SCADA + Switches */}
                <g transform="translate(228, 8)">
                  <rect x="0" y="0" width="430" height="158" rx="7" fill="#041423" stroke="#00DFFF" />
                  <text x="215" y="16" textAnchor="middle" fill="#00DFFF" fontSize="9.5" fontWeight="800">Substation Automation System (SAS)</text>
                  <image href="/assets/devices/engineering-workstation.jpg" x="20" y="24" width="175" height="62" preserveAspectRatio="xMidYMid slice" />
                  <text x="107" y="98" textAnchor="middle" fill="#F1F7FF" fontSize="8">SAS Engineering Workstation</text>
                  <image href="/assets/devices/scada-workstation.png" x="235" y="24" width="175" height="62" preserveAspectRatio="xMidYMid slice" />
                  <text x="322" y="98" textAnchor="middle" fill="#F1F7FF" fontSize="8">SCADA / HMI Operator Station</text>

                  <image href="/assets/devices/industrial-ethernet-switch.png" x="45" y="106" width="125" height="34" preserveAspectRatio="xMidYMid meet" />
                  <text x="107" y="150" textAnchor="middle" fill="#9CCBE4" fontSize="7.5">Hirschmann LAN-A</text>
                  <image href="/assets/devices/industrial-ethernet-switch.png" x="260" y="106" width="125" height="34" preserveAspectRatio="xMidYMid meet" />
                  <text x="322" y="150" textAnchor="middle" fill="#9CCBE4" fontSize="7.5">Hirschmann LAN-B</text>
                </g>

                <line x1="660" y1="86" x2="695" y2="86" stroke="#00FF70" strokeWidth="2.8" />

                {/* Area 5: Server Room */}
                <g transform="translate(698, 8)">
                  <rect x="0" y="0" width="194" height="158" rx="7" fill="#041423" stroke="#00FF70" />
                  <text x="97" y="16" textAnchor="middle" fill="#00FF70" fontSize="9.5" fontWeight="800">Server Room (SAS)</text>
                  <image href="/assets/devices/scada-server.jpg" x="14" y="24" width="166" height="58" preserveAspectRatio="xMidYMid slice" />
                  <text x="14" y="98" fill="#00FF70" fontSize="8">✔ Redundant SCADA &amp; Historian</text>
                  <text x="14" y="112" fill="#00FF70" fontSize="8">✔ Time Server (SNTP/PTP)</text>
                  <text x="14" y="126" fill="#00FF70" fontSize="8">✔ IEC 104 Gateway to RCC</text>
                  <text x="14" y="140" fill="#00DFFF" fontSize="8">✔ Backups &amp; As-Built Ready</text>
                </g>
              </svg>
            </div>
          </section>

          {/* MIDDLE ROW: Real Test Coverage + Interactive Punch List + Handover Gate */}
          <div className="sas-t15-mid" style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr 1fr', gap: 8 }}>
            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10, maxHeight: 195, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Test Coverage Summary (T1–T14)</div>
              {coverageRows.map((r) => (
                <div key={r.no} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span><strong>{r.no}</strong> {r.area}</span>
                  <strong style={{ color: r.status === 'Passed' ? '#00FF70' : r.status.startsWith('In') ? '#FFBF00' : '#9CCBE4' }}>
                    {r.status}
                  </strong>
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10, maxHeight: 195, overflowY: 'auto' }}>
              <div style={{ fontWeight: 800, color: '#00DFFF', marginBottom: 4 }}>Punch List / Defect Closure</div>
              {punches.map((p, idx) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, padding: '3.5px 0', borderTop: '1px solid rgba(25,85,118,0.4)' }}>
                  <span><strong>{p.id}:</strong> {p.desc}</span>
                  {p.closed ? (
                    <span style={{ color: '#00FF70', fontWeight: 800 }}>✔ CLOSED</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setPunches((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, closed: true, evidence: 'Verified in SAT' } : item))
                        )
                      }
                      style={{ padding: '2px 7px', borderRadius: 4, border: '1px solid #FFBF00', background: '#2A2208', color: '#FFBF00', fontSize: 9.5, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Close w/ Evidence
                    </button>
                  )}
                </div>
              ))}
            </section>

            <section style={{ background: '#061B30', border: '1px solid #00DFFF', borderRadius: 8, padding: '8px 10px', fontSize: 10.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontWeight: 800, color: '#00DFFF' }}>FAT / SAT Outcome &amp; Handover</div>
              <label style={{ fontSize: 10, color: '#9CCBE4' }}>
                Client / Utility Reviewer:
                <input
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="Enter reviewer name..."
                  style={{ width: '100%', marginTop: 3, padding: '4px 6px', borderRadius: 4, border: '1px solid #1C6588', background: '#041423', color: '#F1F7FF', fontSize: 10.5 }}
                />
              </label>
              <button
                type="button"
                disabled={!canCompleteHandover}
                onClick={() => setHandoverApproved(true)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 5,
                  border: canCompleteHandover ? '1.5px solid #00FF70' : '1px solid #355873',
                  background: handoverApproved ? '#095B30' : canCompleteHandover ? '#063322' : '#081A2A',
                  color: canCompleteHandover ? '#00FF70' : '#6A8BA3',
                  fontWeight: 800,
                  fontSize: 10.5,
                  cursor: canCompleteHandover ? 'pointer' : 'not-allowed',
                }}
              >
                {handoverApproved
                  ? '✔ FINAL HANDOVER APPROVED'
                  : canCompleteHandover
                  ? 'Complete Final Handover'
                  : 'Close Punch Points & Enter Reviewer'}
              </button>
            </section>
          </div>
        </main>
      </div>

      <style>{`
        @media (max-width: 1120px) {
          .sas-t15-grid, .sas-t15-mid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

export default Test15FatSatVisualization;
