(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const state = {
    googleClientId: '',
    user: null,
    language: 'th',
    cv: { name: '', type: '', text: '', base64: '' },
    history: [],
    lastResult: ''
  };

  const els = {
    signinCard: $('signinCard'),
    portfolioCard: $('portfolioCard'),
    googleBtn: $('googleBtn'),
    signinError: $('signinError'),
    userInfo: $('userInfo'),
    logoutBtn: $('logoutBtn'),

    nameInput: $('nameInput'),
    expertiseInput: $('expertiseInput'),
    dropZone: $('dropZone'),
    fileInput: $('fileInput'),
    fileInfo: $('fileInfo'),
    fileName: $('fileName'),
    fileRemove: $('fileRemove'),
    langBtns: document.querySelectorAll('.lang-btn'),

    generateBtn: $('generateBtn'),
    errorBox: $('errorBox'),
    resultCard: $('resultCard'),
    resultText: $('resultText'),
    copyBtn: $('copyBtn'),
    followupInput: $('followupInput'),
    followupBtn: $('followupBtn'),
    resetBtn: $('resetBtn'),
    nextStepBtn: $('nextStepBtn')
  };

  /* ---------- API helpers ---------- */

  async function api(path, opts = {}) {
    const res = await fetch(path, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    let data = null;
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) {
      const msg = (data && data.error) ? data.error : `HTTP ${res.status}`;
      const err = new Error(msg);
      err.status = res.status;
      throw err;
    }
    return data;
  }

  /* ---------- Sign-in flow ---------- */

  async function bootstrap() {
    try {
      const cfg = await api('api/config');
      state.googleClientId = cfg.googleClientId || '';
    } catch (err) {
      showSigninError('โหลดการตั้งค่าไม่สำเร็จ');
      return;
    }

    try {
      const me = await api('api/auth/me');
      state.user = me.user;
      showPortfolio();
    } catch (err) {
      showSignin();
    }
  }

  function showSignin() {
    els.portfolioCard.hidden = true;
    els.signinCard.hidden = false;
    initGoogleButton();
  }

  function showPortfolio() {
    els.signinCard.hidden = true;
    els.portfolioCard.hidden = false;
    renderUserInfo();
  }

  function renderUserInfo() {
    if (!state.user) { els.userInfo.textContent = ''; return; }
    const pic = state.user.picture
      ? `<img src="${state.user.picture}" alt="" referrerpolicy="no-referrer" />`
      : '';
    els.userInfo.innerHTML = `${pic}<span>${state.user.email || state.user.name || ''}</span>`;
  }

  function showSigninError(msg) {
    els.signinError.textContent = msg;
    els.signinError.hidden = false;
  }

  function initGoogleButton() {
    if (!state.googleClientId) {
      showSigninError('ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID บนเซิร์ฟเวอร์');
      return;
    }
    const tryInit = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) {
        return false;
      }
      window.google.accounts.id.initialize({
        client_id: state.googleClientId,
        callback: onGoogleCredential
      });
      window.google.accounts.id.renderButton(els.googleBtn, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'pill'
      });
      return true;
    };
    if (!tryInit()) {
      const iv = setInterval(() => { if (tryInit()) clearInterval(iv); }, 150);
      setTimeout(() => clearInterval(iv), 8000);
    }
  }

  async function onGoogleCredential(response) {
    try {
      const data = await api('api/auth/google', {
        method: 'POST',
        body: JSON.stringify({ credential: response.credential })
      });
      state.user = data.user;
      els.signinError.hidden = true;
      showPortfolio();
    } catch (err) {
      showSigninError(err.message || 'เข้าสู่ระบบไม่สำเร็จ');
    }
  }

  async function logout() {
    try { await api('api/auth/logout', { method: 'POST' }); } catch (_) {}
    state.user = null;
    state.history = [];
    location.reload();
  }

  /* ---------- Language toggle ---------- */

  function setLanguage(lang) {
    state.language = lang;
    els.langBtns.forEach((b) => {
      b.classList.toggle('active', b.dataset.lang === lang);
    });
  }

  /* ---------- CV upload ---------- */

  function handleFile(file) {
    clearError();
    if (!file) return;
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      showError('ไฟล์มีขนาดเกิน 2MB');
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isTxt = file.type === 'text/plain' || /\.txt$/i.test(file.name);
    if (!isPdf && !isTxt) {
      showError('รองรับเฉพาะไฟล์ PDF หรือ TXT');
      return;
    }

    const reader = new FileReader();
    if (isPdf) {
      reader.onload = () => {
        const dataUrl = reader.result || '';
        const base64 = String(dataUrl).split(',')[1] || '';
        state.cv = { name: file.name, type: 'pdf', text: '', base64 };
        renderFileInfo();
      };
      reader.onerror = () => showError('อ่านไฟล์ไม่สำเร็จ');
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        state.cv = { name: file.name, type: 'txt', text: String(reader.result || ''), base64: '' };
        renderFileInfo();
      };
      reader.onerror = () => showError('อ่านไฟล์ไม่สำเร็จ');
      reader.readAsText(file);
    }
  }

  function renderFileInfo() {
    if (state.cv.name) {
      els.fileName.textContent = state.cv.name;
      els.fileInfo.hidden = false;
    } else {
      els.fileInfo.hidden = true;
    }
  }

  function clearFile() {
    state.cv = { name: '', type: '', text: '', base64: '' };
    els.fileInput.value = '';
    renderFileInfo();
  }

  /* ---------- Errors ---------- */

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.hidden = false;
  }
  function clearError() {
    els.errorBox.textContent = '';
    els.errorBox.hidden = true;
  }

  /* ---------- Generate ---------- */

  function setBusy(busy) {
    els.generateBtn.disabled = busy;
    els.generateBtn.setAttribute('aria-busy', busy ? 'true' : 'false');
    els.followupBtn.disabled = busy;
  }

  async function callSuggest(payload) {
    return api('api/suggest', { method: 'POST', body: JSON.stringify(payload) });
  }

  async function generate() {
    clearError();
    const name = els.nameInput.value.trim();
    const expertise = els.expertiseInput.value.trim();
    if (!name) { showError('กรุณากรอกชื่อ-ตำแหน่ง'); return; }
    if (!expertise) { showError('กรุณากรอกความเชี่ยวชาญ'); return; }

    setBusy(true);
    try {
      const payload = {
        name,
        expertise,
        language: state.language,
        cvText: state.cv.type === 'txt' ? state.cv.text : '',
        cvPdfBase64: state.cv.type === 'pdf' ? state.cv.base64 : '',
        history: []
      };
      const data = await callSuggest(payload);
      const result = data.result || '';
      state.lastResult = result;
      state.history = [
        { role: 'user', content: `สร้าง Profile สำหรับ ${name} (${expertise})` },
        { role: 'assistant', content: result }
      ];
      renderResult(result);
      els.nextStepBtn.disabled = false;
    } catch (err) {
      if (err.status === 401) {
        showError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        setTimeout(() => location.reload(), 1500);
      } else {
        showError(err.message || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setBusy(false);
    }
  }

  async function followUp() {
    const text = els.followupInput.value.trim();
    if (!text) return;
    clearError();
    setBusy(true);
    try {
      const payload = {
        language: state.language,
        history: state.history,
        followUp: text
      };
      const data = await callSuggest(payload);
      const result = data.result || '';
      state.lastResult = result;
      state.history.push({ role: 'user', content: text });
      state.history.push({ role: 'assistant', content: result });
      renderResult(result);
      els.followupInput.value = '';
    } catch (err) {
      if (err.status === 401) {
        showError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
        setTimeout(() => location.reload(), 1500);
      } else {
        showError(err.message || 'เกิดข้อผิดพลาด');
      }
    } finally {
      setBusy(false);
    }
  }

  function renderResult(text) {
    els.resultText.textContent = text;
    els.resultCard.hidden = false;
    els.resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function resetAll() {
    els.nameInput.value = '';
    els.expertiseInput.value = '';
    clearFile();
    setLanguage('th');
    els.resultCard.hidden = true;
    els.resultText.textContent = '';
    els.followupInput.value = '';
    els.nextStepBtn.disabled = true;
    state.history = [];
    state.lastResult = '';
    clearError();
  }

  async function copyResult() {
    if (!state.lastResult) return;
    try {
      await navigator.clipboard.writeText(state.lastResult);
      const original = els.copyBtn.textContent;
      els.copyBtn.textContent = '✅ คัดลอกแล้ว';
      setTimeout(() => { els.copyBtn.textContent = original; }, 2000);
    } catch (_) {
      showError('คัดลอกไม่สำเร็จ');
    }
  }

  /* ---------- Events ---------- */

  function bindEvents() {
    els.logoutBtn.addEventListener('click', logout);

    els.langBtns.forEach((b) => {
      b.addEventListener('click', () => setLanguage(b.dataset.lang));
    });

    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
    });
    els.dropZone.addEventListener('dragover', (e) => {
      e.preventDefault(); els.dropZone.classList.add('dragover');
    });
    els.dropZone.addEventListener('dragleave', () => els.dropZone.classList.remove('dragover'));
    els.dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      els.dropZone.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    els.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
    });
    els.fileRemove.addEventListener('click', clearFile);

    els.generateBtn.addEventListener('click', generate);
    els.copyBtn.addEventListener('click', copyResult);
    els.followupBtn.addEventListener('click', followUp);
    els.followupInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); followUp(); }
    });
    els.resetBtn.addEventListener('click', resetAll);
  }

  bindEvents();
  bootstrap();
})();
