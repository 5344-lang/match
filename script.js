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

// 2. 유틸리티 함수 (화면 전환 등)
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
  if (!confirm("정말 탈퇴하시겠습니까?\n\n모든 데이터가 삭제되며 복구할 수 없습니다.")) return;
  const pw = prompt("보안 확인을 위해 현재 비밀번호를 입력해주세요:");
  if (pw === null) return;
  const user = auth.currentUser;
  const credential = firebase.auth.EmailAuthProvider.credential(user.email, pw + "round");
  try {
    await user.reauthenticateWithCredential(credential);
    if (myUserData.status === 'matched' && myUserData.partnerId) {
      await db.collection('users').doc(myUserData.partnerId).update({ status: 'waiting', partnerId: null });
    }
    await db.collection('requests').doc(user.uid).delete();
    await db.collection('users').doc(user.uid).delete();
    await user.delete();
    alert("탈퇴가 완료되었습니다."); location.reload();
  } catch (err) { alert("오류: " + err.message); }
});

function openMyPage() {
  if(myUserData.status === 'submitted' || myUserData.status === 'matched') return alert("제출 후엔 프로필 수정이 불가합니다.");
  document.getElementById('nickname').value = myUserData.nickname || "";
  document.getElementById('birthYear').value = myUserData.birthYear || "1996";
  document.getElementById('kakao-link').value = myUserData.kakaoLink || "";
  const participatingToggle = document.getElementById('isParticipating');
  const lockMsg = document.getElementById('profile-confirm-lock-msg');
  participatingToggle.checked = myUserData.isParticipating !== false;
  if (myUserData.isProfileConfirmed) { participatingToggle.disabled = true; lockMsg.style.display = 'block'; } 
  else { participatingToggle.disabled = false; lockMsg.style.display = 'none'; }
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
  if (!found) { document.querySelector('.emoji-item[data-emoji="기타"]').classList.add('selected'); customEmojiInput.style.display = 'block'; customEmojiInput.value = savedEmoji; }
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
    let selectedEmoji = currentSelectedEmoji;
    db.collection('users').doc(user.uid).set({
      nickname: document.getElementById('nickname').value,
      birthYear: fullYear, city: selectedCity, kakaoLink: document.getElementById('kakao-link').value, 
      emoji: selectedEmoji, personalityScore: parseInt(slider.value), intro: document.getElementById('intro').value,
      isParticipating: document.getElementById('isParticipating').checked, isAdmin: myUserData?.isAdmin || false, 
      status: myUserData?.status || 'waiting'
    }, { merge: true }).then(() => { alert("프로필 저장 완료!"); location.reload(); });
  }
});

// 5. 실시간 상태 감시 (유저 데이터 및 전역 설정)
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
          if (!adminStepInitialized) { loadAdminData(); adminStepInitialized = true; } // 🌟 관리자 리스너 최초 1회 등록
        }
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

function updateWaitroomUI() {
  const title = document.getElementById('room-status-title');
  const desc = document.getElementById('room-status-desc');
  const btn = document.getElementById('waitroom-mypage-btn');
  const matchLabel = document.getElementById('room-match-label');
  if (matchLabel) matchLabel.innerText = globalSettings.matchTitle || '';
  if(myUserData.isParticipating) {
    title.innerText = "⏳ 매칭 시작 전입니다.";
    desc.innerHTML = "진행자가 매칭을 시작할 때까지 잠시 기다려주세요.<br>그동안 내 프로필이 잘 설정되었는지 확인해볼까요?";
    btn.innerText = "🔍 내 프로필 점검하기"; btn.style.background = "var(--deep-navy)";
  } else {
    title.innerText = "💤 이번 매칭에 참여하지 않네요.";
    desc.innerHTML = "다음에 만나요!<br>만약 참여를 원하신다면 프로필을 수정해주세요.";
    btn.innerText = "✏️ 내 프로필 수정하기"; btn.style.background = "var(--soft-rose)";
  }
}

function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    globalSettings = data;
    if (myUserData?.isAdmin && currentAdminStep === 0 && data.adminStep !== undefined) {
       goToAdminStep(data.adminStep, false); 
    }
    const tickerContainer = document.getElementById('ticker-container');
    const tickerText = document.getElementById('ticker-text');
    const title = data.matchTitle || '이번 매칭';
    let autoMsg = null;
    if (data.resultsPublished) autoMsg = `🎉 ${title} 결과가 발표되었습니다! 결과 확인 버튼을 눌러보세요 💘`;
    else if (data.isMatchingActive) autoMsg = `💘 ${title} 진행 중입니다! 카드를 살펴보고 지망을 제출해주세요 ✨`;
    else if (data.isProfileCheckActive) autoMsg = `🔍 ${title} 준비 중 · 내 프로필을 점검하고 참여 여부를 확정해주세요 · 곧 매칭이 시작됩니다!`;
    const msg = data.tickerMessage || autoMsg;
    if (msg && tickerText) {
      tickerText.innerText = msg; tickerText.style.animationDuration = `${Math.max(10, msg.length * 0.22)}s`;
      tickerContainer.style.display = 'block';
    } else if (tickerContainer) { tickerContainer.style.display = 'none'; }
    const matchLabel = document.getElementById('room-match-label');
    if (matchLabel) matchLabel.innerText = data.matchTitle || '';
    if (data.resultsPublished && myUserData.status === 'matched') { showWaitroomArea('result-ready-area'); return; }
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') {
      showWaitroomArea('submitted-lock-area'); 
      const editBtn = document.getElementById('edit-picks-btn');
      const lockDesc = document.getElementById('submitted-lock-desc');
      if (data.isMatchingActive && myUserData.status !== 'matched') { editBtn.style.display = 'inline-block'; lockDesc.innerHTML = "진행자가 매칭을 종료하기 전까지<br>수정할 수 있습니다."; } 
      else { editBtn.style.display = 'none'; lockDesc.innerHTML = "매칭이 마감되었습니다.<br>결과를 기다려주세요."; }
      return;
    }
    if (data.isMatchingActive && myUserData.isParticipating) { showWaitroomArea('selection-area'); loadCards(); } 
    else if (data.isProfileCheckActive && !data.isMatchingActive) { showWaitroomArea('profile-check-area'); updateProfileCheckUI(); } 
    else { updateWaitroomUI(); showWaitroomArea('waitroom-header'); }
  });
}

// 6. 카드 선택 시스템
let allUsers = []; let currentIndex = 0; let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

function loadCards() {
  db.collection('users').where('isParticipating', '==', true)
    .where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => { 
        const data = doc.data();
        userMap[doc.id] = data.nickname; // 지망 이름 표시용 맵핑
        if (doc.id !== auth.currentUser.uid) allUsers.push({ id: doc.id, ...data }); 
      });
      // UI 초기화 및 기존 선택 복원
      db.collection('requests').doc(auth.currentUser.uid).get().then(reqDoc => {
        const saved = reqDoc.exists ? reqDoc.data() : {};
        ['pref1', 'pref2', 'pref3', 'dispref1'].forEach(key => {
          const el = document.getElementById(mapIds[key]);
          const resetBtn = document.getElementById(resetBtnIds[key]);
          if (saved[key] && userMap[saved[key]]) {
            mySelections[key] = saved[key];
            el.innerText = userMap[saved[key]]; el.style.color = '#FD79A8'; el.style.fontWeight = 'bold';
            resetBtn.style.display = 'inline-block';
          } else {
            mySelections[key] = null; el.innerText = '미선택'; el.style.color = '#777'; el.style.fontWeight = 'normal';
            resetBtn.style.display = 'none';
          }
        });
        const submitBtn = document.getElementById('submit-selection-btn');
        if (mySelections.pref1) { submitBtn.disabled = false; submitBtn.classList.add('active-submit'); submitBtn.classList.remove('disabled-submit'); }
        currentIndex = 0; renderCard();
      });
  });
}

function renderCard() {
  const content = document.getElementById('card-content'); const actions = document.getElementById('card-action-btns');
  if (allUsers.length === 0) { content.innerHTML = "<p style='margin-top:30px;'>현재 선택할 프로필이 없습니다.</p>"; actions.style.display = 'none'; return; }
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

window.pickCard = function(prefType) {
  const u = allUsers[currentIndex];
  for (let key in mySelections) { if (key !== prefType && mySelections[key] === u.id) return alert("⚠️ 이미 다른 지망으로 선택된 분입니다."); }

  // 🌟 지망 변경 시 확인 팝업 추가
  if (mySelections[prefType] && mySelections[prefType] !== u.id) {
    const existingName = userMap[mySelections[prefType]] || '기존 선택자';
    const prefLabel = { pref1: '1지망', pref2: '2지망', pref3: '3지망', dispref1: '비선호' }[prefType];
    if (!confirm(`${prefLabel}을 '${existingName}'님에서 '${u.nickname}'님으로 바꾸시겠어요?`)) return;
  }

  mySelections[prefType] = u.id;
  const nameEl = document.getElementById(mapIds[prefType]);
  nameEl.innerText = u.nickname; nameEl.style.color = "#FD79A8"; nameEl.style.fontWeight = "bold";
  document.getElementById(resetBtnIds[prefType]).style.display = "inline-block";
  
  if(mySelections.pref1) {
    const btn = document.getElementById('submit-selection-btn');
    btn.disabled = false; btn.classList.remove('disabled-submit'); btn.classList.add('active-submit');
  }
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
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  }
};

document.getElementById('submit-selection-btn').addEventListener('click', () => {
  if(confirm("제출하시겠습니까? (종료 전까지 수정 가능)")) {
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: false, timestamp: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true })
      .then(() => db.collection('users').doc(auth.currentUser.uid).update({ status: 'submitted' }));
  }
});

document.getElementById('edit-picks-btn').addEventListener('click', () => { db.collection('users').doc(auth.currentUser.uid).update({ status: 'waiting' }); });

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
      const btn = document.getElementById('kakao-contact-btn');
      if (p.kakaoLink) { btn.style.display = 'block'; btn.onclick = () => window.open(p.kakaoLink, '_blank'); }
      setTimeout(() => document.querySelector('.cards-animation-container').classList.add('animate-start'), 500);
    }
  });
});

// 7. 관리자 전용 (실시간 데이터 감시)
let userMap = {}; let adminUsersData = {}; let requestsData = {}; let proposedQueue = [];
let adminStepInitialized = false;

function loadAdminData() {
  // 🌟 유저 및 지망 데이터 통합 실시간 감시
  db.collection('users').onSnapshot(snap => {
    db.collection('requests').onSnapshot(reqSnap => {
      let heldCount = 0; let confirmedCount = 0; let participatingCount = 0;
      userMap = {}; adminUsersData = {}; requestsData = {};
      const partListDiv = document.getElementById('admin-participant-list');
      const manageUserSelect = document.getElementById('manage-part-user');
      const waitingListDiv = document.getElementById('admin-waiting-list');
      const logListDiv = document.getElementById('admin-requests-list');
      
      partListDiv.innerHTML = ""; manageUserSelect.innerHTML = "<option value=''>유저 선택</option>";
      waitingListDiv.innerHTML = ""; logListDiv.innerHTML = "";
      let logsArray = [];

      reqSnap.forEach(rDoc => { requestsData[rDoc.id] = rDoc.data(); });

      snap.forEach(doc => {
        const u = doc.data();
        if (!u.nickname || u.isAdmin) return; // 이름 없는 데이터나 관리자 제외
        
        userMap[doc.id] = u.nickname; 
        adminUsersData[doc.id] = { id: doc.id, ...u };

        // 2단계: 참여 현황
        const statusText = u.isParticipating ? "✅ 참여" : "❌ 불참";
        const statusColor = u.isParticipating ? "var(--deep-navy)" : "#e74c3c";
        partListDiv.innerHTML += `<div style="padding:6px 0; border-bottom:1px dashed #eee; display:flex; justify-content:space-between;">
          <span>${u.emoji || '👤'} ${u.nickname}</span><span style="color:${statusColor}; font-weight:bold;">${statusText}</span></div>`;
        manageUserSelect.innerHTML += `<option value="${doc.id}">${u.nickname}</option>`;
        
        if (u.isParticipating) {
          participatingCount++;
          if (u.isProfileConfirmed) confirmedCount++;
          // 3단계: 미제출자 프리뷰
          if (u.status === 'waiting') {
            const req = requestsData[doc.id] || {};
            const p1 = userMap[req.pref1] || "-"; const p2 = userMap[req.pref2] || "-"; const dp = userMap[req.dispref1] || "-";
            waitingListDiv.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid #eee;">
              ⏳ ${u.emoji || '👤'} <b>${u.nickname}</b> <span style="font-size:0.8rem; color:#888; float:right;">(${p1} / ${p2} // ${dp})</span></div>`;
          }
        }
        if (u.status === 'held') heldCount++;
        if (u.status === 'submitted' && requestsData[doc.id] && !requestsData[doc.id].isDraft) {
          logsArray.push({ id: doc.id, req: requestsData[doc.id], ts: requestsData[doc.id].timestamp });
        }
      });

      document.getElementById('held-count').innerText = heldCount;
      const profileCheckStatus = document.getElementById('profile-check-confirm-status');
      if (profileCheckStatus) profileCheckStatus.innerHTML = `참여 예정자 ${participatingCount}명 중 <b>${confirmedCount}명</b> 점검 완료`;
      if (waitingListDiv.innerHTML === "") waitingListDiv.innerHTML = "<p style='color:#777;'>모든 참가자가 제출을 완료했습니다.</p>";

      // 최근 로그 4개 정렬 표시
      logsArray.sort((a,b) => (b.ts?.seconds || 0) - (a.ts?.seconds || 0));
      logsArray.slice(0, 4).forEach(log => {
        logListDiv.innerHTML += `<div style="padding:8px; border-bottom:1px solid #eee;">${adminUsersData[log.id]?.emoji||'👩'} <b>${userMap[log.id]}</b> ➜ 1지망: <span style="color:#FD79A8">${userMap[log.req.pref1] || "-"}</span></div>`;
      });
      
      // 4단계 목록 및 요약 업데이트 (이하 생략 - 기존 로직 유지)
      updateAdminMatchedLists(snap);
    });
  });
}

function updateAdminMatchedLists(snap) {
  const matchedListDiv = document.getElementById('admin-matched-list');
  const matchedListFinal = document.getElementById('admin-matched-list-final');
  if (!matchedListDiv) return;
  matchedListDiv.innerHTML = '';
  const seenIds = new Set();
  snap.forEach(doc => {
    const u = doc.data();
    if (u.status !== 'matched' || !u.partnerId || seenIds.has(doc.id) || seenIds.has(u.partnerId)) return;
    seenIds.add(doc.id); seenIds.add(u.partnerId);
    const b = adminUsersData[u.partnerId];
    if (!b) return;
    const item = `<div style="padding:8px; border-bottom:1px solid #ffd1e5; display:flex; justify-content:space-between; align-items:center;">
      <span>${u.emoji||'👤'} <b>${u.nickname}</b></span><span style="color:#FD79A8;">💘</span><span>${b.emoji||'👤'} <b>${b.nickname}</b></span></div>`;
    matchedListDiv.innerHTML += item;
  });
  if (matchedListFinal) matchedListFinal.innerHTML = matchedListDiv.innerHTML;
  const summary = document.getElementById('final-match-summary');
  if (summary) summary.innerText = `확정된 커플: ${seenIds.size / 2}쌍`;
}

window.goToAdminStep = function(n, syncToDb = true) {
  currentAdminStep = n;
  for (let i = 0; i < 4; i++) {
    const stepEl = document.getElementById(`admin-step-${i}`);
    const circle = document.getElementById(`step-circle-${i}`);
    const conn = document.getElementById(`step-conn-${i}`);
    if (stepEl) stepEl.style.display = i === n ? 'block' : 'none';
    if (circle) { circle.classList.toggle('active', i === n); circle.classList.toggle('done', i < n); }
    if (conn) conn.classList.toggle('done', i < n);
  }
  if (syncToDb) db.collection('settings').doc('global').set({ adminStep: n }, { merge: true });
};

document.getElementById('apply-settings-btn').addEventListener('click', () => {
  const tickerMessage = document.getElementById('ticker-input').value.trim();
  const matchTitle = document.getElementById('match-title-input').value.trim();
  db.collection('settings').doc('global').set({ tickerMessage, matchTitle }, { merge: true }).then(() => alert("설정 적용 완료"));
});

document.getElementById('start-auto-match-btn').addEventListener('click', () => {
  let available = Object.values(adminUsersData).filter(u => u.status === 'submitted' && u.isParticipating);
  proposedQueue = [];
  available.forEach(A => {
    if(A.isProcessed) return;
    const reqA = requestsData[A.id];
    if(!reqA || reqA.isDraft) return;
    let targetId = [reqA.pref1, reqA.pref2, reqA.pref3].find(id => id && adminUsersData[id]?.status === 'submitted' && !adminUsersData[id].isProcessed);
    if(targetId) {
      let B = adminUsersData[targetId];
      A.isProcessed = true; B.isProcessed = true; proposedQueue.push({ A, B });
    }
  });
  if(proposedQueue.length === 0) return alert("매칭 가능한 조합이 없습니다.");
  showNextProposal();
});

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
    snap.forEach(doc => db.collection('users').doc(doc.id).update({ status: 'submitted' }));
    alert("보류자 복구 완료"); loadAdminData();
  });
});
document.getElementById('reset-all-btn').addEventListener('click', () => {
  if(confirm("전체 초기화하시겠습니까?")) {
    db.collection('users').get().then(snap => {
      snap.forEach(doc => {
        const u = doc.data();
        const upd = { status: 'waiting', partnerId: null, isProfileConfirmed: false };
        if (u.partnerId) upd.matchHistory = firebase.firestore.FieldValue.arrayUnion(u.partnerId);
        db.collection('users').doc(doc.id).update(upd);
      });
      db.collection('settings').doc('global').update({ isMatchingActive: false, resultsPublished: false, isProfileCheckActive: false, adminStep: 0 });
    });
  }
});
document.getElementById('publish-results-btn').addEventListener('click', () => {
  if(confirm("전체 결과를 발표합니다!")) db.collection('settings').doc('global').update({ resultsPublished: true });
});

document.getElementById('manual-match-btn').addEventListener('click', () => {
  const aId = document.getElementById('manual-a-user').value;
  const bId = document.getElementById('manual-b-user').value;
  if (!aId || !bId || aId === bId) return alert("올바른 유저들을 선택하세요.");
  db.collection('users').doc(aId).update({ status: 'matched', partnerId: bId });
  db.collection('users').doc(bId).update({ status: 'matched', partnerId: aId }).then(() => alert("수동 매칭 완료"));
});

document.getElementById('manage-part-btn').addEventListener('click', () => {
  const uid = document.getElementById('manage-part-user').value;
  const isPart = document.getElementById('manage-part-status').value === "true";
  if (!uid) return alert("유저 선택 필수");
  db.collection('users').doc(uid).update({ isParticipating: isPart }).then(() => alert("참여 상태 변경 완료"));
});

document.getElementById('apply-toggles-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({
    showPref2: document.getElementById('toggle-pref2').checked,
    showPref3: document.getElementById('toggle-pref3').checked,
    showDispref: document.getElementById('toggle-dispref').checked
  }, { merge: true }).then(() => alert("지망 옵션 적용 완료"));
});
