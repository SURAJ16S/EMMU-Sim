import React from 'react';
import { useSimulator } from '../../SimulatorContext';

export default function MemoryVisualizer() {
  const { CFG, MEM, COMPACT, setCOMPACT, deallocProcess, finishCompaction } = useSimulator();

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>Physical Memory (RAM)</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-blue">0 — {CFG.totalMem} KB</span>
            {COMPACT.active && (
              <span className="step-indicator">
                <span className="step-dot"></span>
                Compaction in progress…
              </span>
            )}
          </div>
        </div>
        <div className="card-body">
          <div id="mem-bar">
            {MEM.segments.map((seg, i) => {
              const width = (seg.size / CFG.totalMem) * 100 + '%';
              if (seg.isHole) {
                return (
                  <div key={i} className="mb-seg hole" style={{ width }} title={`Free hole: ${seg.size}KB @ ${seg.start}KB`}>
                    <span>FREE<br />{seg.size}KB</span>
                  </div>
                );
              }
              const proc = MEM.processes.find(p => p.pid === seg.pid);
              return (
                <div key={i} className="mb-seg allocated" style={{ width, background: proc?.color.bg }}
                  title={`${seg.pid}: ${seg.size}KB (${seg.start}–${seg.start + seg.size - 1}KB) — click to free`}
                  onClick={() => deallocProcess(seg.pid)}>
                  <span className="seg-pid">{seg.pid}</span>
                  <span className="seg-size">{seg.size}KB</span>
                  <span className="seg-addr">{seg.start}K</span>
                </div>
              );
            })}
          </div>
          <div id="mem-ruler">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="ruler-tick" style={{ left: (i / 8) * 100 + '%' }}>
                {Math.round((CFG.totalMem / 8) * i)}K
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: 'var(--text2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'var(--c0)' }}></div> Allocated
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'repeating-linear-gradient(-45deg,#f0ede8 0,#f0ede8 3px,#e8e4dc 3px,#e8e4dc 6px)', border: '1px solid var(--border2)' }}></div> Free (Hole)
            </div>
          </div>
        </div>
      </div>

      {COMPACT.active && (
        <div className="card">
          <div className="card-header">
            <h2>⊞ Compaction Steps</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="step-indicator"><span className="step-dot"></span>Step {COMPACT.stepIdx + 1} / {COMPACT.steps.length}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setCOMPACT(p => ({ ...p, stepIdx: Math.max(0, p.stepIdx - 1) }))} disabled={COMPACT.stepIdx === 0}>← Prev</button>
              <button className="btn btn-primary btn-sm" onClick={() => setCOMPACT(p => ({ ...p, stepIdx: Math.min(p.steps.length - 1, p.stepIdx + 1) }))} disabled={COMPACT.stepIdx >= COMPACT.steps.length - 1}>Next →</button>
              <button className="btn btn-danger btn-sm" onClick={finishCompaction}>✓ Apply</button>
            </div>
          </div>
          <div className="card-body">
            <div style={{ height: '56px', display: 'flex', borderRadius: '7px', overflow: 'hidden', border: '1px solid var(--border2)' }}>
              {COMPACT.steps[COMPACT.stepIdx].map((seg, i) => {
                const width = (seg.size / CFG.totalMem) * 100 + '%';
                if (seg.isHole) {
                  return (
                    <div key={i} style={{ width, background: 'repeating-linear-gradient(-45deg,#f0ede8 0,#f0ede8 5px,#e8e4dc 5px,#e8e4dc 10px)', borderRight: '1px solid #d0cbc0', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                      <span style={{ fontSize: '9px', color: '#9c9690', fontFamily: 'monospace' }}>FREE<br />{seg.size}KB</span>
                    </div>
                  );
                }
                const proc = MEM.processes.find(p => p.pid === seg.pid);
                return (
                  <div key={i} className="compact-move" style={{ width, background: proc ? proc.color.bg : '#aaa', borderRight: '1px solid rgba(255,255,255,.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#fff' }}>{seg.pid}</span>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,.8)' }}>{seg.size}KB</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
