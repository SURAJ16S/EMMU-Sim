import React, { useState } from 'react';
import TranslationResult from './TranslationResult';
import MemoryVisualizer from './shared/MemoryVisualizer';
import PagingVisualizer from './shared/PagingVisualizer';

export default function TranslationModule() {
  const [logicalInput, setLogicalInput] = useState(200);
  const [relocInput, setRelocInput] = useState(0);

  const handleTranslate = () => {
    window.dispatchEvent(new CustomEvent('translateAddr', { 
      detail: { logical: parseInt(logicalInput), reloc: parseInt(relocInput) || 0 } 
    }));
  };

  return (
    <section id="mod-translation" className="module-section active fade-in">
      <div className="mod-split">
        <div className="mod-main">
          <div>
            <h2 style={{ fontSize: '20px' }}>🧮 Address Translation</h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
              Logical-to-Physical translations dynamically evaluated against the current simulated memory maps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <TranslationResult moduleName="contiguous" />
            <TranslationResult moduleName="paging" />
          </div>
          
          <MemoryVisualizer />
          <PagingVisualizer />
        </div>

        <div className="mod-side">
          <div className="card mod-side-card">
            <div className="card-header">
              <h2>Translation Input</h2>
            </div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="lbl">Logical Address (KB)</label>
                  <input 
                    type="number" 
                    className="inp" 
                    value={logicalInput} 
                    onChange={e => setLogicalInput(e.target.value)} 
                    min="0" 
                  />
                </div>
                <div>
                  <label className="lbl">Relocation Register</label>
                  <input 
                    type="number" 
                    className="inp" 
                    value={relocInput} 
                    onChange={e => setRelocInput(e.target.value)} 
                    min="0" 
                  />
                  <p style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '4px' }}>Used for Base-Limit calculation.</p>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleTranslate} 
                  style={{ justifyContent: 'center', marginTop: '4px' }}
                >
                  → Run Translation
                </button>
              </div>
              <hr className="divider" style={{ margin: '16px 0' }} />
              <p style={{ fontSize: '11px', color: 'var(--text3)' }}>
                Translation results on the left will update automatically when you click the button.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
