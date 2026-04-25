const firebaseConfig = {
  apiKey: "AIzaSyDq-6FWN8J2Zup475x0F9665aTfeGT6O08",
  authDomain: "matching-app-2bca2.firebaseapp.com",
  projectId: "matching-app-2bca2",
  storageBucket: "matching-app-2bca2.firebasestorage.app",
  messagingSenderId: "1092047089858",
  appId: "1:1092047089858:web:8f925879d82a5f9e4b0b5b"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 1. 전역 변수 및 초기화
let myUserData = null;
let globalSettings = {};
let userMap = {};
let adminStepInitialized = false;
let currentSelectedEmoji = '👩';

const birthYearSelect = document.getElementById('birthYear');
if (birthYearSelect) {
  for (let year = 2005; year >= 1950; year--) {
    const option = document.createElement('option');
    option.value = year; option.innerText = `${year}년생`;
    if (year === 1996) option.selected = true; 
    birthYearSelect.appendChild(option);
  }
}

const sections = {
  auth: document.getElementById('auth-section'),
  profile: document.getElementById('profile-section'),
  waitroom: document.getElementById('waitroom-section'),
  result: document.getElementById('result-section'),
  admin: document.getElementById('admin-section')
};

// 2. 핵심 유틸리티 (화면 전환)
function showSection(sectionName) {
  Object.values(sections).forEach(sec => { if(sec) sec.style.display = 'none'; });
  if(sections[sectionName]) sections[sectionName].style.display = 'block';
}

function showWaitroomArea(areaName) {
  showSection('waitroom');
  ['waitroom-header', 'selection-area', 'submitted-lock-area', 'result-ready-area'].forEach(a => {
    const el = document.getElementById(a); if (el) el.style.display = 'none';
  });
  const target = document.getElementById(areaName); if (target) target.style.display = 'block';
}

window.goHome = function() {
  if(!myUserData) return showSection('auth');
  if (myUserData.status === 'matched') showWaitroomArea('result-ready-area');
  else if (myUserData.status === 'submitted') showWaitroomArea('submitted-lock-area');
  else {
    updateWaitroomUI();
    showWaitroomArea('waitroom-header');
  }
};

// 3. 마이페이지 열기 (안전성 강화 버전)
function openMyPage() {
  if(!myUserData) return alert("데이터를 불러오는 중입니다. 잠시만 기다려주세요.");
  if(myUserData.status === 'submitted' || myUserData.status === 'matched') return alert("제출 후에는 프로필 수정이 불가합니다.");
  
  // 기본 필드 채우기
  const fields = {
    'nickname': myUserData.nickname || "",
    'birthYear': myUserData.birthYear || "1996",
    'kakao-link': myUserData.kakaoLink || "",
    'intro': myUserData.intro || ""
  };
  
  Object.keys(fields).forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = fields[id];
  });

  // 참여 토글 및 잠금 메시지 처리
  const partToggle = document.getElementById('isParticipating');
  const lockMsg = document.getElementById('profile-confirm-lock-msg');
  if(partToggle) {
    partToggle.checked = myUserData.isParticipating !== false;
    if (myUserData.isProfileConfirmed) {
      partToggle.disabled = true;
      if(lockMsg) lockMsg.style.display = 'block';
    } else {
      partToggle.disabled = false;
      if(lockMsg) lockMsg.style.display = 'none';
    }
  }

  // 도시 선택 처리
  const citySelect = document.getElementById('city');
  const customCity = document.getElementById('custom-city');
  if(citySelect) {
    const savedCity = myUserData.city || "대구";
    let cityExists = Array.from(citySelect.options).some(opt => opt.value === savedCity);
    if (cityExists) {
      citySelect.value = savedCity;
      if(customCity) customCity.style.display = 'none';
    } else {
      citySelect.value = "기타";
      if(customCity) {
        customCity.value = savedCity;
        customCity.style.display = 'block';
      }
    }
  }

  // 이모티콘 그리드 복원
  const savedEmoji = myUserData.emoji || "👩";
  let found = false;
  const emojiItems = document.querySelectorAll('.emoji-item');
  const customEmojiInput = document.getElementById('custom-emoji');
  
  emojiItems.forEach(item => {
    item.classList.remove('selected');
    if (item.getAttribute('data-emoji') === savedEmoji) {
      item.classList.add('selected'); found = true;
    }
  });
  
  if (!found && customEmojiInput) {
    const etcBtn = document.querySelector('.emoji-item[data-emoji="기타"]');
    if(etcBtn) etcBtn.classList.add('selected');
    customEmojiInput.style.display = 'block';
    customEmojiInput.value = savedEmoji;
  }
  
  const previewEmoji = document.getElementById('preview-emoji');
  if(previewEmoji) previewEmoji.innerText = savedEmoji;
  currentSelectedEmoji = savedEmoji;

  // 슬라이더 복원
  const slider = document.getElementById('personality-slider');
  if(slider) {
    slider.value = myUserData.personalityScore || 50;
    updateSlider();
  }

  showSection('profile');
}

// 4. 대기실 UI 및 토글 (참여 시 분홍, 불참 시 검정)
function updateWaitroomUI() {
  const title = document.getElementById('room-status-title');
  const desc = document.getElementById('room-status-desc');
  const btn = document.getElementById('waitroom-mypage-btn');
  const toggle = document.getElementById('waitroom-participation-toggle');

  if (!myUserData || !btn) return;

  const isPart = myUserData.isParticipating !== false;
  if (toggle) toggle.checked = isPart;

  if (isPart) {
    if(title) title.innerText = "⏳ 매칭 시작 전입니다.";
    if(desc) desc.innerHTML = "진행자가 매칭을 시작할 때까지 잠시 기다려주세요.<br>그동안 내 프로필이 잘 설정되었는지 확인해볼까요?";
    btn.innerText = "🔍 내 프로필 점검하기";
    btn.style.background = "var(--soft-rose)"; // 🌟 참여 중: 분홍색
  } else {
    if(title) title.innerText = "💤 이번 매칭에 참여하지 않네요.";
    if(desc) desc.innerHTML = "다음에 만나요!<br>만약 참여를 원하신다면 위 토글을 켜주세요.";
    btn.innerText = "✏️ 내 프로필 수정하기";
    btn.style.background = "var(--deep-navy)"; // 🌟 불참 중: 검정색
  }
}

// 대기실 토글 즉시 반영 (낙관적 업데이트)
const waitToggle = document.getElementById('waitroom-participation-toggle');
if (waitToggle) {
  waitToggle.addEventListener('change', function() {
    const isPart = this.checked;
    if (myUserData) {
      myUserData.isParticipating = isPart; 
      updateWaitroomUI(); 
    }
    const user = auth.currentUser;
    if (user) {
      db.collection('users').doc(user.uid).update({ isParticipating: isPart });
    }
  });
}

// 5. 인증 상태 감시 및 새로고침 대응
auth.onAuthStateChanged(user => {
  if (user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
      if (doc.exists) {
        myUserData = doc.data();
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('mypage-btn').style.display = 'inline-block';
        if (myUserData.isAdmin) {
          document.getElementById('admin-link-btn').style.display = 'inline-block';
          if (!adminStepInitialized) { loadAdminData(); adminStepInitialized = true; }
        }
        const greeting = document.getElementById('user-greeting');
        if(greeting) {
          greeting.innerText = `${myUserData.nickname || '회원'}님!`;
          greeting.style.display = 'inline-block';
        }
        
        if (myUserData.nickname) {
          goHome(); // 🌟 새로고침 시 즉시 화면 찾아주기
          listenToGlobalSettings(); 
        } else {
          showSection('profile');
        }
      } else {
        showSection('profile');
      }
    });
  } else {
    showSection('auth');
    ['logout-btn', 'mypage-btn', 'admin-link-btn', 'user-greeting'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });
  }
});

// 6. 카드 매칭 및 지망 변경 팝업
window.pickCard = function(prefType) {
  const u = allUsers[currentIndex];
  if(!u) return;
  for (let key in mySelections) {
    if (key !== prefType && mySelections[key] === u.id) return alert("이미 다른 지망에 선택된 분입니다.");
  }
  // 🌟 지망 변경 확인 팝업
  if (mySelections[prefType] && mySelections[prefType] !== u.id) {
    if (!confirm(`${u.nickname}님으로 변경하시겠습니까?`)) return;
  }
  mySelections[prefType] = u.id;
  const nameEl = document.getElementById(mapIds[prefType]);
  if(nameEl) {
    nameEl.innerText = u.nickname;
    nameEl.style.color = "#FD79A8";
    document.getElementById(resetBtnIds[prefType]).style.display = "inline-block";
  }
  document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
  db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); }
};

// --- 이하 기타 함수들 (기존 로직 유지하되 에러 방지 처리) ---
function updateSlider() {
  const slider = document.getElementById('personality-slider');
  const label = document.getElementById('spectrum-label');
  if(!slider || !label) return;
  const val = slider.value;
  slider.style.background = `linear-gradient(to right, #1A2B3C ${val}%, #FD79A8 ${val}%, #FD79A8 100%)`;
  label.innerText = getScoreLabel(val);
}
function getScoreLabel(val) {
  if (val <= 12) return "완전 한글"; if (val <= 37) return "한세글";
  if (val <= 62) return "세글"; if (val <= 87) return "두세글"; return "완전 두글";
}
function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    globalSettings = doc.data();
    // 전광판/결과발표 등 기존 실시간 로직 실행
    if (globalSettings.resultsPublished && myUserData.status === 'matched') { showWaitroomArea('result-ready-area'); return; }
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') { showWaitroomArea('submitted-lock-area'); return; }
    if (globalSettings.isMatchingActive && myUserData.isParticipating) { showWaitroomArea('selection-area'); loadCards(); } 
    else { updateWaitroomUI(); showWaitroomArea('waitroom-header'); }
  });
}
function loadCards() {
  db.collection('users').where('isParticipating', '==', true)
    .where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => { if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, ...doc.data() }); });
      currentIndex = 0; renderCard();
  });
}
function renderCard() {
  const u = allUsers[currentIndex]; if (!u) return;
  const emojiEl = document.getElementById('c-emoji');
  if(emojiEl) emojiEl.innerText = u.emoji || '👩';
  document.getElementById('c-nickname').innerHTML = `${u.nickname} <span id="c-age">${u.birthYear % 100}년생</span>`;
  document.getElementById('c-city').innerText = u.city;
  document.getElementById('c-score-label').innerText = getScoreLabel(u.personalityScore || 50);
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore}%`;
  document.getElementById('c-intro').innerText = u.intro || '';
  document.getElementById('card-counter').innerText = `${currentIndex + 1} / ${allUsers.length}`;
}
let allUsers = []; let currentIndex = 0; let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

// 버튼 연결
document.getElementById('mypage-btn').addEventListener('click', openMyPage);
document.getElementById('waitroom-mypage-btn').addEventListener('click', openMyPage);
document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });
document.getElementById('admin-link-btn').addEventListener('click', () => showSection('admin'));

// 슬라이더
const sliderEl = document.getElementById('personality-slider');
if (sliderEl) sliderEl.addEventListener('input', updateSlider);

// 이모지 그리드
document.querySelectorAll('.emoji-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('selected'));
    this.classList.add('selected');
    const emoji = this.getAttribute('data-emoji');
    const customEmojiInput = document.getElementById('custom-emoji');
    if (emoji === '기타') {
      customEmojiInput.style.display = 'block';
      currentSelectedEmoji = customEmojiInput.value || '✏️';
    } else {
      if (customEmojiInput) customEmojiInput.style.display = 'none';
      currentSelectedEmoji = emoji;
    }
    const preview = document.getElementById('preview-emoji');
    if (preview) preview.innerText = currentSelectedEmoji;
  });
});

const customEmojiInput = document.getElementById('custom-emoji');
if (customEmojiInput) {
  customEmojiInput.addEventListener('input', function() {
    currentSelectedEmoji = this.value || '✏️';
    const preview = document.getElementById('preview-emoji');
    if (preview) preview.innerText = currentSelectedEmoji;
  });
}

// 지역 선택
const citySelect = document.getElementById('city');
if (citySelect) {
  citySelect.addEventListener('change', function() {
    const customCityInput = document.getElementById('custom-city');
    if (customCityInput) customCityInput.style.display = this.value === '기타' ? 'block' : 'none';
  });
}

// 로그인
document.getElementById('login-btn').addEventListener('click', async () => {
  const userid = document.getElementById('userid').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!userid || !password) return alert('아이디와 비밀번호를 입력해주세요.');
  try {
    await auth.signInWithEmailAndPassword(`${userid}@matchapp.local`, password);
  } catch (e) {
    alert('로그인 실패. 아이디 또는 비밀번호를 확인해주세요.');
  }
});

// 회원가입
document.getElementById('signup-btn').addEventListener('click', async () => {
  const userid = document.getElementById('userid').value.trim();
  const password = document.getElementById('password').value.trim();
  if (!userid || !password) return alert('아이디와 비밀번호를 입력해주세요.');
  if (password.length < 4) return alert('비밀번호는 4자리 이상이어야 합니다.');
  try {
    const cred = await auth.createUserWithEmailAndPassword(`${userid}@matchapp.local`, password);
    await db.collection('users').doc(cred.user.uid).set({
      userid, isParticipating: true, status: 'waiting', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch (e) {
    if (e.code === 'auth/email-already-in-use') alert('이미 사용 중인 아이디입니다.');
    else alert('회원가입 실패: ' + e.message);
  }
});

// 프로필 저장
document.getElementById('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('nickname').value.trim();
  const birthYear = parseInt(document.getElementById('birthYear').value);
  const kakaoLink = document.getElementById('kakao-link').value.trim();
  const intro = document.getElementById('intro').value.trim();
  const isParticipating = document.getElementById('isParticipating').checked;
  const citySelectEl = document.getElementById('city');
  const city = citySelectEl.value === '기타'
    ? document.getElementById('custom-city').value.trim()
    : citySelectEl.value;
  const personalityScore = parseInt(document.getElementById('personality-slider').value);
  const emoji = currentSelectedEmoji || '👩';

  if (!nickname) return alert('닉네임을 입력해주세요.');
  if (!kakaoLink) return alert('카카오톡 링크를 입력해주세요.');

  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById('save-profile-btn');
  btn.disabled = true; btn.innerText = '저장 중...';
  try {
    await db.collection('users').doc(user.uid).set({
      nickname, birthYear, kakaoLink, intro,
      isParticipating, city, personalityScore, emoji,
      isProfileConfirmed: true,
      status: (myUserData && myUserData.status) ? myUserData.status : 'waiting'
    }, { merge: true });
    alert('프로필이 저장되었습니다!');
    goHome();
  } catch (e) {
    alert('저장 실패: ' + e.message);
  } finally {
    btn.disabled = false; btn.innerText = '프로필 저장';
  }
});

// 계정 탈퇴
document.getElementById('withdraw-btn').addEventListener('click', async () => {
  if (!confirm('정말로 계정을 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.')) return;
  const user = auth.currentUser;
  if (!user) return;
  try {
    await db.collection('users').doc(user.uid).delete();
    await user.delete();
    alert('탈퇴가 완료되었습니다.');
    location.reload();
  } catch (e) {
    alert('탈퇴 실패. 재로그인 후 다시 시도해주세요.');
  }
});

// 지망 제출
document.getElementById('submit-selection-btn').addEventListener('click', async () => {
  if (!mySelections.pref1) return alert('1지망을 선택해주세요.');
  if (!confirm('이대로 최종 제출하시겠습니까?')) return;
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('requests').doc(user.uid).set({ ...mySelections, isDraft: false });
  await db.collection('users').doc(user.uid).update({ status: 'submitted' });
  if (myUserData) myUserData.status = 'submitted';
  showWaitroomArea('submitted-lock-area');
});

// 지망 수정
document.getElementById('edit-picks-btn').addEventListener('click', async () => {
  if (!confirm('제출을 취소하고 다시 선택하시겠습니까?')) return;
  const user = auth.currentUser;
  if (!user) return;
  await db.collection('users').doc(user.uid).update({ status: 'waiting' });
  await db.collection('requests').doc(user.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  if (myUserData) myUserData.status = 'waiting';
  showWaitroomArea('selection-area');
  loadCards();
});

// 결과 확인
document.getElementById('check-result-btn').addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user || !myUserData) return;
  const matchDoc = await db.collection('matches').doc(user.uid).get();
  if (!matchDoc.exists) { alert('아직 결과가 없습니다.'); return; }
  const partnerId = matchDoc.data().partnerId;
  if (!partnerId) {
    showSection('result');
    document.querySelector('.result-title').innerText = '😢 이번엔 아쉽게...';
    document.querySelector('.result-msg').innerText = '다음 회차에 좋은 인연을 만나길 바랍니다!';
    document.getElementById('anim-partner-card').style.display = 'none';
    document.querySelector('.heart-icon').style.display = 'none';
    return;
  }
  const partnerDoc = await db.collection('users').doc(partnerId).get();
  const partner = partnerDoc.data();
  document.getElementById('r-my-emoji').innerText = myUserData.emoji || '👩';
  document.getElementById('r-my-nick').innerText = myUserData.nickname;
  document.getElementById('r-partner-emoji').innerText = partner.emoji || '👩';
  document.getElementById('r-partner-nick').innerText = partner.nickname;
  document.getElementById('r-partner-desc').innerText = `${partner.birthYear % 100}년생 · ${partner.city}`;
  const kakaoBtn = document.getElementById('kakao-contact-btn');
  kakaoBtn.style.display = 'block';
  kakaoBtn.onclick = () => window.open(partner.kakaoLink, '_blank');
  showSection('result');
  setTimeout(() => {
    const container = document.querySelector('.cards-animation-container');
    if (container) container.classList.add('animate-start');
  }, 100);
});

// 카드 이전/다음
window.prevCard = function() {
  if (currentIndex > 0) { currentIndex--; renderCard(); }
};
window.nextCard = function() {
  if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); }
};

// 지망 초기화
window.resetPick = function(prefType) {
  mySelections[prefType] = null;
  const nameEl = document.getElementById(mapIds[prefType]);
  if (nameEl) { nameEl.innerText = '미선택'; nameEl.style.color = ''; }
  const resetBtn = document.getElementById(resetBtnIds[prefType]);
  if (resetBtn) resetBtn.style.display = 'none';
  document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
  const user = auth.currentUser;
  if (user) db.collection('requests').doc(user.uid).set({ ...mySelections, isDraft: true }, { merge: true });
};

// 8. 관리자 기능
function loadAdminData() {
  const container = document.getElementById('admin-participant-list');
  if (!container) return;
  container.innerHTML = `
    <div class="admin-step-indicator">
      <div class="step-item" onclick="goToAdminStep(1)"><div class="step-circle active" id="a-step-1">1</div><div class="step-label">참여자</div></div>
      <div class="step-connector" id="a-conn-1"></div>
      <div class="step-item" onclick="goToAdminStep(2)"><div class="step-circle" id="a-step-2">2</div><div class="step-label">매칭 시작</div></div>
      <div class="step-connector" id="a-conn-2"></div>
      <div class="step-item" onclick="goToAdminStep(3)"><div class="step-circle" id="a-step-3">3</div><div class="step-label">결과 발표</div></div>
    </div>
    <div id="a-step-content"></div>
    <div class="step-nav-bottom" id="a-step-nav"></div>
  `;
  goToAdminStep(1);
}

let adminCurrentStep = 1;
window.goToAdminStep = function(n) {
  adminCurrentStep = n;
  [1, 2, 3].forEach(i => {
    const circle = document.getElementById(`a-step-${i}`);
    const conn = document.getElementById(`a-conn-${i}`);
    if (circle) circle.className = 'step-circle' + (i < n ? ' done' : i === n ? ' active' : '');
    if (conn) conn.className = 'step-connector' + (i < n ? ' done' : '');
  });
  const content = document.getElementById('a-step-content');
  const nav = document.getElementById('a-step-nav');
  if (!content) return;

  if (n === 1) {
    content.innerHTML = '<div class="requests-list" id="a-participant-list">로딩 중...</div>';
    nav.innerHTML = '<button class="step-nav-btn" onclick="goToAdminStep(2)">다음 단계 →</button>';
    db.collection('users').where('isParticipating', '==', true).get().then(snap => {
      let html = `<p style="font-weight:800;margin-bottom:10px;">참여자 ${snap.size}명</p>`;
      snap.forEach(doc => {
        const d = doc.data();
        html += `<p style="padding:6px 0;border-bottom:1px solid #eee;">${d.emoji || '👤'} <b>${d.nickname}</b> (${d.birthYear}년생) · ${d.city}</p>`;
      });
      const el = document.getElementById('a-participant-list');
      if (el) el.innerHTML = html;
    });
  } else if (n === 2) {
    content.innerHTML = `
      <p style="margin-bottom:15px;font-size:0.9rem;color:#555;text-align:center;">매칭을 시작하면 참여자들이 서로를 선택할 수 있습니다.</p>
      <button onclick="window.adminToggleMatching(true)" style="background:#27ae60;color:white;margin-bottom:10px;">▶ 매칭 시작</button>
      <button onclick="window.adminToggleMatching(false)" style="background:#e74c3c;color:white;margin-bottom:15px;">■ 매칭 종료</button>
      <div id="a-requests-view" class="requests-list">로딩 중...</div>`;
    nav.innerHTML = '<button class="step-nav-btn secondary" onclick="goToAdminStep(1)">← 이전</button><button class="step-nav-btn" onclick="goToAdminStep(3)">다음 →</button>';
    db.collection('requests').where('isDraft', '==', false).get().then(snap => {
      let html = `<p style="font-weight:800;margin-bottom:8px;">제출 완료: ${snap.size}명</p>`;
      const promises = [];
      snap.forEach(doc => { promises.push({ id: doc.id, ...doc.data() }); });
      const el = document.getElementById('a-requests-view');
      if (el) el.innerHTML = html + promises.map(r =>
        `<p style="padding:4px 0;border-bottom:1px solid #eee;">uid:${r.id.substring(0,6)}… → 1지망:${(r.pref1||'-').substring(0,6)}…</p>`
      ).join('');
    });
  } else if (n === 3) {
    content.innerHTML = `
      <p style="margin-bottom:15px;font-size:0.9rem;color:#555;text-align:center;">매칭 알고리즘을 실행한 뒤 결과를 발표하세요.</p>
      <button onclick="window.adminRunMatching()" style="background:#8e44ad;color:white;margin-bottom:10px;">🔮 매칭 알고리즘 실행</button>
      <button onclick="window.adminPublishResults()" style="background:var(--soft-rose);color:white;margin-bottom:15px;">📣 결과 발표</button>
      <div id="a-match-view" class="requests-list">로딩 중...</div>`;
    nav.innerHTML = '<button class="step-nav-btn secondary" onclick="goToAdminStep(2)">← 이전</button>';
    db.collection('matches').get().then(snap => {
      const el = document.getElementById('a-match-view');
      if (el) el.innerHTML = `<p style="font-weight:800;">매칭된 쌍: ${Math.floor(snap.size / 2)}쌍</p>`;
    });
  }
};

window.adminToggleMatching = function(active) {
  db.collection('settings').doc('global').set({ isMatchingActive: active }, { merge: true });
  alert(active ? '매칭이 시작되었습니다.' : '매칭이 종료되었습니다.');
};

window.adminRunMatching = async function() {
  if (!confirm('매칭 알고리즘을 실행하시겠습니까?')) return;
  const snap = await db.collection('requests').where('isDraft', '==', false).get();
  const requests = {};
  snap.forEach(doc => { requests[doc.id] = doc.data(); });
  const matched = {};
  const userIds = Object.keys(requests);

  for (const uid of userIds) {
    if (matched[uid]) continue;
    const prefs = [requests[uid].pref1, requests[uid].pref2, requests[uid].pref3].filter(Boolean);
    for (const prefId of prefs) {
      if (!prefId || matched[prefId] || !requests[prefId]) continue;
      const theirPrefs = [requests[prefId].pref1, requests[prefId].pref2, requests[prefId].pref3].filter(Boolean);
      const noDispref = requests[uid].dispref1 !== prefId && requests[prefId].dispref1 !== uid;
      if (theirPrefs.includes(uid) && noDispref) {
        matched[uid] = prefId; matched[prefId] = uid; break;
      }
    }
  }

  const batch = db.batch();
  for (const [uid, partnerId] of Object.entries(matched)) {
    batch.set(db.collection('matches').doc(uid), { partnerId });
    batch.update(db.collection('users').doc(uid), { status: 'matched' });
  }
  await batch.commit();
  const pairs = Object.keys(matched).length / 2;
  alert(`매칭 완료! ${pairs}쌍이 매칭되었습니다.`);
  const el = document.getElementById('a-match-view');
  if (el) el.innerHTML = `<p style="font-weight:800;">매칭된 쌍: ${pairs}쌍</p>`;
};

window.adminPublishResults = function() {
  if (!confirm('결과를 발표하시겠습니까?')) return;
  db.collection('settings').doc('global').set({ resultsPublished: true }, { merge: true });
  alert('결과가 발표되었습니다!');
};
