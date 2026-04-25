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
  if (!myUserData) location.reload();
  else { updateWaitroomUI(); showWaitroomArea('waitroom-header'); }
};

function getScoreLabel(val) {
  if (val <= 12) return "완전 한글"; if (val <= 37) return "한세글";
  if (val <= 62) return "세글"; if (val <= 87) return "두세글"; return "완전 두글";
}

// 3. 성향 스펙트럼 슬라이더
const slider = document.getElementById('personality-slider');
const spectrumLabel = document.getElementById('spectrum-label');
function updateSlider() {
  const val = slider.value;
  slider.style.background = `linear-gradient(to right, #1A2B3C ${val}%, #FD79A8 ${val}%, #FD79A8 100%)`;
  spectrumLabel.innerText = getScoreLabel(val);
}
slider.addEventListener('input', updateSlider);
updateSlider();

// 4. 이모티콘 선택
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

// 5. 인증
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
  auth.signInWithEmailAndPassword(id + "@roundtable.com", pw + "round")
    .catch(() => alert("로그인 실패. 아이디와 비밀번호를 확인해주세요."));
});
document.getElementById('logout-btn').addEventListener('click', () => { auth.signOut(); location.reload(); });
document.getElementById('admin-link-btn').addEventListener('click', () => {
  showSection('admin');
  goToAdminStep(currentAdminStep);
});

// 6. 계정 탈퇴
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
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') alert("비밀번호가 올바르지 않습니다.");
    else alert("오류가 발생했습니다: " + err.message);
  }
});

// 7. 마이페이지
function openMyPage() {
  if (myUserData.status === 'submitted' || myUserData.status === 'matched') return alert("제출 후엔 프로필 수정이 불가합니다.");
  if (globalSettings?.isMatchingActive) return alert("매칭 진행 중에는 프로필 수정이 불가합니다.");
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
  if (found) { customEmojiInput.style.display = 'none'; }
  else {
    document.querySelector('.emoji-item[data-emoji="기타"]').classList.add('selected');
    customEmojiInput.style.display = 'block'; customEmojiInput.value = savedEmoji;
  }
  currentSelectedEmoji = savedEmoji; previewEmoji.innerText = savedEmoji;
  slider.value = myUserData.personalityScore || 50; updateSlider();
  document.getElementById('intro').value = myUserData.intro || "";
  showSection('profile');
}

document.getElementById('mypage-btn').addEventListener('click', openMyPage);

// 8. 프로필 저장
document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;
  let selectedCity = document.getElementById('city').value;
  if (selectedCity === '기타') selectedCity = document.getElementById('custom-city').value;
  db.collection('users').doc(user.uid).set({
    nickname: document.getElementById('nickname').value,
    birthYear: parseInt(document.getElementById('birthYear').value),
    city: selectedCity,
    kakaoLink: document.getElementById('kakao-link').value,
    emoji: currentSelectedEmoji,
    personalityScore: parseInt(slider.value),
    intro: document.getElementById('intro').value,
    isParticipating: document.getElementById('isParticipating').checked,
    isAdmin: myUserData?.isAdmin || false,
    status: myUserData?.status || 'waiting'
  }, { merge: true }).then(() => { alert("프로필 저장 완료!"); location.reload(); });
});

// 9. 인증 상태 감시
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
    ['logout-btn', 'mypage-btn', 'admin-link-btn'].forEach(id => document.getElementById(id).style.display = 'none');
  }
});

// 10. 대기실 UI
function updateWaitroomUI() {
  const gs = globalSettings;
  const isPart = myUserData.isParticipating !== false;
  const isConfirmed = myUserData.isProfileConfirmed;
  const isSubmitted = myUserData.status === 'submitted';

  // 단계 pill
  let stepNum = 1, stepName = '참여 결정';
  if (gs.resultsPublished)      { stepNum = 4; stepName = '결과 발표'; }
  else if (gs.isMatchingActive) { stepNum = 3; stepName = '매칭 진행'; }
  else if (gs.isProfileCheckActive) { stepNum = 2; stepName = '프로필 점검'; }
  const pill = document.getElementById('home-step-pill');
  if (pill) pill.innerText = `${stepNum}단계 · ${stepName}`;

  // 매치 회차명
  const matchLabel = document.getElementById('room-match-label');
  if (matchLabel) matchLabel.innerText = gs.matchTitle || '';

  // 토글 표시 여부: 매칭 시작 전까지만 표시. 점검 완료 후엔 잠금만.
  const showToggle = !gs.isMatchingActive && !gs.resultsPublished;
  const toggleWrapper = document.getElementById('home-toggle-wrapper');
  const toggle = document.getElementById('waitroom-participation-toggle');
  const partCard = document.getElementById('home-part-card');
  const toggleVisibleNow = showToggle && (isPart || (!gs.isProfileCheckActive && !gs.isMatchingActive));
  if (toggleWrapper) toggleWrapper.style.display = toggleVisibleNow ? 'flex' : 'none';
  if (toggle) { toggle.checked = isPart; toggle.disabled = gs.isProfileCheckActive && isConfirmed; }
  if (partCard) {
    partCard.classList.toggle('active', isPart);
    partCard.style.opacity = (gs.isProfileCheckActive && isConfirmed) ? '0.6' : '1';
  }

  // 공통 요소
  const emoji = document.getElementById('home-stage-emoji');
  const title = document.getElementById('home-stage-title');
  const desc = document.getElementById('home-stage-desc');
  const mainBtn = document.getElementById('waitroom-main-btn');
  const subBtn = document.getElementById('waitroom-sub-btn');
  const picksSummary = document.getElementById('home-picks-summary');

  mainBtn.style.display = 'none'; subBtn.style.display = 'none';
  if (picksSummary) picksSummary.style.display = 'none';

  // ── 상태별 콘텐츠 ──
  if (gs.resultsPublished) {
    if (myUserData.status === 'matched') {
      emoji.innerText = '🎉';
      title.innerText = '결과가 발표됐어요!';
      desc.innerText = '두근두근... 내 매칭 결과를 확인해보세요.';
      mainBtn.style.cssText = 'display:block; background:var(--soft-rose); color:white; font-size:1.1rem; padding:18px; animation:pulse 1.2s infinite ease-in-out; margin-bottom:8px;';
      mainBtn.innerText = '💖 결과 확인하기';
      mainBtn.onclick = () => showWaitroomArea('result-ready-area');
    } else if (!isPart) {
      emoji.innerText = '😌';
      title.innerText = '이번 회차엔 쉬어갔네요';
      desc.innerText = '다음 매칭에서 좋은 인연을 만나길 응원해요!';
    } else {
      emoji.innerText = '😢';
      title.innerText = '아쉽게도 이번엔 인연이 닿지 않았어요';
      desc.innerText = '괜찮아요! 다음 회차엔 꼭 좋은 분을 만나길 바랍니다 💪';
    }
    return;

  } else if (!isPart) {
    if (gs.isProfileCheckActive || gs.isMatchingActive) {
      emoji.innerText = '💬';
      title.innerText = '참여하고 싶다면\n관리자에게 연락해주세요';
      desc.innerText = '이미 매칭이 진행 중이에요.\n관리자가 직접 참여 추가를 해드릴 수 있어요.';
      if (gs.adminKakaoLink) {
        mainBtn.style.cssText = 'display:block; background:#FEE500; color:#371D1E; font-size:1rem; padding:15px; margin-bottom:8px; font-weight:800;';
        mainBtn.innerText = '💬 관리자 오픈톡으로 연락하기';
        mainBtn.onclick = () => window.open(gs.adminKakaoLink, '_blank');
      }
    } else {
      emoji.innerText = '💤';
      title.innerText = '이번엔 쉬어가는군요!';
      desc.innerText = '다음 매칭에서 만나요.\n참여하고 싶다면 위 토글을 켜주세요.';
    }

  } else if (gs.isMatchingActive) {
    if (isSubmitted) {
      emoji.innerText = '🔒';
      title.innerText = '제출 완료!';
      desc.innerText = '결과를 기다리는 중이에요.\n진행자가 매칭을 종료하기 전까지 수정할 수 있어요.';
      subBtn.style.display = 'block'; subBtn.innerText = '✏️ 지망 수정하기';
      subBtn.onclick = () => db.collection('users').doc(auth.currentUser.uid).update({ status: 'waiting' });
    } else {
      emoji.innerText = '💘';
      title.innerText = '매칭이 시작됐어요!';
      desc.innerText = '카드를 살펴보고 마음에 드는 분께\n지망을 보내세요.';
      mainBtn.style.cssText = 'display:block; background:var(--soft-rose); color:white; font-size:1.05rem; padding:16px; margin-bottom:8px;';
      mainBtn.innerText = '💘 내 운명의 상대 찾기';
      mainBtn.onclick = () => goToSelectionArea();
    }
    if (picksSummary) { picksSummary.style.display = 'block'; loadHomePicksSummary(); }

  } else if (gs.isProfileCheckActive) {
    if (isConfirmed) {
      emoji.innerText = '✅';
      title.innerText = '프로필 점검 완료!';
      desc.innerText = '매칭 시작을 기다리는 중이에요.\n곧 내 운명의 상대를 만날 수 있어요 💘';
    } else {
      emoji.innerText = '🔍';
      title.innerText = '프로필을 점검해주세요!';
      desc.innerText = '내 프로필을 확인하고\n이번 매칭 참여 의사를 최종 확정해주세요.';
      mainBtn.style.cssText = 'display:block; background:var(--soft-rose); color:white; font-size:1rem; padding:15px; margin-bottom:8px;';
      mainBtn.innerText = '🔍 프로필 점검하러 가기';
      mainBtn.onclick = () => { showWaitroomArea('profile-check-area'); updateProfileCheckUI(); };
      subBtn.style.display = 'block'; subBtn.innerText = '✏️ 프로필 수정하기';
      subBtn.onclick = openMyPage;
    }

  } else {
    emoji.innerText = '⏳';
    title.innerText = '참여 여부를 정해주세요';
    desc.innerText = '이번 매칭에 참여할지 결정해주세요.\n확정은 프로필 점검 기간에 해요.';
  }
}

// 홈화면 내 선택 현황 로드
function loadHomePicksSummary() {
  const picksGrid = document.getElementById('home-picks-grid');
  if (!picksGrid || !auth.currentUser) return;
  const gs = globalSettings;
  const prefItems = [
    { label: '1지망', key: 'pref1', color: 'var(--soft-rose)' },
    { label: '2지망', key: 'pref2', color: '#f39c12', show: gs.showPref2 !== false },
    { label: '3지망', key: 'pref3', color: '#f1c40f', show: gs.showPref3 !== false },
    { label: '비선호', key: 'dispref1', color: '#95a5a6', show: gs.showDispref !== false },
  ].filter(i => i.show !== false);

  db.collection('requests').doc(auth.currentUser.uid).get().then(reqDoc => {
    const req = reqDoc.exists ? reqDoc.data() : {};
    const ids = prefItems.map(i => req[i.key]).filter(Boolean);
    if (ids.length === 0) {
      picksGrid.innerHTML = prefItems.map(i =>
        `<div class="home-pick-item"><div class="home-pick-rank" style="color:${i.color}">${i.label}</div><div class="home-pick-name empty">미선택</div></div>`
      ).join('');
      return;
    }
    db.collection('users').where('isParticipating', '==', true).get().then(snap => {
      const nameMap = {};
      snap.forEach(doc => { nameMap[doc.id] = doc.data().nickname; });
      picksGrid.innerHTML = prefItems.map(i => {
        const name = req[i.key] ? (nameMap[req[i.key]] || '?') : null;
        return `<div class="home-pick-item"><div class="home-pick-rank" style="color:${i.color}">${i.label}</div><div class="home-pick-name ${name ? '' : 'empty'}">${name || '미선택'}</div></div>`;
      }).join('');
    });
  });
}

document.getElementById('waitroom-participation-toggle').addEventListener('change', function() {
  const isPart = this.checked;
  myUserData.isParticipating = isPart;
  const partCard = document.getElementById('home-part-card');
  if (partCard) partCard.classList.toggle('active', isPart);
  updateWaitroomUI();
  const profileToggle = document.getElementById('isParticipating');
  if (profileToggle) profileToggle.checked = isPart;
  const user = auth.currentUser;
  if (user) db.collection('users').doc(user.uid).update({ isParticipating: isPart });
});

// 전광판 업데이트 (관리자/일반 공통)
function updateTickerDisplay(data) {
  const tickerContainer = document.getElementById('ticker-container');
  const tickerText = document.getElementById('ticker-text');
  if (!tickerContainer || !tickerText) return;
  const title = data?.matchTitle || '이번 매칭';
  let autoMsg = null;
  if (data?.resultsPublished) autoMsg = `🎉 ${title} 결과가 발표되었습니다! 결과 확인 버튼을 눌러보세요 💘`;
  else if (data?.isMatchingActive) autoMsg = `💘 ${title} 진행 중입니다! 카드를 살펴보고 지망을 제출해주세요 ✨`;
  else if (data?.isProfileCheckActive) autoMsg = `🔍 ${title} 준비 중 · 내 프로필을 점검하고 참여 여부를 확정해주세요 · 곧 매칭이 시작됩니다!`;
  else if (data?.adminStep != null) autoMsg = `⏳ ${title} · 참여 여부를 지금 정해주세요!`;
  const msg = data?.tickerMessage || autoMsg;
  if (msg) {
    tickerText.innerText = msg;
    tickerText.style.animationDuration = `${Math.max(10, msg.length * 0.22)}s`;
    tickerContainer.style.display = 'block';
  } else { tickerContainer.style.display = 'none'; }
}

// 11. 전역 설정 실시간 감시
function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    // 관리자: 항상 early return — 화면 전환 없이 데이터만 갱신
    if (myUserData?.isAdmin) {
      if (doc.exists) globalSettings = doc.data();
      updateTickerDisplay(globalSettings);
      if (!adminStepInitialized) {
        adminStepInitialized = true;
        showSection('admin');
        goToAdminStep(globalSettings.adminStep ?? 0, true);
      }
      startAdminRealtimeListeners();
      loadAdminData();
      return;
    }

    if (!doc.exists) { updateWaitroomUI(); showWaitroomArea('waitroom-header'); return; }
    const data = doc.data();
    globalSettings = data;
    updateTickerDisplay(data);

    // 결과 발표: 매칭된 사람만 result-ready-area, 나머지는 홈화면
    if (data.resultsPublished) {
      if (myUserData.status === 'matched') { showWaitroomArea('result-ready-area'); return; }
      updateWaitroomUI(); showWaitroomArea('waitroom-header'); return;
    }

    // 제출/매칭 완료 상태: submitted-lock-area
    if (myUserData.status === 'submitted' || myUserData.status === 'matched') {
      showWaitroomArea('submitted-lock-area');
      const editBtn = document.getElementById('edit-picks-btn');
      const lockDesc = document.getElementById('submitted-lock-desc');
      if (data.isMatchingActive && myUserData.status !== 'matched') {
        editBtn.style.display = 'inline-block';
        lockDesc.innerHTML = "진행자가 매칭을 종료하기 전까지<br>수정할 수 있습니다.";
      } else {
        editBtn.style.display = 'none';
        lockDesc.innerHTML = "매칭이 마감되었습니다.<br>결과를 기다려주세요.";
      }
      return;
    }

    // 매칭 진행 중: 지망 버튼 옵션 업데이트 후 홈화면
    if (data.isMatchingActive && myUserData.isParticipating) {
      document.getElementById('btn-pref2').style.display = data.showPref2 ? 'inline-block' : 'none';
      document.getElementById('btn-pref3').style.display = data.showPref3 ? 'inline-block' : 'none';
      document.getElementById('btn-dispref').style.display = data.showDispref ? 'inline-block' : 'none';
      document.getElementById('li-pref2').style.display = data.showPref2 ? 'flex' : 'none';
      document.getElementById('li-pref3').style.display = data.showPref3 ? 'flex' : 'none';
      document.getElementById('li-dispref').style.display = data.showDispref ? 'flex' : 'none';
      updateWaitroomUI(); showWaitroomArea('waitroom-header');
    } else if (data.isProfileCheckActive && !data.isMatchingActive) {
      // 프로필 점검 기간: 직접 점검 화면으로
      showWaitroomArea('profile-check-area');
      updateProfileCheckUI();
    } else {
      updateWaitroomUI(); showWaitroomArea('waitroom-header');
    }
  });
}

window.goToSelectionArea = function() {
  showWaitroomArea('selection-area');
  loadCards();
};

// 12. 프로필 점검 UI
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
      .then(() => { myUserData.isProfileConfirmed = true; updateProfileCheckUI(); });
  }
});

// 13. 카드 선택 시스템
let allUsers = []; let currentIndex = 0;
let mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
const mapIds = { 'pref1': 'pick-1-name', 'pref2': 'pick-2-name', 'pref3': 'pick-3-name', 'dispref1': 'pick-dis-name' };
const resetBtnIds = { 'pref1': 'reset-pref1', 'pref2': 'reset-pref2', 'pref3': 'reset-pref3', 'dispref1': 'reset-dispref1' };

function loadCards() {
  db.collection('users').where('status', 'in', ['waiting', 'submitted']).get().then(snapshot => {
      allUsers = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        if (doc.id !== auth.currentUser.uid && !d.emergencyAdded && d.isParticipating !== false)
          allUsers.push({ id: doc.id, ...d });
      });
      mySelections = { pref1: null, pref2: null, pref3: null, dispref1: null };
      Object.keys(mapIds).forEach(key => {
        const el = document.getElementById(mapIds[key]);
        el.innerText = '미선택'; el.style.color = '#777'; el.style.fontWeight = 'normal';
        document.getElementById(resetBtnIds[key]).style.display = 'none';
      });
      const submitBtn = document.getElementById('submit-selection-btn');
      submitBtn.disabled = true; submitBtn.classList.add('disabled-submit'); submitBtn.classList.remove('active-submit');
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
  document.getElementById('c-score-label').innerText = getScoreLabel(u.personalityScore || 50);
  document.getElementById('c-mini-fill').style.width = `${u.personalityScore || 50}%`;
  document.getElementById('c-intro').innerText = u.intro || '';
}

window.nextCard = function() { if (currentIndex < allUsers.length - 1) { currentIndex++; renderCard(); } };
window.prevCard = function() { if (currentIndex > 0) { currentIndex--; renderCard(); } };

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
  if (mySelections.pref1) {
    const btn = document.getElementById('submit-selection-btn');
    btn.disabled = false; btn.classList.remove('disabled-submit'); btn.classList.add('active-submit');
  }
  db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  nextCard();
};

window.resetPick = function(prefType) {
  if (confirm("다시 선택하시겠습니까?")) {
    mySelections[prefType] = null;
    const nameEl = document.getElementById(mapIds[prefType]);
    nameEl.innerText = "미선택"; nameEl.style.color = "#777"; nameEl.style.fontWeight = "normal";
    document.getElementById(resetBtnIds[prefType]).style.display = "none";
    if (!mySelections.pref1) {
      const btn = document.getElementById('submit-selection-btn');
      btn.disabled = true; btn.classList.remove('active-submit'); btn.classList.add('disabled-submit');
    }
    db.collection('requests').doc(auth.currentUser.uid).set({ ...mySelections, isDraft: true }, { merge: true });
  }
};

document.getElementById('submit-selection-btn').addEventListener('click', () => {
  if (confirm("제출하시겠습니까? (종료 전까지 수정 가능)")) {
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

let partnerData = null;

document.getElementById('check-result-btn').addEventListener('click', async () => {
  showSection('result');
  document.getElementById('r-my-emoji').innerText = myUserData.emoji || '👩';
  document.getElementById('r-my-nick').innerText = myUserData.nickname;
  partnerData = null;

  const card = document.getElementById('anim-partner-card');
  card.style.pointerEvents = 'none';

  if (!myUserData.partnerId) {
    document.getElementById('r-partner-emoji').innerText = '😢';
    document.getElementById('r-partner-nick').innerText = '아쉽게도...';
    card.querySelector('p').innerText = '다음 회차에 만나요!';
    card.style.cursor = 'default';
    card.onclick = null;
    return;
  }
  const partnerDoc = await db.collection('users').doc(myUserData.partnerId).get();
  partnerData = partnerDoc.data();
  document.getElementById('r-partner-emoji').innerText = partnerData.emoji || '👩';
  document.getElementById('r-partner-nick').innerText = partnerData.nickname;
  card.style.pointerEvents = '';
  const kakaoBtn = document.getElementById('kakao-contact-btn');
  if (partnerData.kakaoLink) {
    kakaoBtn.style.display = 'block';
    kakaoBtn.onclick = () => window.open(partnerData.kakaoLink, '_blank');
  }
  setTimeout(() => document.querySelector('.cards-animation-container').classList.add('animate-start'), 500);
});

window.openPartnerPopup = function() {
  if (!partnerData) return;
  document.getElementById('popup-emoji').innerText = partnerData.emoji || '👩';
  document.getElementById('popup-nick').innerText = partnerData.nickname;
  document.getElementById('popup-basic').innerText = `${partnerData.birthYear % 100}년생 · ${partnerData.city}`;
  document.getElementById('popup-spec-label').innerText = getScoreLabel(partnerData.personalityScore || 50);
  document.getElementById('popup-spec-fill').style.width = `${partnerData.personalityScore || 50}%`;
  document.getElementById('popup-intro').innerText = partnerData.intro || '(소개글 없음)';
  const kakaoBtn = document.getElementById('popup-kakao-btn');
  if (partnerData.kakaoLink) {
    kakaoBtn.style.display = 'block';
    kakaoBtn.onclick = () => window.open(partnerData.kakaoLink, '_blank');
  } else { kakaoBtn.style.display = 'none'; }
  const popup = document.getElementById('partner-popup');
  popup.style.display = 'flex';
};

document.getElementById('partner-popup').addEventListener('click', function(e) {
  if (e.target === this) this.style.display = 'none';
});

// ==========================================
// 🌟 관리자 전용
// ==========================================
let globalSettings = {};
let currentAdminStep = 0;
let adminStepInitialized = false;
let userMap = {}; let adminUsersData = {}; let requestsData = {}; let proposedQueue = [];
let adminUsersSnap = null; let adminReqSnap = null;
let adminRenderTimer = null; let adminListenersActive = false;

window.switchAdminView = function(view) {
  document.getElementById('admin-match-view').style.display = view === 'match' ? 'block' : 'none';
  document.getElementById('admin-members-panel').style.display = view === 'members' ? 'block' : 'none';
  document.getElementById('admin-tab-match').classList.toggle('active', view === 'match');
  document.getElementById('admin-tab-members').classList.toggle('active', view === 'members');
  if (view === 'members') renderAllMembersPanel();
};

window.goToAdminStep = function(n, skipConfirm) {
  if (!skipConfirm && adminStepInitialized && n < currentAdminStep) {
    const names = ['프로필 점검', '매칭 진행', '매칭 검토', '결과 발표'];
    if (!confirm(`⚠️ ${names[n]} 단계(${n+1}단계)로 돌아가시겠습니까?\n이미 진행된 데이터에 영향을 줄 수 있습니다.`)) return;
  }
  currentAdminStep = n;
  for (let i = 0; i < 4; i++) {
    const stepEl = document.getElementById(`admin-step-${i}`);
    const circle = document.getElementById(`step-circle-${i}`);
    const conn = document.getElementById(`step-conn-${i}`);
    if (stepEl) stepEl.style.display = i === n ? 'block' : 'none';
    if (circle) { circle.classList.toggle('active', i === n); circle.classList.toggle('done', i < n); }
    if (conn) conn.classList.toggle('done', i < n);
  }
  db.collection('settings').doc('global').set({ adminStep: n }, { merge: true });
};

function scheduleAdminRender() {
  clearTimeout(adminRenderTimer);
  adminRenderTimer = setTimeout(() => {
    if (adminUsersSnap && adminReqSnap) renderAdminFromSnaps(adminUsersSnap, adminReqSnap);
  }, 150);
}

function startAdminRealtimeListeners() {
  if (adminListenersActive) return;
  adminListenersActive = true;
  db.collection('users').onSnapshot(snap => { adminUsersSnap = snap; scheduleAdminRender(); });
  db.collection('requests').onSnapshot(snap => { adminReqSnap = snap; scheduleAdminRender(); });
}

function renderAllMembersPanel() {
  if (document.getElementById('admin-members-panel')?.style.display === 'none') return;
  const searchVal = (document.getElementById('member-search')?.value || '').toLowerCase();
  const statusFilter = document.getElementById('member-filter-status')?.value || '';
  const partFilter = document.getElementById('member-filter-part')?.value || '';

  const listEl = document.getElementById('all-members-list');
  const countEl = document.getElementById('all-members-count');
  if (!listEl) return;

  const allMembers = Object.values(adminUsersData).filter(u => u.nickname);
  const members = allMembers.filter(u => {
    if (searchVal && !u.nickname.toLowerCase().includes(searchVal)) return false;
    if (statusFilter && u.status !== statusFilter) return false;
    if (partFilter === 'yes' && u.isParticipating === false) return false;
    if (partFilter === 'no' && u.isParticipating !== false) return false;
    return true;
  });

  if (countEl) countEl.innerText = `전체 ${allMembers.length}명 중 ${members.length}명 표시`;

  if (members.length === 0) {
    listEl.innerHTML = '<p style="color:#777; text-align:center; padding:20px;">검색 결과가 없습니다.</p>';
    return;
  }

  const statusInfo = {
    waiting:   { label: '대기',   color: '#95a5a6' },
    submitted: { label: '제출',   color: '#3498db' },
    matched:   { label: '매칭',   color: '#e91e8c' },
    held:      { label: '보류',   color: '#e67e22' }
  };

  members.sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return (a.nickname || '').localeCompare(b.nickname || '');
  });

  listEl.innerHTML = members.map(u => {
    const si = statusInfo[u.status] || { label: u.status || '-', color: '#999' };
    const partColor = u.isParticipating !== false ? '#27ae60' : '#e74c3c';
    const partLabel = u.isParticipating !== false ? '참여O' : '불참';
    const confColor = u.isProfileConfirmed ? '#27ae60' : '#ccc';
    const confLabel = u.isProfileConfirmed ? '점검O' : '점검X';
    const partner = u.partnerId ? (userMap[u.partnerId] || '?') : '';
    const escNick = u.nickname.replace(/'/g, "\\'");

    return `<div class="member-row">
      <div class="member-main">
        <span class="member-emoji">${u.emoji || '👤'}</span>
        <div class="member-info">
          <div class="member-name">${u.nickname}${u.isAdmin ? ' <span style="font-size:0.68rem;color:#e67e22;font-weight:700;background:#fff3e0;padding:1px 5px;border-radius:6px;">관리자</span>' : ''}</div>
          <div class="member-sub">${u.birthYear ? (u.birthYear % 100) + '년생' : '-'} · ${u.city || '-'}</div>
          <div style="display:flex; flex-wrap:wrap; gap:3px; margin-top:4px;">
            <span style="background:${si.color}22; color:${si.color}; border:1px solid ${si.color}55; padding:1px 7px; border-radius:10px; font-size:0.68rem; font-weight:700;">${si.label}</span>
            <span style="background:${partColor}22; color:${partColor}; border:1px solid ${partColor}55; padding:1px 7px; border-radius:10px; font-size:0.68rem; font-weight:700;">${partLabel}</span>
            <span style="background:${confColor}22; color:${confColor}; border:1px solid ${confColor}55; padding:1px 7px; border-radius:10px; font-size:0.68rem; font-weight:700;">${confLabel}</span>
            ${partner ? `<span style="background:#f3e5f5; color:#8e44ad; border:1px solid #d7aef0; padding:1px 7px; border-radius:10px; font-size:0.68rem; font-weight:700;">💘${partner}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="member-actions">
        <select onchange="adminChangeStatus('${u.id}', this.value, '${escNick}'); this.value=''" style="margin-bottom:0; font-size:0.72rem; padding:5px 6px; border-radius:8px; width:auto; border:1px solid #ddd; background:white; cursor:pointer;">
          <option value="">상태▾</option>
          <option value="waiting">대기</option>
          <option value="submitted">제출</option>
          <option value="held">보류</option>
        </select>
        <button onclick="adminTogglePart('${u.id}', '${escNick}', ${u.isParticipating !== false})" style="background:${partColor}; font-size:0.7rem; padding:5px 8px; width:auto; border-radius:8px; margin-top:2px;">${u.isParticipating !== false ? '불참전환' : '참여전환'}</button>
        ${!u.isAdmin ? `<button onclick="adminDeleteUser('${u.id}', '${escNick}')" style="background:#fdf0f0; color:#e74c3c; border:1px solid #f5c6c6; font-size:0.7rem; padding:5px 8px; width:auto; border-radius:8px; margin-top:2px;">삭제</button>` : ''}
      </div>
    </div>`;
  }).join('');
}

window.adminChangeStatus = function(uid, newStatus, nickname) {
  if (!newStatus) return;
  if (!confirm(`${nickname}님의 상태를 '${newStatus}'로 변경하시겠습니까?`)) return;
  const updates = { status: newStatus };
  if (newStatus !== 'matched') updates.partnerId = null;
  db.collection('users').doc(uid).update(updates).then(() => alert(`${nickname}님 상태가 변경되었습니다.`));
};

window.adminTogglePart = function(uid, nickname, currentlyParticipating) {
  const newPart = !currentlyParticipating;
  const msg = newPart ? `${nickname}님을 참여O로 변경하시겠습니까?` : `${nickname}님을 불참으로 변경하시겠습니까?`;
  if (!confirm(msg)) return;
  db.collection('users').doc(uid).update({ isParticipating: newPart }).then(() => alert('변경 완료!'));
};

window.adminDeleteUser = function(uid, nickname) {
  if (!confirm(`⚠️ ${nickname}님의 프로필/지망 데이터를 삭제하시겠습니까?\n\n(로그인 계정은 유지됩니다)`)) return;
  const userData = adminUsersData[uid];
  const batch = db.batch();
  if (userData?.partnerId) {
    batch.update(db.collection('users').doc(userData.partnerId), { status: 'waiting', partnerId: null });
  }
  batch.delete(db.collection('users').doc(uid));
  batch.delete(db.collection('requests').doc(uid));
  batch.commit().then(() => alert(`${nickname}님 데이터가 삭제되었습니다.`));
};

function loadAdminData() {
  if (adminUsersSnap && adminReqSnap) {
    renderAdminFromSnaps(adminUsersSnap, adminReqSnap);
  } else {
    db.collection('users').get().then(snap => {
      db.collection('requests').get().then(reqSnap => renderAdminFromSnaps(snap, reqSnap));
    });
  }
}

function getRank(req, targetId) {
  if (!req) return null;
  if (req.pref1 === targetId) return '1지망'; if (req.pref2 === targetId) return '2지망';
  if (req.pref3 === targetId) return '3지망'; return null;
}
function getRankScore(req, targetId) {
  if (!req) return 0;
  if (req.pref1 === targetId) return 3; if (req.pref2 === targetId) return 2;
  if (req.pref3 === targetId) return 1; return 0;
}

function renderAdminFromSnaps(snap, reqSnap) {
  let heldCount = 0;
  userMap = {}; adminUsersData = {}; requestsData = {};

  const allParticipantsDiv = document.getElementById('admin-participants-all');
  const unconfirmedManageDiv = document.getElementById('admin-unconfirmed-manage');
  if (allParticipantsDiv) allParticipantsDiv.innerHTML = "";
  if (unconfirmedManageDiv) unconfirmedManageDiv.innerHTML = "";
  let participatingCount = 0; let confirmedCount = 0;
  const emergencySel1 = document.getElementById('emergency-add-user-1');
  const emergencySel2 = document.getElementById('emergency-add-user-2');
  if (emergencySel1) emergencySel1.innerHTML = '<option value="">불참 회원 선택</option>';
  if (emergencySel2) emergencySel2.innerHTML = '<option value="">불참 회원 선택</option>';

  const waitingListDiv = document.getElementById('admin-waiting-list');
  const logListDiv = document.getElementById('admin-requests-list');
  if (waitingListDiv) waitingListDiv.innerHTML = "";
  if (logListDiv) logListDiv.innerHTML = "";
  let logsArray = [];

  reqSnap.forEach(rDoc => { requestsData[rDoc.id] = rDoc.data(); });

  snap.forEach(doc => {
    const u = doc.data();
    userMap[doc.id] = u.nickname;
    adminUsersData[doc.id] = { id: doc.id, ...u };
    if (u.isAdmin || !u.nickname) return;
    if (u.status === 'held') heldCount++;

    if (u.isParticipating !== false) {
      participatingCount++;
      const checkColor = u.isProfileConfirmed ? '#27ae60' : '#e74c3c';
      const checkLabel = u.isProfileConfirmed ? '✅ 점검완료' : '❌ 미점검';
      if (allParticipantsDiv) allParticipantsDiv.innerHTML += `<div style="padding:7px 0; border-bottom:1px dashed #eee; display:flex; justify-content:space-between; align-items:center;"><span>${u.emoji || '👤'} ${u.nickname}</span><span style="color:${checkColor}; font-weight:700; font-size:0.85rem;">${checkLabel}</span></div>`;
      if (u.isProfileConfirmed) confirmedCount++;
      else if (unconfirmedManageDiv) unconfirmedManageDiv.innerHTML += `<div style="padding:7px 0; border-bottom:1px dashed #eee; display:flex; justify-content:space-between; align-items:center;"><span>${u.emoji || '👤'} ${u.nickname}</span><button onclick="setUserNotParticipating('${doc.id}','${u.nickname}')" style="background:#e74c3c; color:white; font-size:0.78rem; padding:5px 10px; border-radius:8px; width:auto; cursor:pointer; border:none;">참여 X</button></div>`;
    } else {
      const opt = `<option value="${doc.id}">${u.emoji || '👤'} ${u.nickname}</option>`;
      if (emergencySel1) emergencySel1.innerHTML += opt;
      if (emergencySel2) emergencySel2.innerHTML += opt;
    }

    if (u.isParticipating && u.status === 'waiting') {
      const req = requestsData[doc.id] || {};
      const p1 = userMap[req.pref1] || "-"; const p2 = userMap[req.pref2] || "-"; const dp = userMap[req.dispref1] || "-";
      if (waitingListDiv) waitingListDiv.innerHTML += `<div style="padding:8px 0; border-bottom:1px solid #eee;">
        ⏳ ${u.emoji || '👤'} <b>${u.nickname}</b> <span style="font-size:0.8rem; color:#888; float:right;">(${p1} / ${p2} // ${dp})</span></div>`;
    }
    if (u.status === 'submitted' && requestsData[doc.id] && !requestsData[doc.id].isDraft) {
      logsArray.push({ id: doc.id, req: requestsData[doc.id] });
    }
  });

  const heldCountEl = document.getElementById('held-count');
  if (heldCountEl) heldCountEl.innerText = heldCount;
  if (waitingListDiv && waitingListDiv.innerHTML === "") waitingListDiv.innerHTML = "<p style='color:#777;'>모든 참가자가 제출을 완료했습니다.</p>";

  logsArray.sort((a, b) => (b.req.timestamp?.seconds || 0) - (a.req.timestamp?.seconds || 0));
  logsArray.slice(0, 4).forEach(log => {
    if (logListDiv) logListDiv.innerHTML += `<div style="padding:8px; border-bottom:1px solid #eee;">${adminUsersData[log.id]?.emoji||'👩'} <b>${userMap[log.id]}</b> ➜ 1지망: <span style="color:#FD79A8">${userMap[log.req.pref1] || "-"}</span></div>`;
  });
  if (logListDiv && logsArray.length === 0) logListDiv.innerHTML = "<p style='color:#777;'>제출된 지망이 없습니다.</p>";

  // 참여예정자 목록 빈 상태 처리 + 프로필 점검 현황 업데이트
  if (allParticipantsDiv && allParticipantsDiv.innerHTML === "") allParticipantsDiv.innerHTML = "<p style='color:#777; font-size:0.9rem;'>참여 예정자가 없습니다.</p>";
  if (unconfirmedManageDiv && unconfirmedManageDiv.innerHTML === "") unconfirmedManageDiv.innerHTML = "<p style='color:#27ae60; font-weight:700; font-size:0.9rem;'>✅ 미점검 참여자가 없습니다.</p>";
  const profileCheckStatus = document.getElementById('profile-check-confirm-status');
  if (profileCheckStatus) profileCheckStatus.innerHTML = `참여 예정자 ${participatingCount}명 중 <b>${confirmedCount}명</b> 점검 완료`;

  // 확정된 커플 목록 (1:1)
  const matchedListDiv = document.getElementById('admin-matched-list');
  if (matchedListDiv) {
    matchedListDiv.innerHTML = '';
    const seenIds = new Set(); let totalPairs = 0;
    snap.forEach(doc => {
      const u = doc.data();
      if (u.status !== 'matched' || !u.partnerId || seenIds.has(doc.id) || seenIds.has(u.partnerId)) return;
      seenIds.add(doc.id); seenIds.add(u.partnerId);
      const partner = adminUsersData[u.partnerId];
      if (!partner) return;
      totalPairs++;
      const warn = (!u.kakaoLink || !partner.kakaoLink) ? ' <span style="color:#e74c3c;font-size:0.75rem;">⚠️</span>' : '';
      matchedListDiv.innerHTML += `<div style="padding:8px; border-bottom:1px solid #ffd1e5; display:flex; justify-content:space-between; align-items:center;">
        <span>${u.emoji||'👩'} <b>${u.nickname}</b></span><span style="color:#FD79A8;">💘</span>
        <span>${partner.emoji||'👩'} <b>${partner.nickname}</b>${warn}</span></div>`;
    });
    if (matchedListDiv.innerHTML === '') matchedListDiv.innerHTML = "<p style='color:#777;'>아직 확정된 매칭이 없습니다.</p>";

    const matchedListFinal = document.getElementById('admin-matched-list-final');
    const finalSummary = document.getElementById('final-match-summary');
    if (matchedListFinal) matchedListFinal.innerHTML = matchedListDiv.innerHTML;
    if (finalSummary) finalSummary.innerText = `확정된 커플: ${totalPairs}쌍`;
  }

  // 수동 매칭 셀렉트 채우기
  const manualASelect = document.getElementById('manual-a-user');
  const manualBSelect = document.getElementById('manual-b-user');
  if (manualASelect) manualASelect.innerHTML = '<option value="">A 선택</option>';
  if (manualBSelect) manualBSelect.innerHTML = '<option value="">B 선택</option>';
  snap.forEach(doc => {
    const u = doc.data();
    if (u.isAdmin || !u.isParticipating || !['waiting', 'submitted', 'held'].includes(u.status)) return;
    const label = `${u.emoji||'👤'} ${u.nickname} (${u.status})`;
    if (manualASelect) { const o = document.createElement('option'); o.value = doc.id; o.innerText = label; manualASelect.appendChild(o); }
    if (manualBSelect) { const o = document.createElement('option'); o.value = doc.id; o.innerText = label; manualBSelect.appendChild(o); }
  });

  // 전광판/매칭명 인풋 현재 설정값 반영
  const tickerInput = document.getElementById('ticker-input');
  const matchTitleInput = document.getElementById('match-title-input');
  if (tickerInput && globalSettings.tickerMessage !== undefined) tickerInput.value = globalSettings.tickerMessage || '';
  if (matchTitleInput && globalSettings.matchTitle !== undefined) matchTitleInput.value = globalSettings.matchTitle || '';
  const adminKakaoInput = document.getElementById('admin-kakao-link-input');
  if (adminKakaoInput && globalSettings.adminKakaoLink !== undefined) adminKakaoInput.value = globalSettings.adminKakaoLink || '';

  // 지망 토글 현재 설정값 반영
  if (globalSettings.showPref2 !== undefined) { const el = document.getElementById('toggle-pref2'); if (el) el.checked = globalSettings.showPref2; }
  if (globalSettings.showPref3 !== undefined) { const el = document.getElementById('toggle-pref3'); if (el) el.checked = globalSettings.showPref3; }
  if (globalSettings.showDispref !== undefined) { const el = document.getElementById('toggle-dispref'); if (el) el.checked = globalSettings.showDispref; }

  renderAllMembersPanel();
}

// 관리자 버튼 이벤트
window.setUserNotParticipating = function(uid, nickname) {
  const affected = [];
  Object.entries(requestsData).forEach(([submitterId, req]) => {
    if (submitterId === uid) return;
    const submitter = adminUsersData[submitterId];
    if (!submitter || submitter.isAdmin) return;
    if ([req.pref1, req.pref2, req.pref3].includes(uid) && submitter.status === 'submitted') {
      affected.push({ id: submitterId, name: submitter.nickname });
    }
  });
  let msg = `${nickname}님을 참여 X로 변경하시겠습니까?`;
  if (affected.length > 0) msg += `\n\n⚠️ ${nickname}님을 지망으로 선택한 제출자:\n${affected.map(a => a.name).join(', ')}\n\n이 분들의 제출이 취소됩니다.`;
  if (!confirm(msg)) return;
  const batch = db.batch();
  batch.update(db.collection('users').doc(uid), { isParticipating: false });
  affected.forEach(a => batch.update(db.collection('users').doc(a.id), { status: 'waiting' }));
  batch.commit().then(() => alert("변경 완료!"));
};

window.emergencyAddUser = function(selectId) {
  const uid = document.getElementById(selectId).value;
  if (!uid) return alert("추가할 회원을 선택하세요.");
  const nickname = adminUsersData[uid]?.nickname || '해당 유저';
  if (!confirm(`${nickname}님을 긴급 추가하시겠습니까?\n\n패널티: 다른 참여자 카드에는 노출되지 않고, 본인만 지망을 제출할 수 있습니다.`)) return;
  db.collection('users').doc(uid).update({
    isParticipating: true, isProfileConfirmed: true, status: 'waiting', emergencyAdded: true
  }).then(() => alert(`${nickname}님이 긴급 추가되었습니다.`));
};

document.getElementById('apply-toggles-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({
    showPref2: document.getElementById('toggle-pref2').checked,
    showPref3: document.getElementById('toggle-pref3').checked,
    showDispref: document.getElementById('toggle-dispref').checked
  }, { merge: true }).then(() => alert("옵션이 유저 화면에 반영되었습니다."));
});

document.getElementById('admin-profile-check-start-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({ isProfileCheckActive: true }, { merge: true })
    .then(() => alert("프로필 점검 기간이 시작되었습니다!"));
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

// 자동 매칭 제안 (1:1)
document.getElementById('start-auto-match-btn').addEventListener('click', () => {
  const unassigned = Object.values(adminUsersData).filter(
    u => u.status === 'submitted' && u.isParticipating !== false && !u.isAdmin && !u.emergencyAdded && !(requestsData[u.id]?.isDraft)
  );

  function pairScore(aId, bId) {
    const aHistory = adminUsersData[aId]?.matchHistory || [];
    const bHistory = adminUsersData[bId]?.matchHistory || [];
    if (aHistory.includes(bId) || bHistory.includes(aId)) return -1;
    return getRankScore(requestsData[aId], bId) + getRankScore(requestsData[bId], aId);
  }

  // 모든 쌍 점수 계산 후 내림차순 정렬 → 높은 점수 쌍부터 그리디 배정
  const allPairs = [];
  for (let i = 0; i < unassigned.length; i++)
    for (let j = i + 1; j < unassigned.length; j++)
      allPairs.push({ A: unassigned[i], B: unassigned[j], score: pairScore(unassigned[i].id, unassigned[j].id) });
  allPairs.sort((a, b) => b.score - a.score);

  proposedQueue = [];
  const assigned = new Set();
  for (const pair of allPairs) {
    if (!assigned.has(pair.A.id) && !assigned.has(pair.B.id)) {
      proposedQueue.push({ A: pair.A, B: pair.B });
      assigned.add(pair.A.id);
      assigned.add(pair.B.id);
    }
  }
  if (proposedQueue.length === 0) return alert("구성 가능한 매칭이 없습니다.");
  showNextProposal();
});

let currentProposal = null;
function showNextProposal() {
  if (proposedQueue.length === 0) {
    document.getElementById('sim-result-box').style.display = 'none';
    return alert("제안된 모든 매칭 검토가 끝났습니다.");
  }
  currentProposal = proposedQueue.shift();
  const { A, B } = currentProposal;

  document.getElementById('sim-result-box').style.display = 'block';
  document.getElementById('sim-team-members').innerHTML = [A, B].map(u =>
    `<div style="background:white; padding:8px 12px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.06); text-align:center; min-width:70px;">
      <div style="font-size:2rem;">${u.emoji||'👩'}</div>
      <div style="font-weight:800; font-size:0.85rem;">${u.nickname}</div>
      <div style="font-size:0.72rem; color:#888;">${u.birthYear % 100}년생 · ${u.city}</div>
    </div>`
  ).join('<div style="font-size:2rem; color:var(--soft-rose);">💘</div>');

  const rankA = getRank(requestsData[A.id], B.id);
  const rankB = getRank(requestsData[B.id], A.id);
  const scoreA = getRankScore(requestsData[A.id], B.id);
  const scoreB = getRankScore(requestsData[B.id], A.id);
  const infoLines = [
    `${A.nickname} → ${B.nickname}: <b>${rankA || '미선택'}</b>`,
    `${B.nickname} → ${A.nickname}: <b>${rankB || '미선택'}</b>`,
    `매칭 점수: <b>${scoreA + scoreB}점</b> / 6점`
  ];

  const warnings = [];
  if ((A.matchHistory||[]).includes(B.id) || (B.matchHistory||[]).includes(A.id))
    warnings.push('🔁 이전 회차 매칭 이력 있음');
  if (requestsData[A.id]?.dispref1 === B.id) warnings.push(`🚨 ${A.nickname}이 ${B.nickname}을 비선호로 선택`);
  if (requestsData[B.id]?.dispref1 === A.id) warnings.push(`🚨 ${B.nickname}이 ${A.nickname}을 비선호로 선택`);
  const specDiff = Math.abs((A.personalityScore||50) - (B.personalityScore||50));
  if (specDiff > 50) warnings.push(`⚠️ 성향 스펙트럼 차이 큼 (${specDiff}점)`);

  if (warnings.length) { infoLines.push(''); warnings.forEach(w => infoLines.push(w)); }
  document.getElementById('sim-match-info').innerHTML = infoLines.join('<br>');
  document.getElementById('sim-warning-msg').innerHTML = warnings.length
    ? `<span style="color:#e74c3c;">${warnings[0]}</span>`
    : '<span style="color:#27ae60;">✅ 이슈 없음</span>';
}

document.getElementById('confirm-match-btn').addEventListener('click', () => {
  const { A, B } = currentProposal;
  const batch = db.batch();
  batch.update(db.collection('users').doc(A.id), { status: 'matched', partnerId: B.id });
  batch.update(db.collection('users').doc(B.id), { status: 'matched', partnerId: A.id });
  batch.commit().then(() => { loadAdminData(); showNextProposal(); });
});
document.getElementById('hold-match-btn').addEventListener('click', () => {
  const { A, B } = currentProposal;
  const batch = db.batch();
  batch.update(db.collection('users').doc(A.id), { status: 'held' });
  batch.update(db.collection('users').doc(B.id), { status: 'held' });
  batch.commit().then(() => showNextProposal());
});
document.getElementById('reset-held-btn').addEventListener('click', () => {
  db.collection('users').where('status', '==', 'held').get().then(snap => {
    if (snap.empty) return alert("보류 중인 유저가 없습니다.");
    const names = [];
    snap.forEach(doc => { db.collection('users').doc(doc.id).update({ status: 'submitted' }); names.push(doc.data().nickname); });
    alert(`${names.join(', ')}님이 자동 제안 대상으로 복구되었습니다.\n"매칭 제안 받기 시작"을 다시 눌러주세요.`);
  });
});
// ── 단계별 초기화 버튼 ──
document.getElementById('reset-step0-btn').addEventListener('click', () => {
  if (!confirm("⚠️ 프로필 점검 기간을 비활성화하고\n모든 사용자의 점검 완료 상태를 초기화합니까?")) return;
  db.collection('users').get().then(snap => {
    const batch = db.batch();
    snap.forEach(doc => { if (!doc.data().isAdmin) batch.update(doc.ref, { isProfileConfirmed: false }); });
    batch.commit();
  });
  db.collection('settings').doc('global').update({ isProfileCheckActive: false })
    .then(() => alert("프로필 점검 기간이 초기화되었습니다."));
});

document.getElementById('reset-step1-btn').addEventListener('click', () => {
  if (!confirm("⚠️ 매칭을 중단하고 모든 제출 상태를 초기화합니까?\n(지망 내역은 유지됩니다)")) return;
  db.collection('users').where('status', '==', 'submitted').get().then(snap => {
    const batch = db.batch();
    snap.forEach(doc => batch.update(doc.ref, { status: 'waiting' }));
    batch.commit();
  });
  db.collection('settings').doc('global').update({ isMatchingActive: false })
    .then(() => alert("매칭 진행이 초기화되었습니다."));
});

document.getElementById('reset-step2-btn').addEventListener('click', () => {
  if (!confirm("⚠️ 확정된 모든 매칭을 취소합니까?\n(매칭된 사용자가 submitted 상태로 돌아갑니다)")) return;
  db.collection('users').where('status', '==', 'matched').get().then(snap => {
    const batch = db.batch();
    snap.forEach(doc => batch.update(doc.ref, { status: 'submitted', partnerId: null }));
    batch.commit().then(() => alert("모든 매칭 확정이 취소되었습니다."));
  });
});

document.getElementById('reset-step3-btn').addEventListener('click', () => {
  if (!confirm("⚠️ 결과 발표를 취소합니까?\n사용자 화면에서 결과가 사라집니다.")) return;
  db.collection('settings').doc('global').update({ resultsPublished: false })
    .then(() => alert("결과 발표가 취소되었습니다."));
});

document.getElementById('reset-all-btn').addEventListener('click', () => {
  if (confirm("정말 모든 유저를 초기화합니까?\n이 작업은 되돌릴 수 없습니다.")) {
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
  if (confirm(`${warn}전체 매칭 결과를 발표합니다!`))
    db.collection('settings').doc('global').update({ resultsPublished: true }).then(() => goToAdminStep(3));
});
document.getElementById('apply-settings-btn').addEventListener('click', () => {
  const tickerMessage = document.getElementById('ticker-input').value.trim();
  const matchTitle = document.getElementById('match-title-input').value.trim();
  const adminKakaoLink = document.getElementById('admin-kakao-link-input').value.trim();
  db.collection('settings').doc('global').set({ tickerMessage, matchTitle, adminKakaoLink }, { merge: true })
    .then(() => alert("설정이 적용되었습니다."));
});
document.getElementById('manual-match-btn').addEventListener('click', () => {
  const aId = document.getElementById('manual-a-user').value;
  const bId = document.getElementById('manual-b-user').value;
  if (!aId || !bId || aId === bId) return alert("서로 다른 유저 2명을 선택하세요.");
  const aName = adminUsersData[aId]?.nickname; const bName = adminUsersData[bId]?.nickname;
  if (!confirm(`${aName} 💘 ${bName}\n위 두 분을 수동으로 매칭하시겠습니까?`)) return;
  const batch = db.batch();
  batch.update(db.collection('users').doc(aId), { status: 'matched', partnerId: bId });
  batch.update(db.collection('users').doc(bId), { status: 'matched', partnerId: aId });
  batch.commit().then(() => { alert("수동 매칭 완료!"); loadAdminData(); });
});

// 수동 매칭 AI 분석
function updateManualMatchPreview() {
  const aId = document.getElementById('manual-a-user').value;
  const bId = document.getElementById('manual-b-user').value;
  const preview = document.getElementById('manual-match-preview');
  if (!aId || !bId || aId === bId || !adminUsersData[aId] || !adminUsersData[bId]) {
    preview.style.display = 'none'; return;
  }
  const A = adminUsersData[aId]; const B = adminUsersData[bId];
  const reqA = requestsData[aId] || {}; const reqB = requestsData[bId] || {};

  document.getElementById('manual-card-a-emoji').innerText = A.emoji || '👤';
  document.getElementById('manual-card-a-name').innerText = A.nickname;
  document.getElementById('manual-card-a-info').innerText = `${A.birthYear % 100}년생 · ${A.city}`;
  document.getElementById('manual-card-a-spec').innerText = getScoreLabel(A.personalityScore || 50);
  document.getElementById('manual-card-b-emoji').innerText = B.emoji || '👤';
  document.getElementById('manual-card-b-name').innerText = B.nickname;
  document.getElementById('manual-card-b-info').innerText = `${B.birthYear % 100}년생 · ${B.city}`;
  document.getElementById('manual-card-b-spec').innerText = getScoreLabel(B.personalityScore || 50);

  const rankA = getRank(reqA, bId); const rankB = getRank(reqB, aId);
  const scoreA = getRankScore(reqA, bId); const scoreB = getRankScore(reqB, aId);
  const totalScore = scoreA + scoreB;
  const disA = reqA.dispref1 === bId; const disB = reqB.dispref1 === aId;
  const specDiff = Math.abs((A.personalityScore || 50) - (B.personalityScore || 50));
  const hasHistory = (A.matchHistory || []).includes(bId) || (B.matchHistory || []).includes(aId);

  const lines = [
    `${A.nickname} → ${B.nickname}: <b style="color:var(--soft-rose)">${rankA || '미선택'}</b>`,
    `${B.nickname} → ${A.nickname}: <b style="color:var(--soft-rose)">${rankB || '미선택'}</b>`,
    `매칭 점수: <b>${totalScore}점 / 6점</b>`,
    `성향 차이: <b>${specDiff}점</b> (${getScoreLabel(A.personalityScore || 50)} ↔ ${getScoreLabel(B.personalityScore || 50)})`,
  ];
  if (rankA && rankB) lines.push(`💑 <b>서로 지목한 사이입니다!</b>`);
  if (disA) lines.push(`🚨 <b style="color:#e74c3c">${A.nickname}이 ${B.nickname}을 비선호로 선택</b>`);
  if (disB) lines.push(`🚨 <b style="color:#e74c3c">${B.nickname}이 ${A.nickname}을 비선호로 선택</b>`);
  if (hasHistory) lines.push(`🔁 <b style="color:#e67e22">이전 회차 매칭 이력 있음</b>`);
  document.getElementById('manual-match-info').innerHTML = lines.join('<br>');

  // AI 종합 판단
  let verdict = ''; let verdictBg = '';
  if ((disA || disB)) { verdict = '⛔ 비선호 의사가 있어 매칭 시 주의가 필요합니다.'; verdictBg = '#fdf0f0'; }
  else if (hasHistory) { verdict = '🔁 이전 회차 매칭 이력이 있어 신중한 판단이 필요합니다.'; verdictBg = '#fff8e1'; }
  else if (totalScore >= 5 && rankA && rankB) { verdict = '🌟 최고의 매칭! 서로 높은 지망으로 선택한 강력 추천 커플입니다.'; verdictBg = '#e8f8f0'; }
  else if (totalScore >= 4) { verdict = '💚 좋은 매칭. 서로 긍정적인 인상을 갖고 있습니다.'; verdictBg = '#e8f8f0'; }
  else if (rankA && rankB) { verdict = '💑 서로 선택한 사이입니다. 매칭을 고려해보세요.'; verdictBg = '#fff0f5'; }
  else if (totalScore === 0) { verdict = '❓ 서로 선택하지 않은 사이입니다. 진행자 판단이 필요합니다.'; verdictBg = '#f5f5f5'; }
  else { verdict = `⚠️ 한쪽만 선택한 사이입니다. (점수 ${totalScore}/6점)`; verdictBg = '#fff8e1'; }

  const verdictEl = document.getElementById('manual-match-verdict');
  verdictEl.innerText = verdict; verdictEl.style.background = verdictBg;

  preview.style.display = 'block';
}

document.getElementById('manual-a-user').addEventListener('change', updateManualMatchPreview);
document.getElementById('manual-b-user').addEventListener('change', updateManualMatchPreview);
