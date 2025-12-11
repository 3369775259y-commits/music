import React, { forwardRef } from 'react';
import Webcam from 'react-webcam';
import { AppMode } from '../types';

const videoConstraints = {
  facingMode: "user",
  width: 1280,
  height: 720
};

interface WebcamBackgroundProps {
  onUserMedia?: () => void;
  mode: AppMode;
}

export const WebcamBackground = forwardRef<Webcam, WebcamBackgroundProps>(({ onUserMedia, mode }, ref) => {
  
  // Dynamic filters based on user request for "Deepened Black and White" etc.
  let filterStyle = {};
  let overlayColor = "";

  switch (mode) {
    case AppMode.SNOW:
      // Slightly brighter than before (0.25 -> 0.35)
      filterStyle = { 
        filter: "grayscale(100%) contrast(200%) brightness(0.35)" 
      };
      // Reduced opacity slightly (90 -> 80) to let more light through
      overlayColor = "bg-black/70 mix-blend-multiply opacity-80"; 
      break;
    case AppMode.RAIN:
      // Moody, Stormy look
      filterStyle = { 
        filter: "grayscale(100%) contrast(120%) brightness(0.5) sepia(50%) hue-rotate(190deg) saturate(300%)" 
      };
      overlayColor = "bg-blue-900 mix-blend-overlay opacity-40";
      break;
    case AppMode.JELLYFISH:
    default:
      // Slightly brighter than before (0.25 -> 0.35)
      filterStyle = { 
        filter: "grayscale(100%) contrast(200%) brightness(0.35)" 
      };
      // Heavy dark overlay
      overlayColor = "bg-black/70 mix-blend-multiply";
      break;
  }

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black transition-all duration-1000">
      <Webcam
        ref={ref}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={onUserMedia}
        className="absolute inset-0 w-full h-full object-cover transition-all duration-1000"
        style={{
          ...filterStyle,
          transform: "scaleX(-1)" // Mirror mode
        }}
      />
      <div className={`absolute inset-0 ${overlayColor} transition-all duration-1000`} />
    </div>
  );
});

WebcamBackground.displayName = "WebcamBackground";