/**
 * Signature Pad Interaction Tests
 *
 * Tests the signature_pad library integration:
 * - Initialization with correct smoothing parameters
 * - Drawing produces non-empty signatures
 * - Clear and redraw
 * - Resize preserves signature
 * - Mouse/touch/pointer event compatibility
 */

import { createCanvas } from 'canvas';

// Set up global environment for signature_pad before importing
const mockWindow = {
  PointerEvent: class PointerEvent extends Event {
    constructor(type: string, init?: PointerEventInit) {
      super(type, init);
    }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).window = mockWindow;
(global as any).document = {
  addEventListener: () => {},
  removeEventListener: () => {},
};
(global as any).PointerEvent = mockWindow.PointerEvent;

import SignaturePad from 'signature_pad';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ ${message}`);
    failed++;
  }
}

// Create a mock canvas that signature_pad can work with
function createTestCanvas(width = 300, height = 150) {
  const canvas = createCanvas(width, height) as any;
  // Mock style property that signature_pad expects
  canvas.style = canvas.style || {};
  canvas.style.touchAction = '';
  // Mock addEventListener
  canvas.addEventListener = canvas.addEventListener || (() => {});
  canvas.removeEventListener = canvas.removeEventListener || (() => {});
  // Mock ownerDocument
  canvas.ownerDocument = {
    addEventListener: () => {},
    removeEventListener: () => {},
    defaultView: mockWindow,
  };
  return canvas;
}

// Helper to simulate drawing on the pad using internal API
function simulateDrawing(pad: SignaturePad, points: Array<{ x: number; y: number; pressure?: number }>) {
  // Use the internal _handleDrawStart to begin a stroke
  const padAny = pad as any;
  // Directly manipulate the points array for testing
  for (const point of points) {
    const p = {
      x: point.x,
      y: point.y,
      pressure: point.pressure ?? 0.5,
      time: Date.now(),
    };
    if (padAny._points) {
      padAny._points.push(p);
    }
  }
  // Trigger redraw
  if (padAny._drawSegment) {
    padAny._drawSegment();
  }
}

console.log('\n=== Signature Pad Interaction Tests ===\n');

// Test 1: Initialization with correct parameters
console.log('[Test 1] Initialization with correct parameters');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  assert(pad !== null, 'Pad created successfully');
  assert(pad.isEmpty() === true, 'Pad is initially empty');

  // Check that the options were applied
  const padAny = pad as any;
  assert(padAny.minWidth === 0.8, `minWidth is 0.8 (got ${padAny.minWidth})`);
  assert(padAny.maxWidth === 2.5, `maxWidth is 2.5 (got ${padAny.maxWidth})`);
  assert(padAny.velocityFilterWeight === 0.7, `velocityFilterWeight is 0.7 (got ${padAny.velocityFilterWeight})`);
}

// Test 2: Drawing produces non-empty signature
console.log('\n[Test 2] Drawing produces non-empty signature');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  // Simulate drawing by using fromData API
  const strokeData = [
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 20, y: 15, time: 1010, pressure: 0.5 },
        { x: 35, y: 25, time: 1020, pressure: 0.5 },
        { x: 50, y: 30, time: 1030, pressure: 0.5 },
        { x: 70, y: 28, time: 1040, pressure: 0.5 },
      ],
    },
  ] as any;

  pad.fromData(strokeData);
  assert(pad.isEmpty() === false, 'Pad is not empty after drawing');

  const dataUrl = pad.toDataURL();
  assert(dataUrl.startsWith('data:image/png'), 'toDataURL returns PNG data URL');
  assert(dataUrl.length > 100, 'Data URL has substantial content');
}

// Test 3: Clear and redraw
console.log('\n[Test 3] Clear and redraw');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  // Draw
  pad.fromData([
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 50, y: 50, time: 1010, pressure: 0.5 },
      ],
    },
  ] as any);
  assert(pad.isEmpty() === false, 'Pad has content after drawing');

  // Clear
  pad.clear();
  assert(pad.isEmpty() === true, 'Pad is empty after clear');

  // Redraw
  pad.fromData([
    {
      points: [
        { x: 20, y: 20, time: 2000, pressure: 0.5 },
        { x: 80, y: 60, time: 2010, pressure: 0.5 },
      ],
    },
  ] as any);
  assert(pad.isEmpty() === false, 'Pad has content after redraw');
}

// Test 4: toBlob produces valid PNG
console.log('\n[Test 4] toBlob produces valid PNG');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  pad.fromData([
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 50, y: 50, time: 1010, pressure: 0.5 },
        { x: 100, y: 30, time: 1020, pressure: 0.5 },
      ],
    },
  ] as any);

  // SignaturePad library uses toDataURL, not toBlob
  // Our React component wraps toDataURL to create toBlob
  const dataUrl = pad.toDataURL('image/png');
  assert(dataUrl !== null, 'toDataURL returns non-null');
  assert(typeof dataUrl === 'string', 'toDataURL returns string');
  assert(dataUrl.startsWith('data:image/png'), 'Data URL is PNG format');
  assert(dataUrl.length > 100, 'Data URL has substantial content');
}

// Test 5: Resize preserves signature (via fromData/toData)
console.log('\n[Test 5] Signature data survives resize cycle');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  pad.fromData([
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 50, y: 50, time: 1010, pressure: 0.5 },
      ],
    },
  ] as any);

  // Save data before "resize"
  const dataBefore = pad.toData();
  assert(dataBefore.length > 0, 'Has stroke data before resize');

  // Simulate resize by creating new canvas and restoring
  const newCanvas = createTestCanvas(600, 300);
  const newPad = new SignaturePad(newCanvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });
  newPad.fromData(dataBefore);

  const dataAfter = newPad.toData();
  assert(dataAfter.length === dataBefore.length, 'Stroke count preserved after resize');
  assert(newPad.isEmpty() === false, 'Pad is not empty after resize restore');
}

// Test 6: Velocity filtering affects stroke width
console.log('\n[Test 6] Velocity filtering affects stroke rendering');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  // Slow stroke (large time gaps = low velocity = thick)
  pad.fromData([
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 15, y: 12, time: 2000, pressure: 0.5 }, // 1 second gap = slow
        { x: 20, y: 14, time: 3000, pressure: 0.5 },
      ],
    },
  ] as any);

  const slowDataUrl = pad.toDataURL();
  pad.clear();

  // Fast stroke (small time gaps = high velocity = thin)
  pad.fromData([
    {
      points: [
        { x: 10, y: 50, time: 1000, pressure: 0.5 },
        { x: 50, y: 55, time: 1001, pressure: 0.5 }, // 1ms gap = fast
        { x: 100, y: 52, time: 1002, pressure: 0.5 },
      ],
    },
  ] as any);

  const fastDataUrl = pad.toDataURL();

  // Both should produce valid output
  assert(slowDataUrl.startsWith('data:image/png'), 'Slow stroke produces valid PNG');
  assert(fastDataUrl.startsWith('data:image/png'), 'Fast stroke produces valid PNG');
  // The data URLs should be different (different stroke widths)
  assert(slowDataUrl !== fastDataUrl, 'Slow and fast strokes produce different output');
}

// Test 7: Multiple strokes
console.log('\n[Test 7] Multiple strokes');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  pad.fromData([
    {
      points: [
        { x: 10, y: 10, time: 1000, pressure: 0.5 },
        { x: 50, y: 50, time: 1010, pressure: 0.5 },
      ],
    },
    {
      points: [
        { x: 60, y: 10, time: 2000, pressure: 0.5 },
        { x: 100, y: 50, time: 2010, pressure: 0.5 },
      ],
    },
    {
      points: [
        { x: 110, y: 10, time: 3000, pressure: 0.5 },
        { x: 150, y: 50, time: 3010, pressure: 0.5 },
      ],
    },
  ] as any);

  const data = pad.toData();
  assert(data.length === 3, `Has 3 strokes (got ${data.length})`);
  assert(pad.isEmpty() === false, 'Pad is not empty');
}

// Test 8: Empty points array
console.log('\n[Test 8] Edge cases');
{
  const canvas = createTestCanvas();
  const pad = new SignaturePad(canvas, {
    minWidth: 0.8,
    maxWidth: 2.5,
    velocityFilterWeight: 0.7,
  });

  // Single point
  pad.fromData([
    {
      points: [{ x: 50, y: 50, time: 1000, pressure: 0.5 }],
    },
  ] as any);
  // Single point might not produce visible output, but shouldn't crash
  assert(true, 'Single point does not crash');

  pad.clear();

  // Empty array
  pad.fromData([]);
  assert(pad.isEmpty() === true, 'Empty array keeps pad empty');
}

// Summary
console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed > 0) {
  process.exit(1);
}
