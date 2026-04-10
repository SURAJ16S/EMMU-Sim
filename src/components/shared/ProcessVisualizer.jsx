import React from 'react';
import { useSimulator } from '../../SimulatorContext';

export default function ProcessVisualizer() {
  const { MEM, deallocProcess, swapOut, swapIn } = useSimulator();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '16px', marginTop: '20px' }}>
      <div className="card">
        <div className="card-header"><h2>Active Processes</h2></div>
        <div style={{ overflow: 'auto', maxHeight: '300px' }}>
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
        <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {MEM.swapQueue.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No swapped processes</p>
          ) : (
            MEM.swapQueue.map(p => (
              <div key={p.pid} className="swap-item" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border)' }}>
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
  );
}
