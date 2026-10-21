/* ƐMU YƐ Music Player: one script, one namespace (window.EMU).
   Sections
     1  util        helpers, icons, toast
     2  logo        the one logo image, reused everywhere through one URL
     3  store       localStorage + IndexedDB, in-memory only where they throw
     4  settings    source switches and API keys
     5  net         fetch with timeout, retry, JSONP
     6  mx          matcher: title normaliser, iTunes↔Audius matching, relevance, known artists
     7  sources     deezer, itunes, audius, youtube, jamendo, free, archive, radio
     8  rows        full-song policy, row markup, list wiring
     9  player      media (audio + YouTube iframe), queue, Now Playing, Media Session
     10 library     liked songs, playlists, your songs, downloads
     11 search      one pipeline for every search
     12 coll        album / artist / playlist sheet, shelves, Ghana & world charts
     13 radio       Live Radio sub-view (inside Browse)
     14 lyrics      LRCLIB + Lyrics.ovh, synced lines, your own lyrics
     15 bot         Ask ƐMU
     16 ui          tabs, sheets, settings, install, artwork fallback
     17 dust        gold dust background forming ƐMU YƐ
     18 boot        PWA links, service worker, start-up */
(function (G) {
  "use strict";
  var doc = G.document;
  var EMU = (G.EMU = G.EMU || {});

  /* ============ 1 util ============ */
  var $ = function (id) { return doc.getElementById(id); };
  function each(sel, fn) { [].forEach.call(doc.querySelectorAll(sel), fn); }
  function esc(s) { return String(s == null ? "" : s).replace(/[<>&"]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]; }); }
  function trim(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function time(s) {
    if (!s || !isFinite(s)) return "0:00";
    var m = Math.floor(s / 60), x = Math.floor(s % 60);
    return m + ":" + (x < 10 ? "0" : "") + x;
  }
  function creator(c) { return Array.isArray(c) ? c.join(", ") : (c || "Unknown artist"); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function cap(s) { return String(s).replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }
  function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
  function initials(n) {
    var w = n.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean);
    return (w.length > 1 ? w[0][0] + w[1][0] : n.slice(0, 2)).toUpperCase();
  }
  /* first of each id */
  function uniq(list, key) {
    var seen = {};
    return list.filter(function (t) { var k = key ? key(t) : t.id; return !seen[k] && (seen[k] = 1); });
  }
  var reduceMotion = false;
  try { reduceMotion = G.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  var toastT = 0;
  function toast(msg, ms) {
    try {
      var el = $("toast");
      el.textContent = msg;
      el.classList.add("is-on");
      clearTimeout(toastT);
      toastT = setTimeout(function () { el.classList.remove("is-on"); }, ms || 2600);
    } catch (e) {}
  }
  var SV = '<svg viewBox="0 0 24 24" aria-hidden="true" ';
  var I = {
    play: SV + 'fill="currentColor"><path d="M7 4.5v15l13-7.5z" /></svg>',
    pause: SV + 'fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></svg>',
    shuffle: SV + 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h3.5c4 0 6 10 10 10H21M3 17h3.5c1.7 0 3-1.8 4.2-4M13.3 11c1.2-2.2 2.5-4 3.7-4H21M18.5 4.5 21 7l-2.5 2.5M18.5 14.5 21 17l-2.5 2.5" /></svg>',
    more: SV + 'fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>',
    dl: SV + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7.5v8M8.5 12.5 12 16l3.5-3.5" /></svg>',
    check: SV + 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>',
    heart: SV + 'fill="currentColor"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.9 2.9 1.5-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" /></svg>',
    heartO: SV + 'fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.9 2.9 1.5-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" /></svg>',
    plus: SV + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h11M4 11h11M4 16h7M18 13v8M14 17h8" /></svg>',
    album: SV + 'fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="12" cy="12" r="3" /></svg>',
    trash: SV + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>',
    note: SV + 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></svg>'
  };

  /* ============ 2 logo ============ */
  /* The page names the logo file once (#emu-logo, the header badge). Every other logo spot (artwork
     fallback tiles, mini player, Now Playing, bot avatar, Media Session) reuses that one URL. When the page
     is folded into a single file the logo arrives as a long data: URL, so it becomes one short blob: URL. */
  var ART = "";
  function initLogo() {
    var img = $("emu-logo");
    ART = img ? img.getAttribute("src") && img.src : "";
    try {
      if (ART && ART.indexOf("data:") === 0) {
        var parts = ART.split(","), bin = atob(parts[1]), bytes = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
        ART = URL.createObjectURL(new Blob([bytes], { type: (parts[0].match(/data:([^;]+)/) || [])[1] || "image/webp" }));
      }
    } catch (e) {}
    each("img[data-logo]", function (el) { el.src = ART; });
  }

  /* ============ 3 store ============ */
  /* Real localStorage and IndexedDB wherever they work (an installed app on its own domain).
     Only when they throw (a sandboxed preview frame) does an in-memory copy answer instead. */
  var Store = (function () {
    var PFX = "emuye-", mem = {}, smem = {};
    function probe(name) {
      try { var s = G[name]; s.setItem(PFX + "probe", "1"); s.removeItem(PFX + "probe"); return s; } catch (e) { return null; }
    }
    var ls = probe("localStorage"), ss = probe("sessionStorage");
    function get(k, d) {
      if (Object.prototype.hasOwnProperty.call(mem, k)) return mem[k];
      if (ls) { try { var v = ls.getItem(PFX + k); if (v != null) return (mem[k] = JSON.parse(v)); } catch (e) {} }
      return d;
    }
    function set(k, v) {
      mem[k] = v;
      if (ls) { try { ls.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
    }
    function sget(k) {
      if (Object.prototype.hasOwnProperty.call(smem, k)) return smem[k];
      if (ss) { try { return ss.getItem(PFX + k); } catch (e) {} }
      return null;
    }
    function sset(k, v) {
      smem[k] = String(v);
      if (ss) { try { ss.setItem(PFX + k, String(v)); } catch (e) {} }
    }

    /* IndexedDB "emuye" v3: tracks (downloads with their audio blobs), lyrics, lyrsync (timing offsets) */
    var STORES = ["tracks", "lyrics", "lyrsync"], db = null, idbMem = { tracks: {}, lyrics: {}, lyrsync: {} };
    var ready = new Promise(function (resolve) {
      var done = false;
      function fin(d) { if (done) return; done = true; db = d; resolve(d); }
      /* a blocked IndexedDB can hang without an answer: give up after 5 s */
      var to = setTimeout(function () { fin(null); }, 5000);
      try {
        var rq = G.indexedDB.open("emuye", 3);
        rq.onupgradeneeded = function () {
          var d = rq.result;
          STORES.forEach(function (s) { if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: "id" }); });
        };
        rq.onsuccess = function () { clearTimeout(to); fin(rq.result); };
        rq.onerror = function () { clearTimeout(to); fin(null); };
      } catch (e) { clearTimeout(to); fin(null); }
    });
    /* op: getAll | get | put | delete. Reads never reject; a failed put rejects. */
    function idb(store, op, arg) {
      return ready.then(function (d) {
        var m = idbMem[store];
        if (!d) {
          if (op === "getAll") return Object.keys(m).map(function (k) { return m[k]; });
          if (op === "get") return m[arg] || null;
          if (op === "put") { m[arg.id] = arg; return null; }
          delete m[arg];
          return null;
        }
        return new Promise(function (res, rej) {
          var empty = op === "getAll" ? [] : null;
          try {
            var r = d.transaction(store, op === "get" || op === "getAll" ? "readonly" : "readwrite").objectStore(store)[op](arg);
            r.onsuccess = function () { res(r.result == null ? empty : r.result); };
            r.onerror = function () { if (op === "put") rej(r.error); else res(empty); };
          } catch (e) { if (op === "put") rej(e); else res(empty); }
        });
      });
    }
    /* ask the browser to keep this data (no prompt on most browsers; iOS ignores it quietly) */
    function persist() {
      try {
        var s = G.navigator.storage;
        if (s && s.persist) (s.persisted ? s.persisted() : Promise.resolve(false)).then(function (p) { return p || s.persist(); }).catch(function () {});
      } catch (e) {}
    }
    return {
      get: get, set: set, sget: sget, sset: sset, ready: ready, persist: persist,
      all: function (s) { return idb(s, "getAll"); },
      one: function (s, id) { return idb(s, "get", id); },
      put: function (s, rec) { return idb(s, "put", rec); },
      del: function (s, id) { return idb(s, "delete", id); },
      local: function () { return !!ls; },
      idb: function () { return !!db; }
    };
  })();

  /* ============ 4 settings ============ */
  var Settings = {
    on: function (k) { return (Store.get("src-on", null) || {})[k] !== false; },
    setOn: function (k, v) { var o = Store.get("src-on", null) || {}; o[k] = !!v; Store.set("src-on", o); },
    ytKey: function () { return String(Store.get("src-yt-key", "") || "").trim(); },
    jmId: function () { return String(Store.get("src-jm-id", "") || "").trim(); },
    ytOn: function () { return !!Settings.ytKey() && Settings.on("youtube"); },
    jmOn: function () { return !!Settings.jmId() && Settings.on("jamendo"); },
    setKeys: function (yt, jm) { Store.set("src-yt-key", trim(yt)); Store.set("src-jm-id", trim(jm)); }
  };

  /* ============ 5 net ============ */
  var Net = (function () {
    /* fetch, then read(response); the timer covers the body too and rejects even without AbortController */
    function timed(url, ms, read) {
      var ctl = null;
      try { ctl = new AbortController(); } catch (e) {}
      return new Promise(function (resolve, reject) {
        var late = false;
        var timer = setTimeout(function () { late = true; try { if (ctl) ctl.abort(); } catch (e) {} reject(new Error("timed out")); }, ms || 15000);
        fetch(url, ctl ? { signal: ctl.signal } : undefined).then(read).then(function (v) { clearTimeout(timer); resolve(v); }, function (e) { clearTimeout(timer); if (!late) reject(e); });
      });
    }
    function json(url, ms) { return timed(url, ms, function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }
    /* APIs that explain errors in the body (YouTube, Jamendo); e.quota marks a used-up YouTube quota */
    function api(url, ms) {
      return timed(url, ms, function (r) {
        return r.json().catch(function () { return null; }).then(function (j) {
          if (r.ok && j) return j;
          var er = (j && j.error) || {}, reason = (er.errors && er.errors[0] && er.errors[0].reason) || "";
          var e = new Error(String(er.message || "Error " + r.status).replace(/<[^>]+>/g, ""));
          e.quota = /quota|dailyLimit|rateLimit/i.test(reason);
          throw e;
        });
      });
    }
    /* one automatic retry on failure or timeout */
    function again(fn) { return fn().catch(function () { return fn(); }); }
    /* JSONP for APIs without CORS headers (Deezer); a late reply lands on a no-op */
    var n = 0;
    function jsonp(url, ms) {
      return new Promise(function (resolve, reject) {
        var cb = "__emuJp" + Date.now().toString(36) + n++, s = doc.createElement("script"), timer;
        function drop() { try { delete G[cb]; } catch (e) { G[cb] = undefined; } }
        function done(late) {
          clearTimeout(timer);
          if (late) G[cb] = drop; else drop();
          if (s.parentNode) s.parentNode.removeChild(s);
        }
        G[cb] = function (d) { done(false); resolve(d); };
        s.onerror = function () { done(false); reject(new Error("jsonp error")); };
        timer = setTimeout(function () { done(true); reject(new Error("timed out")); }, ms || 15000);
        s.async = true;
        s.src = url + (url.indexOf("?") < 0 ? "?" : "&") + "callback=" + cb;
        (doc.head || doc.documentElement).appendChild(s);
      });
    }
    /* a short, readable reason for a failed request */
    function why(e) {
      var m = String((e && (e.message || e)) || "");
      if ((e && e.name === "AbortError") || /time ?d? ?out|abort/i.test(m)) return "timed out";
      if (/rate limited|HTTP 429/.test(m)) return "busy, try again in a minute";
      if (/^HTTP \d+/.test(m)) return m;
      if (/jsonp/i.test(m)) return "blocked or offline";
      if ((e && e.name === "TypeError") || /failed to fetch|load failed|network/i.test(m)) return "network error";
      if (e && e.name === "SyntaxError") return "bad reply";
      return m || "error";
    }
    return { timed: timed, json: json, api: api, again: again, jsonp: jsonp, why: why };
  })();

  /* ============ 6 mx: matcher ============ */
  /* Pure functions, no DOM: run EMU.selfTest() in the console. */
  var MX = (function () {
    var STOP = " the a an of by and in on to my me song songs music official audio video lyrics lyric ft feat x mp3 download latest new ";
    var JUNK = ["type beat", "instrumental", "free beat", "prod by", "remake", "cover", "freestyle beat", "snippet"];
    var SITES = /\b(?:www|ghanasongs|hearthis|naijaloaded|fakaza|mp3|com)\b/gi;
    function fold(s) {
      s = String(s == null ? "" : s);
      if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      return s.replace(/[ɛƐ]/g, "e").replace(/[ɔƆ]/g, "o");
    }
    /* "Artist-–-Song-ft.-X" slugs: spaced/en dashes split, single hyphens are spaces */
    function deslug(s) {
      if (/\s/.test(s.trim()) || s.indexOf("-") < 0 && s.indexOf("–") < 0) return s;
      return s.replace(/-[–—]-|--+|[–—]/g, "\u0001").replace(/-/g, " ").replace(/\u0001/g, " - ");
    }
    function strip(s) {
      s = fold(s).replace(/_+/g, " ");
      s = s.replace(/https?:\/\/\S+|www\.\S+/gi, " ").replace(/\b[\w-]+\.(?:com|net|org|at|ng|gh|co|io)\b[^\s)\]]*/gi, " ").replace(/\.(?:mp3|m4a|wav|aac|ogg|flac)\b/gi, " ");
      return deslug(s);
    }
    function words(s) { return s.toLowerCase().replace(/[’'`]/g, "").replace(/[^a-z0-9]+/g, " ").replace(SITES, " ").replace(/\s+/g, " ").trim(); }
    /* comparison form: no brackets, no feat./x/& segments */
    function norm(s) {
      s = strip(s).replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ");
      s = s.replace(/\b(?:feat|ft|featuring)\b\.?[^-–—]*/gi, " ").replace(/\s(?:x|&)\s[^-–—]*/gi, " ");
      return words(s);
    }
    function loose(s) { return words(strip(s)); }
    function compact(s) { return String(s).replace(/ /g, ""); }
    function tokens(s) { return norm(s).split(" ").filter(Boolean); }
    function qTokens(q) { return loose(q).split(" ").filter(function (w) { return w && STOP.indexOf(" " + w + " ") < 0; }); }
    function mainArtist(s) { return norm(String(s || "").split(/,|&|\bfeat\b|\bft\b|\s+x\s+/i)[0]); }
    function lev(a, b) {
      if (a === b) return 0;
      var m = a.length, n = b.length, d = [], i, j;
      if (!m || !n) return m || n;
      for (j = 0; j <= n; j++) d[j] = j;
      for (i = 1; i <= m; i++) {
        var prev = d[0]; d[0] = i;
        for (j = 1; j <= n; j++) { var tmp = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = tmp; }
      }
      return d[n];
    }
    /* the name, or a near spelling of it (Levenshtein ≤2), appears in the text */
    function fuzzyIn(name, text) {
      var a = compact(mainArtist(name)), t = loose(text);
      if (!a || !t) return false;
      if (compact(t).indexOf(a) >= 0) return true;
      if (a.length < 5) return false;
      var w = t.split(" ");
      for (var len = 1; len <= 3; len++) for (var i = 0; i + len <= w.length; i++) {
        var c = w.slice(i, i + len).join("");
        if (Math.abs(c.length - a.length) <= 2 && lev(c, a) <= 2) return true;
      }
      return false;
    }
    /* an artist name is what the query asks for: near-equal, or all its words are in the query */
    function artistMatches(name, q) {
      var a = mainArtist(name), k = loose(q);
      if (!a || !k) return false;
      var ac = compact(a), kc = compact(k);
      if (ac === kc || (ac.length > 3 && lev(ac, kc) <= 2)) return true;
      var qt = " " + k + " ";
      return a.split(" ").every(function (w) { return qt.indexOf(" " + w + " ") >= 0; });
    }
    function junk(title, q) {
      var t = " " + loose(title).replace(/\bprod\b/g, "prod") + " ", k = " " + loose(q) + " ";
      return JUNK.some(function (p) { return t.indexOf(" " + p + " ") >= 0 && k.indexOf(" " + p.split(" ")[0] + " ") < 0; });
    }
    /* every significant query word is in the title, uploader or extra text */
    function relevant(q, title, who, extra) {
      var h = " " + loose(title) + " " + loose(who) + " " + loose(extra) + " ";
      return qTokens(q).every(function (w) { return h.indexOf(" " + w) >= 0; });
    }
    function passes(q, title, who) { return !junk(title, q) && relevant(q, title, who); }
    /* iTunes song {title, artist, dur} vs Audius track {title, user, dur}: 0 for no match, else title overlap */
    function matches(it, au) {
      var tt = tokens(it.title);
      if (!tt.length) return 0;
      var at = " " + norm(au.title) + " ";
      var hit = tt.filter(function (w) { return at.indexOf(" " + w + " ") >= 0; }).length / tt.length;
      if (hit < 0.8) return 0;
      if (!fuzzyIn(it.artist, au.title) && !fuzzyIn(it.artist, au.user)) return 0;
      if (it.dur && au.dur && Math.abs(it.dur - au.dur) > 20) return 0;
      return hit;
    }
    function tidy(s) { return String(s || "").replace(/\s+/g, " ").replace(/^[\s\-–—.,:|~]+|[\s\-–—.,:|~]+$/g, ""); }
    /* display form: {title, artist, feat}, splitting "Artist - Song" instead of trusting the uploader */
    function clean(raw, uploader) {
      var s = strip(raw), feat = "";
      s = s.replace(/[(\[]\s*(?:feat|ft|featuring)\b\.?\s*([^)\]]+)[)\]]/i, function (_, f) { feat = f; return " "; });
      s = s.replace(/[(\[][^)\]]*(?:official|audio|video|lyric|visuali[sz]er|prod|mp3|download|hearthis|ghanasongs|naijaloaded|fakaza)[^)\]]*[)\]]/gi, " ").replace(/[(\[]\s*[)\]]/g, " ");
      s = s.replace(/\bofficial\s+(?:music\s+|lyrics?\s+)?(?:video|audio|visuali[sz]er)\b|\blyrics?\s+video\b|\bfree\s+download\b/gi, " ").replace(/\b(?:www|ghanasongs|hearthis|naijaloaded|fakaza|mp3)\b/gi, " ");
      var parts = s.split(/\s+[-–—|~]+\s+|\s*[–—]\s*/).map(tidy).filter(Boolean), artist = uploader || "", title = tidy(s);
      if (parts.length >= 2) {
        artist = parts[0]; title = parts.slice(1).join(" - ");
        if (uploader && fuzzyIn(uploader, parts[1]) && !fuzzyIn(uploader, parts[0])) { artist = parts[1]; title = [parts[0]].concat(parts.slice(2)).join(" - "); }
      }
      var re = /\s(?:feat|ft|featuring)\b\.?\s*(.+)$/i, m = title.match(re);
      if (m) { feat = feat || m[1]; title = title.replace(re, ""); }
      m = artist.match(re);
      if (m) { feat = feat || m[1]; artist = artist.replace(re, ""); }
      return { title: tidy(title) || tidy(raw), artist: tidy(artist), feat: tidy(feat) };
    }
    function key(title, artist) { return compact(norm(title)) + "|" + compact(mainArtist(artist)); }
    function score(q, artist, who, title, plays) {
      var s = artistMatches(artist, q) || artistMatches(who, q) ? 50 : 0;
      var t = " " + loose(title) + " ";
      if (qTokens(q).every(function (w) { return t.indexOf(" " + w) >= 0; })) s += 30;
      return s + 10 * Math.log10((+plays || 0) + 1);
    }

    /* known artists, with common misspellings, for "sarkodi" → "Sarkodie" */
    var ARTISTS = [
      ["Sarkodie", "sarkodi", "sarkodee", "sark", "sarkcess"], ["Black Sherif", "black sheriff", "blacko", "blak sherif", "black sherrif"],
      ["Stonebwoy", "stone boy", "stonebowy", "stoneboy"], ["Shatta Wale", "shatta", "shata wale"], ["King Promise", "king promis"],
      ["KiDi", "kidi"], ["Kuami Eugene", "kwame eugene", "kuami"], ["Gyakie", "gyaki"], ["Medikal", "medical"],
      ["Kwesi Arthur", "kwesi artur"], ["Camidoh", "camido"], ["Amaarae", "amarae"], ["R2Bees", "r2 bees", "r2bs"],
      ["Daddy Lumba", "lumba", "dady lumba"], ["Kojo Antwi", "kojo anti"], ["Joe Mettle", "joe metle"], ["Diana Hamilton", "diana hamiltom"],
      ["Piesie Esther", "piesie", "pisie esther"], ["Lasmid"], ["Olivetheboy", "olive the boy", "olive"],
      ["Kweku Smoke", "kweku smok"], ["O'Kenneth", "okenneth", "o kenneth"], ["Samini"], ["Amakye Dede", "amakye"],
      ["Kofi Kinaata", "kinaata"], ["Wendy Shay"], ["Fameye"], ["Efya"], ["Mr Drew"], ["Kelvyn Boy", "kelvin boy"],
      ["Darkovibes", "darko vibes"], ["Joey B"], ["Pappy Kojo"], ["Strongman"], ["Obrafour"], ["Reggie Rockstone"], ["Akwaboah"],
      ["Celestine Donkor"], ["Obaapa Christy"], ["Ebony Reigns", "ebony"], ["Kwabena Kwabena"], ["Nana Ama"], ["Moliy"], ["Kofi Mole"],
      ["Sefa"], ["Kizz Daniel"], ["Burna Boy", "burna"], ["Wizkid"], ["Davido"], ["Rema"]
    ];
    function normTxt(s) { return String(s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
    var INDEX = [];
    ARTISTS.forEach(function (row) {
      row.forEach(function (alias) { INDEX.push({ name: row[0], key: normTxt(alias).replace(/ /g, "") }); });
    });
    /* finds a known artist in the text, forgiving case, spacing and small typos */
    function findArtist(text) {
      var w = normTxt(text).split(" ").filter(Boolean), best = null;
      for (var len = 4; len >= 1; len--) {
        for (var s = 0; s + len <= w.length; s++) {
          var chunk = w.slice(s, s + len).join(""), allow = chunk.length <= 4 ? 0 : chunk.length <= 7 ? 1 : 2;
          for (var k = 0; k < INDEX.length; k++) {
            var e = INDEX[k];
            if (Math.abs(e.key.length - chunk.length) > allow) continue;
            var d = lev(chunk, e.key);
            if (d <= allow && (!best || d < best.d || (d === best.d && chunk.length > best.len))) {
              best = { name: e.name, d: d, len: chunk.length, start: s, end: s + len, words: w };
            }
          }
        }
      }
      return best;
    }
    /* swaps a misspelt artist name for the right one */
    function fixArtists(q) {
      var hit = findArtist(q);
      if (!hit) return q;
      var w = hit.words.slice();
      if (w.slice(hit.start, hit.end).join("") === normTxt(hit.name).replace(/ /g, "")) return q;
      w.splice(hit.start, hit.end - hit.start, hit.name);
      return w.join(" ");
    }

    function selfTest(log) {
      var out = [], ok = true;
      function eq(name, got, want) {
        var pass = JSON.stringify(got) === JSON.stringify(want);
        ok = ok && pass;
        out.push((pass ? "PASS " : "FAIL ") + name + (pass ? "" : " · got " + JSON.stringify(got) + " want " + JSON.stringify(want)));
      }
      var c1 = clean("Sarkodie-–-Anadwo-ft.-King-Promise-www.Ghanasongs.com_", "Ghana Songs");
      eq("slug title", c1.title, "Anadwo"); eq("slug artist", c1.artist, "Sarkodie"); eq("slug feat", c1.feat, "King Promise");
      eq("type beat filtered", passes("Sarkodie", "(FREE) Sarkodie x Johad - It's Lit FREESTYLE TYPE BEAT 86 (prod by AFROBANGV)", "AFROBANGV"), false);
      var c3 = clean("Sarkodie - Sub Zero (hearthis.at)", "DJ Upload");
      eq("hearthis title", c3.title, "Sub Zero"); eq("hearthis artist", c3.artist, "Sarkodie");
      eq("song - artist swap", clean("Anadwo - Sarkodie (Official Audio)", "Sarkodie").title, "Anadwo");
      eq("norm", norm("Sarkodie – Sub Zero (Official Audio) [Lyrics] ft. X"), "sarkodie sub zero");
      eq("relevant", passes("Sarkodie", "Sarkodie - Sub Zero", "uploader"), true);
      eq("irrelevant", passes("Sarkodie", "Love Song", "DE BRAINIACS"), false);
      eq("beat allowed when asked", passes("sarkodie type beat", "Sarkodie Type Beat 2024", "x"), true);
      eq("match", matches({ title: "Anadwo (feat. King Promise)", artist: "Sarkodie", dur: 200 }, { title: "Sarkodie-–-Anadwo-ft.-King-Promise-www.Ghanasongs.com_", user: "GH Uploads", dur: 205 }) > 0, true);
      eq("match by uploader", matches({ title: "Sub Zero", artist: "Sarkodie", dur: 0 }, { title: "Sub Zero", user: "Sarkodie", dur: 180 }) > 0, true);
      eq("wrong artist", matches({ title: "Anadwo", artist: "Sarkodie", dur: 200 }, { title: "Anadwo", user: "DE BRAINIACS", dur: 200 }), 0);
      eq("wrong duration", matches({ title: "Anadwo", artist: "Sarkodie", dur: 200 }, { title: "Sarkodie - Anadwo", user: "x", dur: 260 }), 0);
      eq("wrong title", matches({ title: "Adonai", artist: "Sarkodie", dur: 0 }, { title: "Sarkodie - Anadwo", user: "x", dur: 0 }), 0);
      eq("artist fuzzy", artistMatches("Sarkodie", "sarkodi"), true);
      eq("random uploader rejected", artistMatches("DE BRAINIACS", "Sarkodie"), false);
      eq("dedupe key", key("Anadwo (feat. King Promise)", "Sarkodie & King Promise"), key("Anadwo", "Sarkodie"));
      eq("fix artist", fixArtists("sarkodi anadwo"), "Sarkodie anadwo");
      (log || console.log)(out.join("\n") + "\n" + (ok ? "All passed" : "Some failed"));
      return ok;
    }
    return {
      norm: norm, loose: loose, clean: clean, junk: junk, relevant: relevant, passes: passes, matches: matches,
      artistMatches: artistMatches, mainArtist: mainArtist, fuzzyIn: fuzzyIn, key: key, score: score, lev: lev,
      normTxt: normTxt, findArtist: findArtist, fixArtists: fixArtists, selfTest: selfTest
    };
  })();

  /* ============ 7 sources ============ */
  /* Deezer and iTunes are catalogues only (song info, artwork, charts): their rows carry preview: true and
     never play. Audio comes from Audius, YouTube, Jamendo, the Internet Archive and radio. */

  /* ---- deezer (no key; no CORS headers, so JSONP) ---- */
  var Deezer = (function () {
    var API = "https://api.deezer.com/", cache = {};
    function get(path, ms) {
      return Net.jsonp(API + path + (path.indexOf("?") < 0 ? "?" : "&") + "output=jsonp", ms).then(function (d) {
        if (!d || d.error) throw new Error((d && d.error && d.error.message) || "deezer");
        return d;
      });
    }
    function get2(path, ms) { return Net.again(function () { return get(path, ms); }); }
    function track(d, al) {
      var a = d.album || al || {}, ar = d.artist || {};
      return {
        id: "deezer:" + d.id, dz: d.id, title: d.title_short || d.title, artist: ar.name || "", artistId: ar.id,
        art: a.cover_big || a.cover_xl || a.cover_medium || "", album: a.title || "",
        dur: +d.duration || 0, rank: +d.rank || 0, preview: true, source: "deezer"
      };
    }
    function tracks(j, al) {
      return ((j && j.data) || []).filter(function (d) { return d && d.id && d.title && d.preview && d.readable !== false; }).map(function (d) { return track(d, al); });
    }
    function artist(a) { return { dz: a.id, name: a.name, art: a.picture_xl || a.picture_big || a.picture_medium || "", thumb: a.picture_big || a.picture_medium || a.picture_xl || "", fans: +a.nb_fan || 0 }; }
    function album(a, who) {
      return { dz: a.id, title: a.title, art: a.cover_xl || a.cover_big || a.cover_medium || "", thumb: a.cover_big || a.cover_medium || a.cover_xl || "",
        artist: (a.artist && a.artist.name) || who || "", year: String(a.release_date || "").slice(0, 4) };
    }
    function playlist(p) { return { dz: p.id, title: p.title, art: p.picture_xl || p.picture_big || "", thumb: p.picture_big || p.picture_medium || p.picture_xl || "", n: +p.nb_tracks || 0 }; }
    function list(j, fn) { return ((j && j.data) || []).filter(function (x) { return x && x.id; }).map(function (x) { return fn(x); }); }
    function artists(q) { return get("search/artist?q=" + encodeURIComponent(q) + "&limit=10").then(function (j) { return list(j, artist).filter(function (a) { return a.name; }); }); }
    function albums(q) { return get("search/album?q=" + encodeURIComponent(q) + "&limit=15").then(function (j) { return list(j, album).filter(function (a) { return a.title; }); }); }
    /* 3: the artist asked for and every query word present; 2: the artist; 1: query words only */
    function tier(t, q, hint) {
      if (!q) return 0;
      var a = MX.artistMatches(t.artist, q) || (!!hint && MX.artistMatches(t.artist, hint));
      return (a ? 2 : 0) + (MX.relevant(q, t.title, t.artist, t.album) ? 1 : 0);
    }
    function rank(arr, q, hint) {
      return arr.map(function (t, i) { return { t: t, k: tier(t, q, hint), i: i }; })
        .sort(function (x, y) { return y.k - x.k || (y.t.rank || 0) - (x.t.rank || 0) || x.i - y.i; })
        .map(function (x) { return x.t; });
    }
    function bestArtist(arr, name) {
      var k = MX.loose(name).replace(/ /g, ""), best = null, bs = -1;
      (arr || []).forEach(function (a) {
        var c = MX.loose(a.name).replace(/ /g, ""), s = c === k ? 3 : (c.length > 3 && MX.lev(c, k) <= 2) ? 2 : MX.artistMatches(a.name, name) ? 1 : 0;
        if (s > bs || (s === bs && (a.fans || 0) > (best.fans || 0))) { bs = s; best = a; }
      });
      return best;
    }
    /* plain query, plus artist:"NAME" for a known artist, each with one retry; ranked, never filtered */
    function search(term) {
      var k = String(term).toLowerCase();
      if (cache[k]) return cache[k];
      var hint = "";
      try { var hit = MX.findArtist(term); if (hit) hint = hit.name; } catch (e) {}
      var qs = ["search/track?q=" + encodeURIComponent(term) + "&limit=40"], err = null;
      if (hint) qs.push("search/track?q=" + encodeURIComponent('artist:"' + hint + '"') + "&limit=40");
      var p = Promise.all(qs.map(function (u) { return get2(u).then(tracks, function (e) { err = err || e; return null; }); })).then(function (rs) {
        if (rs.every(function (r) { return !r; })) throw err || new Error("deezer");
        return rank(uniq([].concat.apply([], rs.filter(Boolean))), term, hint);
      });
      cache[k] = p;
      p.catch(function () { delete cache[k]; });
      return p;
    }
    return { get: get, get2: get2, tracks: tracks, artist: artist, album: album, playlist: playlist, list: list, artists: artists, albums: albums, bestArtist: bestArtist, search: search, reset: function () { cache = {}; } };
  })();

  /* ---- itunes (song info only) ---- */
  var ITunes = (function () {
    var cache = {};
    function track(d) {
      return {
        id: "itunes:" + (d.trackId || d.previewUrl), title: d.trackName, artist: d.artistName || "",
        art: String(d.artworkUrl100 || "").replace("100x100", "600x600") || ART,
        dur: d.trackTimeMillis ? d.trackTimeMillis / 1000 : 0, album: d.collectionName || "", preview: true, source: "itunes"
      };
    }
    function once(term, country) {
      return Net.json("https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&entity=song&limit=40" + (country ? "&country=" + country : "")).then(function (j) {
        return ((j && j.results) || []).filter(function (d) { return d && d.previewUrl && d.trackName; }).map(track);
      });
    }
    /* the global store (with one retry); the Ghana store fills in under 5 results */
    function search(term) {
      var k = String(term).toLowerCase();
      if (cache[k]) return cache[k];
      var p = Net.again(function () { return once(term, ""); }).then(function (list) {
        if (list.length >= 5) return list;
        return once(term, "GH").then(function (more) { return uniq(list.concat(more)); }, function () { return list; });
      });
      cache[k] = p;
      p.catch(function () { delete cache[k]; });
      return p;
    }
    return { search: search, reset: function () { cache = {}; } };
  })();

  /* ---- audius (full songs, free) ---- */
  var Audius = (function () {
    var API = "https://api.audius.co/v1/", APP = "EMUYE";
    /* search hosts: each session starts on one at random to spread the load (streams stay on api.audius.co) */
    var HOSTS = [API, "https://discoveryprovider.audius.co/v1/", "https://discoveryprovider2.audius.co/v1/", "https://discoveryprovider3.audius.co/v1/"];
    var host = Math.floor(Math.random() * HOSTS.length);
    var hs = Store.sget("au-host");
    if (hs != null && HOSTS[+hs]) host = +hs; else Store.sset("au-host", host);
    /* one request at a time, at least 600 ms apart, so Audius never sees a burst (bursts get 429s) */
    var q = [], busy = 0, block = 0, cache = {}, last = 0, wait = 0;
    function next() {
      if (busy || !q.length || wait) return;
      var gap = last + 600 - Date.now();
      if (gap > 0) { wait = setTimeout(function () { wait = 0; next(); }, gap); return; }
      var j = q.shift(), p;
      busy++;
      last = Date.now();
      try { p = j[0](); } catch (e) { p = Promise.reject(e); }
      p.then(j[1], j[2]).then(function () { busy--; last = Date.now(); next(); });
    }
    function slot(fn) { return new Promise(function (res, rej) { q.push([fn, res, rej]); next(); }); }
    /* replies are kept for the session and a 429 pause survives a reload, so Audius is never asked twice */
    function search(term) {
      if (!Settings.on("audius")) return Promise.resolve([]);
      var k = String(term).toLowerCase().trim();
      if (cache[k]) return cache[k];
      block = Math.max(block, +Store.sget("au-block") || 0);
      try { var hit = JSON.parse(Store.sget("au:" + k) || "null"); if (hit) return (cache[k] = Promise.resolve(hit)); } catch (e) {}
      if (Date.now() < block) return Promise.reject(new Error("rate limited"));
      /* a long backlog is stale by the time it runs: the oldest waiting search gives way */
      if (q.length >= 12) q.shift()[2](new Error("rate limited"));
      var p = slot(function () {
        if (Date.now() < block) return Promise.reject(new Error("rate limited"));
        return Net.json(HOSTS[host] + "tracks/search?query=" + encodeURIComponent(term) + "&app_name=" + APP + "&limit=40").then(function (j) {
          var rows = ((j && j.data) || []).filter(function (d) { return d && d.id && d.title; });
          Store.sset("au:" + k, JSON.stringify(rows));
          return rows;
        }, function (e) {
          if (!/HTTP 429/.test(String(e && e.message))) throw e;
          /* a 429 pauses all Audius searches for two minutes; the next session starts on the next host */
          host = (host + 1) % HOSTS.length;
          Store.sset("au-host", host);
          block = Date.now() + 120000;
          q.splice(0).forEach(function (j) { j[2](new Error("rate limited")); });
          Store.sset("au-block", block);
          throw e;
        });
      });
      cache[k] = p;
      p.catch(function () { delete cache[k]; });
      return p;
    }
    function uploader(d) { return d.user ? (d.user.name || "") + " " + (d.user.handle || "") : ""; }
    function track(d) {
      var aw = d.artwork || {};
      return {
        id: "audius:" + d.id, title: d.title, artist: (d.user && d.user.name) || "Audius artist",
        art: aw["480x480"] || aw["150x150"] || aw["1000x1000"] || ART,
        src: API + "tracks/" + encodeURIComponent(d.id) + "/stream?app_name=" + APP,
        dur: +d.duration || 0, plays: +d.play_count || 0, source: "audius"
      };
    }
    /* a track with its title cleaned ("Artist - Song (Official Audio)" → Song by Artist) */
    function cleanTrack(d) {
      var t = track(d), c = MX.clean(d.title, (d.user && d.user.name) || "");
      t.title = c.title; t.artist = (c.artist || t.artist) + (c.feat ? " feat. " + c.feat : "");
      return t;
    }
    /* users only when their name or handle is the artist asked for (never random uploaders) */
    function users(term) {
      return Net.json(API + "users/search?query=" + encodeURIComponent(term) + "&app_name=" + APP + "&limit=8").then(function (j) {
        return ((j && j.data) || []).filter(function (u) { return u && u.id && u.name && (MX.artistMatches(u.name, term) || MX.artistMatches(u.handle || "", term)); });
      });
    }
    function userTracks(id) {
      return Net.json(API + "users/" + encodeURIComponent(id) + "/tracks?app_name=" + APP + "&limit=30").then(function (j) {
        return ((j && j.data) || []).filter(function (d) { return d && d.id && d.title && !MX.junk(d.title, ""); }).map(cleanTrack)
          .sort(function (a, b) { return b.plays - a.plays; });
      });
    }
    function ping() { return Net.json(API + "tracks/search?query=drake&app_name=" + APP + "&limit=1"); }
    return { search: search, track: track, cleanTrack: cleanTrack, uploader: uploader, users: users, userTracks: userTracks, ping: ping };
  })();

  /* ---- html entities (YouTube and Jamendo titles) ---- */
  var ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  function decode(s) {
    return String(s == null ? "" : s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, c) {
      if (c.charAt(0) === "#") { var n = /x/i.test(c.charAt(1)) ? parseInt(c.slice(2), 16) : +c.slice(1); try { return String.fromCodePoint(n); } catch (e) { return m; } }
      var v = ENT[c.toLowerCase()];
      return v == null ? m : v;
    });
  }

  /* ---- youtube (full songs in the official player; needs a key; looked up on tap) ---- */
  var YouTube = (function () {
    var enc = encodeURIComponent;
    function url(q, key, n) { return "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=" + (n || 15) + "&q=" + enc(q) + "&key=" + enc(key); }
    function chan(c) { return decode(c).replace(/\s*-\s*topic$/i, "").replace(/\s*vevo$/i, "").trim(); }
    function map(it) {
      var id = it && it.id && it.id.videoId, sn = (it && it.snippet) || {}, th = sn.thumbnails || {};
      if (!id) return null;
      var raw = decode(sn.title), who = chan(sn.channelTitle), c = MX.clean(raw, who);
      return { id: "yt:" + id, yt: id, src: "yt:" + id, title: c.title, artist: (c.artist || who) + (c.feat ? " feat. " + c.feat : ""),
        art: (th.high || th.medium || th["default"] || {}).url || "", source: "youtube", raw: raw, channel: who };
    }
    /* ≥80% of the song's title words, the artist (fuzzy) in channel or title, no karaoke/cover/remix unless the song is one */
    var BAD = /\b(karaoke|cover|remix|instrumental|slowed|sped up|nightcore|8d|reverb|live|reaction|tutorial)\b/gi;
    function accept(song, v) {
      if (!song || !v) return false;
      var st = " " + MX.loose(song.title) + " ";
      if ((v.raw.match(BAD) || []).some(function (w) { return st.indexOf(" " + w.toLowerCase() + " ") < 0; })) return false;
      return MX.matches({ title: song.title, artist: song.artist, dur: 0 }, { title: v.raw, user: v.channel, dur: 0 }) > 0;
    }
    /* the quota resets at midnight Pacific */
    function day() { return new Date(Date.now() - 8 * 36e5).toISOString().slice(0, 10); }
    function quotaHit() { return Store.get("yt-quota", "") === day(); }
    function search(q, key) {
      return Net.api(url(q, key || Settings.ytKey())).then(function (j) { return ((j && j.items) || []).map(map).filter(Boolean); }, function (e) {
        if (e.quota && !quotaHit()) { Store.set("yt-quota", day()); toast("YouTube's daily limit is used up. Full songs via YouTube are back tomorrow."); }
        throw e;
      });
    }
    function test(key) { return Net.api(url("test", key, 1)).then(function (j) { return ((j && j.items) || []).length; }); }
    /* matches for catalogue songs, cached per song: hits for 30 days, misses for 3 */
    var cache = Store.get("yt-cache", {}) || {}, inflight = {};
    function ck(t) { return MX.key(t.title, t.artist); }
    function cached(t) {
      var c = cache[ck(t)];
      if (!c || Date.now() - c[1] > (c[0] ? 30 : 3) * 864e5) return undefined;
      return c[0];
    }
    function remember(t, v) {
      cache[ck(t)] = [v || "", Date.now()];
      var ks = Object.keys(cache);
      if (ks.length > 500) ks.sort(function (a, b) { return cache[a][1] - cache[b][1]; }).slice(0, ks.length - 500).forEach(function (k) { delete cache[k]; });
      Store.set("yt-cache", cache);
    }
    function matched(t) { return !!t.yt && String(t.id).indexOf("yt:") !== 0; }
    function apply(t, v) { t.yt = v; t.preview = false; }
    function revert(t) { delete t.yt; t.preview = true; }
    function want(t) { return t && t.preview && !t.yt && (t.dz || t.source === "itunes"); }
    function find(t) {
      var c = cached(t);
      if (c !== undefined) return Promise.resolve(c);
      if (!Settings.ytOn() || quotaHit()) return Promise.resolve("");
      var k = ck(t);
      if (!inflight[k]) {
        inflight[k] = search(t.artist + " " + t.title + " official audio").then(function (list) {
          var hit = list.filter(function (v) { return accept(t, v); })[0];
          remember(t, hit && hit.yt);
          return hit ? hit.yt : "";
        }, function () { return ""; });
        inflight[k].then(function () { delete inflight[k]; });
      }
      return inflight[k];
    }
    /* lists: reuse cached matches only (no searches, no quota spent); a known miss is hidden */
    function boost(list) {
      var on = Settings.ytOn();
      (list || []).forEach(function (t) {
        if (matched(t) && !on) revert(t);
        else if (want(t) && on) { var c = cached(t); if (c) apply(t, c); else if (c === "") t._nofull = true; }
      });
    }
    /* on tap: one search for this song (cached); no match means the song is skipped */
    function resolve(t) {
      if (!t) return null;
      if (matched(t) && !Settings.ytOn()) { revert(t); return null; }
      if (!want(t) || !Settings.ytOn()) return null;
      var c = cached(t);
      if (c !== undefined) { if (c) apply(t, c); return null; }
      if (quotaHit()) return null;
      return find(t).then(function (v) { if (v && Settings.ytOn()) apply(t, v); });
    }
    /* a video that can't be embedded: forget the match; true means "skip to the next song" */
    function onError(t) {
      if (!t || !matched(t)) { toast("This YouTube video can't play here."); return false; }
      remember(t, ""); revert(t);
      return true;
    }
    return { search: search, test: test, boost: boost, resolve: resolve, onError: onError, quotaHit: quotaHit };
  })();

  /* ---- jamendo (free full songs to download; needs a Client ID) ---- */
  var Jamendo = (function () {
    var enc = encodeURIComponent;
    var TAGS = [["afrobeat", "Afrobeat"], ["reggae", "Reggae"], ["gospel", "Gospel"], ["jazz", "Jazz"], ["hiphop", "Hip Hop"], ["rnb", "R&B"], ["chillout", "Chillout"],
      ["lounge", "Lounge"], ["electronic", "Electronic"], ["rock", "Rock"], ["classical", "Classical"], ["soundtrack", "Soundtrack"], ["lofi", "Lo-fi"]];
    function map(r) {
      if (!r || !r.id || !r.audio) return null;
      var ok = r.audiodownload_allowed !== false && !!r.audiodownload;
      return { id: "jamendo:" + r.id, jm: r.id, title: decode(r.name), artist: decode(r.artist_name), album: decode(r.album_name || ""),
        art: r.album_image || r.image || "", src: r.audio, dl: ok ? r.audiodownload : "", nodl: !ok, dur: +r.duration || 0, source: "jamendo" };
    }
    function get(rest, id) {
      return Net.api("https://api.jamendo.com/v3.0/tracks/?client_id=" + enc(id || Settings.jmId()) + "&format=json&audioformat=mp32&" + rest).then(function (j) {
        var h = (j && j.headers) || {};
        if (h.status && h.status !== "success") throw new Error(h.error_message || "Jamendo error");
        return ((j && j.results) || []).map(map).filter(Boolean);
      });
    }
    function search(q, id) { return get("limit=20&include=musicinfo&search=" + enc(q), id); }
    function tag(t) { return get("limit=30&order=popularity_week" + (t ? "&tags=" + enc(t) : "")); }
    return { TAGS: TAGS, search: search, tag: tag };
  })();

  function secure() { try { return G.location.protocol === "https:"; } catch (e) { return false; } }
  function httpsOf(u) { return String(u || "").replace(/^http:\/\//i, "https://"); }

  /* ---- free full songs (replaces Openverse, which kept timing out).
     Smart search: Internet Archive tracks, fast 7s limit, results cached per search,
     and a source that fails twice in a row rests for 5 minutes instead of making you wait. ---- */
  var FreeSongs = (function () {
    var cache = {}, fails = 0, restUntil = 0;
    var FILTER = " AND mediatype:audio AND NOT collection:(podcasts OR radioprograms OR oldtimeradio OR librivoxaudio OR audio_bookspoetry OR audio_religion OR audio_podcast OR podcasts_mirror OR etree) AND NOT subject:(podcast OR sermon OR audiobook OR interview OR radio)";
    function secs(v) {
      if (v == null) return 0;
      var p = String(v).split(":").map(Number);
      if (p.some(isNaN)) return 0;
      return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p.length === 2 ? p[0] * 60 + p[1] : p[0];
    }
    function words(x) { return String(x || "").toLowerCase().replace(/[^a-z0-9\u00c0-\u024f\u0186\u0190\u0254\u025b ]+/g, " ").split(/\s+/).filter(function (w) { return w.length > 1; }); }
    function score(q, t) {
      var qw = words(q), hay = (t.title + " " + t.artist + " " + (t.album || "")).toLowerCase(), n = 0;
      qw.forEach(function (w) { if (hay.indexOf(w) >= 0) n++; });
      return qw.length ? n / qw.length : 0;
    }
    function tracksOf(d) {
      var id = d.identifier;
      return Net.json("https://archive.org/metadata/" + encodeURIComponent(id) + "?fields=files,metadata", 7000).then(function (m) {
        var md = (m && m.metadata) || {}, art = "https://archive.org/services/img/" + encodeURIComponent(id);
        var artist = creator(md.creator || d.creator), album = trim(md.title || d.title || "");
        var seen = {};
        return ((m && m.files) || []).filter(function (f) {
          if (!/\.mp3$/i.test(f.name || "")) return false;
          var key = (f.title || f.name).toLowerCase().replace(/\.mp3$/, "").replace(/_?(vbr|64kb|128kb|sample)$/, "");
          if (seen[key]) return false;
          seen[key] = 1;
          var len = secs(f.length);
          return !len || len >= 60;
        }).slice(0, 12).map(function (f) {
          var len = secs(f.length);
          return { id: "ia:" + id + "/" + f.name, title: trim((f.title || f.name).replace(/\.mp3$/i, "").replace(/^\d+[\s._-]+/, "")) || "Untitled",
            artist: trim(f.artist || f.creator || "") || artist, album: album, art: art, dur: Math.round(len) || 0, source: "free",
            src: "https://archive.org/download/" + encodeURIComponent(id) + "/" + encodeURIComponent(f.name) };
        });
      }, function () { return []; });
    }
    function search(q) {
      q = Archive.cleanQ(String(q || ""));
      if (!q) return Promise.resolve([]);
      var k = q.toLowerCase();
      if (cache[k]) return Promise.resolve(cache[k]);
      if (Date.now() < restUntil) return Promise.reject(new Error("resting after slow replies, back in a few minutes"));
      var url = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent("(title:(" + q + ") OR creator:(" + q + ")) AND format:(VBR MP3 OR MP3)" + FILTER) +
        "&fl[]=identifier&fl[]=title&fl[]=creator&sort[]=downloads+desc&rows=8&output=json";
      return Net.json(url, 7000).then(function (j) {
        fails = 0;
        var docs = ((j && j.response && j.response.docs) || []).filter(Archive.notClip).slice(0, 4);
        return Promise.all(docs.map(tracksOf));
      }, function (e) {
        if (++fails >= 2) { restUntil = Date.now() + 300000; fails = 0; }
        throw e;
      }).then(function (groups) {
        var all = [].concat.apply([], groups);
        all.forEach(function (t) { t._s = score(q, t); });
        all = all.filter(function (t) { return t._s > 0; }).sort(function (x, y) { return y._s - x._s; }).slice(0, 20);
        cache[k] = all;
        return all;
      });
    }
    function ping() { return search("highlife"); }
    return { search: search, ping: ping };
  })();

  /* ---- internet archive (albums, podcasts, live concerts, audiobooks) ---- */
  var Archive = (function () {
    var MUSIC_FILTER = " AND mediatype:audio AND NOT collection:(podcasts OR radioprograms OR oldtimeradio OR librivoxaudio OR audio_bookspoetry OR audio_religion OR audio_podcast OR podcasts_mirror) AND NOT subject:(podcast OR sermon OR audiobook OR interview OR radio)";
    function cleanQ(q) { return q.replace(/[()":\[\]{}\\]/g, " ").replace(/\s+/g, " ").trim(); }
    function query(q, cat, isGenre) {
      var Q = cleanQ(q), g = Q ? "(" + Q + ") AND " : "";
      if (cat === "podcasts") return g + "mediatype:audio AND collection:(podcasts OR radioprograms OR audio_podcast)";
      if (cat === "live") return g + "collection:etree";
      if (cat === "audiobooks") return g + "collection:librivoxaudio";
      if (isGenre) return "(subject:(" + Q + ") OR title:(" + Q + "))" + MUSIC_FILTER;
      return "(creator:(" + Q + ") OR title:(" + Q + ") OR subject:(" + Q + "))" + MUSIC_FILTER;
    }
    function url(q, p, cat, isGenre) {
      return "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(query(q, cat, isGenre)) +
        "&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=subject&sort[]=downloads+desc&rows=24&page=" + p + "&output=json";
    }
    /* uploads titled "preview" or "snippet" are clips, not full songs */
    function notClip(d) { return !/\b(preview|snippet)s?\b/i.test(String((d && d.title) || "")); }
    function search(q, p, cat, isGenre) {
      return Net.json(url(q, p, cat, isGenre)).then(function (j) {
        var docs = (j && j.response && j.response.docs) || [];
        return { raw: docs.length, docs: docs.filter(notClip) };
      });
    }
    function img(id) { return "https://archive.org/services/img/" + encodeURIComponent(id); }
    /* an item's MP3s as tracks */
    function album(id, title) {
      return Net.json("https://archive.org/metadata/" + encodeURIComponent(id), 20000).then(function (m) {
        var files = ((m && m.files) || []).filter(function (f) { return /\.mp3$/i.test(f.name || ""); });
        var artist = (m && m.metadata && creator(m.metadata.creator)) || title || "Internet Archive";
        return { artist: artist, art: img(id), tracks: files.map(function (f) {
          return { id: id + "/" + f.name, title: (f.title || f.name).replace(/\.mp3$/i, ""), artist: artist, art: img(id),
            src: "https://archive.org/download/" + encodeURIComponent(id) + "/" + encodeURIComponent(f.name) };
        }) };
      });
    }
    function ping() { return Net.json("https://archive.org/advancedsearch.php?q=music&fl[]=identifier&rows=1&output=json"); }
    return { cleanQ: cleanQ, search: search, notClip: notClip, img: img, album: album, ping: ping };
  })();

  /* ---- radio (Radio Browser; no key) ---- */
  var Radio = (function () {
    var enc = encodeURIComponent;
    var HOSTS = ["https://de1.api.radio-browser.info/json/", "https://nl1.api.radio-browser.info/json/", "https://at1.api.radio-browser.info/json/"];
    var TAGS = [["afrobeats", "Afrobeats"], ["highlife", "Highlife"], ["hiplife", "Hiplife"], ["gospel", "Gospel"], ["hip hop", "Hip Hop"], ["rnb", "R&B"], ["pop", "Pop"], ["reggae", "Reggae"], ["jazz", "Jazz"], ["news", "News"]];
    var GH = "stations/bycountrycodeexact/GH?hidebroken=true&order=clickcount&reverse=true&limit=40";
    var TOP = "stations/topclick/40?hidebroken=true";
    function tagPath(tag) { return "stations/bytagexact/" + enc(tag) + "?hidebroken=true&order=clickcount&reverse=true&limit=30"; }
    function namePath(q, n, cc) { return "stations/search?name=" + enc(q) + "&hidebroken=true&order=clickcount&reverse=true&limit=" + (n || 30) + (cc ? "&countrycode=" + cc : ""); }
    /* the stream: url_resolved, or on an https page an https url / the https variant of an http one */
    function streamURL(s, sec) {
      var u = trim(s.url_resolved || s.url), alt = trim(s.url);
      if (!/^https?:\/\//i.test(u)) return "";
      if (sec && /^http:/i.test(u)) return /^https:/i.test(alt) ? alt : httpsOf(u);
      return u;
    }
    function map(s, sec) {
      if (!s || !s.stationuuid) return null;
      var name = trim(s.name), src = streamURL(s, sec);
      if (!name || !src) return null;
      var fav = trim(s.favicon);
      if (!/^https?:\/\//i.test(fav)) fav = ""; else if (sec) fav = httpsOf(fav);
      var where = trim(s.country) || trim(s.countrycode);
      return { id: "radio:" + s.stationuuid, uuid: s.stationuuid, title: name, artist: "Live radio" + (where ? " · " + where : ""), country: where,
        tags: String(s.tags || "").split(",").map(trim).filter(Boolean).slice(0, 3), br: +s.bitrate || 0, art: fav, src: src, live: true, source: "radio", hls: +s.hls === 1 };
    }
    /* one row per station (the directory lists some stations twice) */
    function stations(list, sec) {
      var seen = {};
      return (Array.isArray(list) ? list : []).map(function (s) { return map(s, sec); }).filter(function (t) {
        if (!t) return false;
        var k = t.title.toLowerCase() + "|" + t.country.toLowerCase();
        if (seen[t.uuid] || seen[k]) return false;
        seen[t.uuid] = seen[k] = true;
        return true;
      });
    }
    /* the last host that answered first, then the others in turn */
    var host = 0;
    function rb(path) {
      var tries = 0;
      function attempt() {
        var i = (host + tries) % HOSTS.length;
        return Net.json(HOSTS[i] + path, 9000).then(function (j) { host = i; return j; }, function (e) {
          tries++;
          if (tries < HOSTS.length) return attempt();
          throw e;
        });
      }
      return attempt();
    }
    var hlsOK = null;
    function canHLS() {
      if (hlsOK == null) { try { var a = doc.createElement("audio"); hlsOK = !!(a.canPlayType && a.canPlayType("application/vnd.apple.mpegurl")); } catch (e) { hlsOK = false; } }
      return hlsOK;
    }
    var memo = {};
    function list(path) {
      var m = memo[path];
      if (m && Date.now() - m.t < 5 * 60000) return m.p;
      var p = rb(path).then(function (j) { return stations(j, secure()).filter(function (t) { return !t.hls || canHLS(); }); });
      memo[path] = { t: Date.now(), p: p };
      p.catch(function () { delete memo[path]; });
      return p;
    }
    /* count a play in the directory (fire and forget) */
    function click(t) {
      if (!t || !t.uuid) return;
      try { fetch(HOSTS[host] + "stations/click/" + enc(t.uuid)).catch(function () {}); } catch (e) {}
    }
    /* favourite stations, saved */
    var favs = Store.get("radio-favs", []) || [];
    if (!Array.isArray(favs)) favs = [];
    function isFav(t) { return !!t && favs.some(function (f) { return f.uuid === t.uuid; }); }
    function toggleFav(t) {
      if (!t || !t.uuid) return false;
      var was = isFav(t);
      if (was) favs = favs.filter(function (f) { return f.uuid !== t.uuid; });
      else favs.unshift({ id: t.id, uuid: t.uuid, title: t.title, artist: t.artist, country: t.country, tags: t.tags || [], br: t.br || 0, art: t.art || "", src: t.src, live: true, source: "radio" });
      Store.set("radio-favs", favs);
      return !was;
    }
    return {
      TAGS: TAGS, GH: GH, TOP: TOP, tagPath: tagPath, namePath: namePath, stations: stations, rb: rb, list: list, click: click,
      favs: function () { return favs.slice(); }, isFav: isFav, toggleFav: toggleFav, reset: function () { memo = {}; }
    };
  })();

  /* ============ 8 rows: full-song policy, row markup, list wiring, action sheet ============ */
  /* Only full songs are listed or played. Catalogue rows (Deezer/iTunes, t.preview) count when matched to a
     full stream (Audius, or t.yt), or, with a YouTube key, as "Full song via YouTube", looked up when tapped. */
  function isFull(t) { return !!t && (!t.preview || !!t.yt); }
  function listable(t) { return isFull(t) || (!!t && Settings.ytOn() && !t._nofull); }
  function fullOnly(list) { return (list || []).filter(listable); }
  function viaYT(t) { return !!t && (!!t.yt || (!!t.preview && Settings.ytOn())); }
  function canDl(t) { return !!t.src && !t.preview && !t.yt && !t.nodl && !t.live; }
  function badge(t) {
    if (t.live) return '<em class="x-badge x-badge--live">Live</em>';
    if (t.source === "free") return '<em class="x-badge" title="Free full song">Free</em>';
    return viaYT(t) ? '<em class="x-badge x-badge--yt" title="Full song via YouTube">YT</em>' : t.source === "jamendo" ? '<em class="x-badge">Free</em>' : "";
  }
  /* the source line under the title in Now Playing */
  function srcCap(t) {
    if (t.live) return '<span class="x-badge x-badge--live">Live</span>Live radio' + (t.country ? " · " + esc(t.country) : "") + (t.br ? " · " + t.br + " kbps" : "");
    if (t.source === "free") return '<span class="x-badge">Free</span>' + esc((t.artist || "Unknown") + " · Free full song · Internet Archive");
    if (t.yt) return '<span class="x-badge x-badge--yt">YT</span>Full song · YouTube';
    if (t.preview) return Settings.ytOn() ? '<span class="x-badge x-badge--yt">YT</span>Full song via YouTube' : "";
    if (t.source === "jamendo") return '<span class="x-badge">Free</span>Free · Jamendo';
    if (t.source === "audius") return "Full song · Audius";
    return /archive\.org/.test(t.src || "") ? "Full · Internet Archive" : "";
  }
  /* the fields a saved track keeps (liked songs, playlists) */
  function slim(t) {
    var o = { id: t.id, title: t.title, artist: t.artist, art: t.art, src: t.src || t.url };
    if (t.preview) o.preview = true;
    if (t.source) o.source = t.source;
    if (t.dur) o.dur = t.dur;
    if (t.dz && (t.preview || t.yt)) o.dz = t.dz;
    if (t.yt) o.yt = t.yt;
    if (t.dl) o.dl = t.dl;
    if (t.nodl) o.nodl = true;
    if (t.lic) o.lic = t.lic;
    if (t.prov) o.prov = t.prov;
    if (t.live) { o.live = true; o.uuid = t.uuid; o.country = t.country; o.br = t.br; }
    return o;
  }
  function img(src) { return '<img loading="lazy" src="' + esc(src || ART) + '" alt="" />'; }
  /* a song row: artwork, title, badge · artist · length, download button where allowed, ••• */
  function songRow(t, i) {
    var dl = !canDl(t) ? "" : '<button class="x-tbtn" type="button" data-act="download" aria-label="Download ' + esc(t.title) + '">' + (Library.isSaved(t) ? I.check : I.dl) + "</button>";
    return '<div class="x-row" data-i="' + i + '">' + img(t.art) +
      '<button class="x-meta" type="button" data-act="play"><b>' + esc(t.title) + "</b><span>" + badge(t) +
      esc(t.artist || "") + (t.dur ? " · " + time(t.dur) : "") + (t.lic ? " · " + esc(t.lic) : "") + "</span></button>" + dl +
      '<button class="x-more" type="button" data-act="more" aria-label="More options for ' + esc(t.title) + '">' + I.more + "</button></div>";
  }
  /* a library row: artwork, title, badge · artist, ••• */
  function libRow(t, i) {
    return '<div class="x-row" data-i="' + i + '">' + img(t.art) +
      '<button class="x-meta" type="button" data-act="play"><b>' + esc(t.title) + "</b><span>" + badge(t) + esc(t.artist) + "</span></button>" +
      '<button class="x-more" type="button" data-act="more" aria-label="More options for ' + esc(t.title) + '">' + I.more + "</button></div>";
  }
  /* a live station row with its favourite heart */
  function stationRow(t, i) {
    var f = Radio.isFav(t);
    var sub = [t.country, (t.tags || []).join(", "), t.br ? t.br + " kbps" : ""].filter(Boolean).join(" · ");
    return '<div class="x-row" data-i="' + i + '">' + img(t.art) +
      '<button class="x-meta" type="button" data-act="play"><b>' + esc(t.title) + '</b><span><em class="x-badge x-badge--live">Live</em>' + esc(sub) + "</span></button>" +
      '<button class="x-tbtn' + (f ? " is-on" : "") + '" type="button" data-act="fav" aria-pressed="' + f + '" aria-label="' + (f ? "Remove " : "Add ") + esc(t.title) + (f ? " from" : " to") + ' favourite stations">' + (f ? I.heart : I.heartO) + "</button></div>";
  }
  /* rows in a box play, like, download, open ••• or fav; the box keeps its list in box._list */
  function wire(box, list, extra) {
    box._list = list;
    if (box._wired) return;
    box._wired = true;
    box.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var row = btn.closest("[data-i]");
      if (!row) return;
      var i = +row.dataset.i, t = (box._list || [])[i];
      if (!t) return;
      var act = btn.dataset.act;
      if (act === "play") Player.playList(box._list, i);
      else if (act === "like") Library.like(t);
      else if (act === "download") { if (!Library.isSaved(t)) Library.download(t, btn); }
      else if (act === "more") Acts.track(t, box._list, i);
      else if (act === "fav") RadioUI.fav(t);
      else if (extra) extra(act, t, i);
    });
  }
  /* rows into a box: songs (default), library rows or stations */
  function fillRows(box, list, kind) {
    box.innerHTML = list.map(kind === "lib" ? libRow : kind === "station" ? stationRow : songRow).join("");
    wire(box, list);
  }
  /* a titled block (Jamendo, YouTube, free songs results) */
  function fillBox(box, head, list, empty) {
    box.hidden = false;
    box.classList.toggle("is-empty", !list.length);
    box.innerHTML = '<p class="x-group">' + head + "</p>" + (list.length ? '<div class="x-rows"></div>' : '<p class="x-sub">' + esc(empty) + "</p>");
    if (list.length) fillRows(box.lastChild, list);
  }

  /* ---- action sheet ---- */
  var Acts = (function () {
    var items = [];
    function open(head, list) {
      items = list;
      $("acts-title").textContent = head.title || "Options";
      $("acts-sub").textContent = head.sub || "";
      var im = $("acts-art");
      im.hidden = !head.art;
      if (head.art) im.src = head.art;
      $("acts-list").innerHTML = list.map(function (it, i) {
        return '<button class="x-act' + (it.on ? " is-on" : "") + '" type="button" data-a="' + i + '">' + (it.icon || "") + "<span>" + esc(it.label) + "</span></button>";
      }).join("");
      $("acts").classList.add("is-on");
      try { $("acts-list").querySelector("button").focus({ preventScroll: true }); } catch (e) {}
    }
    function close() { $("acts").classList.remove("is-on"); }
    function isOpen() { return $("acts").classList.contains("is-on"); }
    function headOf(t) { return { title: t.title, sub: (viaYT(t) ? "Full song via YouTube · " : "") + (t.artist || ""), art: t.art || ART }; }
    function playlist(t) {
      var pls = Library.playlists();
      if (!pls.length) {
        open({ title: "Add to a playlist", sub: "You have no playlists yet." }, [
          { label: "Create a playlist in Library", icon: I.plus, fn: function () { Bot.close(); UI.show("library"); UI.libSec("playlists"); Player.closeNow(); } }
        ]);
        return;
      }
      open({ title: "Add to a playlist", sub: t.title }, pls.map(function (p) {
        return { label: p.name + " · " + plural(p.tracks.length, "song"), icon: I.note, fn: function () { Library.addTo(p, t); } };
      }));
    }
    function track(t, list, i) {
      var its = [];
      if (list) its.push({ label: "Play", icon: I.play, fn: function () { Player.playList(list, i); } });
      if (t.live) {
        var fv = Radio.isFav(t);
        its.push({ label: fv ? "Remove from favourite stations" : "Add to favourite stations", icon: fv ? I.heart : I.heartO, on: fv, fn: function () { RadioUI.fav(t); } });
        open({ title: t.title, sub: "Live radio" + (t.country ? " · " + t.country : ""), art: t.art || ART }, its);
        return;
      }
      var lk = Library.isLiked(t), sv = Library.isSaved(t);
      its.push({ label: "Add to a playlist", icon: I.plus, fn: function () { playlist(t); } });
      its.push({ label: lk ? "Unlike" : "Like", icon: lk ? I.heart : I.heartO, on: lk, fn: function () { Library.like(t); toast(Library.isLiked(t) ? "Added to Liked Songs" : "Removed from Liked Songs"); } });
      if (canDl(t)) its.push({ label: sv ? "Downloaded" : "Download", icon: sv ? I.check : I.dl, on: sv, fn: function () { if (!Library.isSaved(t)) { toast("Downloading…"); Library.download(t, null); } } });
      open(headOf(t), its);
    }
    function init() {
      $("acts-cancel").addEventListener("click", close);
      $("acts").addEventListener("click", function (e) {
        if (e.target === this) { close(); return; }
        var b = e.target.closest("[data-a]");
        if (!b) return;
        var it = items[+b.dataset.a];
        close();
        if (it && it.fn) it.fn();
      });
    }
    return { open: open, close: close, isOpen: isOpen, headOf: headOf, playlist: playlist, track: track, init: init };
  })();

  /* ============ 9 player ============ */
  /* Media: one player with the <audio> API. "yt:VIDEOID" sources play in the official YouTube IFrame player
     (kept visible, as YouTube's terms ask: over Now Playing, or docked above the mini player); the rest in <audio>. */
  var Media = (function () {
    var el = $("audio");
    var L = {}, mode = "audio", yt = null, making = false, ready = false, want = false, vid = "", cued = "", paused = true, vol = 1, tick = 0, raf = 0, dur = 0, apiP = null;
    function fire(type) { (L[type] || []).slice().forEach(function (f) { try { f.call(M, { type: type, target: M }); } catch (e) {} }); }
    ["play", "pause", "ended", "error", "timeupdate", "loadedmetadata", "durationchange"].forEach(function (type) {
      el.addEventListener(type, function () { if (mode === "audio") fire(type); });
    });
    function api() {
      if (apiP) return apiP;
      apiP = new Promise(function (res, rej) {
        if (G.YT && G.YT.Player) return res(G.YT);
        var prev = G.onYouTubeIframeAPIReady, s = doc.createElement("script");
        G.onYouTubeIframeAPIReady = function () { try { if (prev) prev(); } catch (e) {} res(G.YT); };
        s.src = "https://www.youtube.com/iframe_api"; s.async = true;
        s.onerror = function () { apiP = null; rej(new Error("yt api")); };
        doc.head.appendChild(s);
      });
      return apiP;
    }
    function sync() {
      if (!ready || mode !== "yt") return;
      try {
        if (cued !== vid) { cued = vid; dur = 0; if (want) yt.loadVideoById(vid); else yt.cueVideoById(vid); }
        else if (want) yt.playVideo();
      } catch (e) {}
    }
    function make() {
      if (yt || making) return;
      making = true;
      api().then(function (YT) {
        cued = vid;
        yt = new YT.Player("yt-player", {
          width: "100%", height: "100%", videoId: vid,
          playerVars: { playsinline: 1, rel: 0, autoplay: want ? 1 : 0 },
          events: {
            onReady: function () { ready = true; try { yt.setVolume(Math.round(vol * 100)); } catch (e) {} sync(); },
            onStateChange: function (e) {
              if (mode !== "yt") return;
              if (e.data === 1) { paused = false; fire("play"); durChk(); }
              else if (e.data === 2) { paused = true; fire("pause"); }
              else if (e.data === 0) { paused = true; fire("pause"); fire("timeupdate"); fire("ended"); }
            },
            onError: function (e) {
              if (mode !== "yt") return;
              paused = true; fire("pause");
              if (!(M.onYtError && M.onYtError(e.data))) fire("error");
            }
          }
        });
      }, function () { making = false; if (mode === "yt") fire("error"); });
    }
    function durChk() {
      var d = 0;
      try { d = ready ? yt.getDuration() : 0; } catch (e) {}
      if (d > 0 && d !== dur) { dur = d; fire("durationchange"); fire("loadedmetadata"); }
    }
    function onTick() { if (mode !== "yt") return; durChk(); if (!paused) fire("timeupdate"); }
    /* keep the player over the 16:9 slot in Now Playing, or docked above the mini player (min 200x113) */
    function place() {
      if (raf) return;
      (function loop() {
        var b = $("yt-box");
        if (mode !== "yt" || !b) { raf = 0; return; }
        var now = $("now"), slot = $("yt-slot"), mini = $("mini"), x, y, w, h, r;
        if (now && slot && now.classList.contains("is-on")) { r = slot.getBoundingClientRect(); x = r.left; y = r.top; w = r.width; h = r.height; }
        else {
          r = mini ? mini.getBoundingClientRect() : { left: 8, top: G.innerHeight - 80, width: 0 };
          w = Math.max(200, Math.min(256, r.width * 0.5)); h = Math.round(w * 9 / 16);
          x = r.left || 8; y = (r.width ? r.top : G.innerHeight - 140) - h - 8;
        }
        var k = [x, y, w, h].map(Math.round).join();
        if (k !== b._k) { b._k = k; b.style.left = Math.round(x) + "px"; b.style.top = Math.round(y) + "px"; b.style.width = Math.round(w) + "px"; b.style.height = Math.round(h) + "px"; }
        raf = requestAnimationFrame(loop);
      })();
    }
    function toYT(id) {
      mode = "yt";
      try { el.pause(); } catch (e) {}
      vid = id; paused = true; want = false; dur = 0;
      doc.documentElement.classList.add("x-yt");
      place();
      if (!tick) tick = setInterval(onTick, 250);
      if (ready) sync(); else make();
    }
    function toAudio() {
      if (mode !== "yt") return;
      mode = "audio"; want = false; paused = true;
      try { if (ready) yt.stopVideo(); } catch (e) {}
      clearInterval(tick); tick = 0;
      doc.documentElement.classList.remove("x-yt");
    }
    var M = {
      addEventListener: function (t, f) { (L[t] = L[t] || []).push(f); },
      removeEventListener: function (t, f) { L[t] = (L[t] || []).filter(function (g) { return g !== f; }); },
      play: function () {
        if (mode === "audio") return el.play() || Promise.resolve();
        want = true;
        if (ready) sync(); else make();
        return Promise.resolve();
      },
      pause: function () {
        if (mode === "audio") return el.pause();
        want = false;
        try { if (ready) yt.pauseVideo(); } catch (e) {}
        if (!ready && !paused) { paused = true; fire("pause"); }
      },
      get src() { return mode === "yt" ? "yt:" + vid : el.src; },
      set src(v) {
        var m = String(v || "").match(/^yt:([\w-]{6,})$/);
        if (m) toYT(m[1]); else { toAudio(); el.src = v; }
      },
      get currentTime() { if (mode === "audio") return el.currentTime; try { return ready ? yt.getCurrentTime() || 0 : 0; } catch (e) { return 0; } },
      set currentTime(v) { if (mode === "audio") { el.currentTime = v; return; } try { if (ready) yt.seekTo(+v || 0, true); } catch (e) {} fire("timeupdate"); },
      get duration() { return mode === "audio" ? el.duration : dur || NaN; },
      get paused() { return mode === "audio" ? el.paused : paused; },
      get volume() { return vol; },
      set volume(v) { vol = Math.max(0, Math.min(1, +v || 0)); el.volume = vol; try { if (ready) yt.setVolume(Math.round(vol * 100)); } catch (e) {} },
      get isYouTube() { return mode === "yt"; },
      onYtError: null
    };
    return M;
  })();

  var Player = (function () {
    var audio = Media, queue = [], index = -1, shuffle = false, repeat = false, nowEl = null;
    var FINDING = "Finding the full song on YouTube…";
    function current() { return queue[index] || null; }
    function note(s) { try { $("now-note").textContent = s; } catch (e) {} }
    function playAt(i, skips) {
      if (i < 0 || i >= queue.length) return;
      index = i;
      skips = skips || 0;
      var t = queue[i];
      function go() {
        if (queue[index] !== t) return;
        paint();
        note("");
        try {
          audio.src = t.yt ? "yt:" + t.yt : (t.url || t.src);
          audio.play().catch(function () { setPlay(false); });
        } catch (e) {}
        if (t.live) Radio.click(t);
      }
      /* no full stream: never fall back to a catalogue clip; skip to the next song */
      function skip() {
        if (queue[index] !== t) return;
        if (Settings.ytOn()) t._nofull = true;
        toast("Full song not available");
        var n = skips + 1;
        if (n < queue.length && index + 1 < queue.length) playAt(index + 1, n);
        else if (n < queue.length && repeat) playAt(0, n);
        else { try { audio.pause(); } catch (e) {} note("No full song available for this one."); }
      }
      function decide() {
        if (queue[index] !== t) return;
        if ($("now-note").textContent === FINDING) note("");
        if (isFull(t)) go(); else skip();
      }
      /* source order: Audius full match (already merged) → YouTube match (key set, looked up on tap) → skip */
      var pre = null;
      if (!isFull(t) && Settings.ytOn()) {
        try { pre = YouTube.resolve(t); } catch (e) {}
        if (pre && pre.then) note(FINDING);
      }
      if (pre && pre.then) pre.then(decide, decide); else decide();
      paint();
      $("mini").classList.add("is-on");
      mediaSession(t);
      Lyrics.track();
    }
    function paint() {
      var t = current();
      if (!t) return;
      var art = t.art || ART;
      doc.documentElement.classList.toggle("x-live", !!t.live);
      $("mini-title").textContent = t.title;
      $("mini-artist").textContent = t.artist || "";
      $("mini-art").src = art;
      $("now-title").textContent = t.title;
      $("now-artist").textContent = t.artist || "";
      var c = srcCap(t);
      $("now-prev").hidden = !c; $("now-prev").innerHTML = c;
      $("now-art").src = art;
      $("now-bg").src = art;
      $("now-more").setAttribute("aria-label", "More options for " + t.title);
      $("lyr-title").textContent = t.title;
      $("lyr-artist").textContent = t.artist || "";
      $("lyr-art").src = art;
      $("lyr-more").setAttribute("aria-label", "More options for " + t.title);
    }
    function setPlay(on) {
      $("play").innerHTML = on ? I.pause : I.play;
      $("play").setAttribute("aria-label", on ? "Pause" : "Play");
      $("now").classList.toggle("is-playing", on);
      $("mini-play").innerHTML = on ? I.pause : I.play;
      $("mini-play").setAttribute("aria-label", on ? "Pause" : "Play");
    }
    function toggle() {
      if (!current()) return;
      if (audio.paused) audio.play().catch(function () {}); else audio.pause();
    }
    function next() {
      if (!queue.length) return;
      if (shuffle) { playAt(Math.floor(Math.random() * queue.length)); return; }
      if (index + 1 < queue.length) playAt(index + 1);
      else if (repeat) playAt(0);
    }
    function prev() {
      if (!queue.length) return;
      var ct = current();
      if (!(ct && ct.live) && audio.currentTime > 4) { audio.currentTime = 0; return; }
      playAt(index > 0 ? index - 1 : queue.length - 1);
    }
    function playList(list, i) { queue = (list || []).slice(); playAt(i || 0); }
    function setShuffle(on) { shuffle = !!on; $("shuffle").setAttribute("aria-pressed", String(shuffle)); }
    /* play a list from the top, or shuffled */
    function play(list, mode) {
      if (!list || !list.length) { toast("No songs found."); return; }
      queue = list.slice();
      setShuffle(mode === "shuffle");
      playAt(shuffle ? Math.floor(Math.random() * queue.length) : 0);
    }
    /* the current song can't play in full: mark it and move on */
    function skipBad() {
      var t = current();
      if (t) { t._nofull = true; toast("Full song not available"); }
      if (index + 1 < queue.length) playAt(index + 1); else { try { audio.pause(); } catch (e) {} }
    }
    function replay() { if (current()) playAt(index); }
    function setVol(v) {
      v = Math.max(0, Math.min(100, +v || 0));
      $("vol").value = String(v);
      $("vol").style.setProperty("--p", v + "%");
      try { audio.volume = v / 100; } catch (e) {}
    }
    function mediaSession(t) {
      try {
        if (!("mediaSession" in G.navigator)) return;
        G.navigator.mediaSession.metadata = new G.MediaMetadata({
          title: t.title, artist: t.live ? "Live radio" + (t.country ? " · " + t.country : "") : t.artist || "ƐMU YƐ", album: t.live ? "ƐMU YƐ Radio" : "ƐMU YƐ Music Player",
          artwork: [{ src: t.art || ART, sizes: "512x512" }]
        });
        G.navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
        G.navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        G.navigator.mediaSession.setActionHandler("nexttrack", next);
        G.navigator.mediaSession.setActionHandler("previoustrack", prev);
      } catch (e) {}
    }
    /* Now Playing sheet: slides up; tap the grabber or drag down to close */
    function isNowOpen() { return !!nowEl && nowEl.classList.contains("is-on"); }
    function openNow() {
      nowEl.style.transform = "";
      nowEl.classList.add("is-on");
      doc.documentElement.classList.add("x-lock");
      Lyrics.reveal();
      /* lyrics are looked up when Now Playing is open, never for songs nobody is looking at */
      Lyrics.ensure();
    }
    function closeNow() {
      nowEl.style.transform = "";
      nowEl.classList.remove("is-on", "is-drag");
      doc.documentElement.classList.remove("x-lock");
    }
    function initDrag() {
      var y0 = 0, x0 = 0, t0 = 0, dy = 0, live = false, dragging = false;
      function start(x, y, target) {
        if (target.closest("input, textarea, .x-lyr__body") || $("now-inner").scrollTop > 0) return;
        live = true; dragging = false; x0 = x; y0 = y; dy = 0; t0 = Date.now();
      }
      function move(x, y, ev) {
        if (!live) return;
        var ddy = y - y0, ddx = x - x0;
        if (!dragging) {
          if (Math.abs(ddy) < 8) return;
          if (ddy < 0 || Math.abs(ddx) > Math.abs(ddy)) { live = false; return; }
          dragging = true;
          nowEl.classList.add("is-drag");
        }
        dy = Math.max(0, ddy);
        nowEl.style.transform = "translateY(" + dy + "px)";
        if (ev && ev.cancelable) ev.preventDefault();
      }
      function end() {
        if (!live) return;
        live = false;
        if (!dragging) return;
        dragging = false;
        nowEl.classList.remove("is-drag");
        var fast = dy / Math.max(1, Date.now() - t0) > 0.6;
        if (dy > 120 || (fast && dy > 40)) closeNow();
        else nowEl.style.transform = "";
      }
      nowEl.addEventListener("touchstart", function (e) { var p = e.touches[0]; start(p.clientX, p.clientY, e.target); }, { passive: true });
      nowEl.addEventListener("touchmove", function (e) { var p = e.touches[0]; move(p.clientX, p.clientY, e); }, { passive: false });
      nowEl.addEventListener("touchend", end);
      nowEl.addEventListener("touchcancel", end);
      $("now-close").addEventListener("mousedown", function (e) {
        start(e.clientX, e.clientY, e.target);
        function mm(ev) { move(ev.clientX, ev.clientY, ev); }
        function mu() { doc.removeEventListener("mousemove", mm); doc.removeEventListener("mouseup", mu); end(); }
        doc.addEventListener("mousemove", mm);
        doc.addEventListener("mouseup", mu);
      });
    }
    function init() {
      nowEl = $("now");
      Media.onYtError = function () { if (YouTube.onError(current())) { skipBad(); return true; } return false; };
      audio.addEventListener("play", function () { setPlay(true); });
      audio.addEventListener("pause", function () { setPlay(false); });
      audio.addEventListener("ended", function () {
        if (repeat && queue.length === 1) { audio.currentTime = 0; audio.play().catch(function () {}); return; }
        next();
      });
      audio.addEventListener("error", function () {
        var ct = current();
        note(ct && ct.live ? "This station isn't streaming right now. Try another." : "That song would not load. Try another.");
      });
      audio.addEventListener("timeupdate", function () {
        $("t-now").textContent = time(audio.currentTime);
        $("t-end").textContent = "-" + time(Math.max(0, (audio.duration || 0) - audio.currentTime));
        if (audio.duration) {
          $("seek").value = String(Math.round((audio.currentTime / audio.duration) * 1000));
          $("seek").style.setProperty("--p", $("seek").value / 10 + "%");
        }
      });
      $("seek").addEventListener("input", function () {
        this.style.setProperty("--p", this.value / 10 + "%");
        if (audio.duration) audio.currentTime = (this.value / 1000) * audio.duration;
      });
      setVol(Store.get("vol", 100));
      $("vol").addEventListener("input", function () { setVol(this.value); Store.set("vol", +this.value); });
      $("play").addEventListener("click", toggle);
      $("mini-play").addEventListener("click", toggle);
      $("next").addEventListener("click", next);
      $("mini-next").addEventListener("click", next);
      $("prev").addEventListener("click", prev);
      $("shuffle").addEventListener("click", function () { setShuffle(!shuffle); });
      $("repeat").addEventListener("click", function () { repeat = !repeat; this.setAttribute("aria-pressed", String(repeat)); });
      /* the mini player opens straight into lyrics when this song has them */
      $("mini-open").addEventListener("click", function () { Lyrics.openIfFound(); openNow(); });
      $("now-close").addEventListener("click", closeNow);
      initDrag();
      $("now-more").addEventListener("click", function () { var t = current(); if (t) Acts.track(t, null); });
      $("queue-btn").addEventListener("click", function () {
        if (!queue.length) { toast("Nothing in the queue yet."); return; }
        Acts.open({ title: "Queue", sub: plural(queue.length, "song") + (shuffle ? " · shuffle on" : "") }, queue.map(function (t, i) {
          return { label: t.title + (t.artist ? " · " + t.artist : ""), icon: i === index ? I.play : I.note, on: i === index, fn: function () { playAt(i); } };
        }));
      });
      each("#mini-art, #now-art", function (im) { im.classList.add("x-fallback"); });
    }
    return {
      audio: audio, current: current, playAt: playAt, playList: playList, play: play, next: next, prev: prev, toggle: toggle,
      skipBad: skipBad, replay: replay, paint: paint, openNow: openNow, closeNow: closeNow, isNowOpen: isNowOpen,
      hasQueue: function () { return queue.length > 0; }, init: init
    };
  })();

  /* ============ 10 library ============ */
  var Library = (function () {
    function arr(v) { return Array.isArray(v) ? v : []; }
    var liked = arr(Store.get("liked", [])), playlists = arr(Store.get("playlists", [])), local = [], downloads = [];
    function isLiked(t) { return liked.some(function (x) { return x.id === t.id; }); }
    function isSaved(t) { return downloads.some(function (x) { return x.id === t.id; }); }
    function like(t) {
      if (isLiked(t)) liked = liked.filter(function (x) { return x.id !== t.id; });
      else liked.push(slim(t));
      Store.set("liked", liked);
      render();
      Player.paint();
    }
    function savePls() { Store.set("playlists", playlists); render(); }
    function addTo(p, t) { p.tracks.push(slim(t)); savePls(); toast("Added to " + p.name); }
    /* a new playlist with a unique name (Ask ƐMU's "make a playlist") */
    function create(name, tracks) {
      var nm = name, n = 2;
      while (playlists.some(function (p) { return p.name === nm; })) nm = name + " " + n++;
      playlists.push({ name: nm, tracks: (tracks || []).map(slim) });
      savePls();
      return nm;
    }
    function listHTML(list, empty) { return list.length ? list.map(libRow).join("") : '<p class="x-note">' + empty + "</p>"; }
    function render() {
      var lr = $("local-rows");
      lr.innerHTML = listHTML(local, "No songs added yet. Use Add your songs in Library.");
      wire(lr, local);
      var kr = $("liked-rows"), lk = fullOnly(liked);
      kr.innerHTML = listHTML(lk, "No liked songs yet. Tap the heart or ••• on any song.");
      wire(kr, lk);
      $("playlists").innerHTML = playlists.length
        ? playlists.map(function (p, i) {
            var n = fullOnly(p.tracks).length;
            return '<div class="x-row" data-p="' + i + '"><img src="' + esc(ART) + '" alt="" />' +
              '<button class="x-meta" type="button" data-pact="play"><b>' + esc(p.name) + "</b><span>" + plural(n, "song") + "</span></button>" +
              '<button class="x-more" type="button" data-pact="more" aria-label="More options for ' + esc(p.name) + '">' + I.more + "</button></div>";
          }).join("")
        : '<p class="x-note">No playlists yet. Create one above, then use ••• on any song to add it.</p>';
    }
    function onPlaylist(e) {
      var btn = e.target.closest("[data-pact]");
      if (!btn) return;
      var i = +btn.closest("[data-p]").dataset.p, p = playlists[i];
      if (!p) return;
      var pf = fullOnly(p.tracks);
      if (btn.dataset.pact === "more") {
        var cur = Player.current(), items = [];
        if (pf.length) items.push({ label: "Play", icon: I.play, fn: function () { Player.playList(pf, 0); } });
        if (cur) items.push({ label: "Add the song playing now", icon: I.plus, fn: function () { addTo(p, cur); } });
        items.push({ label: "Delete playlist", icon: I.trash, fn: function () { playlists.splice(i, 1); savePls(); } });
        Acts.open({ title: p.name, sub: plural(pf.length, "song"), art: ART }, items);
        return;
      }
      if (!pf.length) { if (p.tracks.length) toast("No full songs in this playlist yet"); return; }
      Player.playList(pf, 0);
    }

    /* downloads: audio blobs (and their lyrics) in IndexedDB, playable with no signal */
    var offlineShown = false;
    function offlineToast() {
      if (offlineShown || Store.idb()) return;
      offlineShown = true;
      if (Store.sget("offline-toast")) return;
      Store.sset("offline-toast", "1");
      toast("Saved for this session only. Install the app to keep downloads offline.", 3500);
    }
    var auDown = 0;
    function download(t, btn) {
      offlineToast();
      function mark(s) {
        if (!btn) return;
        if (btn._orig == null) btn._orig = btn.innerHTML;
        btn.innerHTML = s === "busy" ? "…" : s === "done" ? I.check : btn._orig;
        btn.disabled = s === "busy";
      }
      if (t.yt || t.preview) { toast("YouTube songs can't be downloaded."); return; }
      if (t.nodl) { toast("This free song isn't licensed for download."); return; }
      if (!t.src) { mark("done"); return; }
      /* Audius file hosts unreachable from this network: say so once instead of retrying every song */
      if (t.source === "audius" && Date.now() < auDown) { toast("Audius downloads aren't reachable on this connection right now."); return; }
      mark("busy");
      var cur = Player.current();
      var lyrP = Lyrics.forTrack(t, cur && cur.id === t.id ? Player.audio.duration : 0).catch(function () { return null; });
      function getSrc() {
        return fetch(t.src).then(function (r) { if (!r.ok) throw new Error("bad"); return r; }, function (e) {
          if (t.source === "audius") auDown = Date.now() + 5 * 60000;
          throw e;
        });
      }
      (t.dl ? fetch(t.dl).then(function (r) { if (!r.ok) throw new Error("bad"); return r; }).catch(getSrc) : getSrc()).then(function (r) {
        return r.blob();
      }).then(function (blob) {
        return lyrP.then(function (L) { return { id: t.id, title: t.title, artist: t.artist, art: t.art, blob: blob, lyrics: L || null }; });
      }).then(function (rec) {
        return Store.put("tracks", rec).then(function () {
          downloads = downloads.filter(function (x) { return x.id !== rec.id; }).concat([rec]);
          renderDownloads();
          mark("done");
          if (!btn) toast("Saved for offline");
          Store.persist();
        });
      }).catch(function () {
        mark("idle");
        if (t.source === "audius") { toast("This song can't be downloaded"); return; }
                if (!btn) toast("That download did not finish. Try again.");
        $("now-note").textContent = "That download did not finish. Try again on a stronger connection.";
      });
    }
    function removeDownload(t) {
      downloads = downloads.filter(function (x) { return x.id !== t.id; });
      Store.del("tracks", t.id).then(renderDownloads);
    }
    function renderDownloads() {
      var box = $("dl-rows");
      var list = downloads.map(function (d) {
        var url = "";
        try { url = URL.createObjectURL(d.blob); } catch (e) {}
        return { id: d.id, title: d.title, artist: d.artist, art: d.art, url: url };
      });
      box.innerHTML = list.length
        ? list.map(function (t, i) {
            return '<div class="x-row" data-i="' + i + '">' + img(t.art) +
              '<button class="x-meta" type="button" data-act="play"><b>' + esc(t.title) + "</b><span>" + esc(t.artist || "") + " · saved</span></button>" +
              '<button class="x-more" type="button" data-act="dlmore" aria-label="More options for ' + esc(t.title) + '">' + I.more + "</button></div>";
          }).join("")
        : '<p class="x-note">Nothing saved yet. Tap the download icon on any song to keep it offline.</p>';
      wire(box, list, function (act, t, i) {
        if (act === "dlmore") Acts.open(Acts.headOf(t), [
          { label: "Play", icon: I.play, fn: function () { Player.playList(box._list, i); } },
          { label: "Delete download", icon: I.trash, fn: function () { removeDownload(t); } }
        ]);
      });
    }
    function init() {
      $("files").addEventListener("change", function () {
        [].forEach.call(this.files || [], function (f) {
          local.push({ id: "local:" + f.name, title: f.name.replace(/\.[^.]+$/, ""), artist: "On this phone", art: ART, url: URL.createObjectURL(f) });
        });
        render();
        UI.libSec("mine");
      });
      $("pl-form").addEventListener("submit", function (e) {
        e.preventDefault();
        var n = $("pl-name").value.trim();
        if (!n) return;
        playlists.push({ name: n, tracks: [] });
        $("pl-name").value = "";
        savePls();
      });
      $("playlists").addEventListener("click", onPlaylist);
      render();
      renderDownloads();
      Store.ready.then(function () { return Store.all("tracks"); }).then(function (rows) {
        downloads = rows || [];
        renderDownloads();
      });
    }
    return {
      isLiked: isLiked, isSaved: isSaved, like: like, addTo: addTo, create: create, download: download, render: render, init: init,
      liked: function () { return liked.slice(); }, playlists: function () { return playlists; },
      downloads: function () { return downloads; }, local: function () { return local; }
    };
  })();

  /* ============ 11 search: one pipeline ============ */
  /* combo(spec, cb) is the only music pipeline on the page. Deezer and iTunes carry the metadata; the top
     songs are matched to full Audius streams (MX.matches: title words, artist, duration). Catalogue rows with no
     full stream are dropped (shown as YouTube rows only when a key is set). Audius tracks the catalogues lack go
     to "community" when relevant and not beats/covers, with cleaned titles. It reports merged results each time a
     source lands, so one slow or failing source never blocks the others. */
  var Search = (function () {
    function keyOf(t) { return MX.key(t.title, t.artist); }
    function localMatches(q) {
      var words = String(q || "").toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; });
      if (!words.length) return [];
      return Library.local().filter(function (t) {
        var s = (t.title + " " + t.artist).toLowerCase();
        return words.every(function (w) { return s.indexOf(w) >= 0; });
      });
    }
    function specFor(q, loose) {
      var fixed = MX.fixArtists(q);
      return { q: fixed, strict: !loose, audius: [fixed], itunes: [fixed], local: q, beats: /beat|instrumental/i.test(q) };
    }
    function artistSpec(n) { return { q: n, strict: true, audius: [n], itunes: [n], beats: false }; }
    function combo(spec, cb) {
      var aq = spec.audius || [], iq = spec.itunes || [];
      var q = spec.q || iq[0] || aq[0] || "", strict = !!spec.strict;
      var beats = spec.beats != null ? spec.beats : /beat|instrumental/i.test(aq.concat(iq).join(" "));
      var IT = [], AU = {}, auIds = [], total = 0, pending = 0, fails = 0, extra = false;
      var errs = {}, catTotal = 0, catFails = 0;
      function addAu(rows) { (rows || []).forEach(function (d) { if (!AU[d.id]) { AU[d.id] = d; auIds.push(d.id); } }); }
      /* name: the source, for the error message; isCat: Deezer/iTunes, the main catalogue */
      function job(p, ok, name, isCat) {
        total++; pending++;
        if (isCat) catTotal++;
        p.then(function (v) { try { ok(v); } catch (e) {} }, function (e) {
          fails++;
          if (isCat) catFails++;
          if (name && !(name === "Audius" && errs[name])) errs[name] = Net.why(e);
        }).then(function () { pending--; emit(); });
      }
      function emit() {
        var seen = {}, songs = [], community = [], used = {};
        function take(t) { var k = keyOf(t); if (seen[k] || seen[t.id]) return false; seen[k] = seen[t.id] = 1; return true; }
        if (spec.local) localMatches(spec.local).forEach(function (t) { if (take(t)) songs.push(t); });
        /* IT has a slot per catalogue reply and can be sparse while others are pending */
        var its = uniq([].concat.apply([], IT.filter(Boolean)).filter(Boolean));
        if (strict && q) its = its.filter(function (t) { return MX.artistMatches(t.artist, q); }).concat(its.filter(function (t) { return !MX.artistMatches(t.artist, q); }));
        var au = auIds.map(function (id) { return AU[id]; });
        its.forEach(function (it, i) {
          if (!take(it)) return;
          var t = it, best = null, bs = 0;
          if (i < 15) au.forEach(function (d) {
            if (used[d.id]) return;
            var s = MX.matches(it, { title: d.title, user: Audius.uploader(d), dur: +d.duration || 0 });
            if (s > bs || (s && s === bs && +d.play_count > +best.play_count)) { bs = s; best = d; }
          });
          if (best) {
            used[best.id] = 1;
            var a = Audius.track(best);
            t = Object.assign({}, it, { id: a.id, src: a.src, dur: a.dur || it.dur, plays: a.plays, preview: false, source: "audius" });
          }
          songs.push(t);
        });
        var cands = [];
        au.forEach(function (d) {
          if (used[d.id]) return;
          var who = Audius.uploader(d);
          if (!beats && MX.junk(d.title, q)) return;
          if (!Archive.notClip(d)) return;
          if (strict && !MX.relevant(q, d.title, who)) return;
          var a = Audius.cleanTrack(d);
          a.score = MX.score(q, a.artist, who, d.title, a.plays);
          cands.push(a);
        });
        cands.sort(function (x, y) { return y.score - x.score || y.plays - x.plays; }).forEach(function (t) {
          if (community.length < 10 && take(t)) community.push(t);
        });
        YouTube.boost(songs);
        var listed = fullOnly(songs);
        try {
          cb({ songs: listed, all: songs, community: community, full: listed.concat(community), done: pending === 0,
            failed: total > 0 && fails === total, catFailed: catTotal > 0 && catFails === catTotal, errors: Object.assign({}, errs) });
        } catch (e) {}
      }
      function onCat(k) {
        return function (list) {
          IT[k] = list;
          /* the top songs also get an exact "artist title" Audius search */
          if (!extra && list.length) {
            extra = true;
            list.slice(0, 3).forEach(function (t) { job(Audius.search(MX.mainArtist(t.artist) + " " + MX.norm(t.title)), addAu, "Audius"); });
          }
        };
      }
      /* Deezer and iTunes run side by side: whichever lands first shows, the other merges in; Audius upgrades rows after */
      aq.forEach(function (a) { job(Audius.search(a), addAu, "Audius"); });
      iq.forEach(function (term, k) {
        if (Settings.on("deezer")) job(Deezer.search(term), onCat(2 * k), "Deezer", true);
        if (Settings.on("itunes")) job(ITunes.search(term), onCat(2 * k + 1), "iTunes", true);
      });
      if (spec.list) job(spec.list, onCat(2 * iq.length), "Deezer", true);
      if (!total) emit();
    }
    /* resolves when every source is in, or 3.5 s after the first songs land (Audius matching gets that long) */
    function all(spec) {
      return new Promise(function (resolve) {
        var last = null, grace = null, fin = false;
        function end(r) { if (fin) return; fin = true; clearTimeout(grace); resolve(r); }
        combo(spec, function (r) {
          last = r;
          if (r.done) { end(r); return; }
          if (!grace && (r.all.length || r.community.length)) grace = setTimeout(function () { end(last); }, 3500);
        });
      });
    }
    /* a ready-made Deezer list (artist top, album, playlist) matched to full Audius streams */
    function listSongs(p, aq, keepAll) {
      var bad = false;
      p = p.catch(function (e) { bad = true; throw e; });
      return all({ list: p, audius: aq || [], beats: false }).then(function (res) {
        var out = keepAll ? res.all : res.songs;
        if (!out.length && bad) throw new Error("list");
        return out;
      });
    }
    function artistSongs(name) {
      return all(artistSpec(name)).then(function (res) {
        return res.songs.filter(function (t) { return MX.artistMatches(t.artist, name); });
      });
    }
    return { combo: combo, all: all, listSongs: listSongs, specFor: specFor, artistSpec: artistSpec, artistSongs: artistSongs };
  })();

  /* ---- the Search view ---- */
  var SearchUI = (function () {
    var CAT_LABEL = { music: "Music", podcasts: "Podcast", live: "Live", audiobooks: "Audiobook" };
    var CAT_NAME = { music: "music", podcasts: "podcasts", live: "live concerts", audiobooks: "audiobooks" };
    var category = "music", page = 1, lastQuery = "highlife", lastGenre = false, lastOpts = {}, tok = 0, lastRes = null, lastQ = "";
    function setCategory(cat) {
      category = cat;
      [].forEach.call($("cat-seg").children, function (c) { c.setAttribute("aria-pressed", String(c.dataset.cat === cat)); });
      $("q").placeholder = cat === "music" ? "Artists, songs, albums" : cat === "podcasts" ? "Show or topic" : cat === "live" ? "Band or venue" : "Title or author";
    }
    function pressTile(b) {
      each("#genres > *, #others > *", function (c) { c.setAttribute("aria-pressed", String(c === b)); });
    }
    function cardHTML(d, cat) {
      return '<button class="x-card" type="button" data-id="' + esc(d.identifier) + '">' +
        '<img loading="lazy" src="' + esc(Archive.img(d.identifier)) + '" alt="" />' +
        '<em class="x-tag">' + CAT_LABEL[cat] + "</em>" +
        "<b>" + esc(d.title || d.identifier) + "</b><span>" + esc(creator(d.creator)) + "</span></button>";
    }
    function resultHTML(d, cat) {
      var name = d.title || d.identifier;
      return '<div class="x-row" data-id="' + esc(d.identifier) + '">' +
        '<img loading="lazy" src="' + esc(Archive.img(d.identifier)) + '" alt="" />' +
        '<button class="x-meta" type="button"><b>' + esc(name) + "</b><span>" + CAT_LABEL[cat] + " · " + esc(creator(d.creator)) + "</span></button>" +
        '<button class="x-more" type="button" data-more aria-label="More options for ' + esc(name) + '">' + I.more + "</button></div>";
    }
    function renderSongs(res) {
      lastRes = res;
      /* catalogue songs reuse a cached YouTube match; new ones are looked up only when tapped */
      YouTube.boost(res.all);
      var sb = $("search-songs"), pb = $("search-more");
      var songs = fullOnly(res.all || res.songs).slice(0, 30), more = res.community;
      sb.innerHTML = songs.length ? '<p class="x-group">Songs</p>' + songs.map(songRow).join("") : "";
      wire(sb, songs);
      pb.innerHTML = more.length ? '<p class="x-group">More from the community</p>' + more.map(songRow).join("") : "";
      wire(pb, more);
      $("dz-credit").hidden = !songs.some(function (t) { return t.dz; });
    }
    /* a search with no full songs and no YouTube key */
    function emptyState() {
      var sb = $("search-songs"), r = $("search-retry");
      if (Settings.ytOn() || (r && !r.hidden) || sb.children.length || $("search-more").children.length) return;
      sb.innerHTML = '<div class="x-empty"><p>No full songs found for “' + esc(lastQ) + '”. Add a free YouTube key in Settings → Music Sources to play almost any song in full.</p>' +
        '<button class="x-go" type="button" data-src-open>Open Music Sources</button></div>';
    }
    /* sources changed (a YouTube key added or removed): redraw every song list on the page */
    function redraw() {
      if (lastRes) { renderSongs(lastRes); if (!$("search-songs").children.length && !$("search-more").children.length) emptyState(); }
      Library.render();
      Coll.drawChart();
      Player.paint();
    }
    function run(q, p, isGenre, opts) {
      opts = opts || {};
      var cat = category;
      if (cat === "music" && !Archive.cleanQ(q)) q = "top hits";
      var grid = $("search-grid"), note = $("search-note"), retry = $("search-retry");
      lastQuery = q; page = p; lastGenre = !!isGenre; if (p === 1) lastOpts = opts;
      retry.hidden = true;
      var multi = cat === "music" && p === 1;
      var useArchive = !(multi && opts.noArchive) && (cat !== "music" || Settings.on("archive"));
      var my = ++tok;
      if (p === 1) {
        grid.innerHTML = ""; $("tracks").innerHTML = "";
        $("search-songs").innerHTML = ""; $("search-more").innerHTML = "";
        lastQ = q; lastRes = null;
        $("albums-head").hidden = $("dz-credit").hidden = true;
        Extras.search(multi ? q : "");
      }
      var what = q ? "“" + q + "” in " + CAT_NAME[cat] : "popular " + CAT_NAME[cat];
      var head = opts.label || (q ? q.charAt(0).toUpperCase() + q.slice(1) : "Popular " + CAT_NAME[cat]);
      if (p === 1) note.textContent = "Searching " + what + "…";
      $("more-btn").hidden = true;
      var st = { arch: useArchive ? "wait" : "done", archN: 0, archErr: false, archWhy: "", gh: multi ? "wait" : "done", res: null };
      /* every source failed: say why per source and offer a retry, never "nothing found" */
      function failNote() {
        var errs = Object.assign({}, (st.res && st.res.errors) || {});
        if (st.archErr) errs.Archive = st.archWhy || "error";
        var ORDER = ["Deezer", "iTunes", "Audius", "Archive"];
        var why = Object.keys(errs).sort(function (a, b) { return (ORDER.indexOf(a) + 9) % 9 - (ORDER.indexOf(b) + 9) % 9; }).map(function (k) { return k + ": " + errs[k]; }).join(" · ");
        note.textContent = "Couldn't reach the music sources" + (why ? " — " + why : "") + ". Check your connection and tap Retry.";
        retry.hidden = false;
      }
      function updNote() {
        if (my !== tok) return;
        var full = st.res ? fullOnly(st.res.all).length + st.res.community.length : 0;
        var pending = st.arch === "wait" || st.gh === "wait";
        if (!multi) {
          if (pending) return;
          if (p > 1) { if (st.archErr) toast("Could not load more. Try again."); return; }
          if (st.archErr) failNote();
          else if (!grid.children.length) note.textContent = "Nothing found for " + what + ". Try another spelling, or search in another category.";
          else note.textContent = head + " · " + CAT_LABEL[cat] + " · tap one to see its tracks.";
          return;
        }
        var parts = [];
        if (full) parts.push(plural(full, "song"));
        if (st.archN) parts.push(plural(st.archN, "album"));
        if (parts.length) note.textContent = head + " · " + parts.join(" · ") + (pending ? " · still searching…" : "");
        else if (pending) note.textContent = "Searching " + what + "…";
        else if (st.res && (st.res.catFailed || st.res.failed) && (st.archErr || !useArchive)) failNote();
        else if (!Settings.ytOn()) note.textContent = head;
        else note.textContent = "Nothing found for " + what + ". Try another spelling or a shorter name.";
        /* no key and no full songs: say how to get them */
        if (!pending && !full) emptyState();
      }
      if (multi) {
        try {
          Search.combo(opts.spec || Search.specFor(q, isGenre), function (res) {
            if (my !== tok) return;
            st.res = res;
            renderSongs(res);
            if (res.done) st.gh = "done";
            updNote();
          });
        } catch (e) {
          st.gh = "done";
          st.res = { songs: [], all: [], community: [], full: [], done: true, failed: true, catFailed: true, errors: { Search: Net.why(e) } };
          updNote();
        }
      }
      if (!useArchive) { updNote(); return; }
      Archive.search(q, p, cat, isGenre).then(function (r) {
        if (my !== tok) return;
        var docs = r.docs;
        /* music: only Archive items whose title or creator (or subject, for genres) holds every query word */
        if (cat === "music") docs = docs.filter(function (d) {
          return !MX.junk(d.title, q) && MX.relevant(q, d.title || "", creator(d.creator), isGenre ? [].concat(d.subject || []).join(" ") : "");
        });
        grid.insertAdjacentHTML("beforeend", docs.map(function (d) { return resultHTML(d, cat); }).join(""));
        st.archN = grid.children.length;
        if (multi && docs.length) $("albums-head").hidden = false;
        $("more-btn").hidden = r.raw < 24;
        st.arch = "done";
        updNote();
      }).catch(function (e) {
        if (my !== tok) return;
        st.arch = "done"; st.archErr = true; st.archWhy = Net.why(e);
        updNote();
      });
    }
    /* open a search from anywhere: a genre tile, a shelf's See All, Ghana tiles */
    function go(q, opts) {
      opts = opts || {};
      pressTile(opts.tile || null);
      setCategory(opts.cat || "music");
      $("q").value = opts.fill != null ? opts.fill : q;
      UI.show("search");
      run(q, 1, opts.isGenre, opts);
    }
    /* an album / podcast / concert from the Internet Archive, with its tracklist */
    function trackHTML(t, i) {
      var on = Library.isLiked(t), saved = Library.isSaved(t);
      return '<li class="x-track" data-i="' + i + '"><span class="x-track__n">' + (i + 1) + "</span>" +
        '<button class="x-meta" type="button" data-act="play"><b>' + esc(t.title) + "</b></button>" +
        '<button class="x-tbtn' + (on ? " is-on" : "") + '" type="button" data-act="like" aria-pressed="' + on + '" aria-label="Like ' + esc(t.title) + '">' + (on ? I.heart : I.heartO) + "</button>" +
        '<button class="x-tbtn" type="button" data-act="download" aria-label="Download ' + esc(t.title) + '">' + (saved ? I.check : I.dl) + "</button></li>";
    }
    function albumPlay(mode) {
      var list = $("tracks")._list || [];
      if (list.length) Player.play(list, mode);
    }
    function openItem(id, title, auto) {
      var box = $("tracks");
      box.innerHTML = '<p class="x-note">Loading songs…</p>';
      box.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      Archive.album(id, title).then(function (a) {
        if (!a.tracks.length) { box.innerHTML = '<p class="x-note">No playable MP3s in this album. Try another one.</p>'; return; }
        box.innerHTML = '<div class="x-album"><img class="x-album__art" src="' + esc(a.art) + '" alt="Cover of ' + esc(title || id) + '" />' +
          '<h2 class="x-album__title">' + esc(title || id) + '</h2><p class="x-album__artist">' + esc(a.artist) + "</p>" +
          '<div class="x-album__btns"><button type="button" data-album="play">' + I.play + 'Play</button><button type="button" data-album="shuffle">' + I.shuffle + "Shuffle</button></div></div>" +
          '<ol class="x-tracklist">' + a.tracks.map(trackHTML).join("") + "</ol>";
        box._list = a.tracks;
        if (auto) albumPlay(auto);
      }).catch(function () {
        box.innerHTML = '<p class="x-note">Could not load this album. Try again in a moment.</p>';
      });
    }
    function onCard(e) {
      var b = e.target.closest("[data-id]");
      if (!b) return;
      var id = b.dataset.id, title = b.querySelector("b").textContent;
      if (e.target.closest("[data-more]")) {
        var sub = b.querySelector(".x-meta span"), im = b.querySelector("img");
        Acts.open({ title: title, sub: sub ? sub.textContent : "", art: im ? im.src : ART }, [
          { label: "Open", icon: I.album, fn: function () { openItem(id, title); } },
          { label: "Play", icon: I.play, fn: function () { openItem(id, title, "play"); } },
          { label: "Shuffle", icon: I.shuffle, fn: function () { openItem(id, title, "shuffle"); } }
        ]);
        return;
      }
      UI.show("search");
      openItem(id, title);
    }
    var GENRES = ["Afrobeats", "Highlife", "Hiplife", "Gospel", "Reggae", "Hip Hop", "R&B", "Jazz", "Lo-fi", "Classical"];
    var OTHERS = [["podcasts", "Podcasts"], ["live", "Live Concerts"], ["audiobooks", "Audiobooks"]];
    function init() {
      $("genres").innerHTML = GENRES.map(function (g) { return '<button class="x-tile" type="button" data-g="' + esc(g) + '" aria-pressed="false">' + esc(g) + "</button>"; }).join("");
      $("others").innerHTML = OTHERS.map(function (o) { return '<button class="x-tile" type="button" data-cat="' + o[0] + '" aria-pressed="false">' + esc(o[1]) + "</button>"; }).join("");
      setCategory("music");
      $("genres").addEventListener("click", function (e) {
        var b = e.target.closest("[data-g]");
        if (b) go(b.dataset.g, { tile: b, isGenre: true, fill: b.dataset.g.toLowerCase() });
      });
      $("others").addEventListener("click", function (e) {
        var b = e.target.closest("[data-cat]");
        if (b) go("", { tile: b, cat: b.dataset.cat, fill: "" });
      });
      $("cat-seg").addEventListener("click", function (e) {
        var b = e.target.closest("[data-cat]");
        if (!b) return;
        setCategory(b.dataset.cat);
        pressTile(null);
        run($("q").value.trim() || (category === "music" ? "top hits" : ""), 1);
      });
      /* search on submit, on the keyboard's Search/Go key, and as you type (500 ms pause, 2+ characters) */
      var typeT = 0, typed = "";
      function doSearch() {
        clearTimeout(typeT);
        var v = $("q").value.trim();
        typed = v;
        pressTile(null);
        run(v, 1);
      }
      $("search-form").addEventListener("submit", function (e) { e.preventDefault(); doSearch(); });
      $("q").addEventListener("keydown", function (e) {
        if (e.key !== "Enter" && e.keyCode !== 13) return;
        e.preventDefault();
        doSearch();
        try { this.blur(); } catch (err) {}
      });
      $("q").addEventListener("input", function () {
        clearTimeout(typeT);
        var v = this.value.trim();
        if (v.length < 2) return;
        typeT = setTimeout(function () { if ($("q").value.trim() === v && v !== typed) doSearch(); }, 500);
      });
      $("search-retry").addEventListener("click", function () { ITunes.reset(); Deezer.reset(); run(lastQuery, 1, lastGenre, lastOpts); });
      $("more-btn").addEventListener("click", function () { run(lastQuery, page + 1, lastGenre); });
      $("search-grid").addEventListener("click", onCard);
      $("tracks").addEventListener("click", function (e) {
        var ab = e.target.closest("[data-album]");
        if (ab) { albumPlay(ab.dataset.album); return; }
        var btn = e.target.closest("[data-act]"), row = btn && btn.closest("[data-i]");
        if (!row) return;
        var list = $("tracks")._list || [], i = +row.dataset.i, t = list[i];
        if (!t) return;
        if (btn.dataset.act === "play") Player.playList(list, i);
        else if (btn.dataset.act === "like") {
          Library.like(t);
          var on = Library.isLiked(t);
          btn.classList.toggle("is-on", on);
          btn.setAttribute("aria-pressed", String(on));
          btn.innerHTML = on ? I.heart : I.heartO;
        } else if (!Library.isSaved(t)) Library.download(t, btn);
      });
    }
    return { run: run, go: go, redraw: redraw, cardHTML: cardHTML, onCard: onCard, init: init, category: function () { return category; } };
  })();

  /* ---- search extras: filter chips, top result, artists, albums, Jamendo, YouTube, free songs, stations ---- */
  var Extras = (function () {
    var tok = 0, artists = [], albums = [], dzA = [], auA = [], sq = "", ytFor = "";
    function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, ""); }
    function score(name, q) {
      var n = norm(name), k = norm(q);
      if (!k) return 0;
      return n === k ? 3 : n.indexOf(k) === 0 ? 2 : n.indexOf(k) >= 0 || k.indexOf(n) >= 0 && n.length > 2 ? 1 : 0;
    }
    function fans(n) { n = +n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M fans" : n >= 1e3 ? Math.round(n / 1e3) + "K fans" : n ? n + " fans" : ""; }
    function artSub(u) { var f = fans(u.fans); return "Artist" + (f ? " · " + f : ""); }
    function chip(f) { return $("x-filt").querySelector('[data-f="' + f + '"]'); }
    function setFilter(f) {
      $("view-search").dataset.xf = f;
      [].forEach.call($("x-filt").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.f === f)); });
    }
    /* Deezer artists come first (photos, fan counts); Audius artists only fill in when Deezer is unreachable */
    function merge(q) {
      artists = uniq(dzA.concat(auA), function (u) { return norm(u.name); });
      $("x-res-artists").hidden = !artists.length;
      $("x-artists").innerHTML = artists.map(function (u, i) { return Coll.chipHTML(u, "data-xa", i); }).join("");
      var box = $("x-topres");
      if (!artists.length) { box.innerHTML = ""; return; }
      var best = artists.slice().sort(function (a, b) {
        return ((b.dz ? 1 : 0) - (a.dz ? 1 : 0)) || (score(b.name, q) - score(a.name, q)) || ((b.fans || +b.follower_count || 0) - (a.fans || +a.follower_count || 0));
      })[0];
      var i = artists.indexOf(best);
      box.innerHTML = '<p class="x-group">Top result</p><div class="x-tr">' + Coll.face(best) +
        '<button class="x-meta" type="button" data-xa="' + i + '"><b>' + esc(best.name) + "</b><span>" + esc(artSub(best)) + "</span></button>" +
        '<button class="x-top__play" type="button" data-xplay="' + i + '" aria-label="Play ' + esc(best.name) + '">' + I.play + "</button></div>";
    }
    function search(q) {
      var my = ++tok;
      q = trim(q);
      sq = q; ytFor = ""; artists = []; albums = []; dzA = []; auA = [];
      $("x-topres").innerHTML = ""; $("x-artists").innerHTML = ""; $("x-albums").innerHTML = "";
      $("x-res-artists").hidden = $("x-res-albums").hidden = true;
      setFilter("all");
      $("x-res").hidden = !q;
      chip("youtube").hidden = !Settings.ytOn(); chip("jamendo").hidden = !Settings.jmOn();
      ["x-res-yt", "x-res-jm", "x-res-ov", "x-res-radio"].forEach(function (id) { $(id).hidden = true; $(id).innerHTML = ""; });
      if (!q) return;
      function mine() { return my === tok; }
      /* artists and albums */
      function audiusArtists() { return Audius.users(q).then(function (l) { if (mine()) { auA = l; merge(q); } }); }
      if (!Settings.on("deezer")) { if (Settings.on("audius")) audiusArtists().catch(function () {}); }
      else {
        Deezer.artists(q).then(function (l) { if (mine()) { dzA = l; merge(q); } }, audiusArtists).catch(function () {});
        Deezer.albums(q).then(function (l) {
          if (!mine()) return;
          albums = l;
          $("x-res-albums").hidden = !albums.length;
          $("x-albums").innerHTML = albums.map(function (a, i) { return Coll.cardHTML(a, "data-xb", i, a.artist); }).join("");
        }).catch(function () {});
      }
      /* Free & Indie (Jamendo) under the songs */
      if (Settings.jmOn()) Jamendo.search(q).then(function (l) {
        if (mine()) fillBox($("x-res-jm"), "Free &amp; Indie · Jamendo", l, "No free songs found for “" + q + "”.");
      }, function (e) { if (mine()) fillBox($("x-res-jm"), "Free &amp; Indie · Jamendo", [], "Jamendo: " + e.message); });
      /* Free Full Songs (Internet Archive, smart search) */
      if (Settings.on("free")) {
        var ob = $("x-res-ov"), H = '<p class="x-group">Free Full Songs</p>';
        ob.hidden = false;
        ob.innerHTML = H + '<p class="x-sub">Finding free full songs…</p>';
        FreeSongs.search(q).then(function (l) {
          if (!mine()) return;
          if (!l.length) { ob.hidden = true; ob.innerHTML = ""; return; }
          ob.innerHTML = H + '<div class="x-rows"></div>';
          fillRows(ob.lastChild, l);
        }, function () { if (mine()) { ob.hidden = true; ob.innerHTML = ""; } });
      }
      /* a few radio stations by that name */
      if (Settings.on("radio")) Radio.list(Radio.namePath(q, 6)).then(function (l) {
        if (!mine() || !l.length) return;
        var rbx = $("x-res-radio");
        rbx.hidden = false;
        rbx.innerHTML = '<p class="x-group">Radio stations</p><div class="x-rows"></div>';
        RadioUI.fill(rbx.lastChild, l, "", 0);
      }, function () {});
    }
    /* YouTube results only behind their chip (each search costs quota) */
    function loadYT() {
      if (!sq || ytFor === sq || !Settings.ytOn()) return;
      var my = tok, box = $("x-res-yt");
      ytFor = sq;
      box.hidden = false; box.classList.remove("is-empty");
      box.innerHTML = '<p class="x-group">YouTube</p><p class="x-sub">Searching YouTube…</p>';
      YouTube.search(sq).then(function (l) {
        if (my === tok) fillBox(box, "YouTube · full songs", l, "Nothing on YouTube for “" + sq + "”.");
      }, function (e) {
        ytFor = "";
        if (my === tok) fillBox(box, "YouTube", [], e.quota ? "YouTube's daily limit is used up. Try again tomorrow." : "YouTube: " + e.message);
      });
    }
    /* sources changed: chips follow the keys; a hidden chip's filter falls back to All */
    function refresh() {
      chip("youtube").hidden = !Settings.ytOn(); chip("jamendo").hidden = !Settings.jmOn();
      var xf = $("view-search").dataset.xf;
      if ((xf === "youtube" && !Settings.ytOn()) || (xf === "jamendo" && !Settings.jmOn())) setFilter("all");
    }
    function init() {
      $("x-filt").addEventListener("click", function (e) {
        var b = e.target.closest("[data-f]");
        if (!b) return;
        setFilter(b.dataset.f);
        if (b.dataset.f === "youtube") loadYT();
      });
      $("x-res").addEventListener("click", function (e) {
        var p = e.target.closest("[data-xplay]");
        if (p) {
          var u = artists[+p.dataset.xplay];
          if (!u) return;
          toast("Loading " + u.name + "…");
          Coll.songsOf(u).then(function (l) { Player.play(fullOnly(l), "play"); }, function () { toast("Could not load songs."); });
          return;
        }
        var a = e.target.closest("[data-xa]");
        if (a && artists[+a.dataset.xa]) { Coll.openArtist(artists[+a.dataset.xa]); return; }
        var b = e.target.closest("[data-xb]");
        if (b && albums[+b.dataset.xb]) Coll.openAlbum(albums[+b.dataset.xb]);
      });
    }
    return { search: search, refresh: refresh, artSub: artSub, init: init };
  })();

  /* ============ 12 coll: album / artist / playlist sheet, shelves, charts ============ */
  var Coll = (function () {
    var sheet = null, body = null, rows = null, cur = [], sArtists = [], sAlbums = [];
    function photo(u) { if (u.dz) return u.thumb || u.art || ""; return (u.profile_picture && (u.profile_picture["480x480"] || u.profile_picture["150x150"])) || ""; }
    function face(u) {
      var p = photo(u);
      return p ? '<img loading="lazy" src="' + esc(p) + '" alt="" />' : '<i aria-hidden="true">' + esc(initials(u.name || "?")) + "</i>";
    }
    function cardHTML(a, attr, i, sub) {
      return '<button class="x-card" type="button" ' + attr + '="' + i + '"><img loading="lazy" src="' + esc(a.thumb || a.art || ART) + '" alt="" />' +
        "<b>" + esc(a.title) + "</b><span>" + esc(sub || "") + "</span></button>";
    }
    function chipHTML(u, attr, i) {
      return '<button class="x-artist-chip" type="button" ' + attr + '="' + i + '" aria-label="Open ' + esc(u.name) + '">' + face(u) + "<span>" + esc(u.name) + "</span></button>";
    }
    function openSheet() {
      sheet.classList.add("is-on");
      doc.documentElement.classList.add("x-lock");
      try { $("x-coll-close").focus(); } catch (e) {}
    }
    function close() {
      sheet.classList.remove("is-on");
      if (!Player.isNowOpen()) doc.documentElement.classList.remove("x-lock");
    }
    function isOpen() { return !!sheet && sheet.classList.contains("is-on"); }
    /* the sheet: artwork, title, Play / Shuffle, then the songs loader() finds (full songs only) */
    function fill(art, title, sub, round, loader, more) {
      cur = []; sArtists = []; sAlbums = [];
      sheet.setAttribute("aria-label", title);
      body.innerHTML = '<div class="x-album"><img class="x-album__art' + (round ? " is-round" : "") + '" src="' + esc(art || ART) + '" alt="" />' +
        '<h2 class="x-album__title">' + esc(title) + '</h2><p class="x-album__artist">' + esc(sub) + "</p>" +
        '<div class="x-album__btns"><button type="button" data-xc="play">' + I.play + 'Play</button><button type="button" data-xc="shuffle">' + I.shuffle + "Shuffle</button></div></div>" +
        '<p class="x-sub" id="x-coll-note">Loading songs…</p><div class="x-rows" id="x-coll-rows"></div><div id="x-coll-alb"></div><div id="x-coll-rel"></div>';
      rows = $("x-coll-rows");
      var mine = rows;
      try { body.scrollTop = 0; body.parentNode.scrollTop = 0; } catch (e) {}
      openSheet();
      if (more) more(mine);
      loader().then(function (list) {
        if (rows !== mine || !mine.isConnected) return;
        cur = fullOnly(list);
        $("x-coll-note").textContent = cur.length ? plural(cur.length, "full song") : "No full songs found." + (Settings.ytOn() ? "" : " Add a free YouTube key in Settings → Music Sources to play almost any song in full.");
        fillRows(mine, cur);
      }).catch(function () {
        var n = $("x-coll-note");
        if (n && rows === mine) n.textContent = "Could not load songs. Check your connection and try again.";
      });
    }
    function relBox(id, head, list, html) {
      var box = $(id);
      if (box) box.innerHTML = list.length ? '<p class="x-group">' + head + '</p><div class="x-shelf__row">' + list.map(html).join("") + "</div>" : "";
    }
    function dzTop(u) { return Search.listSongs(Deezer.get("artist/" + u.dz + "/top?limit=50").then(Deezer.tracks), [u.name]); }
    function songsOf(u) { return u.dz ? dzTop(u) : Audius.userTracks(u.id); }
    function albumTracks(a) {
      return Search.listSongs(Deezer.get("album/" + a.dz).then(function (j) {
        return Deezer.tracks((j && j.tracks) || null, { title: j && j.title, cover_big: j && j.cover_big, cover_xl: j && j.cover_xl });
      }), a.artist ? [a.artist] : []);
    }
    /* artist sheet: popular songs, then albums and "Fans also like" */
    function openArtist(u) {
      if (!u.dz) { fill(photo(u), u.name, "Artist · full songs from Audius", true, function () { return Audius.userTracks(u.id); }); return; }
      fill(u.art, u.name, Extras.artSub(u), true, function () { return dzTop(u); }, function (mine) {
        Deezer.get("artist/" + u.dz + "/albums?limit=30").then(function (j) {
          if (rows !== mine) return;
          sAlbums = Deezer.list(j, function (a) { return Deezer.album(a, u.name); });
          relBox("x-coll-alb", "Albums", sAlbums, function (a, i) { return cardHTML(a, "data-xsb", i, a.year); });
        }).catch(function () {});
        Deezer.get("artist/" + u.dz + "/related?limit=10").then(function (j) {
          if (rows !== mine) return;
          sArtists = Deezer.list(j, Deezer.artist);
          relBox("x-coll-rel", "Fans also like", sArtists, function (a, i) { return chipHTML(a, "data-xsa", i); });
        }).catch(function () {});
      });
    }
    function openAlbum(a) { fill(a.art, a.title, [a.artist, a.year].filter(Boolean).join(" · "), false, function () { return albumTracks(a); }); }
    function openPlaylist(p) {
      fill(p.art, p.title, "Playlist" + (p.n ? " · " + p.n + " songs" : ""), false, function () {
        return Search.listSongs(Deezer.get("playlist/" + p.dz + "/tracks?limit=100").then(Deezer.tracks), []);
      });
    }
    function openGenre(g) {
      fill(g.art, g.name, "Genre · top songs", false, function () {
        return Search.listSongs(Deezer.get2("chart/" + g.id + "/tracks?limit=50").then(Deezer.tracks), []);
      }, function (mine) {
        Deezer.get2("genre/" + g.id + "/artists").then(function (j) {
          if (rows !== mine) return;
          sArtists = Deezer.list(j, Deezer.artist).slice(0, 30);
          relBox("x-coll-rel", "Top artists", sArtists, function (a, i) { return chipHTML(a, "data-xsa", i); });
        }).catch(function () {});
      });
    }
    function openList(art, title, sub, loader) { fill(art, title, sub, false, loader); }
    function artistByName(name) {
      return Deezer.artists(name).then(function (list) {
        var u = Deezer.bestArtist(list, name);
        if (!u) throw new Error("none");
        openArtist(u);
        return u;
      });
    }

    /* Ghana Charts & Playlists (Listen Now and Browse) */
    var charts = [], chartsP = null;
    function loadCharts() {
      if (!chartsP) {
        chartsP = Deezer.get("search/playlist?q=ghana&limit=20").then(function (j) { return (charts = Deezer.list(j, Deezer.playlist)); });
        chartsP.catch(function () { chartsP = null; });
      }
      return chartsP;
    }
    function ghanaCharts() { return loadCharts().then(function (l) { if (!l.length) throw new Error("none"); return l[0]; }); }

    /* world: chart, top albums, artists, playlists (Listen Now) and genres (Browse) */
    var gl = { chart: [], full: null, albums: [], artists: [], playlists: [], genres: [] };
    function boxes(sel) { return [].slice.call(doc.querySelectorAll(sel)); }
    function failHTML(e) { return '<p class="x-sub">Could not load (' + esc(Net.why(e)) + "). Check your connection.</p>"; }
    function shelf(sel, path, map, html, empty) {
      var bs = boxes(sel);
      if (!bs.length) return;
      Deezer.get2(path).then(function (j) {
        var list = map(j);
        bs.forEach(function (b) { b.innerHTML = list.length ? html(list) : '<p class="x-sub">' + empty + "</p>"; });
      }).catch(function (e) { bs.forEach(function (b) { b.innerHTML = failHTML(e); }); });
    }
    /* world chart: Deezer's order, only songs with a full stream (Audius match, or YouTube with a key) */
    function drawChart() {
      if (!gl.full) return;
      var top = fullOnly(gl.full).slice(0, 10);
      boxes("[data-gl-chart]").forEach(function (b) {
        if (top.length) fillRows(b, top);
        else b.innerHTML = '<p class="x-sub">No full songs in the chart right now.' + (Settings.ytOn() ? "" : " Add a free YouTube key in Settings → Music Sources to play almost any song in full.") + "</p>";
      });
    }
    function chartTracks() { return gl.chart.length ? Promise.resolve(gl.chart.slice()) : Deezer.get2("chart/0/tracks?limit=50").then(function (j) { return (gl.chart = Deezer.tracks(j)); }); }
    function openChart() {
      fill("", "Top Charts — World", "Top 50 · Deezer", false, function () { return Search.listSongs(chartTracks(), []); });
    }
    function loadGlobal() {
      if (boxes("[data-gl-chart]").length) Search.listSongs(chartTracks(), [], true).then(function (l) { gl.full = l; drawChart(); }).catch(function (e) {
        boxes("[data-gl-chart]").forEach(function (b) { b.innerHTML = failHTML(e); });
      });
      shelf("[data-gl-albums]", "chart/0/albums?limit=20", function (j) { return (gl.albums = Deezer.list(j, function (a) { return Deezer.album(a); })); }, function (l) {
        return l.map(function (a, i) { return cardHTML(a, "data-gla", i, a.artist); }).join("");
      }, "No albums right now.");
      shelf("[data-gl-artists]", "chart/0/artists?limit=20", function (j) { return (gl.artists = Deezer.list(j, Deezer.artist)); }, function (l) {
        return l.map(function (u, i) { return chipHTML(u, "data-glr", i); }).join("");
      }, "No artists right now.");
      shelf("[data-gl-playlists]", "chart/0/playlists?limit=20", function (j) { return (gl.playlists = Deezer.list(j, Deezer.playlist)); }, function (l) {
        return l.map(function (p, i) { return cardHTML(p, "data-glp", i, p.n ? p.n + " songs" : "Playlist"); }).join("");
      }, "No playlists right now.");
      shelf("[data-gl-genres]", "genre", function (j) {
        return (gl.genres = Deezer.list(j, function (g) { return { id: g.id, name: g.name, art: g.picture_xl || g.picture_big || "", thumb: g.picture_medium || g.picture_big || "" }; }).filter(function (g) { return g.id !== 0 && g.name; }));
      }, function (l) {
        return l.map(function (g, i) { return '<button class="x-tile" type="button" data-glg="' + i + '">' + (g.thumb ? '<img loading="lazy" src="' + esc(g.thumb) + '" alt="" />' : "") + "<span>" + esc(g.name) + "</span></button>"; }).join("");
      }, "No genres right now.");
    }

    /* Ghana & Africa: genre tiles and top artists */
    var GH_TILES = [
      { n: "Afrobeats GH", a: ["ghana afrobeats", "afrobeats ghana"], i: ["afrobeats ghana"] },
      { n: "Highlife", a: ["ghana highlife", "highlife"], i: ["ghana highlife"] },
      { n: "Hiplife", a: ["hiplife", "ghana hiplife"], i: ["hiplife"] },
      { n: "GH Drill / Asakaa", a: ["asakaa drill", "ghana drill"], i: ["asakaa", "ghana drill"] },
      { n: "Gospel (Ghana)", a: ["ghana gospel", "twi gospel"], i: ["ghana gospel"] },
      { n: "Amapiano GH", a: ["ghana amapiano", "amapiano ghana"], i: ["amapiano ghana"] },
      { n: "Azonto", a: ["azonto"], i: ["azonto"] },
      { n: "Classic Highlife", a: ["classic highlife", "old highlife"], i: ["classic highlife", "highlife legends"] }
    ];
    var GH_TOP = ["Sarkodie", "Black Sherif", "Stonebwoy", "Shatta Wale", "King Promise", "KiDi", "Kuami Eugene", "Gyakie", "Medikal", "Kwesi Arthur", "Camidoh", "Amaarae", "R2Bees", "Daddy Lumba", "Kojo Antwi", "Joe Mettle", "Diana Hamilton", "Piesie Esther", "Lasmid", "Olivetheboy"];
    function ghanaSearch(label, q, spec) { SearchUI.go(q, { isGenre: true, spec: spec, noArchive: true, label: label }); }

    /* Listen Now shelves from the Internet Archive */
    function initShelves() {
      each(".x-shelf", function (sh) {
        var q = sh.dataset.q, cat = sh.dataset.cat, row = sh.querySelector(".x-shelf__row"), note = sh.querySelector(".x-sub");
        row.addEventListener("click", SearchUI.onCard);
        sh.querySelector("[data-see]").addEventListener("click", function () {
          var tile = doc.querySelector(cat === "music" ? '#genres [data-g="' + q + '"]' : '#others [data-cat="' + cat + '"]');
          SearchUI.go(q, { cat: cat, tile: tile, fill: q.toLowerCase(), isGenre: cat === "music" });
        });
        Archive.search(q, 1, cat, cat === "music").then(function (r) {
          var docs = r.docs.slice(0, 12);
          if (!docs.length) { note.textContent = "Nothing here right now."; return; }
          row.innerHTML = docs.map(function (d) { return SearchUI.cardHTML(d, cat); }).join("");
          note.hidden = true;
        }).catch(function () { note.textContent = "Could not reach the library. Check your connection."; });
      });
    }

    function init() {
      sheet = $("x-coll"); body = $("x-coll-body");
      each("[data-gh-tiles]", function (box) {
        box.innerHTML = GH_TILES.map(function (g, i) { return '<button class="x-tile" type="button" data-gh="' + i + '">' + esc(g.n) + "</button>"; }).join("");
      });
      each("[data-gh-artists]", function (box) {
        box.innerHTML = GH_TOP.map(function (n) {
          return '<button class="x-artist-chip" type="button" data-artist="' + esc(n) + '" aria-label="Open ' + esc(n) + '"><i aria-hidden="true">' + esc(initials(n)) + "</i><span>" + esc(n) + "</span></button>";
        }).join("");
      });
      $("jm-tiles").innerHTML = Jamendo.TAGS.map(function (g) { return '<button class="x-tile" type="button" data-jm="' + g[0] + '">' + esc(g[1]) + "</button>"; }).join("");
      body.addEventListener("click", function (e) {
        var b = e.target.closest("[data-xc]");
        if (b) { if (cur.length) Player.play(cur, b.dataset.xc); else toast("Songs are still loading."); return; }
        var a = e.target.closest("[data-xsa]");
        if (a && sArtists[+a.dataset.xsa]) { openArtist(sArtists[+a.dataset.xsa]); return; }
        var l = e.target.closest("[data-xsb]");
        if (l && sAlbums[+l.dataset.xsb]) openAlbum(sAlbums[+l.dataset.xsb]);
      });
      $("x-coll-close").addEventListener("click", close);
      sheet.addEventListener("click", function (e) { if (e.target === sheet) close(); });
      /* every shelf tile, chip and card on the page */
      doc.addEventListener("click", function (e) {
        var b;
        if ((b = e.target.closest("[data-gh]"))) { var g = GH_TILES[+b.dataset.gh]; if (g) ghanaSearch(g.n, g.a[0], { audius: g.a, itunes: g.i, beats: false }); return; }
        if ((b = e.target.closest("[data-artist]"))) {
          var nm = b.dataset.artist;
          artistByName(nm).catch(function () { ghanaSearch(nm, nm, Search.artistSpec(nm)); });
          return;
        }
        if (e.target.closest("[data-gh-see]")) { UI.show("browse"); try { $("g-ghana").scrollIntoView({ block: "start" }); } catch (err) {} return; }
        if ((b = e.target.closest("[data-dzp]")) && charts[+b.dataset.dzp]) { openPlaylist(charts[+b.dataset.dzp]); return; }
        if (e.target.closest("[data-gl-see]")) { openChart(); return; }
        if ((b = e.target.closest("[data-gla]")) && gl.albums[+b.dataset.gla]) { openAlbum(gl.albums[+b.dataset.gla]); return; }
        if ((b = e.target.closest("[data-glr]")) && gl.artists[+b.dataset.glr]) { openArtist(gl.artists[+b.dataset.glr]); return; }
        if ((b = e.target.closest("[data-glp]")) && gl.playlists[+b.dataset.glp]) { openPlaylist(gl.playlists[+b.dataset.glp]); return; }
        if ((b = e.target.closest("[data-glg]")) && gl.genres[+b.dataset.glg]) { openGenre(gl.genres[+b.dataset.glg]); return; }
        if ((b = e.target.closest("[data-jm]"))) openList("", b.textContent, "Free full songs · Jamendo", function () { return Jamendo.tag(b.dataset.jm); });
      });
      var chartBoxes = boxes("[data-gh-charts]");
      loadCharts().then(function (list) {
        chartBoxes.forEach(function (box) {
          box.innerHTML = list.length ? list.map(function (p, i) { return cardHTML(p, "data-dzp", i, p.n ? p.n + " songs" : "Playlist"); }).join("") : '<p class="x-sub">No Ghana playlists right now.</p>';
        });
      }, function () {
        chartBoxes.forEach(function (box) { box.innerHTML = '<p class="x-sub">Could not load Ghana charts. Check your connection.</p>'; });
      });
      loadGlobal();
      initShelves();
    }
    return {
      face: face, cardHTML: cardHTML, chipHTML: chipHTML, songsOf: songsOf, openArtist: openArtist, openAlbum: openAlbum,
      openPlaylist: openPlaylist, openList: openList, artistByName: artistByName, ghanaCharts: ghanaCharts, drawChart: drawChart,
      chartTracks: chartTracks, close: close, isOpen: isOpen, init: init
    };
  })();

  /* ============ 13 radio: Live Radio (a sub-view of Browse) ============ */
  var RadioUI = (function () {
    var boxes = [], loaded = false, curTag = Radio.TAGS[0][0], rtok = 0, rto = 0;
    function fill(box, list, empty, limit, more) {
      if (boxes.indexOf(box) < 0) boxes.push(box);
      box._all = list; box._empty = empty; box._limit = limit; box._more = more;
      var cut = !!limit && list.length > limit && !box._open;
      if (list.length) fillRows(box, cut ? list.slice(0, limit) : list, "station");
      else box.innerHTML = '<p class="x-sub">' + esc(empty || "No stations found.") + "</p>";
      if (more) { more.hidden = !cut; more.textContent = "Show all " + list.length; }
    }
    function msg(box, text, more) { box._all = null; box.innerHTML = '<p class="x-sub">' + esc(text) + "</p>"; if (more) more.hidden = true; }
    function fillFavs() {
      var favs = Radio.favs();
      $("radio-favs-box").hidden = !favs.length;
      if (favs.length) fill($("radio-favs"), favs, "", 0);
    }
    function redraw() {
      boxes.forEach(function (b) { if (b._all && b.isConnected !== false) fill(b, b._all, b._empty, b._limit, b._more); });
      fillFavs();
    }
    function fav(t) {
      toast(Radio.toggleFav(t) ? "Added to favourite stations" : "Removed from favourite stations");
      redraw();
    }
    var OFF = "Radio is switched off. Turn it on in Settings → Music Sources.";
    function load(box, path, empty, limit, more) {
      if (!Settings.on("radio")) { msg(box, OFF, more); return; }
      msg(box, "Loading…", more);
      Radio.list(path).then(function (list) { fill(box, list, empty, limit, more); }, function (e) {
        msg(box, "Can't reach the radio directory right now (" + ((e && e.message) || "error") + ").", more);
      });
    }
    function loadTag(tag) {
      curTag = tag;
      [].forEach.call($("radio-tags").children, function (b) { b.setAttribute("aria-pressed", String(b.dataset.tag === tag)); });
      load($("radio-tag-rows"), Radio.tagPath(tag), "No " + tag + " stations right now.", 8, null);
    }
    /* the Live Radio view: favourites, Ghana Live, genre chips, top stations, station search */
    function open() {
      fillFavs();
      if (loaded) return;
      loaded = true;
      load($("radio-gh"), Radio.GH, "No Ghana stations right now.", 10, $("radio-gh-more"));
      loadTag(curTag);
      load($("radio-top"), Radio.TOP, "No stations right now.", 10, $("radio-top-more"));
    }
    /* Browse: the Live Radio section shows four Ghana stations */
    var previewed = false;
    function preview() {
      if (previewed) return;
      previewed = true;
      load($("radio-preview"), Radio.GH, "No Ghana stations right now.", 4, null);
    }
    function stationSearch(q) {
      q = trim(q);
      var my = ++rtok, box = $("radio-res");
      $("radio-results").hidden = !q;
      if (!q) return;
      $("radio-res-head").textContent = "Stations for “" + q + "”";
      if (!Settings.on("radio")) { msg(box, OFF); return; }
      msg(box, "Searching stations…");
      Radio.list(Radio.namePath(q, 30)).then(function (list) { if (my === rtok) fill(box, list, "No stations called “" + q + "”.", 0); }, function (e) {
        if (my === rtok) msg(box, "Can't reach the radio directory right now (" + ((e && e.message) || "error") + ").");
      });
    }
    /* the Radio switch in Music Sources: reload everything */
    function onSwitch() {
      loaded = false; previewed = false; Radio.reset();
      if (!Settings.on("radio")) { $("x-res-radio").hidden = true; $("radio-results").hidden = true; }
      if ($("view-radio").classList.contains("is-on")) open();
      if ($("view-browse").classList.contains("is-on")) preview();
    }
    function init() {
      $("radio-tags").innerHTML = Radio.TAGS.map(function (g) { return '<button type="button" data-tag="' + esc(g[0]) + '" aria-pressed="' + (g[0] === curTag) + '">' + esc(g[1]) + "</button>"; }).join("");
      $("radio-tags").addEventListener("click", function (e) { var b = e.target.closest("[data-tag]"); if (b) loadTag(b.dataset.tag); });
      [["radio-gh-more", "radio-gh"], ["radio-top-more", "radio-top"]].forEach(function (p) {
        $(p[0]).addEventListener("click", function () { var b = $(p[1]); b._open = true; if (b._all) fill(b, b._all, b._empty, b._limit, b._more); });
      });
      $("radio-form").addEventListener("submit", function (e) {
        e.preventDefault(); clearTimeout(rto); stationSearch($("radio-q").value);
        try { $("radio-q").blur(); } catch (er) {}
      });
      $("radio-q").addEventListener("input", function () {
        clearTimeout(rto);
        var v = this.value;
        rto = setTimeout(function () { if (trim(v).length >= 2 || !trim(v)) stationSearch(v); }, 600);
      });
      doc.addEventListener("click", function (e) { if (e.target.closest("[data-radio-open]")) UI.show("radio"); });
      $("radio-back").addEventListener("click", function () { UI.show("browse"); });
    }
    return { fill: fill, fav: fav, redraw: redraw, open: open, preview: preview, onSwitch: onSwitch, init: init };
  })();

  /* ============ 14 lyrics ============ */
  /* memory → IndexedDB → the downloaded record → LRCLIB → Lyrics.ovh. Synced lines highlight and scroll; the
     current line also shows in gold in the mini player. Per-song timing offsets and your own lyrics are saved. */
  var Lyrics = (function () {
    var audio = Media, mem = {}, offMem = {}, alt = {};
    var lyr = { open: false, id: null, lines: null, active: -1, token: 0, holdUntil: 0, auto: false, offset: 0, shown: null };
    var body, credit, syncBar, offOut;
    var LRCLIB = "https://lrclib.net/api/", OVH = "https://api.lyrics.ovh/v1/", LYR_V = 2, DUR_TOL = 3;
    var SOURCES = ["you", "lrclib", "ovh"];
    var SRC_NAME = { you: "Your lyrics", lrclib: 'Lyrics from <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a>', ovh: 'Lyrics from <a href="https://lyrics.ovh" target="_blank" rel="noopener">Lyrics.ovh</a>' };

    /* the remembered lyrics-view choice (on by default) */
    var pref = true, PREF_ID = "__pref_lyrview";
    Store.one("lyrsync", PREF_ID).then(function (r) { if (r && typeof r.on === "boolean") pref = r.on; });
    function prefSave(on) { pref = !!on; Store.put("lyrsync", { id: PREF_ID, on: pref }).catch(function () {}); }

    /* LRCLIB: a 429/503 pauses all calls for five minutes; recent replies are kept, so a reload never repeats a lookup */
    var lrcBlock = +Store.get("lrc-block", 0) || 0, lrcSeen = Store.get("lrc-cache", {}) || {};
    function lrcKeep(url, j) {
      lrcSeen[url] = [Date.now(), j];
      var ks = Object.keys(lrcSeen);
      if (ks.length > 30) ks.sort(function (a, b) { return lrcSeen[a][0] - lrcSeen[b][0]; }).slice(0, ks.length - 30).forEach(function (k) { delete lrcSeen[k]; });
      Store.set("lrc-cache", lrcSeen);
    }
    function lrc(url) {
      if (lrcSeen[url] && Date.now() - lrcSeen[url][0] < 7 * 864e5) return Promise.resolve(lrcSeen[url][1]);
      if (Date.now() < lrcBlock) return Promise.reject(new Error("rate limited"));
      return Net.timed(url, 15000, function (r) {
        if (r.status === 429 || r.status === 503) {
          lrcBlock = Date.now() + 5 * 60000;
          Store.set("lrc-block", lrcBlock);
          throw new Error("rate limited");
        }
        if (r.status === 404) { lrcKeep(url, null); return null; }
        if (!r.ok) return null;
        return r.json().catch(function () { return null; }).then(function (j) { if (j) lrcKeep(url, j); return j; });
      });
    }
    function hasLyrics(j) { return !!(j && (j.syncedLyrics || j.plainLyrics)); }
    function okDur(d) { return !!(d && isFinite(d) && d > 0); }
    function durGap(j, dur) { var d = j && +j.duration; return okDur(d) && okDur(dur) ? Math.abs(d - dur) : Infinity; }
    /* synced timing is only kept for a result within DUR_TOL seconds */
    function lrclibRec(j, dur, matched) {
      if (!j) return null;
      var rec = { source: "lrclib", v: LYR_V, qdur: okDur(dur) ? Math.round(dur) : 0, dur: +j.duration || 0 };
      if (matched && j.syncedLyrics) { rec.synced = j.syncedLyrics; rec.plain = j.plainLyrics || ""; }
      else {
        rec.synced = "";
        rec.plain = j.plainLyrics || toPlain(j.syncedLyrics);
        if (!matched) rec.mismatch = true;
      }
      return rec.synced || rec.plain ? rec : null;
    }
    /* rejects only when LRCLIB cannot be reached */
    function lrclib(artist, title, dur) {
      var enc = encodeURIComponent;
      var first = artist && title && okDur(dur)
        ? lrc(LRCLIB + "get?artist_name=" + enc(artist) + "&track_name=" + enc(title) + "&duration=" + Math.round(dur)).catch(function () { return null; })
        : Promise.resolve(null);
      return first.then(function (j) {
        if (hasLyrics(j) && durGap(j, dur) <= DUR_TOL) return lrclibRec(j, dur, true);
        var q = (artist + " " + title).trim();
        if (!q) return null;
        return lrc(LRCLIB + "search?q=" + enc(q)).then(function (list) {
          if (!Array.isArray(list)) return null;
          var hits = list.filter(hasLyrics);
          if (!hits.length) return null;
          var bestSync = null, bestSyncGap = Infinity, bestAny = null, bestAnyGap = Infinity;
          hits.forEach(function (r) {
            var g = durGap(r, dur);
            if (r.syncedLyrics && g <= DUR_TOL && g < bestSyncGap) { bestSync = r; bestSyncGap = g; }
            if (g < bestAnyGap) { bestAny = r; bestAnyGap = g; }
          });
          if (bestSync) return lrclibRec(bestSync, dur, true);
          var p = bestAny || hits[0];
          return lrclibRec(p, dur, durGap(p, dur) <= DUR_TOL);
        });
      });
    }
    /* Lyrics.ovh: plain text; rejects only when it cannot be reached */
    function ovh(artist, title) {
      if (!artist || !title) return Promise.resolve(null);
      return Net.timed(OVH + encodeURIComponent(artist) + "/" + encodeURIComponent(title), 8000, function (r) {
        return r.ok ? r.json().catch(function () { return null; }) : null;
      }).then(function (j) {
        var s = j && typeof j.lyrics === "string" ? j.lyrics.replace(/\r\n?/g, "\n") : "";
        s = s.replace(/^Paroles de la chanson[^\n]*\n/i, "").replace(/\n{3,}/g, "\n\n").trim();
        return s ? { synced: "", plain: s, source: "ovh" } : null;
      });
    }
    function srcOf(L) {
      if (!L) return "";
      if (L.custom || L.source === "you") return "you";
      return L.source === "ovh" ? "ovh" : "lrclib";
    }
    /* the online sources in order from `from`; rejects only when none could be reached */
    function lookupFrom(artist, title, dur, from) {
      var k = Math.max(1, SOURCES.indexOf(from)), reached = false;
      function step(i) {
        if (i >= SOURCES.length) return reached ? null : Promise.reject(new Error("offline"));
        var p;
        try { p = SOURCES[i] === "lrclib" ? lrclib(artist, title, dur) : ovh(artist, title); } catch (e) { p = Promise.reject(e); }
        return p.then(function (L) { reached = true; return L || step(i + 1); }, function () { return step(i + 1); });
      }
      return step(k);
    }
    var EXT = /\.(mp3|m4a|aac|ogg|oga|opus|flac|wav|wma|webm|mp4)$/i;
    var TRACKNUM = /^\s*(?:track\s*)?\d{1,3}\s*[-–—.)_:]+\s*/i;
    function cleanName(s) {
      s = String(s || "").replace(EXT, "").replace(/_/g, " ").replace(/\([^)]*\)|\[[^\]]*\]|\{[^}]*\}/g, " ");
      s = s.replace(TRACKNUM, "").replace(/^0\d\s+/, "");
      return s.replace(/\s+/g, " ").replace(/^[-–—\s]+|[-–—\s]+$/g, "").trim();
    }
    function namesFor(t) {
      var title = String(t.title || "").replace(EXT, "").replace(/_/g, " "), artist = String(t.artist || "");
      if (/^local:/.test(t.id || "") || artist === "On this phone" || /^unknown/i.test(artist)) artist = "";
      title = title.replace(TRACKNUM, "").replace(/^0\d\s+/, "");
      if (!artist) {
        var parts = title.split(/\s+[-–—]\s+/);
        if (parts.length > 1) { artist = parts.shift(); title = parts.join(" - "); }
      }
      return { artist: cleanName(artist), title: cleanName(title) };
    }
    /* an LRCLIB record saved before version matching, or matched without a known duration, is looked up again */
    function stale(rec, dur) {
      if (!rec || rec.custom || rec.source === "you" || rec.source === "ovh") return false;
      if (rec.v !== LYR_V) return true;
      return !!(rec.mismatch && !rec.qdur && okDur(dur));
    }
    function keep(rec) { mem[rec.id] = rec; Store.put("lyrics", rec).catch(function () {}); }
    function forTrack(t, dur) {
      var m = mem[t.id];
      if (m && !m.none && !stale(m, dur)) return Promise.resolve(m);
      return Store.one("lyrics", t.id).then(function (rec) {
        var old = null;
        if (rec) { if (!stale(rec, dur)) { mem[t.id] = rec; return rec; } old = rec; }
        Library.downloads().forEach(function (d) {
          if (old || d.id !== t.id || !d.lyrics) return;
          var L = Object.assign({}, d.lyrics, { id: t.id });
          if (!stale(L, dur)) old = L; else old = Object.assign(L, { _stale: true });
        });
        if (old && !old._stale && old !== rec) { mem[t.id] = old; return old; }
        /* unverified old timing shows as plain text if nothing better is found */
        function fallback() {
          if (!old) return null;
          var f = Object.assign({}, old, { mismatch: true });
          delete f._stale;
          mem[t.id] = f;
          return f;
        }
        if (!old && mem[t.id] && mem[t.id].none) return null;
        var n = namesFor(t);
        if (!n.title) return fallback();
        return lookupFrom(n.artist, n.title, dur, "lrclib").then(function (L) {
          if (L) { L.id = t.id; keep(L); return L; }
          if (old) return fallback();
          mem[t.id] = { none: true };
          return null;
        }, function (err) { if (old) return fallback(); throw err; });
      });
    }
    /* LRC: [mm:ss], [mm:ss.x], [mm:ss.xx], [mm:ss.xxx], several stamps per line, [offset:+/-ms]; other tags ignored */
    function parseLRC(s) {
      var out = [], offset = 0;
      var rows = String(s || "").replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
      rows.forEach(function (line) { var om = /^\s*\[offset:\s*([+-]?\d+)\s*\]/i.exec(line); if (om) offset = parseInt(om[1], 10) || 0; });
      var stamp = /^\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/;
      rows.forEach(function (line, n) {
        var rest = line.replace(/^\s+/, ""), times = [], m;
        while ((m = stamp.exec(rest))) {
          var frac = m[3] ? parseInt(m[3], 10) / Math.pow(10, m[3].length) : 0;
          times.push(parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + frac);
          rest = rest.slice(m[0].length).replace(/^\s+/, "");
        }
        if (!times.length) return;
        var text = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, "").replace(/\[\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?\]/g, "").replace(/\s+/g, " ").trim();
        times.forEach(function (x) { out.push({ t: Math.max(0, x - offset / 1000), text: text, n: n }); });
      });
      out.sort(function (a, b) { return a.t - b.t || a.n - b.n; });
      return out;
    }
    function toPlain(s) {
      var lines = parseLRC(s);
      if (!lines.length) return String(s || "").replace(/^\s*\[[a-z#]+:[^\]]*\]\s*$/gim, "").trim();
      var seen = [], prevN = -1;
      lines.slice().sort(function (a, b) { return a.n - b.n; }).forEach(function (l) { if (l.n === prevN) return; prevN = l.n; seen.push(l.text); });
      return seen.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    /* resolves once the duration is known for this track (or 0 after a long wait / track change) */
    function waitDuration(id) {
      return new Promise(function (resolve) {
        /* Audius and iTunes report the full length; trust it over the stream's own report */
        var ct = Player.current();
        if (ct && okDur(ct.dur) && (!id || ct.id === id)) return resolve(ct.dur);
        function known() { return okDur(audio.duration) && (!id || (Player.current() && Player.current().id === id)); }
        if (known()) return resolve(audio.duration);
        var done = false, timer = null;
        function off() { audio.removeEventListener("loadedmetadata", chk); audio.removeEventListener("durationchange", chk); audio.removeEventListener("error", give); }
        function chk() { if (done || !known()) return; done = true; off(); clearTimeout(timer); resolve(audio.duration); }
        function give() { if (done) return; done = true; off(); clearTimeout(timer); resolve(known() ? audio.duration : 0); }
        audio.addEventListener("loadedmetadata", chk);
        audio.addEventListener("durationchange", chk);
        audio.addEventListener("error", give);
        timer = setTimeout(give, 20000);
      });
    }
    /* per-track sync offset (seconds; positive shows lyrics earlier) */
    function offGet(id) {
      if (id in offMem) return Promise.resolve(offMem[id]);
      return Store.one("lyrsync", id).then(function (r) { var v = r ? +r.offset || 0 : 0; offMem[id] = v; return v; });
    }
    function offPut(id, v) {
      offMem[id] = v;
      if (Math.abs(v) < 0.001) Store.del("lyrsync", id); else Store.put("lyrsync", { id: id, offset: v }).catch(function () {});
    }

    /* mini player: the current synced line in gold in place of the artist, fading between lines */
    var miniText = null, miniTimer = 0;
    function miniLine(text) {
      if (text === miniText) return;
      var mini = $("mini"), el = $("mini-line"), was = miniText;
      miniText = text;
      if (miniTimer) { clearTimeout(miniTimer); miniTimer = 0; }
      if (text == null) { mini.classList.remove("is-lyric"); el.classList.remove("is-fade"); el.textContent = ""; return; }
      if (was == null || reduceMotion) { el.textContent = text; el.classList.remove("is-fade"); mini.classList.add("is-lyric"); return; }
      el.classList.add("is-fade");
      miniTimer = setTimeout(function () { miniTimer = 0; el.textContent = miniText == null ? "" : miniText; el.classList.remove("is-fade"); }, 180);
    }

    function setCredit(L) {
      lyr.shown = L || null;
      if (!L) { credit.hidden = true; credit.innerHTML = ""; return; }
      credit.innerHTML = SRC_NAME[srcOf(L)] + ' · <button type="button" id="lyr-next">Try another source</button>';
      credit.hidden = false;
    }
    function offText() {
      var v = Math.round((lyr.offset || 0) * 10) / 10;
      offOut.textContent = "Sync: " + (v > 0 ? "+" : v < 0 ? "−" : "") + Math.abs(v).toFixed(1) + "s";
    }
    function bar(on) { syncBar.hidden = !on; if (on) offText(); }
    /* drops any timed lines so nothing highlights */
    function unsync() { lyr.lines = null; lyr.active = -1; stopLoop(); bar(false); body.classList.remove("is-sync"); miniLine(null); }
    function msg(text) { setCredit(null); unsync(); body.innerHTML = '<p class="x-lyr__msg">' + esc(text) + "</p>"; }
    function show(L) {
      lyr.active = -1;
      body.scrollTop = 0;
      var t = Player.current();
      if (L && L.synced && !L.mismatch && L.dur && t && t.id === L.id && okDur(audio.duration) && Math.abs(L.dur - audio.duration) > DUR_TOL) L = Object.assign({}, L, { mismatch: true });
      /* Lyrics.ovh is plain text only, and a different version's timing is never highlighted */
      var lines = L && L.synced && L.source !== "ovh" && !L.mismatch ? parseLRC(L.synced) : [];
      if (lines.length) {
        setCredit(L);
        lyr.lines = lines;
        body.classList.add("is-sync");
        body.innerHTML = '<div class="x-lyr__lines">' + lines.map(function (l, i) {
          return '<button class="x-lyr__line" type="button" data-li="' + i + '">' + (l.text ? esc(l.text) : "♪") + "</button>";
        }).join("") + "</div>";
        bar(true);
        sync(true);
        kick();
        return;
      }
      var plain = (L && (L.plain || (L.synced ? toPlain(L.synced) : ""))) || "";
      if (plain.trim()) {
        setCredit(L);
        unsync();
        body.innerHTML = (L.mismatch ? '<p class="x-note" style="margin-top:8px">Timing may not match this version</p>' : "") + '<p class="x-lyr__plain">' + esc(plain.trim()) + "</p>";
        return;
      }
      options("No lyrics found for this song");
    }
    function options(m, note) {
      setCredit(null);
      unsync();
      var web = "", t = Player.current();
      if (t && /^No lyrics/.test(m)) {
        var n = namesFor(t), q = ((n.artist || "") + " " + (n.title || t.title || "") + " lyrics").replace(/\s+/g, " ").trim();
        web = '<a class="x-ghost" href="https://www.google.com/search?q=' + esc(encodeURIComponent(q)) + '" target="_blank" rel="noopener">Find on the web</a>';
      }
      body.innerHTML = '<p class="x-lyr__msg">' + esc(m) + "</p>" + (note ? '<p class="x-note">' + esc(note) + "</p>" : "") +
        '<div class="x-lyr__opts">' + web + '<button class="x-ghost" type="button" data-l="search">Search again</button>' +
        '<button class="x-ghost" type="button" data-l="own">Add your own lyrics</button></div>' +
        (web ? '<p class="x-note">Copy the lyrics, then tap Add your own lyrics to paste them.</p>' : "");
    }
    var OFFLINE = "Could not reach the lyrics services. Check your connection.";
    function nextSource() {
      var t = Player.current();
      if (!t) return;
      var from = SOURCES[SOURCES.indexOf(srcOf(lyr.shown || mem[t.id])) + 1], tok = ++lyr.token;
      lyr.id = t.id;
      if (!from) { options("No lyrics found for this song", "No more sources to try."); return; }
      var key = t.id + "|" + from, hit = alt[key];
      if (hit) { if (hit.none) options("No lyrics found for this song", "No other source has this song."); else show(hit); return; }
      var n = namesFor(t);
      msg("Trying another source…");
      waitDuration(t.id).then(function (d) { return lookupFrom(n.artist, n.title, d, from); }).then(function (L) {
        if (L) L.id = t.id;
        alt[key] = L || { none: true };
        if (tok !== lyr.token) return;
        if (L) show(L); else options("No lyrics found for this song", "No other source has this song.");
      }).catch(function () { if (tok === lyr.token) options("No lyrics found for this song", OFFLINE); });
    }
    function searchForm() {
      var t = Player.current();
      if (!t) return;
      var n = namesFor(t);
      setCredit(null); unsync();
      body.innerHTML = '<form class="x-lyr__form" id="lyr-search">' +
        '<label for="lyr-s-artist">Artist</label><input class="x-input" id="lyr-s-artist" type="text" value="' + esc(n.artist) + '" />' +
        '<label for="lyr-s-title">Title</label><input class="x-input" id="lyr-s-title" type="text" value="' + esc(n.title) + '" />' +
        '<button class="x-go" type="submit">Search LRCLIB and Lyrics.ovh</button></form>';
    }
    function ownForm() {
      var t = Player.current();
      if (!t) return;
      var m = mem[t.id], prev = m && m.custom ? (m.synced || m.plain || "") : "";
      setCredit(null); unsync();
      body.innerHTML = '<form class="x-lyr__form" id="lyr-own">' +
        '<label for="lyr-text">Paste plain lyrics, or LRC lines like [01:02.50] for karaoke timing</label>' +
        '<textarea class="x-input" id="lyr-text">' + esc(prev) + "</textarea>" +
        '<button class="x-go" type="submit">Save lyrics</button></form>';
    }
    function load(force) {
      var t = Player.current();
      if (!t) { lyr.id = null; msg("Play a song to see its lyrics."); return; }
      if (t.live) { lyr.id = t.id; msg("Live radio has no lyrics."); return; }
      if (!force && lyr.id === t.id) { sync(true); kick(); return; }
      lyr.id = t.id;
      var tok = ++lyr.token;
      lyr.offset = t.id in offMem ? offMem[t.id] : 0;
      msg("Finding lyrics…");
      offGet(t.id).then(function (v) { if (tok !== lyr.token || lyr.id !== t.id) return; lyr.offset = v; offText(); sync(true); });
      waitDuration(t.id).then(function (d) { return tok !== lyr.token ? null : forTrack(t, d); }).then(function (L) {
        if (tok !== lyr.token) return;
        if (L) show(L); else options("No lyrics found for this song");
        auto(!!lyr.shown);
      }).catch(function () {
        if (tok !== lyr.token) return;
        options("No lyrics found for this song", OFFLINE);
        auto(false);
      });
    }
    /* found: switch to the lyrics view when the remembered choice is on; none: back to the artwork */
    function auto(found) {
      if (found) { if (pref && !lyr.open) { open(); lyr.auto = true; } }
      else if (lyr.open && lyr.auto) close();
    }
    function openIfFound() {
      var t = Player.current();
      if (t && lyr.id === t.id && lyr.shown && !lyr.open) { open(); lyr.auto = true; }
    }
    function visible() { return lyr.open && Player.isNowOpen(); }
    /* sheet opened: recompute the current line and jump to it */
    function reveal() { lyr.holdUntil = 0; lyr.active = -1; sync(true, true); kick(); }
    function ensure() { var ct = Player.current(); if (ct && lyr.id !== ct.id) load(false); }
    function center(el, instant) {
      var top = el.offsetTop - body.clientHeight / 2 + el.offsetHeight / 2;
      try { body.scrollTo({ top: Math.max(0, top), behavior: reduceMotion || instant ? "auto" : "smooth" }); } catch (e) {}
    }
    /* the active line is the last whose time <= currentTime + offset */
    function indexAt(ct) {
      var L = lyr.lines, lo = 0, hi = L.length - 1, i = -1;
      while (lo <= hi) { var mid = (lo + hi) >> 1; if (L[mid].t <= ct + 0.001) { i = mid; lo = mid + 1; } else hi = mid - 1; }
      return i;
    }
    function sync(forceScroll, instant) {
      if (!lyr.lines || !lyr.lines.length) { miniLine(null); return; }
      var t = Player.current();
      if (!t || t.id !== lyr.id) { miniLine(null); return; }
      var i = indexAt((audio.currentTime || 0) + (lyr.offset || 0));
      miniLine(i >= 0 ? lyr.lines[i].text || "♪" : null);
      if (i === lyr.active && !forceScroll) return;
      var old = body.querySelector(".x-lyr__line.is-on");
      if (old) { old.classList.remove("is-on"); old.removeAttribute("aria-current"); }
      lyr.active = i;
      var el = body.querySelector('[data-li="' + Math.max(0, i) + '"]');
      if (!el) return;
      if (i >= 0) { el.classList.add("is-on"); el.setAttribute("aria-current", "true"); }
      if (visible() && (forceScroll || Date.now() > lyr.holdUntil)) center(el, instant);
    }
    /* requestAnimationFrame loop reading currentTime while playing */
    var raf = 0;
    function frame() { raf = 0; if (!lyr.lines || audio.paused) return; sync(false); raf = requestAnimationFrame(frame); }
    function kick() { if (raf || !lyr.lines || audio.paused || typeof requestAnimationFrame !== "function") return; raf = requestAnimationFrame(frame); }
    function stopLoop() { try { if (raf) cancelAnimationFrame(raf); } catch (e) {} raf = 0; }
    function open() {
      lyr.open = true; lyr.auto = false;
      $("stage").classList.add("is-lyr");
      $("lyr").classList.add("is-on");
      $("now").classList.add("is-lyrview");
      $("lyr-btn").setAttribute("aria-pressed", "true");
      load(false);
    }
    /* the line loop keeps running for the mini player */
    function close() {
      lyr.open = false; lyr.auto = false;
      $("stage").classList.remove("is-lyr");
      $("lyr").classList.remove("is-on");
      $("now").classList.remove("is-lyrview");
      $("lyr-btn").setAttribute("aria-pressed", "false");
    }
    /* track change: reset the line index and never keep the old song's lyrics */
    var trackT = 0;
    function track() {
      if (!body) return;
      var t = Player.current();
      lyr.active = -1; lyr.holdUntil = 0;
      if (t && t.id === lyr.id) { sync(true); kick(); return; }
      lyr.token++;
      lyr.id = null;
      lyr.offset = t && t.id in offMem ? offMem[t.id] : 0;
      msg(t ? "Finding lyrics…" : "Play a song to see its lyrics.");
      /* a new song in the lyrics view goes back to the artwork if none are found */
      if (lyr.open) lyr.auto = true;
      /* fetch in the background once the song has played 1.5 s (skipping through a queue costs no lookups) */
      clearTimeout(trackT);
      if (t) trackT = setTimeout(function () { if (Player.current() === t && lyr.id !== t.id && Player.isNowOpen()) load(false); }, 1500);
    }
    function nudge(d) {
      var t = Player.current();
      if (!t || !lyr.lines || t.id !== lyr.id) return;
      lyr.offset = Math.round(((lyr.offset || 0) + d) * 1000) / 1000;
      offPut(t.id, lyr.offset); offText(); lyr.holdUntil = 0; sync(true);
    }
    /* tapped as the sung line starts: the line nearest the current position starts now */
    function syncNow() {
      var t = Player.current();
      if (!t || !lyr.lines || !lyr.lines.length || t.id !== lyr.id) return;
      var ct = audio.currentTime || 0, pos = ct + (lyr.offset || 0), best = 0, gap = Infinity;
      for (var k = 0; k < lyr.lines.length; k++) { var g = Math.abs(lyr.lines[k].t - pos); if (g < gap) { gap = g; best = k; } }
      lyr.offset = Math.round((lyr.lines[best].t - ct) * 1000) / 1000;
      offPut(t.id, lyr.offset); offText(); lyr.holdUntil = 0; sync(true);
    }
    function init() {
      body = $("lyr-body"); credit = $("lyr-credit"); syncBar = $("lyr-sync"); offOut = $("lyr-off");
      $("lyr-btn").addEventListener("click", function () { if (lyr.open) close(); else open(); prefSave(lyr.open); });
      $("lyr-more").addEventListener("click", function () { $("now-more").click(); });
      $("lyr-fix").addEventListener("click", function () { if (!Player.current()) return; lyr.token++; options("Wrong or missing lyrics?"); });
      $("mini-lyrics").addEventListener("click", function () { Player.openNow(); open(); });
      credit.addEventListener("click", function (e) { if (e.target.closest("#lyr-next")) nextSource(); });
      /* timeupdate stays as a fallback; the rAF loop does the smooth work */
      audio.addEventListener("timeupdate", function () { sync(false); kick(); });
      ["play", "seeked"].forEach(function (ev) { audio.addEventListener(ev, function () { lyr.holdUntil = 0; sync(true); kick(); }); });
      audio.addEventListener("pause", function () { stopLoop(); sync(true); });
      syncBar.addEventListener("click", function (e) {
        var b = e.target.closest("[data-sync]");
        if (b) { if (b.dataset.sync === "now") syncNow(); else nudge(parseFloat(b.dataset.sync) || 0); }
      });
      ["wheel", "touchstart"].forEach(function (ev) { body.addEventListener(ev, function () { lyr.holdUntil = Date.now() + 4000; }, { passive: true }); });
      body.addEventListener("click", function (e) {
        var line = e.target.closest("[data-li]");
        if (line && lyr.lines) {
          var l = lyr.lines[+line.dataset.li];
          if (l) { audio.currentTime = l.t; lyr.holdUntil = 0; if (audio.paused) audio.play().catch(function () {}); }
          return;
        }
        var opt = e.target.closest("[data-l]");
        if (opt) { if (opt.dataset.l === "search") searchForm(); else ownForm(); }
      });
      body.addEventListener("submit", function (e) {
        e.preventDefault();
        var t = Player.current();
        if (!t) return;
        if (e.target.id === "lyr-search") {
          var a = $("lyr-s-artist").value.trim(), ti = $("lyr-s-title").value.trim();
          if (!a && !ti) return;
          var tok = ++lyr.token;
          lyr.id = t.id;
          msg("Searching…");
          waitDuration(t.id).then(function (d) { return lookupFrom(a, ti, d, "lrclib"); }).then(function (L) {
            if (tok !== lyr.token) return;
            if (L) { L.id = t.id; keep(L); show(L); }
            else options("No lyrics found for this song", "Still nothing for that search. Try a shorter title.");
          }).catch(function () { if (tok === lyr.token) options("No lyrics found for this song", OFFLINE); });
        } else if (e.target.id === "lyr-own") {
          var text = $("lyr-text").value.trim();
          if (!text) return;
          var timed = parseLRC(text).length >= 2;
          var rec = { id: t.id, synced: timed ? text : "", plain: timed ? "" : text, custom: true, source: "you" };
          lyr.token++;
          lyr.id = t.id;
          keep(rec);
          show(rec);
        }
      });
    }
    return {
      forTrack: forTrack, track: track, reveal: reveal, ensure: ensure, open: function () { open(); prefSave(true); }, openIfFound: openIfFound,
      parseLRC: parseLRC, init: init
    };
  })();

  /* ============ 15 bot: Ask ƐMU ============ */
  /* Rule-based: player controls, charts, playlists, "songs like X", moods and genres, YouTube, free music, radio. */
  var Bot = (function () {
    var SIMILAR = {
      "Black Sherif": ["Kweku Smoke", "Kwesi Arthur", "O'Kenneth"], "Stonebwoy": ["Shatta Wale", "Samini"], "Shatta Wale": ["Stonebwoy", "Samini"],
      "KiDi": ["Kuami Eugene", "King Promise"], "Kuami Eugene": ["KiDi", "King Promise"], "King Promise": ["KiDi", "Camidoh", "Gyakie"],
      "Daddy Lumba": ["Kojo Antwi", "Amakye Dede"], "Kojo Antwi": ["Daddy Lumba", "Amakye Dede"], "Amakye Dede": ["Daddy Lumba", "Kojo Antwi"],
      "Joe Mettle": ["Diana Hamilton", "Piesie Esther"], "Diana Hamilton": ["Joe Mettle", "Piesie Esther"], "Piesie Esther": ["Diana Hamilton", "Joe Mettle"],
      "Sarkodie": ["Medikal", "Strongman", "Kwesi Arthur"], "Medikal": ["Sarkodie", "Strongman"], "Kwesi Arthur": ["Black Sherif", "Kofi Mole"],
      "Gyakie": ["Camidoh", "King Promise"], "Camidoh": ["King Promise", "Gyakie"], "Amaarae": ["Moliy", "Gyakie"],
      "R2Bees": ["Sarkodie", "Kofi Kinaata"], "Lasmid": ["Olivetheboy", "Kelvyn Boy"], "Olivetheboy": ["Lasmid", "Kelvyn Boy"],
      "Kweku Smoke": ["Black Sherif", "O'Kenneth"], "Samini": ["Stonebwoy", "Shatta Wale"]
    };
    var GENRES = [
      { k: "highlife", w: ["highlife", "high life"], a: "highlife", i: "ghana highlife", n: "highlife" },
      { k: "hiplife", w: ["hiplife", "hip life"], a: "hiplife", i: "hiplife", n: "hiplife" },
      { k: "afrobeats", w: ["afrobeats", "afrobeat", "afropop", "afro"], a: "afrobeats", i: "afrobeats", n: "Afrobeats" },
      { k: "drill", w: ["drill", "asakaa"], a: "asakaa drill", i: "asakaa", n: "drill" },
      { k: "gospel", w: ["gospel", "christian"], a: "ghana gospel", i: "ghana gospel", n: "gospel" },
      { k: "amapiano", w: ["amapiano", "piano"], a: "ghana amapiano", i: "amapiano ghana", n: "amapiano" },
      { k: "azonto", w: ["azonto"], a: "azonto", i: "azonto", n: "azonto" },
      { k: "dancehall", w: ["dancehall", "reggae"], a: "ghana dancehall", i: "dancehall ghana", n: "dancehall" },
      { k: "rap", w: ["rap", "hip hop", "hiphop"], a: "ghana rap", i: "ghana rap", n: "rap" }
    ];
    var MOODS = [
      { k: "sad", w: ["sad", "heartbreak", "heartbroken", "broken heart", "cry", "crying", "lonely", "pain", "depressed"], tag: "sad", g: "highlife", say: "Sorry you're feeling low, chale. Some soft songs for you 💛" },
      { k: "love", w: ["love", "romantic", "romance", "valentine", "wedding", "date night"], tag: "love", g: "highlife", say: "Love is sweet! Here's something romantic for you ❤️" },
      { k: "party", w: ["party", "turn up", "turnup", "club", "dance", "jama", "jollof"], tag: "party", g: "afrobeats", say: "Let's go! Party mode on 🔥" },
      { k: "chill", w: ["chill", "relax", "relaxing", "calm", "sleep", "study", "mellow", "soft", "cool down", "unwind"], tag: "chill", g: "afrobeats", say: "Ei, time to cool down. Something easy for you 🌙" },
      { k: "workout", w: ["workout", "gym", "running", "run", "exercise", "training", "hype", "pump"], tag: "hype", g: "drill", say: "Strong body, strong mind 💪 Here's some energy." },
      { k: "worship", w: ["worship", "praise", "sunday", "church", "prayer", "pray", "morning devotion"], tag: "worship", g: "gospel", say: "God is good! Some worship songs for you 🙏" },
      { k: "throwback", w: ["throwback", "old school", "oldschool", "classic", "classics", "old songs", "90s", "2000s", "back in the day"], tag: "classic", g: "highlife", say: "Ah, the old days! Here are some classics 📻" }
    ];
    var MOOD_X = { sad: "sad songs", love: "love songs", party: "party hits", chill: "chill vibes", workout: "workout hits", worship: "worship songs", throwback: "throwback hits" };
    var START_CHIPS = ["Top hits now", "Play Drake", "Chill vibes", "Afrobeats", "Ghana radio", "Workout mix"];
    var FILLER = /\b(please|pls|abeg|chale|charley|chaley|emu|bro|boss|eii|ei|yo|hey|for me|me|some|any|the|a|an|songs?|music|tracks?|tunes?|by|from|of|i want|i wanna|want|to hear|listen to|put on|can you|could you|now)\b/g;
    var normTxt = MX.normTxt, findArtist = MX.findArtist;
    var st = { log: [], tok: 0, rec: null };

    function findIn(list, m) {
      var padded = " " + m + " ";
      for (var i = 0; i < list.length; i++) for (var j = 0; j < list[i].w.length; j++) if (padded.indexOf(" " + list[i].w[j] + " ") >= 0) return list[i];
      return null;
    }
    function genreBy(k) { return GENRES.filter(function (g) { return g.k === k; })[0]; }
    function moodSpec(mood, genre, artist) {
      if (artist) {
        var t = mood ? mood.tag : genre ? genre.n : "";
        return { q: artist, strict: true, audius: t ? [artist + " " + t, artist] : [artist], itunes: [artist], beats: false };
      }
      var g = genre || genreBy(mood.g);
      if (!mood) return { audius: [g.a, g.n], itunes: [g.i], beats: false };
      /* a mood alone searches the global catalogue first, with its Ghana flavour as one part */
      if (!genre && MOOD_X[mood.k]) return { audius: [MOOD_X[mood.k], mood.tag + " " + g.a], itunes: [MOOD_X[mood.k], mood.tag + " " + g.i], beats: false };
      return { audius: [mood.tag + " " + g.a, mood.tag + " " + g.n, g.a], itunes: [mood.tag + " " + g.i, g.i], beats: false };
    }

    /* ---- the chat log ---- */
    function scroll() { var l = $("bot-log"); l.scrollTop = l.scrollHeight; }
    function say(text, who) {
      var p = doc.createElement("p");
      p.className = "x-msg x-msg--" + (who || "bot");
      p.textContent = text;
      $("bot-log").appendChild(p);
      st.log.push({ who: who || "bot", text: text });
      scroll();
      return p;
    }
    function typing() {
      var p = doc.createElement("p");
      p.className = "x-msg x-msg--bot x-msg--typing";
      p.textContent = "Searching…";
      $("bot-log").appendChild(p);
      scroll();
      return p;
    }
    function drop(p) { if (p && p.parentNode) p.parentNode.removeChild(p); }
    function cards(list) {
      if (!list.length) return;
      var box = doc.createElement("div");
      box.className = "x-bot__cards";
      box._list = list;
      box.innerHTML = list.map(function (t, i) {
        return '<div class="x-row" data-i="' + i + '">' + img(t.art) +
          '<button class="x-meta" type="button" data-bot="play"><b>' + esc(t.title) + "</b><span>" + badge(t) + esc(t.artist || "") + (t.dur ? " · " + time(t.dur) : "") + "</span></button>" +
          '<button class="x-icon" type="button" data-bot="play" aria-label="Play ' + esc(t.title) + '">' + I.play + "</button>" +
          '<button class="x-icon" type="button" data-bot="add" aria-label="Add ' + esc(t.title) + ' to a playlist">' + I.plus + "</button></div>";
      }).join("");
      $("bot-log").appendChild(box);
      scroll();
    }
    function chips(list) {
      $("bot-chips").innerHTML = (list || []).map(function (c) { return '<button class="x-chip" type="button" data-chip="' + esc(c) + '">' + esc(c) + "</button>"; }).join("");
    }
    var play = Player.playList;
    /* same order as the Songs list: accurate catalogue results first (full stream when matched), then community */
    function bestOf(res) { return res.songs.concat(res.community); }

    /* run a search, then either play the top song or list the results */
    function find(spec, mode, lines) {
      var tok = ++st.tok, ty = typing();
      return Search.all(spec).then(function (res) {
        drop(ty);
        if (tok !== st.tok) return null;
        var top = bestOf(res);
        if (!top.length) {
          var errs = res.errors || {}, why = Object.keys(errs).map(function (k) { return k + ": " + errs[k]; }).join(" · ");
          say(res.failed || res.catFailed ? "Hmm, I can't reach the music sources right now" + (why ? " (" + why + ")" : "") + ". Check your connection and try again."
            : !Settings.ytOn() && res.all && res.all.length ? "I couldn't find a full song for that. Add a free YouTube key in Settings → Music Sources to play almost any song in full."
            : lines.none || "Sorry, I couldn't find that one. Try another spelling?");
          return null;
        }
        if (mode === "play") {
          play(top, 0);
          var t = top[0];
          say((lines.play || "Now playing") + "\n▶ " + t.title + " · " + t.artist + "\n" + (viaYT(t) ? "Full song via YouTube" : "Full song"));
          if (top.length > 1) cards(top.slice(0, 8));
        } else {
          say(lines.list || "Here's what I found:");
          cards(top.slice(0, 8));
        }
        return res;
      });
    }
    /* a list promise → play it and show cards, with typing and stale-reply handling */
    /* empty: the reply for no results; fail(e): the reply when the source can't be reached */
    function playFrom(p, head, empty, fail, after) {
      var tok = ++st.tok, ty = typing();
      p.then(function (list) {
        drop(ty);
        if (tok !== st.tok) return;
        if (!list.length) { say(empty); return; }
        play(list, 0);
        say(head(list[0]));
        if (list.length > 1) cards(list.slice(0, 8));
        if (after) after(list);
      }, function (e) { drop(ty); if (tok === st.tok) say(typeof fail === "function" ? fail(e) : fail); });
    }
    var NOT_FOUND = "I couldn't find that one. Try another spelling?";
    function strip(s, re) {
      return s.replace(re, " ").replace(/^\s*(please\s+)?((can|could) you\s+)?(play|put on|search( for)?|find|look up|give me|i want)\s+(me\s+)?(some\s+)?/, "").replace(/[?.!]+$/, "").replace(/\s+/g, " ").trim();
    }
    /* "play X on YouTube" forces YouTube; "free music" / "indie" uses Jamendo */
    function sourceIntent(raw) {
      var m = String(raw).toLowerCase(), isYT = /\byou ?tube\b/.test(m), isFree = /\bfree (music|songs?|tracks?)\b|\bindie\b|\bjamendo\b/.test(m);
      if (!isYT && !isFree) return false;
      var fail = function (e) { return e && e.quota ? "YouTube's daily limit is used up. Try again tomorrow." : (isYT ? "YouTube said: " : "Jamendo said: ") + ((e && e.message) || "error"); };
      if (isYT) {
        if (!Settings.ytKey()) { say("Add your YouTube key in Settings → Music Sources to play full songs from YouTube."); chips([]); return true; }
        if (!Settings.on("youtube")) { say("YouTube is switched off. Turn it on in Settings → Music Sources."); return true; }
        if (YouTube.quotaHit()) { say("YouTube's daily limit is used up. Try again tomorrow."); return true; }
        var q = strip(m, /\b(on|from|via|using|with|in)\s+you ?tube\b|\byou ?tube\b/g);
        if (!q) { say("What should I play on YouTube? Try “play Black Sherif Kwaku the Traveller on YouTube”."); return true; }
        playFrom(YouTube.search(q), function (t) { return "Now playing from YouTube\n▶ " + t.title + " · " + t.artist + "\nFull song · YouTube"; }, NOT_FOUND, fail);
        return true;
      }
      if (!Settings.jmId()) { say("Add your Jamendo Client ID in Settings → Music Sources for free indie music."); return true; }
      if (!Settings.on("jamendo")) { say("Jamendo is switched off. Turn it on in Settings → Music Sources."); return true; }
      var w = strip(m, /\bfree (music|songs?|tracks?)\b|\bindie\b|\b(on|from)?\s*jamendo\b|\bsome\b/g), tag = "";
      Jamendo.TAGS.forEach(function (g) { if (MX.loose(w).replace(/ /g, "") === g[0] || MX.loose(w) === MX.loose(g[1])) tag = g[0]; });
      playFrom((tag || !w ? Jamendo.tag(tag) : Jamendo.search(w).then(function (l) { return l.length ? l : Jamendo.tag(""); })),
        function (t) { return "Free music from Jamendo\n▶ " + t.title + " · " + t.artist + "\nFree · Jamendo"; }, NOT_FOUND, fail);
      return true;
    }
    /* "play Joy FM", "play radio", "Ghana radio", "gospel radio" */
    function radioIntent(raw) {
      var m = String(raw || "").toLowerCase().trim();
      if (!/\bradio\b|\bfm\b|\bstations?\b/.test(m)) return false;
      if (!Settings.on("radio")) { say("Radio is switched off. Turn it on in Settings → Music Sources."); return true; }
      var gh = /\bghana(ian)?\b/.test(m), favs = Radio.favs();
      var w = m.replace(/[?.!]+$/, "")
        .replace(/^\s*(please\s+)?((can|could) you\s+)?(play|put on|tune (in )?to|tune in|listen to|search( for)?|find|open|start|give me|i want)\s+(me\s+)?(some\s+|the\s+|a\s+)?/, "")
        .replace(/\b(live\s+)?radio(\s+stations?)?\b|\bstations?\b|\bghana(ian)?\b|\b(in|from|on|please|some)\b/g, " ")
        .replace(/\s+/g, " ").trim();
      var tag = "";
      Radio.TAGS.forEach(function (g) { if (w === g[0] || w === g[1].toLowerCase() || w.replace(/[\s&-]/g, "") === g[0].replace(/\s/g, "")) tag = g[0]; });
      var path = !w ? (gh || !favs.length ? Radio.GH : null) : tag ? Radio.tagPath(tag) : Radio.namePath(w, 30, gh ? "GH" : "");
      if (!path) {
        play(favs, 0);
        say("Playing your favourite stations 📻\n▶ " + favs[0].title + "\nLive radio");
        if (favs.length > 1) cards(favs.slice(0, 8));
        return true;
      }
      playFrom(Radio.list(path).then(function (list) {
        if (list.length || !w || tag) return list;
        var w2 = w.replace(/\bfm\b/g, " ").replace(/\s+/g, " ").trim();
        return w2 && w2 !== w ? Radio.list(Radio.namePath(w2, 30, gh ? "GH" : "")) : list;
      }), function (t) {
        return (tag ? "Live " + tag + " radio 📻" : !w ? "Ghana live radio 📻" : "Tuning in 📻") + "\n▶ " + t.title + (t.country ? " · " + t.country : "") + "\nLive radio";
      }, "I couldn't find a station called “" + w + "”. Try Live Radio in Browse.", function (e) {
        return "I can't reach the radio directory right now (" + ((e && e.message) || "error") + "). Try again in a moment.";
      });
      return true;
    }

    function handle(raw) {
      var m = normTxt(raw);
      if (!m) return;
      if (radioIntent(raw) || sourceIntent(raw)) return;
      var t = Player.current(), audio = Player.audio, short = m.split(" ").length <= 4;

      /* greetings, help, player controls */
      if (/^(hi|hello|hey|yo|good (morning|afternoon|evening)|akwaaba|maakye|charley|chale)( (there|emu|chale|charley|bro|boss|friend))*$/.test(m)) {
        say("Hey! Ask me for any song, artist or mood. Try “play Black Sherif” or “sad highlife”. 🎶"); chips(START_CHIPS); return;
      }
      if (/^(thanks|thank you|thx|medaase|nice|cool|ok|okay)( (emu|chale|charley|bro|boss|so much|a lot|paa))*$/.test(m)) { say(pick(["Anytime, chale! 🙌", "Medaase! Enjoy the vibes 🎶", "You're welcome! 🔥"])); return; }
      if (/\b(help|what can you do)\b/.test(m)) {
        say("I can play songs and artists, find music by mood, suggest similar artists, make playlists, and control the player (pause, next, lyrics, like, download).");
        chips(START_CHIPS); return;
      }
      if (/what.?s playing|what is playing|what song is this|whats this song|which song is this|now playing|who is singing|who sings this/.test(m)) {
        say(t ? "You're listening to " + t.title + " by " + (t.artist || "an unknown artist") + (t.yt ? " (full song via YouTube)." : ".") + (audio.paused ? " It's paused right now." : " 🎧") : "Nothing is playing yet. Say “play Sarkodie” to start.");
        return;
      }
      if (/^(pause|stop|hold on|wait)( it| the music| music| the song| this| please| pls)*$/.test(m)) {
        if (!t) { say("Nothing is playing right now."); return; }
        audio.pause(); say("Paused. Say “play” when you're ready."); return;
      }
      if (/^(play|resume|continue|unpause|play again|start)( it| again| the music| music| please| pls)*$/.test(m)) {
        if (!t) { say("What should I play? Try “play King Promise” or “party Afrobeats”."); chips(START_CHIPS); return; }
        audio.play().catch(function () {}); say("Back on! ▶ " + t.title); return;
      }
      if (short && /\b(next|skip)\b/.test(m)) {
        if (!Player.hasQueue()) { say("The queue is empty. Ask me for a song first."); return; }
        Player.next(); var n = Player.current(); say("Skipped ⏭ " + (n ? n.title + " by " + n.artist : "")); return;
      }
      if (short && /\b(previous|prev|go back|last song|play that again)\b/.test(m)) {
        if (!Player.hasQueue()) { say("The queue is empty. Ask me for a song first."); return; }
        Player.prev(); var pv = Player.current(); say("Going back ⏮ " + (pv ? pv.title : "")); return;
      }
      if (/\blyrics?\b/.test(m)) {
        if (!t) { say("Play a song first, then I'll show its lyrics."); return; }
        say("Opening the lyrics for " + t.title + " 🎤");
        setTimeout(function () { close(); Lyrics.open(); Player.openNow(); }, 500);
        return;
      }
      if (/^(like|love|heart|save) (this|it|the song|this song|that)\b/.test(m) || /^i (like|love) (this|it)\b/.test(m)) {
        if (!t) { say("Nothing is playing to like yet."); return; }
        if (Library.isLiked(t)) say("It's already in your Liked Songs ❤️"); else { Library.like(t); say("Added " + t.title + " to your Liked Songs ❤️"); }
        return;
      }
      if (/\bdownload\b/.test(m) && (/\b(this|it|current|that|the song|song)\b/.test(m) || m === "download")) {
        if (!t) { say("Play a song first, then I can save it for offline."); return; }
        if (t.yt || t.preview) { say("Songs from YouTube can't be downloaded. Sorry!"); return; }
        if (!t.src) { say("This song is already on your phone."); return; }
        if (Library.isSaved(t)) { say("It's already in Downloads ✅"); return; }
        say("Downloading " + t.title + "… I'll let you know when it's saved.");
        Library.download(t, null); return;
      }
      if (/\b(liked|likes|favourites?|favorites?|my faves)\b/.test(m)) {
        var liked = Library.liked();
        if (!liked.length) { say("You haven't liked any songs yet. Tap the heart on a song you love."); return; }
        var lk = fullOnly(liked);
        if (!lk.length) { say("None of your liked songs has a full stream yet. Add a free YouTube key in Settings → Music Sources."); return; }
        play(lk, 0); say("Playing your " + plural(lk.length, "liked song") + " ❤️");
        return;
      }

      /* world charts, then Ghana charts */
      if (!/\bghana\b/.test(m) && (/\b(top (hits|songs|tracks|charts?)|world charts?|global (charts?|hits)|whats hot|trending|hits now|popular now)\b/.test(m) || /^(the )?charts?$/.test(m))) {
        playFrom(Search.listSongs(Coll.chartTracks(), []), function (s) {
          return "Top hits around the world right now 🌍🔥\n▶ " + s.title + " · " + s.artist + (viaYT(s) ? " (via YouTube)" : "");
        }, "I can't reach the charts right now. Try again soon.", "I can't reach the charts right now. Try again soon.", function () { chips(["Next", "Afrobeats", "Ghana charts"]); });
        return;
      }
      if (/\b(ghana (charts?|top songs|top hits|hits|top 100)|charts? (in|from|for) ghana|top (songs|hits|tracks|music) (in|from) ghana|trending in ghana)\b/.test(m)) {
        var gk = ++st.tok, gty = typing();
        Coll.ghanaCharts().then(function (p) {
          drop(gty);
          if (gk !== st.tok) return;
          say("Opening “" + p.title + "” 🇬🇭🔥");
          setTimeout(function () { close(); Coll.openPlaylist(p); }, 400);
        }, function () { drop(gty); if (gk === st.tok) say("I can't reach the Ghana charts right now. Try again soon."); });
        return;
      }

      var artist = findArtist(m), genre = findIn(GENRES, m), mood = findIn(MOODS, m);
      if (mood && mood.k === "worship" && !genre) genre = genreBy("gospel");
      var aName = artist ? artist.name : "";

      /* make a playlist */
      if (/\b(make|create|build|generate)\b.*\b(playlist|mix)\b/.test(m)) {
        var spec, name;
        if (aName) { spec = mood || genre ? moodSpec(mood, genre, aName) : Search.artistSpec(aName); name = aName + " Mix"; }
        else if (mood || genre) { spec = moodSpec(mood, genre, ""); name = cap(((mood ? mood.k + " " : "") + (genre ? genre.n : "")).trim()) + " Mix"; }
        else {
          var subj = m.replace(/\b(make|create|build|generate|playlist|mix|with|called|named|for)\b/g, " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
          if (!subj) { say("Sure! Who or what should the playlist be? Try “make a playlist of KiDi songs”."); return; }
          spec = Search.specFor(subj); name = cap(subj) + " Mix";
        }
        var tok = ++st.tok, ty = typing();
        Search.all(spec).then(function (res) {
          drop(ty);
          if (tok !== st.tok) return;
          var picks = res.full.slice(0, 10);
          if (!picks.length) { say(res.failed ? "I can't reach the music sources right now. Try again soon." : "I couldn't find songs for that playlist. Try another name."); return; }
          var nm = Library.create(name, picks);
          say("Done! I made “" + nm + "” with " + plural(picks.length, "song") + ". Find it in Library → Playlists 🎉");
          cards(picks.slice(0, 8));
          chips(["Play " + nm, "Songs like " + (aName || "Stonebwoy"), "Party Afrobeats"]);
        });
        return;
      }
      /* play one of my playlists */
      var plHit = Library.playlists().filter(function (p) { return normTxt(p.name) && m.indexOf(normTxt(p.name)) >= 0; })[0];
      if (plHit && /\b(play|shuffle|start)\b/.test(m)) {
        var pf = fullOnly(plHit.tracks);
        if (!plHit.tracks.length) { say("“" + plHit.name + "” is empty for now."); return; }
        if (!pf.length) { say("“" + plHit.name + "” has no full songs to play right now."); return; }
        play(pf, 0); say("Playing your playlist “" + plHit.name + "” 🎶"); return;
      }

      /* songs like X: Deezer related artists, their top tracks interleaved and matched to full streams */
      var like = m.match(/\b(like|similar to|sounds like|in the style of)\s+(.+)$/);
      if (like && !/^(this|it|that)\b/.test(like[2])) {
        var who = findArtist(like[2]), target = who ? who.name : like[2].replace(FILLER, " ").trim();
        var sims = who && SIMILAR[who.name], sk = ++st.tok, sty = typing();
        Deezer.artists(target).then(function (list) {
          var u = Deezer.bestArtist(list, target);
          if (!u) throw new Error("none");
          return Deezer.get("artist/" + u.dz + "/related?limit=10").then(function (j) {
            var rel = Deezer.list(j, Deezer.artist).slice(0, 4);
            if (!rel.length) throw new Error("none");
            return Promise.all(rel.map(function (a) { return Deezer.get("artist/" + a.dz + "/top?limit=5").then(Deezer.tracks, function () { return []; }); })).then(function (rs) {
              var mix = [];
              for (var i = 0; i < 5; i++) rs.forEach(function (r) { if (r[i]) mix.push(r[i]); });
              return Search.listSongs(Promise.resolve(mix), rel.slice(0, 3).map(function (a) { return a.name; })).then(function (songs) {
                return { name: u.name, names: rel.map(function (a) { return a.name; }), songs: songs };
              });
            });
          });
        }).then(function (r) {
          if (sk !== st.tok) return;
          if (!r.songs.length) throw new Error("none");
          drop(sty);
          play(r.songs, 0);
          var s0 = r.songs[0];
          say("If you like " + r.name + ", try " + r.names.join(", ") + " 🔥\n▶ " + s0.title + " · " + s0.artist + (viaYT(s0) ? " (via YouTube)" : ""));
          cards(r.songs.slice(0, 8));
          chips(r.names.slice(0, 3).map(function (s) { return "Play " + s; }).concat(["Songs like " + r.names[0]]));
        }).catch(function () {
          drop(sty);
          if (sk !== st.tok) return;
          if (sims) {
            chips(sims.map(function (s) { return "Play " + s; }).concat(["Songs like " + sims[0]]));
            find({ audius: sims, itunes: sims, beats: false }, "list", { list: "If you like " + target + ", try " + sims.join(", ") + " 🔥" });
          } else find(Search.artistSpec(cap(target)), "list", { list: "I don't know who sounds like " + cap(target) + " yet, but here's " + cap(target) + " for you:" });
        });
        return;
      }

      var PLAY = /^(play|put on|spin|start|i want to hear|i wanna hear|lets hear|let me hear|blast)\b/;
      var playMode = PLAY.test(m) || /\bplay\b/.test(m), rest = m.replace(PLAY, "").trim();

      /* mood or genre */
      if (mood || genre) {
        var label = cap(((mood ? mood.k + " " : "") + (genre ? genre.n : genreBy(mood.g).n)).trim());
        chips(playMode ? ["Next", "Show lyrics", "Like this"] : ["Play " + label.toLowerCase(), "Songs like Black Sherif", "Gospel vibes"]);
        find(moodSpec(mood, genre, aName), playMode ? "play" : "list", {
          play: mood ? mood.say : "Chale, here's some " + (aName ? aName + " " : "") + label + " 🔥",
          list: mood ? mood.say : "Here's some " + (aName ? aName + " " : "") + label + " for you 🔥",
          none: "I couldn't find " + label.toLowerCase() + " songs right now. Try another mood?"
        });
        return;
      }

      /* an artist, or a song title */
      var cleaned = rest.replace(/^(songs?|music|tracks?)\s+(by|from)\s+/, "").replace(/\b(search|find|show me|look for|look up|get me|give me|any)\b/g, " ").replace(/\s+/g, " ").trim();
      if (aName) {
        var leftover = artist.words.slice(0, artist.start).concat(artist.words.slice(artist.end)).join(" ").replace(/\b(play|put on|spin|search|find|show|look|for|up|get|give|latest|new|top|best|hits?)\b/g, " ").replace(FILLER, " ").replace(/\s+/g, " ").trim();
        if (!leftover) {
          chips([playMode ? "Next" : "Play " + aName, "Songs like " + aName, "Make a playlist of " + aName + " songs"]);
          find(Search.artistSpec(aName), playMode ? "play" : "list", {
            play: pick(["Chale, here's some " + aName + " for you 🔥", aName + " coming right up 🎶", "Good choice! " + aName + " 🔥"]),
            list: pick(["Here are some " + aName + " songs 🔥", "Chale, " + aName + " is sweet! Pick one:", "Top " + aName + " tracks for you 🎶"]),
            none: "I couldn't find " + aName + " songs right now. Try again in a moment."
          });
          return;
        }
      }
      var query = MX.fixArtists(cleaned.replace(/\b(songs?|music|by)\b/g, " ").replace(/\s+/g, " ").trim() || m);
      if (!query) { say("Tell me a song, artist or mood and I'll find it 🎶"); return; }
      chips(playMode ? ["Next", "Show lyrics", "Download this song"] : ["Play " + query]);
      find(Search.specFor(query), playMode ? "play" : "list", {
        play: pick(["Chale, here you go 🔥", "Coming right up 🎶", "Enjoy! 🎧"]),
        list: "Here's what I found for “" + query + "”:",
        none: "Sorry, I couldn't find “" + query + "”. Try another spelling?"
      });
    }

    function send(text) {
      text = String(text || "").trim();
      if (!text) return;
      say(text, "me");
      try { handle(text); } catch (e) { say("Oops, something went wrong. Try saying it another way."); }
    }
    function open() {
      $("bot").classList.add("is-on");
      $("bot-fab").setAttribute("aria-expanded", "true");
      doc.documentElement.classList.add("x-lock");
      if (!st.log.length) {
        say("Akwaaba! I'm ƐMU 👋 Ask me to play any song, artist or mood from around the world, Ghana included 🌍");
        chips(START_CHIPS);
      }
      try { $("bot-in").focus({ preventScroll: true }); } catch (e) {}
      scroll();
    }
    function close() {
      var b = $("bot");
      if (!b || !b.classList.contains("is-on")) return;
      b.classList.remove("is-on");
      $("bot-fab").setAttribute("aria-expanded", "false");
      if (!Player.isNowOpen()) doc.documentElement.classList.remove("x-lock");
      try { if (st.rec) st.rec.abort(); } catch (e) {}
    }
    function isOpen() { return $("bot").classList.contains("is-on"); }
    function initVoice() {
      var SR = G.SpeechRecognition || G.webkitSpeechRecognition;
      if (!SR) return;
      var mic = $("bot-mic");
      mic.hidden = false;
      mic.addEventListener("click", function () {
        try {
          if (st.rec) { st.rec.abort(); return; }
          var rec = new SR();
          rec.lang = "en-GB"; rec.interimResults = false; rec.maxAlternatives = 1;
          rec.onresult = function (ev) { var s = ev.results && ev.results[0] && ev.results[0][0] ? ev.results[0][0].transcript : ""; if (s) send(s); };
          rec.onerror = function (ev) { if (ev && (ev.error === "not-allowed" || ev.error === "service-not-allowed")) toast("Microphone is blocked here. Type your request instead."); };
          rec.onend = function () { st.rec = null; mic.classList.remove("is-on"); mic.setAttribute("aria-label", "Speak your request"); };
          st.rec = rec;
          mic.classList.add("is-on");
          mic.setAttribute("aria-label", "Stop listening");
          rec.start();
        } catch (err) {
          st.rec = null; mic.classList.remove("is-on");
          toast("Voice input isn't available here. Type your request instead.");
        }
      });
    }
    function init() {
      $("bot-fab").addEventListener("click", open);
      $("bot-close").addEventListener("click", close);
      $("bot").addEventListener("click", function (e) { if (e.target === this) close(); });
      $("bot-form").addEventListener("submit", function (e) { e.preventDefault(); var v = $("bot-in").value; $("bot-in").value = ""; send(v); });
      $("bot-chips").addEventListener("click", function (e) { var c = e.target.closest("[data-chip]"); if (c) send(c.dataset.chip); });
      $("bot-log").addEventListener("click", function (e) {
        var b = e.target.closest("[data-bot]"), box = b && b.closest(".x-bot__cards"), row = b && b.closest("[data-i]");
        if (!box || !row) return;
        var list = box._list || [], i = +row.dataset.i, t = list[i];
        if (!t) return;
        if (b.dataset.bot === "play") { play(list, i); toast("Playing " + t.title); }
        else Acts.playlist(t);
      });
      try { initVoice(); } catch (e) {}
    }
    return { send: send, open: open, close: close, isOpen: isOpen, init: init };
  })();

  /* ============ 16 ui: tabs, sheets, settings, install, artwork fallback ============ */
  var UI = (function () {
    var VIEWS = ["home", "browse", "radio", "search", "library", "downloads"];
    var TITLES = { home: "Listen Now", browse: "Browse", radio: "Radio", library: "Library", downloads: "Downloads", search: "Search" };
    var LIB_NAMES = { playlists: "Playlists", liked: "Liked Songs", mine: "My Songs" };
    /* five tabs; Live Radio is a sub-view of Browse, so Browse stays selected there */
    function show(name) {
      VIEWS.forEach(function (k) { var v = $("view-" + k); if (v) v.classList.toggle("is-on", k === name); });
      var tab = name === "radio" ? "browse" : name;
      [].forEach.call($("tabs").children, function (b) { b.setAttribute("aria-selected", String(b.dataset.view === tab)); });
      $("top-title").textContent = TITLES[name] || "";
      if (name === "radio") RadioUI.open();
      if (name === "browse") RadioUI.preview();
      libSec("");
      G.scrollTo(0, 0);
    }
    function libSec(sec) {
      var v = $("view-library");
      if (sec) v.dataset.sec = sec; else delete v.dataset.sec;
      $("lib-back").hidden = !sec;
      $("lib-title").textContent = LIB_NAMES[sec] || "Library";
      if (sec) G.scrollTo(0, 0);
    }
    function unlock() { if (!doc.querySelector(".x-now.is-on, .x-sheet.is-on")) doc.documentElement.classList.remove("x-lock"); }

    /* ---- Music Sources sheet ---- */
    var src, yIn, jIn, wasYT;
    function refresh() {
      var yt = Settings.ytOn();
      if (wasYT !== undefined && wasYT !== yt) setTimeout(SearchUI.redraw, 0);
      wasYT = yt;
      $("jm-browse").hidden = !Settings.jmOn();
      Extras.refresh();
    }
    function storeKeys() { Settings.setKeys(yIn.value, jIn.value); refresh(); }
    function openSrc() {
      yIn.value = Settings.ytKey(); jIn.value = Settings.jmId();
      [].forEach.call(src.querySelectorAll("[data-src]"), function (c) { c.checked = Settings.on(c.dataset.src); });
      src.classList.add("is-on");
      doc.documentElement.classList.add("x-lock");
      try { $("src-close").focus(); } catch (e) {}
    }
    function closeSrc() {
      storeKeys();
      src.classList.remove("is-on");
      unlock();
    }
    function out(id, ok, msg) { var o = $(id); o.textContent = (ok ? "✓ " : "✗ ") + msg; o.classList.toggle("is-bad", !ok); }
    /* Check sources: ping each one from this phone, ✓ with the time it took or ✗ with the reason */
    function checkSources() {
      var box = $("src-checks");
      var list = [
        ["Deezer", function () { return Deezer.get("chart/0/tracks?limit=1"); }],
        ["iTunes", function () { return Net.json("https://itunes.apple.com/search?term=drake&entity=song&limit=1"); }],
        ["Audius", Audius.ping],
        ["Internet Archive", Archive.ping]
      ];
      if (Settings.ytKey()) list.push(["YouTube", function () { return YouTube.test(Settings.ytKey()); }]);
      if (Settings.jmId()) list.push(["Jamendo", function () { return Jamendo.search("test"); }]);
      if (Settings.on("free")) list.push(["Free Full Songs", FreeSongs.ping]);
      if (Settings.on("radio")) list.push(["Radio Browser", function () { return Radio.rb("stations/topclick/1?hidebroken=true"); }]);
      box.innerHTML = "";
      var sp = doc.createElement("p");
      sp.className = "x-src__out";
      sp.textContent = Store.local()
        ? "✓ Storage · saved on this phone" + (Store.idb() ? "" : " (downloads this session only)")
        : "✓ Storage · this session only (blocked here)";
      box.appendChild(sp);
      list.forEach(function (s) {
        var p = doc.createElement("p"), t0 = Date.now(), run;
        p.className = "x-src__out";
        p.textContent = "… " + s[0];
        box.appendChild(p);
        try { run = Promise.resolve(s[1]()); } catch (e) { run = Promise.reject(e); }
        run.then(function () { p.textContent = "✓ " + s[0] + " · " + (Date.now() - t0) + " ms"; }, function (e) {
          p.classList.add("is-bad");
          p.textContent = "✗ " + s[0] + " · " + Net.why(e) + " (" + (Date.now() - t0) + " ms)";
        });
      });
    }
    function initSources() {
      src = $("src-sheet"); yIn = $("src-yt"); jIn = $("src-jm");
      doc.addEventListener("click", function (e) { if (e.target.closest("[data-src-open]")) openSrc(); });
      $("src-close").addEventListener("click", closeSrc);
      $("src-done").addEventListener("click", closeSrc);
      src.addEventListener("click", function (e) { if (e.target === src) closeSrc(); });
      yIn.addEventListener("change", storeKeys);
      jIn.addEventListener("change", storeKeys);
      src.addEventListener("change", function (e) {
        var c = e.target.closest("[data-src]");
        if (!c) return;
        Settings.setOn(c.dataset.src, c.checked);
        refresh();
        if (c.dataset.src === "radio") RadioUI.onSwitch();
        if (c.dataset.src === "free" && !c.checked) $("x-res-ov").hidden = true;
      });
      src.querySelector("[data-show]").addEventListener("click", function () {
        var reveal = yIn.type === "password";
        yIn.type = reveal ? "text" : "password";
        this.textContent = reveal ? "Hide" : "Show";
        this.setAttribute("aria-pressed", String(reveal));
      });
      src.addEventListener("click", function (e) {
        var b = e.target.closest("[data-test]");
        if (!b) return;
        var yt = b.dataset.test === "yt", val = (yt ? yIn : jIn).value.trim(), id = yt ? "src-yt-out" : "src-jm-out";
        if (!val) { out(id, false, yt ? "Paste your API key first." : "Paste your Client ID first."); return; }
        $(id).classList.remove("is-bad"); $(id).textContent = "Testing…";
        (yt ? YouTube.test(val) : Jamendo.search("test", val).then(function (l) { return l.length; })).then(function (n) {
          storeKeys(); out(id, true, "Works · " + n + " results");
        }, function (e) { out(id, false, e.message || "Could not connect"); });
      });
      $("src-check").addEventListener("click", checkSources);
      refresh();
    }

    /* ---- install sheet (hidden once installed) ---- */
    function initInstall() {
      var sheet = $("sheet");
      $("install-btn").addEventListener("click", function () { sheet.classList.add("is-on"); });
      $("sheet-close").addEventListener("click", function () { sheet.classList.remove("is-on"); });
      sheet.addEventListener("click", function (e) { if (e.target === this) this.classList.remove("is-on"); });
      var mq = G.matchMedia ? G.matchMedia("(display-mode: standalone)") : null;
      function check() { if ((mq && mq.matches) || G.navigator.standalone === true) sheet.classList.remove("is-on"); }
      check();
      if (mq) { if (mq.addEventListener) mq.addEventListener("change", check); else if (mq.addListener) mq.addListener(check); }
      G.addEventListener("appinstalled", check);
    }

    /* ---- artwork: broken or blank art becomes the gold logo tile ---- */
    function initArt() {
      function skip(im) { return !im || im.tagName !== "IMG" || !!im.closest(".x-top"); }
      function fallback(im) { im.classList.add("x-fallback"); if (im.src !== ART) im.src = ART; }
      doc.addEventListener("error", function (e) {
        var im = e.target;
        if (skip(im)) return;
        if (im.src === ART) im.classList.add("x-fallback"); else fallback(im);
      }, true);
      doc.addEventListener("load", function (e) {
        var im = e.target;
        if (skip(im)) return;
        if (im.src === ART) im.classList.add("x-fallback");
        else if (im.naturalWidth < 60) fallback(im);
        else im.classList.remove("x-fallback");
      }, true);
    }

    function init() {
      [].forEach.call($("tabs").children, function (b) { b.addEventListener("click", function () { show(b.dataset.view); }); });
      $("lib-menu").addEventListener("click", function (e) {
        var b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.go) show(b.dataset.go); else libSec(b.dataset.sec);
      });
      $("lib-back").addEventListener("click", function () { libSec(""); });
      G.addEventListener("scroll", function () { $("x-top").classList.toggle("is-scrolled", G.scrollY > 44); }, { passive: true });
      /* Escape closes the action sheet first, otherwise every open sheet */
      doc.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        if (Acts.isOpen()) { Acts.close(); return; }
        if (src.classList.contains("is-on")) closeSrc();
        if (Coll.isOpen()) Coll.close();
        Bot.close();
        if (Player.isNowOpen()) Player.closeNow();
      });
      initSources();
      initInstall();
      initArt();
    }
    return { show: show, libSec: libSec, init: init };
  })();

  /* ============ 17 dust: gold dust that swirls, gathers into "ƐMU YƐ", holds, scatters ============ */
  /* Light: at most 380 specks at 40 fps, paused when the page is hidden, still under reduced motion. */
  var Dust = (function () {
    var cv, ctx, mq = null, W = 0, H = 0, DPR = 1, P = [], T = [], raf = 0, last = 0, t0 = 0, sizing = 0;
    var COLORS = ["#e6c46b", "#c9a24a", "#f5dc96"];
    var SWIRL = 9000, GATHER = 2600, HOLD = 3200, SCATTER = 2200, CYCLE = SWIRL + GATHER + HOLD + SCATTER, FRAME = 1000 / 40;
    var FONT = "px -apple-system, 'SF Pro Display', system-ui, sans-serif";
    function rnd(a, b) { return a + Math.random() * (b - a); }
    function reduced() { return !!(mq && mq.matches); }
    function targets(n) {
      var o = doc.createElement("canvas"), oc = o.getContext && o.getContext("2d");
      if (!oc) return [];
      var tw = Math.min(W * 0.86, 720), fs = Math.round(Math.min(tw / 4.2, H * 0.22));
      o.width = Math.ceil(tw); o.height = Math.ceil(fs * 1.4);
      oc.fillStyle = "#fff"; oc.textAlign = "center"; oc.textBaseline = "middle";
      oc.font = "700 " + fs + FONT;
      var mw = oc.measureText("ƐMU YƐ").width;
      if (mw > o.width) { fs = Math.floor(fs * o.width / mw); oc.font = "700 " + fs + FONT; }
      oc.fillText("ƐMU YƐ", o.width / 2, o.height / 2);
      var d = oc.getImageData(0, 0, o.width, o.height).data, pts = [], step = Math.max(3, Math.round(fs / 22));
      for (var y = 0; y < o.height; y += step) for (var x = 0; x < o.width; x += step) if (d[(y * o.width + x) * 4 + 3] > 128) pts.push([x, y]);
      for (var i = pts.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, s = pts[i]; pts[i] = pts[j]; pts[j] = s; }
      var ox = (W - o.width) / 2, oy = H * 0.42 - o.height / 2;
      return pts.slice(0, n).map(function (p) { return { x: p[0] + ox, y: p[1] + oy }; });
    }
    function setup() {
      sizing = 0;
      var w = cv.clientWidth || G.innerWidth, h = cv.clientHeight || G.innerHeight;
      if (!w || !h || (P.length && w === W && h === H)) return;
      var keep = P.length && W && H, sx = keep ? w / W : 1, sy = keep ? h / H : 1;
      W = w; H = h;
      DPR = Math.min(G.devicePixelRatio || 1, 1.75);
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      var n = Math.round(Math.min(380, Math.max(160, (W * H) / 3200)));
      if (keep) P.forEach(function (p) { p.x *= sx; p.y *= sy; });
      while (P.length < n) P.push({ x: rnd(0, W), y: rnd(0, H), vx: 0, vy: 0, r: rnd(0.6, 1.6), c: (Math.random() * 3) | 0, a: rnd(0.35, 1) });
      P.length = n;
      T = targets(n);
      for (var i = 0; i < P.length; i++) P[i].t = T[i] || null;
      if (reduced()) drawStatic();
    }
    function paint(alphaFor) {
      ctx.clearRect(0, 0, W, H);
      for (var c = 0; c < 3; c++) {
        ctx.fillStyle = COLORS[c];
        for (var i = 0; i < P.length; i++) {
          var p = P[i];
          if (p.c !== c) continue;
          ctx.globalAlpha = alphaFor(p);
          ctx.fillRect(p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
      }
      ctx.globalAlpha = 1;
    }
    function drawStatic() {
      P.forEach(function (p) { if (p.t) { p.x = p.t.x; p.y = p.t.y; } });
      paint(function (p) { return p.t ? 0.5 * p.a : 0.25 * p.a; });
    }
    function ease(k) { return k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; }
    function step(now) {
      raf = requestAnimationFrame(step);
      if (now - last < FRAME) return;
      var dt = Math.min(now - last, 60) / 16.67;
      last = now;
      if (!t0) t0 = now;
      var ph = (now - t0) % CYCLE, tm = now * 0.00012, pull = 0, held = false;
      if (ph > SWIRL && ph <= SWIRL + GATHER) pull = ease((ph - SWIRL) / GATHER);
      else if (ph > SWIRL + GATHER && ph <= SWIRL + GATHER + HOLD) { pull = 1; held = true; }
      var scattering = ph > SWIRL + GATHER + HOLD;
      for (var i = 0; i < P.length; i++) {
        var p = P[i];
        var ang = Math.sin(p.x * 0.004 + tm) * 2.2 + Math.cos(p.y * 0.005 - tm * 1.3) * 2.2;
        var fx = Math.cos(ang) * 0.05, fy = Math.sin(ang) * 0.05;
        if (scattering && p.k) { fx += (Math.random() - 0.5) * 0.6; fy += (Math.random() - 0.5) * 0.6; p.k = 0; }
        if (pull && p.t) {
          p.k = 1;
          var s = 0.02 + 0.16 * pull;
          p.x += (p.t.x - p.x) * s * dt; p.y += (p.t.y - p.y) * s * dt;
          p.vx *= 0.8; p.vy *= 0.8;
          if (held) { p.x += Math.sin(now * 0.002 + i) * 0.08; p.y += Math.cos(now * 0.0023 + i) * 0.08; }
          continue;
        }
        p.vx = (p.vx + fx * dt) * 0.96; p.vy = (p.vy + fy * dt) * 0.96;
        p.x += p.vx * dt; p.y += p.vy * dt - 0.05 * dt;
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4; else if (p.y > H + 4) p.y = -4;
      }
      var tw = 0.75 + 0.25 * Math.sin(now * 0.003);
      paint(function (p) { return p.t && pull ? Math.min(1, p.a * (0.6 + 0.6 * pull)) : (p.t ? p.a * 0.6 : p.a * 0.35 * tw); });
    }
    function start() { if (raf || doc.hidden || reduced()) return; last = 0; raf = requestAnimationFrame(step); }
    function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    function onResize() { if (!sizing) sizing = requestAnimationFrame(setup); }
    function init() {
      cv = $("x-dust");
      try { ctx = cv && cv.getContext && cv.getContext("2d"); } catch (e) { ctx = null; }
      if (!ctx) return;
      try { mq = G.matchMedia("(prefers-reduced-motion: reduce)"); } catch (e) {}
      setup();
      start();
      G.addEventListener("resize", onResize, { passive: true });
      G.addEventListener("orientationchange", function () { setTimeout(onResize, 250); }, { passive: true });
      doc.addEventListener("visibilitychange", function () { if (doc.hidden) stop(); else start(); });
      if (mq) {
        var onMq = function () { if (reduced()) { stop(); drawStatic(); } else start(); };
        if (mq.addEventListener) mq.addEventListener("change", onMq); else if (mq.addListener) mq.addListener(onMq);
      }
    }
    return { init: init };
  })();

  /* ============ 18 boot ============ */
  /* Icon links are added here, not in the markup, so a single-file build never inlines more copies of the
     logo; on the app's own domain they resolve to the real files next to index.html (all paths relative). */
  function pwa() {
    [["icon", "icon-192.png", "image/png"], ["apple-touch-icon", "apple-touch-icon.png", ""]].forEach(function (l) {
      if (doc.querySelector('link[rel="' + l[0] + '"]')) return;
      var el = doc.createElement("link");
      el.rel = l[0]; el.href = l[1];
      if (l[2]) el.type = l[2];
      doc.head.appendChild(el);
    });
    /* the service worker caches the app shell for offline use; only on http(s), where it is available */
    try {
      if ("serviceWorker" in G.navigator && /^https?:$/.test(G.location.protocol)) {
        G.addEventListener("load", function () { G.navigator.serviceWorker.register("sw.js").catch(function () {}); });
      }
    } catch (e) {}
  }
  function safe(name, fn) { try { fn(); } catch (e) { try { console.error("ƐMU YƐ · " + name, e); } catch (er) {} } }
  safe("logo", initLogo);
  safe("pwa", pwa);
  safe("acts", Acts.init);
  safe("ui", UI.init);
  safe("player", Player.init);
  safe("lyrics", Lyrics.init);
  safe("library", Library.init);
  safe("search", SearchUI.init);
  safe("extras", Extras.init);
  safe("coll", Coll.init);
  safe("radio", RadioUI.init);
  safe("bot", Bot.init);
  safe("dust", Dust.init);
  Store.persist();

  /* the namespace, for the console and tests */
  var api = {
    version: "2.0",
    store: Store, settings: Settings, net: Net, mx: MX,
    sources: { deezer: Deezer, itunes: ITunes, audius: Audius, youtube: YouTube, jamendo: Jamendo, free: FreeSongs, archive: Archive, radio: Radio },
    search: Search, media: Media, player: Player, library: Library, lyrics: Lyrics, bot: Bot,
    ui: { show: UI.show, search: SearchUI, extras: Extras, coll: Coll, radio: RadioUI, acts: Acts },
    selfTest: MX.selfTest,
    art: function () { return ART; }
  };
  Object.keys(api).forEach(function (k) { EMU[k] = api[k]; });
})(window);
