/**
 * FFmpeg Web Worker for GIF/Flipbook generation
 * Runs off the main thread to prevent UI freezing
 */

self.onmessage = async (e: MessageEvent) => {
    const { type, images } = e.data;

    if (type === 'generate-gif') {
        try {
            self.postMessage({ type: 'progress', progress: 20 });

            // Dynamic import of FFmpeg
            const { FFmpeg } = await import('@ffmpeg/ffmpeg');
            const { fetchFile } = await import('@ffmpeg/util');

            const ffmpeg = new FFmpeg();
            self.postMessage({ type: 'progress', progress: 30 });

            await ffmpeg.load();
            self.postMessage({ type: 'progress', progress: 40 });

            // Write each image to FFmpeg virtual filesystem
            for (let i = 0; i < images.length; i++) {
                const blob = images[i] as Blob;
                const data = await fetchFile(blob);
                await ffmpeg.writeFile(`frame${String(i).padStart(4, '0')}.png`, data);
                self.postMessage({
                    type: 'progress',
                    progress: 40 + ((i + 1) / images.length) * 30,
                });
            }

            // Generate GIF
            self.postMessage({ type: 'progress', progress: 75 });
            await ffmpeg.exec([
                '-framerate', '2',
                '-i', 'frame%04d.png',
                '-vf', 'scale=480:-1:flags=lanczos',
                '-loop', '0',
                'output.gif',
            ]);

            self.postMessage({ type: 'progress', progress: 90 });
            const outputData = await ffmpeg.readFile('output.gif');
            const gifBlob = new Blob([outputData], { type: 'image/gif' });

            self.postMessage({ type: 'progress', progress: 100 });
            self.postMessage({ type: 'complete', result: gifBlob });
        } catch (error: any) {
            self.postMessage({ type: 'error', error: error.message || 'Unknown error' });
        }
    }
};

export { };
