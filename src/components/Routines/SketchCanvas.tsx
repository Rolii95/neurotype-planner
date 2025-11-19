import React, { useRef, useState, useCallback, useEffect } from 'react';

interface SketchCanvasProps {
  content: string; // Base64 encoded image data or canvas data JSON
  onChange: (content: string) => void;
  disabled?: boolean;
  className?: string;
  width?: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
}

interface DrawingStroke {
  points: Point[];
  color: string;
  size: number;
  tool: 'pen' | 'eraser';
}

const SketchCanvas: React.FC<SketchCanvasProps> = ({
  content,
  onChange,
  disabled = false,
  className = '',
  width = 400,
  height = 300
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(2);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);

  // Load existing content
  useEffect(() => {
    if (content && canvasRef.current) {
      try {
        if (content.startsWith('data:image')) {
          // Load from base64 image
          const img = new Image();
          img.onload = () => {
            const ctx = canvasRef.current?.getContext('2d');
            if (ctx) {
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0, width, height);
            }
          };
          img.src = content;
        } else {
          // Load from JSON strokes data
          const strokeData = JSON.parse(content);
          setStrokes(strokeData.strokes || []);
          redrawCanvas(strokeData.strokes || []);
        }
      } catch (error) {
        console.warn('Failed to load sketch content:', error);
      }
    }
  }, [content, width, height]);

  const redrawCanvas = useCallback((strokesData: DrawingStroke[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw all strokes
    strokesData.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === 'eraser' ? '#ffffff' : stroke.color;
      ctx.lineWidth = stroke.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    });

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }, [width, height]);

  const getMousePos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const getTouchPos = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const touch = e.touches[0];
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY
    };
  }, []);

  const startDrawing = useCallback((point: Point) => {
    if (disabled) return;
    
    setIsDrawing(true);
    setCurrentStroke([point]);
  }, [disabled]);

  const draw = useCallback((point: Point) => {
    if (!isDrawing || disabled) return;

    const newStroke = [...currentStroke, point];
    setCurrentStroke(newStroke);

    // Draw in real-time
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (currentStroke.length > 0) {
      const lastPoint = currentStroke[currentStroke.length - 1];
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  }, [isDrawing, disabled, currentStroke, tool, color, brushSize]);

  const endDrawing = useCallback(() => {
    if (!isDrawing || currentStroke.length === 0) return;

    const newStroke: DrawingStroke = {
      points: currentStroke,
      color,
      size: brushSize,
      tool
    };

    const newStrokes = [...strokes, newStroke];
    setStrokes(newStrokes);
    setCurrentStroke([]);
    setIsDrawing(false);

    // Save to content
    const strokeData = {
      strokes: newStrokes,
      width,
      height,
      timestamp: new Date().toISOString()
    };
    onChange(JSON.stringify(strokeData));
  }, [isDrawing, currentStroke, color, brushSize, tool, strokes, onChange, width, height]);

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    startDrawing(point);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);
    draw(point);
  };

  const handleMouseUp = () => {
    endDrawing();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    startDrawing(point);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const point = getTouchPos(e);
    draw(point);
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    endDrawing();
  };

  const clearCanvas = () => {
    setStrokes([]);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
    }
    onChange('');
  };

  const undo = () => {
    if (strokes.length === 0) return;
    
    const newStrokes = strokes.slice(0, -1);
    setStrokes(newStrokes);
    redrawCanvas(newStrokes);
    
    const strokeData = {
      strokes: newStrokes,
      width,
      height,
      timestamp: new Date().toISOString()
    };
    onChange(JSON.stringify(strokeData));
  };

  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataUrl = canvas.toDataURL('image/png');
    onChange(dataUrl);
  };

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  return (
    <div className={`sketch-canvas ${className}`}>
      {/* Toolbar */}
      <div className="border-b p-2 space-y-2">
        {/* Tools */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Tool:</label>
          <button
            onClick={() => setTool('pen')}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={disabled}
          >
            Pen
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`px-3 py-1 text-sm border rounded transition-colors ${
              tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
            disabled={disabled}
          >
            Eraser
          </button>
        </div>

        {/* Brush Size */}
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Size:</label>
          <input
            type="range"
            min="1"
            max="20"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-20"
            disabled={disabled}
          />
          <span className="text-sm">{brushSize}px</span>
        </div>

        {/* Colors */}
        {tool === 'pen' && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Color:</label>
            <div className="flex space-x-1">
              {colors.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded border-2 transition-all ${
                    color === c ? 'border-gray-800 scale-110' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: c }}
                  disabled={disabled}
                  aria-label={`Select color ${c}`}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 border rounded"
                disabled={disabled}
                aria-label="Custom color picker"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            disabled={disabled || strokes.length === 0}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button
            onClick={clearCanvas}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={exportAsImage}
            disabled={disabled}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save as Image
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="p-2">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="border border-gray-300 rounded cursor-crosshair touch-none"
          style={{ width: '100%', maxWidth: `${width}px`, height: 'auto' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="img"
          aria-label="Sketch canvas"
        />
      </div>

      {/* Info */}
      <div className="border-t p-2 text-xs text-gray-500">
        {strokes.length} stroke{strokes.length !== 1 ? 's' : ''} • {tool} tool • {brushSize}px
      </div>
    </div>
  );
};

export default SketchCanvas;