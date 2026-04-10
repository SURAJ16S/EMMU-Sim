import React, { useState } from 'react';
import { useSimulator } from '../../SimulatorContext';

export default function AllocationPanel() {
  const { CFG, MEM, setMEM, allocProcess, deallocAll, startCompaction } = useSimulator();
  
  const [pid, setPid] = useState('P1');
  const [size, setSize] = useState(128);

  const bumpPid = () => {
    const m = pid.match(/^([A-Za-z]+)(\d+)$/);
    if (m) setPid(m[1] + (parseInt(m[2]) + 1));
  };

  const handleAlloc = () => {
    const swapped = allocProcess(pid, size);
    if (!swapped) bumpPid();
  };

  return (
    <div className="card mod-side-card">
      <div className="card-header">
        <h2>Allocation Config</h2>
      </div>
      <div className="card-body">
        <div className="sb-section" style={{ padding: 0, border: 'none' }}>
          <p className="sb-label">Algorithm</p>
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
          
          <hr className="divider" style={{ margin: '16px 0' }} />
          
          <p className="sb-label">New Process</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <label className="lbl">Process ID</label>
              <input type="text" className="inp" value={pid} onChange={e => setPid(e.target.value)} maxLength="8" />
            </div>
            
            <div>
              <label className="lbl">Process Size (KB)</label>
              <input type="number" className="inp" value={size} onChange={e => setSize(parseInt(e.target.value) || 0)} min="1" />
            </div>

            <button className="btn btn-primary" onClick={handleAlloc} style={{ justifyContent: 'center', marginTop: '4px' }}>+ Allocate</button>
          </div>

          <hr className="divider" style={{ margin: '16px 0' }} />
          
          <p className="sb-label">System Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="btn btn-amber" onClick={startCompaction} style={{ justifyContent: 'center' }}>⊞ Compact Memory</button>
            <button className="btn btn-danger" onClick={deallocAll} style={{ justifyContent: 'center' }}>✕ Clear All</button>
          </div>
        </div>
      </div>
    </div>
  );
}
