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

// 1. 초기 설정 (연도 생성)
const birthYearSelect = document.getElementById('birthYear');
for (let year = 2005; year >= 1950; year--) {
  const option = document.createElement('option');
  option.value = year; option.innerText = `${year}년생`;
  if (year === 1996) option.selected = true; 
  birthYearSelect.appendChild(option);
}

const sections = {
  auth: document.getElementById('auth-section'),
  profile: document.getElementById('profile-section'),
  waitroom: document.getElementById('waitroom-section'),
  result: document.getElementById('result-section'),
  admin: document.getElementById('admin-section')
};

// 2. 유틸리티 함수
function showSection(sectionName) {
  Object.values(sections).forEach(sec => sec.style.display = 'none');
  sections[sectionName].style.display = 'block';
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
  if(!myUserData) location.reload();
  else if (myUserData.status === 'matched') showWaitroomArea('result-ready-area');
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
  const val = slider.value;
  slider.style.background = `linear-gradient(to right, #1A2B3C ${val}%, #FD79A8 ${val}%, #FD79A8 100%)`;
  spectrumLabel.innerText = getScoreLabel(val);
}
slider.addEventListener('input', updateSlider);
updateSlider();

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
      customEmojiInput.style.display = 'block'; customEmojiInput.required = true;
      currentSelectedEmoji = customEmojiInput.value || '👩'; previewEmoji.innerText = currentSelectedEmoji;
    } else {
      customEmojiInput.style.display = 'none'; customEmojiInput.required = false;
      currentSelectedEmoji = emoji; previewEmoji.innerText = emoji;
    }
  });
});
if(customEmojiInput) customEmojiInput.addEventListener('input', function() { currentSelectedEmoji = this.value || '👩'; previewEmoji.innerText = currentSelectedEmoji; });

document.getElementById('city').addEventListener('change', function() {
  const customCityInput = document.getElementById('custom-city');
  if (this.value === '기타') { customCityInput.style.display = 'block'; customCityInput.required = true; } 
  else { customCityInput.style.display = 'none'; customCityInput.required = false; }
});

// 4. 회원 인증 및 프로필 관리
document.getElementById('signup-btn').addEventListener('click', () => {
  const id = document.getElementById('userid').value; const pw = document.getElementById('password').value; 
  if (!id || !pw) return alert("입력칸을 채워주세요.");
  if (pw.length < 4) return alert("비밀번호는 4자리 이상입니다.");
  auth.createUserWithEmailAndPassword(id + "@roundtable.com", pw + "round")
    .then(() => { alert("가입 성공!"); document.getElementById('password').value = ""; })
    .catch(err => alert("가입 실패: " + err.message));
});
document.getElementById('login-btn').addEventListener('click', () => {
  const id = document.getElementById('userid').value; const pw = document.getElementById('password').value;
  auth.signInWithEmailAndPassword(id + "@roundtable.com", pw + "round").catch(err => alert("로그인 실패. 아이디와 비밀번호를 확인해주세요."));
});
document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });

document.getElementById('withdraw-btn').addEventListener('click', async () => {
  if (!confirm("정말 탈퇴하시겠습니까? 모든 데이터가 삭제됩니다.")) return;
  const pw = prompt("비밀번호를 입력해주세요:");
  if (pw === null) return;
  const user = auth.currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, pw + "round");
  try {
    await user.reauthenticateWithCredential(credential);
    await db.collection('requests').doc(user.uid).delete();
    await db.collection('users').doc(user.uid).delete();
    await user.delete();
    alert("탈퇴 완료되었습니다."); location.reload();
  } catch (err) { alert("오류: " + err.message); }
});

function openMyPage() {
  if(myUserData.status === 'submitted' || myUserData.status === 'matched') return alert("수정 불가 상태입니다.");
  document.getElementById('nickname').value = myUserData.nickname || "";
  document.getElementById('birthYear').value = myUserData.birthYear || "1996";
  document.getElementById('kakao-link').value = myUserData.kakaoLink || "";
  const participatingToggle = document.getElementById('isParticipating');
  participatingToggle.checked = myUserData.isParticipating !== false;
  
  const savedCity = myUserData.city || "대구";
  const citySelect = document.getElementById('city');
  let cityExists = Array.from(citySelect.options).some(opt => opt.value === savedCity);
  if (cityExists) { citySelect.value = savedCity; } else { citySelect.value = "기타"; document.getElementById('custom-city').value = savedCity; document.getElementById('custom-city').style.display = 'block'; }
  
  slider.value = myUserData.personalityScore || 50; updateSlider(); showSection('profile');
}

document.getElementById('mypage-btn').addEventListener('click', openMyPage);
document.getElementById('waitroom-mypage-btn').addEventListener('click', openMyPage);

document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (user) {
    let selectedCity = document.getElementById('city').value === '기타' ? document.getElementById('custom-city').value : document.getElementById('city').value;
    db.collection('users').doc(user.uid).set({
      nickname: document.getElementById('nickname').value,
      birthYear: parseInt(document.getElementById('birthYear').value),
      city: selectedCity, kakaoLink: document.getElementById('kakao-link').value, 
      emoji: currentSelectedEmoji, personalityScore: parseInt(slider.value), intro: document.getElementById('intro').value,
      isParticipating: document.getElementById('isParticipating').checked,
      isAdmin: myUserData?.isAdmin || false, status: myUserData?.status || 'waiting'
    }, { merge: true }).then(() => { alert("저장 완료!"); location.reload(); });
  }
});

// 🌟 5. 대기실 UI 동적 변경 함수 (색상 요청 반영)
function updateWaitroomUI() {
  const title = document.getElementById('room-status-title');
  const desc = document.getElementById('room-status-desc');
  const btn = document.getElementById('waitroom-mypage-btn');
  const toggle = document.getElementById('waitroom-participation-toggle');

  if (!myUserData || !btn) return;

  const isPart = myUserData.isParticipating !== false;
  
  // 서버 데이터와 토글 상태 동기화
  if (toggle && toggle.checked !== isPart) toggle.checked = isPart;

  if (isPart) {
    title.innerText = "⏳ 매칭 시작 전입니다.";
    desc.innerHTML = "진행자가 매칭을 시작할 때까지 잠시 기다려주세요.<br>그동안 내 프로필이 잘 설정되었는지 확인해볼까요?";
    btn.innerText = "🔍 내 프로필 점검하기";
    btn.style.background = "var(--soft-rose)"; // 🌟 활성화 시 분홍색
  } else {
    title.innerText = "💤 이번 매칭에 참여하지 않네요.";
    desc.innerHTML = "다음에 만나요!<br>만약 참여를 원하신다면 위 토글을 켜주세요.";
    btn.innerText = "✏️ 내 프로필 수정하기";
    btn.style.background = "var(--deep-navy)"; // 🌟 비활성화 시 검정색
  }
}

// 6. 실시간 감시 및 토글 이벤트
let myUserData = null;
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
        if (myUserData.nickname) listenToGlobalSettings(); else showSection('profile');
      } else showSection('profile'); 
    });
  } else {
    showSection('auth');
    ['logout-btn','mypage-btn','admin-link-btn'].forEach(id => document.getElementById(id).style.display = 'none');
  }
});

// 🌟 대기실 토글 즉시 반영 로직 (Optimistic Update)
document.getElementById('waitroom-participation-toggle').addEventListener('change', function() {
  const isPart = this.checked;
  if (myUserData) {
    myUserData.isParticipating = isPart; // 1. 로컬 데이터 즉시 변경
    updateWaitroomUI(); // 2. UI 즉시 갱신
  }
  
  const user = auth.currentUser;
  if (user) {
    db.collection('users').doc(user.uid).update({ isParticipating: isPart }); // 3. 서버 저장
  }
});

function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    globalSettings = data;
    if (data.resultsPublished && myUserData.status === 'matched') { showWaitroomArea('result-ready-area'); return; }
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') {
      showWaitroomArea('submitted-lock-area'); return;
    }
    if (data.isMatchingActive && myUserData.isParticipating) { showWaitroomArea('selection-area'); loadCards(); } 
    else { updateWaitroomUI(); showWaitroomArea('waitroom-header'); }
  });
}

// 7. 카드 시스템 및 관리자 로직 (기존과 동일하되 통합됨)
let allUsers = []; let currentIndex = 0; let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

function loadCards() {
  db.collection('users').where('isParticipating', '==', true)
    .where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => { 
        userMap[doc.id] = doc.data().nickname;
        if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, ...doc.data() }); 
      });
      currentIndex = 0; renderCard();
  });
}

function renderCard() {
  const u = allUsers[currentIndex];
  if (!u) return;
  document.getElementById('c-emoji').innerText = u.emoji || '👩';
  document.getElementById('c-nickname').innerHTML = `${u.nickname} <span id="c-age">${u.birthYear % 100}년생</span>`;
  document.getElementById('c-city').innerText = u.city;
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore}%`; 
  document.getElementById('c-intro').innerText = u.intro;
}

window.nextCard = function() { if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); } }
window.prevCard = function() { if (currentIndex > 0) { currentIndex--; renderCard(); } }

window.pickCard = function(prefType) {
  const u = allUsers[currentIndex];
  if (mySelections[prefType] && mySelections[prefType] !== u.id) {
    if (!confirm(`${u.nickname}님으로 바꾸시겠어요?`)) return;
  }
  mySelections[prefType] = u.id;
  const nameEl = document.getElementById(mapIds[prefType]);
  nameEl.innerText = u.nickname; nameEl.style.color = "#FD79A8";
  document.getElementById(resetBtnIds[prefType]).style.display = "inline-block";
  document.getElementById('submit-selection-btn').disabled = !mySelections.pref1;
  db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  nextCard();
};

window.resetPick = function(prefType) {
  if(confirm("다시 선택하시겠습니까?")) {
    mySelections[prefType] = null;
    document.getElementById(mapIds[prefType]).innerText = "미선택";
    document.getElementById(resetBtnIds[prefType]).style.display = "none";
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  }
};

document.getElementById('submit-selection-btn').addEventListener('click', () => {
  if(confirm("제출하시겠습니까?")) {
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: false }, { merge: true })
      .then(() => db.collection('users').doc(auth.currentUser.uid).update({ status: 'submitted' }));
  }
});

// 관리자 리스너
let adminStepInitialized = false; let globalSettings = {}; let userMap = {}; let adminUsersData = {}; let requestsData = {};

function loadAdminData() {
  db.collection('users').onSnapshot(snap => {
    db.collection('requests').onSnapshot(reqSnap => {
      const partListDiv = document.getElementById('admin-participant-list');
      if(!partListDiv) return;
      partListDiv.innerHTML = "";
      snap.forEach(doc => {
        const u = doc.data(); if(u.isAdmin) return;
        const color = u.isParticipating ? "var(--soft-rose)" : "#333";
        partListDiv.innerHTML += `<div style="color:${color}">${u.nickname} (${u.isParticipating ? '참여' : '불참'})</div>`;
      });
    });
  });
}
