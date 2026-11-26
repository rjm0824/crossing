// ---------- Boat photo (MVP row 8; RJ, Nov 27: a photo instead of the outline) ----------
// The photo is made smaller on the phone (longest side 1200 px, JPEG) and saved
// on this device only, in the browser's database (IndexedDB 'cx-next', store
// 'files', key 'boat-photo'). It is never uploaded and followers don't see it.
(function () {
  var DB = 'cx-next', STORE = 'files', KEY = 'boat-photo', MAX = 1200;

  function open() {
    return new Promise(function (ok, fail) {
      if (!window.indexedDB) return fail(new Error('no IndexedDB'));
      var r = indexedDB.open(DB, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { fail(r.error); };
    });
  }
  function tx(mode, fn) {
    return open().then(function (db) {
      return new Promise(function (ok, fail) {
        var t = db.transaction(STORE, mode), req = fn(t.objectStore(STORE));
        t.oncomplete = function () { db.close(); ok(req && req.result); };
        t.onerror = t.onabort = function () { db.close(); fail(t.error); };
      });
    });
  }

  // Reads the picked file and returns a smaller JPEG.
  function shrink(file) {
    return new Promise(function (ok, fail) {
      if (!file || !/^image\//.test(file.type || 'image/')) return fail(new Error('not an image'));
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var k = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { b ? ok(b) : fail(new Error('could not shrink')); }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('could not read')); };
      img.src = url;
    });
  }

  window.CXPhoto = {
    get: function () { return tx('readonly', function (s) { return s.get(KEY); }).then(function (b) { return b || null; }); },
    save: function (file) { return shrink(file).then(function (b) { return tx('readwrite', function (s) { return s.put(b, KEY); }).then(function () { return b; }); }); },
    remove: function () { return tx('readwrite', function (s) { return s.delete(KEY); }); }
  };
})();
