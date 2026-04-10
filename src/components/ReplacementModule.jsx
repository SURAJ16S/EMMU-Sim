import React from 'react';
import { useSimulator } from '../SimulatorContext';

export default function ReplacementModule() {
  const { PR } = useSimulator();

  const faults = PR.results.filter(r => r.fault).length;
  const hits = PR.results.filter(r => !r.fault).length;
  const rate = PR.results.length ? Math.round((hits / PR.results.length) * 100) : null;

  return (
    <section id="mod-replacement" className="module-section active fade-in">
      <div>
        <h2 style={{ fontSize: '20px' }}>🔄 Page Replacement Algorithms</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Simulate FIFO, Optimal, and LRU. Configure in the sidebar panel.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
        <div className="stat-pill">
          <div className="stat-val" style={{ fontSize: '16px', color: 'var(--accent)' }}>{PR.algo.toUpperCase()}</div>
          <div className="stat-lbl">Algorithm</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--red)' }}>{faults}</div>
          <div className="stat-lbl">Page Faults</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--green)' }}>{hits}</div>
          <div className="stat-lbl">Page Hits</div>
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
          <div id="pr-refstr-display" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '32px' }}>
            {!PR.computed && <p style={{ color: 'var(--text3)', fontSize: '12px' }}>Run or step through the simulation.</p>}
            {PR.computed && PR.refStr.map((p, i) => {
              let cls = '';
              if (i < PR.step) cls = PR.results[i].fault ? 'fault-lbl' : 'hit-lbl';
              return <div key={i} className={`pr-ref-label ${cls}`}>{p}</div>;
            })}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Frame State at Each Step</h2></div>
        <div className="card-body" style={{ overflowX: 'auto' }}>
          <div id="pr-sim-grid" style={{ minHeight: '80px' }}>
            {!PR.computed && <p style={{ color: 'var(--text3)', fontSize: '12px' }}>Configure settings in the sidebar and press Run or Step.</p>}
            {PR.computed && (
              <div className="pr-grid">
                <div className="pr-col" style={{ paddingTop: '36px' }}>
                  {Array.from({ length: PR.nFrames }).map((_, f) => (
                    <div key={f} style={{ width: '32px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text3)', fontFamily: '"DM Mono",monospace' }}>F{f}</div>
                  ))}
                </div>
                {PR.results.slice(0, PR.step).map((r, i) => {
                  const cur = i === PR.step - 1;
                  return (
                    <div key={i} className={`pr-col ${cur ? 'current' : ''}`}>
                      <div className={`pr-ref-label ${r.fault ? 'fault-lbl' : 'hit-lbl'}`} style={cur ? { transform: 'scale(1.08)', boxShadow: '0 2px 8px rgba(0,0,0,.12)' } : {}}>{r.page}</div>
                      {Array.from({ length: PR.nFrames }).map((_, f) => {
                        const val = r.frames[f];
                        let cls = 'pr-cell';
                        if (val === undefined) cls += ' empty';
                        else if (!r.fault && val === r.page) cls += ' hit-c';
                        else if (r.fault && val === r.page) cls += ' fault-c';
                        return <div key={f} className={cls}>{val !== undefined ? val : ''}</div>;
                      })}
                      <div className={`pr-status ${r.fault ? 'f' : 'h'}`}>{r.fault ? 'FAULT' : 'HIT'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
