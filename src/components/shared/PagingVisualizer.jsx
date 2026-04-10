import React from 'react';
import { useSimulator } from '../../SimulatorContext';

export default function PagingVisualizer({ selectedPid }) {
  const { CFG, MEM } = useSimulator();
  const [hoveredPage, setHoveredPage] = React.useState(null);

  // Data prep
  const totalFrames = Math.ceil(CFG.totalMem / CFG.frameSize);
  const frameMap = {};
  for (const proc of MEM.processes) {
    proc.frames.forEach((f, i) => { frameMap[f] = { proc, pageIdx: i }; });
  }

  const selectedProc = MEM.processes.find(p => p.pid === selectedPid);
  const usedFrames = Object.keys(frameMap).length;

  if (!selectedProc && MEM.processes.length > 0) return <div>Loading Explorer...</div>;
  if (MEM.processes.length === 0) return (
    <div className="card" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
      <div className="card-body" style={{ textAlign: 'center', padding: '60px' }}>
        <p style={{ color: 'var(--text3)' }}>No processes allocated. Move to the 🧱 Allocation tab to add processes.</p>
      </div>
    </div>
  );

  return (
    <div className="paging-explorer-pipeline fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '20px', alignItems: 'start' }}>
        
        {/* --- COL 1: LOGICAL VIEW --- */}
        <div className="card">
          <div className="card-header">
            <h2>Process {selectedPid} View</h2>
            <span className="badge badge-amber">Virtual Space</span>
          </div>
          <div className="card-body">
            <p className="sb-label">Logical Pages (p)</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedProc.frames.map((_, i) => (
                <div 
                  key={i} 
                  className={`logical-page-box ${hoveredPage === i ? 'pulse-focus' : ''}`}
                  style={{ 
                    padding: '12px', border: '1px solid var(--border2)', borderRadius: '8px', 
                    background: hoveredPage === i ? 'var(--paper)' : 'white',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={() => setHoveredPage(i)}
                  onMouseLeave={() => setHoveredPage(null)}
                >
                  <span style={{ fontWeight: 600 }}>Page {i}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{i * CFG.frameSize}KB - {(i+1) * CFG.frameSize - 1}KB</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* --- COL 2: PAGE TABLE --- */}
        <div className="card" style={{ border: '2px solid var(--border2)' }}>
          <div className="card-header" style={{ background: '#f8f9fa' }}>
            <h2>Page Table</h2>
            <span className="badge badge-blue">MMU Map</span>
          </div>
          <div className="card-body" style={{ padding: '0' }}>
            <div className="pt-row header" style={{ background: '#f1f3f5', padding: '10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1, fontSize: '10px', fontWeight: 'bold' }}>PAGE (p)</div>
              <div style={{ padding: '0 10px' }}>→</div>
              <div style={{ flex: 1, fontSize: '10px', fontWeight: 'bold' }}>FRAME (f)</div>
            </div>
            {selectedProc.frames.map((f, i) => (
              <div 
                key={i} 
                className={`pt-row-interactive ${hoveredPage === i ? 'active' : ''}`}
                style={{ 
                  display: 'flex', padding: '12px 10px', borderBottom: '1px solid var(--border2)',
                  alignItems: 'center', background: hoveredPage === i ? 'var(--accent-bg)' : 'transparent',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={() => setHoveredPage(i)}
                onMouseLeave={() => setHoveredPage(null)}
              >
                <div style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>{i}</div>
                <div style={{ color: 'var(--text3)', padding: '0 10px' }}>🎯</div>
                <div style={{ flex: 1, fontWeight: 'bold', textAlign: 'center', color: 'var(--green)' }}>{f}</div>
              </div>
            ))}
            <div style={{ padding: '12px', textAlign: 'center', borderTop: '2px solid var(--border2)' }}>
              <p style={{ fontSize: '10px', color: 'var(--text3)' }}>Offset (d) passes through direct.</p>
            </div>
          </div>
        </div>

        {/* --- COL 3: PHYSICAL VIEW --- */}
        <div className="card">
          <div className="card-header">
            <h2>Physical RAM</h2>
            <span className="badge badge-green">{usedFrames} / {totalFrames} used</span>
          </div>
          <div className="card-body">
             <div className="frame-grid-mini" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Array.from({ length: totalFrames }).map((_, f) => {
                  const info = frameMap[f];
                  const isOwned = info?.proc.pid === selectedPid;
                  const isHoveredFrame = isOwned && info.pageIdx === hoveredPage;

                  return (
                    <div 
                      key={f} 
                      className={`frame-box-styled ${isOwned ? 'owned' : ''} ${isHoveredFrame ? 'highlight-hardware' : ''}`}
                      style={{ 
                        aspectRatio: '1', borderRadius: '6px', border: '1px solid var(--border2)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '2px', background: isOwned ? info.proc.color.bg + '10' : 'white',
                        position: 'relative', transition: 'all 0.3s'
                      }}
                    >
                      <span style={{ fontSize: '8px', color: 'var(--text3)', position: 'absolute', top: '2px', left: '2px' }}>F{f}</span>
                      {info ? (
                        <>
                          <div style={{ fontWeight: 'bold', fontSize: '10px', color: info.proc.color.bg }}>{info.proc.pid}</div>
                          <div style={{ fontSize: '8px', opacity: 0.7 }}>p{info.pageIdx}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: '8px', color: '#ccc' }}>empty</div>
                      )}
                    </div>
                  );
                })}
             </div>
             <hr className="divider" style={{ margin: '16px 0' }} />
             <div style={{ fontSize: '11px', color: 'var(--text2)' }}>
               <p>✨ <strong>Mapping Logic:</strong> Physical Base = (Frame # × Page Size) + Offset</p>
               <p style={{ marginTop: '4px', opacity: 0.8 }}>Hover over a mapping in the Page Table to locate it in hardware.</p>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
