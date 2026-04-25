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

// 연도 생성
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

function showSection(sectionName) {
  Object.values(sections).forEach(sec => sec.style.display = 'none');
  sections[sectionName].style.display = 'block';
}

function showWaitroomArea(areaName) {
  showSection('waitroom');
  ['waitroom-header', 'selection-area', 'submitted-lock-area', 'result-ready-area', 'profile-check-area'].forEach(a => {
    document.getElementById(a).style.display = 'none';
  });
  document.getElementById(areaName).style.display = 'block';
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
customEmojiInput.addEventListener('input', function() { currentSelectedEmoji = this.value || '👩'; previewEmoji.innerText = currentSelectedEmoji; });
document.getElementById('city').addEventListener('change', function() {
  const customCityInput = document.getElementById('custom-city');
  if (this.value === '기타') { customCityInput.style.display = 'block'; customCityInput.required = true; } 
  else { customCityInput.style.display = 'none'; customCityInput.required = false; }
});

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
  if (!confirm("정말 탈퇴하시겠습니까?\n\n모든 프로필과 데이터가 영구 삭제되며 복구할 수 없습니다.")) return;

  const pw = prompt("보안 확인을 위해 현재 비밀번호를 입력해주세요:");
  if (pw === null) return;

  const user = auth.currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, pw + "round");

  try {
    await user.reauthenticateWithCredential(credential);

    if (myUserData.status === 'matched') {
      const partner = myUserData.partnerId;
      if (partner) await db.collection('users').doc(partner).update({ status: 'waiting', partnerId: null });
    }
    await db.collection('requests').doc(user.uid).delete();
    await db.collection('users').doc(user.uid).delete();
    await user.delete();

    alert("탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.");
    location.reload();
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      alert("비밀번호가 올바르지 않습니다.");
    } else {
      alert("오류가 발생했습니다: " + err.message);
    }
  }
});
document.getElementById('admin-link-btn').addEventListener('click', () => showSection('admin'));

function openMyPage() {
  if(myUserData.status === 'submitted' || myUserData.status === 'matched') return alert("제출 후엔 프로필 수정이 불가합니다.");
  
  document.getElementById('nickname').value = myUserData.nickname || "";
  document.getElementById('birthYear').value = myUserData.birthYear || "1996";
  document.getElementById('kakao-link').value = myUserData.kakaoLink || "";
  
  const participatingToggle = document.getElementById('isParticipating');
  const lockMsg = document.getElementById('profile-confirm-lock-msg');
  participatingToggle.checked = myUserData.isParticipating !== false;
  if (myUserData.isProfileConfirmed) {
    participatingToggle.disabled = true;
    lockMsg.style.display = 'block';
  } else {
    participatingToggle.disabled = false;
    lockMsg.style.display = 'none';
  }
  
  const citySelect = document.getElementById('city'); const customCityInput = document.getElementById('custom-city');
  const savedCity = myUserData.city || "대구";
  let cityExists = Array.from(citySelect.options).some(opt => opt.value === savedCity && savedCity !== '기타');
  if (cityExists) { citySelect.value = savedCity; customCityInput.style.display = 'none'; } 
  else { citySelect.value = "기타"; customCityInput.value = savedCity; customCityInput.style.display = 'block'; }

  const savedEmoji = myUserData.emoji || "👩"; let found = false;
  emojiItems.forEach(item => {
    item.classList.remove('selected');
    if (item.getAttribute('data-emoji') === savedEmoji) { item.classList.add('selected'); found = true; }
  });
  if (found) { customEmojiInput.style.display = 'none'; } 
  else {
    document.querySelector('.emoji-item[data-emoji="기타"]').classList.add('selected');
    customEmojiInput.style.display = 'block'; customEmojiInput.value = savedEmoji;
  }
  currentSelectedEmoji = savedEmoji; previewEmoji.innerText = savedEmoji;
  slider.value = myUserData.personalityScore || 50; updateSlider(); showSection('profile');
}

document.getElementById('mypage-btn').addEventListener('click', openMyPage);
document.getElementById('waitroom-mypage-btn').addEventListener('click', openMyPage);

document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (user) {
    let fullYear = parseInt(document.getElementById('birthYear').value);
    let selectedCity = document.getElementById('city').value;
    if (selectedCity === '기타') selectedCity = document.getElementById('custom-city').value;

    db.collection('users').doc(user.uid).set({
      nickname: document.getElementById('nickname').value,
      birthYear: fullYear, city: selectedCity,
      kakaoLink: document.getElementById('kakao-link').value, 
      emoji: currentSelectedEmoji, 
      personalityScore: parseInt(slider.value),
      intro: document.getElementById('intro').value,
      isParticipating: document.getElementById('isParticipating').checked,
      isAdmin: myUserData?.isAdmin || false, 
      status: myUserData?.status || 'waiting'
    }, { merge: true }).then(() => { alert("프로필 저장 완료!"); location.reload(); });
  }
});

let myUserData = null;
auth.onAuthStateChanged(user => {
  if (user) {
    db.collection('users').doc(user.uid).onSnapshot(doc => {
      if (doc.exists) {
        myUserData = doc.data();
        document.getElementById('logout-btn').style.display = 'inline-block';
        document.getElementById('mypage-btn').style.display = 'inline-block';
        if (myUserData.isAdmin) document.getElementById('admin-link-btn').style.display = 'inline-block';
        document.getElementById('user-greeting').innerText = `${myUserData.nickname}님!`;
        document.getElementById('user-greeting').style.display = 'inline-block';
        
        if (myUserData.nickname) listenToGlobalSettings(); 
        else showSection('profile');
      } else showSection('profile'); 
    });
  } else {
    showSection('auth'); document.getElementById('user-greeting').style.display = 'none';
    ['logout-btn','mypage-btn','admin-link-btn'].forEach(id => document.getElementById(id).style.display = 'none');
  }
});

// 🌟 대기실 UI 동적 변경 함수
function updateWaitroomUI() {
  const title = document.getElementById('room-status-title');
  const desc = document.getElementById('room-status-desc');
  const btn = document.getElementById('waitroom-mypage-btn');
  const matchLabel = document.getElementById('room-match-label');

  if (matchLabel) matchLabel.innerText = globalSettings.matchTitle || '';

  if(myUserData.isParticipating) {
    title.innerText = "⏳ 매칭 시작 전입니다.";
    desc.innerHTML = "진행자가 매칭을 시작할 때까지 잠시 기다려주세요.<br>그동안 내 프로필이 잘 설정되었는지 확인해볼까요?";
    btn.innerText = "🔍 내 프로필 점검하기";
    btn.style.background = "var(--deep-navy)";
  } else {
    title.innerText = "💤 이번 매칭에 참여하지 않네요.";
    desc.innerHTML = "다음에 만나요!<br>만약 참여를 원하신다면 프로필을 수정해주세요.";
    btn.innerText = "✏️ 내 프로필 수정하기";
    btn.style.background = "var(--soft-rose)";
  }
}

function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    globalSettings = data;

    // 관리자 단계 초기화 (첫 로드 시에만)
    if (myUserData?.isAdmin && !adminStepInitialized) {
      adminStepInitialized = true;
      goToAdminStep(data.adminStep ?? 0);
    }

    // 전광판 (단계별 자동 메시지, 관리자 입력으로 덮어쓰기 가능)
    const tickerContainer = document.getElementById('ticker-container');
    const tickerText = document.getElementById('ticker-text');
    const title = data.matchTitle || '이번 매칭';
    let autoMsg = null;
    if (data.resultsPublished) autoMsg = `🎉 ${title} 결과가 발표되었습니다! 결과 확인 버튼을 눌러보세요 💘`;
    else if (data.isMatchingActive) autoMsg = `💘 ${title} 진행 중입니다! 카드를 살펴보고 지망을 제출해주세요 ✨`;
    else if (data.isProfileCheckActive) autoMsg = `🔍 ${title} 준비 중 · 내 프로필을 점검하고 참여 여부를 확정해주세요 · 곧 매칭이 시작됩니다!`;
    const msg = data.tickerMessage || autoMsg;
    if (msg) {
      tickerText.innerText = msg;
      tickerText.style.animationDuration = `${Math.max(10, msg.length * 0.22)}s`;
      tickerContainer.style.display = 'block';
    } else {
      tickerContainer.style.display = 'none';
    }

    // 매칭 회차 라벨
    const matchLabel = document.getElementById('room-match-label');
    if (matchLabel) matchLabel.innerText = data.matchTitle || '';
    
    if (data.resultsPublished && myUserData.status === 'matched') {
      showWaitroomArea('result-ready-area'); return; 
    }
    
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') {
      showWaitroomArea('submitted-lock-area'); 
      if (data.isMatchingActive && myUserData.status !== 'matched') {
        document.getElementById('edit-picks-btn').style.display = 'inline-block';
        document.getElementById('submitted-lock-desc').innerHTML = "진행자가 매칭을 종료하기 전까지<br>수정할 수 있습니다.";
      } else {
        document.getElementById('edit-picks-btn').style.display = 'none';
        document.getElementById('submitted-lock-desc').innerHTML = "매칭이 마감되었습니다.<br>결과를 기다려주세요.";
      }
      return;
    }

    if (data.isMatchingActive && myUserData.isParticipating) {
      showWaitroomArea('selection-area');
      document.getElementById('btn-pref2').style.display = data.showPref2 ? 'inline-block' : 'none';
      document.getElementById('btn-pref3').style.display = data.showPref3 ? 'inline-block' : 'none';
      document.getElementById('btn-dispref').style.display = data.showDispref ? 'inline-block' : 'none';
      document.getElementById('li-pref2').style.display = data.showPref2 ? 'flex' : 'none';
      document.getElementById('li-pref3').style.display = data.showPref3 ? 'flex' : 'none';
      document.getElementById('li-dispref').style.display = data.showDispref ? 'flex' : 'none';
      loadCards();
    } else if (data.isProfileCheckActive && !data.isMatchingActive) {
      showWaitroomArea('profile-check-area');
      updateProfileCheckUI();
    } else {
      updateWaitroomUI();
      showWaitroomArea('waitroom-header');
    }
    if(myUserData.isAdmin) loadAdminData();
  });
}

function updateProfileCheckUI() {
  const confirmed = myUserData.isProfileConfirmed;
  document.getElementById('profile-confirmed-badge').style.display = confirmed ? 'block' : 'none';
  document.getElementById('profile-not-confirmed-area').style.display = confirmed ? 'none' : 'block';
}

document.getElementById('check-my-profile-btn').addEventListener('click', openMyPage);
document.getElementById('confirm-profile-btn').addEventListener('click', () => {
  const participatingText = myUserData.isParticipating ? '참여' : '불참';
  if (confirm(`프로필 점검을 완료합니다.\n이후 참여 여부(현재: ${participatingText})를 변경할 수 없습니다.`)) {
    db.collection('users').doc(auth.currentUser.uid).update({ isProfileConfirmed: true })
      .then(() => {
        myUserData.isProfileConfirmed = true;
        updateProfileCheckUI();
      });
  }
});

let allUsers = []; let currentIndex = 0; let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

function loadCards() {
  db.collection('users').where('isParticipating', '==', true)
    .where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => { if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, ...doc.data() }); });

      // 선택 UI 초기화
      mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
      Object.keys(mapIds).forEach(key => {
        const el = document.getElementById(mapIds[key]);
        el.innerText = '미선택'; el.style.color = '#777'; el.style.fontWeight = 'normal';
        document.getElementById(resetBtnIds[key]).style.display = 'none';
      });
      const submitBtn = document.getElementById('submit-selection-btn');
      submitBtn.disabled = true; submitBtn.classList.add('disabled-submit'); submitBtn.classList.remove('active-submit');

      // DB에서 기존 선택 복원
      db.collection('requests').doc(auth.currentUser.uid).get().then(reqDoc => {
        if (reqDoc.exists) {
          const saved = reqDoc.data();
          ['pref1', 'pref2', 'pref3', 'dispref1'].forEach(key => {
            if (saved[key]) {
              const user = allUsers.find(u => u.id === saved[key]);
              if (user) {
                mySelections[key] = saved[key];
                const el = document.getElementById(mapIds[key]);
                el.innerText = user.nickname; el.style.color = '#FD79A8'; el.style.fontWeight = 'bold';
                document.getElementById(resetBtnIds[key]).style.display = 'inline-block';
              }
            }
          });
          if (mySelections.pref1) {
            submitBtn.disabled = false; submitBtn.classList.remove('disabled-submit'); submitBtn.classList.add('active-submit');
          }
        }
        currentIndex = 0; renderCard();
      });
  });
}

function renderCard() {
  const content = document.getElementById('card-content'); const actions = document.getElementById('card-action-btns');
  if (allUsers.length === 0) {
    content.innerHTML = "<p style='margin-top:30px;'>현재 선택할 프로필이 없습니다.</p>";
    actions.style.display = 'none'; return;
  }
  actions.style.display = 'block';
  document.getElementById('card-counter').innerText = `${currentIndex + 1} / ${allUsers.length}`;
  const u = allUsers[currentIndex];
  document.getElementById('c-emoji').innerText = u.emoji || '👩';
  document.getElementById('c-nickname').innerHTML = `${u.nickname} <span id="c-age">${u.birthYear % 100}년생</span>`;
  document.getElementById('c-city').innerText = u.city;
  document.getElementById('c-score-label').innerText = getScoreLabel(u.personalityScore); 
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore}%`; 
  document.getElementById('c-intro').innerText = u.intro;
}

window.nextCard = function() { if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); } }
window.prevCard = function() { if (currentIndex > 0) { currentIndex--; renderCard(); } }

// 🌟 실시간 프리뷰를 위한 데이터베이스 저장 (isDraft: true)
window.pickCard = function(prefType) {
  const u = allUsers[currentIndex];
  for (let key in mySelections) { if (key !== prefType && mySelections[key] === u.id) return alert("⚠️ 이미 다른 지망으로 선택된 분입니다."); }

  if (mySelections[prefType] && mySelections[prefType] !== u.id) {
    const existing = allUsers.find(u2 => u2.id === mySelections[prefType]);
    const existingName = existing?.nickname || '선택된 분';
    const prefLabel = { pref1: '1지망', pref2: '2지망', pref3: '3지망', dispref1: '비선호' }[prefType];
    if (!confirm(`${prefLabel}을 '${existingName}'님에서 '${u.nickname}'님으로 바꾸시겠어요?`)) return;
    const oldNameEl = document.getElementById(mapIds[prefType]);
    oldNameEl.innerText = '미선택'; oldNameEl.style.color = '#777'; oldNameEl.style.fontWeight = 'normal';
    document.getElementById(resetBtnIds[prefType]).style.display = 'none';
  }

  mySelections[prefType] = u.id;
  
  const nameEl = document.getElementById(mapIds[prefType]);
  nameEl.innerText = u.nickname; nameEl.style.color = "#FD79A8"; nameEl.style.fontWeight = "bold";
  document.getElementById(resetBtnIds[prefType]).style.display = "inline-block";
  
  if(mySelections.pref1) {
    const btn = document.getElementById('submit-selection-btn');
    btn.disabled = false; btn.classList.remove('disabled-submit'); btn.classList.add('active-submit');
  }
  
  // 실시간으로 임시 저장!
  db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  nextCard(); 
};

window.resetPick = function(prefType) {
  if(confirm("다시 선택하시겠습니까?")) {
    mySelections[prefType] = null;
    const nameEl = document.getElementById(mapIds[prefType]);
    nameEl.innerText = "미선택"; nameEl.style.color = "#777"; nameEl.style.fontWeight = "normal";
    document.getElementById(resetBtnIds[prefType]).style.display = "none";
    
    if(!mySelections.pref1) {
      const btn = document.getElementById('submit-selection-btn');
      btn.disabled = true; btn.classList.remove('active-submit'); btn.classList.add('disabled-submit');
    }
    // 실시간 임시 저장 업데이트
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  }
};

document.getElementById('submit-selection-btn').addEventListener('click', () => {
  if(confirm("제출하시겠습니까? (종료 전까지 수정 가능)")) {
    db.collection('requests').doc(auth.currentUser.uid).set({
      ...mySelections, isDraft: false, timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).then(() => {
      db.collection('users').doc(auth.currentUser.uid).update({ status: 'submitted' });
    });
  }
});

document.getElementById('edit-picks-btn').addEventListener('click', () => {
  db.collection('users').doc(auth.currentUser.uid).update({ status: 'waiting' });
});

document.getElementById('check-result-btn').addEventListener('click', () => {
  showSection('result');
  document.getElementById('r-my-emoji').innerText = myUserData.emoji || '👩';
  document.getElementById('r-my-nick').innerText = myUserData.nickname;
  db.collection('users').doc(myUserData.partnerId).get().then(doc => {
    if(doc.exists) {
      const p = doc.data();
      document.getElementById('r-partner-emoji').innerText = p.emoji || '👩';
      document.getElementById('r-partner-nick').innerText = p.nickname;
      document.getElementById('r-partner-desc').innerText = `${p.birthYear % 100}년생 / ${p.city}`;
      if (p.kakaoLink) {
        const btn = document.getElementById('kakao-contact-btn');
        btn.style.display = 'block'; btn.onclick = () => window.open(p.kakaoLink, '_blank');
      }
      setTimeout(() => document.querySelector('.cards-animation-container').classList.add('animate-start'), 500);
    }
  });
});

// ==========================================
// 🌟 [관리자] 미제출자 프리뷰 및 참여 관리
// ==========================================
document.getElementById('apply-toggles-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({
    showPref2: document.getElementById('toggle-pref2').checked,
    showPref3: document.getElementById('toggle-pref3').checked,
    showDispref: document.getElementById('toggle-dispref').checked
  }, { merge: true }).then(() => alert("옵션이 유저 화면에 반영되었습니다."));
});
document.getElementById('admin-profile-check-start-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({ isProfileCheckActive: true }, { merge: true })
    .then(() => alert("프로필 점검 기간이 시작되었습니다. 참여자들에게 알려주세요!"));
});
document.getElementById('admin-profile-check-end-btn').addEventListener('click', () => {
  if (!confirm("프로필 점검 기간을 종료하고 매칭 진행 단계로 넘어가시겠습니까?")) return;
  db.collection('settings').doc('global').update({ isProfileCheckActive: false })
    .then(() => goToAdminStep(1));
});
document.getElementById('admin-start-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({ isMatchingActive: true, resultsPublished: false }, { merge: true });
});
document.getElementById('admin-stop-btn').addEventListener('click', () => {
  if (!confirm("매칭을 종료하고 매칭 검토 단계로 넘어가시겠습니까?")) return;
  db.collection('settings').doc('global').update({ isMatchingActive: false })
    .then(() => goToAdminStep(2));
});

let globalSettings = {};
let currentAdminStep = 0;
let adminStepInitialized = false;

window.goToAdminStep = function(n) {
  currentAdminStep = n;
  for (let i = 0; i < 4; i++) {
    const stepEl = document.getElementById(`admin-step-${i}`);
    const circle = document.getElementById(`step-circle-${i}`);
    const conn = document.getElementById(`step-conn-${i}`);
    if (stepEl) stepEl.style.display = i === n ? 'block' : 'none';
    if (circle) {
      circle.classList.toggle('active', i === n);
      circle.classList.toggle('done', i < n);
    }
    if (conn) conn.classList.toggle('done', i < n);
  }
  db.collection('settings').doc('global').set({ adminStep: n }, { merge: true });
};

let userMap = {}; let adminUsersData = {}; let requestsData = {}; let proposedQueue = [];

function loadAdminData() {
  db.collection('users').get().then(snap => {
    db.collection('requests').get().then(reqSnap => {
      let heldCount = 0; let waitingCount = 0;
      userMap = {}; adminUsersData = {}; requestsData = {};
      
      const partListDiv = document.getElementById('admin-participant-list');
      const manageUserSelect = document.getElementById('manage-part-user');
      partListDiv.innerHTML = ""; manageUserSelect.innerHTML = "<option value=''>유저 선택</option>";
      
      const waitingListDiv = document.getElementById('admin-waiting-list');
      waitingListDiv.innerHTML = "";
      
      const logListDiv = document.getElementById('admin-requests-list');
      logListDiv.innerHTML = "";
      let logsArray = [];

      reqSnap.forEach(rDoc => { requestsData[rDoc.id] = rDoc.data(); });

      snap.forEach(doc => {
        const u = doc.data(); userMap[doc.id] = u.nickname; adminUsersData[doc.id] = { id: doc.id, ...u };
        if(u.isAdmin) return;
        if(u.status === 'held') heldCount++;

        // 2단계: 참여 현황
        const statusText = u.isParticipating ? "✅ 참여" : "❌ 불참";
        const statusColor = u.isParticipating ? "var(--deep-navy)" : "#e74c3c";
        partListDiv.innerHTML += `<div style="padding:6px 0; border-bottom:1px dashed #eee; display:flex; justify-content:space-between;">
          <span>${u.emoji || '👤'} ${u.nickname}</span><span style="color:${statusColor}; font-weight:bold;">${statusText}</span></div>`;
        manageUserSelect.innerHTML += `<option value="${u.id}">${u.nickname}</option>`;
        
        // 3단계: 미제출자 훔쳐보기 (프리뷰)
        if(u.isParticipating && u.status === 'waiting') {
          waitingCount++;
          const req = requestsData[u.id] || {};
          const p1 = userMap[req.pref1] || "-"; const p2 = userMap[req.pref2] || "-"; const dp = userMap[req.dispref1] || "-";
          waitingListDiv.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid #eee;">
            ⏳ ${u.emoji || '👤'} <b>${u.nickname}</b> <span style="font-size:0.8rem; color:#888; float:right;">(${p1} / ${p2} // ${dp})</span></div>`;
        }

        // 6단계 로그 준비 (제출된 것만)
        if(u.status === 'submitted' && requestsData[u.id] && !requestsData[u.id].isDraft) {
          logsArray.push({ id: u.id, req: requestsData[u.id] });
        }
      });

      document.getElementById('held-count').innerText = heldCount;
      if(waitingCount === 0) waitingListDiv.innerHTML = "<p style='color:#777;'>모든 참가자가 제출을 완료했습니다.</p>";

      // 6단계: 최근 로그 4개
      logsArray.sort((a,b) => (b.req.timestamp?.seconds || 0) - (a.req.timestamp?.seconds || 0));
      logsArray.slice(0, 4).forEach(log => {
        logListDiv.innerHTML += `<div style="padding:8px; border-bottom:1px solid #eee;">${adminUsersData[log.id]?.emoji||'👩'} <b>${userMap[log.id]}</b> ➜ 1지망: <span style="color:#FD79A8">${userMap[log.req.pref1] || "-"}</span></div>`;
      });
      if(logsArray.length === 0) logListDiv.innerHTML = "<p style='color:#777;'>제출된 지망이 없습니다.</p>";

      // 0단계: 프로필 점검 완료 현황
      let confirmedCount = 0; let participatingCount = 0;
      snap.forEach(doc => {
        const u = doc.data();
        if (u.isAdmin) return;
        if (u.isParticipating) { participatingCount++; if (u.isProfileConfirmed) confirmedCount++; }
      });
      const profileCheckStatus = document.getElementById('profile-check-confirm-status');
      if (profileCheckStatus) {
        profileCheckStatus.innerHTML = `참여 예정자 ${participatingCount}명 중 <b>${confirmedCount}명</b> 점검 완료`;
      }

      // 4-2단계: 확정된 커플 목록
      const matchedListDiv = document.getElementById('admin-matched-list');
      matchedListDiv.innerHTML = '';
      const seenIds = new Set();
      snap.forEach(doc => {
        const u = doc.data();
        if (u.status !== 'matched' || !u.partnerId || seenIds.has(doc.id) || seenIds.has(u.partnerId)) return;
        seenIds.add(doc.id); seenIds.add(u.partnerId);
        const b = adminUsersData[u.partnerId];
        if (!b) return;
        const aWarn = !u.kakaoLink ? ' <span style="color:#e74c3c;font-size:0.75rem;">⚠️카링크</span>' : '';
        const bWarn = !b.kakaoLink ? ' <span style="color:#e74c3c;font-size:0.75rem;">⚠️카링크</span>' : '';
        matchedListDiv.innerHTML += `<div style="padding:8px; border-bottom:1px solid #ffd1e5; display:flex; justify-content:space-between; align-items:center;">
          <span>${u.emoji||'👤'} <b>${u.nickname}</b>${aWarn}</span>
          <span style="color:#FD79A8;">💘</span>
          <span>${b.emoji||'👤'} <b>${b.nickname}</b>${bWarn}</span>
        </div>`;
      });
      if (matchedListDiv.innerHTML === '') matchedListDiv.innerHTML = "<p style='color:#777;'>아직 확정된 커플이 없습니다.</p>";

      // Step 3: 최종 커플 목록 및 요약 동기화
      const matchedListFinal = document.getElementById('admin-matched-list-final');
      const finalSummary = document.getElementById('final-match-summary');
      if (matchedListFinal) matchedListFinal.innerHTML = matchedListDiv.innerHTML;
      if (finalSummary) finalSummary.innerText = `확정된 커플: ${seenIds.size / 2}쌍`;

      // 4-3: 수동 매칭 셀렉트 박스 채우기
      const manualASelect = document.getElementById('manual-a-user');
      const manualBSelect = document.getElementById('manual-b-user');
      manualASelect.innerHTML = '<option value="">A 선택</option>';
      manualBSelect.innerHTML = '<option value="">B 선택</option>';
      snap.forEach(doc => {
        const u = doc.data();
        if (u.isAdmin || !u.isParticipating || !['waiting','submitted','held'].includes(u.status)) return;
        const opt = `<option value="${doc.id}">${u.emoji||'👤'} ${u.nickname} (${u.status})</option>`;
        manualASelect.innerHTML += opt;
        manualBSelect.innerHTML += opt;
      });

      // 전광판/매칭명 인풋에 현재 설정값 반영
      if (globalSettings.tickerMessage !== undefined) document.getElementById('ticker-input').value = globalSettings.tickerMessage || '';
      if (globalSettings.matchTitle !== undefined) document.getElementById('match-title-input').value = globalSettings.matchTitle || '';
    });
  });
}

// 🌟 참여 상태 수동 변경 이벤트
document.getElementById('manage-part-btn').addEventListener('click', () => {
  const uid = document.getElementById('manage-part-user').value;
  const isPart = document.getElementById('manage-part-status').value === "true";
  if (!uid) return alert("유저를 선택하세요.");

  if (!isPart) {
    const targetName = adminUsersData[uid]?.nickname || '해당 유저';
    const affected = [];
    Object.entries(requestsData).forEach(([submitterId, req]) => {
      if (submitterId === uid) return;
      const submitter = adminUsersData[submitterId];
      if (!submitter || submitter.isAdmin) return;
      if ([req.pref1, req.pref2, req.pref3].includes(uid) && submitter.status === 'submitted') {
        affected.push({ id: submitterId, name: submitter.nickname });
      }
    });

    if (affected.length > 0) {
      const nameList = affected.map(a => a.name).join(', ');
      if (!confirm(`${targetName}님을 불참으로 변경합니다.\n\n⚠️ ${targetName}님을 지망으로 선택한 제출자:\n${nameList}\n\n이 분들의 제출을 취소하고 다시 선택할 기회를 주시겠습니까?`)) return;
      const batch = db.batch();
      batch.update(db.collection('users').doc(uid), { isParticipating: false });
      affected.forEach(a => batch.update(db.collection('users').doc(a.id), { status: 'waiting' }));
      batch.commit().then(() => { alert(`변경 완료! ${nameList}님이 다시 선택할 수 있습니다.`); loadAdminData(); });
      return;
    }
  }

  db.collection('users').doc(uid).update({ isParticipating: isPart }).then(() => {
    alert("참여 상태가 변경되었습니다."); loadAdminData();
  });
});

document.getElementById('start-auto-match-btn').addEventListener('click', () => {
  let available = Object.values(adminUsersData).filter(u => u.status === 'submitted' && u.isParticipating);
  proposedQueue = [];
  available.forEach(A => {
    if(A.isProcessed) return;
    const reqA = requestsData[A.id];
    if(!reqA || reqA.isDraft) return;

    const aHistory = adminUsersData[A.id]?.matchHistory || [];
    let targetId = [reqA.pref1, reqA.pref2, reqA.pref3].find(id =>
      id && adminUsersData[id]?.status === 'submitted' && !adminUsersData[id].isProcessed && !aHistory.includes(id)
    );
    if(targetId) {
      let B = adminUsersData[targetId];
      A.isProcessed = true; B.isProcessed = true;
      proposedQueue.push({ A, B });
    }
  });
  if(proposedQueue.length === 0) return alert("현재 매칭을 제안할 수 있는 조합이 없습니다.");
  showNextProposal();
});

let currentProposal = null;
function showNextProposal() {
  if(proposedQueue.length === 0) {
    document.getElementById('sim-result-box').style.display = 'none';
    return alert("제안된 모든 매칭 검토가 끝났습니다.");
  }
  currentProposal = proposedQueue.shift();
  const { A, B } = currentProposal;

  document.getElementById('sim-result-box').style.display = 'block';
  document.getElementById('sim-a-emoji').innerText = A.emoji; document.getElementById('sim-a-nick').innerText = A.nickname;
  document.getElementById('sim-a-bar').style.width = `${A.personalityScore}%`;
  document.getElementById('sim-b-emoji').innerText = B.emoji; document.getElementById('sim-b-nick').innerText = B.nickname;
  document.getElementById('sim-b-bar').style.width = `${B.personalityScore}%`;

  const reqA = requestsData[A.id]; const reqB = requestsData[B.id];

  function getRank(req, targetId) {
    if (!req) return null;
    if (req.pref1 === targetId) return '1지망';
    if (req.pref2 === targetId) return '2지망';
    if (req.pref3 === targetId) return '3지망';
    return null;
  }
  function getRankScore(req, targetId) {
    if (!req) return 0;
    if (req.pref1 === targetId) return 3;
    if (req.pref2 === targetId) return 2;
    if (req.pref3 === targetId) return 1;
    return 0;
  }

  const aRankOfB = getRank(reqA, B.id);
  const bRankOfA = getRank(reqB, A.id);
  const aDislikeB = reqA?.dispref1 === B.id;
  const bDislikeA = reqB?.dispref1 === A.id;
  const matchPct = Math.round((getRankScore(reqA, B.id) + getRankScore(reqB, A.id)) / 6 * 100);

  const infoLines = [];
  infoLines.push(`📊 <b>매칭 점수: ${matchPct}%</b>`);
  infoLines.push(`${A.emoji||'👤'} ${A.nickname} → ${B.nickname}: <b>${aRankOfB || '미선택'}</b>`);
  infoLines.push(`${B.emoji||'👤'} ${B.nickname} → ${A.nickname}: <b>${bRankOfA || '미선택'}</b>`);

  const pros = [];
  if (aRankOfB && bRankOfA) pros.push('✅ 상호 지망 매칭');
  if (aRankOfB === '1지망') pros.push(`✅ ${A.nickname}님이 ${B.nickname}님을 1지망으로 선택`);
  if (bRankOfA === '1지망') pros.push(`✅ ${B.nickname}님이 ${A.nickname}님을 1지망으로 선택`);
  const scoreDiff = Math.abs((A.personalityScore || 50) - (B.personalityScore || 50));
  if (scoreDiff <= 20) pros.push('✅ 두 분 성향이 비슷해요');
  else if (scoreDiff >= 55) pros.push('✅ 서로 다른 성향으로 새로운 자극이 될 수 있어요');

  const cons = [];
  if (!aRankOfB) cons.push(`⚠️ ${A.nickname}님이 ${B.nickname}님을 선택하지 않았음`);
  if (!bRankOfA) cons.push(`⚠️ ${B.nickname}님이 ${A.nickname}님을 선택하지 않았음`);
  if (aDislikeB) cons.push(`🚨 ${A.nickname}님이 ${B.nickname}님을 비선호로 지정`);
  if (bDislikeA) cons.push(`🚨 ${B.nickname}님이 ${A.nickname}님을 비선호로 지정`);
  const prevMatch = (A.matchHistory || []).includes(B.id) || (B.matchHistory || []).includes(A.id);
  if (prevMatch) cons.push(`🔁 이전에 매칭된 적 있는 커플`);

  if (pros.length) { infoLines.push(''); pros.forEach(p => infoLines.push(p)); }
  if (cons.length) { infoLines.push(''); cons.forEach(c => infoLines.push(c)); }

  document.getElementById('sim-match-info').innerHTML = infoLines.join('<br>');

  let msg = '', color = '#333';
  if (aDislikeB || bDislikeA) { msg = '🚨 비선호 대상이 포함된 매칭입니다!'; color = '#e74c3c'; }
  else if (prevMatch) { msg = '🔁 이전에 매칭된 적 있는 커플입니다.'; color = '#8e44ad'; }
  else if (aRankOfB && bRankOfA) { msg = '💕 상호 지망 매칭!'; color = '#27ae60'; }
  else if (!aRankOfB || !bRankOfA) { msg = '⚠️ 일방적 매칭입니다.'; color = '#e67e22'; }
  document.getElementById('sim-warning-msg').innerHTML = msg;
  document.getElementById('sim-warning-msg').style.color = color;
}

document.getElementById('confirm-match-btn').addEventListener('click', () => {
  const { A, B } = currentProposal;
  db.collection('users').doc(A.id).update({ status: 'matched', partnerId: B.id });
  db.collection('users').doc(B.id).update({ status: 'matched', partnerId: A.id }).then(() => showNextProposal());
});
document.getElementById('hold-match-btn').addEventListener('click', () => {
  const { A, B } = currentProposal;
  db.collection('users').doc(A.id).update({ status: 'held' });
  db.collection('users').doc(B.id).update({ status: 'held' }).then(() => showNextProposal());
});
document.getElementById('reset-held-btn').addEventListener('click', () => {
  db.collection('users').where('status', '==', 'held').get().then(snap => {
    if (snap.empty) return alert("보류 중인 유저가 없습니다.");
    const names = [];
    snap.forEach(doc => {
      db.collection('users').doc(doc.id).update({ status: 'submitted' });
      names.push(doc.data().nickname);
    });
    alert(`${names.join(', ')}님이 자동 제안 대상으로 복구되었습니다.\n"매칭 제안 받기 시작"을 다시 눌러주세요.`);
    loadAdminData();
  });
});
document.getElementById('reset-all-btn').addEventListener('click', () => {
  if(confirm("정말 모든 유저를 초기화합니까?")) {
    db.collection('users').get().then(snap => {
      snap.forEach(doc => {
        const u = doc.data();
        const updates = { status: 'waiting', partnerId: null, isProfileConfirmed: false };
        if (u.partnerId) updates.matchHistory = firebase.firestore.FieldValue.arrayUnion(u.partnerId);
        db.collection('users').doc(doc.id).update(updates);
      });
      db.collection('settings').doc('global').update({ isMatchingActive: false, resultsPublished: false, isProfileCheckActive: false, adminStep: 0 });
      adminStepInitialized = false;
    });
  }
});
document.getElementById('publish-results-btn').addEventListener('click', () => {
  const missingKakao = Object.values(adminUsersData).filter(u => u.status === 'matched' && !u.kakaoLink);
  let warn = '';
  if (missingKakao.length > 0) warn = `⚠️ 카카오링크 미입력: ${missingKakao.map(u => u.nickname).join(', ')}\n\n`;
  if (confirm(`${warn}전체 결과를 발표합니다!`)) db.collection('settings').doc('global').update({ resultsPublished: true });
});

document.getElementById('apply-settings-btn').addEventListener('click', () => {
  const tickerMessage = document.getElementById('ticker-input').value.trim();
  const matchTitle = document.getElementById('match-title-input').value.trim();
  db.collection('settings').doc('global').set({ tickerMessage, matchTitle }, { merge: true })
    .then(() => alert("설정이 적용되었습니다."));
});

document.getElementById('manual-match-btn').addEventListener('click', () => {
  const aId = document.getElementById('manual-a-user').value;
  const bId = document.getElementById('manual-b-user').value;
  if (!aId || !bId) return alert("두 유저를 모두 선택하세요.");
  if (aId === bId) return alert("같은 사람을 선택할 수 없습니다.");
  const aName = adminUsersData[aId]?.nickname;
  const bName = adminUsersData[bId]?.nickname;
  if (confirm(`${aName}님과 ${bName}님을 수동으로 매칭 확정하시겠습니까?`)) {
    db.collection('users').doc(aId).update({ status: 'matched', partnerId: bId });
    db.collection('users').doc(bId).update({ status: 'matched', partnerId: aId })
      .then(() => { alert("수동 매칭 완료!"); loadAdminData(); });
  }
});
