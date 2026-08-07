'use client';

import {
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  toBlob: () => Blob | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onDraw?: () => void;
}

interface Point {
  x: number;
  y: number;
}

const SignaturePadComponent = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePadComponent({ onDraw }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const strokesRef = useRef<Point[][]>([]);
    const activeStrokeRef = useRef<Point[] | null>(null);
    const activePointerRef = useRef<number | null>(null);
    const sizeRef = useRef({ width: 0, height: 0 });
    const [isEmptyState, setIsEmptyState] = useState(true);
    const [isDrawing, setIsDrawing] = useState(false);
    const onDrawRef = useRef(onDraw);

    // Keep callback ref fresh
    useEffect(() => {
      onDrawRef.current = onDraw;
    }, [onDraw]);

    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const context = () => canvas.getContext('2d');

      const configureContext = (ctx: CanvasRenderingContext2D) => {
        ctx.lineWidth = 2.4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1f2329';
        ctx.fillStyle = '#1f2329';
      };

      const denormalize = (point: Point) => ({
        x: point.x * sizeRef.current.width,
        y: point.y * sizeRef.current.height,
      });

      const drawStroke = (ctx: CanvasRenderingContext2D, stroke: Point[]) => {
        if (stroke.length === 0) return;

        const first = denormalize(stroke[0]);
        if (stroke.length === 1) {
          ctx.beginPath();
          ctx.arc(first.x, first.y, 1.2, 0, Math.PI * 2);
          ctx.fill();
          return;
        }

        ctx.beginPath();
        ctx.moveTo(first.x, first.y);
        for (let index = 1; index < stroke.length; index += 1) {
          const point = denormalize(stroke[index]);
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      };

      const redraw = () => {
        const ctx = context();
        if (!ctx) return;
        ctx.clearRect(0, 0, sizeRef.current.width, sizeRef.current.height);
        configureContext(ctx);
        for (const stroke of strokesRef.current) drawStroke(ctx, stroke);
        if (activeStrokeRef.current) drawStroke(ctx, activeStrokeRef.current);
      };

      const setupCanvas = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 3);
        const rect = container.getBoundingClientRect();
        const width = Math.max(1, rect.width);
        const height = Math.max(1, rect.height);

        if (
          Math.abs(sizeRef.current.width - width) < 0.5 &&
          Math.abs(sizeRef.current.height - height) < 0.5 &&
          canvas.width === Math.round(width * dpr) &&
          canvas.height === Math.round(height * dpr)
        ) {
          return;
        }

        sizeRef.current = { width, height };
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = context();
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          configureContext(ctx);
        }
        redraw();
      };

      setupCanvas();

      const pointFromClient = (clientX: number, clientY: number): Point => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
          y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
        };
      };

      const appendPoints = (points: Point[]) => {
        const stroke = activeStrokeRef.current;
        const ctx = context();
        if (!stroke || !ctx || points.length === 0) return;

        const previous = stroke[stroke.length - 1];
        stroke.push(...points);
        configureContext(ctx);

        if (previous) {
          ctx.beginPath();
          const start = denormalize(previous);
          ctx.moveTo(start.x, start.y);
          for (const point of points) {
            const next = denormalize(point);
            ctx.lineTo(next.x, next.y);
          }
          ctx.stroke();
        } else {
          drawStroke(ctx, stroke);
        }
      };

      const beginStroke = (point: Point) => {
        if (activeStrokeRef.current) return;
        activeStrokeRef.current = [point];
        setIsDrawing(true);
        setIsEmptyState(false);
        const ctx = context();
        if (ctx) drawStroke(ctx, activeStrokeRef.current);
      };

      const endStroke = () => {
        const stroke = activeStrokeRef.current;
        if (!stroke) return;
        strokesRef.current.push(stroke);
        activeStrokeRef.current = null;
        activePointerRef.current = null;
        setIsDrawing(false);
        onDrawRef.current?.();
      };

      const supportsPointerEvents = 'PointerEvent' in window;

      const handlePointerDown = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        if (!event.isPrimary) return;
        event.preventDefault();
        activePointerRef.current = event.pointerId;
        canvas.setPointerCapture?.(event.pointerId);
        beginStroke(pointFromClient(event.clientX, event.clientY));
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (activePointerRef.current !== event.pointerId || !activeStrokeRef.current) return;
        event.preventDefault();
        const coalescedEvents = event.getCoalescedEvents?.() ?? [];
        const events = coalescedEvents.length > 0 ? coalescedEvents : [event];
        appendPoints(events.map((item) => pointFromClient(item.clientX, item.clientY)));
      };

      const handlePointerEnd = (event: PointerEvent) => {
        if (activePointerRef.current !== event.pointerId) return;
        event.preventDefault();
        if (event.type === 'pointerup') {
          appendPoints([pointFromClient(event.clientX, event.clientY)]);
        }
        if (canvas.hasPointerCapture?.(event.pointerId)) {
          canvas.releasePointerCapture(event.pointerId);
        }
        endStroke();
      };

      let activeTouchId: number | null = null;
      const findTouch = (list: TouchList) =>
        Array.from(list).find((touch) => touch.identifier === activeTouchId);

      const handleTouchStart = (event: TouchEvent) => {
        if (activeTouchId !== null || event.changedTouches.length === 0) return;
        event.preventDefault();
        const touch = event.changedTouches[0];
        activeTouchId = touch.identifier;
        beginStroke(pointFromClient(touch.clientX, touch.clientY));
      };

      const handleTouchMove = (event: TouchEvent) => {
        const touch = findTouch(event.changedTouches);
        if (!touch) return;
        event.preventDefault();
        appendPoints([pointFromClient(touch.clientX, touch.clientY)]);
      };

      const handleTouchEnd = (event: TouchEvent) => {
        const touch = findTouch(event.changedTouches);
        if (!touch) return;
        event.preventDefault();
        if (event.type === 'touchend') {
          appendPoints([pointFromClient(touch.clientX, touch.clientY)]);
        }
        activeTouchId = null;
        endStroke();
      };

      let mouseDown = false;
      const handleMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return;
        event.preventDefault();
        mouseDown = true;
        beginStroke(pointFromClient(event.clientX, event.clientY));
      };

      const handleMouseMove = (event: MouseEvent) => {
        if (!mouseDown) return;
        event.preventDefault();
        appendPoints([pointFromClient(event.clientX, event.clientY)]);
      };

      const handleMouseUp = (event: MouseEvent) => {
        if (!mouseDown) return;
        event.preventDefault();
        appendPoints([pointFromClient(event.clientX, event.clientY)]);
        mouseDown = false;
        endStroke();
      };

      if (supportsPointerEvents) {
        canvas.addEventListener('pointerdown', handlePointerDown);
        canvas.addEventListener('pointermove', handlePointerMove);
        canvas.addEventListener('pointerup', handlePointerEnd);
        canvas.addEventListener('pointercancel', handlePointerEnd);
      } else {
        canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
        canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
        canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
        canvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
      }

      const resizeObserver = new ResizeObserver(setupCanvas);

      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        if (supportsPointerEvents) {
          canvas.removeEventListener('pointerdown', handlePointerDown);
          canvas.removeEventListener('pointermove', handlePointerMove);
          canvas.removeEventListener('pointerup', handlePointerEnd);
          canvas.removeEventListener('pointercancel', handlePointerEnd);
        } else {
          canvas.removeEventListener('touchstart', handleTouchStart);
          canvas.removeEventListener('touchmove', handleTouchMove);
          canvas.removeEventListener('touchend', handleTouchEnd);
          canvas.removeEventListener('touchcancel', handleTouchEnd);
          canvas.removeEventListener('mousedown', handleMouseDown);
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        }
      };
    }, []);

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getDataUrl: () => {
          const canvas = canvasRef.current;
          if (!canvas || strokesRef.current.length === 0) return null;
          return canvas.toDataURL('image/png');
        },
        toBlob: () => {
          const canvas = canvasRef.current;
          if (!canvas || strokesRef.current.length === 0) return null;
          const dataUrl = canvas.toDataURL('image/png');
          const parts = dataUrl.split(',');
          const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
          const bstr = atob(parts[1]);
          const u8arr = new Uint8Array(bstr.length);
          for (let i = 0; i < bstr.length; i++) {
            u8arr[i] = bstr.charCodeAt(i);
          }
          return new Blob([u8arr], { type: mime });
        },
        clear: () => {
          strokesRef.current = [];
          activeStrokeRef.current = null;
          activePointerRef.current = null;
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
          setIsEmptyState(true);
          setIsDrawing(false);
        },
        isEmpty: () => {
          return strokesRef.current.length === 0 && !activeStrokeRef.current;
        },
      }),
      [],
    );

    return (
      <div
        ref={containerRef}
        className={`relative h-[180px] w-full rounded-lg border-2 bg-white transition-colors ${
          isDrawing
            ? 'border-blue-500 ring-2 ring-blue-200'
            : isEmptyState
              ? 'border-dashed border-gray-300'
              : 'border-solid border-gray-400'
        }`}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          overscrollBehavior: 'contain',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="手写签名区域"
          className="absolute inset-0 cursor-crosshair outline-none"
          onContextMenu={(event) => event.preventDefault()}
          onDragStart={(event) => event.preventDefault()}
          style={{
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        />
        {isEmptyState && !isDrawing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
            请在此处手写签名
          </div>
        )}
      </div>
    );
  },
);

export default SignaturePadComponent;
