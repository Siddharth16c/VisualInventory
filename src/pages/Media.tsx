import { useState, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ProductMedia, type Product } from '@/db/dexie';
import { useAppStore } from '@/store/store';
import imageCompression from 'browser-image-compression';
import { shareFile, downloadBlob } from '@/utils/share';
import { Upload, Image as ImageIcon, Film, Trash2, Download, Share2, Loader2, X } from 'lucide-react';

export default function Media() {
    const products = useLiveQuery(() => db.products.toArray()) || [];
    const addToast = useAppStore((s) => s.addToast);
    const { isProcessing, ffmpegProgress, setIsProcessing, setFFmpegProgress, setProcessingMessage, processingMessage } = useAppStore();

    const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
    const mediaItems: ProductMedia[] = useLiveQuery(
        () => (selectedProductId ? db.product_media.where('product_id').equals(selectedProductId).toArray() : Promise.resolve([] as ProductMedia[])),
        [selectedProductId]
    ) || [];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedProductId || !e.target.files) return;

        const files = Array.from(e.target.files);
        setIsProcessing(true);
        setProcessingMessage('Compressing images...');

        try {
            for (let i = 0; i < files.length; i++) {
                let file = files[i];
                setFFmpegProgress(((i + 1) / files.length) * 100);
                setProcessingMessage(`Compressing ${i + 1}/${files.length}...`);

                // Compress if image
                if (file.type.startsWith('image/')) {
                    const compressed = await imageCompression(file, {
                        maxSizeMB: 1,
                        maxWidthOrHeight: 1920,
                        useWebWorker: true,
                    });
                    file = new File([compressed], file.name, { type: compressed.type });
                }

                const media: ProductMedia = {
                    product_id: selectedProductId,
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
                    downloadBlob(result, `flipbook-${Date.now()}.gif`);
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
        await shareFile(file, `Product image: ${item.filename}`);
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Product selector */}
                <select
                    className="input-field max-w-xs"
                    value={selectedProductId || ''}
                    onChange={(e) => setSelectedProductId(parseInt(e.target.value) || null)}
                >
                    <option value="">Select a product...</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.product_name} — {p.item_name}</option>
                    ))}
                </select>

                {selectedProductId && (
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
                        <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
                        <span className="text-sm text-surface-300">{processingMessage}</span>
                    </div>
                    <div className="w-full bg-surface-800 rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${ffmpegProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Media Grid */}
            {selectedProductId ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {mediaItems.length === 0 ? (
                        <div className="col-span-full glass rounded-xl p-12 text-center">
                            <ImageIcon className="h-12 w-12 text-surface-600 mx-auto mb-3" />
                            <p className="text-surface-500">No media yet. Upload some images!</p>
                        </div>
                    ) : (
                        mediaItems.map((item) => (
                            <div key={item.id} className="glass rounded-xl overflow-hidden group card-hover">
                                <div className="aspect-square bg-surface-800 relative">
                                    <img
                                        src={URL.createObjectURL(item.data)}
                                        alt={item.filename}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                        <button onClick={() => handleShareMedia(item)} className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30">
                                            <Share2 className="h-4 w-4 text-white" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id!)} className="h-8 w-8 rounded-full bg-red-500/30 flex items-center justify-center hover:bg-red-500/50">
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <p className="text-xs text-surface-400 truncate">{item.filename}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="glass rounded-xl p-12 text-center">
                    <ImageIcon className="h-16 w-16 text-surface-600 mx-auto mb-3" />
                    <p className="text-surface-400">Select a product to manage its media</p>
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
