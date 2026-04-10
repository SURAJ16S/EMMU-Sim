import React from 'react';
import { useSimulator } from '../SimulatorContext';
import PagingVisualizer from './shared/PagingVisualizer';
import ProcessVisualizer from './shared/ProcessVisualizer';
import AllocationPanel from './shared/AllocationPanel';

export default function PagingModule() {
  const { MEM } = useSimulator();
  const [selectedPid, setSelectedPid] = React.useState(null);

  React.useEffect(() => {
    if (!selectedPid && MEM.processes.length > 0) {
      setSelectedPid(MEM.processes[0].pid);
    }
  }, [MEM.processes, selectedPid]);

  return (
    <section id="mod-paging" className="module-section active fade-in">
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px' }}>📄 Paging Explorer 2.0</h2>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
            Process-specific translation pipeline. See how each process maps its own virtual space to hardware.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <label className="sb-label" style={{ margin: 0 }}>Select Process:</label>
          <select 
            className="inp" style={{ width: '120px' }}
            value={selectedPid || ''} 
            onChange={e => setSelectedPid(e.target.value)}
          >
            {MEM.processes.length === 0 && <option value="">No Processes</option>}
            {MEM.processes.map(p => <option key={p.pid} value={p.pid}>{p.pid}</option>)}
          </select>
        </div>
      </div>
      
      <PagingVisualizer selectedPid={selectedPid} />
    </section>
  );
}
