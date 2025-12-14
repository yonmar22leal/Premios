// PresentationView.jsx - ANTI-RE-RENDER + DEBUG COMPLETO
import React, { useRef, useEffect, useCallback } from 'react';

const PresentationView = ({ nominee, onEnd }) => {
  const videoRef = useRef(null);
  const hasMounted = useRef(false);

  console.log('[PresentationView] Render con nominee:', nominee?.name);

  // ✅ onEnd memoizado para evitar re-renders infinitos
  const handleEnd = useCallback(() => {
    console.log('[PresentationView] Finalizando presentación');
    if (onEnd) onEnd();
  }, [onEnd]);

  useEffect(() => {
    hasMounted.current = true;
    const video = videoRef.current;
    if (!video || !nominee?.video_url) {
      console.warn('[PresentationView] Sin video ref o URL');
      return;
    }

    console.log('[PresentationView] Configurando video:', nominee.video_url);

    const handleLoadedMetadata = () => {
      console.log('[PresentationView] ✅ METADATA CARGADA - Reproduciendo');
      video.play().catch(e => console.error('[PresentationView] ❌ Error play:', e));
    };

    const handleError = (e) => {
      console.error('[PresentationView] ❌ Error video:', e);
      console.error('target.error:', video.error);
      handleEnd();
    };

    const handleEnded = () => {
      console.log('[PresentationView] ✅ Video terminado');
      handleEnd();
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('ended', handleEnded);

    // Intentar play inmediato
    video.play().catch(e => console.warn('[PresentationView] Pre-play failed (normal):', e));

    return () => {
      if (video) {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
        video.removeEventListener('ended', handleEnded);
        video.pause();
      }
    };
  }, [nominee?.video_url, handleEnd]); // ✅ Dependencies correctas

  if (!nominee || !nominee.video_url) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-2xl">No hay presentación disponible.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full h-full flex flex-col items-center justify-center max-w-6xl">
        {/* Debug info */}
        <div className="absolute top-4 left-4 text-white bg-black/80 p-2 rounded text-sm z-50">
          <p>🎥 {nominee.name}</p>
          <p>Status: Cargando...</p>
        </div>
        
        <video
          ref={videoRef}
          className="w-full h-[80vh] max-w-4xl object-contain rounded-2xl shadow-2xl"
          src={nominee.video_url}
          autoPlay
          muted
          playsInline
          controls // ← TEMPORAL para debug
          preload="auto" // ← Cambiado a "auto"
          loop={false}
        >
          Tu navegador no soporta video.
        </video>
      </div>
    </div>
  );
};

export default PresentationView;
