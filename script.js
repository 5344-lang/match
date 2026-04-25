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

// 1. 초기 설정 (연도 생성 1950~2005)
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

// 2. 화면 전환 유틸리티
function showSection(sectionName) {
  Object.values(sections).forEach(sec => { if(sec) sec.style.display = 'none'; });
  if(sections[sectionName]) sections[sectionName].style.display = 'block';
}

function showWaitroomArea(areaName) {
  showSection('waitroom');
  ['waitroom-header', 'selection-area', 'submitted-lock-area', 'result-ready-area', 'profile-check-area'].forEach(a => {
    const el = document.getElementById(a);
    if (el) el.style.display = 'none';
  });
  const target = document.getElementById(areaName);
  if (target) target.style.display = 'block';
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

function getScoreLabel(val) {
  if (val <= 12) return "완전 한글"; if (val <= 37) return "한세글";
  if (val <= 62) return "세글"; if (val <= 87) return "두세글"; return "완전 두글";
}

// 3. 성향 스펙트럼 및 이모티콘 설정
const slider = document.getElementById('personality-slider');
const spectrumLabel = document.getElementById('spectrum-label');
function updateSlider() {
  if(!slider || !spectrumLabel) return;
  const val = slider.value;
  slider.style.background = `linear-gradient(to right, #1A2B3C ${val}%, #FD79A8 ${val}%, #FD79A8 100%)`;
  spectrumLabel.innerText = getScoreLabel(val);
}
if(slider) slider.addEventListener('input', updateSlider);

let currentSelectedEmoji = "👩";
const emojiItems = document.querySelectorAll('.emoji-item');
const customEmojiInput = document.getElementById('custom-emoji');
const previewEmoji = document.getElementById('preview-emoji');

emojiItems.forEach(item => {
  item.addEventListener('click', () => {
    emojiItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    const emoji = item.getAttribute('data-emoji');
    if (emoji === '기타') {
      if(customEmojiInput) { customEmojiInput.style.display = 'block'; customEmojiInput.required = true; }
      currentSelectedEmoji = (customEmojiInput && customEmojiInput.value) || '👩';
    } else {
      if(customEmojiInput) { customEmojiInput.style.display = 'none'; customEmojiInput.required = false; }
      currentSelectedEmoji = emoji;
    }
    if(previewEmoji) previewEmoji.innerText = currentSelectedEmoji;
  });
});

if(customEmojiInput) customEmojiInput.addEventListener('input', function() { 
  currentSelectedEmoji = this.value || '👩'; 
  if(previewEmoji) previewEmoji.innerText = currentSelectedEmoji; 
});

// 4. 회원 인증 및 상태 감시
let myUserData = null;
let globalSettings = {};
let adminStepInitialized = false;

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
        document.getElementById('user-greeting').innerText = `${myUserData.nickname}님!`;
        document.getElementById('user-greeting').style.display = 'inline-block';
        
        if (myUserData.nickname) {
          goHome(); // 🌟 새로고침 시 즉시 대기실 화면 표시
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

// 5. 대기실 UI 및 토글 로직
function updateWaitroomUI() {
  const title = document.getElementById('room-status-title');
  const desc = document.getElementById('room-status-desc');
  const btn = document.getElementById('waitroom-mypage-btn');
  const toggle = document.getElementById('waitroom-participation-toggle');

  if (!myUserData || !btn) return;

  const isPart = myUserData.isParticipating !== false;
  if (toggle) toggle.checked = isPart; // 서버 데이터와 동기화

  if (isPart) {
    title.innerText = "⏳ 매칭 시작 전입니다.";
    desc.innerHTML = "진행자가 매칭을 시작할 때까지 잠시 기다려주세요.<br>그동안 내 프로필이 잘 설정되었는지 확인해볼까요?";
    btn.innerText = "🔍 내 프로필 점검하기";
    btn.style.background = "var(--soft-rose)"; // 🌟 참여 시 분홍색
  } else {
    title.innerText = "💤 이번 매칭에 참여하지 않네요.";
    desc.innerHTML = "다음에 만나요!<br>만약 참여를 원하신다면 위 토글을 켜주세요.";
    btn.innerText = "✏️ 내 프로필 수정하기";
    btn.style.background = "var(--deep-navy)"; // 🌟 불참 시 검정색
  }
}

// 대기실 토글 즉시 반영 (낙관적 업데이트)
const waitToggle = document.getElementById('waitroom-participation-toggle');
if (waitToggle) {
  waitToggle.addEventListener('change', function() {
    const isPart = this.checked;
    if (myUserData) {
      myUserData.isParticipating = isPart; // 로컬 데이터 즉시 변경
      updateWaitroomUI(); // UI 즉시 갱신
    }
    const user = auth.currentUser;
    if (user) {
      db.collection('users').doc(user.uid).update({ isParticipating: isPart });
    }
  });
}

function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    globalSettings = doc.data();
    
    if (globalSettings.resultsPublished && myUserData.status === 'matched') {
      showWaitroomArea('result-ready-area'); return;
    }
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') {
      showWaitroomArea('submitted-lock-area'); return;
    }
    if (globalSettings.isMatchingActive && myUserData.isParticipating) {
      showWaitroomArea('selection-area'); loadCards();
    } else {
      updateWaitroomUI();
      showWaitroomArea('waitroom-header');
    }
  });
}

// 6. 카드 매칭 시스템
let allUsers = []; let currentIndex = 0; 
let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

function loadCards() {
  db.collection('users').where('isParticipating', '==', true)
    .where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => { 
        if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, ...doc.data() }); 
      });
      
      // DB에서 기존 선택 내역 불러오기
      db.collection('requests').doc(auth.currentUser.uid).get().then(reqDoc => {
        const saved = reqDoc.exists ? reqDoc.data() : {};
        ['pref1', 'pref2', 'pref3', 'dispref1'].forEach(key => {
          const el = document.getElementById(mapIds[key]);
          const resetBtn = document.getElementById(resetBtnIds[key]);
          const user = allUsers.find(u => u.id === saved[key]);
          if (user) {
            mySelections[key] = saved[key];
            el.innerText = user.nickname; el.style.color = '#FD79A8';
            resetBtn.style.display = 'inline-block';
          } else {
            mySelections[key] = null; el.innerText = '미선택'; el.style.color = '#777';
            resetBtn.style.display = 'none';
          }
        });
        document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
        currentIndex = 0; renderCard();
      });
  });
}

function renderCard() {
  const u = allUsers[currentIndex];
  if (!u) {
    document.getElementById('card-content').innerHTML = "<p>선택 가능한 유저가 없습니다.</p>";
    return;
  }
  document.getElementById('c-emoji').innerText = u.emoji || '👩';
  document.getElementById('c-nickname').innerHTML = `${u.nickname} <span id="c-age">${u.birthYear % 100}년생</span>`;
  document.getElementById('c-city').innerText = u.city;
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore}%`; 
  document.getElementById('c-intro').innerText = u.intro;
  document.getElementById('card-counter').innerText = `${currentIndex + 1} / ${allUsers.length}`;
}

window.pickCard = function(prefType) {
  const u = allUsers[currentIndex];
  for (let key in mySelections) {
    if (key !== prefType && mySelections[key] === u.id) return alert("이미 다른 지망에 선택된 분입니다.");
  }
  if (mySelections[prefType] && mySelections[prefType] !== u.id) {
    if (!confirm(`${u.nickname}님으로 변경하시겠습니까?`)) return;
  }
  mySelections[prefType] = u.id;
  document.getElementById(mapIds[prefType]).innerText = u.nickname;
  document.getElementById(mapIds[prefType]).style.color = "#FD79A8";
  document.getElementById(resetBtnIds[prefType]).style.display = "inline-block";
  document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
  
  db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); }
};

window.nextCard = function() { if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); } };
window.prevCard = function() { if (currentIndex > 0) { currentIndex--; renderCard(); } };

window.resetPick = function(prefType) {
  if(confirm("선택을 취소하시겠습니까?")) {
    mySelections[prefType] = null;
    document.getElementById(mapIds[prefType]).innerText = "미선택";
    document.getElementById(mapIds[prefType]).style.color = "#777";
    document.getElementById(resetBtnIds[prefType]).style.display = "none";
    document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  }
};

document.getElementById('submit-selection-btn').addEventListener('click', () => {
  if(confirm("지망을 제출하시겠습니까? (종료 전까지 수정 가능)")) {
    db.collection('requests').doc(auth.currentUser.uid).set({ 
      ...mySelections, isDraft: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    }, { merge: true }).then(() => db.collection('users').doc(auth.currentUser.uid).update({ status: 'submitted' }));
  }
});

// 7. 관리자 데이터 로드 (실시간)
function loadAdminData() {
  db.collection('users').onSnapshot(snap => {
    db.collection('requests').onSnapshot(reqSnap => {
      const partListDiv = document.getElementById('admin-participant-list');
      if(!partListDiv) return;
      partListDiv.innerHTML = "";
      snap.forEach(doc => {
        const u = doc.data(); if(u.isAdmin) return;
        const color = u.isParticipating ? "var(--soft-rose)" : "#333";
        const status = u.isParticipating ? "참여" : "불참";
        partListDiv.innerHTML += `<div style="padding:5px; border-bottom:1px solid #eee; color:${color}; font-weight:bold;">${u.nickname} (${status})</div>`;
      });
    });
  });
}

// 8. 기타 이벤트
document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });
document.getElementById('admin-link-btn').addEventListener('click', () => showSection('admin'));
document.getElementById('waitroom-mypage-btn').addEventListener('click', openMyPage);
document.getElementById('mypage-btn').addEventListener('click', openMyPage);
