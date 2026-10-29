(function () {
  'use strict';
  var PREFIX = 'v1';
  var $ = function (id) { return document.getElementById(id); };
  var DRAFT_KEY = 'tempnote.draft', THEME_KEY = 'tempnote.theme';

  // ---- encoding: deflate-raw + base64url ----
  function toB64u(bytes) {
    var s = ''; for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function fromB64u(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var s = atob(str), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  async function pipe(bytes, stream) {
    var out = new Blob([bytes]).stream().pipeThrough(stream);
    return new Uint8Array(await new Response(out).arrayBuffer());
  }
  async function encodeNote(text, expiresAt) {
    var z = await pipe(new TextEncoder().encode(text), new CompressionStream('deflate-raw'));
    return PREFIX + '.' + (expiresAt ? expiresAt.toString(36) : '0') + '.' + toB64u(z);
  }
  async function decodeNote(hash) {
    var p = hash.split('.');
    if (p.length !== 3 || p[0] !== PREFIX) throw new Error('bad link');
    var exp = p[1] === '0' ? 0 : parseInt(p[1], 36);
    if (isNaN(exp)) throw new Error('bad link');
    var raw = await pipe(fromB64u(p[2]), new DecompressionStream('deflate-raw'));
    return { text: new TextDecoder().decode(raw), expiresAt: exp };
  }
  window.TempNote = { encodeNote: encodeNote, decodeNote: decodeNote };

  // ---- ui ----
  var toastT;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    toast('Copied');
  }

  function setTheme(t) { document.documentElement.setAttribute('data-theme', t); localStorage.setItem(THEME_KEY, t); }
  setTheme(localStorage.getItem(THEME_KEY) || 'light');
  $('themeBtn').onclick = function () {
    setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  };

  var note = $('note');
  function updateCount() { $('count').textContent = note.value.length + ' chars'; }
  note.addEventListener('input', function () { localStorage.setItem(DRAFT_KEY, note.value); updateCount(); $('result').hidden = true; });

  $('genBtn').onclick = async function () {
    if (!note.value.trim()) return toast('Write something first');
    var ms = parseInt($('expiry').value, 10);
    var hash = await encodeNote(note.value, ms ? Date.now() + ms : 0);
    var url = location.origin + location.pathname + '#' + hash;
    $('linkOut').value = url; $('result').hidden = false;
    $('linkOut').select();
    if (url.length > 8000) toast('Long link (' + url.length + ' chars) - some apps may truncate it');
  };
  $('copyLinkBtn').onclick = function () { copy($('linkOut').value); };
  $('clearBtn').onclick = function () { note.value = ''; localStorage.removeItem(DRAFT_KEY); $('result').hidden = true; updateCount(); note.focus(); };

  function showEditor(text) {
    $('viewer').hidden = true; $('editor').hidden = false;
    if (text !== undefined) { note.value = text; localStorage.setItem(DRAFT_KEY, text); }
    else note.value = localStorage.getItem(DRAFT_KEY) || '';
    $('result').hidden = true; updateCount();
  }
  function showViewer(msg, text, canCopy) {
    $('editor').hidden = true; $('viewer').hidden = false;
    $('viewMeta').textContent = msg; $('viewText').textContent = text || '';
    $('copyTextBtn').hidden = $('editCopyBtn').hidden = !canCopy;
  }
  var current = '';
  $('copyTextBtn').onclick = function () { copy(current); };
  $('editCopyBtn').onclick = function () { history.replaceState(null, '', location.pathname); showEditor(current); };
  $('newBtn').onclick = function () { history.replaceState(null, '', location.pathname); showEditor(); };

  async function route() {
    var h = location.hash.slice(1);
    if (!h) return showEditor();
    try {
      var d = await decodeNote(h);
      if (d.expiresAt && Date.now() > d.expiresAt) {
        return showViewer('This link expired on ' + new Date(d.expiresAt).toLocaleString() + '.', '', false);
      }
      current = d.text;
      showViewer(d.expiresAt ? 'Read-only. Expires ' + new Date(d.expiresAt).toLocaleString() : 'Read-only. Never expires.', d.text, true);
    } catch (e) {
      showViewer('This link is invalid or was truncated.', '', false);
    }
  }
  window.addEventListener('hashchange', route);
  route();
})();
