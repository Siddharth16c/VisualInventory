/**
 * Supabase Storage utility — replaces OPFS for image uploads
 *
 * Images are stored at: `media/{firm_id}/{item_id}/{timestamp_filename.webp}`
 * The public URL is stored in product_media.storage_path
 */

import { supabase } from '@/db/supabase';

const BUCKET = 'media';

/**
 * Compress a File to WebP and upload to Supabase Storage.
 * Returns the storage path string (not a public URL).
 */
export async function uploadMediaToSupabase(
    file: File,
    firmId: string,
    itemId: number
): Promise<string> {
    // 1. Compress to WebP using browser-image-compression (already installed)
    const imageCompression = (await import('browser-image-compression')).default;
    const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: 'image/webp',
    });

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '')}.webp`;
    const storagePath = `${firmId}/${itemId}/${safeName}`;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, compressed, {
        contentType: 'image/webp',
        upsert: false,
    });

    if (error) throw error;
    return storagePath;
}

/**
 * Get an inline-accessible public URL for a Supabase storage path.
 * Returns null if path is empty or undefined.
 */
export function getSupabaseMediaUrl(storagePath: string | null | undefined): string | null {
    if (!storagePath) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteMediaFromSupabase(storagePath: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) console.warn('[Storage] Delete failed:', error.message);
}
