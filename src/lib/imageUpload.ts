/**
 * Thumbnail Generation Utility
 * Uses FFmpeg WASM for image resizing
 * Returns base64 encoded WebP for direct database storage
 * Works offline - no external storage needed
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
    await ffmpegInstance.load();
  }
  return ffmpegInstance;
}

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality?: number; // 1-100
  format?: 'webp' | 'jpeg' | 'png';
}

export const THUMBNAIL_PRESETS = {
  item: { width: 64, height: 64, quality: 85, format: 'webp' as const },      // ~5-10KB
  verticalIcon: { width: 48, height: 48, quality: 85, format: 'webp' as const }, // ~3-5KB
  marketing: { width: 800, height: 600, quality: 90, format: 'webp' as const }, // ~50-100KB
} as const;

/**
 * Generate a thumbnail and return as base64 string
 * Ready for direct storage in database
 */
export async function generateThumbnailBase64(
  file: File | Blob,
  options: ThumbnailOptions
): Promise<string> {
  const ffmpeg = await getFFmpeg();
  
  const inputExt = file.type === 'image/png' ? 'png' : 
                   file.type === 'image/webp' ? 'webp' : 
                   file.type === 'image/jpeg' ? 'jpg' : 'jpg';
  const outputExt = options.format || 'webp';
  
  const inputData = await fetchFile(file);
  await ffmpeg.writeFile(`input.${inputExt}`, inputData);
  
  const qualityArg = options.format === 'jpeg' 
    ? ['-q:v', String(Math.round((100 - (options.quality || 85)) / 10))]
    : ['-compression_level', String(Math.round((100 - (options.quality || 85)) / 10))];
  
  await ffmpeg.exec([
    '-i', `input.${inputExt}`,
    '-vf', `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:white`,
    ...qualityArg,
    '-f', 'image2',
    `output.${outputExt}`
  ]);
  
  const outputData = await ffmpeg.readFile(`output.${outputExt}`);
  
  const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 
                   options.format === 'png' ? 'image/png' : 'image/webp';
  
  // Convert to base64
  if (typeof outputData === 'string') {
    return `data:${mimeType};base64,${btoa(outputData)}`;
  }
  
  // outputData is Uint8Array
  const base64 = btoa(
    String.fromCharCode(...new Uint8Array(outputData as ArrayBuffer))
  );
  
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Generate thumbnail and return raw bytes (for binary storage if needed)
 */
export async function generateThumbnailBytes(
  file: File | Blob,
  options: ThumbnailOptions
): Promise<Uint8Array> {
  const ffmpeg = await getFFmpeg();
  
  const inputExt = file.type === 'image/png' ? 'png' : 
                   file.type === 'image/webp' ? 'webp' : 'jpg';
  const outputExt = options.format || 'webp';
  
  const inputData = await fetchFile(file);
  await ffmpeg.writeFile(`input.${inputExt}`, inputData);
  
  const qualityArg = options.format === 'jpeg'
    ? ['-q:v', String(Math.round((100 - (options.quality || 85)) / 10))]
    : ['-compression_level', String(Math.round((100 - (options.quality || 85)) / 10))];
  
  await ffmpeg.exec([
    '-i', `input.${inputExt}`,
    '-vf', `scale=${options.width}:${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2:white`,
    ...qualityArg,
    '-f', 'image2',
    `output.${outputExt}`
  ]);
  
  const outputData = await ffmpeg.readFile(`output.${outputExt}`);
  
  if (typeof outputData === 'string') {
    return new TextEncoder().encode(outputData);
  }
  
  return new Uint8Array(outputData as ArrayBuffer);
}

/**
 * Convert File to base64 string directly (no resize)
 */
export async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const data = base64.split(',')[1];
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Get image dimensions from base64
 */
export async function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = base64;
  });
}

/**
 * Check if base64 is valid image
 */
export function isValidImageBase64(base64: string): boolean {
  if (!base64) return false;
  return base64.startsWith('data:image/');
}

/**
 * Get approximate size of base64 image in bytes
 */
export function getBase64Size(base64: string): number {
  if (!base64) return 0;
  const data = base64.split(',')[1] || '';
  return Math.ceil(data.length * 0.75); // base64 is ~33% larger than binary
}