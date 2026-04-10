import React from 'react';
import { useSimulator } from '../SimulatorContext';

export default function AnalyticsModule() {
  const { CFG, MEM, cmpLogs, clearCmpLog, prSessions } = useSimulator();

  const usedKB = MEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
  const freeKB = CFG.totalMem - usedKB;
  const holesList = MEM.segments.filter(s => s.isHole).map(s => s.size);
  const largestHole = holesList.length ? Math.max(...holesList) : 0;
  
  // Actually internal frag is not modeled in contiguous, but in paging.
  // We'll calculate it just like the legacy script if we want to add it.
  const intFrag = MEM.processes.reduce((acc, p) => acc + ((p.frames.length * CFG.frameSize) - p.size), 0);

  return (
    <section id="mod-analytics" className="module-section active fade-in">
      <div>
        <h2 style={{ fontSize: '20px' }}>📊 Analytics & Reports</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Real-time memory stats and per-session algorithm comparison log.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
        <div className="stat-pill">
          <div className="stat-val">{CFG.totalMem}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Total Memory</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{usedKB}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Used Memory</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--green)' }}>{freeKB}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Free Memory</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--amber)' }}>{intFrag}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Internal Fragmentation</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--red)' }}>{freeKB}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">External Fragmentation</div>
        </div>
        <div className="stat-pill">
          <div className="stat-val" style={{ color: 'var(--accent)' }}>{largestHole}<small style={{ fontSize: '12px' }}>KB</small></div>
          <div className="stat-lbl">Largest Free Hole</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Algorithm Comparison Log</h2>
          <button className="btn btn-secondary btn-sm" onClick={clearCmpLog}>Clear</button>
        </div>
        <div className="card-body" style={{ overflow: 'auto', maxHeight: '240px' }}>
          <table className="cmp-table">
            <thead><tr><th>Time</th><th>Algorithm</th><th>PID</th><th>Size</th><th>Free After</th><th>Holes</th><th>Outcome</th></tr></thead>
            <tbody>
              {cmpLogs.length === 0 ? (
                <tr><td colSpan="7" style={{ color: 'var(--text3)', textAlign: 'center', padding: '16px' }}>No sessions recorded.</td></tr>
              ) : (
                [...cmpLogs].reverse().map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)' }}>{e.ts}</td>
                    <td><span className="badge badge-blue">{e.algo}</span></td>
                    <td><strong>{e.pid}</strong></td>
                    <td>{e.size} KB</td>
                    <td>{e.free} KB</td>
                    <td>{e.holes}</td>
                    <td><span className="badge badge-green">✓ Success</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Page Replacement Sessions</h2></div>
        <div className="card-body" style={{ overflow: 'auto', maxHeight: '200px' }}>
          <table className="cmp-table">
            <thead><tr><th>Time</th><th>Algorithm</th><th>Frames</th><th>Refs</th><th>Faults</th><th>Hits</th><th>Hit Rate</th></tr></thead>
            <tbody>
              {prSessions.length === 0 ? (
                <tr><td colSpan="7" style={{ color: 'var(--text3)', textAlign: 'center', padding: '16px' }}>No sessions.</td></tr>
              ) : (
                [...prSessions].reverse().map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)' }}>{s.ts}</td>
                    <td><span className="badge badge-blue">{s.algo}</span></td>
                    <td>{s.nf}</td>
                    <td>{s.refs}</td>
                    <td><span style={{ color: 'var(--red)', fontWeight: 600 }}>{s.faults}</span></td>
                    <td><span style={{ color: 'var(--green)', fontWeight: 600 }}>{s.hits}</span></td>
                    <td><span className={`badge ${s.rate >= 50 ? 'badge-green' : 'badge-red'}`}>{s.rate}%</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
