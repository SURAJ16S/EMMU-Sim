import React from 'react';
import MemoryVisualizer from './shared/MemoryVisualizer';
import ProcessVisualizer from './shared/ProcessVisualizer';
import AllocationPanel from './shared/AllocationPanel';

export default function ProcessModule() {
  return (
    <section id="mod-process" className="module-section active fade-in">
      <div className="mod-split">
        <div className="mod-main">
          <div>
            <h2 style={{ fontSize: '20px' }}>⚙️ Process Management</h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
              Monitor active processes, manage the swap queue, and perform manual memory operations.
            </p>
          </div>
          
          <MemoryVisualizer />
          <ProcessVisualizer />
        </div>

        <div className="mod-side">
          <AllocationPanel />
        </div>
      </div>
    </section>
  );
}
