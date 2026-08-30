import { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Canvas komponenta za crtanje potpisa prstom/mišem. Ne čuva ništa nigdje —
// samo javlja roditelju (onChange) trenutni potpis kao base64 PNG dataURL,
// ili null ako je prazno/očišćeno.
export default function SignaturePad({ label, onChange, height = 140 }) {
  const { t } = useTranslation();
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = rect.width * ratio;
      canvas.height = height * ratio;
      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#1a1a1a';
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [height]);

  const getPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e) => {
    e.preventDefault();
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
    canvasRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const point = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
    if (!hasSignature) setHasSignature(true);
  };

  const handlePointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onChange(dataUrl);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    onChange(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</span>
        {hasSignature && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-500"
          >
            ✕ {t('reports.clearSignature')}
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="w-full border border-gray-200 dark:border-gray-700 rounded-lg bg-white cursor-crosshair"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  );
}
