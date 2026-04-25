// 1. Firebase Config
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

// 🌟 여기서 버튼 이름을 정해뒀는데 아래서 다르게 불러서 생긴 문제였습니다! (수정 완료)
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

// 🌟 스펙트럼 다이내믹 그라데이션
const slider = document.getElementById('personality-slider');
const spectrumLabel = document.getElementById('spectrum-label');

function updateSlider() {
  const val = slider.value;
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
    
    db.collection('users').doc(user.uid).get().then(doc => {
      if (doc.exists) {
        const data = doc.data();
        if (data.isAdmin) btns.adminLink.style.display = 'block';
        
        if (data.nickname) {
          showSection('waitroom');
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
    btns.logout.style.display = 'none';
    btns.adminLink.style.display = 'none';
  }
});

// 상단 헤더 버튼 이벤트
btns.adminLink.addEventListener('click', () => showSection('admin'));
btns.logout.addEventListener('click', () => { auth.signOut(); location.reload(); });

// 🌟 회원가입 로직 (에러 완벽 해결!)
btns.signup.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const rawPassword = document.getElementById('password').value; 

  if (!userid || !rawPassword) {
    alert("아이디와 비밀번호를 모두 입력해주세요.");
    return;
  }

  if (rawPassword.length < 4) {
    alert("🔐 비밀번호는 최소 4자리 이상으로 설정해주세요!");
    return;
  }

  const fakeEmail = userid + "@roundtable.com"; 
  const paddedPassword = rawPassword + "round"; 

  auth.createUserWithEmailAndPassword(fakeEmail, paddedPassword)
    .then(() => {
      alert("🎉 가입 성공! 프로필을 설정해주세요.");
      // 가입 성공 시 비밀번호 칸 비워주기
      document.getElementById('password').value = ""; 
    })
    .catch(err => {
      if (err.code === 'auth/email-already-in-use') alert("❌ 이미 존재하는 아이디입니다.");
      else alert("에러: " + err.message);
    });
});

// 🌟 로그인 로직 (에러 완벽 해결!)
btns.login.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const rawPassword = document.getElementById('password').value;
  
  if (!userid || !rawPassword) {
    alert("아이디와 비밀번호를 모두 입력해주세요.");
    return;
  }

  const fakeEmail = userid + "@roundtable.com"; 
  const paddedPassword = rawPassword + "round"; 

  auth.signInWithEmailAndPassword(fakeEmail, paddedPassword)
    .catch(() => alert("로그인 실패: 아이디나 비밀번호를 확인해주세요."));
});

// 🌟 프로필 저장 (96년생 나이 제한)
document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const user = auth.currentUser;
  
  if (user) {
    let inputYear = parseInt(document.getElementById('birthYear').value);
    let fullYear = inputYear < 100 ? (inputYear > 24 ? 1900 + inputYear : 2000 + inputYear) : inputYear;

    if (fullYear < 1996) {
      alert("⚠️ 죄송합니다! 96년생(또는 그 이후 출생자)부터 참여 가능합니다.");
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

// 🌟 대기실 실시간 상태 리스너
function listenToGlobalSettings() {
  db.collection('settings').doc('global').onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    
    if (data.isMatchingActive) {
      document.getElementById('room-status-title').innerText = "🔥 매칭 지망 선택 중!";
      document.getElementById('room-status-desc').innerText = "마음에 드는 상대를 신중하게 골라주세요.";
      document.getElementById('selection-area').style.display = 'block';
      
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
      select.innerHTML = '<option value="">선택하세요</option>'; 
      snapshot.forEach(doc => {
        if (doc.id !== auth.currentUser.uid) { 
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
  const settings = {
    isMatchingActive: true,
    showPref2: document.getElementById('toggle-pref2').checked,
    showPref3: document.getElementById('toggle-pref3').checked,
    showDispref: document.getElementById('toggle-dispref').checked
  };
  db.collection('settings').doc('global').set(settings, { merge: true })
    .then(() => alert("매칭을 시작했습니다. (유저들 선택 가능)"))
    .catch(err => alert("관리자 권한 오류: " + err.message));
});

document.getElementById('admin-stop-btn').addEventListener('click', () => {
  db.collection('settings').doc('global').set({ isMatchingActive: false }, { merge: true })
    .then(() => alert("매칭을 종료했습니다."))
    .catch(err => alert("관리자 권한 오류: " + err.message));
});
