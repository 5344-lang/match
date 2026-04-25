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
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore}%`; 
  document.getElementById('c-intro').innerText = u.intro;
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
if(slider) slider.addEventListener('input', updateSlider);
