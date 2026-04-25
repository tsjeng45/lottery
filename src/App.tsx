/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { RotateCw, Users, Trophy, Settings2, X } from 'lucide-react';

// --- Constants ---
const COLORS = [
  '#38bdf8','#818cf8','#c084fc','#f472b6','#fb7185','#fb923c','#fbbf24','#a3e635','#4ade80','#2dd4bf'
];

interface WinnerModalProps {
  name: string;
  onClose: () => void;
}

const WinnerModal: React.FC<WinnerModalProps> = ({ name, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden bg-slate-800 border-2 border-brand shadow-[0_0_50px_rgba(56,189,248,0.2)] rounded-[24px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-12 text-center">
          <div className="text-[11px] uppercase tracking-[1.5px] text-slate-400 font-semibold mb-2">恭喜獲獎者</div>
          <div className="my-5">
            <span className="text-6xl font-black text-brand font-display tracking-tight leading-tight block">
              {name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="mt-6 px-8 py-2 border border-slate-700 text-slate-400 rounded-full hover:bg-slate-700 hover:text-white transition-all text-sm"
          >
            重新開始
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [inputVal, setInputVal] = useState("陳小明, 林小華, 王大同, 李美玲, 張君豪, 趙之平, 孫志偉, 吳欣怡, 周星馳,鄭秀文");
  const [items, setItems] = useState<string[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [history, setHistory] = useState<{name: string, time: string}[]>([]);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const requestRef = useRef<number>(0);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('draw_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  // Parse items from input
  useEffect(() => {
    const list = inputVal.split(/[,\n]+/).map(s => s.trim()).filter(s => s !== "");
    setItems(list);
  }, [inputVal]);

  // Drawing logic
  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || items.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 260;
    const insideRadius = 40;
    const textRadius = 180;
    const anglePerItem = (Math.PI * 2) / items.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    items.forEach((item, i) => {
      const startAngle = rotationRef.current + i * anglePerItem;
      const endAngle = startAngle + anglePerItem;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.arc(centerX, centerY, insideRadius, endAngle, startAngle, true);
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();

      // Draw Text
      ctx.save();
      ctx.translate(centerX + Math.cos(startAngle + anglePerItem / 2) * textRadius, centerY + Math.sin(startAngle + anglePerItem / 2) * textRadius);
      ctx.rotate(startAngle + anglePerItem / 2 + Math.PI / 2);
      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 16px sans-serif";
      // Truncate long text
      const displayText = item.length > 10 ? item.substring(0, 8) + "..." : item;
      ctx.fillText(displayText, 0, 0);
      ctx.restore();
    });

    // Center Hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, insideRadius + 10, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 4;
    ctx.stroke();
  }, [items]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  const spin = () => {
    if (isSpinning || items.length === 0) return;

    setIsSpinning(true);
    setWinner(null);
    
    // Random physics parameters
    const minSpins = 5;
    const maxSpins = 10;
    const spinAngleStart = Math.random() * 10 + 10;
    const spinTimeTotal = Math.random() * 3000 + 4000;
    
    const startTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / spinTimeTotal, 1);

      // Ease out cubic logic from design spec
      // b + c * (tc + -3 * ts + 3 * t)
      const t = progress;
      const ts = t * t;
      const tc = ts * t;
      const easedProgress = (tc + -3 * ts + 3 * t);
      
      const spinAngleIncrement = spinAngleStart - (spinAngleStart * easedProgress);
      rotationRef.current += (spinAngleIncrement * Math.PI / 180);
      
      drawWheel();

      if (progress < 1) {
        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        
        // Calculate winner
        const pointerAngle = -Math.PI / 2;
        let relativePointer = (pointerAngle - rotationRef.current) % (Math.PI * 2);
        if (relativePointer < 0) relativePointer += Math.PI * 2;
        
        const anglePerItem = (Math.PI * 2) / items.length;
        const winnerIndex = Math.floor(relativePointer / anglePerItem) % items.length;
        const luckyOne = items[winnerIndex];
        
        setWinner(luckyOne);

        // Record history
        const newRecord = { name: luckyOne, time: new Date().toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' }) };
        setHistory(prev => {
          const updated = [newRecord, ...prev].slice(0, 20); // Keep latest 20
          localStorage.setItem('draw_history', JSON.stringify(updated));
          return updated;
        });

        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: COLORS
        });
      }
    };

    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f172a]">
      <main className="w-full max-w-[1024px] h-[768px] bg-[#1e293b] flex shadow-2xl border border-slate-700 overflow-hidden relative">
        
        {/* Sidebar */}
        <aside className="w-[320px] bg-[#0f172a] border-r border-slate-700 p-10 flex flex-col justify-between">
          <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <h1 className="text-2xl font-black text-white font-display mb-2">抽籤大轉盤</h1>
              <p className="text-slate-500 text-sm">請輸入抽籤名單，以逗號或換行分隔。</p>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[11px] uppercase tracking-[1.5px] text-slate-400 font-semibold">
                參與名單
              </label>
              <textarea
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                className="w-full h-[180px] bg-[#1e293b] border border-slate-700 rounded-lg p-3 text-sm text-slate-200 outline-none focus:border-brand transition-colors resize-none"
                placeholder="輸入名字..."
              />
            </div>

            {/* History Section */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-[1.5px] text-slate-400 font-semibold">
                  抽籤紀錄
                </label>
                {history.length > 0 && (
                  <button 
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem('draw_history');
                    }}
                    className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                  >
                    清除全部
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-slate-600 italic">尚無抽籤紀錄</div>
                ) : (
                  history.map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 p-2 rounded-md border border-slate-700/50">
                      <span className="text-sm text-slate-200 font-medium truncate max-w-[120px]">{record.name}</span>
                      <span className="text-[10px] text-slate-500">{record.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button
            onClick={spin}
            disabled={isSpinning || items.length === 0}
            className="w-full bg-brand text-[#0f172a] font-extrabold uppercase py-5 rounded-lg text-lg shadow-[0_4px_15px_rgba(56,189,248,0.3)] hover:bg-[#7dd3fc] hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed disabled:shadow-none transition-all"
          >
            {isSpinning ? '轉動中...' : '開始抽籤'}
          </button>
        </aside>

        {/* Wheel Display Area */}
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,#1e293b_0%,#0f172a_100%)] relative">
          
          {/* Pointer */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-10 filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-red-500" />
          </div>

          {/* Wheel */}
          <div className="relative filter drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <canvas
              ref={canvasRef}
              width={560}
              height={560}
              className="max-w-full h-auto"
            />
          </div>
        </div>

        {/* Celebration Modal */}
        <AnimatePresence>
          {winner && (
            <WinnerModal name={winner} onClose={() => setWinner(null)} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
