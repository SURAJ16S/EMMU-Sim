import React from 'react';
import { useSimulator } from '../SimulatorContext';
import MemoryVisualizer from './shared/MemoryVisualizer';
import ProcessVisualizer from './shared/ProcessVisualizer';
import AllocationPanel from './shared/AllocationPanel';

export default function ContiguousModule() {
  const { CFG, MEM } = useSimulator();

  const usedKB = MEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
  const totalFree = CFG.totalMem - usedKB;
  const util = Math.round((usedKB / CFG.totalMem) * 100);
  const holes = MEM.segments.filter(s => s.isHole).map(h => h.size);
  const maxHole = holes.length > 0 ? Math.max(...holes) : 0;
  
  // Frag Index: 0 (perfect) to 1 (totally fragmented)
  const fragIndex = totalFree > 0 ? (1 - (maxHole / totalFree)).toFixed(2) : 0;

  return (
    <section id="mod-contiguous" className="module-section active fade-in">
      <div className="mod-split">
        <div className="mod-main">
          <div>
            <h2 style={{ fontSize: '20px' }}>🧱 Contiguous Memory Allocation</h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
              Dynamic partitioning diagnostics. External fragmentation measures "wasted" space between processes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            <div className="stat-pill">
              <div className="stat-val">{util}%</div>
              <div className="stat-lbl">Utilization</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--green)' }}>{totalFree}<small style={{ fontSize: '10px' }}>KB</small></div>
              <div className="stat-lbl">External Frag</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--amber)' }}>{maxHole}<small style={{ fontSize: '10px' }}>KB</small></div>
              <div className="stat-lbl">Max Alloc Size</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--red)' }}>{fragIndex}</div>
              <div className="stat-lbl">Frag. Index</div>
            </div>
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
