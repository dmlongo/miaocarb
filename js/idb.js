// idb.js - IndexedDB layer for storing images (Blobs) for MiaoCarb
// Stores images in objectStore "images" with keyPath "id".
// Public API: imagesDB.init(), imagesDB.putDataUrl(dataUrl), imagesDB.getObjectUrl(id), imagesDB.delete(id)

(function () {
  const DB_NAME = "miaocarb-db";
  const DB_VERSION = 1;
  const STORE = "images";

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(storeName, mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
      const t = db.transaction(storeName, mode);
      const store = t.objectStore(storeName);
      const out = fn(store);
      t.oncomplete = () => resolve(out);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  function dataUrlToBlob(dataUrl) {
    // data:[<mime>][;base64],<data>
    const parts = dataUrl.split(",");
    const meta = parts[0];
    const base64 = parts[1] || "";
    const mimeMatch = /data:([^;]+)/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : "image/png";
    const bin = atob(base64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function makeId() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "img-" + Date.now() + "-" + Math.random().toString(16).slice(2);
  }

  async function putDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
    const id = makeId();
    const blob = dataUrlToBlob(dataUrl);
    await tx(STORE, "readwrite", (s) => s.put({ id, blob, createdAt: Date.now() }));
    return id;
  }

  async function getBlob(id) {
    if (!id) return null;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const s = t.objectStore(STORE);
      const req = s.get(id);
      req.onsuccess = () => resolve(req.result ? req.result.blob : null);
      req.onerror = () => reject(req.error);
    });
  }

  const objectUrlCache = new Map();

  async function getObjectUrl(id) {
    if (!id) return null;
    if (objectUrlCache.has(id)) return objectUrlCache.get(id);
    const blob = await getBlob(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    objectUrlCache.set(id, url);
    return url;
  }

  function revokeAllObjectUrls() {
    for (const url of objectUrlCache.values()) URL.revokeObjectURL(url);
    objectUrlCache.clear();
  }

  async function listIds() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, "readonly");
      const s = t.objectStore(STORE);
      const req = s.getAllKeys();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function deleteMany(ids) {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    let n = 0;
    for (const id of ids) {
      await deleteImage(id);
      n++;
    }
    return n;
  }

  async function deleteImage(id) {
    if (!id) return;
    if (objectUrlCache.has(id)) {
      URL.revokeObjectURL(objectUrlCache.get(id));
      objectUrlCache.delete(id);
    }
    await tx(STORE, "readwrite", (s) => s.delete(id));
  }

  async function migrateCatalogImages(catalog) {
    // catalog items currently may contain frontImage/labelImage as dataURLs
    // Convert them to frontImageId/labelImageId stored in IndexedDB and delete base64 fields
    if (!Array.isArray(catalog) || catalog.length === 0) return catalog;

    let changed = false;
    for (const item of catalog) {
      if (!item || typeof item !== "object") continue;

      if (item.frontImage && typeof item.frontImage === "string" && item.frontImage.startsWith("data:")) {
        item.frontImageId = item.frontImageId || await putDataUrl(item.frontImage);
        delete item.frontImage;
        changed = true;
      }
      if (item.labelImage && typeof item.labelImage === "string" && item.labelImage.startsWith("data:")) {
        item.labelImageId = item.labelImageId || await putDataUrl(item.labelImage);
        delete item.labelImage;
        changed = true;
      }
    }
    return { catalog, changed };
  }

  window.imagesDB = {
    init: openDB,
    putDataUrl,
    getObjectUrl,
    delete: deleteImage,
    listIds,
    deleteMany,
    revokeAllObjectUrls,
    migrateCatalogImages,
  };
})();
