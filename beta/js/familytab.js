// ---------- Family tab (captain's view, MVP row 7) ----------
// Shows the family link for the trip on this device, "Share again" and
// "Open the family page". It only READS the trip the Live screen saved
// (cx:beta:trip) and never changes it or calls the tracker.
(function () {
  var MIN = 60e3, HOUR = 3600e3, LINK_OPEN_MS = 2 * HOUR;   // the link closes 2 h after the trip ends
  var trip = null;
  try { trip = JSON.parse(localStorage.getItem('cx:beta:trip') || 'null'); } catch (e) {}
  // Same direction as the trip, like the Live screen does (route names come from settings.js).
  if (trip && trip.dir && trip.dir !== (HOME ? 'home' : 'over')) {
    var p = new URLSearchParams(location.search);
    if (trip.dir === 'home') p.set('trip', 'home'); else p.delete('trip');
    location.replace(location.pathname + (p.toString() ? '?' + p : '')); return;
  }
  var key = trip && typeof trip.familyKey === 'string' && /^[A-Za-z0-9_-]{8,200}$/.test(trip.familyKey) ? trip.familyKey : null;

  function tz(ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function t(ms) { return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }); }
  function show(id, on) { $(id).hidden = !on; }
  function say(id, s) { $(id).textContent = s; }
  function result(s, kind) { var el = $('famResult'); el.textContent = s; el.className = 'result' + (kind ? ' ' + kind : ''); }
  function familyLink() {
    return location.origin + location.pathname.replace(/[^/]*$/, '') + 'family.html#k=' + key;
  }
  // Word for word the Live screen's "Send link to family" message (version A,
  // draft wording for RJ's attorney). Keep the two in step.
  function familyText() {
    var boat = trip.practice ? 'Practice run' : "Goof n' Off";
    return (HOME ? 'Heading home! ' : 'Heading to Abaco! ') +
      'Leaving ' + WP[0].name + ' on ' + boat + ' at ' + tz(trip.startedAt) +
      ', aiming for ' + DEST + ' around ' + tz(trip.plannedArrival) + '. ' +
      'You can follow the boat live here, no app needed: ' + familyLink() + '\n' +
      'If you haven\'t heard from me by ' + tz(trip.overdueAt) + ', check the link first, then give me a call.';
  }

  var now = Date.now();
  var underway = !!(key && trip.status === 'underway');
  var ended = !!(key && trip.status === 'ended' && trip.endedAt);
  var linkOpen = underway || (ended && now < trip.endedAt + LINK_OPEN_MS);

  show('famNone', !key || !linkOpen);
  show('famTrip', !!key && linkOpen);
  if (!key) {
    say('famNoneText', 'No trip on this device right now. Start a trip on the Plan screen to get a family link.');
  } else if (!linkOpen) {
    say('famNoneText', 'Your last trip ended at ' + t(trip.endedAt) + '. Its family link has closed. Start a new trip on the Plan screen to get a new link.');
  } else {
    say('famRoute', (trip.practice ? 'Practice run: ' : '') + WP[0].name + ' → ' + DEST);
    if (underway) {
      say('famState', 'Sharing now');
      $('famState').className = 'fstate on';
      say('famWhen', 'Planned arrival about ' + tz(trip.plannedArrival) + '. If you are not in by ' + t(trip.overdueAt) + ', your followers see an overdue notice.');
    } else {
      say('famState', trip.endedHow === 'stopped' ? 'Sharing stopped' : 'Arrived');
      $('famState').className = 'fstate';
      say('famWhen', 'Trip ended at ' + t(trip.endedAt) + '. Followers see how it ended, with no position, until about ' + t(trip.endedAt + LINK_OPEN_MS) + '. Then the link closes.');
    }
    $('famLink').textContent = familyLink();
    $('famOpen').href = familyLink();
    show('famShare', underway);   // nothing new to share once the trip is over
  }

  $('famShare').onclick = function () {
    var msg = familyText();
    var copyInstead = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(msg).then(function () { result('Message copied. Paste it into a text to your family.', 'good'); },
          function () { result('Couldn\'t open the share screen. Use Copy link instead.', 'wait'); });
      } else result('Couldn\'t open the share screen. Use Copy link instead.', 'wait');
    };
    if (navigator.share) {
      result('Share screen opened', 'good');
      navigator.share({ text: msg }).catch(function (e) {
        if (e && e.name === 'AbortError') result(''); else copyInstead();
      });
    } else copyInstead();
  };
  $('famCopy').onclick = function () {
    var link = familyLink();
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents($('famLink'));
      var s = getSelection(); s.removeAllRanges(); s.addRange(r);
      result('Couldn\'t copy by itself. The link above is selected: press and hold it to copy.', 'wait');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link).then(function () { result('Link copied', 'good'); }, fallback);
    } else fallback();
  };
})();
