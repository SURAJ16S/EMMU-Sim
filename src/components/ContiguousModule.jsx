import React from 'react';
import { useSimulator } from '../SimulatorContext';
import TranslationResult from './TranslationResult';

export default function ContiguousModule() {
  const { CFG, MEM, COMPACT, deallocProcess, swapOut, swapIn, sysLogs, startCompaction, finishCompaction, nextCompactStep, prevCompactStep } = useSimulator();

  const usedKB = MEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
  const freeKB = CFG.totalMem - usedKB;
  const util = Math.round((usedKB / CFG.totalMem) * 100);
  const holes = MEM.segments.filter(s => s.isHole);

  return (
    <section id="mod-contiguous" className="module-section active fade-in">
      <div>
        <h2 style={{ fontSize: '20px' }}>🧱 Contiguous Memory Allocation</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Dynamic partitioning with First/Best/Worst Fit. Click a block to deallocate.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        <div className="stat-pill">
          <div className="stat-val">{util}%</div>
          <div className="stat-lbl">Utilization</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--green)' }}>{freeKB}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Free Memory</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{holes.length}</div>
          <div className="stat-lbl">Free Holes</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--red)' }}>{freeKB}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Ext. Fragmentation</div>
        </div>
      </div>

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

      <TranslationResult moduleName="contiguous" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
        <div className="card">
          <div className="card-header"><h2>Active Processes</h2></div>
          <div style={{ overflow: 'auto', maxHeight: '260px' }}>
            <table className="proc-table">
              <thead>
                <tr><th>PID</th><th>Size</th><th>Start</th><th>End</th><th>Frames</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {MEM.processes.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: 'var(--text3)' }}>No active processes</td></tr>
                ) : (
                  MEM.processes.map(p => (
                    <tr key={p.pid}>
                      <td><span className="pid-badge" style={{ background: p.color.bg }}>{p.pid}</span></td>
                      <td>{p.size} KB</td>
                      <td><code>{p.start} KB</code></td>
                      <td><code>{p.end} KB</code></td>
                      <td><code style={{ fontSize: '10px' }}>F{p.frames.join(',F')}</code></td>
                      <td>
                        <button className="btn btn-sm btn-amber" onClick={() => swapOut(p.pid)}>↓ Disk</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deallocProcess(p.pid)} style={{ marginLeft: '4px' }}>✕</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>💾 Swap Queue (Disk)</h2>
            <span className="badge badge-amber">{MEM.swapQueue.length} processes</span>
          </div>
          <div className="card-body" style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {MEM.swapQueue.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No swapped processes</p>
            ) : (
              MEM.swapQueue.map(p => (
                <div key={p.pid} className="swap-item">
                  <div>
                    <strong style={{ fontSize: '13px' }}>{p.pid}</strong>
                    <span style={{ fontSize: '11px', color: 'var(--text2)', marginLeft: '6px' }}>{p.size} KB</span>
                  </div>
                  <button className="btn btn-sm btn-green" onClick={() => swapIn(p.pid)}>↑ Load</button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>System Log</h2></div>
        <div className="card-body">
          <div className="log-box" id="sys-log">
            {sysLogs.map((log, i) => (
              <div key={i} className={`log-${log.type}`}>{log.msg}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
