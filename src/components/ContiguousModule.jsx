import React from 'react';
import { useSimulator } from '../SimulatorContext';
import MemoryVisualizer from './shared/MemoryVisualizer';
import ProcessVisualizer from './shared/ProcessVisualizer';
import AllocationPanel from './shared/AllocationPanel';

export default function ContiguousModule() {
  const { CFG, MEM } = useSimulator();

  const usedKB = MEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
  const freeKB = CFG.totalMem - usedKB;
  const util = Math.round((usedKB / CFG.totalMem) * 100);
  const holes = MEM.segments.filter(s => s.isHole);

  return (
    <section id="mod-contiguous" className="module-section active fade-in">
      <div className="mod-split">
        <div className="mod-main">
          <div>
            <h2 style={{ fontSize: '20px' }}>🧱 Contiguous Memory Allocation</h2>
            <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
              Dynamic partitioning with First/Best/Worst Fit. Click a block to deallocate.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
            <div className="stat-pill">
              <div className="stat-val">{util}%</div>
              <div className="stat-lbl">Utilization</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--green)' }}>{freeKB}<small style={{ fontSize: '10px' }}>KB</small></div>
              <div className="stat-lbl">Free Memory</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--amber)' }}>{holes.length}</div>
              <div className="stat-lbl">Free Holes</div>
            </div>
            <div className="stat-pill">
              <div className="stat-val" style={{ color: 'var(--red)' }}>{freeKB}<small style={{ fontSize: '10px' }}>KB</small></div>
              <div className="stat-lbl">Frag. Potential</div>
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
