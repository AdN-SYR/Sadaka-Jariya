// =========================================================
// quran.js — طبقة "القرآن الكريم" داخل نفس الصفحة (لا تمس العدّاد ولا Supabase)
// نص القرآن يُحمَّل من quran.json عند فتح القسم فقط.
// =========================================================
(function () {
  'use strict';

  // [الاسم، المكان، عدد الآيات] — مرتبة من 1 إلى 114
  const META = [["الفاتحة","مكية",7],["البقرة","مدنية",286],["آل عمران","مدنية",200],["النساء","مدنية",176],["المائدة","مدنية",120],["الأنعام","مكية",165],["الأعراف","مكية",206],["الأنفال","مدنية",75],["التوبة","مدنية",129],["يونس","مكية",109],["هود","مكية",123],["يوسف","مكية",111],["الرعد","مدنية",43],["إبراهيم","مكية",52],["الحجر","مكية",99],["النحل","مكية",128],["الإسراء","مكية",111],["الكهف","مكية",110],["مريم","مكية",98],["طه","مكية",135],["الأنبياء","مكية",112],["الحج","مدنية",78],["المؤمنون","مكية",118],["النور","مدنية",64],["الفرقان","مكية",77],["الشعراء","مكية",227],["النمل","مكية",93],["القصص","مكية",88],["العنكبوت","مكية",69],["الروم","مكية",60],["لقمان","مكية",34],["السجدة","مكية",30],["الأحزاب","مدنية",73],["سبأ","مكية",54],["فاطر","مكية",45],["يس","مكية",83],["الصافات","مكية",182],["ص","مكية",88],["الزمر","مكية",75],["غافر","مكية",85],["فصلت","مكية",54],["الشورى","مكية",53],["الزخرف","مكية",89],["الدخان","مكية",59],["الجاثية","مكية",37],["الأحقاف","مكية",35],["محمد","مدنية",38],["الفتح","مدنية",29],["الحجرات","مدنية",18],["ق","مكية",45],["الذاريات","مكية",60],["الطور","مكية",49],["النجم","مكية",62],["القمر","مكية",55],["الرحمن","مدنية",78],["الواقعة","مكية",96],["الحديد","مدنية",29],["المجادلة","مدنية",22],["الحشر","مدنية",24],["الممتحنة","مدنية",13],["الصف","مدنية",14],["الجمعة","مدنية",11],["المنافقون","مدنية",11],["التغابن","مدنية",18],["الطلاق","مدنية",12],["التحريم","مدنية",12],["الملك","مكية",30],["القلم","مكية",52],["الحاقة","مكية",52],["المعارج","مكية",44],["نوح","مكية",28],["الجن","مكية",28],["المزمل","مكية",20],["المدثر","مكية",56],["القيامة","مكية",40],["الإنسان","مدنية",31],["المرسلات","مكية",50],["النبأ","مكية",40],["النازعات","مكية",46],["عبس","مكية",42],["التكوير","مكية",29],["الانفطار","مكية",19],["المطففين","مكية",36],["الانشقاق","مكية",25],["البروج","مكية",22],["الطارق","مكية",17],["الأعلى","مكية",19],["الغاشية","مكية",26],["الفجر","مكية",30],["البلد","مكية",20],["الشمس","مكية",15],["الليل","مكية",21],["الضحى","مكية",11],["الشرح","مكية",8],["التين","مكية",8],["العلق","مكية",19],["القدر","مكية",5],["البينة","مدنية",8],["الزلزلة","مدنية",8],["العاديات","مكية",11],["القارعة","مكية",11],["التكاثر","مكية",8],["العصر","مكية",3],["الهمزة","مكية",9],["الفيل","مكية",5],["قريش","مكية",4],["الماعون","مكية",7],["الكوثر","مكية",3],["الكافرون","مكية",6],["النصر","مدنية",3],["المسد","مكية",5],["الإخلاص","مكية",4],["الفلق","مكية",5],["الناس","مكية",6]];

  const KEY_POS = 'quran_pos';
  const KEY_PREF = 'quran_pref';
  const BASMALA_SKIP = [0, 8];   // الفاتحة (البسملة آية فيها) والتوبة

  let data = null;       // مصفوفة السور من quran.json
  let loading = null;
  let overlay = null;
  let view = null;       // null | 'list' | 'read'
  let cur = 0;           // رقم السورة الحالية (من 0)
  let pref = { size: 36, theme: 'cream' };
  let saveTimer = null;

  // ---------- أدوات ----------
  const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const norm = s => String(s)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').trim();

  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function loadData() {
    if (data) return Promise.resolve(data);
    if (!loading) {
      loading = fetch('quran.json')
        .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
        .then(j => (data = j.s))
        .catch(e => { loading = null; throw e; });
    }
    return loading;
  }

  // ---------- بناء الواجهة ----------
  function build() {
    overlay = document.createElement('div');
    overlay.id = 'quranOverlay';
    overlay.className = 'q-overlay';
    overlay.hidden = true;
    overlay.innerHTML =
      '<div class="q-list-view">' +
        '<div class="q-bar">' +
          '<button class="q-btn q-close" aria-label="إغلاق">✕</button>' +
          '<div class="q-title">القرآن الكريم</div>' +
          '<span class="q-spacer"></span>' +
        '</div>' +
        '<div class="q-search-wrap"><input class="q-search" type="search" placeholder="ابحث عن سورة بالاسم أو الرقم"></div>' +
        '<div class="q-scroll">' +
          '<button class="q-resume" hidden><div><small>تابع القراءة</small><strong></strong></div><span>←</span></button>' +
          '<div class="q-list"></div>' +
        '</div>' +
      '</div>' +
      '<div class="q-read-view" hidden>' +
        '<div class="q-bar">' +
          '<button class="q-btn q-back" aria-label="رجوع">→</button>' +
          '<div class="q-title q-read-title"></div>' +
          '<button class="q-btn q-aa" aria-label="إعدادات الخط">Aa</button>' +
        '</div>' +
        '<div class="q-settings" hidden>' +
          '<div class="q-size"><button class="q-minus" aria-label="تصغير">−</button><output class="q-size-val"></output><button class="q-plus" aria-label="تكبير">+</button></div>' +
          '<div class="q-theme">' +
            '<button class="q-dot-cream" data-t="cream" aria-label="كريمي"></button>' +
            '<button class="q-dot-light" data-t="light" aria-label="فاتح"></button>' +
            '<button class="q-dot-dark" data-t="dark" aria-label="داكن"></button>' +
          '</div>' +
        '</div>' +
        '<div class="q-scroll q-read-scroll">' +
          '<div class="q-basmala" hidden></div>' +
          '<p class="q-text"></p>' +
          '<div class="q-nav"><button class="q-prev">→ السورة السابقة</button><button class="q-next">السورة التالية ←</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);

    const q = s => overlay.querySelector(s);

    q('.q-close').onclick = () => history.back();
    q('.q-back').onclick = () => history.back();
    q('.q-search').addEventListener('input', renderList);
    q('.q-resume').onclick = () => {
      const p = lsGet(KEY_POS);
      if (p) openSurah(p.s, p.r || 0);
    };
    q('.q-aa').onclick = () => { const s = q('.q-settings'); s.hidden = !s.hidden; };
    q('.q-minus').onclick = () => setSize(pref.size - 2);
    q('.q-plus').onclick = () => setSize(pref.size + 2);
    overlay.querySelectorAll('.q-theme button').forEach(b => { b.onclick = () => setTheme(b.dataset.t); });
    q('.q-prev').onclick = () => { if (cur > 0) showSurah(cur - 1, 0); };
    q('.q-next').onclick = () => { if (cur < 113) showSurah(cur + 1, 0); };
    q('.q-read-scroll').addEventListener('scroll', () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(savePos, 400);
    });

    const saved = lsGet(KEY_PREF);
    if (saved) {
      if (typeof saved.size === 'number') pref.size = Math.min(72, Math.max(20, saved.size));
      if (['cream', 'light', 'dark'].includes(saved.theme)) pref.theme = saved.theme;
    }
    applyPref();
  }

  function applyPref() {
    overlay.classList.remove('q-theme-cream', 'q-theme-light', 'q-theme-dark');
    overlay.classList.add('q-theme-' + pref.theme);
    overlay.querySelector('.q-text').style.fontSize = pref.size + 'px';
    overlay.querySelector('.q-basmala').style.fontSize = Math.round(pref.size * 0.85) + 'px';
    overlay.querySelector('.q-size-val').textContent = toAr(pref.size);
    overlay.querySelectorAll('.q-theme button').forEach(b => b.classList.toggle('on', b.dataset.t === pref.theme));
  }
  function setSize(n) { pref.size = Math.min(72, Math.max(20, n)); lsSet(KEY_PREF, pref); applyPref(); }
  function setTheme(t) { pref.theme = t; lsSet(KEY_PREF, pref); applyPref(); }

  // ---------- قائمة السور ----------
  function renderList() {
    const box = overlay.querySelector('.q-list');
    const term = norm(overlay.querySelector('.q-search').value);
    box.textContent = '';
    let shown = 0;
    META.forEach((m, i) => {
      if (term && !(norm(m[0]).includes(term) || String(i + 1) === term)) return;
      const b = document.createElement('button');
      b.className = 'q-row';
      const badge = document.createElement('span');
      badge.className = 'q-badge'; badge.textContent = toAr(i + 1);
      const info = document.createElement('div');
      const nm = document.createElement('div');
      nm.className = 'q-row-name'; nm.textContent = 'سورة ' + m[0];
      const sub = document.createElement('div');
      sub.className = 'q-row-sub'; sub.textContent = m[1] + ' - ' + toAr(m[2]) + ' آية';
      info.append(nm, sub);
      b.append(badge, info);
      b.onclick = () => openSurah(i, 0);
      box.appendChild(b);
      shown++;
    });
    if (!shown) {
      const e = document.createElement('div');
      e.className = 'q-empty'; e.textContent = 'لا توجد نتائج';
      box.appendChild(e);
    }
    const p = lsGet(KEY_POS);
    const rb = overlay.querySelector('.q-resume');
    if (p && META[p.s]) {
      rb.hidden = false;
      rb.querySelector('strong').textContent = 'سورة ' + META[p.s][0];
    } else rb.hidden = true;
  }

  // ---------- العرض ----------
  function setView(v) {
    view = v;
    overlay.querySelector('.q-list-view').hidden = v !== 'list';
    overlay.querySelector('.q-read-view').hidden = v !== 'read';
  }

  function showList() {
    savePos();
    setView('list');
    renderList();
  }

  function renderSurah(i, ratio) {
    const sc = overlay.querySelector('.q-read-scroll');
    const text = overlay.querySelector('.q-text');
    const bas = overlay.querySelector('.q-basmala');
    cur = i;
    overlay.querySelector('.q-read-title').textContent = 'سورة ' + META[i][0];
    overlay.querySelector('.q-prev').disabled = i === 0;
    overlay.querySelector('.q-next').disabled = i === 113;

    if (!data) {
      text.textContent = 'جارٍ التحميل...';
      bas.hidden = true;
      return;
    }
    const verses = data[i];
    if (BASMALA_SKIP.includes(i)) bas.hidden = true;
    else { bas.hidden = false; bas.textContent = data[0][0]; }   // البسملة من نص تنزيل نفسه

    const frag = document.createDocumentFragment();
    verses.forEach((v, k) => {
      frag.appendChild(document.createTextNode(v + ' '));
      const m = document.createElement('span');
      m.className = 'q-end';
      m.textContent = '﴿' + toAr(k + 1) + '﴾';
      frag.appendChild(m);
      frag.appendChild(document.createTextNode(' '));
    });
    text.textContent = '';
    text.appendChild(frag);
    sc.scrollTop = ratio ? ratio * sc.scrollHeight : 0;
  }

  function showSurah(i, ratio) {
    renderSurah(i, ratio);
    savePos(i, ratio);
    if (!data) {
      loadData().then(() => { if (view === 'read' && cur === i) renderSurah(i, ratio); })
        .catch(() => {
          const t = overlay.querySelector('.q-text');
          t.textContent = '';
          const d = document.createElement('div');
          d.className = 'q-error';
          d.textContent = 'تعذّر تحميل النص، تحقق من الاتصال بالإنترنت.';
          const b = document.createElement('button');
          b.textContent = 'إعادة المحاولة';
          b.onclick = () => showSurah(i, ratio);
          d.appendChild(document.createElement('br'));
          d.appendChild(b);
          t.appendChild(d);
        });
    }
  }

  function openSurah(i, ratio) {
    if (!META[i]) return;
    history.pushState({ q: 'read' }, '');
    setView('read');
    overlay.querySelector('.q-settings').hidden = true;
    showSurah(i, ratio);
  }

  function savePos(i, ratio) {
    if (view !== 'read' && i === undefined) return;
    const sc = overlay.querySelector('.q-read-scroll');
    const idx = i === undefined ? cur : i;
    const r = ratio !== undefined ? ratio :
      (sc.scrollHeight > sc.clientHeight ? sc.scrollTop / sc.scrollHeight : 0);
    lsSet(KEY_POS, { s: idx, r: r });
  }

  // ---------- فتح وإغلاق ----------
  window.openQuran = function (e) {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const side = document.getElementById('sideMenu');
    if (side) side.classList.remove('active');
    if (!overlay) build();
    if (view) return;
    history.pushState({ q: 'list' }, '');
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    setView('list');
    renderList();
    loadData().catch(() => {});   // تحميل مسبق للنص
  };

  function closeAll() {
    if (!overlay) return;
    savePos();
    overlay.hidden = true;
    view = null;
    document.body.style.overflow = '';
  }

  window.addEventListener('popstate', () => {
    if (view === 'read') showList();
    else if (view === 'list') closeAll();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && view) history.back();
  });

  // ---------- مصدر النص داخل "عن التطبيق" فقط ----------
  const origTab = window.openTabModal;
  if (typeof origTab === 'function') {
    window.openTabModal = function (i) {
      origTab.apply(this, arguments);
      if (i === 3) {
        const b = document.getElementById('tabModalBody');
        if (b) {
          b.appendChild(document.createElement('br'));
          b.appendChild(document.createElement('br'));
          b.appendChild(document.createTextNode('نص القرآن الكريم من مشروع تنزيل: '));
          const a = document.createElement('a');
          a.href = 'https://tanzil.net'; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'tanzil.net';
          b.appendChild(a);
        }
      }
    };
  }
})();
