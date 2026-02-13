/**
 * WhatsApp sharing utility using Web Share API with fallback
 */

export async function shareFile(file: File, text: string): Promise<void> {
    // Try Web Share API first
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({
                title: text,
                text,
                files: [file],
            });
            return;
        } catch (e: any) {
            // User cancelled or share failed — fall through to fallback
            if (e.name === 'AbortError') return;
        }
    }

    // Fallback: WhatsApp URL (text only, can't share files via URL)
    const encodedText = encodeURIComponent(text);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
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

    const encodedText = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
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
