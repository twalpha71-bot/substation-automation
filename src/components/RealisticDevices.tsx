import React from 'react';

interface Siprotec5Props {
  x: number;
  y: number;
  width?: number;
  height?: number;
  borderColor?: string;
  lcdLines: { text: string; color?: string; bold?: boolean }[];
  label?: string;
  subLabel?: string;
  onClick?: () => void;
}

/**
 * Realistic Siemens SIPROTEC 5 Protection IED using the project's real hardware asset
 * (`./assets/devices/siemens-siprotec-5.png`) paired with a live interactive LCD overlay.
 */
export function RealisticSiprotec5({
  x,
  y,
  width = 148,
  height = 140,
  borderColor = '#00DFFF',
  lcdLines,
  label = 'IED – Siemens SIPROTEC 5',
  subLabel,
  onClick,
}: Siprotec5Props) {
  return (
    <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      {/* Outer Glow Frame */}
      <rect
        x="-2"
        y="-2"
        width={width + 4}
        height={height + 4}
        rx="8"
        fill="#071726"
        stroke={borderColor}
        strokeWidth="1.8"
      />
      {/* Real Siemens SIPROTEC 5 Photo */}
      <image
        href="/assets/devices/siemens-siprotec-5.png"
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        preserveAspectRatio="xMidYMid slice"
      />
      {/* Live Interactive LCD Screen Overlay positioned over the SIPROTEC 5 display */}
      <rect
        x={width * 0.42}
        y={height * 0.27}
        width={width * 0.44}
        height={height * 0.38}
        rx="2.5"
        fill="rgba(4, 18, 34, 0.94)"
        stroke="#00DFFF"
        strokeWidth="1"
      />
      {lcdLines.slice(0, 5).map((line, i) => (
        <text
          key={i}
          x={width * 0.445}
          y={height * 0.35 + i * (height * 0.072)}
          fill={line.color || '#F1F8FF'}
          fontSize={Math.max(6.2, width * 0.047)}
          fontWeight={line.bold ? '800' : '600'}
        >
          {line.text}
        </text>
      ))}
      {label && (
        <text
          x={width / 2}
          y={height + 15}
          textAnchor="middle"
          fill="#F1F8FF"
          fontSize="10"
          fontWeight="700"
        >
          {label}
        </text>
      )}
      {subLabel && (
        <text
          x={width / 2}
          y={height + 27}
          textAnchor="middle"
          fill="#9CCBE4"
          fontSize="8.8"
        >
          {subLabel}
        </text>
      )}
    </g>
  );
}

interface GatewayProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  variant?: 'GATEWAY' | 'SWITCH';
  healthy?: boolean;
  label?: string;
  subLabel?: string;
}

/**
 * Realistic Industrial Station Gateway or Ethernet Switch using real project hardware photos
 * (`./assets/devices/station-gateway.jpg` and `./assets/devices/industrial-ethernet-switch.png`).
 */
export function RealisticGatewayOrSwitch({
  x,
  y,
  width = 112,
  height = 96,
  variant = 'GATEWAY',
  healthy = true,
  label = 'Station Gateway',
  subLabel = '(IEC 61850 MMS)',
}: GatewayProps) {
  const imgSrc =
    variant === 'SWITCH'
      ? '/assets/devices/industrial-ethernet-switch.png'
      : '/assets/devices/station-gateway.jpg';

  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="-2"
        y="-2"
        width={width + 4}
        height={height + 4}
        rx="7"
        fill="#081A2A"
        stroke={healthy ? '#00DFFF' : '#FF354F'}
        strokeWidth="1.8"
      />
      <image
        href={imgSrc}
        x="2"
        y="2"
        width={width - 4}
        height={height - 4}
        preserveAspectRatio="xMidYMid meet"
      />
      {/* Live Status LED Pill */}
      <circle cx={width - 10} cy="10" r="4" fill={healthy ? '#00FF66' : '#FF354F'} />
      {label && (
        <text x={width / 2} y={height + 15} textAnchor="middle" fill="#F1F8FF" fontSize="10" fontWeight="700">
          {label}
        </text>
      )}
      {subLabel && (
        <text x={width / 2} y={height + 27} textAnchor="middle" fill="#9CCBE4" fontSize="8.8">
          {subLabel}
        </text>
      )}
    </g>
  );
}

export default function RealisticDevicesPreview() {
  return (
    <div style={{ background: '#020B17', minHeight: '100vh', padding: 24, display: 'grid', placeItems: 'center' }}>
      <svg viewBox="0 0 420 200" style={{ width: '100%', maxWidth: 520 }}>
        <RealisticSiprotec5
          x={20}
          y={16}
          lcdLines={[
            { text: 'SIEMENS SIPROTEC 5', color: '#A8CBE0' },
            { text: 'XCBR.Pos = CLOSED (2)', color: '#00FF66', bold: true },
            { text: 'MMS: Connected', color: '#00DFFF' },
          ]}
        />
        <RealisticGatewayOrSwitch x={230} y={24} variant="GATEWAY" />
      </svg>
    </div>
  );
}
