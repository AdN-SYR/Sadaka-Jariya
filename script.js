// =========================================================
// 1. مفاتيح الربط الخاصة بك في Supabase
// =========================================================
const SUPABASE_URL = 'https://dhptwlwchbqyeayczitm.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_zoi9hXqIvG9bBPMyd37Vig_UjCKvu1F'; 

let db = null;
try {
  if (typeof supabase !== 'undefined' && SUPABASE_ANON_KEY) {
    db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (e) {
  console.warn("تعذر تهيئة Supabase، يعمل التطبيق محلياً الآن:", e);
}

// =========================================================
// 2. مصفوفة الأذكار الأساسية (بنفس الصياغة النصية الدقيقة)
// =========================================================
const azkar = [
  { name: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ", target: 25 },
  { name: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ", target: 25 },
  { name: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّينَا مُحَمَّد", target: 25 },
  { name: "سُبْحَانَ اللَّهِ", target: 25 },
  { name: "الْحَمْدُ لِلَّهِ", target: 25 },
  { name: "لَا إلَهَ إلَّا اللَّهُ", target: 25 },
  { name: "اللَّهُ أَكْبَرُ", target: 25 },
  { name: "لَا حَوْلَ وَلَا قُوَّةَ إلَّا بِاَللَّهِ", target: 25 }
];

let currentIndex = 0;
let currentCount = 0;
let pendingBatchCount = 0;
let batchTimer = null;

const tabData = {
  1: { title: "فضل الذكر والدعاء", body: "عَنْ أَبِي الدَّرْدَاءِ رَضِيَ اللَّهُ عَنْهُ أَنَّ رَسُولَ اللَّهِ ﷺ قَالَ: إلَّا أُنَبِّئُكُمْ بِخَيْرِ أَعْمَالِكُمْ وَأَزْكَاهَا عِنْدَ مَلِيكِكُمْ، وَأَرْفَعِهَا فِي دَرَجَاتِكُمْ، وَخَيْرٍ لَكُمْ مِنْ إنْفَاقِ الذَّهَبِ وَالْوَرِقِ، وَخَيْرٍ لَكُمْ مِنْ أَنَّ تَلْقَوْا عَدُوَّكُمْ فَتَضْرِبُوا أَعْنَاقَهُمْ وَيَضْرِبُوا أَعْنَاقَكُمْ؟ قَالُوا: بَلَى، قَالَ: ذَكَرَ اللَّهُ تَعَالَى" },
  2: { title: "أوقات مستحبة للذكر", body: "دُبر الصلوات المكتوبة، وفي أذكار الصباح والمساء، وقبل النوم؛." },
  3: { title: "عن التطبيق", body: "صدقة جارية لروح المرحوم الشيخ جُنيد فارس نجار تغمده الله بواسع رحمته." },
  4: { title: "مشاركة الأجر", body: "قال النبي ﷺ: 'الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ'. شارك التطبيق مع عائلتك وأصدقائك." }
};

// =========================================================
// 3. بصمة الجهاز الفريدة (Device Fingerprinting)
// =========================================================
async function generateDeviceFingerprint() {
  let deviceId = localStorage.getItem('dhikr_device_id');
  if (deviceId) return deviceId;

  const rawComponents = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset()
  ].join('||');

  try {
    const msgUint8 = new TextEncoder().encode(rawComponents);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    deviceId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2);
  }

  localStorage.setItem('dhikr_device_id', deviceId);
  return deviceId;
}

// =========================================================
// 4. تحديد دولة الزائر مع التخزين المحلي (Caching)
// =========================================================
async function getVisitorCountry() {
  const cachedCountry = localStorage.getItem('dhikr_user_country');
  if (cachedCountry) return cachedCountry;

  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    const country = data.country_name || 'غير معروف';
    localStorage.setItem('dhikr_user_country', country);
    return country;
  } catch (error) {
    return 'غير معروف';
  }
}

// =========================================================
// 5. تسجيل حركة الزائر والجهاز في Supabase
// =========================================================
async function registerVisitorSession() {
  if (!db) return;
  const deviceId = await generateDeviceFingerprint();
  const country = await getVisitorCountry();

  if (!sessionStorage.getItem('session_registered')) {
    try {
      await db.from('visitors_log').upsert({
        device_id: deviceId,
        country: country,
        last_visit: new Date()
      }, { onConflict: 'device_id' });

      sessionStorage.setItem('session_registered', 'true');
    } catch (err) {
      console.warn('تسجيل الزائر محلياً لعدم توفر الاتصال حالياً.');
    }
  }
}

// =========================================================
// 6. جلب الإحصائيات الموحدة من Supabase (تتضمن اليوم والأسبوع)
// =========================================================
async function fetchGlobalStats() {
  if (!db) return;
  const active = azkar[currentIndex];

  try {
    // 1. إجمالي الذكر الحالي
    const { data: dhikrData } = await db
      .from('dhikr_counters')
      .select('current_count')
      .eq('dhikr_name', active.name)
      .maybeSingle();

    const accumulatedTotal = dhikrData ? dhikrData.current_count : 0;
    const accumulatedEl = document.getElementById('dhikrAccumulatedTotal');
    if (accumulatedEl) accumulatedEl.innerText = accumulatedTotal.toLocaleString();

    // 2. إجمالي التسابيح الكلي
    const { data: allAzkar } = await db.from('dhikr_counters').select('current_count');
    const totalGlobal = allAzkar ? allAzkar.reduce((sum, item) => sum + (item.current_count || 0), 0) : 0;
    
    const totalEl = document.getElementById('statTotal');
    if (totalEl) totalEl.innerText = totalGlobal.toLocaleString();

    // 3. عدد الذاكرين
    const { count: usersCount } = await db.from('visitors_log').select('*', { count: 'exact', head: true });
    const usersEl = document.getElementById('statUsers');
    if (usersEl) usersEl.innerText = (usersCount || 0).toLocaleString();

    // 4. إحصائيات اليوم والأسبوع الموحدة عالمياً
    const { data: timeStats } = await db.from('global_stats').select('id, count');
    if (timeStats) {
      timeStats.forEach(stat => {
        if (stat.id === 'today') {
          const todayEl = document.getElementById('statToday');
          if (todayEl) todayEl.innerText = Number(stat.count).toLocaleString();
        }
        if (stat.id === 'week') {
          const weekEl = document.getElementById('statWeek');
          if (weekEl) weekEl.innerText = Number(stat.count).toLocaleString();
        }
      });
    }

  } catch (err) {
    console.warn('جاري استخدام الإحصائيات المحلية:', err);
  }
}

// =========================================================
// 7. تقنية الدفعات التجميعية للتسبيح (Batching)
// =========================================================
async function flushDhikrBatch() {
  if (pendingBatchCount <= 0 || !db) return;

  const countToSend = pendingBatchCount;
  pendingBatchCount = 0;
  const active = azkar[currentIndex];

  try {
    // زيادة إجمالي الذكر الحالي
    await db.rpc('increment_dhikr', {
      d_name: active.name,
      increment_by: countToSend
    });

    // زيادة إحصائيات اليوم والأسبوع الموحدة
    await db.rpc('increment_time_stats', {
      inc_val: countToSend
    });

    fetchGlobalStats();
  } catch (err) {
    console.warn('تعذر إرسال الدفعة، جاري الاحتفاظ بها محلياً:', err);
    pendingBatchCount += countToSend;
  }
}

function increment() {
  const active = azkar[currentIndex];

  currentCount++;
  pendingBatchCount++;

  if (navigator.vibrate) navigator.vibrate(8);

  updateUI();

  if (pendingBatchCount >= 20) {
    if (batchTimer) clearTimeout(batchTimer);
    flushDhikrBatch();
  } else {
    if (batchTimer) clearTimeout(batchTimer);
    batchTimer = setTimeout(flushDhikrBatch, 5000);
  }

  if (currentCount >= active.target) {
    if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    setTimeout(forceNextDhikr, 400);
  }
}

// =========================================================
// 8. التحكم والواجهة ورسم الدائرة
// =========================================================
function updateUI() {
  const active = azkar[currentIndex];

  const currentEl = document.getElementById('currentCount');
  const targetEl = document.getElementById('targetCount');
  const select = document.getElementById('dhikrSelect');
  const nameLabel = document.getElementById('dhikrNameLabel');
  const circle = document.getElementById('progressCircle');

  if (currentEl) currentEl.innerText = currentCount;
  if (targetEl) targetEl.innerText = active.target;
  if (select) select.value = currentIndex;
  if (nameLabel) nameLabel.innerText = active.name;

  // إصلاح رسم الدائرة بدقة عند الصفر
  if (circle) {
    const radius = 105;
    const circumference = 2 * Math.PI * radius;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;

    const progress = Math.min(currentCount / active.target, 1);
    const offset = circumference - (progress * circumference);
    circle.style.strokeDashoffset = offset;
  }
}

function forceNextDhikr() {
  flushDhikrBatch();
  currentIndex = (currentIndex + 1) % azkar.length;
  currentCount = 0;
  updateUI();
  fetchGlobalStats();
}

function nextDhikr() {
  const active = azkar[currentIndex];
  if (currentCount < active.target) {
    alert(`عذراً، يجب إكمال هدف هذا الذكر أولاً (${currentCount} / ${active.target}) قبل الانتقال للذكر التالي.`);
    return;
  }
  forceNextDhikr();
}

// تقييد القائمة المنسدلة لمنع التغيير إلا بعد إكمال الهدف
function changeDhikr() {
  const select = document.getElementById('dhikrSelect');
  const active = azkar[currentIndex];

  if (currentCount < active.target) {
    alert(`يجب إكمال هذا الذكر أولاً قبل التغيير (${currentCount} / ${active.target}).`);
    select.value = currentIndex;
    return;
  }

  if (select) {
    flushDhikrBatch();
    currentIndex = parseInt(select.value, 10);
    currentCount = 0;
    updateUI();
    fetchGlobalStats();
  }
}

function resetCount() {
  currentCount = 0;
  updateUI();
}

// =========================================================
// 9. المشاركة والنوافذ المنبثقة
// =========================================================
function shareApp(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const shareData = {
    title: 'تطبيق العداد الرقمي - صدقة جارية',
    text: 'شاركونا الأجر في العداد الرقمي الموحد للأذكار (صدقة جارية لروح المرحوم الشيخ جُنيد فارس نجار):',
    url: window.location.href
  };

  if (navigator.share) {
    navigator.share(shareData).catch(() => {});
  } else {
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`;
    window.open(whatsappUrl, '_blank');
  }
}

function populateSelect() {
  const select = document.getElementById('dhikrSelect');
  if (!select) return;
  select.innerHTML = '';
  azkar.forEach((item, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = item.name;
    select.appendChild(option);
  });
  select.value = currentIndex;
}

function openTabModal(tabIndex, e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const modal = document.getElementById('tabModal');
  const title = document.getElementById('tabModalTitle');
  const body = document.getElementById('tabModalBody');
  const sideMenu = document.getElementById('sideMenu');

  if (tabData[tabIndex] && modal) {
    title.innerText = tabData[tabIndex].title;
    body.innerText = tabData[tabIndex].body;
    modal.style.display = 'flex';
  }

  if (sideMenu) sideMenu.classList.remove('active');
}

function closeTabModal() {
  const modal = document.getElementById('tabModal');
  if (modal) modal.style.display = 'none';
}

// =========================================================
// 10. التهيئة المباشرة
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
  populateSelect();
  updateUI();

  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');

  if (menuBtn && sideMenu) {
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      sideMenu.classList.toggle('active');
    };

    document.onclick = (e) => {
      if (!sideMenu.contains(e.target) && !menuBtn.contains(e.target)) {
        sideMenu.classList.remove('active');
      }
    };
  }

  const menuLinks = document.querySelectorAll('#sideMenu ul li a');
  menuLinks.forEach((link, idx) => {
    link.onclick = (e) => openTabModal(idx + 1, e);
  });

  registerVisitorSession();
  fetchGlobalStats();

  window.addEventListener('beforeunload', () => {
    flushDhikrBatch();
  });
});
