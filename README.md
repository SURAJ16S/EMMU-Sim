# 🖥️ Advanced MMU & Memory Management Simulator

**A High-Fidelity Pedagogical Sandbox for Operating Systems Engineering.**

The **Advanced MMU Simulator** is a professional-grade, interactive educational tool designed to visualize the complex interplay between hardware-level memory management and operating system logic. It provides a granular look into contiguous allocation, paging pipelines, address translation schematics, and page replacement strategies.

---

## 🚀 Core Educational Features

### 🧱 1. Memory Allocation & Fragmentation Diagnostics
Observe historical and real-time memory loss through advanced allocation modeling.
*   **Algorithms**: First Fit, Best Fit, and Worst Fit.
*   **Analytics**: 
    *   **External Fragmentation**: Real-time counter of total unusable memory "gaps".
    *   **Max Possible Allocation**: Identifies the largest contiguous hole (the hardware limit for new processes).
    *   **Fragmentation Index**: A health score ranging from 0.0 (Perfect) to 1.0 (Scattered), calculated as `(FreeSpace - MaxHole) / FreeSpace`.
*   **Interactive Compaction**: A step-by-step visual of memory shuffling to merge holes.

### 📄 2. Paging Explorer 2.0 (The Pipeline)
A process-centric visualization of virtual-to-physical mapping.
*   **3-Column Pipeline**:
    1.  **Logical Space**: The process's isolated view of its own memory (Pages 0 to N).
    2.  **Page Table**: The hardware mapping structure unique to each Process ID (PID).
    3.  **Physical RAM**: The underlying hardware frame grid.
*   **Interactive Focus**: Hovering over a page table entry draws a high-visibility path across the entire hardware stack, demonstrating how the MMU hardware resolves the location.

### 🧮 3. Hardware Address Translation Schematic
A bit-level breakdown of MMU circuitry.
*   **Bit-Level Precision**: The simulator dynamically calculates bit counts using `Math.log2(totalMem)` and `Math.log2(frameSize)`.
*   **Binary Breakdown**: Real-time conversion of addresses into **Page (p)** and **Offset (d)** bits.
*   **Hardware Validation**: 
    *   **PTR Pointer**: A vertical indicator within the Physical RAM frame that moves based on the **offset (d)**.
    *   **Bounds Checker**: Triggers a `⚡ BOUNDS ERROR` if the offset exceeds the frame size, demonstrating hardware-level protection.
    *   **Manual Overrides**: "Edit" mode allows students to manually forge CPU registers to test Page Faults and segmentation logic.

### 🔄 4. Page Replacement Algorithms
Compare eviction strategies using real-time hits/faults telemetry.
*   **Strategies**: FIFO (First-In-First-Out), LRU (Least Recently Used), and Optimal.
*   **Visual Step-Through**: Watch frames populate and evict pages according to the chosen strategy.

---

## 📂 Project Architecture & File Structure

The project follows a modular React architecture with a centralized **Simulator Context** serving as the hardware state store.

```text
├── src/
│   ├── components/
│   │   ├── shared/                # Reusable Hardware Components
│   │   │   ├── AllocationPanel.jsx      # Dynamic forms for PID/Size allocation
│   │   │   ├── AnimatedTranslationDiagram # SVG hardware schematic & logic
│   │   │   ├── MemoryVisualizer.jsx     # Horizontal RAM segmentation view
│   │   │   ├── PagingVisualizer.jsx     # 3-column Paging Explorer 2.0 logic
│   │   │   └── ProcessVisualizer.jsx    # Managed process list and contexts
│   │   ├── AnalyticsModule.jsx          # Graphs and historical usage trackers
│   │   ├── ContiguousModule.jsx         # Fragmentation and allocation lab
│   │   ├── PagingModule.jsx             # Process-specific translation lab
│   │   ├── ProcessModule.jsx            # Core system control center
│   │   ├── ReplacementModule.jsx        # Page fault and eviction lab
│   │   ├── Sidebar.jsx                  # Global system configuration (MemSize/FrameSize)
│   │   ├── TranslationModule.jsx        # Integrated math & schematic lab
│   │   └── TranslationResult.jsx        # Mathematical breakdown card
│   ├── SimulatorContext.jsx             # THE BRAIN: Centralized hardware state
│   ├── index.css                        # Design system, tokens, and animations
│   └── App.jsx                          # Root layout and module routing
```

---

## 🧠 Internal Working of Key Features

### State Management (`SimulatorContext.jsx`)
The hardware state is governed by three primary objects:
-   **`CFG`**: Global constants including `totalMem` and `frameSize`.
-   **`MEM`**: The active memory layout, containing `segments` (physical holes/blocks) and `processes` (logical owners).
-   **`PR`**: Page replacement state, including the reference string and compute results.

### Fragmentation Index Logic
We implement the fragmentation index to teach how memory scattering affects allocation:
```javascript
const extFrag = freeSpace - largestHole;
const fragIndex = (freeSpace - largestHole) / freeSpace;
```

### Logical to Physical Bit Splitting
The MMU schematic uses dynamic bit-masking to show how the CPU splits an address:
```javascript
const bits = Math.ceil(Math.log2(totalMem));
const offsetBits = Math.ceil(Math.log2(frameSize));
const pageBits = bits - offsetBits;
```

---

## 🛠️ Installation & Deployment

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm (v9 or higher)

### Setup Commands
1.  **Clone**: `git clone https://github.com/SURAJ16S/EMMU-Sim.git`
2.  **Install**: `npm install`
3.  **Launch**: `npm run dev`

### Production Build
To generate a static optimized bundle:
```bash
npm run build
```

---

## 🎨 Design System
*   **Typography**: DM Sans (Secondary: Monospace for address data).
*   **Aesthetics**: Glassmorphism effects with curated HSL color tokens.
*   **Animations**: Custom CSS `fade-in`, `flow-arrow` (path dash-arrays), and `pulse` effects for hardware pointers.

---
*Developed for academic OS Laboratories. Designed for clarity, accuracy, and interactive learning.*
