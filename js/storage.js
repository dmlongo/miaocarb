// storage.js - small safe wrapper around localStorage (with JSON helpers)
(function () {
  function parseJSON(text, fallback) {
    try {
      return JSON.parse(text);
    } catch {
      return fallback;
    }
  }

  function get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error("localStorage get failed:", e);
      return null;
    }
  }

  function getJSON(key, fallback) {
    const raw = get(key);
    if (raw == null) return fallback;
    return parseJSON(raw, fallback);
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.error("localStorage set failed:", e);
      return false;
    }
  }

  function setJSON(key, obj) {
    return set(key, JSON.stringify(obj));
  }

  function remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error("localStorage remove failed:", e);
      return false;
    }
  }

  // Expose globally (keeps current inline-HTML approach working)
  window.Storage = { get, set, remove, getJSON, setJSON, parseJSON };
})();
