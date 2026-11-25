import React, { useEffect, useRef, useState } from 'react';

interface CompactArchitectureFrameProps {
  designWidth?: number;
  label?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Automatically scales wide substation architecture diagrams (e.g. 780px–1140px)
 * proportionally to fit Mobile & Tablet viewports without horizontal clipping,
 * matching SignalChainDashboard's Fit-to-Screen / 100% Zoom compact UX.
 */
export const CompactArchitectureFrame: React.FC<CompactArchitectureFrameProps> = ({
  designWidth = 1120,
  label = 'Architecture View',
  children,
  className = '',
}) => {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fitToScreen, setFitToScreen] = useState<boolean>(true);
  const [fitScale, setFitScale] = useState<number>(1);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);
  const [contentHeight, setContentHeight] = useState<number>(0);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer) return;

    const recalc = () => {
      const availW = Math.max(240, outer.clientWidth - 4);
      const compact = availW < designWidth;
      setIsCompactViewport(compact);
      const nextScale = compact && fitToScreen ? Math.max(0.24, Math.min(1, availW / designWidth)) : 1;
      setFitScale(nextScale);
      if (inner) {
        const h = inner.scrollHeight || inner.offsetHeight || 0;
        if (h > 0) setContentHeight(h);
      }
    };

    recalc();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(recalc) : null;
    if (ro) {
      ro.observe(outer);
      if (inner) ro.observe(inner);
    }
    window.addEventListener('resize', recalc);
    const t1 = window.setTimeout(recalc, 120);
    const t2 = window.setTimeout(recalc, 450);

    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', recalc);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [designWidth, fitToScreen]);

  const isScaled = isCompactViewport && fitToScreen && fitScale < 0.995;

  return (
    <div
      ref={outerRef}
      className={`sas-compact-arch-outer w-full min-w-0 relative ${
        isScaled ? 'overflow-hidden' : 'overflow-x-auto'
      } ${className}`}
    >
      {isCompactViewport && (
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 px-2 py-1.5 rounded-lg border border-cyan-500/35 bg-[#061c30]/90 text-[11px]">
          <span className="font-semibold text-cyan-200">
            {fitToScreen
              ? `${label} — Compact Fit (${Math.round(fitScale * 100)}%)`
              : `${label} — 100% Zoom (Swipe Left/Right)`}
          </span>
          <button
            type="button"
            onClick={() => setFitToScreen((v) => !v)}
            className="px-2.5 py-0.5 rounded border border-cyan-400/50 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-100 font-bold text-[10.5px] shrink-0"
          >
            {fitToScreen ? '100% Zoom' : 'Fit to Screen'}
          </button>
        </div>
      )}

      <div
        style={
          isScaled && contentHeight > 0
            ? { height: Math.ceil(contentHeight * fitScale), overflow: 'hidden', width: '100%' }
            : undefined
        }
      >
        <div
          ref={innerRef}
          className="sas-compact-arch-inner"
          style={
            isScaled
              ? {
                  width: designWidth,
                  transform: `scale(${fitScale})`,
                  transformOrigin: 'top left',
                }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
};
