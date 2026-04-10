import React, { useState } from 'react';
import { useSimulator } from '../SimulatorContext';

export default function Sidebar({ activeModule, setActiveModule }) {
  const { CFG, resetAll, initCustomBlocks } = useSimulator();
  
  const [memLayoutMode, setMemLayoutMode] = useState('single');
  const [totMemStr, setTotMemStr] = useState(CFG.totalMem);
  const [customBlocksStr, setCustomBlocksStr] = useState('100, 500, 200, 300');
  const [fSizeStr, setFSizeStr] = useState(CFG.frameSize);

  const handleReset = () => {
    if (memLayoutMode === 'single') {
      resetAll(parseInt(totMemStr), parseInt(fSizeStr));
    } else {
      initCustomBlocks(customBlocksStr, parseInt(fSizeStr));
    }
  };

  return (
    <aside id="sidebar">
      <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>MMU <span style={{ color: 'var(--accent)' }}>Simulator</span></h1>
        <p style={{ fontSize: '11px', color: 'var(--text3)' }}>Memory Management Unit — OS Lab</p>
      </div>

      <div className="module-nav" style={{ padding: '12px' }}>
        <p className="sb-label">Modules</p>
        <button className={`module-btn ${activeModule === 'process' ? 'active' : ''}`} onClick={() => setActiveModule('process')}>
          <div className="module-icon" style={{ background: '#eef2fc' }}>⚙️</div>
          Process Manager
        </button>
        <button className={`module-btn ${activeModule === 'contiguous' ? 'active' : ''}`} onClick={() => setActiveModule('contiguous')}>
          <div className="module-icon" style={{ background: '#fef3e2' }}>🧱</div>
          Memory Allocation
        </button>
        <button className={`module-btn ${activeModule === 'paging' ? 'active' : ''}`} onClick={() => setActiveModule('paging')}>
          <div className="module-icon" style={{ background: '#e8f5ef' }}>📄</div>
          Paging Explorer
        </button>
        <button className={`module-btn ${activeModule === 'translation' ? 'active' : ''}`} onClick={() => setActiveModule('translation')}>
          <div className="module-icon" style={{ background: '#fdecea' }}>🧮</div>
          Address Translation
        </button>
        <button className={`module-btn ${activeModule === 'replacement' ? 'active' : ''}`} onClick={() => setActiveModule('replacement')}>
          <div className="module-icon" style={{ background: '#eef2fc' }}>🔄</div>
          Page Replacement
        </button>
        <button className={`module-btn ${activeModule === 'analytics' ? 'active' : ''}`} onClick={() => setActiveModule('analytics')}>
          <div className="module-icon" style={{ background: '#fef3e2' }}>📊</div>
          System Analytics
        </button>
        <button className={`module-btn ${activeModule === 'console' ? 'active' : ''}`} onClick={() => setActiveModule('console')}>
          <div className="module-icon" style={{ background: '#e8f5ef' }}>🖥️</div>
          System Console
        </button>
      </div>

      <hr className="divider" />

      <div className="sb-section">
        <p className="sb-label">System Configuration</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label className="lbl">Memory Layout Mode</label>
            <select className="inp" value={memLayoutMode} onChange={e => setMemLayoutMode(e.target.value)}>
              <option value="single">Single Dynamic Block</option>
              <option value="custom">Custom Partitions</option>
            </select>
          </div>

          {memLayoutMode === 'single' ? (
            <div>
              <label className="lbl">Total Memory (KB)</label>
              <input type="number" className="inp" value={totMemStr} onChange={e => setTotMemStr(e.target.value)} min="64" max="8192" />
            </div>
          ) : (
            <div>
              <label className="lbl">Block Sizes (KB, comma separated)</label>
              <input type="text" className="inp" value={customBlocksStr} onChange={e => setCustomBlocksStr(e.target.value)} />
              <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>e.g. 100, 500, 200, 300, 600</p>
            </div>
          )}

          <div>
            <label className="lbl">Frame / Page Size (KB)</label>
            <input type="number" className="inp" value={fSizeStr} onChange={e => setFSizeStr(e.target.value)} min="4" max="512" />
          </div>
          <button className="btn btn-secondary" onClick={handleReset} style={{ width: '100%', justifyContent: 'center' }}>↺ Form Memory Layout</button>
        </div>
      </div>

      <hr className="divider" />
      
      <div style={{ padding: '20px 16px', marginTop: 'auto' }}>
         <p style={{ fontSize: '11px', color: 'var(--text3)', fontStyle: 'italic' }}>
           Select a module above. Specific configuration for each module is now located on the right side of the main view.
         </p>
      </div>
    </aside>
  );
}
