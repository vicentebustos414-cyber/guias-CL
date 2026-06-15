/**
 * Helpers for saving files on mobile (Capacitor) and web fallback.
 * On Electron, these are never called — the native API handles it.
 */

let _capFilesystem: any = null;
let _capShare: any = null;

async function getCapFilesystem() {
  if (_capFilesystem) return _capFilesystem;
  try {
    const mod = await import('@capacitor/filesystem');
    _capFilesystem = mod.Filesystem;
    return _capFilesystem;
  } catch {
    return null;
  }
}

async function getCapShare() {
  if (_capShare) return _capShare;
  try {
    const mod = await import('@capacitor/share');
    _capShare = mod.Share;
    return _capShare;
  } catch {
    return null;
  }
}

function isCapacitor(): boolean {
  return !!(window as any).Capacitor;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Save a file and offer to share/open it.
 * Works on: Capacitor (Android), or falls back to browser download.
 */
export async function saveAndShare(
  data: Uint8Array | ArrayBuffer,
  filename: string,
  mimeType: string,
): Promise<void> {
  const buffer: ArrayBuffer = data instanceof Uint8Array ? (data.buffer as ArrayBuffer).slice(data.byteOffset, data.byteOffset + data.byteLength) : data;

  if (isCapacitor()) {
    const Filesystem = await getCapFilesystem();
    const Share = await getCapShare();

    if (Filesystem) {
      const { Directory, Encoding } = await import('@capacitor/filesystem');
      const base64 = arrayBufferToBase64(buffer);
      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      if (Share) {
        try {
          await Share.share({
            title: filename,
            url: result.uri,
          });
        } catch {
          // User cancelled share — that's fine
        }
      }
      return;
    }
  }

  // Fallback: browser download
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
