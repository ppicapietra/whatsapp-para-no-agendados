const StorageClient = (() => {
  const SUPABASE_URL = 'https://ymyrdyuwrtborbpcrswx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_hjHMfLqdx3CYrK9pd34KYg_KgtYKtd3';
  const BUCKET = 'wanoa_tmp';
  const CODE_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const EXT_BY_MIME = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
    'application/pdf': 'pdf'
  };

  function shortCode() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('');
  }

  function extensionFor(file) {
    const fromMime = EXT_BY_MIME[(file.type || '').toLowerCase()];
    if (fromMime) return fromMime;
    const raw = String(file.name || '').split(/[/\\]/).pop() || '';
    const dot = raw.lastIndexOf('.');
    const extension = dot > 0 ? raw.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) : '';
    return extension || 'bin';
  }

  function encodedObjectPath(path) {
    return path.split('/').map(encodeURIComponent).join('/');
  }

  function uploadOnce(file, path, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodedObjectPath(path)}`;
      xhr.open('POST', url);
      xhr.setRequestHeader('apikey', SUPABASE_KEY);
      xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || !onProgress) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        const error = new Error(xhr.responseText || `Error ${xhr.status}`);
        error.status = xhr.status;
        reject(error);
      };
      xhr.onerror = () => {
        const error = new Error('network');
        error.kind = 'network';
        reject(error);
      };
      xhr.ontimeout = () => {
        const error = new Error('network');
        error.kind = 'network';
        reject(error);
      };
      xhr.send(file);
    });
  }

  function alreadyExists(error) {
    return error && (error.status === 400 || error.status === 409);
  }

  async function uploadWithRetry(file, path, onProgress) {
    try {
      await uploadOnce(file, path, onProgress);
    } catch (error) {
      if (error.kind !== 'network') throw error;
      try {
        await uploadOnce(file, path, onProgress);
      } catch (retryError) {
        if (!alreadyExists(retryError)) throw retryError;
      }
    }
  }

  function canvasToJpeg(source, naturalWidth, naturalHeight) {
    if (!naturalWidth || !naturalHeight) return Promise.resolve(null);
    const width = naturalWidth > 600 ? 600 : Math.max(naturalWidth, 300);
    let height = Math.round(width * naturalHeight / naturalWidth);
    if (width / height > 4) height = Math.round(width / 4);
    if (height > 900) height = 900;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return Promise.resolve(null);
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    const scale = Math.max(width / naturalWidth, height / naturalHeight);
    const drawnWidth = naturalWidth * scale;
    const drawnHeight = naturalHeight * scale;
    context.drawImage(source, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight);

    const blobAt = (quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    return (async () => {
      let quality = 0.82;
      let blob = await blobAt(quality);
      while (blob && blob.size > 500 * 1024 && quality > 0.4) {
        quality -= 0.14;
        blob = await blobAt(quality);
      }
      if (!blob || blob.size > 600 * 1024) return null;
      return { blob, width, height };
    })();
  }

  function previewFromImage(file) {
    return new Promise((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        canvasToJpeg(image, image.naturalWidth, image.naturalHeight).then(resolve, () => resolve(null));
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });
  }

  function previewFromVideo(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), 4000);
      video.preload = 'auto';
      video.muted = true;
      video.playsInline = true;
      video.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      video.onloadeddata = () => {
        const capture = () => {
          clearTimeout(timer);
          canvasToJpeg(video, video.videoWidth, video.videoHeight).then(finish, () => finish(null));
        };
        video.onseeked = capture;
        try {
          video.currentTime = Math.min(0.2, (video.duration || 0.2) / 2);
        } catch (error) {
          capture();
        }
      };
      video.src = url;
    });
  }

  async function makePreview(file) {
    try {
      if ((file.type || '').startsWith('image/')) return await previewFromImage(file);
      if ((file.type || '').startsWith('video/')) return await previewFromVideo(file);
    } catch (error) {
      return null;
    }
    return null;
  }

  async function registerShare(payload) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/wanoa_shares`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = new Error(await response.text());
      error.status = response.status;
      throw error;
    }
  }

  async function uploadAndSign(file, onProgress) {
    const code = shortCode();
    const objectPath = `shares/${code}.${extensionFor(file)}`;
    const report = (percent) => {
      if (onProgress) onProgress(percent);
    };

    await uploadWithRetry(file, objectPath, (percent) => report(Math.round(percent * 0.8)));

    let preview = await makePreview(file);
    let previewPath = null;
    if (preview) {
      previewPath = `shares/${code}-preview.jpg`;
      const previewFile = new File([preview.blob], 'preview.jpg', { type: 'image/jpeg' });
      try {
        await uploadWithRetry(previewFile, previewPath, (percent) => report(80 + Math.round(percent * 0.15)));
      } catch (error) {
        preview = null;
        previewPath = null;
      }
    }

    report(96);
    await registerShare({
      code,
      object_path: objectPath,
      preview_path: previewPath,
      preview_width: preview ? preview.width : null,
      preview_height: preview ? preview.height : null,
      content_type: file.type || 'application/octet-stream',
      filename: (file.name || 'archivo').slice(0, 180),
      byte_size: file.size
    });
    report(100);
    return `${SUPABASE_URL}/functions/v1/s/${code}`;
  }

  return { uploadAndSign };
})();
