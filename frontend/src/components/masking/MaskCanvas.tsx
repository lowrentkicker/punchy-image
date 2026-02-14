import { useRef, useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import { MaskToolbar } from './MaskToolbar';
import type { GenerationError } from '../../types';

type Tool = 'brush' | 'eraser' | 'rectangle' | 'lasso';

export function MaskCanvas() {
  const { state, dispatch } = useAppContext();
  const { currentGeneration, isMaskMode, selectedModelId, isGenerating } = state;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [maskPrompt, setMaskPrompt] = useState('');
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [inverted, setInverted] = useState(false);

  // Initialize canvas when image loads
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (isMaskMode) initCanvas();
  }, [isMaskMode, currentGeneration, initCanvas]);

  if (!isMaskMode || !currentGeneration) return null;

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const draw = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (tool === 'rectangle') {
      setRectStart({ x, y });
    } else if (tool === 'lasso') {
      setLassoPoints([{ x, y }]);
    } else {
      setIsDrawing(true);
      draw(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoords(e);

    if (tool === 'lasso' && lassoPoints.length > 0) {
      setLassoPoints((prev) => [...prev, { x, y }]);
    } else if (isDrawing && (tool === 'brush' || tool === 'eraser')) {
      draw(x, y);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;

    if (tool === 'rectangle' && rectStart) {
      const { x, y } = getCanvasCoords(e);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillRect(
        Math.min(rectStart.x, x),
        Math.min(rectStart.y, y),
        Math.abs(x - rectStart.x),
        Math.abs(y - rectStart.y),
      );
      setRectStart(null);
    } else if (tool === 'lasso' && lassoPoints.length > 2) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.beginPath();
      ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
      for (const p of lassoPoints) {
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.fill();
      setLassoPoints([]);
    }

    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleInvert = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 3; i < data.length; i += 4) {
      data[i] = data[i] > 0 ? 0 : 255;
    }
    ctx.putImageData(imageData, 0, 0);
    setInverted(!inverted);
  };

  const handleApplyMask = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !maskPrompt.trim() || !selectedModelId) return;

    const maskBase64 = canvas.toDataURL('image/png');
    dispatch({ type: 'START_GENERATION', requestId: crypto.randomUUID() });

    try {
      const result = await api.maskEdit({
        image_id: currentGeneration.image_id,
        mask: { mask_image_base64: maskBase64 },
        prompt: maskPrompt.trim(),
        model_id: selectedModelId,
        session_id: state.conversationSession?.session_id,
      });
      dispatch({ type: 'GENERATION_SUCCESS', result });
      dispatch({ type: 'SET_MASK_MODE', enabled: false });
      setMaskPrompt('');
    } catch (err) {
      dispatch({ type: 'GENERATION_ERROR', error: err as GenerationError });
    }
  };

  return (
    <div className="absolute inset-0 z-10 flex flex-col bg-base/95">
      <MaskToolbar
        tool={tool}
        onToolChange={setTool}
        brushSize={brushSize}
        onBrushSizeChange={setBrushSize}
        onClear={handleClear}
        onInvert={handleInvert}
        onClose={() => dispatch({ type: 'SET_MASK_MODE', enabled: false })}
      />

      {/* Canvas area */}
      <div className="relative flex flex-1 items-center justify-center p-6">
        <div className="relative">
          <img
            ref={imageRef}
            src={currentGeneration.image_url}
            alt="Source"
            className="max-h-[60vh] max-w-full rounded-xl object-contain"
            onLoad={initCanvas}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full rounded-xl cursor-crosshair"
            style={{ mixBlendMode: 'normal', opacity: 0.4 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => setIsDrawing(false)}
          />
          {/* Colored overlay to visualize mask */}
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 h-full w-full rounded-xl"
            style={{
              mixBlendMode: 'multiply',
              opacity: 0.3,
              filter: 'hue-rotate(200deg) saturate(3)',
            }}
          />
        </div>
      </div>

      {/* Mask prompt + apply */}
      <div className="border-t border-[--border-default] bg-surface-1 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={maskPrompt}
            onChange={(e) => setMaskPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApplyMask();
            }}
            placeholder="What should appear in the masked area?"
            disabled={isGenerating}
            className="flex-1 rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleApplyMask}
            disabled={!maskPrompt.trim() || isGenerating}
            className="rounded-xl bg-[--cta-bg] px-4 py-2.5 text-sm font-medium text-[--cta-text] hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isGenerating ? 'Editing...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
}
