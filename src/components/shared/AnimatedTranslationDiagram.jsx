import React, { useState, useEffect } from 'react';
import { useSimulator } from '../../SimulatorContext';

export default function AnimatedTranslationDiagram() {
  const { CFG, MEM } = useSimulator();
  const [trans, setTrans] = useState(null);
  const [overrides, setOverrides] = useState({}); // { pageIndex: frameIndex }
  const [logicalOverride, setLogicalOverride] = useState(null); // { p, d }
  const [editMode, setEditMode] = useState(null); // 'logical' | 'mapping' | null
  const [tempData, setTempData] = useState({ v1: '', v2: '' });

  const performLookup = (targetLogical, forcedPD = null) => {
    let p, d, logicalAt;

    if (forcedPD) {
      p = forcedPD.p;
      d = forcedPD.d;
      logicalAt = (p * CFG.frameSize) + d;
    } else {
      logicalAt = targetLogical;
      p = Math.floor(logicalAt / CFG.frameSize);
      d = logicalAt % CFG.frameSize;
    }
    
    let f = '—', owner = null, isOverride = false;

    if (overrides[p] !== undefined) {
      f = overrides[p];
      isOverride = true;
      for (const proc of MEM.processes) {
        if (logicalAt >= proc.start && logicalAt <= proc.end) { owner = proc.pid; break; }
      }
    } else {
      for (const proc of MEM.processes) {
        if (logicalAt >= proc.start && logicalAt <= proc.end) {
          owner = proc.pid;
          const localPage = Math.floor((logicalAt - proc.start) / CFG.frameSize);
          f = proc.frames[localPage] !== undefined ? proc.frames[localPage] : '—';
          break;
        }
      }
    }
    
    // Binary bits for the visualizer output
    const bits = Math.ceil(Math.log2(CFG.totalMem));
    const binStr = (logicalAt || 0).toString(2).padStart(bits, '0');
    const offsetBits = Math.ceil(Math.log2(CFG.frameSize));
    const pageBits = bits - offsetBits;
    const bitArr = binStr.split('').map((b, i) => ({ b, isPage: i < pageBits }));

    return { logical: logicalAt, p, d, f, owner, isOverride, isLogicalOverride: !!forcedPD, bitArr };
  };

  useEffect(() => {
    const handleTranslate = (e) => {
      const { logical } = e.detail;
      setLogicalOverride(null); // New Sidebar translation clears logical override
      setTrans(performLookup(logical));
    };

    window.addEventListener('translateAddr', handleTranslate);
    return () => window.removeEventListener('translateAddr', handleTranslate);
  }, [CFG.frameSize, MEM.processes, overrides]);

  useEffect(() => {
    if (trans?.logical !== undefined || logicalOverride) {
      setTrans(performLookup(logicalOverride ? null : trans.logical, logicalOverride));
    }
  }, [overrides, logicalOverride]);

  if (!trans) return (
    <div className="card" style={{ borderStyle: 'dashed', opacity: 0.6 }}>
      <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: 'var(--text3)' }}>Enter a logical address in the sidebar to start the hardware translation schematic.</p>
      </div>
    </div>
  );

  const isActive = trans.f !== '—';

  const handleLogicalClick = () => {
    setTempData({ v1: trans.p, v2: trans.d });
    setEditMode('logical');
  };

  const handleMappingClick = () => {
    setTempData({ v1: trans.p, v2: trans.f === '—' ? '' : trans.f });
    setEditMode('mapping');
  };

  const saveEdit = () => {
    if (editMode === 'logical') {
      const p = parseInt(tempData.v1) || 0;
      const d = parseInt(tempData.v2) || 0;
      setLogicalOverride({ p, d });
    } else if (editMode === 'mapping') {
      const p = parseInt(tempData.v1);
      const f = tempData.v2 === '' ? undefined : parseInt(tempData.v2);
      if (!isNaN(p)) setOverrides(prev => ({ ...prev, [p]: f }));
    }
    setEditMode(null);
  };

  const resetAll = () => {
    setOverrides({});
    setLogicalOverride(null);
  };

  const numFrames = Math.floor(CFG.totalMem / CFG.frameSize);
  const frameHeight = 320 / numFrames;

  return (
    <div className="card fade-in" style={{ background: '#fdfcfa', position: 'relative', border: 'none', boxShadow: 'none' }}>
      <div className="card-header" style={{ padding: '0 0 16px 0', borderBottom: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 style={{ fontSize: '18px' }}>🛠️ Address Translation Visualizer</h2>
          {(trans.isOverride || trans.isLogicalOverride) && <span className="badge badge-amber">Manual Controls Active</span>}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(trans.isOverride || trans.isLogicalOverride) && (
            <button className="btn btn-secondary btn-sm" onClick={resetAll}>Reset to Auto</button>
          )}
          <span className="badge badge-blue">Real-time Translation Flow</span>
        </div>
      </div>
      
      <div className="card-body" style={{ overflowX: 'auto', position: 'relative', padding: 0 }}>
        {/* EDIT OVERLAY ... (omitted for brevity in replacement, but I will keep it) */}
        {/* Note: I must include the full block if I use replace_file_content, 
            but for succinctness I will just target the header and the SVG part */}
        {/* EDIT OVERLAY */}
        {editMode && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            background: 'white', padding: '20px', borderRadius: '12px', boxShadow: 'var(--shadow-lg)',
            zIndex: 10, border: '1px solid var(--accent)', width: '260px'
          }}>
            <h3 style={{ marginBottom: '10px', fontSize: '14px' }}>
              {editMode === 'logical' ? 'Edit CPU Logical Register' : 'Edit Page Table Mapping'}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label className="lbl">{editMode === 'logical' ? 'Page Number (p)' : 'Page Index'}</label>
                <input 
                  type="number" className="inp" autoFocus
                  value={tempData.v1} onChange={e => setTempData({...tempData, v1: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                />
              </div>
              <div>
                <label className="lbl">{editMode === 'logical' ? 'Offset (d)' : 'Frame Number (f)'}</label>
                <input 
                  type="number" className="inp"
                  value={tempData.v2} onChange={e => setTempData({...tempData, v2: e.target.value})}
                  placeholder={editMode === 'mapping' ? 'Empty' : '0'}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={saveEdit}>Save Changes</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setEditMode(null)}>Cancel</button>
            </div>
          </div>
        )}

        <svg width="840" height="420" viewBox="0 0 840 420" fill="none" style={{ display: 'block', margin: '0 auto', opacity: editMode ? 0.3 : 1, transition: 'opacity 0.2s' }}>
          
          {/* ---- BINARY BITS (Synchronized Output) ---- */}
          <g transform="translate(30, 25)">
            <text x="0" y="-5" fontSize="9" fill="var(--text3)" fontWeight="bold">SYNCHRONIZED BINARY PATTERN</text>
            {trans.bitArr.map((bit, idx) => (
              <g key={idx} transform={`translate(${idx * 14}, 0)`}>
                <rect width="12" height="15" rx="2" fill="white" stroke={bit.isPage ? "var(--amber)" : "var(--accent)"} strokeWidth="1" />
                <text x="6" y="11" textAnchor="middle" fontSize="10" fontWeight="bold" fill={bit.isPage ? "var(--amber)" : "var(--accent)"}>{bit.b}</text>
              </g>
            ))}
            <text x={trans.bitArr.length * 14 + 5} y="11" fontSize="8" fill="var(--text3)">← MSB ... LSB</text>
          </g>

          {/* ---- CPU ---- */}
          <rect x="20" y="160" width="80" height="60" rx="8" fill="var(--paper)" stroke="var(--border2)" strokeWidth="2" />
          <text x="60" y="195" textAnchor="middle" fill="var(--text)" fontSize="14" fontWeight="bold">CPU</text>

          {/* ---- ARROW: CPU to LOGICAL ---- */}
          <path d="M100 190 H140" stroke="var(--border2)" strokeWidth="2" strokeDasharray="5 5" className="flow-arrow" />
          <circle cx="120" cy="190" r="4" fill="var(--accent)" className="data-packet" />

          {/* ---- LOGICAL ADDRESS REGISTER ---- */}
          <g transform="translate(140, 160)" style={{ cursor: 'pointer' }} onClick={handleLogicalClick}>
            <rect x="0" y="0" width="120" height="60" rx="8" fill="white" stroke={trans.isLogicalOverride ? "var(--amber)" : "var(--border2)"} strokeWidth="2" />
            <line x1="60" y1="0" x2="60" y2="60" stroke={trans.isLogicalOverride ? "var(--amber)" : "var(--border2)"} strokeWidth="2" />
            
            <text x="30" y="18" textAnchor="middle" fontSize="10" fill="var(--text3)" fontWeight="bold">PAGE (p)</text>
            <text x="30" y="42" textAnchor="middle" fontSize="18" fill="var(--amber)" fontWeight="bold">{trans.p}</text>
            
            <text x="90" y="18" textAnchor="middle" fontSize="10" fill="var(--text3)" fontWeight="bold">OFF (d)</text>
            <text x="90" y="42" textAnchor="middle" fontSize="18" fill="var(--accent)" fontWeight="bold">{trans.d}</text>
            <text x="125" y="12" textAnchor="start" fontSize="9" fill="var(--text3)">✎ Edit</text>
            <text x="60" y="-10" textAnchor="middle" fontSize="11" fill="var(--text2)" fontWeight="bold">CPU REGISTER</text>
          </g>

          {/* ---- ARROW: p to PAGE TABLE ---- */}
          <path d="M170 220 V300 H300" stroke={isActive ? "var(--amber)" : "var(--border2)"} strokeWidth="2" fill="none" strokeDasharray={isActive ? "none" : "5 5"} className={isActive ? "flow-arrow" : ""} />

          {/* ---- PAGE TABLE ---- */}
          <g transform="translate(300, 240)" style={{ cursor: 'pointer' }} onClick={handleMappingClick}>
            <rect x="0" y="0" width="100" height="120" rx="4" fill="white" stroke={trans.isOverride ? "var(--amber)" : "var(--border2)"} strokeWidth="2" />
            <text x="50" y="-10" textAnchor="middle" fontSize="11" fill="var(--text2)" fontWeight="bold">PAGE TABLE</text>
            
            {/* Dummy rows */}
            <rect x="5" y="10" width="90" height="20" rx="2" fill="#f8f8f8" />
            <rect x="5" y="40" width="90" height="20" rx="2" fill={isActive ? (trans.isOverride ? "var(--amber-bg)" : "var(--accent-bg)") : "#f8f8f8"} className={isActive ? "pt-highlight" : ""} />
            <rect x="5" y="70" width="90" height="20" rx="2" fill="#f8f8f8" />

            <text x="50" y="55" textAnchor="middle" fontSize="12" fill="var(--text)" fontWeight="bold">f = {trans.f}</text>
            <text x="50" y="130" textAnchor="middle" fontSize="9" fill="var(--text3)">✎ Change Mapping</text>
          </g>

          {/* ---- ARROW: f to PHYSICAL REGISTER ---- */}
          <path d="M400 300 H540 V220" stroke={isActive ? "var(--green)" : "var(--border2)"} strokeWidth="2" fill="none" strokeDasharray={isActive ? "none" : "5 5"} className={isActive ? "flow-arrow" : ""} />

          {/* ---- ARROW: d to PHYSICAL REGISTER (bypass) ---- */}
          <path d="M230 160 V100 H600 V160" stroke="var(--accent)" strokeWidth="2" fill="none" strokeDasharray="5 5" className="flow-arrow" />
          <circle cx="415" cy="100" r="4" fill="var(--accent)" className="data-packet" />

          {/* ---- PHYSICAL ADDRESS REGISTER ---- */}
          <g transform="translate(540, 160)">
            <rect x="0" y="0" width="120" height="60" rx="8" fill="white" stroke="var(--border2)" strokeWidth="2" />
            <line x1="60" y1="0" x2="60" y2="60" stroke="var(--border2)" strokeWidth="2" />
            
            <text x="30" y="18" textAnchor="middle" fontSize="10" fill="var(--text3)" fontWeight="bold">FRAME (f)</text>
            <text x="30" y="42" textAnchor="middle" fontSize="18" fill="var(--green)" fontWeight="bold">{trans.f}</text>
            
            <text x="90" y="18" textAnchor="middle" fontSize="10" fill="var(--text3)" fontWeight="bold">OFF (d)</text>
            <text x="90" y="42" textAnchor="middle" fontSize="18" fill={trans.d >= CFG.frameSize ? 'var(--red)' : 'var(--accent)'} fontWeight="bold">{trans.d}</text>
            <text x="60" y="-10" textAnchor="middle" fontSize="11" fill="var(--text2)" fontWeight="bold">PHYSICAL ADDRESS</text>
            
            {/* Calculation Callout */}
            {isActive && (
              <g transform="translate(0, 75)">
                <rect x="0" y="0" width="120" height="30" rx="4" fill="var(--paper)" stroke="var(--border)" strokeWidth="1" />
                <text x="60" y="20" textAnchor="middle" fontSize="10" fill="var(--text2)">
                  ({trans.f} × {CFG.frameSize}) + {trans.d} = {trans.f * CFG.frameSize + trans.d}KB
                </text>
                {trans.d >= CFG.frameSize && (
                  <text x="60" y="-5" textAnchor="middle" fontSize="9" fill="var(--red)" fontWeight="bold">⚡ BOUNDS ERROR</text>
                )}
              </g>
            )}
          </g>

          {/* ---- ARROW: PHYSICAL to MEMORY ---- */}
          <path d="M660 190 H720" stroke={isActive ? "var(--green)" : "var(--border2)"} strokeWidth="2" strokeDasharray="5 5" className="flow-arrow" />

          {/* ---- SEGMENTED PHYSICAL MEMORY ---- */}
          <g transform="translate(720, 40)">
            <rect x="0" y="0" width="60" height="320" rx="4" fill="var(--paper)" stroke="var(--border2)" strokeWidth="2" />
            
            {/* Frame Dividers and Labels */}
            {Array.from({ length: numFrames }).map((_, i) => (
              <g key={i}>
                <line x1="0" y1={i * frameHeight} x2="60" y2={i * frameHeight} stroke="var(--border)" strokeWidth="1" />
                <text x="65" y={(i * frameHeight) + (frameHeight/2) + 4} fontSize="9" fill="var(--text3)" fontWeight="bold">F{i}</text>
              </g>
            ))}

            {/* Current Target Highlight */}
            {isActive && typeof trans.f === 'number' && trans.f >= 0 && trans.f < numFrames && (
              <g>
                <rect x="2" y={trans.f * frameHeight + 1} width="56" height={frameHeight - 2} fill="var(--green)" opacity="0.1" />
                {/* Offset Pointer within Frame */}
                <rect 
                  x="2" 
                  y={trans.f * frameHeight + (trans.d / CFG.frameSize) * (frameHeight - 2)} 
                  width="56" height="3" 
                  fill="var(--green)" 
                  className="pulse" 
                />
                <text x="-15" y={trans.f * frameHeight + (trans.d / CFG.frameSize) * (frameHeight - 2) + 4} textAnchor="end" fontSize="8" fill="var(--green)" fontWeight="bold">PTR</text>
              </g>
            )}
            
            <text x="30" y="340" textAnchor="middle" fontSize="11" fill="var(--text3)" fontWeight="bold">PHYSICAL RAM</text>
          </g>

          {/* Status Label (Summary) */}
          <text x="400" y="405" textAnchor="middle" fontSize="14" fill={isActive ? "var(--green)" : "var(--red)"} fontWeight="bold">
            {isActive 
              ? `MAP: Logical ${trans.logical}K (P${trans.p}, D${trans.d}) → Physical FM${trans.f} + ${trans.d}` 
              : `FAULT: Logical ${trans.p}:${trans.d} is not mapped in Page Table`}
          </text>
        </svg>
      </div>
    </div>
  );
}
