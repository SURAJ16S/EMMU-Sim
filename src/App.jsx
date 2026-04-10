import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ContiguousModule from './components/ContiguousModule';
import PagingModule from './components/PagingModule';
import ReplacementModule from './components/ReplacementModule';
import AnalyticsModule from './components/AnalyticsModule';
import { useSimulator } from './SimulatorContext';

function App() {
  const [activeModule, setActiveModule] = useState('contiguous');
  const { allocProcess } = useSimulator();
  const [demoLoaded, setDemoLoaded] = useState(false);

  useEffect(() => {
    if (!demoLoaded) {
      const demos = [
        { pid: 'OS', size: 64 },
        { pid: 'P1', size: 192 },
        { pid: 'P2', size: 128 },
        { pid: 'P3', size: 96 },
      ];
      for (const d of demos) {
        allocProcess(d.pid, d.size);
      }
      setDemoLoaded(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoLoaded]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeModule={activeModule} setActiveModule={setActiveModule} />
      <main id="content">
        {activeModule === 'contiguous' && <ContiguousModule />}
        {activeModule === 'paging' && <PagingModule />}
        {activeModule === 'replacement' && <ReplacementModule />}
        {activeModule === 'analytics' && <AnalyticsModule />}
      </main>
    </div>
  );
}

export default App;
