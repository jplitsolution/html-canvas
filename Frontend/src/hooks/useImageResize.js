import { useState, useCallback, useEffect, useRef } from 'react';

export default function useImageResize({
  width: initialWidth = 400,
  height: initialHeight = 300,
  lockRatio: initialLockRatio = true,
  onUpdate = () => {}
} = {}) {
  const [width, setWidth] = useState(initialWidth);
  const [height, setHeight] = useState(initialHeight);
  const [lockRatio, setLockRatio] = useState(initialLockRatio);
  
  const ratioRef = useRef(initialWidth / initialHeight || 4/3);

  // Re-sync if initial values change externally
  useEffect(() => {
    setWidth(initialWidth);
    setHeight(initialHeight);
    setLockRatio(initialLockRatio);
    if (initialHeight > 0) {
      ratioRef.current = initialWidth / initialHeight;
    }
  }, [initialWidth, initialHeight, initialLockRatio]);

  const updateWidth = useCallback((newWidth) => {
    const w = Math.max(40, parseInt(newWidth, 10) || 0);
    setWidth(w);
    
    if (lockRatio && ratioRef.current) {
      const h = Math.round(w / ratioRef.current);
      setHeight(h);
      onUpdate({ width: w, height: h, lockRatio });
    } else {
      if (height > 0) {
        ratioRef.current = w / height;
      }
      onUpdate({ width: w, height, lockRatio });
    }
  }, [lockRatio, height, onUpdate]);

  const updateHeight = useCallback((newHeight) => {
    const h = Math.max(40, parseInt(newHeight, 10) || 0);
    setHeight(h);
    
    if (lockRatio && ratioRef.current) {
      const w = Math.round(h * ratioRef.current);
      setWidth(w);
      onUpdate({ width: w, height: h, lockRatio });
    } else {
      if (h > 0) {
        ratioRef.current = width / h;
      }
      onUpdate({ width, height: h, lockRatio });
    }
  }, [lockRatio, width, onUpdate]);

  const toggleLockRatio = useCallback(() => {
    setLockRatio((prev) => {
      const next = !prev;
      if (next && height > 0) {
        ratioRef.current = width / height;
      }
      onUpdate({ width, height, lockRatio: next });
      return next;
    });
  }, [width, height, onUpdate]);

  return {
    width,
    height,
    lockRatio,
    updateWidth,
    updateHeight,
    toggleLockRatio,
    setDimensions: useCallback((w, h) => {
      setWidth(w);
      setHeight(h);
      if (h > 0) {
        ratioRef.current = w / h;
      }
    }, [])
  };
}
