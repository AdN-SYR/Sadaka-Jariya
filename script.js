

const SUPABASE_URL = 'https://dhptwlwchbqyeayczitm.supabase.co';

const SUPABASE_ANON_KEY = 'sb_publishable_zoi9hXqIvG9bBPMyd37Vig_UjCKvu1F';



let db = null;

try {

if (typeof supabase !== 'undefined') {

db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

}

} catch (e) {

console.warn('تعذر تهيئة Supabase، يعمل التطبيق محلياً:', e);

}





const azkar = [

{ name: "اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ", target: 33 },

{ name: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ", target: 33 },

{ name: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّينَا مُحَمَّد", target: 33 },

{ name: "سُبْحَانَ اللَّهِ", target: 33 },

{ name: "الْحَمْدُ لِلَّهِ", target: 33 },

{ name: "لَا إلَهَ إلَّا اللَّهُ", target: 33 },

{ name: "اللَّهُ أَكْبَرُ", target: 33 },

{ name: "لَا حَوْلَ وَلَا قُوَّةَ إلَّا بِاَللَّهِ الْعَلِيِّ الْعَظِيمُ", target: 33 }

];



const tabData = {

1: { title: "فضل الذكر والدعاء", body: "عَنْ أَبِي الدَّرْدَاءِ رَضِيَ اللَّهُ عَنْهُ أَنَّ رَسُولَ اللَّهِ ﷺ قَالَ: إلَّا أُنَبِّئُكُمْ بِخَيْرِ أَعْمَالِكُمْ وَأَزْكَاهَا عِنْدَ مَلِيكِكُمْ، وَأَرْفَعِهَا فِي دَرَجَاتِكُمْ، وَخَيْرٍ لَكُمْ مِنْ إنْفَاقِ الذَّهَبِ وَالْوَرِقِ، وَخَيْرٍ لَكُمْ مِنْ أَنَّ تَلْقَوْا عَدُوَّكُمْ فَتَضْرِبُوا أَعْنَاقَهُمْ وَيَضْرِبُوا أَعْنَاقَكُمْ؟ قَالُوا: بَلَى، قَالَ: ذَكَرَ اللَّهُ تَعَالَى" },

2: { title: "أوقات مستحبة للذكر", body: "دُبر الصلوات المكتوبة، وفي أذكار الصباح والمساء، وقبل النوم." },

3: { title: "عن التطبيق", body: "صدقة جارية لروح المرحوم الشيخ جُنيد فارس نجار تغمده الله بواسع رحمته." },

4: { title: "مشاركة الأجر", body: "قال النبي ﷺ: 'الدَّالُّ عَلَى الْخَيْرِ كَفَاعِلِهِ'. شارك التطبيق مع عائلتك وأصدقائك." }

};



const PUSH_INTERVAL_MS = 5500; // أكبر من حد السيرفر (5 ثوانٍ)

const MAX_BATCH = 20; // نفس حد السيرفر



let currentIndex = 0;

let currentCount = 0;

let pending = {}; // { اسم_الذكر: عدد غير مرفوع }

let registered = false;

let batchTimer = null;

let flushing = false;

let lastStats = null;




let authPromise = null;

function ensureAuth() {

if (!db) return Promise.resolve(false);

if (authPromise) return authPromise;

authPromise = (async () => {

try {

const { data: { session } } = await db.auth.getSession();

if (session) return true;

const { error } = await db.auth.signInAnonymously();

return !error;

} catch (e) {

return false;

}

})();

authPromise.then(ok => { if (!ok) authPromise = null; });

return authPromise;

}





// 4. دولة الزائر (تُجلب مرة واحدة فقط عند أول تسبيحة)



async function getVisitorCountry() {

const cached = localStorage.getItem('dhikr_user_country');

if (cached) return cached;

try {

const ctrl = new AbortController();

const t = setTimeout(() => ctrl.abort(), 4000);

const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });

clearTimeout(t);

const data = await res.json();

const country = data.country_name || 'غير معروف';

localStorage.setItem('dhikr_user_country', country);

return country;

} catch (e) {

return 'غير معروف';

}

}





function setText(id, value) {

const el = document.getElementById(id);

if (el) el.innerText = Number(value || 0).toLocaleString();

}



function renderStats() {

if (!lastStats) return;

const active = azkar[currentIndex];

const dhikrs = lastStats.dhikrs || {};

setText('dhikrAccumulatedTotal', dhikrs[active.name] || 0);

setText('statTotal', lastStats.total);

setText('statUsers', lastStats.users);

setText('statToday', lastStats.today);

setText('statWeek', lastStats.week);

}



async function fetchGlobalStats() {

if (!db) return;

try {

const { data, error } = await db.rpc('get_stats');

if (error || !data) return;

lastStats = data;

renderStats();

} catch (e) {

console.warn('تعذر جلب الإحصاءات');

}

}




function scheduleFlush(delay) {

clearTimeout(batchTimer);

batchTimer = setTimeout(flushDhikrBatch, delay);

}



async function flushDhikrBatch() {

if (!db || flushing) return;

const names = Object.keys(pending).filter(n => pending[n] > 0);

if (!names.length) return;



flushing = true;

try {

if (!(await ensureAuth())) { scheduleFlush(15000); return; }



if (!registered) {

const country = await getVisitorCountry();

const { error } = await db.rpc('register_dhikr_user', { p_country: country });

if (!error) registered = true;

}



// رفعة واحدة لذكر واحد في كل مرة (حد الـ 5 ثوانٍ)

const name = names[0];

const batch = Math.min(pending[name], MAX_BATCH);

const { error } = await db.rpc('add_dhikr', { p_name: name, p_amount: batch });



if (!error) {

pending[name] -= batch;

fetchGlobalStats();

} else if (String(error.message).includes('unknown dhikr')) {

console.warn('اسم الذكر غير موجود في الجدول:', name);

delete pending[name]; // لا نعيد المحاولة للأبد

}

// أي خطأ آخر (مثل too fast): يبقى pending كما هو وتُعاد المحاولة

} catch (e) {

console.warn('تعذر الرفع، ستُعاد المحاولة');

} finally {

flushing = false;

if (Object.values(pending).some(v => v > 0)) scheduleFlush(PUSH_INTERVAL_MS);

}

}
function showBlessing() {
  let t = document.getElementById('blessingToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'blessingToast';
    t.textContent = 'تقبّل الله منك وجعلها في ميزان حسناتك';
    document.body.appendChild(t);
  }
  t.classList.add('show');
  clearTimeout(t._h);
  t._h = setTimeout(() => t.classList.remove('show'), 3200);
}




function increment() {

const active = azkar[currentIndex];



currentCount++;

pending[active.name] = (pending[active.name] || 0) + 1; // الذكر يُثبَّت وقت التسبيح



if (navigator.vibrate) navigator.vibrate(8);

updateUI();

scheduleFlush(PUSH_INTERVAL_MS);



if (currentCount >= active.target) {
  
showBlessing();
if (navigator.vibrate) navigator.vibrate([100, 50, 100]);

setTimeout(forceNextDhikr, 400);

}

}




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



if (circle) {

const circumference = 2 * Math.PI * 105;

circle.style.strokeDasharray = `${circumference} ${circumference}`;

const progress = Math.min(currentCount / active.target, 1);

circle.style.strokeDashoffset = circumference - progress * circumference;

}

renderStats();

}



function forceNextDhikr() {

currentIndex = (currentIndex + 1) % azkar.length;

currentCount = 0;

updateUI();

}



function nextDhikr() {

const active = azkar[currentIndex];

if (currentCount < active.target) {

alert(`عذراً، يجب إكمال هدف هذا الذكر أولاً (${currentCount} / ${active.target}) قبل الانتقال للذكر التالي.`);

return;

}

forceNextDhikr();

}



function changeDhikr() {

const select = document.getElementById('dhikrSelect');

const active = azkar[currentIndex];



if (currentCount < active.target) {

alert(`يجب إكمال هذا الذكر أولاً قبل التغيير (${currentCount} / ${active.target}).`);

select.value = currentIndex;

return;

}

currentIndex = parseInt(select.value, 10);

currentCount = 0;

updateUI();

}



function resetCount() {

currentCount = 0; // لا يمس ما سُبّح فعلاً ولم يُرفع بعد

updateUI();

}





function shareApp(e) {

if (e) { e.preventDefault(); e.stopPropagation(); }



const shareData = {

title: 'تطبيق العداد الرقمي - صدقة جارية',

text: 'شاركونا الأجر في العداد الرقمي الموحد للأذكار (صدقة جارية لروح المرحوم الشيخ جُنيد فارس نجار):',

url: window.location.href

};



if (navigator.share) {

navigator.share(shareData).catch(() => {});

} else {

const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`;

window.open(url, '_blank');

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

if (e) { e.preventDefault(); e.stopPropagation(); }



const modal = document.getElementById('tabModal');

const title = document.getElementById('tabModalTitle');

const body = document.getElementById('tabModalBody');

const sideMenu = document.getElementById('sideMenu');



if (tabData[tabIndex] && modal) {

title.textContent = tabData[tabIndex].title;

body.textContent = tabData[tabIndex].body;

modal.style.display = 'flex';

}

if (sideMenu) sideMenu.classList.remove('active');

}



function closeTabModal() {

const modal = document.getElementById('tabModal');

if (modal) modal.style.display = 'none';

}





document.addEventListener('DOMContentLoaded', () => {

populateSelect();

updateUI();



const menuBtn = document.getElementById('menuBtn');

const sideMenu = document.getElementById('sideMenu');

if (menuBtn && sideMenu) {

menuBtn.addEventListener('click', (e) => {

e.stopPropagation();

sideMenu.classList.toggle('active');

});

document.addEventListener('click', (e) => {

if (!sideMenu.contains(e.target)) sideMenu.classList.remove('active');

});

}



const modal = document.getElementById('tabModal');

if (modal) {

modal.addEventListener('click', (e) => { if (e.target === modal) closeTabModal(); });

}



fetchGlobalStats();

setInterval(() => {

if (document.visibilityState === 'visible') fetchGlobalStats();

}, 30000);





document.addEventListener('visibilitychange', () => {

if (document.visibilityState === 'hidden') flushDhikrBatch();

});

});
