import React, { useState } from 'react';
import { useSimulator } from '../SimulatorContext';

export default function Sidebar({ activeModule, setActiveModule }) {
  const { CFG, resetAll, MEM, setMEM, allocProcess, deallocAll, startCompaction, PR, setPR, runPR, stepPR, resetPR } = useSimulator();
  
  const [pid, setPid] = useState('P1');
  const [size, setSize] = useState(128);
  
  const [totMemStr, setTotMemStr] = useState(CFG.totalMem);
  const [fSizeStr, setFSizeStr] = useState(CFG.frameSize);

  const [nFrames, setNFrames] = useState(3);
  const [refStr, setRefStr] = useState('7,0,1,2,0,3,0,4,2,3');

  const bumpPid = () => {
    const m = pid.match(/^([A-Za-z]+)(\d+)$/);
    if (m) setPid(m[1] + (parseInt(m[2]) + 1));
  };

  const handleReset = () => {
    resetAll(parseInt(totMemStr), parseInt(fSizeStr));
  };

  const handleAlloc = () => {
    const swapped = allocProcess(pid, size);
    if (!swapped) bumpPid();
  };

  return (
    <aside id="sidebar">
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>MMU <span style={{ color: 'var(--accent)' }}>Simulator</span></h1>
        <p style={{ fontSize: '11px', color: 'var(--text3)' }}>Memory Management Unit — OS Lab</p>
      </div>

      <div className="module-nav" style={{ padding: '12px' }}>
        <p className="sb-label">Modules</p>
        <button className={`module-btn ${activeModule === 'contiguous' ? 'active' : ''}`} onClick={() => setActiveModule('contiguous')}>
          <div className="module-icon" style={{ background: '#eef2fc' }}>🧱</div>
          Contiguous Allocation
        </button>
        <button className={`module-btn ${activeModule === 'paging' ? 'active' : ''}`} onClick={() => setActiveModule('paging')}>
          <div className="module-icon" style={{ background: '#fef3e2' }}>📄</div>
          Paging & Address Translation
        </button>
        <button className={`module-btn ${activeModule === 'replacement' ? 'active' : ''}`} onClick={() => setActiveModule('replacement')}>
          <div className="module-icon" style={{ background: '#e8f5ef' }}>🔄</div>
          Page Replacement
        </button>
        <button className={`module-btn ${activeModule === 'analytics' ? 'active' : ''}`} onClick={() => setActiveModule('analytics')}>
          <div className="module-icon" style={{ background: '#fdecea' }}>📊</div>
          Analytics & Reports
        </button>
      </div>

      <hr className="divider" />

      <div className="sb-section">
        <p className="sb-label">System Configuration</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label className="lbl">Total Memory (KB)</label>
            <input type="number" className="inp" value={totMemStr} onChange={e => setTotMemStr(e.target.value)} min="64" max="8192" />
          </div>
          <div>
            <label className="lbl">Frame / Page Size (KB)</label>
            <input type="number" className="inp" value={fSizeStr} onChange={e => setFSizeStr(e.target.value)} min="4" max="512" />
          </div>
          <button className="btn btn-secondary" onClick={handleReset} style={{ width: '100%', justifyContent: 'center' }}>↺ Reset Everything</button>
        </div>
      </div>

      <hr className="divider" />

      {activeModule === 'contiguous' && (
        <div className="sb-section">
          <p className="sb-label">Allocation Algorithm</p>
          <div className="algo-tabs">
            {['first', 'best', 'worst'].map(alg => (
              <div key={alg} className={`algo-tab ${MEM.allocAlgo === alg ? 'active' : ''}`} onClick={() => setMEM(p => ({ ...p, allocAlgo: alg }))}>
                {alg.charAt(0).toUpperCase() + alg.slice(1)}
              </div>
            ))}
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '8px' }}>
            {MEM.allocAlgo === 'first' && <span>Allocate to the <strong>first</strong> hole that fits.</span>}
            {MEM.allocAlgo === 'best' && <span>Allocate to the hole that leaves the <strong>smallest</strong> leftover.</span>}
            {MEM.allocAlgo === 'worst' && <span>Allocate to the <strong>largest</strong> hole.</span>}
          </p>
          <hr className="divider" style={{ margin: '12px 0' }} />
          <p className="sb-label">Allocate Process</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label className="lbl">Process ID</label>
              <input type="text" className="inp" value={pid} onChange={e => setPid(e.target.value)} maxLength="8" />
            </div>
            <div>
              <label className="lbl">Size (KB)</label>
              <input type="number" className="inp" value={size} onChange={e => setSize(parseInt(e.target.value) || 0)} min="1" />
            </div>
            <button className="btn btn-primary" onClick={handleAlloc} style={{ justifyContent: 'center' }}>+ Allocate Process</button>
          </div>
          <hr className="divider" style={{ margin: '12px 0' }} />
          <p className="sb-label">Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="btn btn-amber" onClick={startCompaction} style={{ justifyContent: 'center' }}>⊞ Compact Memory</button>
            <button className="btn btn-danger" onClick={deallocAll} style={{ justifyContent: 'center' }}>✕ Deallocate All</button>
          </div>
        </div>
      )}

      {(activeModule === 'contiguous' || activeModule === 'paging') && (
        <div className="sb-section" id="sb-trans">
          <p className="sb-label">Address Translation</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label className="lbl">Logical Address (KB)</label>
              <input type="number" className="inp" id="inp-logical" defaultValue="200" min="0" />
            </div>
            <div>
              <label className="lbl">Relocation Register</label>
              <input type="number" className="inp" id="inp-reloc" defaultValue="0" min="0" />
            </div>
            <button className="btn btn-secondary" onClick={() => {
              const logical = parseInt(document.getElementById('inp-logical').value);
              const reloc = parseInt(document.getElementById('inp-reloc').value) || 0;
              window.dispatchEvent(new CustomEvent('translateAddr', { detail: { logical, reloc } }));
            }} style={{ justifyContent: 'center' }}>→ Translate</button>
          </div>
        </div>
      )}

      {activeModule === 'replacement' && (
        <div className="sb-section">
          <p className="sb-label">Page Replacement Setup</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <label className="lbl">Number of Frames</label>
              <input type="number" className="inp" value={nFrames} onChange={e => setNFrames(parseInt(e.target.value) || 1)} min="1" max="10" />
            </div>
            <div>
              <label className="lbl">Reference String (comma / space)</label>
              <input type="text" className="inp" value={refStr} onChange={e => setRefStr(e.target.value)} />
            </div>
            <div className="algo-tabs">
              {Object.entries({ fifo: 'FIFO', optimal: 'OPT', lru: 'LRU' }).map(([val, lbl]) => (
                <div key={val} className={`algo-tab ${PR.algo === val ? 'active' : ''}`} onClick={() => setPR(p => ({ ...p, algo: val }))}>{lbl}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="btn btn-primary" onClick={() => runPR(refStr, nFrames, PR.algo)} style={{ flex: 1, justifyContent: 'center' }}>▶ Run</button>
              <button className="btn btn-secondary" onClick={() => stepPR(refStr, nFrames, PR.algo)} style={{ flex: 1, justifyContent: 'center' }}>▸ Step</button>
            </div>
            <button className="btn btn-danger btn-sm" onClick={resetPR} style={{ justifyContent: 'center' }}>Reset PR</button>
          </div>
        </div>
      )}
    </aside>
  );
}
