import React, { createContext, useContext, useState, useMemo } from 'react';

const SimulatorContext = createContext();

export const useSimulator = () => useContext(SimulatorContext);

const COLORS = [
  { bg:'#4e79c5', text:'#fff' }, { bg:'#e07f3a', text:'#fff' },
  { bg:'#3fa876', text:'#fff' }, { bg:'#c24d8a', text:'#fff' },
  { bg:'#8e6bbf', text:'#fff' }, { bg:'#c0973a', text:'#fff' },
  { bg:'#3fa5bc', text:'#fff' }, { bg:'#8bba48', text:'#fff' },
  { bg:'#e05050', text:'#fff' }, { bg:'#709060', text:'#fff' },
];

export const SimulatorProvider = ({ children }) => {
  const [CFG, setCFG] = useState({ totalMem: 1024, frameSize: 64 });
  const [MEM, setMEM] = useState({
    segments: [{ pid: null, size: 1024, start: 0, isHole: true }],
    processes: [],
    swapQueue: [],
    allocAlgo: 'first',
    colorIdx: 0,
  });
  const [COMPACT, setCOMPACT] = useState({ active: false, steps: [], stepIdx: 0 });
  const [PR, setPR] = useState({ algo: 'fifo', refStr: [7,0,1,2,0,3,0,4,2,3], nFrames: 3, results: [], step: 0, computed: false });
  
  const [sysLogs, setSysLogs] = useState([{ msg: '[SYS] MMU Simulator ready. Memory: 1024 KB, Frame size: 64 KB.', type: 'sys', time: new Date().toLocaleTimeString('en-US',{hour12:false}) }]);
  const [cmpLogs, setCmpLogs] = useState([]);
  const [prSessions, setPrSessions] = useState([]);
  const [statsHistory, setStatsHistory] = useState([{ ts: 'Start', used: 0, free: 1024, extFrag: 0, intFrag: 0, util: 0, holeCount: 1 }]);

  const snapStats = (currentMEM, currentCFG) => {
    const used = currentMEM.segments.filter(s => !s.isHole).reduce((a, s) => a + s.size, 0);
    const free = (currentCFG?.totalMem || CFG.totalMem) - used;
    const holes = currentMEM.segments.filter(s => s.isHole).map(s => s.size);
    const largestHole = holes.length ? Math.max(...holes) : 0;
    const extFrag = free - largestHole;
    const intFrag = currentMEM.processes.reduce((acc, p) => acc + ((p.frames.length * (currentCFG?.frameSize || CFG.frameSize)) - p.size), 0);
    const util = Math.round((used / (currentCFG?.totalMem || CFG.totalMem)) * 100);

    setStatsHistory(prev => {
      const newSnap = { 
        ts: new Date().toLocaleTimeString('en-US', { hour12: false }), 
        used, free, extFrag, intFrag, util, holeCount: holes.length 
      };
      const hist = [...prev, newSnap];
      return hist.slice(-30); // Keep last 30 snapshots
    });
  };

  const log = (msg, type = 'ok') => {
    setSysLogs(prev => [...prev, { msg: `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] ${msg}`, type }]);
  };

  const getFrames = (start, size, frameSize = CFG.frameSize) => {
    const f1 = Math.floor(start / frameSize);
    const f2 = Math.floor((start + size - 1) / frameSize);
    const arr = [];
    for (let f = f1; f <= f2; f++) arr.push(f);
    return arr;
  };

  const coalesceHoles = (segments) => {
    let newSegs = [...segments];
    for (let i = 0; i < newSegs.length - 1; i++) {
      if (newSegs[i].isHole && newSegs[i+1].isHole && newSegs[i].partId === newSegs[i+1].partId) {
        newSegs.splice(i, 2, {
          pid: null,
          size: newSegs[i].size + newSegs[i+1].size,
          start: newSegs[i].start,
          isHole: true,
          partId: newSegs[i].partId
        });
        i--;
      }
    }
    return newSegs;
  };

  const findHole = (size, segments, algo) => {
    const holes = segments.map((s,i) => ({...s,i})).filter(s => s.isHole && s.size >= size);
    if (!holes.length) return -1;
    if (algo === 'first') return holes[0].i;
    if (algo === 'best') return holes.reduce((a,b) => b.size < a.size ? b : a).i;
    if (algo === 'worst') return holes.reduce((a,b) => b.size > a.size ? b : a).i;
    return -1;
  };

  const allocProcess = (pid, size) => {
    if (!pid) return log('[ERR] PID is required.', 'err');
    if (!size || size < 1) return log('[ERR] Size must be ≥ 1 KB.', 'err');
    if (MEM.processes.find(p => p.pid === pid)) return log(`[ERR] PID "${pid}" already exists.`, 'err');

    let wasSwapped = false;

    setMEM(prev => {
      const segs = [...prev.segments];
      const holeIdx = findHole(size, segs, prev.allocAlgo);

      if (holeIdx === -1) {
        log(`[SWAP] ${pid} (${size}KB) → No fitting hole. Added to Swap Queue.`, 'info');
        wasSwapped = true;
        return { ...prev, swapQueue: [...prev.swapQueue, { pid, size }] };
      }

      const hole = segs[holeIdx];
      const rem = hole.size - size;
      const color = COLORS[prev.colorIdx % COLORS.length];

      segs.splice(holeIdx, 1,
        { pid, size, start: hole.start, isHole: false, partId: hole.partId },
        ...(rem > 0 ? [{ pid: null, size: rem, start: hole.start + size, isHole: true, partId: hole.partId }] : [])
      );

      const frames = getFrames(hole.start, size, CFG.frameSize);
      
      const newFreeKB = segs.filter(s => s.isHole).reduce((a, s) => a + s.size, 0);
      const newHolesCount = segs.filter(s => s.isHole).length;
      
      setCmpLogs(cl => [...cl, {
        ts: new Date().toLocaleTimeString(),
        algo: prev.allocAlgo.toUpperCase() + ' FIT',
        pid, size,
        free: newFreeKB,
        holes: newHolesCount,
      }]);

      log(`[OK] ${pid} (${size}KB) allocated @ ${hole.start}KB [${prev.allocAlgo.toUpperCase()} FIT]`, 'ok');

      const nextState = {
        ...prev,
        segments: segs,
        processes: [...prev.processes, { pid, size, start: hole.start, end: hole.start + size - 1, frames, color }],
        colorIdx: prev.colorIdx + 1
      };
      snapStats(nextState, CFG);
      return nextState;
    });

    return wasSwapped;
  };

  const deallocProcess = (pid) => {
    setMEM(prev => {
      const idx = prev.segments.findIndex(s => s.pid === pid);
      if (idx === -1) return prev;
      const seg = prev.segments[idx];
      let newSegs = [...prev.segments];
      newSegs[idx] = { pid: null, size: seg.size, start: seg.start, isHole: true, partId: seg.partId };
      newSegs = coalesceHoles(newSegs);

      log(`[OK] ${pid} freed. ${seg.size}KB released @ ${seg.start}KB.`, 'ok');

      const nextState = {
        ...prev,
        segments: newSegs,
        processes: prev.processes.filter(p => p.pid !== pid)
      };
      snapStats(nextState, CFG);
      return nextState;
    });
  };

  const deallocAll = () => {
    setMEM(prev => {
      let resetSegs = [];
      if (prev.segments.some(s => s.partId > 0)) {
        // We have custom blocks. Restore them by extracting unique partIds mapped to their total capacity
        let parts = {};
        for (let s of prev.segments) {
          if (!parts[s.partId]) parts[s.partId] = { size: 0, start: s.start };
          parts[s.partId].size += s.size;
        }
        resetSegs = Object.keys(parts).sort((a,b) => parts[a].start - parts[b].start).map(pId => ({
          pid: null,
          size: parts[pId].size,
          start: parts[pId].start,
          isHole: true,
          partId: parseInt(pId)
        }));
      } else {
        resetSegs = [{ pid: null, size: CFG.totalMem, start: 0, isHole: true, partId: 0 }];
      }

      const nextState = {
        ...prev,
        segments: resetSegs,
        processes: [],
      };
      snapStats(nextState, CFG);
      return nextState;
    });
    log('[SYS] All processes deallocated.', 'sys');
  };

  const swapOut = (pid) => {
    const proc = MEM.processes.find(p => p.pid === pid);
    if (!proc) return;
    setMEM(prev => ({ ...prev, swapQueue: [...prev.swapQueue, { pid: proc.pid, size: proc.size }] }));
    deallocProcess(pid);
    log(`[SWAP] ${pid} swapped out to disk.`, 'info');
  };

  const swapIn = (pid) => {
    const proc = MEM.swapQueue.find(p => p.pid === pid);
    if (!proc) return;
    const holeIdx = findHole(proc.size, MEM.segments, MEM.allocAlgo);
    if (holeIdx === -1) {
      log(`[SWAP] Cannot load ${pid}: no hole ≥ ${proc.size}KB.`, 'err');
      return;
    }
    setMEM(prev => ({ ...prev, swapQueue: prev.swapQueue.filter(p => p.pid !== pid) }));
    allocProcess(proc.pid, proc.size);
  };

  const resetAll = (memSize, frameSize) => {
    const tMem = memSize || 1024;
    const fSize = frameSize || 64;
    setCFG({ totalMem: tMem, frameSize: fSize });
    const nextState = {
      segments: [{ pid: null, size: tMem, start: 0, isHole: true, partId: 0 }],
      processes: [],
      swapQueue: [],
      allocAlgo: 'first',
      colorIdx: 0,
    };
    setMEM(nextState);
    snapStats(nextState, { totalMem: tMem, frameSize: fSize });
    setCOMPACT({ active: false, steps: [], stepIdx: 0 });
    log(`[SYS] Reset. Memory: ${tMem} KB, Frame: ${fSize} KB.`, 'sys');
  };

  const initCustomBlocks = (sizesStr, frameSize) => {
    const sizes = sizesStr.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s > 0);
    if (!sizes.length) return log('[ERR] Invalid custom blocks definition.', 'err');

    let currentStart = 0;
    const newSegments = sizes.map((size, idx) => {
      const seg = { pid: null, size, start: currentStart, isHole: true, partId: idx + 1 };
      currentStart += size;
      return seg;
    });

    const totalMem = currentStart;
    const fSize = frameSize || 64;

    setCFG({ totalMem, frameSize: fSize });
    const nextState = {
      segments: newSegments,
      processes: [],
      swapQueue: [],
      allocAlgo: 'first',
      colorIdx: 0,
    };
    setMEM(nextState);
    snapStats(nextState, { totalMem, frameSize: fSize });
    setCOMPACT({ active: false, steps: [], stepIdx: 0 });
    log(`[SYS] Custom Layout initialized. ${newSegments.length} blocks. Total Memory: ${totalMem} KB.`, 'sys');
  };

  // Compaction
  const startCompaction = () => {
    const allocated = MEM.segments.filter(s => !s.isHole);
    if (!allocated.length) { log('[INFO] Nothing to compact.', 'info'); return; }

    const steps = [];
    let steps_cursor = 0;
    steps.push(JSON.parse(JSON.stringify(MEM.segments)));

    let built = [];
    for (const blk of allocated) {
      built.push({ ...blk, start: steps_cursor });
      steps_cursor += blk.size;
      const remaining = CFG.totalMem - steps_cursor;
      steps.push([
        ...built.map(b => ({...b})),
        ...(remaining > 0 ? [{ pid:null, size:remaining, start:steps_cursor, isHole:true }] : []),
      ]);
    }
    setCOMPACT({ active: true, steps, stepIdx: 0 });
    log('[SYS] Compaction started. Use step controls to trace movement.', 'sys');
  };

  const finishCompaction = () => {
    const finalState = COMPACT.steps[COMPACT.steps.length - 1];
    setMEM(prev => {
      const newProcs = prev.processes.map(proc => {
        const seg = finalState.find(s => s.pid === proc.pid);
        return seg ? { ...proc, start: seg.start, end: seg.start + seg.size - 1, frames: getFrames(seg.start, seg.size) } : proc;
      });
      const nextState = { ...prev, segments: JSON.parse(JSON.stringify(finalState)), processes: newProcs };
      snapStats(nextState, CFG);
      return nextState;
    });
    setCOMPACT({ active: false, steps: [], stepIdx: 0 });
    log('[SYS] Memory compacted. All holes merged to one free block.', 'sys');
  };

  // PR Calculation
  const computePR = (ref, nFrames, algo) => {
    let frames = [];
    let fifoQ = [];
    let lruTime = {};
    let time = 0;
    const results = [];

    for (let i = 0; i < ref.length; i++) {
      const page = ref[i];
      time++;
      if (frames.includes(page)) {
        if (algo === 'lru') lruTime[page] = time;
        results.push({ page, frames: [...frames], fault: false, evicted: null });
      } else {
        let evicted = null;
        if (frames.length < nFrames) {
          frames.push(page);
          if (algo === 'fifo') fifoQ.push(page);
          if (algo === 'lru') lruTime[page] = time;
        } else {
          if (algo === 'fifo') {
            evicted = fifoQ.shift();
            frames[frames.indexOf(evicted)] = page;
            fifoQ.push(page);
          } else if (algo === 'optimal') {
            const future = ref.slice(i + 1);
            let victim = null, farthest = -1;
            for (const f of frames) {
              const nextUse = future.indexOf(f);
              if (nextUse === -1) { victim = f; break; }
              if (nextUse > farthest) { farthest = nextUse; victim = f; }
            }
            evicted = victim;
            frames[frames.indexOf(evicted)] = page;
          } else if (algo === 'lru') {
            let oldest = Infinity, victim = frames[0];
            for (const f of frames) {
              if ((lruTime[f] || 0) < oldest) { oldest = lruTime[f] || 0; victim = f; }
            }
            evicted = victim;
            frames[frames.indexOf(evicted)] = page;
            lruTime[page] = time;
          }
        }
        results.push({ page, frames: [...frames], fault: true, evicted });
      }
    }
    return results;
  };

  const runPR = (refStrRaw, nFrames, algo) => {
    const ref = refStrRaw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (!ref.length) { log('[ERR] Invalid reference string.', 'err'); return; }
    
    const results = computePR(ref, nFrames, algo);
    setPR({ algo, refStr: ref, nFrames, results, step: results.length, computed: true });
    
    const faults = results.filter(r=>r.fault).length;
    const hits = results.filter(r=>!r.fault).length;
    setPrSessions(prev => [...prev, {
      ts: new Date().toLocaleTimeString(),
      algo: algo.toUpperCase(),
      nf: nFrames,
      refs: ref.length,
      faults, hits,
      rate: Math.round((hits / results.length) * 100),
    }]);
    
    log(`[PR] ${algo.toUpperCase()} | Faults: ${faults} | Hits: ${hits}`, 'ok');
  };

  const stepPR = (refStrRaw, nFrames, algo) => {
    const ref = refStrRaw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
    if (!PR.computed || PR.refStr.join() !== ref.join() || PR.nFrames !== nFrames || PR.algo !== algo) {
      const results = computePR(ref, nFrames, algo);
      setPR({ algo, refStr: ref, nFrames, results, step: 1, computed: true });
    } else {
      if (PR.step < PR.results.length) setPR(prev => ({ ...prev, step: prev.step + 1 }));
    }
  };

  const resetPR = () => {
    setPR(prev => ({ ...prev, results: [], step: 0, computed: false }));
    log('[PR] Simulation reset.', 'info');
  };

  const clearCmpLog = () => setCmpLogs([]);

  return (
    <SimulatorContext.Provider value={{
      CFG, setCFG, MEM, setMEM, COMPACT, setCOMPACT, PR, setPR,
      sysLogs, cmpLogs, prSessions, statsHistory,
      allocProcess, deallocProcess, deallocAll, swapIn, swapOut, resetAll, initCustomBlocks, startCompaction, finishCompaction, runPR, stepPR, resetPR, clearCmpLog, log
    }}>
      {children}
    </SimulatorContext.Provider>
  );
};
