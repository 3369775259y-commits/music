import React, { useMemo, useEffect, useRef } from 'react';
import { AppMode, SongData, HandData, LyricLine } from '../types';
import { SONGS, TABS } from '../constants';
import { Activity, Move, MousePointerClick, Disc, Cpu, Zap, Hand, ThumbsUp } from 'lucide-react';

interface HUDLayerProps {
  currentMode: AppMode;
  handData: HandData;
  onTabSelect: (mode: AppMode) => void;
  hoveredTab: AppMode | null;
  currentTime: number; // Current playback time in seconds
  isPlaying: boolean;
}

// Helper to parse LRC
const parseLRC = (lrc: string): LyricLine[] => {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

  lines.forEach((line) => {
    const match = timeReg.exec(line);
    if (match) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = parseInt(match[3], 10);
      const time = min * 60 + sec + ms / (match[3].length === 3 ? 1000 : 100);
      const text = line.replace(timeReg, '').trim();
      if (text) result.push({ time, text });
    }
  });
  return result;
};

export const HUDLayer: React.FC<HUDLayerProps> = ({ currentMode, handData, onTabSelect, hoveredTab, currentTime, isPlaying }) => {
  const song = SONGS[currentMode];
  
  // Memoize parsed lyrics
  const lyrics = useMemo(() => parseLRC(song.lrcString), [song.lrcString]);
  
  // Find active line
  const activeLineIndex = useMemo(() => {
    // Find the last line that has a time <= currentTime
    let index = -1;
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime >= lyrics[i].time) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }, [currentTime, lyrics]);

  // Scroll ref
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const activeLineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeLineRef.current) {
        activeLineRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
        });
    }
  }, [activeLineIndex]);

  // --- THEME ENGINE ---
  const getThemeColors = (mode: AppMode) => {
    switch (mode) {
      case AppMode.SNOW: 
        return {
          text: 'text-cyan-400',
          border: 'border-cyan-400',
          glow: 'shadow-[0_0_10px_rgba(34,211,238,0.8)]',
          bg: 'bg-black/80',
          accent: 'bg-cyan-400',
        };
      case AppMode.RAIN: 
        return {
          text: 'text-indigo-200',
          border: 'border-white/20',
          glow: 'shadow-[0_0_20px_rgba(99,102,241,0.4)]',
          bg: 'bg-blue-900/40 backdrop-blur-xl',
          accent: 'bg-indigo-400',
        };
      case AppMode.JELLYFISH: 
      default:
        return {
          text: 'text-teal-300',
          border: 'border-teal-500',
          glow: 'shadow-[0_0_15px_rgba(20,184,166,0.6)]',
          bg: 'bg-teal-950/60',
          accent: 'bg-teal-400',
        };
    }
  };

  const theme = getThemeColors(currentMode);

  // --- TAB RENDERER ---
  const renderTabs = () => {
    return (
      <div className="flex justify-center items-start gap-4 pt-4 w-full z-50 pointer-events-auto">
        {TABS.map((tab) => {
          const isActive = currentMode === tab.id;
          const isHovered = hoveredTab === tab.id;
          
          let tabStyle = "";
          if (currentMode === AppMode.SNOW) {
            tabStyle = `
              skew-x-[-20deg] border-2 uppercase font-mono tracking-widest
              ${isActive ? 'bg-cyan-400 text-black border-cyan-400' : 'bg-black/80 text-cyan-500 border-cyan-800'}
              ${isHovered && !isActive ? 'border-white text-white' : ''}
            `;
          } else if (currentMode === AppMode.RAIN) {
             tabStyle = `
               rounded-full backdrop-blur-md border border-white/10 font-sans tracking-wide
               ${isActive ? 'bg-indigo-500/50 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)]' : 'bg-white/5 text-indigo-200'}
               ${isHovered && !isActive ? 'bg-white/20' : ''}
             `;
          } else {
             tabStyle = `
               border border-teal-500/50 font-hud tracking-[0.2em]
               ${isActive ? 'bg-teal-500/20 text-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-black/60 text-teal-700'}
               ${isHovered && !isActive ? 'text-teal-100 border-teal-300' : ''}
             `;
          }

          return (
            <div
              key={tab.id}
              className={`
                relative w-48 h-14 flex items-center justify-center
                cursor-pointer transition-all duration-300 group
                ${tabStyle}
              `}
              onClick={() => onTabSelect(tab.id as AppMode)}
            >
              <span className={currentMode === AppMode.SNOW ? 'skew-x-[20deg]' : ''}>
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // --- CONTENT RENDERER ---
  const renderContent = () => {
    // 1. SNOW MODE INTERFACE (Tech/Hexagon - ENRICHED & BOLDER)
    if (currentMode === AppMode.SNOW) {
      return (
        <div className="flex flex-1 items-center justify-between mt-8 w-full px-16 font-mono overflow-hidden">
          
          {/* --- BOLDER RECORD PLAYER --- */}
          <div className="relative w-96 h-96 flex items-center justify-center shrink-0 perspective-1000">
             
             {/* Background Glow */}
             <div className="absolute inset-0 bg-cyan-500/10 blur-3xl rounded-full animate-pulse" />

             {/* Background Static Elements - Darker and Solid */}
             <div className="absolute inset-[-30px] border-[2px] border-cyan-900/50 rounded-full bg-black/40" />
             <div className="absolute inset-[-15px] border-[6px] border-dashed border-cyan-900/40 rounded-full animate-[spin_60s_linear_infinite]" />

             {/* 1. Outer Tech Ring (Rotating) - Thicker & Filled */}
             <div className="absolute inset-[-5px] bg-cyan-950/30 border-[3px] border-cyan-500/60 clip-path-polygon-[50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%] animate-[spin_20s_linear_infinite] shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                 {/* Decorative marks on the ring */}
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-cyan-400" />
                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-6 bg-cyan-400" />
             </div>
             
             {/* 2. Counter-Rotating Inner Ring - High Contrast */}
             <div className="absolute inset-4 border-[2px] border-cyan-300 clip-path-polygon-[50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%] animate-[spin_15s_linear_infinite_reverse]" />

             {/* 3. The "Record" - Data Cube Core - Solid Presence */}
             <div className={`relative w-56 h-56 bg-cyan-950/80 backdrop-blur-xl border-2 border-cyan-400 flex items-center justify-center overflow-hidden transition-transform duration-1000 shadow-[0_0_30px_rgba(6,182,212,0.4)] ${isPlaying ? 'scale-100' : 'scale-95 grayscale'}`}>
                
                {/* Tech Grid Background - Brighter */}
                <div className="absolute inset-0 opacity-40" 
                     style={{ backgroundImage: 'linear-gradient(cyan 1px, transparent 1px), linear-gradient(90deg, cyan 1px, transparent 1px)', backgroundSize: '20px 20px' }} 
                />
                
                {/* Rotating Diamond Core - Solid */}
                <div className={`w-32 h-32 border-[4px] border-cyan-300 rotate-45 flex items-center justify-center bg-black/50 ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    <div className="w-20 h-20 bg-cyan-500 border border-white flex items-center justify-center shadow-[0_0_20px_cyan]">
                        <div className="w-12 h-12 bg-white animate-pulse" />
                    </div>
                </div>

                {/* Scanning Laser Line */}
                <div className={`absolute left-0 right-0 h-2 bg-white shadow-[0_0_15px_white] ${isPlaying ? 'animate-scan-vertical' : 'hidden'}`} />

                {/* Corner Accents - Chunky */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-cyan-300" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-cyan-300" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-cyan-300" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-cyan-300" />
             </div>

             {/* 4. Peripheral Stats / Text */}
             <div className="absolute -right-12 top-10 flex flex-col gap-2 text-xs text-cyan-400 font-bold tracking-wider bg-black/80 p-2 border border-cyan-800">
                <span>R: {isPlaying ? Math.floor(Math.random() * 999) : '000'}</span>
                <span>G: {isPlaying ? Math.floor(Math.random() * 999) : '000'}</span>
                <span>B: {isPlaying ? Math.floor(Math.random() * 999) : '000'}</span>
             </div>

             <div className="absolute -left-16 bottom-16 text-xs text-white font-bold bg-cyan-600 px-3 py-1 -rotate-90 origin-right flex items-center gap-2 shadow-lg">
                <Disc size={14} />
                <span>ACTIVE.DISC</span>
             </div>

             {/* Bottom Label Box */}
             <div className="absolute -bottom-20 w-72 h-14 border-2 border-cyan-600 bg-black flex items-center justify-between px-4 shadow-[0_0_15px_rgba(6,182,212,0.4)]">
               <div className="flex flex-col">
                  <span className="text-cyan-500 text-[10px] font-bold">TRACK_ID</span>
                  <span className="text-white text-sm font-black tracking-widest">#4902-X</span>
               </div>
               <div className="h-full w-0.5 bg-cyan-600" />
               <div className="flex items-center gap-2 text-cyan-300">
                  <Activity size={20} className={isPlaying ? 'animate-pulse text-white' : ''} />
                  <span className="text-sm font-bold">{isPlaying ? 'LIVE' : 'OFF'}</span>
               </div>
             </div>
          </div>

          {/* Terminal Style Lyrics - Large Font */}
          <div className="w-1/2 h-[400px] flex flex-col items-end overflow-hidden mask-linear-fade" ref={lyricsContainerRef}>
             <div className="border-l-4 border-cyan-500 pl-8 space-y-6 text-right w-full">
                <h2 className="text-4xl font-bold text-white mb-8 tracking-tighter drop-shadow-[0_0_5px_rgba(0,0,0,1)]">
                  <span className="text-cyan-400">&lt;</span> {song.title} <span className="text-cyan-400">/&gt;</span>
                </h2>
                {lyrics.map((line, i) => {
                   const isActive = i === activeLineIndex;
                   return (
                    <div key={i} ref={isActive ? activeLineRef : null} 
                         className={`transition-all duration-500 ${isActive ? 'scale-105 opacity-100 text-cyan-100 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'opacity-40 scale-95 text-cyan-700'}`}>
                      {/* Font Size: text-4xl for active, text-2xl for others */}
                      <p className={`font-bold ${isActive ? 'text-4xl' : 'text-2xl'}`}>
                          {isActive ? '> ' : ''} {line.text}
                      </p>
                    </div>
                   );
                })}
             </div>
          </div>
        </div>
      );
    }

    // 2. RAIN MODE INTERFACE (Glass/Liquid)
    if (currentMode === AppMode.RAIN) {
      return (
        <div className="flex flex-1 items-center justify-center mt-8 w-full gap-12 overflow-hidden">
          {/* Glass Card Container */}
          <div className="w-full max-w-5xl h-[60vh] bg-indigo-900/20 backdrop-blur-xl rounded-[3rem] border border-white/10 flex items-center p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
             
             <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -z-10 animate-pulse" />
             <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl -z-10 animate-pulse" style={{animationDelay: '1s'}} />

             <div className="w-1/3 flex flex-col items-center z-10 shrink-0">
                <div className="w-64 h-64 rounded-full bg-black border-4 border-indigo-500/30 shadow-2xl flex items-center justify-center relative overflow-hidden">
                   <div className={`absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-transparent ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`} />
                   <div className="w-20 h-20 rounded-full bg-indigo-500 blur-md opacity-50 absolute" />
                   <div className="w-2 h-2 rounded-full bg-white z-20" />
                </div>
                <div className="mt-6 text-center">
                  <h2 className="text-3xl font-serif italic text-indigo-100">{song.title}</h2>
                  <p className="text-indigo-300 text-sm mt-2">{song.artist}</p>
                </div>
             </div>

             {/* Lyrics with soft typography */}
             <div className="w-2/3 h-full overflow-hidden flex flex-col relative mask-linear-fade" ref={lyricsContainerRef}>
                 <div className="flex-1 overflow-y-auto no-scrollbar py-[30vh]">
                    {lyrics.map((line, i) => {
                      const isActive = i === activeLineIndex;
                      return (
                        <div key={i} ref={isActive ? activeLineRef : null} 
                             className={`text-center py-4 transition-all duration-700 transform ${isActive ? 'scale-110 opacity-100 blur-none' : 'scale-90 opacity-30 blur-[1px]'}`}>
                            <p className={`text-2xl font-light tracking-wide text-indigo-50`}>
                                {line.text}
                            </p>
                        </div>
                      );
                    })}
                 </div>
             </div>
          </div>
        </div>
      );
    }

    // 3. JELLYFISH MODE INTERFACE (Cyberpunk/Original)
    return (
      <div className="flex flex-1 items-center justify-between mt-8 w-full px-12 overflow-hidden">
        {/* Cyberpunk HUD Ring - Enhanced Size & Detail */}
        <div className="w-1/3 flex justify-center shrink-0">
           <div className="relative w-96 h-96">
              
              {/* Outer Decorative Ticks */}
              <div className="absolute inset-[-20px] rounded-full border border-teal-900/30 flex items-center justify-center">
                  <div className="absolute top-0 w-1 h-4 bg-teal-800" />
                  <div className="absolute bottom-0 w-1 h-4 bg-teal-800" />
                  <div className="absolute left-0 w-4 h-1 bg-teal-800" />
                  <div className="absolute right-0 w-4 h-1 bg-teal-800" />
              </div>

              {/* Outer Dashed Ring (Slow Spin) */}
              <div className={`absolute inset-0 border-[3px] border-dashed border-teal-500/50 rounded-full ${isPlaying ? 'animate-[spin_20s_linear_infinite]' : ''}`} />
              
              {/* Inner Solid Ring (Fast Reverse Spin) */}
              <div className={`absolute inset-4 border border-teal-400/30 rounded-full ${isPlaying ? 'animate-[spin_15s_linear_infinite_reverse]' : ''}`} />
              
              {/* Main Vinyl Disc */}
              <div className="absolute inset-0 flex items-center justify-center">
                 <div className={`relative w-80 h-80 bg-black rounded-full shadow-[0_0_50px_rgba(20,184,166,0.3)] flex items-center justify-center overflow-hidden ${isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
                    
                    {/* Vinyl Texture & Sheen */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-black via-teal-950/40 to-black opacity-80" />
                    <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_20%,#0f172a_21%,#0f172a_22%,transparent_23%,transparent_25%,#0f172a_26%,#0f172a_27%,transparent_28%)] opacity-40 bg-[length:10px_10px]" />
                    
                    {/* Grooves */}
                    <div className="absolute inset-[15%] rounded-full border border-teal-800/20" />
                    <div className="absolute inset-[25%] rounded-full border border-teal-800/20" />
                    <div className="absolute inset-[35%] rounded-full border border-teal-800/20" />

                    {/* Center Label */}
                    <div className="absolute w-32 h-32 bg-teal-950 rounded-full border-2 border-teal-600 flex items-center justify-center shadow-inner z-10">
                         <div className="text-[10px] font-mono text-teal-400 text-center leading-tight tracking-widest">
                            CYBER<br/>AUDIO<br/>V.2.0
                         </div>
                    </div>
                 </div>
              </div>

              {/* Laser / Stylus Arm */}
              <div className="absolute top-1/2 -right-8 w-32 h-1 bg-teal-500/50 origin-right rotate-[-15deg] z-20 shadow-[0_0_10px_cyan]">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] animate-pulse" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-teal-500 rounded-full border border-white" />
              </div>

              {/* Text Info Side */}
              <div className="absolute -right-24 top-0 text-right">
                 <h2 className="text-5xl font-hud font-bold text-teal-300 drop-shadow-[0_0_10px_rgba(20,184,166,1)]">{song.title}</h2>
                 <p className="text-teal-500 tracking-[0.5em] text-lg mt-2">{song.artist}</p>
                 
                 {/* RPM / Status */}
                 <div className="flex justify-end gap-3 mt-4 items-center font-mono text-xs text-teal-600">
                    <span className="animate-pulse">● LIVE INPUT</span>
                    <span className="border border-teal-800 px-1">33 RPM</span>
                 </div>
              </div>

           </div>
        </div>

        {/* HUD Bars Lyrics */}
        <div className="w-1/2 h-[400px] relative overflow-hidden mask-linear-fade" ref={lyricsContainerRef}>
           <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-teal-500 to-transparent" />
           <div className="space-y-4 pl-8 pt-[150px] pb-[150px]">
              {lyrics.map((line, i) => {
                 const isActive = i === activeLineIndex;
                 return (
                    <div key={i} ref={isActive ? activeLineRef : null} className={`flex items-center gap-4 group transition-all duration-300 ${isActive ? 'translate-x-4' : 'opacity-40'}`}>
                        <div className={`h-1 bg-teal-800 transition-all duration-300 ${isActive ? 'w-12 bg-teal-400 shadow-[0_0_10px_cyan]' : 'w-4'}`} />
                        <p className={`font-hud text-2xl tracking-wider ${isActive ? 'text-teal-100' : 'text-teal-800'}`}>{line.text}</p>
                    </div>
                 );
              })}
           </div>
        </div>
      </div>
    );
  };

  const cursorStyle = {
    left: `${handData.x * 100}%`,
    top: `${handData.y * 100}%`,
    opacity: handData.isPresent ? 1 : 0,
    transform: `translate(-50%, -50%)`,
  };

  return (
    <div className={`absolute inset-0 z-20 flex flex-col justify-between pointer-events-none select-none transition-colors duration-700 pb-8`}>
      {renderTabs()}
      {renderContent()}
      
      {/* Footer */}
      <div className={`flex justify-center items-center pb-4 opacity-70 ${theme.text}`}>
         <div className={`px-6 py-2 rounded-full border ${theme.border} ${theme.bg} flex items-center gap-4`}>
            <div className="flex items-center gap-2 text-xs font-mono">
               <Move size={14} />
               <span>HOVER TOP</span>
            </div>
            <div className="w-px h-4 bg-current opacity-30" />
            <div className="flex items-center gap-2 text-xs font-mono">
               <ThumbsUp size={14} />
               <span>OK SIGN TO SWITCH</span>
            </div>
         </div>
      </div>

      {/* Cursor */}
      <div 
        className={`absolute w-12 h-12 z-50 flex items-center justify-center transition-opacity duration-200`}
        style={cursorStyle}
      >
        <div className={`
          absolute inset-0 border-2 rounded-full 
          ${hoveredTab ? 'border-solid scale-125 border-white bg-white/10' : 'border-dashed border-white/50'}
          animate-[spin_4s_linear_infinite] transition-all duration-300
        `} />
        
        <div className={`w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]`} />
        
        {handData.isPinching && (
            <div className={`absolute inset-[-8px] border-2 border-white rounded-full animate-ping`} />
        )}
      </div>

    </div>
  );
};