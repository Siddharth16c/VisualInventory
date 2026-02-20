/**
 * Sharing utility — Web Share API with download fallback
 */

export async function shareFile(file: File, text: string): Promise<void> {
    // Try Web Share API first (works on mobile + modern desktop browsers)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({
                title: text,
                text,
                files: [file],
            });
            return;
        } catch (e: any) {
            // User cancelled — don't fallback
            if (e.name === 'AbortError') return;
            // Share failed — fall through to download
            console.warn('[Share] Web Share API failed, falling back to download:', e.message);
        }
    }

    // Fallback: Direct download
    downloadBlob(new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
}

export async function shareText(text: string): Promise<void> {
    if (navigator.share) {
        try {
            await navigator.share({ text });
            return;
        } catch (e: any) {
            if (e.name === 'AbortError') return;
        }
    }

    // Fallback: copy to clipboard
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        // Last resort: WhatsApp URL
        const encodedText = encodeURIComponent(text);
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
    }
}

export function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
