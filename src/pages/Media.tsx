import { useState, useRef, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProductMedia } from '@/db/dexie';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import imageCompression from 'browser-image-compression';
import { shareFile, downloadBlob } from '@/utils/share';
import { Upload, Image as ImageIcon, Film, Trash2, Download, Share2, Loader2, X, Type } from 'lucide-react';

export default function Media() {
    // Items + products from Supabase
    const items = useSupabaseQuery(['items'], () => DAL.items.getAll(), []) as any[];
    const allProducts = useSupabaseQuery(['products'], () => DAL.products.getAll(), []) as any[];
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);
    const { isProcessing, ffmpegProgress, setIsProcessing, setFFmpegProgress, setProcessingMessage, processingMessage } = useAppStore();

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const mediaItems: ProductMedia[] = useLiveQuery(
        () => (selectedItemId ? db.product_media.where('item_id').equals(selectedItemId).toArray() : Promise.resolve([] as ProductMedia[])),
        [selectedItemId]
    ) || [];
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [textOverlayId, setTextOverlayId] = useState<number | null>(null);
    const [overlayText, setOverlayText] = useState('');

    // Product map for richer share text
    const productMap = useMemo(() => {
        const m = new Map<number, string>();
        allProducts.forEach((p) => m.set(p.id!, p.name));
        return m;
    }, [allProducts]);

    // Get selected item info for share text
    const selectedItem = useMemo(
        () => items.find((i) => i.id === selectedItemId),
        [items, selectedItemId]
    );

    const getShareText = (media: ProductMedia) => {
        if (!selectedItem) return media.filename;
        const product = selectedItem.product_id ? productMap.get(selectedItem.product_id) : '';
        const parts = [
            product || '',
            selectedItem.item_name,
            selectedItem.category || '',
            selectedItem.retail_price_unit ? `Lean: Rs.${selectedItem.retail_price_unit.toFixed(2)}/u` : '',
            selectedItem.wholesale_price_unit ? `Bulk: Rs.${selectedItem.wholesale_price_unit.toFixed(2)}/u` : '',
            activeBusiness || '',
        ].filter(Boolean);
        return parts.join(' · ');
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedItemId || !e.target.files) return;

        const files = Array.from(e.target.files);
        setIsProcessing(true);
        setProcessingMessage('Compressing images...');

        try {
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                setFFmpegProgress(((i + 1) / files.length) * 100);
                setProcessingMessage(`Compressing ${i + 1}/${files.length}...`);

                // Compress if image (but NOT gifs, which break animation when compressed)
                if (file.type.startsWith('image/') && file.type !== 'image/gif') {
                    const compressed = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    });
                    file = new File([compressed], file.name, { type: compressed.type });
                }

                const media: ProductMedia = {
                    item_id: selectedItemId,
                    media_role: 'gallery',
                    data: file,
                    filename: file.name,
                    mime_type: file.type,
                    createdAt: new Date().toISOString(),
                };
                await db.product_media.add(media);
            }
            addToast(`${files.length} image(s) uploaded`, 'success');
        } catch (e) {
            addToast('Upload failed', 'error');
        } finally {
            setIsProcessing(false);
            setFFmpegProgress(0);
            setProcessingMessage('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (id: number) => {
        await db.product_media.delete(id);
        addToast('Media deleted', 'info');
    };

    const handleGenerateGif = async () => {
        if (mediaItems.length < 2) {
            addToast('Need at least 2 images for a GIF', 'error');
            return;
        }

        setIsProcessing(true);
        setProcessingMessage('Generating GIF via Web Worker...');
        setFFmpegProgress(10);

        try {
            // Create a Web Worker for FFmpeg processing
            const worker = new Worker(
                new URL('@/workers/ffmpeg.worker.ts', import.meta.url),
                { type: 'module' }
            );

            const imageBlobs: Blob[] = mediaItems
                .filter((m) => m.mime_type.startsWith('image/'))
                .map((m) => m.data);

            worker.postMessage({ type: 'generate-gif', images: imageBlobs });

            worker.onmessage = (e) => {
                const { type, progress, result, error } = e.data;
                if (type === 'progress') {
                    setFFmpegProgress(progress);
                    setProcessingMessage(`Processing: ${progress}%`);
                } else if (type === 'complete') {
                    const itemName = selectedItem?.item_name || 'flipbook';
                    const safeName = itemName.replace(/[^a-zA-Z0-9_-]/g, '_');
                    downloadBlob(result, `${safeName}-${Date.now()}.gif`);
                    addToast('GIF generated!', 'success');
                    setIsProcessing(false);
                    setFFmpegProgress(0);
                    setProcessingMessage('');
                    worker.terminate();
                } else if (type === 'error') {
                    addToast(`GIF generation failed: ${error}`, 'error');
                    setIsProcessing(false);
                    setFFmpegProgress(0);
                    worker.terminate();
                }
            };
        } catch (e) {
            addToast('GIF generation failed', 'error');
            setIsProcessing(false);
            setFFmpegProgress(0);
        }
    };

    const handleShareMedia = async (item: ProductMedia) => {
        const file = new File([item.data], item.filename, { type: item.mime_type });
        await shareFile(file, getShareText(item));
    };

    const handleDownloadMedia = (item: ProductMedia) => {
        downloadBlob(item.data, item.filename);
    };

    // Canvas-based text overlay — add text to an image and save
    const handleTextOverlay = async (media: ProductMedia) => {
        if (!overlayText.trim()) {
            addToast('Enter text to overlay', 'error');
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            const url = URL.createObjectURL(media.data);

            await new Promise<void>((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Text overlay — bottom center with semi-transparent background
                    const fontSize = Math.max(16, Math.floor(img.width / 20));
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    const textMetrics = ctx.measureText(overlayText);
                    const textWidth = textMetrics.width;
                    const padding = fontSize * 0.5;
                    const boxHeight = fontSize * 1.6;
                    const boxY = img.height - boxHeight - padding;
                    const boxX = (img.width - textWidth) / 2 - padding;

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
                    ctx.roundRect?.(boxX, boxY, textWidth + padding * 2, boxHeight, 8);
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(overlayText, img.width / 2, boxY + boxHeight / 2);

                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.src = url;
            });

            const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob((b) => resolve(b!), 'image/png')
            );

            const overlaidMedia: ProductMedia = {
                item_id: media.item_id,
                media_role: 'gallery',
                data: blob,
                filename: `overlay-${media.filename.replace(/\.[^.]+$/, '')}.png`,
                mime_type: 'image/png',
                createdAt: new Date().toISOString(),
            };
            await db.product_media.add(overlaidMedia);
            addToast('Text overlay saved as new image', 'success');
            setTextOverlayId(null);
            setOverlayText('');
        } catch (e) {
            addToast('Overlay failed', 'error');
        }
    };

    // Canvas-based watermark — stamp business name diagonally
    const handleWatermark = async (media: ProductMedia) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            const img = new Image();
            const url = URL.createObjectURL(media.data);

            await new Promise<void>((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Diagonal watermark
                    const text = activeBusiness || 'SAMPLE';
                    const fontSize = Math.max(24, Math.floor(img.width / 12));
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.translate(img.width / 2, img.height / 2);
                    ctx.rotate(-Math.PI / 4);

                    // Tile the watermark
                    for (let y = -img.height; y < img.height; y += fontSize * 3) {
                        for (let x = -img.width; x < img.width; x += ctx.measureText(text).width + fontSize * 2) {
                            ctx.fillText(text, x, y);
                        }
                    }

                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.src = url;
            });

            const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob((b) => resolve(b!), 'image/png')
            );

            const wmMedia: ProductMedia = {
                item_id: media.item_id,
                media_role: 'gallery',
                data: blob,
                filename: `watermarked-${media.filename.replace(/\.[^.]+$/, '')}.png`,
                mime_type: 'image/png',
                createdAt: new Date().toISOString(),
            };
            await db.product_media.add(wmMedia);
            addToast('Watermarked copy saved', 'success');
        } catch (e) {
            addToast('Watermark failed', 'error');
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Item selector */}
                <select
                    className="input-field max-w-xs"
                    value={selectedItemId || ''}
                    onChange={(e) => setSelectedItemId(parseInt(e.target.value) || null)}
                >
                    <option value="">Select an item...</option>
                    {items.map((i) => (
                        <option key={i.id} value={i.id}>{i.item_name}</option>
                    ))}
                </select>

                {selectedItemId && (
                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn-primary text-sm flex items-center gap-2"
                            disabled={isProcessing}
                        >
                            <Upload className="h-4 w-4" /> Upload Images
                        </button>
                        <button
                            onClick={handleGenerateGif}
                            className="btn-secondary text-sm flex items-center gap-2"
                            disabled={isProcessing || mediaItems.length < 2}
                        >
                            <Film className="h-4 w-4" /> Generate GIF
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isProcessing && (
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                        <span className="text-sm text-surface-500">{processingMessage}</span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${ffmpegProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Media Grid */}
            {selectedItemId ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {mediaItems.length === 0 ? (
                        <div className="col-span-full glass rounded-xl p-12 text-center">
                            <ImageIcon className="h-12 w-12 text-surface-600 mx-auto mb-3" />
                            <p className="text-surface-500">No media yet. Upload some images!</p>
                        </div>
                    ) : (
                        mediaItems.map((item) => (
                            <div key={item.id} className="glass rounded-xl overflow-hidden group card-hover">
                                <div className="aspect-square bg-surface-100 relative">
                                    <img
                                        src={URL.createObjectURL(item.data)}
                                        alt={item.filename}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                        <button
                                            onClick={() => handleShareMedia(item)}
                                            className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                                            title="Share with item info"
                                        >
                                            <Share2 className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadMedia(item)}
                                            className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => { setTextOverlayId(item.id!); setOverlayText(''); }}
                                            className="h-8 w-8 rounded-full bg-brand-500/30 flex items-center justify-center hover:bg-brand-500/50"
                                            title="Add text overlay"
                                        >
                                            <Type className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleWatermark(item)}
                                            className="h-8 w-8 rounded-full bg-amber-500/30 flex items-center justify-center hover:bg-amber-500/50"
                                            title="Add watermark"
                                        >
                                            <span className="text-xs font-bold text-white">W</span>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id!)}
                                            className="h-8 w-8 rounded-full bg-red-500/30 flex items-center justify-center hover:bg-red-500/50"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <p className="text-xs text-surface-500 truncate">{item.filename}</p>
                                </div>

                                {/* Text overlay input (shown inline when active) */}
                                {textOverlayId === item.id && (
                                    <div className="p-2 border-t border-surface-200 flex gap-1">
                                        <input
                                            className="input-field text-xs flex-1"
                                            placeholder="Enter text..."
                                            value={overlayText}
                                            onChange={(e) => setOverlayText(e.target.value)}
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => handleTextOverlay(item)}
                                            className="btn-primary text-xs px-2 py-1"
                                        >
                                            Add
                                        </button>
                                        <button
                                            onClick={() => setTextOverlayId(null)}
                                            className="btn-ghost text-xs px-2 py-1"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="glass rounded-xl p-12 text-center">
                    <ImageIcon className="h-16 w-16 text-surface-300 mx-auto mb-3" />
                    <p className="text-surface-500">Select a product to manage its media</p>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleUpload}
            />
        </div>
    );
}
