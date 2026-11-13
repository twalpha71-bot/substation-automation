import React from 'react';

/** Instructional guidance only. The existing test component owns all simulation state. */
export function GuidanceStepDetail({ number, step, testTitle }: { number: number; step: string; testTitle: string }) {
  const s = step.toLowerCase();
  const topic = /goose|publish|subscrib/.test(s) ? 'GOOSE publisher/subscriber status, dataset, stNum/sqNum and supervision' :
    /prp|hsr|lan|redundan|failover/.test(s) ? 'LAN A / LAN B or HSR ring paths, supervision and duplicate handling' :
    /mms|report|rcb|gi|asdu|ioa|iec.?104|startdt|testfr/.test(s) ? 'protocol association, point mapping, report/event values and timestamps' :
    /scl|icd|cid|scd|dataset/.test(s) ? 'SCL file versions, IED references, logical nodes and dataset consistency' :
    /time|sntp|ptp|clock|soe|event/.test(s) ? 'clock source, synchronization status, timestamp accuracy and SOE order' :
    /alarm|fault|acknowledge|restore/.test(s) ? 'alarm state, annunciation, acknowledgement, event history and restoration' :
    /sbo|select|operate|command|remote|local|interlock|permissive/.test(s) ? 'control authority, select/operate response, permissives and command feedback' :
    /modbus|opc|register|subscription/.test(s) ? 'register/node mapping, datatype, quality and client updates' :
    /analog|scal|value|measurement|engineering|unit/.test(s) ? 'raw input, scaling ratio, engineering units, quality and HMI value' :
    /mapping|signal|point|gateway/.test(s) ? 'source signal, IEC 61850 object, gateway mapping and destination display' :
    /breaker|52a|52b|xcb[r]?|position/.test(s) ? 'breaker auxiliary contacts, XCBR position, quality and HMI indication' :
    /evidence|record|handover|accept|punch|document/.test(s) ? 'test evidence, expected result, deviations, approvals and restoration records' :
    'configured equipment state, expected indication, quality and supporting test evidence';
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ margin: '3px 0 7px', padding: '10px 11px', border: '1px solid #00BFE5', borderRadius: 7, background: 'linear-gradient(140deg,#05243A,#041525)', color: '#DDF4FF', fontSize: 11, lineHeight: 1.55 }}>
      <div style={{ color: '#00E5FF', fontWeight: 800, marginBottom: 5 }}>Step {number}: {step}</div>
      <div><strong style={{ color: '#83E9FF' }}>What to do:</strong> {step} Use only the approved simulation or isolated test setup.</div>
      <div style={{ marginTop: 5 }}><strong style={{ color: '#83E9FF' }}>Verify:</strong> Check {topic}. Compare the observed result with the approved {testTitle} test procedure.</div>
      <div style={{ marginTop: 5 }}><strong style={{ color: '#83E9FF' }}>Record:</strong> Capture the observed value/state, quality, timestamp and pass/fail evidence. Mark complete only after verification.</div>
    </div>
  );
}
