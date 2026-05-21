// ══════════════════════════════════════
//   MAS Dental Lab — app.js
//   Application Logic — Enhanced UX v2
// ══════════════════════════════════════

import {
  auth, db, ref, push, onValue, update, remove,
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "./firebase.js";

// ── State ────────────────────────────
let uid    = null;
let cRef   = null;
let all    = {};
const now  = new Date();

// ── Persistent UX State ───────────────
// يتذكر آخر إدخال لتسريع العمل
let lastDoc   = localStorage.getItem('lastDoc')   || '';
let lastMonth = +(localStorage.getItem('lastMonth') || (now.getMonth() + 1));
let lastYear  = +(localStorage.getItem('lastYear')  || now.getFullYear());
let filtersOpen = false;

// ── Translations ─────────────────────
const TR = {
  ar: {
    loginSub:'نظام إدارة حالات طب الأسنان',loginBtn:'تسجيل الدخول بـ Google',loginNote:'بياناتك محمية بحسابك الشخصي',
    hTl:'أسنان',hCl:'حالة',hDl:'طبيب',hMl:'هذا الشهر',
    tbA:'إضافة',tbL:'الحالات',tbS:'إحصائيات',tbAc:'حسابي',
    addSlbl:'حالة جديدة',lDoc:'الطبيب',lPat:'المريض',lTth:'الأسنان',lMon:'الشهر',lYr:'السنة',lType:'نوع الحالة',lShade:'لون السن',
    btnSaveTxt:'حفظ الحالة',shadeTitle:'اختر لون السن',clearShadeBtn:'إزالة اللون',
    docTitle:'اختر الطبيب',pdfTitle:'تصدير تقرير PDF',pdfMonLbl:'الشهر',pdfYrLbl:'السنة',pdfGenBtn:'توليد التقرير',pdfCan:'إلغاء',
    editTitle:'تعديل الحالة',editCan:'إلغاء',editSav:'حفظ',eLDoc:'الطبيب',eLPat:'المريض',eLTth:'أسنان',eLType:'نوع الحالة',eLShade:'لون السن',
    delTitle:'حذف الحالة',delSub:'هل أنت متأكد؟',delYes:'تأكيد الحذف',delCan:'إلغاء',
    langLbl:'اللغة / Language',i1t:'نسخ احتياطي تلقائي',i1d:'بياناتك تحفظ فورياً على Google Cloud',
    i2t:'استعادة من أي جهاز',i2d:'سجّل دخول بنفس حساب Google',i3t:'بياناتك خاصة 100%',i3d:'محمية بحسابك فقط',
    btnLogout:'تسجيل الخروج',
    stDocLbl:'الأطباء',stMonLbl:'الإنتاج الشهري',stShadeLbl:'ألوان الأسنان',per:'جميع البيانات',
    totalTeeth:'إجمالي الأسنان',totalCases:'الحالات',avgCase:'متوسط',doctors:'الأطباء',
    noData:'لا توجد بيانات',noCases:'لا توجد حالات',noDocYet:'لا يوجد أطباء مسجلون',
    savedOk:'تم الحفظ ✓',editOk:'تم التعديل ✓',delOk:'تم الحذف',csvOk:'تم التصدير',pdfOk:'جارٍ فتح التقرير',
    errDoc:'اختر اسم الطبيب',errTth:'أدخل عدد الأسنان',errNoCases:'لا توجد حالات',errLogin:'خطأ في تسجيل الدخول',
    cases:'حالة',teeth:'سن',allYrs:'كل السنوات',allMon:'كل الأشهر',allDoc:'كل الأطباء',allTyp:'كل الأنواع',
    logoutConfirm:'تأكيد تسجيل الخروج؟',logoutYes:'خروج',logoutNo:'إلغاء',
    duplicate:'نسخ الحالة',filters:'الفلاتر',hideFilters:'إخفاء',showFilters:'فلترة',
    thisMonth:'هذا الشهر',lastMonthLbl:'الشهر الماضي',vsLastMonth:'مقارنة بالشهر الماضي'
  },
  en: {
    loginSub:'Dental Cases Management System',loginBtn:'Sign in with Google',loginNote:'Your data is private and protected',
    hTl:'Teeth',hCl:'Cases',hDl:'Doctors',hMl:'This Month',
    tbA:'Add',tbL:'Cases',tbS:'Stats',tbAc:'Account',
    addSlbl:'New Case',lDoc:'Doctor',lPat:'Patient',lTth:'Teeth',lMon:'Month',lYr:'Year',lType:'Case Type',lShade:'Shade',
    btnSaveTxt:'Save Case',shadeTitle:'Select Shade',clearShadeBtn:'Clear Shade',
    docTitle:'Select Doctor',pdfTitle:'Export PDF',pdfMonLbl:'Month',pdfYrLbl:'Year',pdfGenBtn:'Generate Report',pdfCan:'Cancel',
    editTitle:'Edit Case',editCan:'Cancel',editSav:'Save',eLDoc:'Doctor',eLPat:'Patient',eLTth:'Teeth',eLType:'Case Type',eLShade:'Shade',
    delTitle:'Delete Case',delSub:'Are you sure?',delYes:'Confirm Delete',delCan:'Cancel',
    langLbl:'Language / اللغة',i1t:'Auto Backup',i1d:'Data saves instantly to Google Cloud',
    i2t:'Restore from Any Device',i2d:'Sign in with same Google account',i3t:'100% Private Data',i3d:'Protected by your account',
    btnLogout:'Sign Out',
    stDocLbl:'Doctors',stMonLbl:'Monthly Production',stShadeLbl:'Shade Distribution',per:'All Data',
    totalTeeth:'Total Teeth',totalCases:'Cases',avgCase:'Avg',doctors:'Doctors',
    noData:'No data',noCases:'No cases',noDocYet:'No doctors registered',
    savedOk:'Saved ✓',editOk:'Updated ✓',delOk:'Deleted',csvOk:'Exported',pdfOk:'Opening report...',
    errDoc:'Select doctor',errTth:'Enter tooth count',errNoCases:'No cases found',errLogin:'Login error',
    cases:'cases',teeth:'teeth',allYrs:'All Years',allMon:'All Months',allDoc:'All Doctors',allTyp:'All Types',
    logoutConfirm:'Confirm sign out?',logoutYes:'Sign Out',logoutNo:'Cancel',
    duplicate:'Duplicate',filters:'Filters',hideFilters:'Hide',showFilters:'Filter',
    thisMonth:'This Month',lastMonthLbl:'Last Month',vsLastMonth:'vs Last Month'
  }
};

let lang = localStorage.getItem('lang') || 'ar';
const t  = k => TR[lang]?.[k] || TR.ar[k] || k;

// ── Language ──────────────────────────
function applyLang() {
  Object.keys(TR.ar).forEach(k => {
    const el = document.getElementById(k);
    if (el && TR[lang][k] !== undefined) el.textContent = TR[lang][k];
  });
  const isAr = lang === 'ar';
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.getElementById('btnAr').classList.toggle('on', isAr);
  document.getElementById('btnEn').classList.toggle('on', !isAr);
  [
    {id:'flYr', k:'allYrs'}, {id:'flMon', k:'allMon'},
    {id:'flDoc', k:'allDoc'}, {id:'flType', k:'allTyp'},
    {id:'stYr', k:'allYrs'}, {id:'stMon', k:'allMon'}
  ].forEach(({id, k}) => {
    const s = document.getElementById(id);
    if (s?.options[0]) s.options[0].text = t(k);
  });
  document.getElementById('fDoc').placeholder      = isAr ? 'اختر أو أضف' : 'Select or add';
  document.getElementById('docSearch').placeholder = isAr ? 'ابحث أو اكتب اسم جديد' : 'Search or type name';
  renderList();
  renderStats();
}
window.setLang = l => { lang = l; localStorage.setItem('lang', l); applyLang(); };

// ── Shades ────────────────────────────
const SHADES = [
  { l:"Group 1", c:"#f5f0e8", list:["0M1","0M2","0M3"] },
  { l:"Group 2", c:"#ede4cc", list:["1M1","1M2"] },
  { l:"Group 3", c:"#e0ceaa", list:["2M1","2M2","2M3","2L1.5","2L2.5","2R1.5","2R2.5"] },
  { l:"Group 4", c:"#d4b87e", list:["3M1","3M2","3M3","3L1.5","3L2.5","3R1.5","3R2.5"] },
  { l:"Group 5", c:"#c8a25c", list:["4M1","4M2","4M3","4L1.5","4L2.5","4R1.5","4R2.5"] },
  { l:"Group 6", c:"#b8903a", list:["5M1","5M2","5M3"] },
];
function getClr(s) {
  for (const g of SHADES) if (g.list.includes(s)) return g.c;
  return '#e2e8f0';
}
document.getElementById('shadeGrps').innerHTML = SHADES.map(g =>
  `<div class="sg-grp"><div class="sg-hdr"><span class="sg-dot" style="background:${g.c}"></span>${g.l}</div>` +
  `<div class="sg-chips">${g.list.map(s => `<button class="sg-chip" data-s="${s}" onclick="pick('${s}')">${s}</button>`).join('')}</div></div>`
).join('');

let sel = "", esel = "", shMode = "add", dMode = "add", caseType = "CB", editType = "CB";

function setShUI(tId, txId, dId, s) {
  const btn = document.getElementById(tId);
  const tx  = document.getElementById(txId);
  const d   = document.getElementById(dId);
  if (s) {
    tx.textContent = s;
    d.style.background  = getClr(s);
    d.style.borderColor = 'rgba(0,0,0,0.1)';
    btn.classList.add('picked');
  } else {
    tx.textContent = t('lShade');
    d.style.background  = '';
    d.style.borderColor = '';
    btn.classList.remove('picked');
  }
}

window.openShade = m => {
  shMode = m;
  const c = m === 'add' ? sel : esel;
  document.querySelectorAll('#shadeGrps .sg-chip').forEach(x => x.classList.toggle('on', x.dataset.s === c));
  document.getElementById('sOv').classList.add('on');
};
window.closeShade = () => document.getElementById('sOv').classList.remove('on');
window.clearShade = () => {
  if (shMode === 'add') { sel = ''; setShUI('sTrig','sTxt','sDot',''); }
  else { esel = ''; setShUI('eSTrig','eSTxt','eSDot',''); }
  closeShade();
};
window.pick = s => {
  if (shMode === 'add') { sel = s; setShUI('sTrig','sTxt','sDot',s); }
  else { esel = s; setShUI('eSTrig','eSTxt','eSDot',s); }
  closeShade();
  toast(s, 'ok');
};
document.getElementById('sOv').addEventListener('click', e => { if (e.target === document.getElementById('sOv')) closeShade(); });

// ── Type Toggle ───────────────────────
window.setType = tp => {
  caseType = tp;
  document.getElementById('btnCB').className = `t-btn${tp === 'CB' ? ' cb' : ''}`;
  document.getElementById('btnFA').className = `t-btn${tp === 'FA' ? ' fa' : ''}`;
};
window.setEditType = tp => {
  editType = tp;
  document.getElementById('eBtnCB').className = `t-btn${tp === 'CB' ? ' cb' : ''}`;
  document.getElementById('eBtnFA').className = `t-btn${tp === 'FA' ? ' fa' : ''}`;
};

// ── Doctor Picker ─────────────────────
window.openDoc = function(mode) {
  dMode = mode;
  document.getElementById('docSearch').value = '';
  renderDocList('');
  document.getElementById('dOv').classList.add('on');
  setTimeout(() => document.getElementById('docSearch').focus(), 350);
};
window.closeDoc = () => document.getElementById('dOv').classList.remove('on');
document.getElementById('dOv').addEventListener('click', e => { if (e.target === document.getElementById('dOv')) closeDoc(); });

function renderDocList(q) {
  const dm = {};
  Object.values(all).forEach(c => { if (!c.doc) return; dm[c.doc] = (dm[c.doc] || 0) + 1; });
  let docs = Object.entries(dm).sort((a, b) => b[1] - a[1]);
  if (q) docs = docs.filter(([d]) => d.includes(q) || d.toLowerCase().includes(q.toLowerCase()));
  const el = document.getElementById('docList');
  if (!docs.length && !q) {
    el.innerHTML = `<div class="d-empty">${t('noDocYet')}</div>`;
    document.getElementById('docAddBtn').style.display = 'none';
    return;
  }
  el.innerHTML = docs.map(([d, c]) =>
    `<div class="d-opt" onclick="selectDoc('${d.replace(/'/g,"\\'")}')">` +
    `<div class="d-ico">${d.charAt(0)}</div>` +
    `<div><div class="d-nm">${d}</div><div class="d-ct">${c} ${t('cases')}</div></div></div>`
  ).join('');
  const nb = document.getElementById('docAddBtn');
  if (q && !docs.some(([d]) => d === q)) { nb.style.display = 'flex'; nb.lastChild.textContent = ` ${q}`; }
  else nb.style.display = 'none';
}
window.filterDocs = () => renderDocList(document.getElementById('docSearch').value.trim());
window.selectDoc  = function(name) {
  document.getElementById(dMode === 'add' ? 'fDoc' : 'eDoc').value = name;
  // ✅ [1] احفظ آخر طبيب
  if (dMode === 'add') {
    lastDoc = name;
    localStorage.setItem('lastDoc', name);
  }
  closeDoc();
};
window.addNewDoc = function() { const q = document.getElementById('docSearch').value.trim(); if (q) selectDoc(q); };

// ── Year Selects ──────────────────────
function fillYr(id, val) {
  const y = new Date().getFullYear();
  let o = '';
  for (let i = y + 1; i >= y - 3; i--) o += `<option value="${i}">${i}</option>`;
  const s = document.getElementById(id);
  s.innerHTML = o;
  if (val) s.value = val;
}
fillYr('fYr');
fillYr('eYr');
fillYr('pdfYr');

// ✅ [1,3] ملء الفورم بآخر قيم مستخدمة بدل الحالية دائماً
document.getElementById('fMon').value   = lastMonth;
document.getElementById('fYr').value    = lastYear;
document.getElementById('fDoc').value   = lastDoc;
document.getElementById('pdfMon').value = now.getMonth() + 1;
document.getElementById('pdfYr').value  = now.getFullYear();

// ✅ [2] اقتراح الطبيب الأخير: لون خاص إذا محفوظ
if (lastDoc) {
  const docInp = document.getElementById('fDoc');
  docInp.style.color = '#2563eb';
  docInp.style.fontWeight = '700';
}

// ── Auth ──────────────────────────────
window.doLogin = async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { toast(t('errLogin'), 'err'); }
};

// ✅ [4] تأكيد قبل تسجيل الخروج
window.doOut = function() {
  showConfirmLogout();
};

function showConfirmLogout() {
  const existing = document.getElementById('logoutConfirmOv');
  if (existing) { existing.classList.add('on'); return; }
  const div = document.createElement('div');
  div.id = 'logoutConfirmOv';
  div.className = 'ov on';
  div.innerHTML = `
    <div class="sheet" style="text-align:center;padding:24px 16px">
      <div style="width:48px;height:48px;border-radius:50%;background:#fef2f2;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </div>
      <div style="font-size:0.9rem;font-weight:800;color:#0f172a;margin-bottom:6px">${t('logoutConfirm')}</div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button onclick="document.getElementById('logoutConfirmOv').classList.remove('on')"
          style="flex:1;padding:11px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;font-family:Cairo,sans-serif;font-size:0.82rem;font-weight:700;color:#64748b;cursor:pointer">
          ${t('logoutNo')}
        </button>
        <button onclick="window._doSignOut()"
          style="flex:1;padding:11px;background:#ef4444;border:none;border-radius:8px;font-family:Cairo,sans-serif;font-size:0.82rem;font-weight:800;color:#fff;cursor:pointer">
          ${t('logoutYes')}
        </button>
      </div>
    </div>`;
  div.addEventListener('click', e => { if (e.target === div) div.classList.remove('on'); });
  document.body.appendChild(div);
}

window._doSignOut = function() {
  const ov = document.getElementById('logoutConfirmOv');
  if (ov) ov.remove();
  signOut(auth);
};

onAuthStateChanged(auth, u => {
  if (u) {
    uid = u.uid;
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').classList.add('on');

    const setAv = (id, sm) => {
      const el = document.getElementById(id);
      if (u.photoURL) el.innerHTML = `<img src="${u.photoURL}">`;
      else el.innerHTML = sm
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    };
    setAv('hdrAv', true);
    setAv('tabAv', true);
    setAv('accAv', false);
    document.getElementById('accNm').textContent = u.displayName || 'User';
    document.getElementById('accEm').textContent = u.email || '';

    cRef = ref(db, `users/${uid}/cases`);
    onValue(cRef, snap => { all = snap.val() || {}; refresh(); });

    const y  = now.getFullYear();
    let o = `<option value="">${t('allYrs')}</option>`;
    for (let i = y + 1; i >= y - 2; i--) o += `<option value="${i}">${i}</option>`;
    ['flYr','stYr'].forEach(id => document.getElementById(id).innerHTML = o);

    applyLang();
  } else {
    uid = null;
    document.getElementById('login').style.display = 'flex';
    document.getElementById('app').classList.remove('on');
  }
});

// ── Refresh Header Stats ──────────────
function refresh() {
  const list = Object.values(all), mn = now.getMonth() + 1, yr = now.getFullYear();
  document.getElementById('hT').textContent = list.reduce((s, c) => s + (+c.teeth || 0), 0);
  document.getElementById('hC').textContent = list.length;
  document.getElementById('hD').textContent = new Set(list.map(c => c.doc).filter(Boolean)).size;
  document.getElementById('hM').textContent = list.filter(c => +c.month === mn && +c.year === yr).reduce((s, c) => s + (+c.teeth || 0), 0);

  const docs = [...new Set(list.map(c => c.doc).filter(Boolean))].sort();
  const fd   = document.getElementById('flDoc'), cv = fd.value;
  fd.innerHTML = `<option value="">${t('allDoc')}</option>` + docs.map(d => `<option value="${d}">${d}</option>`).join('');
  if (cv) fd.value = cv;
  renderList();
  renderStats();
}

// ── Search Mode ───────────────────────
let srchMode = 'all';
window.setSrchMode = function(mode, btn) {
  srchMode = mode;
  document.querySelectorAll('.srch-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  renderList();
};
window.clearSearch = function() {
  document.getElementById('srchQ').value = '';
  document.getElementById('srchClr').style.display = 'none';
  renderList();
};

// ✅ [6] تبديل ظهور الفلاتر
window.toggleFilters = function() {
  filtersOpen = !filtersOpen;
  const panel = document.getElementById('filtersPanel');
  const btn   = document.getElementById('filterToggleBtn');
  if (filtersOpen) {
    panel.style.display = 'block';
    panel.style.animation = 'slideDown 0.2s ease';
    btn.textContent = t('hideFilters');
    btn.classList.add('active');
  } else {
    panel.style.display = 'none';
    btn.textContent = t('showFilters');
    btn.classList.remove('active');
  }
};

function highlight(text, q) {
  if (!q || !text) return text || '—';
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark class="hl">$1</mark>');
}

// ── List Page ─────────────────────────
window.renderList = function() {
  const fy = document.getElementById('flYr').value;
  const fm = document.getElementById('flMon').value;
  const fd = document.getElementById('flDoc').value;
  const ft = document.getElementById('flType').value;
  const q  = (document.getElementById('srchQ')?.value || '').trim().toLowerCase();

  const clr = document.getElementById('srchClr');
  if (clr) clr.style.display = q ? 'flex' : 'none';

  let list = Object.entries(all).map(([id, c]) => ({ id, ...c }));
  if (fy) list = list.filter(c => String(c.year)  === fy);
  if (fm) list = list.filter(c => String(c.month) === fm);
  if (fd) list = list.filter(c => c.doc  === fd);
  if (ft) list = list.filter(c => (c.type || 'CB') === ft);

  if (q) {
    list = list.filter(c => {
      if (srchMode === 'patient') return (c.pat  || '').toLowerCase().includes(q);
      if (srchMode === 'doctor')  return (c.doc  || '').toLowerCase().includes(q);
      if (srchMode === 'shade')   return (c.shade|| '').toLowerCase().includes(q);
      return (c.pat  || '').toLowerCase().includes(q)
          || (c.doc  || '').toLowerCase().includes(q)
          || (c.shade|| '').toLowerCase().includes(q);
    });
  }

  // ✅ [6] الترتيب: الأحدث أولاً
  list.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  const sum = list.reduce((s, c) => s + (+c.teeth || 0), 0);
  const faT = list.filter(c => (c.type || 'CB') === 'FA').reduce((s, c) => s + (+c.teeth || 0), 0);
  const cbT = list.filter(c => (c.type || 'CB') === 'CB').reduce((s, c) => s + (+c.teeth || 0), 0);

  document.getElementById('lCnt').textContent = `${list.length} ${t('cases')}`;
  document.getElementById('lSum').textContent  = list.length ? `${sum} ${t('teeth')}` : '';
  document.getElementById('typePills').innerHTML = list.length
    ? `<span class="pill-fa">FA · ${faT}</span><span class="pill-cb">CB · ${cbT}</span>` : '';

  const el = document.getElementById('listEl');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><span class="ei">${q ? '🔍' : '📋'}</span><div class="et">${q ? (lang==='ar'?'لا نتائج':'No results') : t('noCases')}</div></div>`;
    return;
  }

  // ✅ [4] بطاقات مع Swipe + shade دوت ملون + زر نسخ
  el.innerHTML = list.map(c => {
    const tp   = c.type || 'CB';
    const hDoc = q && (srchMode === 'all' || srchMode === 'doctor')  ? highlight(c.doc, q) : (c.doc  || '—');
    const hPat = q && (srchMode === 'all' || srchMode === 'patient') ? highlight(c.pat, q) : (c.pat  || '—');
    const hShd = q && (srchMode === 'all' || srchMode === 'shade')   ? highlight(c.shade, q) : (c.shade || '');
    const shadeClr = c.shade ? getClr(c.shade) : '';
    return `
    <div class="cc" id="cc-${c.id}" data-id="${c.id}">
      <div class="cc-top">
        <div class="cc-left">
          <div class="cc-doc">${hDoc}</div>
          <div class="cc-pat">${hPat}</div>
        </div>
        <div class="cc-badge">${c.teeth || 0}</div>
      </div>
      <div class="cc-tags">
        <span class="tag tag-d">${c.month || '—'} / ${c.year || '—'}</span>
        <span class="tag ${tp === 'FA' ? 'tag-fa' : 'tag-cb'}">${tp}</span>
        ${c.shade
          ? `<span class="tag tag-s">
               <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${shadeClr};border:1px solid rgba(0,0,0,0.15);margin-left:4px;vertical-align:middle"></span>
               ${hShd}
             </span>`
          : ''}
      </div>
      <div class="cc-acts">
        <button class="cc-act cc-dup" onclick="duplicateCase('${c.id}')" title="${t('duplicate')}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          ${lang === 'ar' ? 'نسخ' : 'Copy'}
        </button>
        <button class="cc-act cc-edit" onclick="openEdit('${c.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          ${lang === 'ar' ? 'تعديل' : 'Edit'}
        </button>
        <button class="cc-act cc-del" onclick="openDel('${c.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          ${lang === 'ar' ? 'حذف' : 'Delete'}
        </button>
      </div>
    </div>`;
  }).join('');

  // ✅ [7] Swipe للحذف/التعديل على موبايل
  initSwipe();
};

// ── Swipe على البطاقات ────────────────
function initSwipe() {
  document.querySelectorAll('.cc').forEach(card => {
    if (card._swipeInit) return;
    card._swipeInit = true;
    let startX = 0, curX = 0, swiping = false;
    const id = card.dataset.id;

    card.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      curX   = startX;
      swiping = false;
    }, { passive: true });

    card.addEventListener('touchmove', e => {
      curX = e.touches[0].clientX;
      const dx = curX - startX;
      if (Math.abs(dx) > 8) {
        swiping = true;
        // RTL: swipe right = حذف، swipe left = تعديل
        const isRTL = lang === 'ar';
        const clamp = Math.max(-80, Math.min(80, dx));
        card.style.transform = `translateX(${clamp}px)`;
        card.style.transition = 'none';

        // لون خلفي حسب الاتجاه
        if ((isRTL && dx > 30) || (!isRTL && dx < -30)) {
          card.style.background = '#fef2f2'; // حذف
        } else if ((isRTL && dx < -30) || (!isRTL && dx > 30)) {
          card.style.background = '#eff6ff'; // تعديل
        } else {
          card.style.background = '';
        }
      }
    }, { passive: true });

    card.addEventListener('touchend', () => {
      const dx = curX - startX;
      card.style.transition = 'transform 0.25s ease, background 0.2s';
      card.style.transform  = '';
      card.style.background = '';
      if (!swiping) return;
      const isRTL = lang === 'ar';
      if (Math.abs(dx) > 55) {
        if ((isRTL && dx > 0) || (!isRTL && dx < 0)) {
          setTimeout(() => openDel(id), 250);
        } else {
          setTimeout(() => openEdit(id), 250);
        }
      }
    });
  });
}

// ── SVG Chart Helpers ─────────────────
function drawPieChart(svgId, legendId, slices) {
  const svg = document.getElementById(svgId);
  const leg = document.getElementById(legendId);
  if (!svg || !leg) return;
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (!total) {
    svg.innerHTML = `<text x="80" y="85" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="Cairo,sans-serif">لا بيانات</text>`;
    leg.innerHTML = '';
    return;
  }
  const cx = 80, cy = 80, r = 62, ir = 36;
  let startAngle = -Math.PI / 2, paths = '';
  slices.forEach(sl => {
    if (!sl.value) return;
    const angle = (sl.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(startAngle + angle), y2 = cy + r * Math.sin(startAngle + angle);
    const xi1 = cx + ir * Math.cos(startAngle), yi1 = cy + ir * Math.sin(startAngle);
    const xi2 = cx + ir * Math.cos(startAngle + angle), yi2 = cy + ir * Math.sin(startAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const pct = Math.round(sl.value / total * 100);
    const mid = startAngle + angle / 2;
    const lx = cx + (r * 0.65) * Math.cos(mid), ly = cy + (r * 0.65) * Math.sin(mid);
    paths += `<path d="M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${ir},${ir} 0 ${large},0 ${xi1},${yi1} Z" fill="${sl.color}" stroke="#fff" stroke-width="2"/>`;
    if (pct >= 8) paths += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="11" font-weight="700" font-family="Cairo,sans-serif">${pct}%</text>`;
    startAngle += angle;
  });
  paths += `<text x="${cx}" y="${cy-6}" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700" font-family="Cairo,sans-serif">${total}</text>`;
  paths += `<text x="${cx}" y="${cy+10}" text-anchor="middle" fill="#64748b" font-size="8" font-family="Cairo,sans-serif">إجمالي</text>`;
  svg.innerHTML = paths;
  leg.innerHTML = slices.filter(s => s.value).map(s =>
    `<div class="pie-leg-item"><span class="pie-dot" style="background:${s.color}"></span><span class="pie-lbl">${s.label}</span><span class="pie-val">${s.value}</span></div>`
  ).join('');
}

function drawBarChart(svgId, bars, opts = {}) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const { height = 130, barColor = '#2563eb', labelColor = '#64748b' } = opts;
  const W = svg.parentElement?.clientWidth || 320;
  svg.setAttribute('viewBox', `0 0 ${W} ${height}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', height);
  const mx = Math.max(...bars.map(b => b.value), 1);
  const pad = 10, bpad = 6;
  const n = bars.length;
  const bw = Math.max(8, (W - pad * 2 - bpad * (n - 1)) / n);
  const chartH = height - 34;
  let out = '';
  [0.25, 0.5, 0.75, 1].forEach(f => {
    const y = pad + chartH * (1 - f);
    out += `<line x1="${pad}" y1="${y}" x2="${W - pad}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
    out += `<text x="${pad - 3}" y="${y + 3}" text-anchor="end" fill="#94a3b8" font-size="7" font-family="Cairo,sans-serif">${Math.round(mx * f)}</text>`;
  });
  bars.forEach((b, i) => {
    const x  = pad + i * (bw + bpad);
    const bh = Math.max(2, (b.value / mx) * chartH);
    const by = pad + chartH - bh;
    const col = b.color || barColor;
    const rx = Math.min(4, bw / 2);
    out += `<rect x="${x}" y="${by}" width="${bw}" height="${bh}" rx="${rx}" fill="${col}" opacity="0.9"/>`;
    if (b.value > 0) out += `<text x="${x + bw/2}" y="${by - 3}" text-anchor="middle" fill="${col}" font-size="8" font-weight="700" font-family="Cairo,sans-serif">${b.value}</text>`;
    const lbl = String(b.label).length > 5 ? String(b.label).slice(0, 5) : b.label;
    out += `<text x="${x + bw/2}" y="${height - 4}" text-anchor="middle" fill="${labelColor}" font-size="8" font-family="Cairo,sans-serif">${lbl}</text>`;
  });
  svg.innerHTML = out;
}

// ── Stats Page ────────────────────────
window.renderStats = function() {
  const fy = document.getElementById('stYr').value;
  const fm = document.getElementById('stMon').value;
  let list = Object.values(all);
  if (fy) list = list.filter(c => String(c.year)  === fy);
  if (fm) list = list.filter(c => String(c.month) === fm);

  document.getElementById('per').lastChild.textContent = ` ${
    fy && fm ? `${lang === 'ar' ? 'شهر' : 'Month'} ${fm} · ${fy}` :
    fy ? fy :
    fm ? `${lang === 'ar' ? 'شهر' : 'Month'} ${fm}` :
    t('per')
  }`;
  document.getElementById('mCard').style.display = fm ? 'none' : 'block';

  const tt  = list.reduce((s, c) => s + (+c.teeth || 0), 0);
  const avg = list.length ? Math.round(tt / list.length) : 0;
  document.getElementById('stGrid').innerHTML =
    `<div class="sbox"><div class="sbox-n" style="color:var(--blue)">${tt}</div><div class="sbox-l">${t('totalTeeth')}</div></div>` +
    `<div class="sbox"><div class="sbox-n" style="color:var(--green)">${list.length}</div><div class="sbox-l">${t('totalCases')}</div></div>` +
    `<div class="sbox"><div class="sbox-n" style="color:var(--gold)">${avg}</div><div class="sbox-l">${t('avgCase')}</div></div>` +
    `<div class="sbox"><div class="sbox-n" style="color:var(--violet)">${new Set(list.map(c => c.doc).filter(Boolean)).size}</div><div class="sbox-l">${t('doctors')}</div></div>`;

  const faT = list.filter(c => (c.type || 'CB') === 'FA').reduce((s, c) => s + (+c.teeth || 0), 0);
  const cbT = list.filter(c => (c.type || 'CB') === 'CB').reduce((s, c) => s + (+c.teeth || 0), 0);
  const faC = list.filter(c => (c.type || 'CB') === 'FA').length;
  const cbC = list.filter(c => (c.type || 'CB') === 'CB').length;
  document.getElementById('typeStats').innerHTML =
    `<div class="tsb" style="background:var(--sky);border-color:var(--sky2)"><div class="tsb-n" style="color:var(--blue)">${faT}</div><div class="tsb-l" style="color:var(--blue)">Full Anatomy</div><div class="tsb-c" style="color:var(--blue2)">${faC} ${t('cases')}</div></div>` +
    `<div class="tsb" style="background:#f5f3ff;border-color:#ddd6fe"><div class="tsb-n" style="color:var(--violet)">${cbT}</div><div class="tsb-l" style="color:var(--violet)">Cut Back</div><div class="tsb-c" style="color:#6d28d9">${cbC} ${t('cases')}</div></div>`;

  drawPieChart('pieChart', 'pieLegend', [
    { label: 'Full Anatomy', value: faT, color: '#2563eb' },
    { label: 'Cut Back',     value: cbT, color: '#7c3aed' }
  ]);

  // ✅ [11] أكثر طبيب وأكثر shade بشكل بارز
  const dm = {};
  list.forEach(c => { if (!c.doc) return; dm[c.doc] = (dm[c.doc] || 0) + (+c.teeth || 0); });
  const ds = Object.entries(dm).sort((a, b) => b[1] - a[1]);
  const mx = ds[0]?.[1] || 1;
  const rk = i => i === 0 ? 'g1' : i <= 2 ? 'g2' : 'g3';

  // بطاقة أفضل طبيب
  const topDocEl = document.getElementById('topDocCard');
  if (topDocEl && ds.length) {
    const [topName, topVal] = ds[0];
    const topPct = total => total ? Math.round(topVal / total * 100) : 0;
    const allT   = list.reduce((s,c) => s+(+c.teeth||0), 0);
    topDocEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;flex-shrink:0">${topName.charAt(0)}</div>
        <div style="flex:1">
          <div style="font-size:0.82rem;font-weight:800;color:#0f172a">${topName}</div>
          <div style="font-size:0.65rem;color:#64748b;margin-top:1px">${lang==='ar'?'الأعلى إنتاجاً':'Top Producer'}</div>
        </div>
        <div style="text-align:center">
          <div style="font-size:1.1rem;font-weight:900;color:#2563eb">${topVal}</div>
          <div style="font-size:0.55rem;color:#94a3b8">${topPct(allT)}%</div>
        </div>
      </div>`;
    topDocEl.style.display = 'block';
  }

  // أكثر shade
  const sm = {};
  list.forEach(c => { if (c.shade) sm[c.shade] = (sm[c.shade] || 0) + 1; });
  const sl = Object.entries(sm).sort((a, b) => b[1] - a[1]);

  const topShadeEl = document.getElementById('topShadeCard');
  if (topShadeEl && sl.length) {
    const [topShade, topShadeN] = sl[0];
    topShadeEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;border-radius:50%;background:${getClr(topShade)};border:2px solid rgba(0,0,0,0.08);flex-shrink:0"></div>
        <div style="flex:1">
          <div style="font-size:0.9rem;font-weight:900;color:#0f172a">${topShade}</div>
          <div style="font-size:0.65rem;color:#64748b">${lang==='ar'?'الأكثر استخداماً':'Most Used Shade'}</div>
        </div>
        <div style="font-size:1.1rem;font-weight:900;color:#f59e0b">${topShadeN}</div>
      </div>`;
    topShadeEl.style.display = 'block';
  }

  document.getElementById('stDoc').innerHTML = ds.length
    ? ds.map(([d, v], i) =>
        `<div class="di"><div class="drk ${rk(i)}">${i + 1}</div>` +
        `<div class="dinfo"><div class="dnm">${d}</div><div class="dbw"><div class="db" style="width:${(v / mx * 100).toFixed(1)}%"></div></div></div>` +
        `<div class="dtth">${v}</div></div>`
      ).join('')
    : `<div style="color:var(--text3);text-align:center;padding:12px;font-size:0.74rem">${t('noData')}</div>`;

  const docBarWrap = document.getElementById('docBarWrap');
  if (ds.length) {
    docBarWrap.style.display = 'block';
    setTimeout(() => {
      drawBarChart('docBarChart', ds.slice(0, 8).map(([d, v]) => ({ label: d.split(' ')[0], value: v, color: '#2563eb' })), { height: 140 });
    }, 0);
  } else {
    docBarWrap.style.display = 'none';
  }

  if (!fm) {
    const mm = {};
    list.forEach(c => { const m = c.month; if (m) { if (!mm[m]) mm[m] = 0; mm[m] += +c.teeth || 0; } });
    setTimeout(() => {
      drawBarChart('monBarChart', Array.from({ length: 12 }, (_, i) => i + 1).map(m => ({
        label: m, value: mm[m] || 0, color: mm[m] ? '#10b981' : '#e2e8f0'
      })), { height: 150, labelColor: '#64748b' });
    }, 0);
  }

  // ✅ [10] مقارنة هذا الشهر بالشهر الماضي
  const compEl = document.getElementById('monthCompare');
  if (compEl && !fy && !fm) {
    const mn  = now.getMonth() + 1, yr = now.getFullYear();
    const lm  = mn === 1 ? 12 : mn - 1;
    const ly  = mn === 1 ? yr - 1 : yr;
    const thisM = Object.values(all).filter(c => +c.month === mn  && +c.year === yr).reduce((s,c)=>s+(+c.teeth||0),0);
    const lastM = Object.values(all).filter(c => +c.month === lm  && +c.year === ly).reduce((s,c)=>s+(+c.teeth||0),0);
    const diff  = thisM - lastM;
    const pct   = lastM ? Math.abs(Math.round(diff / lastM * 100)) : (thisM ? 100 : 0);
    const up    = diff >= 0;
    compEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:0.7rem;font-weight:700;color:#64748b;margin-bottom:4px">${t('thisMonth')}</div>
          <div style="font-size:1.4rem;font-weight:900;color:#0f172a">${thisM} <span style="font-size:0.7rem;color:#94a3b8">${t('teeth')}</span></div>
        </div>
        <div style="text-align:center;padding:8px 14px;border-radius:10px;background:${up?'#f0fdf4':'#fef2f2'}">
          <div style="font-size:1rem;font-weight:900;color:${up?'#10b981':'#ef4444'}">${up?'▲':'▼'} ${pct}%</div>
          <div style="font-size:0.6rem;color:#94a3b8;margin-top:2px">${t('vsLastMonth')}</div>
        </div>
        <div style="text-align:left">
          <div style="font-size:0.7rem;font-weight:700;color:#64748b;margin-bottom:4px">${t('lastMonthLbl')}</div>
          <div style="font-size:1.4rem;font-weight:900;color:#94a3b8">${lastM} <span style="font-size:0.7rem">${t('teeth')}</span></div>
        </div>
      </div>`;
    compEl.style.display = 'block';
  } else if (compEl) {
    compEl.style.display = 'none';
  }

  const smx = sl[0]?.[1] || 1;
  document.getElementById('stShade').innerHTML = sl.length
    ? sl.map(([s, n]) =>
        `<div class="shr">
          <div style="display:flex;align-items:center;gap:5px;min-width:52px">
            <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${getClr(s)};border:1px solid rgba(0,0,0,0.1);flex-shrink:0"></span>
            <div class="shn">${s}</div>
          </div>
          <div class="shbw"><div class="shb" style="width:${(n / smx * 100).toFixed(1)}%"></div></div>
          <div class="shc">${n}</div>
        </div>`
      ).join('')
    : `<div style="color:var(--text3);text-align:center;padding:12px;font-size:0.74rem">${t('noData')}</div>`;
};

// ── CRUD ──────────────────────────────
window.addCase = async function() {
  const doc = document.getElementById('fDoc').value.trim();
  const tth = +document.getElementById('fTth').value;
  if (!doc) { toast(t('errDoc'), 'err'); document.getElementById('fDoc').focus(); return; }
  if (!tth || tth < 1) { toast(t('errTth'), 'err'); document.getElementById('fTth').focus(); return; }
  const btn = document.getElementById('btnSave');
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';
  const mon = +document.getElementById('fMon').value;
  const yr  = +document.getElementById('fYr').value;
  try {
    await push(cRef, {
      doc, pat: document.getElementById('fPat').value.trim(),
      teeth: tth, month: mon, year: yr,
      shade: sel, type: caseType, ts: Date.now()
    });
    // ✅ [1,3] احفظ آخر قيم للإدخال القادم
    lastDoc   = doc;
    lastMonth = mon;
    lastYear  = yr;
    localStorage.setItem('lastDoc',   doc);
    localStorage.setItem('lastMonth', mon);
    localStorage.setItem('lastYear',  yr);

    // ✅ [7] امسح الفورم لكن اتركه الطبيب والشهر والسنة
    document.getElementById('fPat').value = '';
    document.getElementById('fTth').value = '';
    sel = '';
    setShUI('sTrig','sTxt','sDot','');
    setType('CB');

    // ✅ [2] الطبيب يبقى محفوظاً — لون مميز
    const docInp = document.getElementById('fDoc');
    docInp.style.color      = '#2563eb';
    docInp.style.fontWeight = '700';

    toast(t('savedOk'), 'ok');
    // انتقل للـ patient field تلقائياً للإدخال السريع
    setTimeout(() => document.getElementById('fPat').focus(), 300);
  } finally {
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
  }
};

// ✅ [5] validation في saveEdit أيضاً
window.openEdit = function(id) {
  const c = all[id];
  if (!c) return;
  document.getElementById('eId').value  = id;
  document.getElementById('eDoc').value = c.doc || '';
  document.getElementById('ePat').value = c.pat || '';
  document.getElementById('eTth').value = c.teeth || '';
  document.getElementById('eMon').value = c.month || 1;
  fillYr('eYr', c.year || now.getFullYear());
  esel = c.shade || '';
  setShUI('eSTrig','eSTxt','eSDot', c.shade || '');
  editType = c.type || 'CB';
  setEditType(editType);
  document.getElementById('editOv').classList.add('on');
};

window.saveEdit = async function() {
  const doc = document.getElementById('eDoc').value.trim();
  const tth = +document.getElementById('eTth').value;
  // ✅ [5] validation
  if (!doc) { toast(t('errDoc'), 'err'); return; }
  if (!tth || tth < 1) { toast(t('errTth'), 'err'); return; }
  const id = document.getElementById('eId').value;
  await update(ref(db, `users/${uid}/cases/${id}`), {
    doc, pat: document.getElementById('ePat').value.trim(),
    teeth: tth,
    month: +document.getElementById('eMon').value,
    year:  +document.getElementById('eYr').value,
    shade: esel, type: editType
  });
  closeOv('editOv');
  toast(t('editOk'), 'ok');
};

window.openDel    = id => { document.getElementById('delId').value = id; document.getElementById('delOv').classList.add('on'); };
window.confirmDel = async function() {
  await remove(ref(db, `users/${uid}/cases/${document.getElementById('delId').value}`));
  closeOv('delOv');
  toast(t('delOk'), 'ok');
};

// ✅ [9] نسخ حالة موجودة (Duplicate)
window.duplicateCase = async function(id) {
  const c = all[id];
  if (!c) return;
  const { doc, pat, teeth, month, year, shade, type } = c;
  await push(cRef, { doc, pat, teeth, month, year, shade, type, ts: Date.now() });
  toast(lang === 'ar' ? `تم نسخ حالة ${doc}` : `Duplicated ${doc}'s case`, 'ok');
};

// ── CSV Export ────────────────────────
window.doCSV = function() {
  let list = Object.values(all);
  ['flYr','flMon','flDoc','flType'].forEach((id, i) => {
    const v = document.getElementById(id).value;
    if (v) {
      if (i === 0) list = list.filter(c => String(c.year)  === v);
      else if (i === 1) list = list.filter(c => String(c.month) === v);
      else if (i === 2) list = list.filter(c => c.doc === v);
      else list = list.filter(c => (c.type || 'CB') === v);
    }
  });
  const csv = '\uFEFF' + 'Year,Month,Doctor,Patient,Teeth,Type,Shade\n' +
    list.map(c => `${c.year||''},${c.month||''},${c.doc||''},${c.pat||''},${c.teeth||0},${c.type||'CB'},${c.shade||''}`).join('\n');
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })),
    download: `mas-dental-${Date.now()}.csv`
  }).click();
  toast(t('csvOk'), 'ok');
};

// ── PDF Export ────────────────────────
window.openPDF = function() {
  document.getElementById('pdfMon').value = document.getElementById('flMon').value || now.getMonth() + 1;
  document.getElementById('pOv').classList.add('on');
};
window.closePDF = () => document.getElementById('pOv').classList.remove('on');
document.getElementById('pOv').addEventListener('click', e => { if (e.target === document.getElementById('pOv')) closePDF(); });

const MONTHS_AR = ['','يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const MONTHS_EN = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const monthName = m => lang === 'ar' ? MONTHS_AR[m] : MONTHS_EN[m];

window.genPDF = function() {
  const month = +document.getElementById('pdfMon').value;
  const year  = +document.getElementById('pdfYr').value;
  let list = Object.values(all).filter(c => +c.month === month && +c.year === year);
  if (!list.length) { toast(t('errNoCases'), 'err'); return; }

  const byDoc  = {};
  list.forEach(c => { if (!byDoc[c.doc]) byDoc[c.doc] = []; byDoc[c.doc].push(c); });
  const total  = list.reduce((s, c) => s + (+c.teeth || 0), 0);
  const faT    = list.filter(c => (c.type || 'CB') === 'FA').reduce((s, c) => s + (+c.teeth || 0), 0);
  const cbT    = list.filter(c => (c.type || 'CB') === 'CB').reduce((s, c) => s + (+c.teeth || 0), 0);
  const docCnt = Object.keys(byDoc).length;
  const avgTth = list.length ? (total / list.length).toFixed(1) : 0;

  const summaryRows = Object.entries(byDoc)
    .sort((a, b) => b[1].reduce((s,c)=>s+(+c.teeth||0),0) - a[1].reduce((s,c)=>s+(+c.teeth||0),0))
    .map(([doc, cases]) => {
      const tot = cases.reduce((s,c)=>s+(+c.teeth||0),0);
      const fa  = cases.filter(c=>(c.type||'CB')==='FA').reduce((s,c)=>s+(+c.teeth||0),0);
      const cb  = cases.filter(c=>(c.type||'CB')==='CB').reduce((s,c)=>s+(+c.teeth||0),0);
      const pct = total ? Math.round(tot/total*100) : 0;
      return `<tr>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:800;color:#0f172a">${doc}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:13px;font-weight:700;color:#2563eb">${tot}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;font-weight:700;color:#1d4ed8">${fa||'—'}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;font-weight:700;color:#7c3aed">${cb||'—'}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center;font-size:12px;color:#64748b">${cases.length}</td>
        <td style="padding:9px 14px;border-bottom:1px solid #f1f5f9;text-align:center">
          <div style="display:inline-flex;align-items:center;gap:6px">
            <div style="width:60px;height:5px;background:#e2e8f0;border-radius:3px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:#2563eb;border-radius:3px"></div>
            </div>
            <span style="font-size:10px;color:#94a3b8;font-weight:700">${pct}%</span>
          </div>
        </td>
      </tr>`;
    }).join('');

  const detailSecs = Object.entries(byDoc).map(([doc, cases]) => {
    const tot  = cases.reduce((s,c)=>s+(+c.teeth||0),0);
    const faTs = cases.filter(c=>(c.type||'CB')==='FA').reduce((s,c)=>s+(+c.teeth||0),0);
    const cbTs = cases.filter(c=>(c.type||'CB')==='CB').reduce((s,c)=>s+(+c.teeth||0),0);
    const rows = cases.map((c, i) => `
      <tr style="background:${i%2===0?'#fff':'#f8fafc'}">
        <td style="padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#94a3b8;font-weight:600">${i+1}</td>
        <td style="padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:800;color:#0f172a">${c.teeth||0}</td>
        <td style="padding:7px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155">${c.pat||'—'}</td>
        <td style="padding:7px 14px;border-bottom:1px solid #f1f5f9;text-align:center">
          <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:800;background:${(c.type||'CB')==='FA'?'#eff6ff':'#f5f3ff'};color:${(c.type||'CB')==='FA'?'#1d4ed8':'#7c3aed'}">${c.type||'CB'}</span>
        </td>
        <td style="padding:7px 14px;border-bottom:1px solid #f1f5f9;text-align:center">
          ${c.shade?`<span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#fef3c7;color:#92400e">${c.shade}</span>`:`<span style="color:#cbd5e1;font-size:12px">—</span>`}
        </td>
      </tr>`).join('');
    return `<div style="margin-bottom:24px;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;page-break-inside:avoid">
      <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:13px 18px;display:flex;justify-content:space-between;align-items:center">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:rgba(255,255,255,0.18);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;color:#fff">${doc.charAt(0)}</div>
          <div style="font-size:16px;font-weight:900;color:#fff">${doc}</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          ${faTs?`<span style="background:rgba(255,255,255,0.15);color:#bfdbfe;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800">FA · ${faTs}</span>`:''}
          ${cbTs?`<span style="background:rgba(255,255,255,0.15);color:#ddd6fe;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:800">CB · ${cbTs}</span>`:''}
          <span style="background:rgba(255,255,255,0.25);color:#fff;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:900">${tot} سن</span>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;direction:rtl">
        <thead><tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
          <th style="padding:8px 14px;text-align:right;font-size:10px;color:#94a3b8;font-weight:700">#</th>
          <th style="padding:8px 14px;text-align:right;font-size:10px;color:#94a3b8;font-weight:700">أسنان</th>
          <th style="padding:8px 14px;text-align:right;font-size:10px;color:#94a3b8;font-weight:700">المريض</th>
          <th style="padding:8px 14px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700">النوع</th>
          <th style="padding:8px 14px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700">اللون</th>
        </tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr style="background:#f0f9ff;border-top:1.5px solid #bfdbfe">
          <td colspan="2" style="padding:10px 14px;font-size:12px;font-weight:900;color:#1d4ed8">المجموع: ${tot} سن</td>
          <td colspan="3" style="padding:10px 14px;text-align:left;font-size:11px;color:#64748b;font-weight:600">${cases.length} حالة · FA: ${faTs} · CB: ${cbTs}</td>
        </tr></tfoot>
      </table>
    </div>`;
  }).join('');

  const signatureBlock = `
    <div style="margin-top:32px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;direction:rtl">
      ${['مدير المختبر','المراجع','التاريخ'].map((lbl, i) => `
        <div style="text-align:center">
          <div style="height:42px;border-bottom:1.5px solid #cbd5e1;margin-bottom:7px;${i===2?'display:flex;align-items:flex-end;justify-content:center;padding-bottom:6px;font-size:12px;color:#475569;font-weight:700':''}">
            ${i===2?new Date().toLocaleDateString('ar-SA'):''}
          </div>
          <div style="font-size:10px;color:#94a3b8;font-weight:700;letter-spacing:0.5px">${lbl}</div>
        </div>`).join('')}
    </div>`;

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="UTF-8">
<title>MAS Dental Lab — تقرير ${monthName(month)} ${year}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Helvetica Neue',Arial,sans-serif;background:#fff;color:#0f172a}
@media print{body{padding:0}@page{margin:18mm 14mm;size:A4}.no-print{display:none!important}}
@media screen{body{padding:32px;max-width:860px;margin:0 auto}}</style>
</head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px solid #2563eb">
  <div style="display:flex;align-items:center;gap:14px">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:12px;padding:10px 16px;text-align:center">
      <div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:6px;line-height:1">MAS</div>
      <div style="font-size:6px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;margin-top:3px">DENTAL LAB</div>
    </div>
    <div>
      <div style="font-size:11px;font-weight:800;color:#0f172a">مختبر MAS لطب الأسنان</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px">تقرير الإنتاج الشهري</div>
    </div>
  </div>
  <div style="text-align:left;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px 16px">
    <div style="font-size:15px;font-weight:900;color:#0f172a">${monthName(month)} ${year}</div>
    <div style="font-size:10px;color:#94a3b8;margin-top:2px">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SA')}</div>
    <div style="margin-top:6px">
      <div style="font-size:11px;color:#475569"><span style="font-weight:700;color:#2563eb">${total}</span> سن إجمالي</div>
      <div style="font-size:11px;color:#475569;margin-top:2px"><span style="font-weight:700">${list.length}</span> حالة · <span style="font-weight:700">${docCnt}</span> طبيب</div>
    </div>
  </div>
</div>
<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:22px">
  ${[{n:total,l:'إجمالي الأسنان',c:'#2563eb',bg:'#eff6ff'},{n:list.length,l:'الحالات',c:'#0f172a',bg:'#f8fafc'},{n:faT,l:'Full Anatomy',c:'#1d4ed8',bg:'#eff6ff'},{n:cbT,l:'Cut Back',c:'#7c3aed',bg:'#f5f3ff'}]
    .map(s=>`<div style="background:${s.bg};border:1.5px solid ${s.c}22;border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:900;color:${s.c};line-height:1">${s.n}</div><div style="font-size:9px;color:#64748b;margin-top:4px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">${s.l}</div></div>`).join('')}
</div>
<div style="margin-bottom:28px;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden">
  <div style="background:#0f172a;padding:11px 16px"><span style="font-size:12px;font-weight:800;color:#e2e8f0">ملخص إنتاج الأطباء</span></div>
  <table style="width:100%;border-collapse:collapse;direction:rtl">
    <thead><tr style="background:#f8fafc;border-bottom:1.5px solid #e2e8f0">
      <th style="padding:9px 14px;text-align:right;font-size:10px;color:#94a3b8;font-weight:700">الطبيب</th>
      <th style="padding:9px 14px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700">الأسنان</th>
      <th style="padding:9px 14px;text-align:center;font-size:10px;color:#1d4ed8;font-weight:700">FA</th>
      <th style="padding:9px 14px;text-align:center;font-size:10px;color:#7c3aed;font-weight:700">CB</th>
      <th style="padding:9px 14px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700">الحالات</th>
      <th style="padding:9px 14px;text-align:center;font-size:10px;color:#94a3b8;font-weight:700">النسبة</th>
    </tr></thead>
    <tbody>${summaryRows}</tbody>
    <tfoot><tr style="background:#f0f9ff;border-top:1.5px solid #bfdbfe">
      <td style="padding:10px 14px;font-size:12px;font-weight:900;color:#1d4ed8">الإجمالي</td>
      <td style="padding:10px 14px;text-align:center;font-size:13px;font-weight:900;color:#2563eb">${total}</td>
      <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:800;color:#1d4ed8">${faT}</td>
      <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:800;color:#7c3aed">${cbT}</td>
      <td style="padding:10px 14px;text-align:center;font-size:12px;font-weight:700;color:#475569">${list.length}</td>
      <td style="padding:10px 14px;text-align:center;font-size:11px;color:#94a3b8;font-weight:700">متوسط ${avgTth}/حالة</td>
    </tr></tfoot>
  </table>
</div>
<div style="font-size:10px;font-weight:800;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px">
  <div style="flex:1;height:1px;background:#e2e8f0"></div>تفاصيل الحالات<div style="flex:1;height:1px;background:#e2e8f0"></div>
</div>
${detailSecs}
${signatureBlock}
<div style="margin-top:28px;padding-top:12px;border-top:1.5px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
  <div style="display:flex;align-items:center;gap:8px">
    <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:6px;padding:4px 8px"><span style="font-size:9px;font-weight:900;color:#fff;letter-spacing:3px">MAS</span></div>
    <span style="font-size:9px;color:#94a3b8">Dental Lab — نظام إدارة المختبر</span>
  </div>
  <div style="font-size:9px;color:#cbd5e1">سري وخاص بالمختبر</div>
</div>
<div class="no-print" style="margin-top:24px;text-align:center">
  <button onclick="window.print()" style="padding:12px 32px;background:#2563eb;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 14px rgba(37,99,235,0.35)">🖨️ طباعة / حفظ PDF</button>
</div>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=980');
  if (!w) { toast(lang==='ar'?'فعّل النوافذ المنبثقة في المتصفح':'Allow popups for this site', 'err'); return; }
  w.document.write(html);
  w.document.close();
  closePDF();
  toast(t('pdfOk'), 'ok');
};

// ── Navigation & Overlays ─────────────
window.showPg = function(n, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(b  => b.classList.remove('on'));
  document.getElementById('pg-' + n).classList.add('on');
  if (btn) btn.classList.add('on');
  if (n === 'stats') renderStats();
};
window.closeOv = id => document.getElementById(id).classList.remove('on');
document.querySelectorAll('.ov').forEach(el => el.addEventListener('click', e => {
  if (e.target === el) el.classList.remove('on');
}));

// ✅ [8] زر عائم (FAB) للإضافة السريعة من أي صفحة
(function createFAB() {
  const fab = document.createElement('button');
  fab.id = 'fabBtn';
  fab.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  fab.style.cssText = `
    position:fixed; bottom:80px; left:16px; z-index:400;
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#2563eb,#1d4ed8);
    color:#fff; border:none; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 16px rgba(37,99,235,0.45);
    transition:transform 0.15s, opacity 0.2s;
  `;
  fab.addEventListener('click', () => {
    showPg('add', document.querySelector('.tab'));
    document.querySelector('.tab').classList.add('on');
    setTimeout(() => document.getElementById('fPat').focus(), 400);
  });
  fab.addEventListener('touchstart', () => { fab.style.transform = 'scale(0.93)'; }, { passive:true });
  fab.addEventListener('touchend',   () => { fab.style.transform = ''; });
  document.getElementById('app').appendChild(fab);

  // أخفِ الـ FAB في صفحة الإضافة نفسها
  const observer = new MutationObserver(() => {
    const addActive = document.getElementById('pg-add')?.classList.contains('on');
    fab.style.opacity = addActive ? '0' : '1';
    fab.style.pointerEvents = addActive ? 'none' : 'auto';
  });
  observer.observe(document.getElementById('app'), { subtree: true, attributes: true, attributeFilter: ['class'] });
})();

// ── Toast ──────────────────────────────
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2300);
}
window.toast = toast;

// ── Init ───────────────────────────────
applyLang();
