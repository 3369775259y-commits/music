import React, { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { GoogleGenAI } from "@google/genai";
import { initializeHandLandmarker } from './services/mediapipeService';
import { WebcamBackground } from './components/WebcamBackground';
import { HUDLayer } from './components/HUDLayer';
import { Visualizer } from './components/Visualizer';
import { AppMode, HandData, SongData } from './types';
import { SONGS, TABS } from './constants';
import { Play, Upload, AlertCircle, Loader2 } from 'lucide-react';

// Helper to convert file to base64 for Gemini API
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const App: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [mode, setMode] = useState<AppMode>(AppMode.JELLYFISH);
  const [handData, setHandData] = useState<HandData>({
    x: 0.5,
    y: 0.5,
    isPinching: false,
    pinchDistance: 0,
    isPresent: false,
  });
  const [hoveredTab, setHoveredTab] = useState<AppMode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Audio State - Start empty to avoid "no supported source" error on load
  const [audioSrc, setAudioSrc] = useState('');
  const [audioError, setAudioError] = useState(false);
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  
  // Dynamic Song Data State
  const [songData, setSongData] = useState<SongData>(SONGS[AppMode.JELLYFISH]);

  const lastVideoTimeRef = useRef(-1);
  const requestRef = useRef<number>(0);
  const lastSwitchTimeRef = useRef<number>(0);

  useEffect(() => {
    const setupMediaPipe = async () => {
      try {
        const landmarker = await initializeHandLandmarker();
        setIsLoading(false);
        startDetectionLoop(landmarker);
      } catch (error) {
        console.error("Failed to load MediaPipe:", error);
        setIsLoading(false); 
      }
    };

    setupMediaPipe();
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update song data when mode changes, ONLY if we haven't uploaded a custom song
  useEffect(() => {
    if (!isFileUploaded) {
        setSongData(SONGS[mode]);
    } else {
        // If file is uploaded, keep the custom lyrics/title, but update the theme coverColor
        setSongData(prev => ({
            ...prev,
            coverColor: SONGS[mode].coverColor
        }));
    }
  }, [mode, isFileUploaded]);

  // Audio Sync Loop
  useEffect(() => {
    const syncTime = () => {
      if (audioRef.current && !audioRef.current.paused) {
        setCurrentTime(audioRef.current.currentTime);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
      requestAnimationFrame(syncTime);
    };
    const id = requestAnimationFrame(syncTime);
    return () => cancelAnimationFrame(id);
  }, [hasStarted]);

  const startDetectionLoop = (landmarker: any) => {
    const loop = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4
      ) {
        const video = webcamRef.current.video;
        const startTimeMs = performance.now();

        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const detections = landmarker.detectForVideo(video, startTimeMs);

          if (detections.landmarks && detections.landmarks.length > 0) {
            const now = Date.now();
            
            // --- GESTURE & TRACKING ---
            const landmarks = detections.landmarks[0];
            
            // 1. Calculate Centroid
            const keyPoints = [0, 5, 9, 13, 17].map(i => landmarks[i]);
            let sumX = 0, sumY = 0;
            keyPoints.forEach(p => { sumX += p.x; sumY += p.y; });
            const centroidX = 1 - (sumX / keyPoints.length);
            const centroidY = sumY / keyPoints.length;

            // 2. Landmarks for Gestures
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const middleTip = landmarks[12];
            const ringTip = landmarks[16];
            const pinkyTip = landmarks[20];

            // 3. Pinch Detection (Thumb + Index)
            const pinchDx = indexTip.x - thumbTip.x;
            const pinchDy = indexTip.y - thumbTip.y;
            const pinchDistance = Math.sqrt(pinchDx*pinchDx + pinchDy*pinchDy);
            const isPinching = pinchDistance < 0.06;

            // 4. OK Sign Detection (Switch Mode)
            // Logic: Pinching (Thumb+Index) AND Other fingers are Extended (Far from wrist)
            const middleDist = Math.sqrt(Math.pow(middleTip.x - wrist.x, 2) + Math.pow(middleTip.y - wrist.y, 2));
            const ringDist = Math.sqrt(Math.pow(ringTip.x - wrist.x, 2) + Math.pow(ringTip.y - wrist.y, 2));
            const pinkyDist = Math.sqrt(Math.pow(pinkyTip.x - wrist.x, 2) + Math.pow(pinkyTip.y - wrist.y, 2));

            const isOkGesture = isPinching && middleDist > 0.25 && ringDist > 0.25 && pinkyDist > 0.2;

            if (isOkGesture && now - lastSwitchTimeRef.current > 1500) {
                setMode(prevMode => {
                    if (prevMode === AppMode.JELLYFISH) return AppMode.SNOW;
                    if (prevMode === AppMode.SNOW) return AppMode.RAIN;
                    return AppMode.JELLYFISH;
                });
                lastSwitchTimeRef.current = now;
            }

            const newHandData = {
              x: centroidX,
              y: centroidY,
              isPinching: isPinching, 
              pinchDistance: pinchDistance, 
              isPresent: true,
              landmarks: landmarks 
            };

            setHandData(newHandData);
            handleTabHover(newHandData);
            
          } else {
            setHandData(prev => ({ ...prev, isPresent: false, landmarks: undefined }));
            setHoveredTab(null);
          }
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleTabHover = (data: HandData) => {
    if (data.y < 0.20 && data.isPresent) {
        const tabWidth = 1 / 3;
        if (data.x < tabWidth) setHoveredTab(TABS[0].id as AppMode);
        else if (data.x < tabWidth * 2) setHoveredTab(TABS[1].id as AppMode);
        else setHoveredTab(TABS[2].id as AppMode);
    } else {
        setHoveredTab(null);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. Setup Audio
    const url = URL.createObjectURL(file);
    setAudioSrc(url);
    setAudioError(false);
    setIsFileUploaded(true);
    
    // 2. Set temporary metadata while we analyze
    setSongData(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, "").toUpperCase(),
        artist: "ANALYZING...",
        lrcString: "[00:00.00] AI IS ANALYZING AUDIO STREAM...\n[00:04.00] GENERATING LYRICS...",
    }));

    setIsAnalyzing(true);

    // 3. Call Gemini to generate lyrics
    try {
        const base64Audio = await fileToBase64(file);
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Use gemini-2.5-flash which has multimodal capabilities
        const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: {
                 parts: [
                    { 
                        inlineData: { 
                            mimeType: file.type.startsWith('audio/') ? file.type : 'audio/mp3', 
                            data: base64Audio 
                        } 
                    },
                    { 
                        text: "Listen to this audio track.\n1. Identify the song title and artist if recognized.\n2. Generate synchronized lyrics in standard LRC format (e.g. [mm:ss.xx] line).\n\nOutput strictly in this format:\nMETADATA: Title - Artist\n[00:00.00] (Start)\n[00:05.00] ... lyrics ..." 
                    }
                 ]
             }
        });

        const text = response.text || "";
        
        // Basic parsing of the response
        let newTitle = file.name.replace(/\.[^/.]+$/, "").toUpperCase();
        let newArtist = "UNKNOWN";
        
        const lines = text.split('\n');
        const metadataLine = lines.find(l => l.startsWith('METADATA:'));
        
        if (metadataLine) {
            const meta = metadataLine.replace('METADATA:', '').trim();
            const parts = meta.split('-');
            if (parts.length > 1) {
                newTitle = parts[0].trim().toUpperCase();
                newArtist = parts[1].trim().toUpperCase();
            } else {
                newTitle = meta.toUpperCase();
            }
        }
        
        // Filter out the metadata line for the LRC string if needed, 
        // though our regex parser in HUDLayer should handle it fine.
        
        setSongData(prev => ({
            ...prev,
            title: newTitle,
            artist: newArtist,
            lrcString: text
        }));

    } catch (error) {
        console.error("Gemini Lyric Generation Failed:", error);
        setSongData(prev => ({
            ...prev,
            artist: "ERROR",
            lrcString: "[00:00.00] LYRIC GENERATION FAILED\n[00:03.00] PLEASE CHECK CONNECTION"
        }));
    } finally {
        setIsAnalyzing(false);
    }
  };

  const startExperience = () => {
    if (!audioSrc && !isFileUploaded) {
        setAudioError(true);
        return;
    }
    setHasStarted(true);
    if (audioRef.current) {
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(e => {
            console.error("Audio play failed:", e);
            setAudioError(true);
        });
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden font-sans">
      <WebcamBackground ref={webcamRef} mode={mode} />
      <div className="scanlines" />
      
      {/* Audio Element */}
      <audio 
        ref={audioRef} 
        src={audioSrc} 
        loop 
        onError={() => {
            // Only flag error if we actually tried to set a source
            if (audioSrc) setAudioError(true);
        }}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 text-cyan-500 font-hud">
          <div className="text-center">
             <div className="w-16 h-16 border-4 border-t-cyan-500 border-r-transparent border-b-cyan-500 border-l-transparent rounded-full animate-spin mb-4 mx-auto" />
             <p className="tracking-widest animate-pulse">INITIALIZING VISION SYSTEMS...</p>
          </div>
        </div>
      )}

      {/* Start Button Overlay */}
      {!isLoading && !hasStarted && (
         <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md gap-8">
            <div className="max-w-md text-center space-y-2">
                <h1 className="text-4xl font-hud text-cyan-400 tracking-[0.2em] drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                    GESTURE HUD
                </h1>
                <p className="text-cyan-700 font-mono text-xs">SYSTEM READY // WAITING FOR AUDIO SOURCE</p>
            </div>

            {/* Error Message */}
            {audioError && !isFileUploaded && (
                <div className="flex items-center gap-2 text-red-400 border border-red-500/50 bg-red-900/20 px-4 py-2 rounded font-mono text-sm animate-pulse">
                    <AlertCircle size={16} />
                    <span>AUDIO SOURCE MISSING. PLEASE UPLOAD.</span>
                </div>
            )}

            <div className="flex flex-col gap-4 w-64">
                {/* File Upload Button */}
                <label className={`
                    cursor-pointer group relative flex items-center justify-center gap-3 px-6 py-3 
                    border border-cyan-700 bg-cyan-950/30 text-cyan-400 font-hud tracking-widest 
                    hover:bg-cyan-900/50 hover:border-cyan-400 transition-all duration-300
                    ${isAnalyzing ? 'animate-pulse cursor-wait' : ''}
                `}>
                    {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Upload size={18} />}
                    <span>{isAnalyzing ? 'ANALYZING...' : (isFileUploaded ? 'REPLACE AUDIO' : 'LOAD AUDIO')}</span>
                    <input type="file" accept="audio/*" onChange={handleFileUpload} disabled={isAnalyzing} className="hidden" />
                    {isFileUploaded && !isAnalyzing && <div className="absolute right-2 w-2 h-2 bg-green-400 rounded-full shadow-[0_0_5px_lime]" />}
                </label>

                {/* Start Button */}
                <button 
                    onClick={startExperience}
                    disabled={(!isFileUploaded && !audioSrc) || isAnalyzing}
                    className={`
                        group relative px-6 py-4 border-2 font-hud text-xl tracking-widest transition-all duration-300
                        ${(!isFileUploaded && !audioSrc) || isAnalyzing
                            ? 'border-gray-700 text-gray-700 cursor-not-allowed opacity-50' 
                            : 'border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                        }
                    `}
                >
                    <span className="flex items-center justify-center gap-4">
                        <Play className="fill-current" />
                        INITIALIZE
                    </span>
                </button>
            </div>
            
            <div className="text-cyan-900/50 font-mono text-[10px] mt-8">
                Build v2.5.0 // Gemini Neural Audio Core Active
            </div>
         </div>
      )}

      <Visualizer mode={mode} handData={handData} />
      
      <HUDLayer 
        currentMode={mode} 
        songData={songData}
        handData={handData} 
        onTabSelect={setMode}
        hoveredTab={hoveredTab}
        currentTime={currentTime}
        isPlaying={isPlaying}
      />
    </div>
  );
};

export default App;