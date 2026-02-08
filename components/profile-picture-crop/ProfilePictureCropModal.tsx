'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import styles from './profile-picture-crop.module.scss';

const CROP_SIZE = 280;
const CROP_RADIUS = CROP_SIZE / 2;
const OUTPUT_SIZE = 400;

export interface ProfilePictureCropModalProps {
  file: File;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
}

export default function ProfilePictureCropModal({ file, onApply, onCancel }: ProfilePictureCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNaturalSize({ width: w, height: h });
    const fitScale = Math.max(CROP_SIZE / w, CROP_SIZE / h);
    setScale(fitScale);
    setOffsetX(0);
    setOffsetY(0);
    setImageLoaded(true);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!imageLoaded) return;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, offsetX, offsetY };
    },
    [imageLoaded, offsetX, offsetY]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setOffsetX(dragStart.current.offsetX + dx);
      setOffsetY(dragStart.current.offsetY + dy);
    },
    [dragging]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const handleApply = useCallback(() => {
    if (!imageRef.current || !imageLoaded) return;
    const img = imageRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / CROP_SIZE;
    ctx.save();
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.translate(OUTPUT_SIZE / 2 + offsetX * ratio, OUTPUT_SIZE / 2 + offsetY * ratio);
    ctx.scale(scale * ratio, scale * ratio);
    ctx.translate(-img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.drawImage(img, 0, 0);

    ctx.restore();

    const outputType = 'image/png';
    const outputName = file.name.replace(/\.[^.]+$/, '') + '.png';
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], outputName, { type: outputType });
        onApply(croppedFile);
      },
      outputType,
      0.92
    );
  }, [file, imageLoaded, scale, offsetX, offsetY, onApply]);

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Position your photo</h2>
          <button type="button" className={styles.close} onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <p className={styles.hint}>Drag to position and use the slider to zoom. The circle shows how your picture will appear.</p>
        <div className={styles.cropArea}>
          <div
            className={styles.cropCircle}
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {imageSrc && (
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className={styles.cropImage}
                style={{
                  transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
                }}
                onLoad={onImageLoad}
                draggable={false}
              />
            )}
          </div>
        </div>
        <div className={styles.zoomRow}>
          <label className={styles.zoomLabel} htmlFor="zoom-slider">
            Zoom
          </label>
          <input
            id="zoom-slider"
            type="range"
            min={0.3}
            max={3}
            step={0.05}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className={styles.zoomSlider}
          />
        </div>
        <div className={styles.footer}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={styles.applyButton} onClick={handleApply} disabled={!imageLoaded}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
