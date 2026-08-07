'use client';

import {
  useRef,
  useEffect,
  useCallback,
  useState,
  forwardRef,
  useImperativeHandle,
} from 'react';
import SignaturePad from 'signature_pad';

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
  toBlob: () => Blob | null;
  clear: () => void;
  isEmpty: () => boolean;
}

interface SignaturePadProps {
  onDraw?: () => void;
}

/**
 * Production-grade signature pad using signature_pad library.
 *
 * Features:
 * - Bezier curve smoothing for natural-looking strokes
 * - Velocity-based stroke width (thin when fast, thick when slow)
 * - High-DPI canvas rendering
 * - ResizeObserver for responsive sizing
 * - Touch/mouse/pointer event compatibility
 * - getCoalescedEvents support for high-frequency input
 */
const SignaturePadComponent = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePadComponent({ onDraw }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const padRef = useRef<SignaturePad | null>(null);
    const [isEmptyState, setIsEmptyState] = useState(true);
    const [isFocused, setIsFocused] = useState(false);
    const onDrawRef = useRef(onDraw);

    // Keep callback ref fresh
    useEffect(() => {
      onDrawRef.current = onDraw;
    }, [onDraw]);

    // Initialize signature_pad
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      // Set up canvas size with DPR
      const setupCanvas = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }

        return { width: rect.width, height: rect.height };
      };

      setupCanvas();

      // Initialize signature_pad with natural signing parameters
      const pad = new SignaturePad(canvas, {
        // Velocity-based width changes for natural stroke
        velocityFilterWeight: 0.7,
        minWidth: 0.8,
        maxWidth: 2.5,
        minDistance: 1,
        // Rendering options
        penColor: '#1f2329',
        backgroundColor: 'rgba(0,0,0,0)', // Transparent
        throttle: 0, // No throttling for maximum responsiveness
        // Line cap/join for smooth strokes
        canvasContextOptions: {
          alpha: true,
        },
      });

      padRef.current = pad;

      // Track empty state changes
      const handleBeginStroke = () => {
        // Focus canvas for visual feedback (not required for drawing)
        canvas.focus();
        setIsFocused(true);
      };

      const handleEndStroke = () => {
        setIsFocused(false);
        const empty = pad.isEmpty();
        setIsEmptyState(empty);
        if (!empty) {
          onDrawRef.current?.();
        }
      };

      pad.addEventListener('beginStroke', handleBeginStroke);
      pad.addEventListener('endStroke', handleEndStroke);

      // Handle resize with ResizeObserver
      const resizeObserver = new ResizeObserver(() => {
        // Save current signature data
        const data = pad.toData();
        
        // Resize canvas
        setupCanvas();
        
        // Restore signature
        if (data.length > 0) {
          pad.fromData(data);
        }
      });

      resizeObserver.observe(container);

      // Handle DPR changes (e.g., moving between displays)
      const mediaQuery = window.matchMedia?.(`(resolution: ${window.devicePixelRatio}dppx)`);
      const handleDprChange = () => {
        const data = pad.toData();
        setupCanvas();
        if (data.length > 0) {
          pad.fromData(data);
        }
      };

      mediaQuery?.addEventListener?.('change', handleDprChange);

      return () => {
        pad.removeEventListener('beginStroke', handleBeginStroke);
        pad.removeEventListener('endStroke', handleEndStroke);
        resizeObserver.disconnect();
        mediaQuery?.removeEventListener?.('change', handleDprChange);
        padRef.current = null;
      };
    }, []);

    // Imperative handle
    useImperativeHandle(
      ref,
      () => ({
        getDataUrl: () => {
          const pad = padRef.current;
          if (!pad || pad.isEmpty()) return null;
          return pad.toDataURL('image/png');
        },
        toBlob: () => {
          const pad = padRef.current;
          if (!pad || pad.isEmpty()) return null;
          const dataUrl = pad.toDataURL('image/png');
          // Convert data URL to blob synchronously
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
          padRef.current?.clear();
          setIsEmptyState(true);
        },
        isEmpty: () => {
          return padRef.current?.isEmpty() ?? true;
        },
      }),
      [],
    );

    return (
      <div
        ref={containerRef}
        className={`relative h-[180px] w-full rounded-lg border-2 bg-white transition-colors ${
          isFocused
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
        }}
      >
        <canvas
          ref={canvasRef}
          tabIndex={0}
          aria-label="手写签名区域"
          className="absolute inset-0 cursor-crosshair outline-none"
          style={{
            touchAction: 'none',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
        />
        {isEmptyState && !isFocused && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-400">
            请在此处手写签名
          </div>
        )}
      </div>
    );
  },
);

export default SignaturePadComponent;
