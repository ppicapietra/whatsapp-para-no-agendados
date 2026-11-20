const StorageClient = (() => {
  const SUPABASE_URL = 'https://ymyrdyuwrtborbpcrswx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_hjHMfLqdx3CYrK9pd34KYg_KgtYKtd3';
  const BUCKET = 'wanoa_tmp';
  const SIGNED_URL_TTL_SECONDS = 10 * 24 * 60 * 60;

  function sanitizeFileName(name) {
    const raw = String(name || 'archivo').split(/[/\\]/).pop();
    const dot = raw.lastIndexOf('.');
    const extension = dot > 0
      ? raw.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8)
      : '';
    const stem = (dot > 0 ? raw.slice(0, dot) : raw)
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 60);
    const safeStem = stem || 'archivo';
    return extension ? `${safeStem}.${extension}` : safeStem;
  }

  function objectPath(fileName) {
    const id = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `shares/${id}-${sanitizeFileName(fileName)}`;
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

  async function signOnce(path) {
    let response;
    try {
      response = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${encodedObjectPath(path)}`,
        {
          method: 'POST',
          headers: {
            apikey: SUPABASE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS })
        }
      );
    } catch (error) {
      const networkError = new Error('network');
      networkError.kind = 'network';
      throw networkError;
    }

    if (!response.ok) {
      const error = new Error(await response.text());
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    const signed = data.signedURL || data.signedUrl;
    if (!signed) throw new Error('Respuesta de firma sin URL');
    if (/^https?:\/\//i.test(signed)) return signed;
    return `${SUPABASE_URL}/storage/v1${signed.startsWith('/') ? '' : '/'}${signed}`;
  }

  async function signWithRetry(path) {
    try {
      return await signOnce(path);
    } catch (error) {
      if (error.kind !== 'network') throw error;
      return signOnce(path);
    }
  }

  async function uploadAndSign(file, onProgress) {
    const path = objectPath(file.name);
    await uploadWithRetry(file, path, onProgress);
    if (onProgress) onProgress(100);
    return signWithRetry(path);
  }

  return { uploadAndSign };
})();
