import React, { useState, useEffect } from 'react';
import { useSimulator } from '../SimulatorContext';

export default function TranslationResult({ moduleName }) {
  const { CFG, MEM } = useSimulator();
  const [trans, setTrans] = useState(null);

  useEffect(() => {
    const handleTranslate = (e) => {
      const { logical, reloc } = e.detail;
      if (isNaN(logical)) return;

      const physContiguous = reloc + logical;
      const p = Math.floor(logical / CFG.frameSize);
      const d = logical % CFG.frameSize;

      let frameNum = '—', physPaging = '—', ownerPid = null;
      for (const proc of MEM.processes) {
        if (logical >= proc.start && logical <= proc.end) {
          ownerPid = proc.pid;
          const localPage = Math.floor((logical - proc.start) / CFG.frameSize);
          frameNum = proc.frames[localPage] !== undefined ? proc.frames[localPage] : '—';
          if (frameNum !== '—') physPaging = (frameNum * CFG.frameSize) + d;
          break;
        }
      }

      const bits = Math.ceil(Math.log2(CFG.totalMem));
      const binStr = logical.toString(2).padStart(bits, '0');
      const offsetBits = Math.ceil(Math.log2(CFG.frameSize));
      const pageBits = bits - offsetBits;

      const bitArr = binStr.split('').map((b, i) => ({ b, isPage: i < pageBits }));

      setTrans({ logical, reloc, physContiguous, physPaging, ownerPid, p, d, frameNum, bits, pageBits, offsetBits, bitArr });
    };

    window.addEventListener('translateAddr', handleTranslate);
    return () => window.removeEventListener('translateAddr', handleTranslate);
  }, [CFG.frameSize, MEM.processes]);

  if (!trans && moduleName === 'paging') {
    return (
      <div className="card">
        <div className="card-header"><h2>Address Translation Visualizer</h2></div>
        <div className="card-body" id="paging-trans-body">
          <p style={{ color: 'var(--text3)', fontSize: '13px' }}>Use the <strong>Address Translation</strong> panel in the sidebar to translate a logical address.</p>
        </div>
      </div>
    );
  }

  if (!trans) return null;

  return (
    <div className="card" style={{ display: moduleName === 'contiguous' || moduleName === 'paging' ? 'block' : 'none' }}>
      <div className="card-header">
        <h2>{moduleName === 'contiguous' ? 'Logical → Physical Address (Contiguous)' : 'Address Translation Visualizer'}</h2>
      </div>
      <div className="card-body">
        <div className="addr-block">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="addr-row">
              <span className="addr-label">Logical Address:</span>
              <span className="addr-val">{trans.logical} KB</span>
              <span className="addr-formula">= 0x{trans.logical.toString(16).toUpperCase().padStart(4, '0')}</span>
            </div>

            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', marginBottom: '6px' }}>Binary Breakdown ({trans.bits} bits):</p>
              <div className="bit-row">
                {trans.bitArr.map((bit, idx) => (
                  <div key={idx} className={`bit-box ${bit.isPage ? 'page-bit' : 'off-bit'}`}>{bit.b}</div>
                ))}
                <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--text3)' }}>← MSB … LSB</span>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                <div><span className="bit-group-label page-bit-lbl">■ Page # bits ({trans.pageBits}b)</span> = <strong>{trans.p}</strong></div>
                <div><span className="bit-group-label off-bit-lbl">■ Offset bits ({trans.offsetBits}b)</span> = <strong>{trans.d} KB</strong></div>
              </div>
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

            <div className="addr-row">
              <span className="addr-label">Contiguous Translation:</span>
              <span className="addr-formula">Physical = Reloc({trans.reloc}) + Logical({trans.logical})</span>
              <span className="addr-val" style={{ color: 'var(--green)' }}>= {trans.physContiguous} KB ✓</span>
            </div>

            <div className="addr-row">
              <span className="addr-label">Paging Translation:</span>
              <span className="addr-formula">Physical = Frame({trans.frameNum}) × {CFG.frameSize} + Offset({trans.d})</span>
              <span className="addr-val" style={{ color: 'var(--accent)' }}>= {trans.physPaging} KB</span>
            </div>

            {trans.ownerPid ? (
              <div style={{ fontSize: '11px', color: 'var(--green)', background: 'var(--green-bg)', padding: '6px 10px', borderRadius: '5px' }}>
                ↳ Logical {trans.logical}KB belongs to process <strong>{trans.ownerPid}</strong>
              </div>
            ) : (
              <div style={{ fontSize: '11px', color: 'var(--red)', background: 'var(--red-bg)', padding: '6px 10px', borderRadius: '5px' }}>
                ↳ Address {trans.logical}KB is not within any allocated process.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
