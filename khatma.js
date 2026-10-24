// =========================================================
// khatma.js — ختمة القرآن الكريم المشتركة (30 جزءاً)
// ملف واحد: الواجهة + التنسيق + المنطق. يستعمل اتصال Supabase والدخول المجهول
// الموجودين في script.js (المتغير db والدالة ensureAuth)، ولا يمس العدّاد.
// =========================================================
(function () {
  'use strict';

  const POLL_MS = 30000;
  const TOTAL = 30;

  let overlay = null;
  let open = false;
  let parts = [];
  let info = { completed: 0, no: 1 };
  let loaded = false;
  let busy = false;
  let pollTimer = null;
  let toastTimer = null;

  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

  // ---------- الاتصال ----------
  function client() {
    try { return (typeof db !== 'undefined' && db) ? db : null; } catch (e) { return null; }
  }
  async function authOk() {
    try { if (typeof ensureAuth === 'function') return await ensureAuth(); } catch (e) {}
    return false;
  }
  async function call(fn, args) {
    const c = client();
    if (!c) throw new Error('nodb');
    if (!(await authOk())) throw new Error('noauth');
    const { data, error } = await c.rpc(fn, args || {});
    if (error) throw error;
    return data;
  }

  // ---------- التنسيق (كل الأسماء تبدأ بـ k-) ----------
  const CSS = `
.k-overlay{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;background:#f4f1ea;color:#1f3324;
font-family:'Cairo',sans-serif;direction:rtl;padding-bottom:env(safe-area-inset-bottom,0px)}
.k-overlay *{box-sizing:border-box}
.k-overlay[hidden],.k-overlay [hidden]{display:none!important}
.k-bar{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;padding-top:calc(12px + env(safe-area-inset-top,0px));
background-color:#1f3324;color:#f4f1ea;background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px);background-size:14px 14px}
.k-title{flex:1;text-align:center;font-weight:700;font-size:1.15rem}
.k-btn{min-width:42px;height:42px;border:none;border-radius:12px;background:rgba(255,255,255,.14);color:inherit;font:inherit;font-weight:700;font-size:1.05rem;cursor:pointer}
.k-spacer{width:42px}
.k-scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:12px 14px 28px}
.k-sum{display:flex;gap:10px;margin-bottom:10px}
.k-sum div{flex:1;background:#fff;border:1px solid #e0dad0;border-radius:14px;padding:10px;text-align:center}
.k-sum small{display:block;color:#707a73;font-size:.8rem}
.k-sum strong{font-size:1.3rem;color:#095714}
.k-prog{height:10px;background:#e0dad0;border-radius:6px;overflow:hidden;margin-bottom:12px}
.k-prog i{display:block;height:100%;width:0;background:#2d6a4f;border-radius:6px;transition:width .4s ease}
.k-mine{background:#eef0f2;border:2px solid #B0B7BF;border-radius:16px;padding:12px 14px;margin-bottom:12px}
.k-mine p{margin:0 0 10px;font-size:.95rem;line-height:1.7}
.k-mine-btns{display:flex;gap:8px}
.k-mine-btns button,.k-sheet-row button{flex:1;padding:12px;border:none;border-radius:12px;font:inherit;font-weight:700;font-size:.95rem;cursor:pointer}
.k-ok{background:#1f3324;color:#fff}
.k-no{background:#fff;color:#4a574e;border:1px solid #e0dad0!important}
.k-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.k-part{border-radius:14px;padding:12px 4px;text-align:center;border:1px solid #e0dad0;font:inherit;cursor:pointer;color:#1f3324;background:#fff}
.k-part b{display:block;font-size:1rem}
.k-part span{display:block;font-size:.8rem;margin-top:3px}
.k-free span{color:#707a73}
.k-chosen{background:#B0B7BF;border-color:#9aa2ab;color:#1f2933;cursor:default}
.k-chosen span{color:#2b3138}
.k-mineP{background:#B0B7BF;border:3px solid #2d6a4f;color:#1f2933;box-shadow:0 0 0 3px rgba(45,106,79,.2);cursor:default}
.k-read{background:#cfeedd;border-color:#7fc9a0;color:#0f4d2a;cursor:default}
.k-legend{display:flex;gap:14px;justify-content:center;font-size:.8rem;color:#707a73;margin:14px 0 4px}
.k-legend i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-left:5px;vertical-align:-1px;border:1px solid #9aa2ab}
.k-note{text-align:center;color:#707a73;font-size:.78rem;margin-top:8px;line-height:1.8}
.k-msg{text-align:center;color:#707a73;padding:40px 10px}
.k-msg button{margin-top:12px;padding:10px 18px;border:none;border-radius:12px;background:#1f3324;color:#fff;font:inherit;cursor:pointer}
.k-dim{position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:5}
.k-sheet{position:absolute;left:0;right:0;bottom:0;z-index:6;background:#fff;border-radius:24px 24px 0 0;padding:22px 18px 26px;text-align:center;padding-bottom:calc(26px + env(safe-area-inset-bottom,0px))}
.k-sheet h3{margin:0 0 6px;font-size:1.2rem}
.k-sheet p{margin:0 0 16px;color:#707a73;font-size:.95rem;line-height:1.9}
.k-sheet-row{display:flex;gap:10px}
.k-toast{position:absolute;left:50%;bottom:30px;transform:translateX(-50%);z-index:7;max-width:90%;padding:12px 18px;border-radius:14px;background:#1f3324;color:#f4f1ea;font-size:.95rem;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.25)}
`;

  function injectCss() {
    if (document.getElementById('khatmaStyle')) return;
    const st = document.createElement('style');
    st.id = 'khatmaStyle';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ---------- البناء ----------
  function build() {
    injectCss();
    overlay = document.createElement('div');
    overlay.id = 'khatmaOverlay';
    overlay.className = 'k-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="k-bar">' +
        '<button class="k-btn k-close" aria-label="إغلاق">✕</button>' +
        '<div class="k-title">ختمة القرآن الكريم</div>' +
        '<span class="k-spacer"></span>' +
      '</div>' +
      '<div class="k-scroll">' +
        '<div class="k-sum">' +
          '<div><small>ختمات مكتملة</small><strong class="k-completed">٠</strong></div>' +
          '<div><small>الختمة الحالية</small><strong class="k-current">٠ من ٣٠</strong></div>' +
        '</div>' +
        '<div class="k-prog"><i></i></div>' +
        '<div class="k-mine" hidden><p></p><div class="k-mine-btns">' +
          '<button class="k-ok k-done">أتممته ✓</button><button class="k-no k-cancel">إلغاء</button></div></div>' +
        '<div class="k-grid"></div>' +
        '<div class="k-legend">' +
          '<span><i style="background:#fff"></i>متاح</span>' +
          '<span><i style="background:#B0B7BF"></i>مختار</span>' +
          '<span><i style="background:#cfeedd"></i>مقروء</span>' +
        '</div>' +
        '<div class="k-note">اختر جزءاً واحداً، وبعد أن تتمّه يمكنك اختيار غيره.<br>مدة الحجز ٧٢ ساعة، ثم يعود الجزء متاحاً لغيرك.</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const q = s => overlay.querySelector(s);
    q('.k-close').onclick = () => history.back();
    q('.k-done').onclick = () => {
      const m = parts.find(x => x.m);
      if (!m) return;
      sheet('تأكيد الإتمام', 'هل أتممت قراءة الجزء ' + toAr(m.p) + ' كاملاً؟', 'نعم، أتممته', () => act('khatma_complete'));
    };
    q('.k-cancel').onclick = () => {
      const m = parts.find(x => x.m);
      if (!m) return;
      sheet('إلغاء الاختيار', 'هل تريد إلغاء اختيارك للجزء ' + toAr(m.p) + '؟', 'إلغاء الاختيار', () => act('khatma_cancel'));
    };
  }

  // ---------- الرسم ----------
  function render() {
    const q = s => overlay.querySelector(s);
    const grid = q('.k-grid');
    if (!loaded) return;
    const read = parts.filter(x => x.s === 'read').length;
    q('.k-completed').textContent = toAr(info.completed);
    q('.k-current').textContent = toAr(read) + ' من ' + toAr(TOTAL);
    q('.k-prog i').style.width = Math.round((read / TOTAL) * 100) + '%';

    const mine = parts.find(x => x.m);
    const mc = q('.k-mine');
    if (mine) {
      mc.hidden = false;
      mc.querySelector('p').textContent =
        'جزؤك: الجزء ' + toAr(mine.p) + (mine.h ? ' — ينتهي الحجز بعد ' + toAr(mine.h) + ' ساعة' : '');
    } else mc.hidden = true;

    grid.textContent = '';
    parts.forEach(x => {
      const b = document.createElement('button');
      let cls = 'k-free', lab = 'متاح';
      if (x.s === 'read') { cls = 'k-read'; lab = 'مقروء'; }
      else if (x.m) { cls = 'k-mineP'; lab = 'مختار · جزؤك'; }
      else if (x.s === 'chosen') { cls = 'k-chosen'; lab = 'مختار'; }
      b.className = 'k-part ' + cls;
      const t = document.createElement('b'); t.textContent = 'الجزء ' + toAr(x.p);
      const s = document.createElement('span'); s.textContent = lab;
      b.append(t, s);
      if (x.s === 'free') b.onclick = () => pick(x.p);
      grid.appendChild(b);
    });
  }

  function showMessage(text, withRetry) {
    const grid = overlay.querySelector('.k-grid');
    grid.textContent = '';
    const d = document.createElement('div');
    d.className = 'k-msg';
    d.style.gridColumn = '1 / -1';
    d.textContent = text;
    if (withRetry) {
      d.appendChild(document.createElement('br'));
      const b = document.createElement('button');
      b.textContent = 'إعادة المحاولة';
      b.onclick = () => { showMessage('جارٍ التحميل...'); refresh(false); };
      d.appendChild(b);
    }
    grid.appendChild(d);
  }

  function toast(text) {
    let t = overlay.querySelector('.k-toast');
    if (!t) { t = document.createElement('div'); t.className = 'k-toast'; overlay.appendChild(t); }
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
  }

  function sheet(title, text, okLabel, onOk) {
    closeSheet();
    const dim = document.createElement('div');
    dim.className = 'k-dim';
    const sh = document.createElement('div');
    sh.className = 'k-sheet';
    const h = document.createElement('h3'); h.textContent = title;
    const p = document.createElement('p'); p.textContent = text;
    const row = document.createElement('div'); row.className = 'k-sheet-row';
    const ok = document.createElement('button'); ok.className = 'k-ok'; ok.textContent = okLabel;
    const no = document.createElement('button'); no.className = 'k-no'; no.textContent = 'تراجع';
    ok.onclick = () => { closeSheet(); onOk(); };
    no.onclick = closeSheet;
    dim.onclick = closeSheet;
    row.append(ok, no);
    sh.append(h, p, row);
    overlay.append(dim, sh);
  }
  function closeSheet() {
    if (!overlay) return;
    overlay.querySelectorAll('.k-dim,.k-sheet').forEach(n => n.remove());
  }

  // ---------- العمليات ----------
  function errMsg(e) {
    const m = String((e && (e.message || e.details)) || '');
    if (m.includes('dhikr first')) return 'سبّح ولو مرة واحدة من الصفحة الرئيسية أولاً، ثم اختر جزءك.';
    if (m.includes('part taken')) return 'سبقك أحدٌ إلى هذا الجزء، اختر جزءاً آخر.';
    if (m.includes('already have') || m.includes('khatma_one_per_owner') || m.includes('duplicate'))
      return 'لديك جزء مختار بالفعل، أتمّه أولاً أو ألغِه.';
    if (m.includes('no part')) return 'لا يوجد جزء مختار باسمك.';
    return 'تعذّر تنفيذ العملية، حاول مرة أخرى.';
  }

  async function act(fn, args) {
    if (busy) return;
    busy = true;
    try { await call(fn, args); }
    catch (e) { toast(errMsg(e)); }
    busy = false;
    await refresh(true);
  }

  function pick(p) {
    if (parts.some(x => x.m)) { toast('لديك جزء مختار بالفعل، أتمّه أولاً أو ألغِه.'); return; }
    sheet('اختيار الجزء ' + toAr(p), 'سيصبح الجزء مختاراً باسمك لمدة ٧٢ ساعة، فإن لم تتمّه يعود متاحاً لغيرك.', 'اختيار',
      () => act('khatma_choose', { p_part: p }));
  }

  async function refresh(silent) {
    try {
      const d = await call('khatma_get');
      if (!d || !Array.isArray(d.parts)) throw new Error('bad');
      parts = d.parts;
      info = { completed: d.completed || 0, no: d.no || 1 };
      loaded = true;
      if (open) render();
    } catch (e) {
      if (!silent || !loaded) {
        if (open) showMessage('تعذّر تحميل الختمة، تحقق من الاتصال بالإنترنت.', true);
      }
    }
  }

  // ---------- فتح وإغلاق ----------
  window.openKhatma = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const side = document.getElementById('sideMenu');
    if (side) side.classList.remove('active');
    if (!overlay) build();
    if (open) return;
    history.pushState({ k: 1 }, '');
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    open = true;
    if (loaded) render(); else showMessage('جارٍ التحميل...');
    refresh(false);
    clearInterval(pollTimer);
    pollTimer = setInterval(() => {
      if (open && document.visibilityState === 'visible' && !busy) refresh(true);
    }, POLL_MS);
  };

  function closeAll() {
    if (!overlay) return;
    closeSheet();
    overlay.hidden = true;
    open = false;
    clearInterval(pollTimer);
    document.body.style.overflow = '';
  }

  window.addEventListener('popstate', () => { if (open) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) history.back(); });
})();
