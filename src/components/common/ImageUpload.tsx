/**
 * ImageUpload component - generates base64 thumbnail for database storage
 * No external storage needed - works offline
 */

import { useState, useCallback } from 'react';
import { X, Loader2, Image as ImageIcon } from 'lucide-react';
import { generateThumbnailBase64, THUMBNAIL_PRESETS } from '@/lib/imageUpload';

interface ImageUploadProps {
  value?: string | null;
  onChange: (base64: string) => void;
  type?: 'item' | 'verticalIcon' | 'marketing';
  className?: string;
  disabled?: boolean;
}

export default function ImageUpload({
  value,
  onChange,
  type = 'item',
  className = '',
  disabled = false,
}: ImageUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = THUMBNAIL_PRESETS[type === 'marketing' ? 'marketing' : type === 'verticalIcon' ? 'verticalIcon' : 'item'];

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await generateThumbnailBase64(file, preset);
      onChange(base64);
    } catch (err: any) {
      setError(err.message || 'Failed to process image');
    } finally {
      setIsProcessing(false);
    }
  }, [preset, onChange]);

  const handleRemove = useCallback(() => {
    onChange('');
  }, [onChange]);

  const sizeClasses = type === 'marketing' 
    ? 'w-full h-40' 
    : type === 'verticalIcon' 
    ? 'w-12 h-12' 
    : 'w-full aspect-square';

  return (
    <div className={`relative ${className}`}>
      {value ? (
        <div className={`relative ${sizeClasses} rounded-lg overflow-hidden bg-slate-100`}>
          <img
            src={value}
            alt="Thumbnail"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ) : (
        <label className={`
          flex flex-col items-center justify-center
          ${sizeClasses} rounded-lg border-2 border-dashed border-slate-300
          bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}>
          {isProcessing ? (
            <Loader2 className="h-5 w-5 text-slate-400 animate-spin" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-400" />
          )}
          <span className="text-[9px] text-slate-400 mt-0.5">
            {isProcessing ? 'Processing...' : 'Upload'}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled || isProcessing}
            className="hidden"
          />
        </label>
      )}
      {error && (
        <p className="text-[10px] text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}