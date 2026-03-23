import { useState, useRef, useMemo, useCallback } from 'react';
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery';
import { DAL } from '@/db/dal';
import { useAppStore } from '@/store/store';
import imageCompression from 'browser-image-compression';
import { shareFile, downloadBlob } from '@/utils/share';
import { Upload, Image as ImageIcon, Trash2, Download, Share2, Loader2, X, Check, Star } from 'lucide-react';
import type { ItemMedia } from '@/db/types';

interface ProcessedImage {
    file: File;
    base64: string;
    width: number;
    height: number;
    fileSizeKb: number;
}

export default function Media() {
    const items = useSupabaseQuery(['items'], () => DAL.items.getAll(), []) as any[];
    const addToast = useAppStore((s) => s.addToast);
    const activeBusiness = useAppStore((s) => s.activeBusiness);
    const { isProcessing, setIsProcessing, setProcessingMessage, processingMessage } = useAppStore();

    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch media for selected item
    const mediaItems = useSupabaseQuery(
        ['item_media', selectedItemId?.toString() || ''],
        async () => selectedItemId ? await DAL.item_media.getByItem(selectedItemId) : [],
        []
    ) as ItemMedia[];

    const selectedItem = useMemo(
        () => items.find((i) => i.id === selectedItemId),
        [items, selectedItemId]
    );

    /**
     * Add watermark to image using Canvas API
     * - Diagonal tiled watermark with business name
     * - 25% opacity white text
     * - Returns watermarked image as base64
     */
    const addWatermark = useCallback(async (imageFile: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(imageFile);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                canvas.width = img.width;
                canvas.height = img.height;

                // Draw original image
                ctx.drawImage(img, 0, 0);

                // Add watermark
                const watermarkText = activeBusiness || 'SAMPLE';
                const fontSize = Math.max(24, Math.floor(img.width / 10));
                
                ctx.save();
                ctx.font = `bold ${fontSize}px sans-serif`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Tile the watermark diagonally
                const textWidth = ctx.measureText(watermarkText).width;
                const spacingX = textWidth + fontSize * 2;
                const spacingY = fontSize * 3;

                ctx.translate(img.width / 2, img.height / 2);
                ctx.rotate(-Math.PI / 4);

                for (let y = -img.height * 1.5; y < img.height * 1.5; y += spacingY) {
                    for (let x = -img.width * 1.5; x < img.width * 1.5; x += spacingX) {
                        ctx.fillText(watermarkText, x, y);
                    }
                }

                ctx.restore();
                URL.revokeObjectURL(url);

                // Convert to base64 (WebP format for better compression)
                const base64 = canvas.toDataURL('image/webp', 0.85);
                resolve(base64);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }, [activeBusiness]);

    /**
     * Compress GIF by extracting frames and rebuilding at lower quality
     * Uses canvas to resize and re-encode
     */
    const compressGif = useCallback(async (gifFile: File): Promise<ProcessedImage> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(gifFile);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                // Resize GIF to max 800px (GIFs are larger, need more aggressive compression)
                const maxDimension = 800;
                let width = img.width;
                let height = img.height;

                if (width > height && width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                URL.revokeObjectURL(url);

                // Convert to WebP for better compression (fallback to PNG if needed)
                let base64: string;
                try {
                    base64 = canvas.toDataURL('image/webp', 0.7);
                } catch {
                    // Fallback to PNG if WebP not supported
                    base64 = canvas.toDataURL('image/png');
                }

                // Add watermark to the compressed frame
                addWatermark(new File([base64], gifFile.name, { type: 'image/webp' }))
                    .then(watermarkedBase64 => {
                        resolve({
                            file: gifFile,
                            base64: watermarkedBase64,
                            width,
                            height,
                            fileSizeKb: Math.ceil(watermarkedBase64.length * 0.75 / 1024),
                        });
                    })
                    .catch(reject);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load GIF'));
            };

            img.src = url;
        });
    }, [addWatermark]);

    /**
     * Process a single image: compress + watermark
     */
    const processImage = useCallback(async (file: File): Promise<ProcessedImage> => {
        // Handle GIFs - compress them differently
        if (file.type === 'image/gif') {
            return await compressGif(file);
        }

        // Step 1: Compress image (1MB max, 1200px max dimension)
        const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
            fileType: 'image/webp',
        });

        // Step 2: Add watermark
        const watermarkedBase64 = await addWatermark(compressedFile);

        // Get dimensions
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = watermarkedBase64;
        });

        return {
            file: compressedFile,
            base64: watermarkedBase64,
            width: dimensions.width,
            height: dimensions.height,
            fileSizeKb: Math.ceil(watermarkedBase64.length * 0.75 / 1024),
        };
    }, [addWatermark, compressGif]);

    /**
     * Handle multiple image uploads
     * - Compress + watermark each image
     - Save to Supabase directly (DAL)
     * - Sync will automatically update SQLite
     */
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedItemId || !e.target.files || e.target.files.length === 0) return;

        const files = Array.from(e.target.files);
        setIsProcessing(true);
        setProcessingMessage(`Processing ${files.length} image(s)...`);
        setUploadProgress({ current: 0, total: files.length });

        try {
            for (let i = 0; i < files.length; i++) {
                setUploadProgress({ current: i + 1, total: files.length });
                setProcessingMessage(`Processing ${i + 1}/${files.length}: ${files[i].name}`);

                const processed = await processImage(files[i]);

                // Save to Supabase directly via DAL
                await DAL.item_media.add({
                    item_id: selectedItemId,
                    media_role: 'gallery',
                    data_base64: processed.base64,
                    filename: files[i].name.replace(/\.[^/.]+$/, '') + '_watermarked.webp',
                    mime_type: 'image/webp',
                    file_size_kb: processed.fileSizeKb,
                    width: processed.width,
                    height: processed.height,
                    is_watermarked: true,
                });
            }

            addToast(`${files.length} image(s) uploaded with watermark`, 'success');
        } catch (e) {
            console.error('Upload failed:', e);
            addToast('Upload failed', 'error');
        } finally {
            setIsProcessing(false);
            setProcessingMessage('');
            setUploadProgress(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    /**
     * Delete a media item
     */
    const handleDelete = async (id: number) => {
        try {
            await DAL.item_media.delete(id);
            addToast('Media deleted', 'info');
        } catch (e) {
            addToast('Failed to delete', 'error');
        }
    };

    /**
     * Share media with item info
     */
    const handleShareMedia = async (media: ItemMedia) => {
        try {
            const response = await fetch(media.data_base64);
            const blob = await response.blob();
            const file = new File([blob], media.filename, { type: media.mime_type });
            
            const shareText = selectedItem
                ? `${selectedItem.item_name} · ${activeBusiness || ''}`
                : media.filename;
            
            await shareFile(file, shareText);
        } catch (e) {
            addToast('Failed to share', 'error');
        }
    };

    /**
     * Download media
     */
    const handleDownloadMedia = async (media: ItemMedia) => {
        try {
            const response = await fetch(media.data_base64);
            const blob = await response.blob();
            downloadBlob(blob, media.filename);
        } catch (e) {
            addToast('Failed to download', 'error');
        }
    };

    /**
     * Set media as item thumbnail (for billing/quick view)
     */
    const handleSetThumbnail = async (media: ItemMedia) => {
        if (!selectedItemId) return;

        try {
            await DAL.items.update(selectedItemId, {
                thumbnail_base64: media.data_base64,
            });
            addToast('Item thumbnail updated', 'success');
        } catch (e) {
            addToast('Failed to set thumbnail', 'error');
        }
    };

    /**
     * Set media as catalogue primary image
     * This determines which image appears in catalogue cards
     */
    const handleSetCataloguePrimary = async (media: ItemMedia) => {
        if (!selectedItemId) return;

        try {
            // First, set all media for this item to 'gallery'
            const itemMedia = mediaItems.filter(m => m.item_id === selectedItemId);
            for (const m of itemMedia) {
                if (m.id !== media.id && m.media_role === 'primary') {
                    await DAL.item_media.update(m.id, { media_role: 'gallery' });
                }
            }

            // Set selected media as primary
            await DAL.item_media.update(media.id, { media_role: 'primary' });
            addToast('Catalogue primary image set', 'success');
        } catch (e) {
            addToast('Failed to set catalogue image', 'error');
        }
    };

    return (
        <div className="animate-fade-in space-y-4">
            {/* Header Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
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
                            <Upload className="h-4 w-4" /> 
                            Upload Images
                        </button>
                    </div>
                )}
            </div>

            {/* Progress Bar */}
            {isProcessing && uploadProgress && (
                <div className="glass rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                        <span className="text-sm text-surface-500">
                            {processingMessage}
                        </span>
                    </div>
                    <div className="w-full bg-surface-200 rounded-full h-2.5">
                        <div
                            className="bg-gradient-to-r from-brand-600 to-brand-400 h-2.5 rounded-full transition-all duration-300"
                            style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-surface-400 mt-1">
                        {uploadProgress.current} of {uploadProgress.total} images processed
                    </p>
                </div>
            )}

            {/* Watermark Notice */}
            {selectedItemId && !isProcessing && (
                <div className="glass rounded-xl p-3 bg-amber-50/50 border border-amber-200">
                    <p className="text-xs text-amber-700">
                        All uploaded images will be automatically watermarked with &quot;{activeBusiness || 'Business Name'}&quot; 
                        and compressed to max 1MB for optimal sharing.
                    </p>
                </div>
            )}

            {/* Media Grid */}
            {selectedItemId ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {mediaItems.length === 0 ? (
                        <div className="col-span-full glass rounded-xl p-12 text-center">
                            <ImageIcon className="h-12 w-12 text-surface-600 mx-auto mb-3" />
                            <p className="text-surface-500">No media yet. Upload some images!</p>
                            <p className="text-xs text-surface-400 mt-2">
                                Images will be watermarked and compressed automatically
                            </p>
                        </div>
                    ) : (
                        mediaItems.map((media) => (
                            <div key={media.id} className="glass rounded-xl overflow-hidden group card-hover">
                                <div className="aspect-square bg-surface-100 relative">
                                    <img
                                        src={media.data_base64}
                                        alt={media.filename}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                    {/* Watermark Badge */}
                                    {media.is_watermarked && (
                                        <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500/80 text-white text-[8px] rounded">
                                            W
                                        </div>
                                    )}
                                    {/* Hover Actions */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                        <button
                                            onClick={() => handleShareMedia(media)}
                                            className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                                            title="Share"
                                        >
                                            <Share2 className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadMedia(media)}
                                            className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
                                            title="Download"
                                        >
                                            <Download className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleSetThumbnail(media)}
                                            className="h-8 w-8 rounded-full bg-green-500/30 flex items-center justify-center hover:bg-green-500/50"
                                            title="Set as item thumbnail"
                                        >
                                            <Check className="h-4 w-4 text-white" />
                                        </button>
                                        <button
                                            onClick={() => handleSetCataloguePrimary(media)}
                                            className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                                media.media_role === 'primary' 
                                                    ? 'bg-yellow-500 text-white' 
                                                    : 'bg-yellow-500/30 hover:bg-yellow-500/50'
                                            }`}
                                            title={media.media_role === 'primary' ? 'Catalogue primary image' : 'Set as catalogue primary'}
                                        >
                                            <Star className="h-4 w-4 text-white" fill={media.media_role === 'primary' ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(media.id)}
                                            className="h-8 w-8 rounded-full bg-red-500/30 flex items-center justify-center hover:bg-red-500/50"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4 text-white" />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2">
                                    <p className="text-xs text-surface-500 truncate">{media.filename}</p>
                                    <p className="text-[10px] text-surface-400">
                                        {media.file_size_kb ? `${media.file_size_kb} KB` : ''}
                                        {media.width && media.height ? ` · ${media.width}×${media.height}` : ''}
                                    </p>
                                </div>
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

            {/* Current Thumbnail Preview */}
            {selectedItem?.thumbnail_base64 && (
                <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-medium text-surface-600 mb-2">Current Item Thumbnail</h3>
                    <div className="flex items-center gap-3">
                        <img
                            src={selectedItem.thumbnail_base64}
                            alt="Thumbnail"
                            className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="text-xs text-surface-500">
                            <p>Used in billing and catalogues</p>
                        </div>
                    </div>
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.gif"
                multiple
                className="hidden"
                onChange={handleUpload}
            />
        </div>
    );
}
