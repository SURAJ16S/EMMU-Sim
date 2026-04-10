import React, { useState } from 'react';
import { useSimulator } from '../SimulatorContext';

export default function ReplacementModule() {
  const { PR, setPR, runPR, stepPR, resetPR } = useSimulator();
  
  // Local inputs moved from Sidebar
  const [nFrames, setNFrames] = useState(3);
  const [refStr, setRefStr] = useState('7,0,1,2,0,3,0,4,2,3');

  const faults = PR.results.filter(r => r.fault).length;
  const hits = PR.results.filter(r => !r.fault).length;
  const rate = PR.results.length ? Math.round((hits / PR.results.length) * 100) : null;

  return (
    <>
      <style>{`
        @keyframes fadeInUppr {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes flashPulsepr {
          0% { background-color: var(--accent); color: white; }
          100% { }
        }
        @keyframes popIn {
          from { transform: translateY(-50%) scale(0); opacity: 0; }
          to { transform: translateY(-50%) scale(1); opacity: 1; }
        }
      `}</style>
      
      <section id="mod-replacement" className="module-section active fade-in">
        <div className="mod-split">
          <div className="mod-main">
            <div>
              <h2 style={{ fontSize: '20px' }}>🔄 Page Replacement Algorithms</h2>
              <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
                Simulate FIFO, Optimal, and LRU to see how memory manages page faults.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
              <div className="stat-pill">
                <div className="stat-val" style={{ fontSize: '15px', color: 'var(--accent)' }}>{PR.algo.toUpperCase()}</div>
                <div className="stat-lbl">Algo</div>
              </div>
              <div className="stat-pill">
                <div className="stat-val" style={{ color: 'var(--red)' }}>{faults}</div>
                <div className="stat-lbl">Faults</div>
              </div>
              <div className="stat-pill">
                <div className="stat-val" style={{ color: 'var(--green)' }}>{hits}</div>
                <div className="stat-lbl">Hits</div>
              </div>
              <div className="stat-pill">
                <div className="stat-val" style={{ color: 'var(--amber)' }}>{rate !== null ? rate + '%' : '—'}</div>
                <div className="stat-lbl">Hit Rate</div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Reference String</h2>
                {PR.computed && (
                  <span className="step-indicator">
                    <span className="step-dot"></span>
                    {PR.step} / {PR.results.length}
                  </span>
                )}
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
                  {!PR.computed && <p style={{ color: 'var(--text3)', fontSize: '12px' }}>Configure on the right and press Run.</p>}
                  {PR.computed && PR.refStr.map((p, i) => {
                    let cls = '';
                    if (i < PR.step) cls = PR.results[i].fault ? 'fault-lbl' : 'hit-lbl';
                    return <div key={i} className={`pr-ref-label ${cls}`}>{p}</div>;
                  })}
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Frame State at Step {PR.step}</h2>
                {PR.computed && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setPR(p => ({ ...p, step: Math.max(1, p.step - 1) }))} disabled={PR.step <= 1}>← Prev</button>
                    <button className="btn btn-primary btn-sm" onClick={() => setPR(p => ({ ...p, step: Math.min(p.results.length, p.step + 1) }))} disabled={PR.step >= PR.results.length}>Next →</button>
                  </div>
                )}
              </div>
              <div className="card-body" style={{ overflowX: 'auto' }}>
                <div style={{ minHeight: '120px', padding: '10px 0' }}>
                  {!PR.computed && <p style={{ color: 'var(--text3)', fontSize: '12px' }}>Enter a string and frames to see the visualization.</p>}
                  {PR.computed && (
                    <div className="pr-grid" style={{ paddingTop: '30px', paddingBottom: '20px' }}>
                      <div className="pr-col" style={{ paddingTop: '45px' }}>
                        {Array.from({ length: PR.nFrames }).map((_, f) => (
                          <div key={f} style={{ width: '32px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text3)', fontFamily: '"DM Mono",monospace' }}>F{f}</div>
                        ))}
                      </div>
                      {PR.results.slice(0, PR.step).map((r, i) => {
                        const cur = i === PR.step - 1;
                        let changedFrameIdx = -1;
                        if (cur) {
                          if (!r.fault) {
                            changedFrameIdx = r.frames.indexOf(r.page);
                          } else {
                            const prevFrames = i > 0 ? PR.results[i-1].frames : [];
                            for (let f = 0; f < PR.nFrames; f++) {
                              if (r.frames[f] !== prevFrames[f]) { changedFrameIdx = f; break; }
                            }
                            if (changedFrameIdx === -1) changedFrameIdx = r.frames.indexOf(r.page);
                          }
                        }

                        return (
                          <div key={i} className={`pr-col ${cur ? 'current' : ''}`} style={{ 
                            position: 'relative', 
                            animation: cur ? 'fadeInUppr 0.3s ease-out forwards' : 'none' 
                          }}>
                            {cur && changedFrameIdx !== -1 && (
                              <div style={{ 
                                position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', 
                                zIndex: 2, color: r.fault ? 'var(--red)' : 'var(--green)',
                                display: 'flex', flexDirection: 'column', alignItems: 'center'
                              }}>
                                <div style={{ height: (changedFrameIdx * 42) + 12 + 'px', width: '2px', background: 'currentColor', opacity: 0.4 }}></div>
                                <div style={{ width: 0, height: 0, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '6px solid currentColor' }}></div>
                              </div>
                            )}

                            <div className={`pr-ref-label ${r.fault ? 'fault-lbl' : 'hit-lbl'}`} style={cur ? { transform: 'scale(1.15)', boxShadow: '0 4px 12px rgba(0,0,0,.1) text-shadow:none', zIndex: 3 } : {}}>{r.page}</div>
                            
                            {Array.from({ length: PR.nFrames }).map((_, f) => {
                              const val = r.frames[f];
                              let cls = 'pr-cell';
                              const isTarget = cur && f === changedFrameIdx;
                              if (val === undefined) cls += ' empty';
                              else if (!r.fault && val === r.page) cls += ' hit-c';
                              else if (r.fault && val === r.page) cls += ' fault-c';
                              
                              return (
                                <div key={f} className={cls} style={isTarget ? { animation: 'flashPulsepr 0.5s ease-out', boxShadow: `0 0 0 2px ${r.fault ? 'var(--red)' : 'var(--green)'}`, zIndex: 1 } : {}}>
                                  {val !== undefined ? val : ''}
                                  {cur && r.fault && r.evicted !== null && isTarget && (
                                    <div className="pr-eviction-badge" title={`Evicted ${r.evicted}`}>✕</div>
                                  )}
                                </div>
                              );
                            })}
                            <div className={`pr-status ${r.fault ? 'f' : 'h'}`} style={{ fontWeight: 700 }}>{r.fault ? 'FAULT' : 'HIT'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {PR.computed && PR.step > 0 && (
              <div style={{ padding: '16px 20px', background: 'var(--blue-light)', borderRadius: '12px', borderLeft: '4px solid var(--accent)', animation: 'fadeInUppr 0.3s ease-out' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>Simulation Step {PR.step} Summary</div>
                  {(() => {
                    const r = PR.results[PR.step - 1];
                    const page = r.page;
                    const isHit = !r.fault;
                    return (
                      <>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text3)', minWidth: '100px' }}>• Asking for:</span>
                          <span style={{ fontWeight: 600 }}>Page {page}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text3)', minWidth: '100px' }}>• Status:</span>
                          <span>{isHit ? `Page ${page} is already in the list.` : (r.evicted !== null ? 'All spaces are full.' : 'Found an empty space.')}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                          <span style={{ color: 'var(--text3)', minWidth: '100px' }}>• What happened:</span>
                          <span style={{ color: isHit ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
                            {isHit ? 'It was a HIT (Found)' : (r.evicted !== null ? `It was a FAULT — Removed Page ${r.evicted}` : 'It was a FAULT — Put in empty spot')}
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="mod-side">
            <div className="card mod-side-card">
              <div className="card-header">
                <h2>Simulator Setup</h2>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <div>
                    <label className="lbl">Number of Frames</label>
                    <input type="number" className="inp" value={nFrames} onChange={e => setNFrames(parseInt(e.target.value) || 1)} min="1" max="10" />
                  </div>
                  <div>
                    <label className="lbl">Reference String</label>
                    <input type="text" className="inp" value={refStr} onChange={e => setRefStr(e.target.value)} placeholder="e.g. 7,0,1,2,0,3" />
                  </div>
                  <div>
                    <label className="lbl">Select Algorithm</label>
                    <div className="algo-tabs">
                      {Object.entries({ fifo: 'FIFO', optimal: 'OPT', lru: 'LRU' }).map(([val, lbl]) => (
                        <div key={val} className={`algo-tab ${PR.algo === val ? 'active' : ''}`} onClick={() => setPR(p => ({ ...p, algo: val }))}>{lbl}</div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '5px' }}>
                    <button className="btn btn-primary" onClick={() => runPR(refStr, nFrames, PR.algo)} style={{ flex: 1, justifyContent: 'center' }}>▶ Run All</button>
                    <button className="btn btn-secondary" onClick={() => stepPR(refStr, nFrames, PR.algo)} style={{ flex: 1, justifyContent: 'center' }}>▸ Step By Step</button>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={resetPR} style={{ justifyContent: 'center' }}>Reset Simulation</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
