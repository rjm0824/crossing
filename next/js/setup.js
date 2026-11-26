// ---------- The saved setup (MVP row 8) ----------
// One record on this device: localStorage 'cx:next:setup'. Onboarding, My Boat
// and the Plan page's verdict read it; later steps (routes, saved trips, Share
// my setup, the AI helper) add to it. Not sent anywhere.
// Decided by RJ, Nov 27: one setup; My Boat moved into it.
//
// Shape (version 1). Every part may be missing; readers fall back to today's
// numbers in settings.js.
// {
//   v: 1,
//   boat: {
//     name, make, length, engines, colour, marina,  // My Boat profile (strings)
//     type,        // 'Center console' | 'Walkaround' | 'Express cruiser' | 'Catamaran' | typed text
//     cruiseKt,    // number, 5 to 60
//     tankGal,     // number, 10 to 2000
//     burnGph,     // number, 1 to 200
//     burnEstimate // true when burnGph is the rough estimate ("Not sure")
//   },
//   limits: { preset: 'cautious'|'standard'|'experienced'|'custom', seasFt, windKt, noNorthInStream },
//   route: { id: 'abaco' },          // row 9 adds the other presets and tapped points
//   followers: [ { name, phone } ],  // first names; phone optional, only pre-fills the text at Start trip
//   answers: [ { text, chip } | { skip: true } ],  // the 7 setup questions, as tapped or typed
//   answersAt, boatCheckedAt, followersCheckedAt,  // (ms) so newer answers refill the forms, but older ones never undo an edit
//   agreedAt,  // when the safety box was ticked (ms)
//   doneAt,    // when onboarding was finished (ms)
//   savedAt
// }
// The boat photo is kept apart, by photo.js, in the browser's database on
// this device (IndexedDB 'cx-next' > 'files' > 'boat-photo'); never uploaded.
// No ID numbers anywhere (RJ, Nov 26): no hull ID, registration, passport or card.
(function () {
  var KEY = 'cx:next:setup', OLD_BOAT = 'cx:next:boat';

  function read(k) {
    try { var v = JSON.parse(localStorage.getItem(k) || 'null'); if (v && typeof v === 'object') return v; } catch (e) {}
    return null;
  }

  // Returns the saved setup, or null if there is none. The first time, it
  // copies My Boat's old record in (the old key is left as it was).
  function load() {
    var s = read(KEY);
    if (s) return s;
    var old = read(OLD_BOAT);
    if (!old) return null;
    var boat = {};
    ['name', 'make', 'length', 'engines', 'colour', 'marina'].forEach(function (k) { if (old[k] != null) boat[k] = String(old[k]); });
    s = { v: 1, boat: boat, savedAt: old.savedAt || Date.now() };
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
    return s;
  }

  // Merges the given parts into the saved setup. Sections that are objects
  // (boat, limits, route) merge field by field; followers is replaced whole.
  // Returns true if it saved.
  function save(parts) {
    var s = load() || { v: 1 };
    Object.keys(parts || {}).forEach(function (k) {
      var v = parts[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) {
        Object.keys(v).forEach(function (f) { s[k][f] = v[f]; });
      } else {
        s[k] = v;
      }
    });
    s.v = 1; s.savedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch (e) { return false; }
  }

  window.CXSetup = { KEY: KEY, load: load, save: save };
})();
