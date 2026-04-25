// 1. Firebase Config (콘솔에서 복사한 본인 설정으로 꼭 교체하세요!)
const firebaseConfig = {
  apiKey: "AIzaSyDq-6FWN8J2Zup475x0F9665aTfeGT6O08",
  authDomain: "matching-app-2bca2.firebaseapp.com",
  projectId: "matching-app-2bca2",
  storageBucket: "matching-app-2bca2.firebasestorage.app",
  messagingSenderId: "1092047089858",
  appId: "1:1092047089858:web:8f925879d82a5f9e4b0b5b"
};

// 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 화면 요소
const sections = {
  auth: document.getElementById('auth-section'),
  profile: document.getElementById('profile-section'),
  waitroom: document.getElementById('waitroom-section'),
  admin: document.getElementById('admin-section')
};
const btns = {
  login: document.getElementById('login-btn'),
  signup: document.getElementById('signup-btn'),
  logout: document.getElementById('logout-btn'),
  adminLink: document.getElementById('admin-link-btn')
};

function showSection(sectionName) {
  Object.values(sections).forEach(sec => sec.style.display = 'none');
  sections[sectionName].style.display = 'block';
}

// 🌟 사진 파일명 표시
document.getElementById('photo').addEventListener('change', function(e) {
  const display = document.getElementById('file-name');
  if (e.target.files.length > 0) {
    display.innerText = e.target.files.name;
    display.style.color = "#777"; 
  } else {
    display.innerText = "파일 선택 안 됨";
  }
});

// 🌟 스펙트럼 다이내믹 그라데이션 (연한 핑크 -> 핫핑크)
const slider = document.getElementById('personality-slider');
const spectrumLabel = document.getElementById('spectrum-label');

function updateSlider() {
  const val = slider.value;
  // 지나온 길은 그라데이션 핑크, 남은 길은 다크 네이비로 처리
  slider.style.background = `linear-gradient(to right, #FF9A9E 0%, #FD79A8 ${val}%, #1A2B3C ${val}%, #1A2B3C 100%)`;
  
  if (val <= 12) spectrumLabel.innerText = "완전 한글";
  else if (val <= 37) spectrumLabel.innerText = "한세글";
  else if (val <= 62) spectrumLabel.innerText = "세글";
  else if (val <= 87) spectrumLabel.innerText = "두세글";
  else spectrumLabel.innerText = "완전 두글";
}
slider.addEventListener('input', updateSlider);
updateSlider(); // 초기화

// 🌟 인증 상태 감시 & 관리자 체크
auth.onAuthStateChanged(user => {
  if (user) {
    btns.logout.style.display = 'block';
    
    // DB에서 유저 상태 확인 후 화면 결정
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.isAdmin) btns.adminLink.style.display = 'block';
        // 프로필이 이미 있으면 대기실로, 없으면 프로필 설정으로
        if (data.nickname) {
          showSection('waitroom');
          listenToGlobalSettings(); // 대기실 리스너 가동
        } else {
          showSection('profile');
        }
      } else {
        showSection('profile'); // 문서가 아예 없으면 프로필 설정
      }
    });
  } else {
    showSection('auth');
    btns.logout.style.display = 'none';
    btns.adminLink.style.display = 'none';
  }
});

// 관리자 버튼
btns.adminLink.addEventListener('click', () => showSection('admin'));

// 로그아웃
btns.logout.addEventListener('click', () => { auth.signOut(); location.reload(); });

// 🌟 회원가입 & 로그인
signupBtn.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const rawPassword = document.getElementById('password').value; // 실제 입력값

  if (rawPassword.length < 4) {
    alert("🔐 비밀번호는 최소 4자리 이상으로 설정해주세요!");
    return;
  }

  const fakeEmail = userid + "@roundtable.com"; 
  // 💡 4자리 뒤에 몰래 "round"를 붙여서 10자리로 만듦
  const paddedPassword = rawPassword + "round"; 

  auth.createUserWithEmailAndPassword(fakeEmail, paddedPassword)
    .then(() => alert("🎉 가입 성공!"))
    .catch(err => {
      if (err.code === 'auth/weak-password') alert("🔐 4자리 이상 입력해주세요.");
      else alert("에러: " + err.message);
    });
});

loginBtn.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const rawPassword = document.getElementById('password').value;
  
  const fakeEmail = userid + "@roundtable.com"; 
  // 💡 로그인할 때도 똑같이 뒤에 "round"을 붙여서 인증 요청
  const paddedPassword = rawPassword + "round"; 

  auth.signInWithEmailAndPassword(fakeEmail, paddedPassword)
    .catch(() => alert("로그인 실패: 아이디나 비밀번호를 확인해주세요."));
});

// 🌟 프로필 저장 (96년생 나이 제한 컷!)
document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  
  if (user) {
    let inputYear = parseInt(document.getElementById('birthYear').value);
    let fullYear = inputYear < 100 ? (inputYear > 24 ? 1900 + inputYear : 2000 + inputYear) : inputYear;

    if (fullYear < 1996) {
      alert("⚠️ 죄송합니다! 96년생(또는 그 이전 출생자)부터 참여 가능합니다.");
      return; 
    }

    const profileData = {
      nickname: document.getElementById('nickname').value,
      birthYear: fullYear,
      city: document.getElementById('city').value,
      personalityScore: parseInt(slider.value),
      intro: document.getElementById('intro').value,
      isParticipating: document.getElementById('isParticipating').checked,
      isAdmin: false
    };

    db.collection('users').doc(user.uid).set(profileData, { merge: true })
      .then(() => {
        alert("프로필 저장 완료! 대기실로 이동합니다.");
        showSection('waitroom');
        listenToGlobalSettings();
      })
      .catch(err => alert("저장 에러: " + err.message));
  }
});

// 🌟 대기실 실시간 상태 리스너 (관리자가 버튼 누르면 열림)
function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    
    if (data.isMatchingActive) {
      document.getElementById('room-status-title').innerText = "🔥 매칭 지망 선택 중!";
      document.getElementById('room-status-desc').innerText = "마음에 드는 상대를 신중하게 골라주세요.";
      document.getElementById('selection-area').style.display = 'block';
      
      // 관리자 옵션에 따라 칸 숨기기/보이기
      document.getElementById('pref-2-box').style.display = data.showPref2 ? 'block' : 'none';
      document.getElementById('pref-3-box').style.display = data.showPref3 ? 'block' : 'none';
      document.getElementById('dispref-1-box').style.display = data.showDispref ? 'block' : 'none';
      
      loadParticipants();
    } else {
      document.getElementById('room-status-title').innerText = "⏳ 매칭 대기 중...";
      document.getElementById('room-status-desc').innerText = "관리자가 매칭을 시작할 때까지 잠시 대기해주세요.";
      document.getElementById('selection-area').style.display = 'none';
    }
  });
}

// 대기실 참가자 명단 불러오기
function loadParticipants() {
  db.collection('users').where('isParticipating', '==', true).get().then(snapshot => {
    const selects = [document.getElementById('pref-1'), document.getElementById('pref-2'), document.getElementById('pref-3'), document.getElementById('dispref-1')];
    
    selects.forEach(select => {
      select.innerHTML = '<option value="">선택하세요</option>'; // 초기화
      snapshot.forEach(doc => {
        if (doc.id !== auth.currentUser.uid) { // 나 자신은 제외
          const user = doc.data();
          const opt = document.createElement('option');
          opt.value = doc.id;
          opt.innerText = `${user.nickname} (${user.birthYear % 100}년생 / ${user.city})`;
          select.appendChild(opt);
        }
      });
    });
  });
}

// 🌟 지망 제출하기
document.getElementById('submit-selection-btn').addEventListener('click', () => {
  const p1 = document.getElementById('pref-1').value;
  if (!p1) return alert("1지망은 필수로 선택해야 합니다!");

  const selectionData = {
    pref1: p1,
    pref2: document.getElementById('pref-2').value,
    pref3: document.getElementById('pref-3').value,
    dispref1: document.getElementById('dispref-1').value,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  };

  db.collection('requests').doc(auth.currentUser.uid).set(selectionData)
    .then(() => alert("지망 제출 완료! 결과를 기다려주세요."))
    .catch(err => alert("제출 실패: " + err.message));
});

// 🌟 [관리자 전용] 매칭 시작/종료 제어
document.getElementById('admin-start-btn').addEventListener('click', () => {
  updateGlobalSettings(true);
});
document.getElementById('admin-stop-btn').addEventListener('click', () => {
  updateGlobalSettings(false);
});

function updateGlobalSettings(isActive) {
  const settings = {
    isMatchingActive: isActive,
    showPref2: document.getElementById('toggle-pref2').checked,
    showPref3: document.getElementById('toggle-pref3').checked,
    showDispref: document.getElementById('toggle-dispref').checked
  };
  db.collection('settings').doc('global').set(settings, { merge: true })
    .then(() => alert(isActive ? "매칭을 시작했습니다. (유저들 선택 가능)" : "매칭을 종료했습니다."))
    .catch(err => alert("관리자 권한 오류: " + err.message));
}

// 🌟 [관리자 전용] 매칭 파국 시뮬레이터 (나이차 & 성향)
document.getElementById('sim-btn').addEventListener('click', () => {
  const scoreA = parseInt(document.getElementById('sim-score-a').value || 0);
  const yearA = parseInt(document.getElementById('sim-year-a').value || 0);
  const scoreB = parseInt(document.getElementById('sim-score-b').value || 0);
  const yearB = parseInt(document.getElementById('sim-year-b').value || 0);
  
  const resultBox = document.getElementById('sim-result');
  let resultHtml = "";

  // 1. 성향 계산
  const totalScore = scoreA + scoreB;
  if (totalScore <= 30) {
    resultHtml += `<p style="color:#e74c3c;">⚠️ 파국 경고: 너무 한글끼리 만났습니다!</p>`;
  } else if (totalScore >= 170) {
    resultHtml += `<p style="color:#e74c3c;">⚠️ 파국 경고: 너무 두글끼리 만났습니다!</p>`;
  } else if (totalScore >= 80 && totalScore <= 120) {
    resultHtml += `<p style="color:#27ae60;">✅ 찰떡 궁합! 완벽한 매칭입니다</p>`;
  } else {
    resultHtml += `<p>무난한 조합입니다. (합산 ${totalScore}점)</p>`;
  }

  // 2. 나이차 계산
  if (yearA > 0 && yearB > 0) {
    const ageDiff = Math.abs(yearA - yearB);
    if (ageDiff >= 5) {
      resultHtml += `<p style="color:#e67e22; margin-top:10px;">🚨 세대차이 경고: 나이차가 ${ageDiff}살 입니다.</p>`;
    } else {
      resultHtml += `<p style="color:#2980b9; margin-top:10px;">나이차: ${ageDiff}살 (적당함)</p>`;
    }
  }

  resultBox.innerHTML = resultHtml;
});
