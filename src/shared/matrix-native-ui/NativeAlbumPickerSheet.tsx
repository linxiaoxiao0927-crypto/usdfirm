"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SpringSegmentedTabs, type SpringTabItem } from './SpringSegmentedTabs';

export interface MatrixPickedMediaItem {
  id: string;
  mediaType: 'image' | 'video';
  previewUrl: string;
  thumbUrl: string;
  filePath?: string;
  localIdentifier?: string;
  file?: File;
  fileName: string;
  mimeType: string;
  fileSize: number;
  width?: number;
  height?: number;
  durationSec?: number;
  original?: boolean;
}

export interface NativeAlbumPickerSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: MatrixPickedMediaItem[], meta: { original: boolean }) => void | Promise<void>;
  maxCount?: number;
  mediaType?: 'image' | 'video' | 'all';
  title?: string;
  confirmLabel?: string;
  allowOriginalToggle?: boolean;
  locale?: string;
  testId?: string;
}

type FilterTab = 'all' | 'image' | 'video';

async function decodeLocalFilesFast(filesInput: FileList | File[]): Promise<MatrixPickedMediaItem[]> {
  const files = Array.from(filesInput || []);
  const base: MatrixPickedMediaItem[] = files.map((file, idx) => {
    const isVideo = file.type.startsWith('video/');
    const previewUrl = URL.createObjectURL(file);
    return {
      id: `mnu_local_${Date.now()}_${idx}`,
      mediaType: isVideo ? 'video' : 'image',
      previewUrl,
      thumbUrl: isVideo ? '' : previewUrl,
      file,
      fileName: file.name || `media_${idx + 1}`,
      mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      fileSize: file.size || 0,
    };
  });

  if (typeof createImageBitmap !== 'function') return base;
  let cursor = 0;
  const workers = Array.from({ length: Math.min(4, base.length) }, async () => {
    while (cursor < base.length) {
      const idx = cursor++;
      const item = base[idx];
      if (item.mediaType !== 'image' || !item.file) continue;
      try {
        const bmp = await createImageBitmap(item.file);
        const scale = Math.min(1, 360 / Math.max(1, bmp.width, bmp.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bmp.width * scale));
        canvas.height = Math.max(1, Math.round(bmp.height * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.78));
          if (blob) {
            base[idx] = {
              ...item,
              thumbUrl: URL.createObjectURL(blob),
              width: bmp.width,
              height: bmp.height,
            };
          }
        }
        bmp.close();
      } catch {
        // Fallback to raw ObjectURL preview.
      }
    }
  });
  await Promise.all(workers);
  return base;
}

export function NativeAlbumPickerSheet({
  open,
  onClose,
  onConfirm,
  maxCount = 9,
  mediaType = 'all',
  title,
  confirmLabel,
  allowOriginalToggle = true,
  locale = 'zh-CN',
  testId = 'matrix-native-album-sheet',
}: NativeAlbumPickerSheetProps) {
  const isEn = locale.toLowerCase().startsWith('en');
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<MatrixPickedMediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterTab, setFilterTab] = useState<FilterTab>(
    mediaType === 'image' ? 'image' : mediaType === 'video' ? 'video' : 'all'
  );
  const [useOriginal, setUseOriginal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const dragSelectRef = useRef<{
    active: boolean;
    mode: 'select' | 'deselect';
    pointerId: number;
    lastIndex: number;
    visited: Set<string>;
  }>({
    active: false,
    mode: 'select',
    pointerId: -1,
    lastIndex: -1,
    visited: new Set(),
  });

  useEffect(() => {
    if (typeof document !== 'undefined') setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!open) {
      setSelectedIds([]);
      setSubmitting(false);
      return;
    }
    const bridge = (window as unknown as {
      SofaYesNativePhotos?: {
        fetchPhotoRoll?: (opts: { offset: number; limit: number; mediaType: string; thumbSize: number }) => Promise<any>;
      };
    }).SofaYesNativePhotos;
    if (bridge?.fetchPhotoRoll) {
      void bridge
        .fetchPhotoRoll({ offset: 0, limit: 60, mediaType, thumbSize: 480 })
        .then((res) => {
          if (res?.ok && Array.isArray(res.items)) {
            const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (p: string) => string } }).Capacitor;
            const mapped: MatrixPickedMediaItem[] = res.items.map((r: any, idx: number) => {
              const thumbUrl = r.thumbPath && cap?.convertFileSrc ? cap.convertFileSrc(r.thumbPath) : r.thumbPath || '';
              const isVid = r.mediaType === 'video';
              return {
                id: r.id || `roll_${idx}`,
                localIdentifier: r.localIdentifier,
                mediaType: isVid ? 'video' : 'image',
                previewUrl: isVid ? '' : thumbUrl,
                thumbUrl,
                fileName: r.mediaType === 'video' ? `IMG_${idx + 1}.mp4` : `IMG_${idx + 1}.jpg`,
                mimeType: r.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
                fileSize: 0,
                width: r.width,
                height: r.height,
                durationSec: r.durationSec,
              };
            });
            setItems(mapped);
          }
        })
        .catch(() => {});
    }
  }, [open, mediaType]);

  const displayed = useMemo(
    () =>
      items.filter((it) => {
        if (filterTab === 'image') return it.mediaType === 'image';
        if (filterTab === 'video') return it.mediaType === 'video';
        return true;
      }),
    [items, filterTab]
  );

  const toggleItem = useCallback(
    (id: string, forced?: 'select' | 'deselect') => {
      setSelectedIds((prev) => {
        const exists = prev.includes(id);
        const wantSelect = forced ? forced === 'select' : !exists;
        if (wantSelect) {
          if (exists) return prev;
          if (maxCount === 1) return [id];
          if (maxCount > 0 && prev.length >= maxCount) return prev;
          return [...prev, id];
        }
        return exists ? prev.filter((x) => x !== id) : prev;
      });
    },
    [maxCount]
  );

  const handleOpenSystemOrFiles = async () => {
    const bridge = (window as unknown as {
      SofaYesNativePhotos?: {
        pickMedia?: (opts: { maxCount: number; mediaType: string; maxEdge: number }) => Promise<any>;
      };
    }).SofaYesNativePhotos;
    if (bridge?.pickMedia) {
      try {
        const res = await bridge.pickMedia({
          maxCount: maxCount === 1 ? 1 : Math.max(1, maxCount - selectedIds.length),
          mediaType,
          maxEdge: useOriginal ? 4096 : 2048,
        });
        if (res?.ok && !res.canceled && Array.isArray(res.items) && res.items.length > 0) {
          const cap = (window as unknown as { Capacitor?: { convertFileSrc?: (p: string) => string } }).Capacitor;
          const mapped: MatrixPickedMediaItem[] = res.items.map((r: any, idx: number) => {
            const pUrl = r.filePath && cap?.convertFileSrc ? cap.convertFileSrc(r.filePath) : r.filePath;
            const tUrl = r.thumbPath && cap?.convertFileSrc ? cap.convertFileSrc(r.thumbPath) : pUrl;
            return {
              id: r.id || `php_${Date.now()}_${idx}`,
              localIdentifier: r.localIdentifier,
              mediaType: r.mediaType === 'video' ? 'video' : 'image',
              previewUrl: pUrl,
              thumbUrl: tUrl,
              filePath: r.filePath,
              fileName: r.fileName || `media_${idx + 1}.jpg`,
              mimeType: r.mimeType || 'image/jpeg',
              fileSize: r.fileSize || 0,
              width: r.width,
              height: r.height,
            };
          });
          setItems((prev) => [...mapped, ...prev]);
          setSelectedIds((prev) => [...prev, ...mapped.map((m) => m.id)].slice(0, maxCount));
          return;
        }
      } catch {
        // Fall through to input file picker.
      }
    }
    fileInputRef.current?.click();
  };

  if (!portalTarget || !open) return null;

  const tabs: SpringTabItem<FilterTab>[] = [
    { id: 'all', label: isEn ? 'All' : '全部' },
    { id: 'image', label: isEn ? 'Photos' : '照片' },
    { id: 'video', label: isEn ? 'Videos' : '视频' },
  ];

  const selectedItems = selectedIds
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is MatrixPickedMediaItem => Boolean(i));

  return createPortal(
    <div
      data-testid={testId}
      data-ios-subpage="true"
      data-scheme="dark"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10500,
        backgroundColor: '#000000',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        overscrollBehavior: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxCount !== 1}
        accept={mediaType === 'image' ? 'image/*' : mediaType === 'video' ? 'video/*' : 'image/*,video/*'}
        style={{ display: 'none' }}
        onChange={async (e) => {
          const files = e.target.files;
          e.target.value = '';
          if (!files || files.length === 0) return;
          const decoded = await decodeLocalFilesFast(files);
          setItems((prev) => [...decoded, ...prev]);
          setSelectedIds((prev) => [...prev, ...decoded.map((d) => d.id)].slice(0, maxCount));
        }}
      />

      <div
        style={{
          paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)',
          paddingBottom: '10px',
          paddingLeft: '12px',
          paddingRight: '12px',
          backgroundColor: 'rgba(18, 18, 20, 0.94)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          data-ios-subpage-back="true"
          aria-label={isEn ? 'Back' : '返回'}
          onClick={onClose}
          style={{
            minWidth: '44px',
            minHeight: '44px',
            borderRadius: '9999px',
            border: 'none',
            background: 'transparent',
            color: '#ffffff',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ‹
        </button>
        <div style={{ fontSize: '15px', fontWeight: 700, flex: 1 }}>
          {title || (isEn ? 'Photos' : '相册选择')}
        </div>
        <button
          type="button"
          onClick={handleOpenSystemOrFiles}
          style={{
            height: '34px',
            padding: '0 12px',
            borderRadius: '9999px',
            backgroundColor: '#1C1C1E',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {isEn ? 'System Album' : '系统相册'}
        </button>
      </div>

      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <SpringSegmentedTabs<FilterTab>
          items={tabs}
          value={filterTab}
          onChange={setFilterTab}
          tone="surface-pill"
          variant="scrollable"
        />
      </div>

      <div
        data-album-drag-zone="true"
        onPointerMove={(e) => {
          const ds = dragSelectRef.current;
          if (!ds.active || ds.pointerId !== e.pointerId) return;
          const tile = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-mnu-tile-id]');
          const hitId = tile?.getAttribute('data-mnu-tile-id');
          if (!hitId) return;
          const hitIdx = displayed.findIndex((it) => it.id === hitId);
          if (hitIdx < 0 || ds.lastIndex < 0) return;
          const start = Math.min(ds.lastIndex, hitIdx);
          const end = Math.max(ds.lastIndex, hitIdx);
          for (let i = start; i <= end; i++) {
            const target = displayed[i];
            if (!target || ds.visited.has(target.id)) continue;
            ds.visited.add(target.id);
            toggleItem(target.id, ds.mode);
          }
          ds.lastIndex = hitIdx;
        }}
        onPointerUp={() => {
          dragSelectRef.current.active = false;
          dragSelectRef.current.visited.clear();
        }}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '2px',
          padding: '2px',
          alignContent: 'start',
        }}
      >
        {displayed.map((it, idx) => {
          const selIdx = selectedIds.indexOf(it.id);
          const isSel = selIdx !== -1;
          return (
            <div
              key={it.id}
              data-mnu-tile-id={it.id}
              onClick={() => toggleItem(it.id)}
              style={{
                aspectRatio: '1 / 1',
                position: 'relative',
                backgroundColor: '#121214',
                overflow: 'hidden',
                cursor: 'pointer',
              }}
            >
              {(it.thumbUrl || it.previewUrl) && (
                <img
                  src={it.thumbUrl || it.previewUrl}
                  alt={it.fileName}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <button
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  const mode = isSel ? 'deselect' : 'select';
                  dragSelectRef.current = {
                    active: true,
                    mode,
                    pointerId: e.pointerId,
                    lastIndex: idx,
                    visited: new Set([it.id]),
                  };
                  toggleItem(it.id, mode);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  border: isSel ? 'none' : '1.5px solid rgba(255,255,255,0.85)',
                  backgroundColor: isSel ? '#10B981' : 'rgba(0,0,0,0.45)',
                  color: '#000000',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {isSel ? selIdx + 1 : ''}
              </button>
            </div>
          );
        })}
      </div>

      <div
        style={{
          flexShrink: 0,
          backgroundColor: '#121214',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          padding: '10px 14px calc(env(safe-area-inset-bottom, 0px) + 12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
        }}
      >
        {allowOriginalToggle ? (
          <button
            type="button"
            onClick={() => setUseOriginal((v) => !v)}
            style={{
              background: 'transparent',
              border: 'none',
              color: useOriginal ? '#10B981' : 'rgba(255,255,255,0.75)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {useOriginal ? '✓ 原图' : '○ 原图'}
          </button>
        ) : (
          <span />
        )}

        <button
          type="button"
          disabled={selectedItems.length === 0 || submitting}
          onClick={async () => {
            if (selectedItems.length === 0 || submitting) return;
            setSubmitting(true);
            try {
              await onConfirm(
                selectedItems.map((x) => ({ ...x, original: useOriginal })),
                { original: useOriginal }
              );
              onClose();
            } finally {
              setSubmitting(false);
            }
          }}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '9999px',
            backgroundColor: selectedItems.length > 0 ? '#10B981' : 'rgba(16,185,129,0.35)',
            color: '#000000',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            cursor: 'pointer',
          }}
        >
          {confirmLabel || (isEn ? 'Done' : '完成')}
          {selectedItems.length > 0 ? ` (${selectedItems.length})` : ''}
        </button>
      </div>
    </div>,
    portalTarget
  );
}
