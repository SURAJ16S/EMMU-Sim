import React from 'react';
import { useSimulator } from '../SimulatorContext';
import TranslationResult from './TranslationResult';

export default function PagingModule() {
  const { CFG, MEM } = useSimulator();

  const totalFrames = Math.ceil(CFG.totalMem / CFG.frameSize);
  const frameMap = {};
  for (const p of MEM.processes) {
    p.frames.forEach((f, i) => { frameMap[f] = { proc: p, pageIdx: i }; });
  }

  const usedFrames = Object.keys(frameMap).length;

  return (
    <section id="mod-paging" className="module-section active fade-in">
      <div>
        <h2 style={{ fontSize: '20px' }}>📄 Paging & Address Translation</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Physical memory divided into fixed-size frames. Logical address broken into Page# and Offset.</p>
      </div>

      <TranslationResult moduleName="paging" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
        <div className="card">
          <div className="card-header">
            <h2>Physical Frames</h2>
            <span className="badge badge-blue">{usedFrames} / {totalFrames} used</span>
          </div>
          <div className="card-body">
            <div className="frame-grid">
              {Array.from({ length: totalFrames }).map((_, f) => {
                const info = frameMap[f];
                if (info) {
                  return (
                    <div key={f} className="frame-cell used" style={{ borderColor: info.proc.color.bg + '80' }}>
                      <div className="fc-num">Frame {f}</div>
                      <div className="fc-pid" style={{ color: info.proc.color.bg }}>{info.proc.pid}</div>
                      <div className="fc-pg">page {info.pageIdx}</div>
                    </div>
                  );
                }
                return (
                  <div key={f} className="frame-cell">
                    <div className="fc-num">Frame {f}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text3)' }}>free</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Page Table</h2></div>
          <div className="card-body" style={{ maxHeight: '360px', overflowY: 'auto' }}>
            {MEM.processes.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: '12px' }}>Allocate processes to populate the page table.</p>
            ) : (
              <>
                <div className="pt-row">
                  <div className="pt-cell head">PID</div>
                  <div className="pt-cell head">Page #</div>
                  <div className="pt-cell head">Frame #</div>
                  <div className="pt-cell head">Physical KB</div>
                </div>
                {MEM.processes.map(p => (
                  p.frames.map((f, i) => (
                    <div key={`${p.pid}-${i}`} className="pt-row">
                      <div className="pt-cell" style={{ color: p.color.bg, fontWeight: 600 }}>{p.pid}</div>
                      <div className="pt-cell pg">{i}</div>
                      <div className="pt-cell fr">{f}</div>
                      <div className="pt-cell ph">{f * CFG.frameSize}</div>
                    </div>
                  ))
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
