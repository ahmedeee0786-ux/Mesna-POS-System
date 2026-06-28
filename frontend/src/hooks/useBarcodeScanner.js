import { useEffect, useRef } from 'react';

/**
 * useBarcodeScanner — listens for rapid keyboard input (USB barcode scanner emulation).
 * Scanners send characters as fast keydown events followed by an Enter key.
 * Buffer resets after 150ms of inactivity.
 *
 * @param {(barcode: string) => void} onScan  callback with the scanned barcode string
 * @param {boolean} enabled  set false to disable (e.g. when a modal is open)
 */
export function useBarcodeScanner(onScan, enabled = true) {
  const bufferRef   = useRef('');
  const timerRef    = useRef(null);
  const onScanRef   = useRef(onScan);

  // Keep ref in sync so the event listener always calls the latest callback
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore events from input/textarea/select elements (user is typing manually)
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        if (barcode.length > 0) {
          onScanRef.current(barcode);
        }
        bufferRef.current = '';
        clearTimeout(timerRef.current);
        return;
      }

      // Only accept printable characters
      if (e.key.length === 1) {
        bufferRef.current += e.key;

        // Reset buffer after 150ms of inactivity (scanner is fast, human is slow)
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          bufferRef.current = '';
        }, 150);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [enabled]);
}
