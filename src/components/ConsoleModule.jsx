import React from 'react';
import { useSimulator } from '../SimulatorContext';

export default function ConsoleModule() {
  const { sysLogs } = useSimulator();

  return (
    <section id="mod-console" className="module-section active fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div>
        <h2 style={{ fontSize: '20px' }}>🖥️ System Console</h2>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Global log of all actions, errors, memory events, and allocations.</p>
      </div>

      <div className="card" style={{ flexGrow: 1, marginTop: '20px', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
        <div className="card-header">
          <h2>Execution Log</h2>
        </div>
        <div className="card-body" style={{ flexGrow: 1, padding: 0, backgroundColor: '#1a1b23' }}>
          <div className="log-box" id="sys-log" style={{ height: '100%', maxHeight: '600px', backgroundColor: 'transparent', border: 'none', color: '#e0e0e0', padding: '16px', fontFamily: '"DM Mono", monospace', overflowY: 'auto' }}>
            {sysLogs.map((log, i) => {
              let color = '#aab2c0';
              if (log.type === 'ok') color = '#a1e481';
              else if (log.type === 'err') color = '#ff7b7b';
              else if (log.type === 'sys') color = '#7db2f2';
              else if (log.type === 'info') color = '#e8cd71';
              return (
                <div key={i} style={{ color, marginBottom: '6px', fontSize: '12px' }}>
                  {log.msg}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
