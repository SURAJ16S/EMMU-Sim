import React, { useMemo } from 'react';
import { useSimulator } from '../SimulatorContext';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  BarChart, Bar
} from 'recharts';

export default function AnalyticsModule() {
  const { CFG, MEM, cmpLogs, clearCmpLog, prSessions, statsHistory } = useSimulator();

  const usedKB = MEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
  const freeKB = CFG.totalMem - usedKB;
  const holesList = MEM.segments.filter(s => s.isHole).map(s => s.size);
  const largestHole = holesList.length ? Math.max(...holesList) : 0;
  const extFrag = freeKB - largestHole;
  const intFrag = MEM.processes.reduce((acc, p) => acc + ((p.frames.length * CFG.frameSize) - p.size), 0);

  // 1. Memory Composition Data (Pie)
  const compositionData = [
    { name: 'Used Memory', value: usedKB, color: '#4e79c5' },
    { name: 'External Frag', value: extFrag, color: '#e05050' },
    { name: 'Internal Frag', value: intFrag, color: '#e07f3a' },
    { name: 'Free (Largest)', value: largestHole, color: '#3fa876' },
  ].filter(d => d.value > 0);

  // 2. Hole Distribution (Bar)
  const holeDistData = useMemo(() => {
    const bins = { '0-64K': 0, '64-256K': 0, '256-512K': 0, '512K+': 0 };
    holesList.forEach(h => {
      if (h <= 64) bins['0-64K']++;
      else if (h <= 256) bins['64-256K']++;
      else if (h <= 512) bins['256-512K']++;
      else bins['512K+']++;
    });
    return Object.entries(bins).map(([name, count]) => ({ name, count }));
  }, [holesList]);

  // 3. PR Performance (Grouped Bar)
  const prPerformanceData = useMemo(() => {
    const algos = ['FIFO', 'LRU', 'OPTIMAL'];
    return algos.map(a => {
      const sessions = prSessions.filter(s => s.algo === a);
      if (!sessions.length) return null;
      const avgRate = sessions.reduce((acc, s) => acc + s.rate, 0) / sessions.length;
      return { name: a, rate: Math.round(avgRate) };
    }).filter(Boolean);
  }, [prSessions]);

  return (
    <section id="mod-analytics" className="module-section active fade-in" style={{ gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '20px' }}>📊 Advanced System Analytics</h2>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Real-time performance metrics and historical memory utilization.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={clearCmpLog}>Reset History</button>
        </div>
      </div>

      {/* TOP ROW: Real-time Stats & Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header"><h2>Memory Composition</h2></div>
          <div className="card-body" style={{ height: '300px', padding: '0 20px 20px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={compositionData} 
                  cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={80} 
                  paddingAngle={5} 
                  dataKey="value"
                  animationDuration={800}
                >
                  {compositionData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <ReTooltip formatter={(val) => `${val} KB`} />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>System Utilization Trend</h2></div>
          <div className="card-body" style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={statsHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUtil" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="ts" hide />
                <YAxis unit="%" domain={[0, 100]} fontSize={12} stroke="var(--text3)" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <ReTooltip formatter={(v) => [`${v}%`, 'Used']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow)' }} />
                <Area type="monotone" dataKey="util" stroke="var(--accent)" fillOpacity={1} fill="url(#colorUtil)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECOND ROW: Fragmentation & Performance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="card">
          <div className="card-header"><h2>Hole Size Distribution</h2></div>
          <div className="card-body" style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={holeDistData}>
                <XAxis dataKey="name" fontSize={12} stroke="var(--text3)" axisLine={false} tickLine={false} />
                <YAxis fontSize={12} stroke="var(--text3)" axisLine={false} tickLine={false} />
                <ReTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                <Bar dataKey="count" fill="var(--amber)" radius={[4, 4, 0, 0]} barSize={40} animationDuration={1000} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Page Replacement Avg. Hit Rate (%)</h2></div>
          <div className="card-body" style={{ height: '240px' }}>
            {!prPerformanceData.length ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text3)', fontSize: '13px' }}>
                No PR simulation data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prPerformanceData}>
                  <XAxis dataKey="name" fontSize={12} stroke="var(--text3)" axisLine={false} tickLine={false} />
                  <YAxis fontSize={12} stroke="var(--text3)" axisLine={false} tickLine={false} unit="%" />
                  <ReTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px' }} />
                  <Bar dataKey="rate" fill="var(--green)" radius={[4, 4, 0, 0]} barSize={40} animationDuration={1000} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* TABLES: History Logs */}
      <div className="card">
        <div className="card-header"><h2>Allocation History Log</h2></div>
        <div className="card-body" style={{ overflow: 'auto', maxHeight: '240px' }}>
          <table className="cmp-table">
            <thead><tr><th>Time</th><th>Algorithm</th><th>PID</th><th>Size</th><th>Remaining</th><th>Holes</th><th>Outcome</th></tr></thead>
            <tbody>
              {cmpLogs.length === 0 ? (
                <tr><td colSpan="7" style={{ color: 'var(--text3)', textAlign: 'center', padding: '16px' }}>No session logs found.</td></tr>
              ) : (
                [...cmpLogs].reverse().map((e, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)', fontSize: '11px' }}>{e.ts}</td>
                    <td><span className="badge badge-blue">{e.algo}</span></td>
                    <td><strong>{e.pid}</strong></td>
                    <td>{e.size} KB</td>
                    <td>{e.free} KB</td>
                    <td>{e.holes}</td>
                    <td><span className="badge badge-green">✓ Success</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Page Replacement Sessions</h2></div>
        <div className="card-body" style={{ overflow: 'auto', maxHeight: '200px' }}>
          <table className="cmp-table">
            <thead><tr><th>Time</th><th>Algo</th><th>Frames</th><th>Refs</th><th>Faults</th><th>Hits</th><th>Hit Rate</th></tr></thead>
            <tbody>
              {prSessions.length === 0 ? (
                <tr><td colSpan="7" style={{ color: 'var(--text3)', textAlign: 'center', padding: '16px' }}>No sessions recorded.</td></tr>
              ) : (
                [...prSessions].reverse().map((s, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)', fontSize: '11px' }}>{s.ts}</td>
                    <td><span className="badge badge-blue">{s.algo}</span></td>
                    <td>{s.nf}</td>
                    <td>{s.refs}</td>
                    <td><span style={{ color: 'var(--red)', fontWeight: 600 }}>{s.faults}</span></td>
                    <td><span style={{ color: 'var(--green)', fontWeight: 600 }}>{s.hits}</span></td>
                    <td><span className={`badge ${s.rate >= 50 ? 'badge-green' : 'badge-red'}`}>{s.rate}%</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
