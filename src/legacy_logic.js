/* ===================================================================
   MMU SIMULATOR — Complete, self-contained implementation
   Each module is independent. Shared data (processes) is the only
   coupling point: contiguous allocation → paging view uses same data.
   All other modules are fully standalone.
=================================================================== */

// ===================================================================
// GLOBAL STATE
// ===================================================================

let CFG = { totalMem: 1024, frameSize: 64 };

// Contiguous memory state
let MEM = {
  segments: [],    // [{pid, size, start, isHole}]
  processes: [],   // [{pid, size, start, end, frames[], color}]
  swapQueue: [],   // [{pid, size}]
  allocAlgo: 'first',
  colorIdx: 0,
};

// Compaction state
let COMPACT = {
  active: false,
  steps: [],       // Array of segment arrays (one per step)
  stepIdx: 0,
};

// Page Replacement state (completely separate)
let PR = {
  algo: 'fifo',
  refStr: [],
  nFrames: 3,
  results: [],     // [{page, frames[], fault, evicted}]
  step: 0,         // How many steps currently shown
  computed: false,
};

// Analytics comparison log
let CMP_LOG = [];
let PR_SESSIONS = [];

// Process color palette
const COLORS = [
  { bg:'#4e79c5', text:'#fff' }, { bg:'#e07f3a', text:'#fff' },
  { bg:'#3fa876', text:'#fff' }, { bg:'#c24d8a', text:'#fff' },
  { bg:'#8e6bbf', text:'#fff' }, { bg:'#c0973a', text:'#fff' },
  { bg:'#3fa5bc', text:'#fff' }, { bg:'#8bba48', text:'#fff' },
  { bg:'#e05050', text:'#fff' }, { bg:'#709060', text:'#fff' },
];

const ALGO_HINTS = {
  first: 'Allocate to the <strong>first</strong> hole that fits. Fast, O(n).',
  best:  'Allocate to the hole that leaves the <strong>smallest</strong> leftover. Minimizes waste.',
  worst: 'Allocate to the <strong>largest</strong> hole. Leaves bigger remainders.',
};

// ===================================================================
// MODULE NAVIGATION
// ===================================================================

/**
 * showModule: Switch between the 4 independent simulator modules.
 * Each module is a separate <section> element.
 * Sidebar panels are shown/hidden based on which module is active.
 */
function showModule(name) {
  // Hide all sections
  document.querySelectorAll('.module-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.module-btn').forEach(b => b.classList.remove('active'));

  // Show selected
  document.getElementById('mod-' + name).classList.add('active');
  document.getElementById('nav-' + name).classList.add('active');

  // Sidebar panel visibility
  const sbAlloc = document.getElementById('sb-alloc');
  const sbTrans = document.getElementById('sb-trans');
  const sbPR    = document.getElementById('sb-pr');

  sbAlloc.style.display = (name === 'contiguous') ? '' : 'none';
  sbTrans.style.display = (name === 'contiguous' || name === 'paging') ? '' : 'none';
  sbPR.style.display    = (name === 'replacement') ? '' : 'none';

  // Refresh paging view when switching to it
  if (name === 'paging') renderPagingView();
  if (name === 'analytics') renderAnalytics();
}

// ===================================================================
// MODULE 1: CONTIGUOUS ALLOCATION
// ===================================================================

/**
 * resetAll: Full system reset. Clears all memory, processes, swap.
 */
function resetAll() {
  CFG.totalMem  = parseInt(document.getElementById('cfg-mem').value)   || 1024;
  CFG.frameSize = parseInt(document.getElementById('cfg-frame').value) || 64;

  // Single free hole spanning all memory
  MEM.segments  = [{ pid: null, size: CFG.totalMem, start: 0, isHole: true }];
  MEM.processes = [];
  MEM.swapQueue = [];
  MEM.colorIdx  = 0;

  COMPACT.active = false;
  document.getElementById('compact-panel').style.display = 'none';

  renderContiguous();
  renderPagingView();
  log(`[SYS] Reset. Memory: ${CFG.totalMem} KB, Frame: ${CFG.frameSize} KB.`, 'sys');
}

/**
 * setAllocAlgo: Change the allocation algorithm via radio tabs.
 */
function setAllocAlgo(el) {
  document.querySelectorAll('#alloc-tabs .algo-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  MEM.allocAlgo = el.dataset.val;
  document.getElementById('algo-hint').innerHTML = ALGO_HINTS[MEM.allocAlgo];
  log(`[CFG] Algorithm → ${el.textContent} Fit`, 'info');
}

/**
 * allocProcess: Read PID and size from sidebar, find a hole using the
 * selected algorithm, split it, and record the allocation.
 */
function allocProcess() {
  const pid  = document.getElementById('inp-pid').value.trim();
  const size = parseInt(document.getElementById('inp-size').value);

  if (!pid)          return log('[ERR] PID is required.', 'err');
  if (!size || size < 1) return log('[ERR] Size must be ≥ 1 KB.', 'err');
  if (MEM.processes.find(p => p.pid === pid)) return log(`[ERR] PID "${pid}" already exists.`, 'err');

  const holeIdx = findHole(size);

  if (holeIdx === -1) {
    // No fitting hole → send to swap queue (disk)
    MEM.swapQueue.push({ pid, size });
    log(`[SWAP] ${pid} (${size}KB) → No fitting hole. Added to Swap Queue.`, 'info');
    renderSwapQueue();
    return;
  }

  const hole = MEM.segments[holeIdx];
  const rem  = hole.size - size;
  const color = COLORS[MEM.colorIdx % COLORS.length];
  MEM.colorIdx++;

  // Replace the hole with [allocated, remainder_hole?]
  MEM.segments.splice(holeIdx, 1,
    { pid, size, start: hole.start, isHole: false },
    ...(rem > 0 ? [{ pid: null, size: rem, start: hole.start + size, isHole: true }] : [])
  );

  const frames = calcFrames(hole.start, size);
  MEM.processes.push({ pid, size, start: hole.start, end: hole.start + size - 1, frames, color });

  bumpPid(pid);
  addCmpLog(pid, size);
  log(`[OK] ${pid} (${size}KB) allocated @ ${hole.start}KB [${MEM.allocAlgo.toUpperCase()} FIT]`, 'ok');
  renderContiguous();
  renderPagingView();
}

/**
 * findHole: Core allocation algorithm dispatcher.
 *
 * FIRST FIT  — Scan left→right, return index of first adequate hole.
 * BEST  FIT  — Among adequate holes, return index of smallest one.
 * WORST FIT  — Among adequate holes, return index of largest one.
 *
 * All three are O(n) single-pass or sort-based scans.
 */
function findHole(size) {
  const holes = MEM.segments.map((s,i) => ({...s,i})).filter(s => s.isHole && s.size >= size);
  if (!holes.length) return -1;

  if (MEM.allocAlgo === 'first')
    return holes[0].i;                                           // First adequate

  if (MEM.allocAlgo === 'best')
    return holes.reduce((a,b) => b.size < a.size ? b : a).i;   // Smallest adequate

  if (MEM.allocAlgo === 'worst')
    return holes.reduce((a,b) => b.size > a.size ? b : a).i;   // Largest hole
}

/**
 * deallocProcess: Free a process's memory.
 * After marking the segment as a hole, merge adjacent holes (coalescing).
 */
function deallocProcess(pid) {
  const idx = MEM.segments.findIndex(s => s.pid === pid);
  if (idx === -1) return;
  const seg = MEM.segments[idx];
  MEM.segments[idx] = { pid: null, size: seg.size, start: seg.start, isHole: true };
  MEM.processes = MEM.processes.filter(p => p.pid !== pid);
  coalesceHoles();
  log(`[OK] ${pid} freed. ${seg.size}KB released @ ${seg.start}KB.`, 'ok');
  renderContiguous();
  renderPagingView();
}

/**
 * coalesceHoles: Merge consecutive free segments into one larger hole.
 * Prevents unnecessary external fragmentation after deallocation.
 */
function coalesceHoles() {
  for (let i = 0; i < MEM.segments.length - 1; i++) {
    if (MEM.segments[i].isHole && MEM.segments[i+1].isHole) {
      MEM.segments.splice(i, 2, {
        pid: null,
        size: MEM.segments[i].size + MEM.segments[i+1].size,
        start: MEM.segments[i].start,
        isHole: true,
      });
      i--; // Re-check same position after merge
    }
  }
}

/** deallocAll: Clear every process from memory at once */
function deallocAll() {
  MEM.segments  = [{ pid:null, size:CFG.totalMem, start:0, isHole:true }];
  MEM.processes = [];
  log('[SYS] All processes deallocated.', 'sys');
  renderContiguous();
  renderPagingView();
}

/** calcFrames: Return the list of physical frame numbers a block spans */
function calcFrames(start, size) {
  const f1 = Math.floor(start / CFG.frameSize);
  const f2 = Math.floor((start + size - 1) / CFG.frameSize);
  const arr = [];
  for (let f = f1; f <= f2; f++) arr.push(f);
  return arr;
}

// ---- SWAP --------------------------------------------------------

function swapOut(pid) {
  const proc = MEM.processes.find(p => p.pid === pid);
  if (!proc) return;
  MEM.swapQueue.push({ pid: proc.pid, size: proc.size });
  deallocProcess(pid);
  log(`[SWAP] ${pid} swapped out to disk.`, 'info');
  renderSwapQueue();
}

function swapIn(pid) {
  const idx = MEM.swapQueue.findIndex(p => p.pid === pid);
  if (idx === -1) return;
  const p = MEM.swapQueue[idx];

  const holeIdx = findHole(p.size);
  if (holeIdx === -1) {
    log(`[SWAP] Cannot load ${pid}: no hole ≥ ${p.size}KB.`, 'err'); return;
  }

  MEM.swapQueue.splice(idx, 1);
  // Temporarily inject into allocate flow
  const savedPid  = document.getElementById('inp-pid').value;
  const savedSize = document.getElementById('inp-size').value;
  document.getElementById('inp-pid').value  = p.pid;
  document.getElementById('inp-size').value = p.size;
  allocProcess();
  document.getElementById('inp-pid').value  = savedPid;
  document.getElementById('inp-size').value = savedSize;
}

// ---- COMPACTION --------------------------------------------------

/**
 * startCompaction: Build a series of intermediate memory states
 * (one per allocated block being moved), then enter step-through mode.
 *
 * Compaction shifts all allocated blocks toward address 0,
 * merging all holes into a single large free block at the end.
 * The step-by-step view lets the user trace each block's movement.
 */
function startCompaction() {
  const allocated = MEM.segments.filter(s => !s.isHole);
  if (!allocated.length) { log('[INFO] Nothing to compact.', 'info'); return; }

  // Build steps: each step shows one block being moved into position
  COMPACT.steps = [];
  let steps_cursor = 0;

  // Step 0: original state
  COMPACT.steps.push(JSON.parse(JSON.stringify(MEM.segments)));

  // Generate one intermediate step per allocated block
  let built = [];
  for (const blk of allocated) {
    built.push({ ...blk, start: steps_cursor });
    steps_cursor += blk.size;

    // Fill remaining space with a hole placeholder for this step
    const remaining = CFG.totalMem - steps_cursor;
    const snapshot = [
      ...built.map(b => ({...b})),
      ...(remaining > 0 ? [{ pid:null, size:remaining, start:steps_cursor, isHole:true }] : []),
    ];
    COMPACT.steps.push(snapshot);
  }

  COMPACT.stepIdx = 0;
  COMPACT.active  = true;

  document.getElementById('compact-panel').style.display = '';
  document.getElementById('compact-step-info').style.display = '';

  renderCompactStep();
  log('[SYS] Compaction started. Use step controls to trace movement.', 'sys');
}

function renderCompactStep() {
  const step = COMPACT.steps[COMPACT.stepIdx];
  const bar  = document.getElementById('compact-bar');
  bar.innerHTML = '';

  for (const seg of step) {
    const div = document.createElement('div');
    div.style.cssText = `width:${(seg.size/CFG.totalMem)*100}%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow:hidden; flex-shrink:0;`;
    if (seg.isHole) {
      div.style.background = 'repeating-linear-gradient(-45deg,#f0ede8 0,#f0ede8 5px,#e8e4dc 5px,#e8e4dc 10px)';
      div.style.borderRight = '1px solid #d0cbc0';
      div.innerHTML = `<span style="font-size:9px; color:#9c9690; font-family:'DM Mono',monospace;">FREE<br>${seg.size}KB</span>`;
    } else {
      const proc = MEM.processes.find(p => p.pid === seg.pid);
      const bg   = proc ? proc.color.bg : '#aaa';
      div.style.background = bg;
      div.style.borderRight = '1px solid rgba(255,255,255,.3)';
      div.classList.add('compact-move');
      div.innerHTML = `<span style="font-family:'DM Mono',monospace; font-size:11px; font-weight:700; color:#fff;">${seg.pid}</span><span style="font-size:9px; color:rgba(255,255,255,.8);">${seg.size}KB</span>`;
    }
    bar.appendChild(div);
  }

  const total = COMPACT.steps.length;
  document.getElementById('compact-step-num').innerHTML = `<span class="step-dot"></span> Step ${COMPACT.stepIdx + 1} / ${total}`;
  document.getElementById('compact-prev').disabled = COMPACT.stepIdx === 0;
  document.getElementById('compact-next').disabled = COMPACT.stepIdx >= total - 1;

  const descs = [
    'Original memory state — holes scattered between allocated blocks.',
    ...MEM.segments.filter(s=>!s.isHole).map((s,i) => `Moving ${s.pid} (${s.size}KB) to start position ${i === 0 ? '0' : ''}KB…`),
  ];
  document.getElementById('compact-desc').textContent = descs[Math.min(COMPACT.stepIdx, descs.length-1)];
}

function nextCompactStep() {
  if (COMPACT.stepIdx < COMPACT.steps.length - 1) {
    COMPACT.stepIdx++;
    renderCompactStep();
  }
}

function prevCompactStep() {
  if (COMPACT.stepIdx > 0) {
    COMPACT.stepIdx--;
    renderCompactStep();
  }
}

/** finishCompaction: Apply the final compacted state to actual memory */
function finishCompaction() {
  const finalState = COMPACT.steps[COMPACT.steps.length - 1];
  MEM.segments = JSON.parse(JSON.stringify(finalState));

  // Update process start/end to match compacted positions
  for (const seg of MEM.segments.filter(s => !s.isHole)) {
    const proc = MEM.processes.find(p => p.pid === seg.pid);
    if (proc) {
      proc.start  = seg.start;
      proc.end    = seg.start + seg.size - 1;
      proc.frames = calcFrames(seg.start, seg.size);
    }
  }

  COMPACT.active = false;
  document.getElementById('compact-panel').style.display = 'none';
  document.getElementById('compact-step-info').style.display = 'none';

  log('[SYS] Memory compacted. All holes merged to one free block.', 'sys');
  renderContiguous();
  renderPagingView();
}

// ---- ADDRESS TRANSLATION (CONTIGUOUS) ----------------------------

/**
 * translateAddr: Compute physical address from logical address.
 *
 * CONTIGUOUS SCHEME:
 *   Physical = Relocation Register + Logical Address
 *
 * PAGING SCHEME:
 *   p = floor(Logical / PageSize)  → page number
 *   d = Logical mod PageSize        → offset within page
 *   Physical = (Frame[p] × FrameSize) + d
 *
 * Binary visualizer shows which bits are page# vs offset.
 */
function translateAddr() {
  const logical = parseInt(document.getElementById('inp-logical').value);
  const reloc   = parseInt(document.getElementById('inp-reloc').value) || 0;

  if (isNaN(logical)) { log('[ERR] Invalid logical address.', 'err'); return; }

  const physContiguous = reloc + logical;

  // Paging decomposition
  const p = Math.floor(logical / CFG.frameSize);   // Page number
  const d = logical % CFG.frameSize;               // Page offset

  // Look up frame from page table (find which process owns this page)
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

  // Binary bit display
  const bits = 10; // Use 10 bits for display clarity
  const binStr = logical.toString(2).padStart(bits, '0');
  const offsetBits = Math.ceil(Math.log2(CFG.frameSize + 1));
  const pageBits   = bits - offsetBits;

  const bitHTML = binStr.split('').map((b, i) => {
    const cls = i < pageBits ? 'page-bit' : 'off-bit';
    return `<div class="bit-box ${cls}">${b}</div>`;
  }).join('');

  const transHTML = `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div class="addr-row">
        <span class="addr-label">Logical Address:</span>
        <span class="addr-val">${logical} KB</span>
        <span class="addr-formula">= 0x${logical.toString(16).toUpperCase().padStart(4,'0')}</span>
      </div>

      <div>
        <p style="font-size:11px; font-weight:600; color:var(--text2); margin-bottom:6px;">Binary Breakdown (${bits} bits):</p>
        <div class="bit-row">
          ${bitHTML}
          <span style="margin-left:8px; font-size:11px; color:var(--text3);">← MSB … LSB</span>
        </div>
        <div style="display:flex; gap:20px; margin-top:6px;">
          <div><span class="bit-group-label page-bit-lbl">■ Page # bits (${pageBits}b)</span> = <strong>${p}</strong></div>
          <div><span class="bit-group-label off-bit-lbl">■ Offset bits (${offsetBits}b)</span> = <strong>${d} KB</strong></div>
        </div>
      </div>

      <hr style="border-color:var(--border);"/>

      <div class="addr-row">
        <span class="addr-label">Contiguous Translation:</span>
        <span class="addr-formula">Physical = Reloc(${reloc}) + Logical(${logical})</span>
        <span class="addr-val" style="color:var(--green);">= ${physContiguous} KB ✓</span>
      </div>

      <div class="addr-row">
        <span class="addr-label">Paging Translation:</span>
        <span class="addr-formula">Physical = Frame(${frameNum}) × ${CFG.frameSize} + Offset(${d})</span>
        <span class="addr-val" style="color:var(--accent);">= ${physPaging} KB</span>
      </div>

      ${ownerPid
        ? `<div style="font-size:11px; color:var(--green); background:var(--green-bg); padding:6px 10px; border-radius:5px;">↳ Logical ${logical}KB belongs to process <strong>${ownerPid}</strong></div>`
        : `<div style="font-size:11px; color:var(--red); background:var(--red-bg); padding:6px 10px; border-radius:5px;">↳ Address ${logical}KB is not within any allocated process.</div>`
      }
    </div>`;

  // Show result in contiguous module
  document.getElementById('cont-trans-result').style.display = '';
  document.getElementById('cont-trans-body').innerHTML = transHTML;

  // Also update paging module
  document.getElementById('paging-trans-body').innerHTML = `<div class="addr-block">${transHTML}</div>`;

  log(`[TRANS] Logical ${logical}KB → Contiguous: ${physContiguous}KB | Paging: ${physPaging}KB`, 'sys');
}

// ---- RENDERING: CONTIGUOUS MODULE --------------------------------

/** renderContiguous: Re-render memory bar, process table, swap queue, stats */
function renderContiguous() {
  renderMemBar();
  renderRuler();
  renderProcessTable();
  renderSwapQueue();
  renderStats();
}

function renderMemBar() {
  const bar = document.getElementById('mem-bar');
  bar.innerHTML = '';

  for (const seg of MEM.segments) {
    const div = document.createElement('div');
    div.className = 'mb-seg ' + (seg.isHole ? 'hole' : 'allocated');
    div.style.width = (seg.size / CFG.totalMem * 100) + '%';

    if (!seg.isHole) {
      const proc = MEM.processes.find(p => p.pid === seg.pid);
      if (proc) { div.style.background = proc.color.bg; }
      div.title = `${seg.pid}: ${seg.size}KB (${seg.start}–${seg.start+seg.size-1}KB) — click to free`;
      div.onclick = () => deallocProcess(seg.pid);
      div.innerHTML = `<span class="seg-pid" style="color:#fff;">${seg.pid}</span><span class="seg-size" style="color:rgba(255,255,255,.85);">${seg.size}KB</span><span class="seg-addr" style="color:rgba(255,255,255,.6);">${seg.start}K</span>`;
    } else {
      div.title = `Free hole: ${seg.size}KB @ ${seg.start}KB`;
      div.innerHTML = `<span style="font-size:9px; font-family:'DM Mono'; color:#9c9690;">FREE<br>${seg.size}KB</span>`;
    }
    bar.appendChild(div);
  }

  document.getElementById('mem-range').textContent = `0 — ${CFG.totalMem} KB`;
}

function renderRuler() {
  const ruler = document.getElementById('mem-ruler');
  ruler.innerHTML = '';
  const MARKS = 8;
  for (let i = 0; i <= MARKS; i++) {
    const pct  = (i / MARKS) * 100;
    const addr = Math.round((CFG.totalMem / MARKS) * i);
    const tick = document.createElement('div');
    tick.className = 'ruler-tick';
    tick.style.left = pct + '%';
    tick.textContent = addr + 'K';
    ruler.appendChild(tick);
  }
}

function renderProcessTable() {
  const tbody = document.getElementById('proc-tbody');
  if (!MEM.processes.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px; color:var(--text3);">No active processes</td></tr>`;
    return;
  }
  tbody.innerHTML = MEM.processes.map(p => `
    <tr>
      <td><span class="pid-badge" style="background:${p.color.bg};">${p.pid}</span></td>
      <td>${p.size} KB</td>
      <td><code>${p.start} KB</code></td>
      <td><code>${p.end} KB</code></td>
      <td><code style="font-size:10px;">F${p.frames.join(',F')}</code></td>
      <td>
        <button class="btn btn-sm btn-amber" onclick="swapOut('${p.pid}')">↓ Disk</button>
        <button class="btn btn-sm btn-danger" onclick="deallocProcess('${p.pid}')" style="margin-left:4px;">✕</button>
      </td>
    </tr>
  `).join('');
}

function renderSwapQueue() {
  const list = document.getElementById('swap-list');
  document.getElementById('swap-count').textContent = MEM.swapQueue.length + ' processes';
  if (!MEM.swapQueue.length) {
    list.innerHTML = `<p style="color:var(--text3); font-size:12px; text-align:center; padding:20px 0;">No swapped processes</p>`;
    return;
  }
  list.innerHTML = MEM.swapQueue.map(p => `
    <div class="swap-item">
      <div>
        <strong style="font-size:13px;">${p.pid}</strong>
        <span style="font-size:11px; color:var(--text2); margin-left:6px;">${p.size} KB</span>
      </div>
      <button class="btn btn-sm btn-green" onclick="swapIn('${p.pid}')">↑ Load</button>
    </div>
  `).join('');
}

function renderStats() {
  const usedKB  = MEM.segments.filter(s=>!s.isHole).reduce((a,s)=>a+s.size,0);
  const freeKB  = CFG.totalMem - usedKB;
  const util    = Math.round((usedKB / CFG.totalMem) * 100);
  const holes   = MEM.segments.filter(s=>s.isHole);
  const largest = holes.reduce((m,h)=>Math.max(m,h.size),0);

  document.getElementById('st-util').textContent    = util + '%';
  document.getElementById('st-free').innerHTML      = freeKB + '<small style="font-size:12px;">KB</small>';
  document.getElementById('st-holes').textContent   = holes.length;
  document.getElementById('st-extfrag').innerHTML   = freeKB + '<small style="font-size:12px;">KB</small>';

  // Analytics tab
  document.getElementById('an-total').innerHTML   = CFG.totalMem + '<small style="font-size:12px;">KB</small>';
  document.getElementById('an-used').innerHTML    = usedKB + '<small style="font-size:12px;">KB</small>';
  document.getElementById('an-free').innerHTML    = freeKB + '<small style="font-size:12px;">KB</small>';
  document.getElementById('an-int-frag').innerHTML= '0<small style="font-size:12px;">KB</small>';
  document.getElementById('an-ext-frag').innerHTML= freeKB + '<small style="font-size:12px;">KB</small>';
  document.getElementById('an-largest').innerHTML = largest + '<small style="font-size:12px;">KB</small>';
}

// ===================================================================
// MODULE 2: PAGING VIEW
// ===================================================================

/**
 * renderPagingView: Show physical frames grid and page table.
 * Reads the same MEM.processes state as the contiguous module.
 * Frame# = floor(physical_KB / frameSize)
 */
function renderPagingView() {
  const totalFrames = Math.ceil(CFG.totalMem / CFG.frameSize);

  // Build frame → process lookup
  const frameMap = {};
  for (const p of MEM.processes) {
    p.frames.forEach((f, i) => { frameMap[f] = { proc: p, pageIdx: i }; });
  }

  // Frames grid
  const grid = document.getElementById('frame-grid');
  grid.innerHTML = '';
  let usedFrames = 0;
  for (let f = 0; f < totalFrames; f++) {
    const cell = document.createElement('div');
    cell.className = 'frame-cell';
    const info = frameMap[f];
    if (info) {
      usedFrames++;
      cell.classList.add('used');
      cell.style.borderColor = info.proc.color.bg + '80';
      cell.innerHTML = `
        <div class="fc-num">Frame ${f}</div>
        <div class="fc-pid" style="color:${info.proc.color.bg};">${info.proc.pid}</div>
        <div class="fc-pg">page ${info.pageIdx}</div>
      `;
    } else {
      cell.innerHTML = `<div class="fc-num">Frame ${f}</div><div style="font-size:10px; color:var(--text3);">free</div>`;
    }
    grid.appendChild(cell);
  }
  document.getElementById('frame-count-badge').textContent = `${usedFrames} / ${totalFrames} used`;

  // Page Table
  const pt = document.getElementById('page-table-container');
  if (!MEM.processes.length) {
    pt.innerHTML = `<p style="color:var(--text3); font-size:12px;">Allocate processes to populate the page table.</p>`;
    return;
  }

  let html = `
    <div class="pt-row">
      <div class="pt-cell head">PID</div>
      <div class="pt-cell head">Page #</div>
      <div class="pt-cell head">Frame #</div>
      <div class="pt-cell head">Physical KB</div>
    </div>`;

  for (const p of MEM.processes) {
    p.frames.forEach((f, i) => {
      html += `<div class="pt-row">
        <div class="pt-cell" style="color:${p.color.bg}; font-weight:600;">${p.pid}</div>
        <div class="pt-cell pg">${i}</div>
        <div class="pt-cell fr">${f}</div>
        <div class="pt-cell ph">${f * CFG.frameSize}</div>
      </div>`;
    });
  }
  pt.innerHTML = html;
}

// ===================================================================
// MODULE 3: PAGE REPLACEMENT (COMPLETELY INDEPENDENT)
// ===================================================================

/**
 * Page Replacement runs on its OWN reference string and frame count.
 * It does NOT use MEM.processes at all — fully standalone simulation.
 *
 * FIFO:    Queue-based. Evict the page loaded earliest.
 * OPTIMAL: Look ahead in the reference string; evict the page whose
 *          next use is furthest in the future (or never used again).
 * LRU:     Track last-use timestamp per page; evict the stalest page.
 */

function setPrAlgo(el) {
  document.querySelectorAll('#pr-tabs .algo-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  PR.algo = el.dataset.val;
  document.getElementById('pr-algo-lbl').textContent = el.textContent;
  log(`[CFG] Page Replacement → ${el.textContent}`, 'info');
}

function resetPR() {
  PR.results  = [];
  PR.step     = 0;
  PR.computed = false;
  document.getElementById('pr-refstr-display').innerHTML = `<p style="color:var(--text3); font-size:12px;">Run or step through the simulation.</p>`;
  document.getElementById('pr-sim-grid').innerHTML = `<p style="color:var(--text3); font-size:12px;">Configure settings in the sidebar and press Run or Step.</p>`;
  document.getElementById('pr-step-info').style.display = 'none';
  updatePRCounters([]);
  log('[PR] Simulation reset.', 'info');
}

/** runPR: Compute full simulation and display all steps at once */
function runPR() {
  const nf  = parseInt(document.getElementById('pr-nframes').value) || 3;
  const raw = document.getElementById('pr-refstr').value;
  const ref = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

  if (!ref.length) { log('[ERR] Invalid reference string.', 'err'); return; }

  PR.refStr   = ref;
  PR.nFrames  = nf;
  PR.results  = computePR(ref, nf, PR.algo);
  PR.step     = PR.results.length;
  PR.computed = true;

  renderPRDisplay(PR.results.length);
  updatePRCounters(PR.results);
  recordPRSession();
  log(`[PR] ${PR.algo.toUpperCase()} | Faults: ${PR.results.filter(r=>r.fault).length} | Hits: ${PR.results.filter(r=>!r.fault).length}`, 'ok');
}

/** prStep: Show one step at a time (for step-by-step mode) */
function prStep() {
  const nf  = parseInt(document.getElementById('pr-nframes').value) || 3;
  const raw = document.getElementById('pr-refstr').value;
  const ref = raw.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

  // Recompute if settings changed
  if (!PR.computed || PR.refStr.join() !== ref.join() || PR.nFrames !== nf) {
    PR.refStr   = ref;
    PR.nFrames  = nf;
    PR.results  = computePR(ref, nf, PR.algo);
    PR.step     = 0;
    PR.computed = true;
  }

  if (PR.step < PR.results.length) PR.step++;

  renderPRDisplay(PR.step);
  updatePRCounters(PR.results.slice(0, PR.step));
}

/**
 * computePR: Core simulation engine.
 * Returns array of step objects: {page, frames[], fault, evicted}
 */
function computePR(ref, nFrames, algo) {
  let frames   = [];    // Current frame contents (pages loaded)
  let fifoQ    = [];    // FIFO: insertion order queue
  let lruTime  = {};   // LRU: page → last access time
  let time     = 0;
  const results = [];

  for (let i = 0; i < ref.length; i++) {
    const page = ref[i];
    time++;

    if (frames.includes(page)) {
      // ---- PAGE HIT ----
      if (algo === 'lru') lruTime[page] = time;  // Refresh recency
      results.push({ page, frames: [...frames], fault: false, evicted: null });

    } else {
      // ---- PAGE FAULT ----
      let evicted = null;

      if (frames.length < nFrames) {
        // Frames not full yet — just load
        frames.push(page);
        if (algo === 'fifo') fifoQ.push(page);
        if (algo === 'lru')  lruTime[page] = time;

      } else {
        // Must evict one page
        if (algo === 'fifo') {
          // FIFO: evict the page at the front of the queue (loaded earliest)
          evicted = fifoQ.shift();
          frames[frames.indexOf(evicted)] = page;
          fifoQ.push(page);

        } else if (algo === 'optimal') {
          // OPTIMAL: scan future references to find which page to evict
          const future = ref.slice(i + 1);
          let victim = null, farthest = -1;
          for (const f of frames) {
            const nextUse = future.indexOf(f);
            if (nextUse === -1) { victim = f; break; } // Never used again → perfect evict
            if (nextUse > farthest) { farthest = nextUse; victim = f; }
          }
          evicted = victim;
          frames[frames.indexOf(evicted)] = page;

        } else if (algo === 'lru') {
          // LRU: evict the page with the oldest (smallest) last-use timestamp
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
}

/** renderPRDisplay: Render the simulation grid for the first `upTo` steps */
function renderPRDisplay(upTo) {
  const results  = PR.results;
  const nFrames  = PR.nFrames;
  const refStr   = PR.refStr;

  // Reference string labels row
  const refDiv = document.getElementById('pr-refstr-display');
  refDiv.innerHTML = refStr.map((p, i) => {
    let cls = '';
    if (i < upTo) cls = results[i].fault ? 'fault-lbl' : 'hit-lbl';
    return `<div class="pr-ref-label ${cls}">${p}</div>`;
  }).join('');

  // Simulation columns
  const grid = document.getElementById('pr-sim-grid');
  if (!upTo) { grid.innerHTML = ''; return; }

  // Build grid: nFrames rows × upTo cols
  // We'll render as a flex row of columns
  let html = `<div class="pr-grid">`;

  // Row label column
  html += `<div class="pr-col" style="padding-top:36px;">`;
  for (let f = 0; f < nFrames; f++) {
    html += `<div style="width:32px; height:38px; display:flex; align-items:center; justify-content:center; font-size:10px; color:var(--text3); font-family:'DM Mono',monospace;">F${f}</div>`;
  }
  html += `</div>`;

  for (let i = 0; i < upTo; i++) {
    const r   = results[i];
    const cur = (i === upTo - 1);
    html += `<div class="pr-col ${cur ? 'current' : ''}">`;

    // Column header = reference page + fault/hit label
    html += `<div class="pr-ref-label ${r.fault ? 'fault-lbl' : 'hit-lbl'}" style="${cur ? 'transform:scale(1.08); box-shadow:0 2px 8px rgba(0,0,0,.12);' : ''}">${r.page}</div>`;

    // Frame cells for this step
    for (let f = 0; f < nFrames; f++) {
      const val = r.frames[f];
      let cls   = 'pr-cell';
      let extra = '';

      if (val === undefined) {
        cls += ' empty';
      } else if (!r.fault && val === r.page) {
        cls += ' hit-c';
      } else if (r.fault && val === r.page) {
        cls += ' fault-c';
        if (cur) extra = 'animation: popIn .35s cubic-bezier(.34,1.56,.64,1) forwards;';
      } else {
        // Page is present but not the focal one
      }

      html += `<div class="${cls}" style="${extra}">${val !== undefined ? val : ''}</div>`;
    }

    // Fault / Hit status label
    html += `<div class="pr-status ${r.fault ? 'f' : 'h'}">${r.fault ? 'FAULT' : 'HIT'}</div>`;
    html += `</div>`;
  }

  html += `</div>`;
  grid.innerHTML = html;

  // Update step info
  const si = document.getElementById('pr-step-info');
  si.style.display = '';
  document.getElementById('pr-step-txt').textContent = `${upTo} / ${results.length}`;
}

function updatePRCounters(results) {
  const faults  = results.filter(r => r.fault).length;
  const hits    = results.filter(r => !r.fault).length;
  const rate    = results.length ? Math.round((hits / results.length) * 100) : null;
  document.getElementById('pr-faults').textContent  = faults;
  document.getElementById('pr-hits').textContent    = hits;
  document.getElementById('pr-hitrate').textContent = rate !== null ? rate + '%' : '—';
}

// ===================================================================
// MODULE 4: ANALYTICS
// ===================================================================

function renderAnalytics() {
  renderStats();
  renderCmpLog();
  renderPRSessions();
}

function addCmpLog(pid, size) {
  const freeKB = MEM.segments.filter(s=>s.isHole).reduce((a,s)=>a+s.size,0);
  CMP_LOG.push({
    ts:    new Date().toLocaleTimeString(),
    algo:  MEM.allocAlgo.toUpperCase() + ' FIT',
    pid, size,
    free:  freeKB,
    holes: MEM.segments.filter(s=>s.isHole).length,
  });
  renderCmpLog();
}

function renderCmpLog() {
  const tb = document.getElementById('cmp-log-tbody');
  if (!CMP_LOG.length) {
    tb.innerHTML = `<tr><td colspan="7" style="color:var(--text3); text-align:center; padding:16px;">No sessions recorded.</td></tr>`;
    return;
  }
  tb.innerHTML = [...CMP_LOG].reverse().map(e => `
    <tr>
      <td style="color:var(--text3);">${e.ts}</td>
      <td><span class="badge badge-blue">${e.algo}</span></td>
      <td><strong>${e.pid}</strong></td>
      <td>${e.size} KB</td>
      <td>${e.free} KB</td>
      <td>${e.holes}</td>
      <td><span class="badge badge-green">✓ Success</span></td>
    </tr>
  `).join('');
}

function clearCmpLog() { CMP_LOG = []; renderCmpLog(); }

function recordPRSession() {
  const faults = PR.results.filter(r=>r.fault).length;
  const hits   = PR.results.filter(r=>!r.fault).length;
  PR_SESSIONS.push({
    ts:    new Date().toLocaleTimeString(),
    algo:  PR.algo.toUpperCase(),
    nf:    PR.nFrames,
    refs:  PR.refStr.length,
    faults, hits,
    rate:  Math.round((hits / PR.results.length) * 100),
  });
  renderPRSessions();
}

function renderPRSessions() {
  const tb = document.getElementById('pr-session-tbody');
  if (!PR_SESSIONS.length) {
    tb.innerHTML = `<tr><td colspan="7" style="color:var(--text3); text-align:center; padding:16px;">No sessions.</td></tr>`;
    return;
  }
  tb.innerHTML = [...PR_SESSIONS].reverse().map(s => `
    <tr>
      <td style="color:var(--text3);">${s.ts}</td>
      <td><span class="badge badge-blue">${s.algo}</span></td>
      <td>${s.nf}</td>
      <td>${s.refs}</td>
      <td><span style="color:var(--red); font-weight:600;">${s.faults}</span></td>
      <td><span style="color:var(--green); font-weight:600;">${s.hits}</span></td>
      <td><span class="badge ${s.rate>=50 ? 'badge-green' : 'badge-red'}">${s.rate}%</span></td>
    </tr>
  `).join('');
}

// ===================================================================
// UTILITY
// ===================================================================

function log(msg, type='ok') {
  const box  = document.getElementById('sys-log');
  const div  = document.createElement('div');
  div.className = 'log-' + type;
  div.textContent = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] ${msg}`;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function bumpPid(pid) {
  const m = pid.match(/^([A-Za-z]+)(\d+)$/);
  if (m) document.getElementById('inp-pid').value = m[1] + (parseInt(m[2]) + 1);
}

// ===================================================================
// INITIALIZATION — pre-load demo data so the simulator isn't empty
// ===================================================================
window.addEventListener('DOMContentLoaded', () => {
  resetAll();

  // Pre-allocate demo processes to show off the memory bar
  const demos = [
    { pid:'OS',  size:64  },
    { pid:'P1',  size:192 },
    { pid:'P2',  size:128 },
    { pid:'P3',  size:96  },
  ];

  for (const d of demos) {
    document.getElementById('inp-pid').value  = d.pid;
    document.getElementById('inp-size').value = d.size;
    allocProcess();
  }

  // Set next PID suggestion
  document.getElementById('inp-pid').value  = 'P4';
  document.getElementById('inp-size').value = '128';

  // Show the correct sidebar panels for initial module
  showModule('contiguous');
});