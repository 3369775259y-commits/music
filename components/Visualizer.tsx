import React, { useRef, useEffect } from 'react';
import { AppMode, HandData } from '../types';

interface VisualizerProps {
  mode: AppMode;
  handData: HandData;
}

export const Visualizer: React.FC<VisualizerProps> = ({ mode, handData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State refs for particle systems
  const particlesRef = useRef<any[]>([]);
  const ripplesRef = useRef<any[]>([]); 
  const splashesRef = useRef<any[]>([]); 
  
  // Snow accumulation buffer (Height map)
  // Stores the Y coordinate of the "ground" for every X coordinate
  const snowGroundRef = useRef<Float32Array | null>(null);
  
  const frameRef = useRef<number>(0);
  const wasOpenRef = useRef<boolean>(false);

  useEffect(() => {
    // Reset systems on mode change
    particlesRef.current = [];
    ripplesRef.current = [];
    splashesRef.current = [];
    wasOpenRef.current = false;
    snowGroundRef.current = null; // Reset snow pile
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Initialize Snow Ground if needed
      if (mode === AppMode.SNOW) {
        if (!snowGroundRef.current || snowGroundRef.current.length !== canvas.width) {
            snowGroundRef.current = new Float32Array(canvas.width).fill(canvas.height);
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Hand Skeleton
      if (handData.isPresent && handData.landmarks) {
        drawSkeleton(ctx, canvas, handData.landmarks, mode);
      }

      if (mode === AppMode.JELLYFISH) {
        renderJellyfish(ctx, canvas, handData, particlesRef, wasOpenRef);
      } else if (mode === AppMode.SNOW) {
        renderSnow(ctx, canvas, handData, particlesRef, wasOpenRef, snowGroundRef);
      } else if (mode === AppMode.RAIN) {
        renderRain(ctx, canvas, handData, particlesRef, ripplesRef, splashesRef);
      }

      frameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(frameRef.current);
  }, [mode, handData]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-10 pointer-events-none"
    />
  );
};

// --- SKELETON ---
const drawSkeleton = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, landmarks: any[], mode: AppMode) => {
  const connections = [
    [0, 1], [1, 2], [2, 3], [3, 4],           
    [0, 5], [5, 6], [6, 7], [7, 8],           
    [0, 9], [9, 10], [10, 11], [11, 12],      
    [0, 13], [13, 14], [14, 15], [15, 16],    
    [0, 17], [17, 18], [18, 19], [19, 20],    
    [5, 9], [9, 13], [13, 17]                 
  ];

  let color = "0, 255, 255"; 
  if (mode === AppMode.SNOW) color = "200, 240, 255"; 
  if (mode === AppMode.RAIN) color = "100, 150, 255";

  ctx.strokeStyle = `rgba(${color}, 0.2)`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  connections.forEach(([start, end]) => {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    ctx.moveTo((1 - p1.x) * canvas.width, p1.y * canvas.height);
    ctx.lineTo((1 - p2.x) * canvas.width, p2.y * canvas.height);
  });
  ctx.stroke();

  ctx.fillStyle = `rgba(${color}, 0.5)`;
  landmarks.forEach((p) => {
    ctx.beginPath();
    ctx.arc((1 - p.x) * canvas.width, p.y * canvas.height, 2, 0, Math.PI * 2);
    ctx.fill();
  });
};

// --- JELLYFISH ---
const renderJellyfish = (
  ctx: CanvasRenderingContext2D, 
  canvas: HTMLCanvasElement, 
  handData: HandData, 
  particlesRef: React.MutableRefObject<any[]>, 
  wasOpenRef: React.MutableRefObject<boolean>
) => {
    const handX = handData.isPresent ? handData.x * canvas.width : canvas.width / 2;
    const handY = handData.isPresent ? handData.y * canvas.height : canvas.height / 2;
    const isHandInHud = handData.y < 0.2;
    const isOpen = handData.isPresent && !handData.isPinching && !isHandInHud;
    const time = Date.now() / 1000;

    // --- SPAWN LOGIC (Rising Edge Trigger) ---
    if (isOpen && !wasOpenRef.current) {
        if (particlesRef.current.length < 20) { 
             const spawnCount = Math.floor(Math.random() * 2) + 3; 
             for(let k=0; k<spawnCount; k++) {
                const scale = 0.3 + Math.random() * 0.7; 
                particlesRef.current.push({
                    x: handX + (Math.random() - 0.5) * 80, 
                    y: handY + (Math.random() - 0.5) * 80,
                    vx: (Math.random() - 0.5) * 5, 
                    vy: (Math.random() - 0.5) * 5,
                    scale: scale,
                    phase: Math.random() * 10,
                    state: 'FOLLOWING',
                    bubbles: [] 
                });
             }
        }
    }

    // --- STATE MANAGEMENT ---
    if ((!isOpen && wasOpenRef.current) || !handData.isPresent) {
        particlesRef.current.forEach(p => {
            if (p.state === 'FOLLOWING') {
                p.state = 'FREE';
                p.vx = (Math.random() - 0.5) * 6; 
                p.vy = (Math.random() - 0.5) * 6;
            }
        });
    }
    wasOpenRef.current = isOpen;

    // --- UPDATE & DRAW ---
    particlesRef.current.forEach((jelly, i) => {
        // 1. Movement
        if (jelly.state === 'FOLLOWING') {
             const dx = handX - jelly.x;
             const dy = handY - jelly.y;
             jelly.x += dx * 0.08; 
             jelly.y += dy * 0.08;
             jelly.y += Math.sin(time * 5 + jelly.phase) * 1.5; 
        } else {
             jelly.x += jelly.vx;
             jelly.y += jelly.vy;
             
             jelly.vx *= 0.98; 
             jelly.vy *= 0.98;
             
             jelly.vx += Math.sin(time * 2 + jelly.phase) * 0.05; 
             jelly.vy += Math.cos(time * 2 + jelly.phase) * 0.05;

             if (jelly.x < -100) jelly.x = canvas.width + 100;
             if (jelly.x > canvas.width + 100) jelly.x = -100;
             if (jelly.y < -100) jelly.y = canvas.height + 100;
             if (jelly.y > canvas.height + 100) jelly.y = -100;
        }

        // 2. Bubble Logic
        if (Math.random() < 0.15) { 
            jelly.bubbles.push({
                x: jelly.x + (Math.random() - 0.5) * 20 * jelly.scale,
                y: jelly.y + 20 * jelly.scale, 
                size: (Math.random() * 2 + 0.5) * jelly.scale,
                speed: Math.random() * 2 + 1, 
                alpha: 0.8,
                life: 100 
            });
        }

        for (let b = jelly.bubbles.length - 1; b >= 0; b--) {
            const bubble = jelly.bubbles[b];
            bubble.y -= bubble.speed; 
            bubble.x += Math.sin(time * 5 + bubble.life) * 0.5; 
            bubble.alpha -= 0.02; 
            if (bubble.alpha <= 0) {
                jelly.bubbles.splice(b, 1);
            }
        }

        // 3. Draw
        drawHighDensityJellyfish(ctx, jelly, time);
    });
};

const drawHighDensityJellyfish = (ctx: CanvasRenderingContext2D, jelly: any, time: number) => {
    const { x, y, scale, phase, bubbles } = jelly;
    const size = 80 * scale; 
    const pulse = Math.sin(time * 5 + phase); 
    const headWidth = size * (1 + pulse * 0.05);
    const headHeight = size * 0.6 * (1 - pulse * 0.02);

    bubbles.forEach((b: any) => {
        // Slightly restored brightness: 0.8 -> 0.9
        ctx.fillStyle = `rgba(180, 240, 255, ${b.alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });

    const numTentacles = 12; 
    const segments = 25; 
    
    for (let t = 0; t < numTentacles; t++) {
        const tProgress = t / (numTentacles - 1); 
        const offsetX = (tProgress - 0.5) * headWidth * 0.8;
        const lengthMult = 1.0 + Math.sin(tProgress * Math.PI) * 0.5; 
        
        for (let k = 0; k < segments; k++) {
            const segProgress = k / segments; 
            const down = k * (6 * scale * lengthMult);
            
            const wave = Math.sin(time * 5 + k * 0.2 + t + phase) * (k * 1.5 * scale) 
                       + Math.cos(time * 3 + k * 0.1) * (k * 0.5 * scale);
            
            const tx = x + offsetX + wave;
            const ty = y + headHeight * 0.5 + down;
            // Slightly restored brightness: 0.7 -> 0.75
            const alpha = Math.max(0, (1 - segProgress) * 0.75);
            
            ctx.fillStyle = `rgba(6, 182, 212, ${alpha})`;
            const pSize = (1.5 - segProgress) * scale;
            
            ctx.beginPath();
            ctx.arc(tx, ty, pSize, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    const layers = 6;
    for (let l = 0; l < layers; l++) {
        const layerScale = 1 - (l * 0.15); 
        const layerYOffset = l * (5 * scale); 
        const layerAlpha = 1 - (l * 0.10);
        
        const currentW = headWidth * layerScale;
        const currentH = headHeight * layerScale;
        
        const dots = 15 + (l * 6); 
        
        for (let i = 0; i <= dots; i++) {
            const theta = Math.PI + (Math.PI / dots) * i; 
            
            const px = x + Math.cos(theta) * currentW;
            const py = y + Math.sin(theta) * currentH + layerYOffset;
            const jitter = (Math.random() - 0.5) * 4 * scale;
            
            // Slightly restored brightness: 0.9 -> 0.95
            ctx.fillStyle = `rgba(30, 200, 220, ${layerAlpha * 0.95})`; 
            
            if (l >= 4) { 
                 ctx.shadowBlur = 15 * scale;
                 ctx.shadowColor = "rgba(0, 255, 255, 0.5)"; 
                 ctx.fillStyle = `rgba(180, 240, 240, ${layerAlpha * 0.95})`;
            } else {
                 ctx.shadowBlur = 0;
            }

            ctx.beginPath();
            ctx.arc(px + jitter, py + jitter, (1.2 + Math.random()) * scale, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.shadowBlur = 0;
    
    const grad = ctx.createRadialGradient(x, y + headHeight*0.2, 0, x, y + headHeight*0.2, headWidth * 0.5);
    grad.addColorStop(0, "rgba(200, 255, 255, 0.35)"); // Slightly restored opacity
    grad.addColorStop(1, "rgba(6, 182, 212, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y + headHeight*0.2, headWidth * 0.6, headHeight * 0.4, 0, Math.PI * 2, 0);
    ctx.fill();
};

// --- SNOW ---
const renderSnow = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    handData: HandData, 
    particlesRef: React.MutableRefObject<any[]>,
    wasOpenRef: React.MutableRefObject<boolean>,
    snowGroundRef: React.MutableRefObject<Float32Array | null>
) => {
    const isHandInHud = handData.y < 0.2;
    const isOpen = handData.isPresent && !handData.isPinching && !isHandInHud;
    const handX = handData.x * canvas.width;
    const handY = handData.y * canvas.height;
    const ground = snowGroundRef.current;

    // Helper for creating diversity
    const createSnowflake = (x: number, y: number) => {
        const isBig = Math.random() > 0.95; 
        return {
            x,
            y,
            vx: (Math.random() - 0.5) * (isBig ? 0.5 : 2.0), 
            vy: isBig ? 2.2 + Math.random() * 1.5 : 0.3 + Math.random() * 0.8, 
            size: isBig ? 8 + Math.random() * 12 : 1 + Math.random() * 3, 
            spin: Math.random() * Math.PI,
            spinSpeed: (Math.random() - 0.5) * 0.05,
            // Slightly increased opacity for brightness (0.9->0.95, 0.8->0.85)
            opacity: isBig ? 0.95 : 0.85,
            isParticle: !isBig 
        };
    };

    // 1. Ambient Falling Snow
    for(let i=0; i<2; i++) {
        particlesRef.current.push(createSnowflake(Math.random() * canvas.width, -20));
    }

    // 2. Hand Spawn Snow
    if (isOpen) {
        for (let i = 0; i < 3; i++) {
             particlesRef.current.push(createSnowflake(
                handX + (Math.random() - 0.5) * 60,
                handY + (Math.random() - 0.5) * 60
             ));
        }
    }

    // 3. Update Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        
        // Physics
        p.x += p.vx + Math.sin(p.y * 0.01) * (p.isParticle ? 0.8 : 0.2); 
        p.y += p.vy;
        p.spin += p.spinSpeed;
        
        // Collision Detection with "Ground"
        const gx = Math.max(0, Math.min(canvas.width - 1, Math.floor(p.x)));
        let groundLevel = canvas.height;
        if (ground) groundLevel = ground[gx];

        if (p.y >= groundLevel - (p.size * 0.5)) {
            // LANDED! 
            if (ground) {
                // Add a "mound" around collision point
                const radius = Math.floor(p.size * 2);
                for(let r = -radius; r <= radius; r++) {
                    const idx = gx + r;
                    if (idx >= 0 && idx < canvas.width) {
                        const contribution = (1 - (Math.abs(r) / radius)) * (p.size * 0.5);
                        ground[idx] -= contribution; 
                        if (ground[idx] < 0) ground[idx] = 0;
                    }
                }
            }
            particlesRef.current.splice(i, 1);
        } else {
            drawSnowflake(ctx, p.x, p.y, p.size, p.spin, p.opacity, p.isParticle);
        }
    }

    // 4. Erase/Melt Snow Logic
    if (handData.isPresent && ground) {
        const hx = Math.floor(handX);
        const hy = handY;
        
        if (hy > canvas.height * 0.7) { 
             const brushSize = 50;
             for(let dx = -brushSize; dx <= brushSize; dx++) {
                 const idx = hx + dx;
                 if (idx >= 0 && idx < canvas.width) {
                     const dist = Math.abs(dx);
                     const power = 3 * (1 - dist/brushSize);
                     ground[idx] = Math.min(canvas.height, ground[idx] + power);
                 }
             }
        }
    }
    
    // 5. Draw Accumulated Ground
    if (ground) {
        ctx.fillStyle = "rgba(220, 250, 255, 0.9)";
        ctx.shadowColor = "rgba(220, 250, 255, 0.5)";
        ctx.shadowBlur = 10;
        
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for(let x = 0; x < canvas.width; x += 5) {
            ctx.lineTo(x, ground[x]);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
    }
};

const drawSnowflake = (
    ctx: CanvasRenderingContext2D, 
    x: number, 
    y: number, 
    size: number, 
    angle: number, 
    opacity: number,
    isParticle: boolean
) => {
    ctx.save();
    ctx.translate(x, y);

    if (isParticle) {
        // Glowing particle style for small snowflakes
        ctx.fillStyle = `rgba(220, 250, 255, ${opacity})`;
        ctx.shadowColor = "cyan"; // Enhanced glow color
        ctx.shadowBlur = 8; // Intense glow
        ctx.beginPath();
        ctx.arc(0, 0, size, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Detailed hexagonal style for large snowflakes
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(220, 250, 255, ${opacity})`;
        ctx.lineWidth = 2; // Slightly thicker
        ctx.shadowColor = `rgba(220, 250, 255, ${opacity})`;
        ctx.shadowBlur = 4;

        for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.moveTo(0,0);
            ctx.lineTo(0, size);
            ctx.moveTo(0, size * 0.6);
            ctx.lineTo(size * 0.4, size * 0.8); // Fancier tips
            ctx.moveTo(0, size * 0.6);
            ctx.lineTo(-size * 0.4, size * 0.8);
            ctx.stroke();
            ctx.rotate(Math.PI / 3);
        }
        // Inner hexagon
        ctx.beginPath();
        ctx.moveTo(size * 0.3, 0);
        for(let i=1; i<6; i++) {
             ctx.rotate(Math.PI/3);
             ctx.lineTo(size*0.3, 0);
        }
        ctx.closePath();
        ctx.stroke();
    }
    ctx.restore();
};

// --- RAIN ---
const renderRain = (
    ctx: CanvasRenderingContext2D, 
    canvas: HTMLCanvasElement, 
    handData: HandData, 
    particlesRef: React.MutableRefObject<any[]>,
    ripplesRef: React.MutableRefObject<any[]>,
    splashesRef: React.MutableRefObject<any[]>
) => {
    const isHandInHud = handData.y < 0.2;
    const isOpen = handData.isPresent && !handData.isPinching && !isHandInHud;
    
    let intensity = 0;
    if (isOpen) {
        const openness = Math.min(Math.max((handData.pinchDistance - 0.02) * 4, 0), 1);
        intensity = openness; 
    }

    const waterLevel = canvas.height - 100;

    const spawnRate = Math.floor(intensity * 10); 
    for (let i = 0; i < spawnRate; i++) {
        particlesRef.current.push({
            x: Math.random() * canvas.width,
            y: -50,
            len: 20 + Math.random() * 20,
            speed: 20 + Math.random() * 10
        });
    }

    ctx.strokeStyle = "rgba(180, 200, 255, 0.5)";
    ctx.lineWidth = 2;
    
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.y += p.speed;
        
        if (p.y > waterLevel) {
            ripplesRef.current.push({
                x: p.x,
                y: waterLevel + Math.random() * 10,
                r: 0,
                maxR: 20 + Math.random() * 20,
                alpha: 1
            });
            for(let s=0; s<3; s++) {
                splashesRef.current.push({
                    x: p.x,
                    y: waterLevel,
                    vx: (Math.random() - 0.5) * 4,
                    vy: -(Math.random() * 5 + 2),
                    life: 1.0
                });
            }
            particlesRef.current.splice(i, 1);
        } else {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x, p.y + p.len);
            ctx.stroke();
        }
    }

    if (handData.isPresent && handData.y * canvas.height > waterLevel - 20) {
        if (Math.random() > 0.5) {
             ripplesRef.current.push({
                x: handData.x * canvas.width,
                y: handData.y * canvas.height,
                r: 0,
                maxR: 40,
                alpha: 1,
                isHand: true
             });
        }
        if (Math.random() > 0.8) {
            splashesRef.current.push({
                x: handData.x * canvas.width,
                y: handData.y * canvas.height,
                vx: (Math.random() - 0.5) * 6,
                vy: -Math.random() * 8,
                life: 1.0
            });
        }
    }

    for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const rip = ripplesRef.current[i];
        rip.r += 1;
        rip.alpha -= 0.02;
        
        if (rip.alpha <= 0) {
            ripplesRef.current.splice(i, 1);
        } else {
            ctx.save();
            ctx.translate(rip.x, rip.y);
            ctx.scale(1, 0.3); 
            ctx.beginPath();
            ctx.arc(0, 0, rip.r, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(200, 220, 255, ${rip.alpha})`;
            ctx.lineWidth = rip.isHand ? 3 : 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    ctx.fillStyle = "rgba(200, 230, 255, 0.8)";
    for (let i = splashesRef.current.length - 1; i >= 0; i--) {
        const s = splashesRef.current[i];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.5; 
        s.life -= 0.05;
        
        if (s.life <= 0 || s.y > canvas.height) {
            splashesRef.current.splice(i, 1);
        } else {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2, 0, Math.PI*2);
            ctx.fill();
        }
    }

    const grad = ctx.createLinearGradient(0, waterLevel, 0, canvas.height);
    grad.addColorStop(0, "rgba(20, 30, 60, 0.4)");
    grad.addColorStop(1, "rgba(10, 20, 40, 0.9)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, waterLevel, canvas.width, canvas.height - waterLevel);
    
    ctx.beginPath();
    ctx.moveTo(0, waterLevel);
    ctx.lineTo(canvas.width, waterLevel);
    ctx.strokeStyle = "rgba(100, 150, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
};