/**
 * Utility functions for interacting with the Origin Private File System (OPFS).
 * Used to store heavy Blob objects (images, PDFs) locally without bloating IndexedDB/SQLite.
 */

export async function getOpfsRoot() {
    return await navigator.storage.getDirectory();
}

/**
 * Saves a Blob to OPFS and returns the file path URI.
 */
export async function saveFileToOPFS(blob: Blob, directory: string, filename: string): Promise<string> {
    const root = await getOpfsRoot();
    const dirHandle = await root.getDirectoryHandle(directory, { create: true });

    // Ensure filename is safe and unique
    const timestamp = Date.now();
    const safeName = `${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Create File
    const fileHandle = await dirHandle.getFileHandle(safeName, { create: true });

    // @ts-ignore - createWritable is widely supported in modern browsers but TS may complain depending on lib
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();

    return `opfs://${directory}/${safeName}`;
}

/**
 * Reads a file from OPFS and constructs a Blob URL for display.
 */
export async function getFileUrlFromOPFS(uri: string): Promise<string | null> {
    if (!uri.startsWith('opfs://')) return null;

    try {
        const pathParts = uri.replace('opfs://', '').split('/');
        const directory = pathParts[0];
        const filename = pathParts[1];

        const root = await getOpfsRoot();
        const dirHandle = await root.getDirectoryHandle(directory, { create: false });
        const fileHandle = await dirHandle.getFileHandle(filename, { create: false });

        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (e) {
        console.warn('Failed to load OPFS file:', uri, e);
        return null; // Return null if file not found
    }
}

/**
 * Reads a file from OPFS fully as a Blob object.
 */
export async function getBlobFromOPFS(uri: string): Promise<Blob | null> {
    if (!uri.startsWith('opfs://')) return null;

    try {
        const pathParts = uri.replace('opfs://', '').split('/');
        const directory = pathParts[0];
        const filename = pathParts[1];

        const root = await getOpfsRoot();
        const dirHandle = await root.getDirectoryHandle(directory, { create: false });
        const fileHandle = await dirHandle.getFileHandle(filename, { create: false });

        return await fileHandle.getFile();
    } catch (e) {
        console.warn('Failed to get OPFS blob:', uri, e);
        return null;
    }
}

/**
 * Deletes a file from OPFS.
 */
export async function deleteFileFromOPFS(uri: string): Promise<void> {
    if (!uri.startsWith('opfs://')) return;
    try {
        const pathParts = uri.replace('opfs://', '').split('/');
        const directory = pathParts[0];
        const filename = pathParts[1];

        const root = await getOpfsRoot();
        const dirHandle = await root.getDirectoryHandle(directory, { create: false });
        await dirHandle.removeEntry(filename);
    } catch (e) {
        console.warn('Failed to delete OPFS file:', uri, e);
    }
}
