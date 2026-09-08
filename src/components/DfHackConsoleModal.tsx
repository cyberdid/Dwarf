import React, { useState, useRef, useEffect } from 'react';
import { Terminal, X, Play, Pause, RefreshCw, Send, CheckCircle2, Shield, Cpu, Flame, Eye } from 'lucide-react';
import { DfAiState, DfAiLogEntry } from '../engine/dfAiClient';

interface DfHackConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiState: DfAiState;
  onToggleActive: () => void;
  onRunStep: () => void;
  onSendCommand: (cmd: string) => void;
  revealAll: boolean;
  onToggleRevealAll: () => void;
  lang: 'ua' | 'en';
}

export const DfHackConsoleModal: React.FC<DfHackConsoleModalProps> = ({
  isOpen,
  onClose,
  aiState,
  onToggleActive,
  onRunStep,
  onSendCommand,
  revealAll,
  onToggleRevealAll,
  lang,
}) => {
  const [inputVal, setInputVal] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isOpen, aiState.terminalLogs]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    onSendCommand(inputVal.trim());
    setInputVal('');
  };

  const quickCommands = [
    { label: 'df-ai status', cmd: 'df-ai status' },
    { label: 'df-ai step', cmd: 'df-ai step' },
    { label: aiState.isActive ? 'disable df-ai' : 'enable df-ai', cmd: aiState.isActive ? 'disable df-ai' : 'enable df-ai' },
    { label: revealAll ? 'unreveal' : 'reveal map', cmd: revealAll ? 'unreveal' : 'reveal' },
    { label: 'order brew', cmd: 'order brew' },
    { label: 'plan bedrooms', cmd: 'plan bedrooms' },
    { label: 'dig vein', cmd: 'dig vein' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-black border-2 border-emerald-600/90 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col font-mono text-xs overflow-hidden relative shadow-emerald-950/70">
        {/* CRT Scanline Overlay Effect */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-emerald-950/5 to-transparent bg-[length:100%_4px] opacity-40 z-10" />

        {/* Console Header */}
        <div className="bg-stone-900 border-b border-emerald-800/80 px-4 py-2.5 flex items-center justify-between text-emerald-400 select-none z-20">
          <div className="flex items-center gap-2 font-bold tracking-wider">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>DFHack v50.15-r4 Console</span>
            <span className="text-stone-500">|</span>
            <span className="text-amber-400">Plugin: df-ai (Ben Lubar & Gemini 3.8)</span>
          </div>

          <div className="flex items-center gap-2">
            <div className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-1 ${
              aiState.isActive ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-500' : 'bg-stone-800 text-stone-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${aiState.isActive ? 'bg-emerald-400 animate-ping' : 'bg-stone-500'}`} />
              <span>{aiState.isActive ? 'RUNNING' : 'STOPPED'}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-stone-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-stone-950/90 border-b border-stone-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-stone-300 z-20">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-stone-500">Overseer: </span>
              <span className="text-amber-300 font-bold">{aiState.aiModel}</span>
            </div>
            <div>
              <span className="text-stone-500">Cycles: </span>
              <span className="text-emerald-400 font-bold">{aiState.totalCyclesExecuted}</span>
            </div>
            <div>
              <span className="text-stone-500">Directive: </span>
              <span className="text-cyan-300 font-bold">{aiState.directive}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-dfhack-toggle-reveal"
              onClick={onToggleRevealAll}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 transition-colors ${
                revealAll
                  ? 'bg-amber-600 hover:bg-amber-500 text-stone-950 border border-amber-300 shadow-sm'
                  : 'bg-stone-900 hover:bg-stone-800 text-amber-300 border border-amber-700/80'
              }`}
              title={lang === 'ua' ? 'Перемикач розкриття карти (DFHack reveal)' : 'Toggle reveal map (DFHack reveal)'}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{revealAll ? (lang === 'ua' ? 'Карта: ВІДКРИТА' : 'Map: REVEALED') : (lang === 'ua' ? 'Відкрити карту' : 'Reveal map')}</span>
            </button>

            <button
              onClick={onToggleActive}
              className={`px-3 py-1 rounded font-bold flex items-center gap-1.5 transition-colors ${
                aiState.isActive
                  ? 'bg-red-950 hover:bg-red-900 text-red-200 border border-red-700'
                  : 'bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-600'
              }`}
            >
              {aiState.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{aiState.isActive ? 'disable df-ai' : 'enable df-ai'}</span>
            </button>

            <button
              onClick={onRunStep}
              disabled={aiState.isThinking}
              className="px-3 py-1 bg-amber-950 hover:bg-amber-900 text-amber-200 border border-amber-700 rounded font-bold flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${aiState.isThinking ? 'animate-spin' : ''}`} />
              <span>df-ai step</span>
            </button>
          </div>
        </div>

        {/* Live Logs Terminal Screen */}
        <div className="flex-1 p-4 overflow-y-auto space-y-1.5 bg-black text-emerald-400 selection:bg-emerald-800 selection:text-white z-20 min-h-[300px]">
          <div className="text-stone-500 text-[11px] mb-3">
            === Dwarf Fortress DFHack Console / df-ai Autonomous Overseer ===<br />
            Type 'help' or click quick commands below. Gemini continuously observes fortress needs and issues tactical memory designations.
          </div>

          {aiState.terminalLogs.map((log, idx) => (
            <div key={log.id || idx} className="leading-relaxed">
              <span className="text-stone-600 select-none">[{log.timestamp}] </span>
              {log.terminalCommand && (
                <span className="text-cyan-400 font-bold select-none">&gt; {log.terminalCommand}<br /></span>
              )}
              <span className={
                log.type === 'gemini' ? 'text-amber-300 font-semibold' :
                log.type === 'warning' ? 'text-red-400' :
                log.type === 'action' ? 'text-emerald-300' : 'text-emerald-400'
              }>
                {log.text}
              </span>
            </div>
          ))}

          {aiState.isThinking && (
            <div className="text-amber-400 flex items-center gap-2 animate-pulse mt-2">
              <span>[df-ai:gemini] Communicating with Gemini 3.8 Flash Overseer...</span>
            </div>
          )}

          <div ref={logsEndRef} />
        </div>

        {/* Quick Commands Bar */}
        <div className="bg-stone-950 border-t border-stone-800 px-4 py-2 flex flex-wrap items-center gap-1.5 z-20">
          <span className="text-stone-500 text-[10px] uppercase font-bold mr-1">Quick:</span>
          {quickCommands.map(q => (
            <button
              key={q.cmd}
              onClick={() => onSendCommand(q.cmd)}
              className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-emerald-400 hover:text-emerald-200 border border-stone-800 hover:border-emerald-600 rounded text-[11px] transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Input Prompt Form */}
        <form onSubmit={handleSubmit} className="bg-black border-t border-emerald-900/60 p-3 flex items-center gap-2 z-20">
          <span className="text-emerald-500 font-bold select-none">[DFHack # ]</span>
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            placeholder="Type DFHack command or instruction for Gemini (e.g. 'order brew', 'dig deeper')..."
            className="flex-1 bg-transparent border-none outline-none text-emerald-300 placeholder-stone-600 text-xs font-mono"
            autoFocus
          />
          <button
            type="submit"
            className="p-1.5 bg-emerald-900 hover:bg-emerald-800 text-emerald-200 rounded transition-colors"
            title="Send command"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
