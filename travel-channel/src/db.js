// Картинки постов хранятся в IndexedDB (в localStorage они не помещаются)
const DB = 'travel-posts';
const STORE = 'images';

const open = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
};

export const saveImages = (id, images) => run('readwrite', (s) => s.put(images, id));
export const getImages = (id) => run('readonly', (s) => s.get(id));
export const deleteImages = (id) => run('readwrite', (s) => s.delete(id));
