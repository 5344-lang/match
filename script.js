// 1. Firebase 콘솔에서 복사한 내 프로젝트 설정값 붙여넣기
const firebaseConfig = {
  apiKey: "AIzaSyDq-6FWN8J2Zup475x0F9665aTfeGT6O08",
  authDomain: "matching-app-2bca2.firebaseapp.com",
  projectId: "matching-app-2bca2",
  storageBucket: "matching-app-2bca2.firebasestorage.app",
  messagingSenderId: "1092047089858",
  appId: "1:1092047089858:web:8f925879d82a5f9e4b0b5b"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// 2. 화면 요소 가져오기
const authSection = document.getElementById('auth-section');
const profileSection = document.getElementById('profile-section');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');

// 성향 슬라이더 라벨링 로직
const slider = document.getElementById('personality-slider');
const spectrumLabel = document.getElementById('spectrum-label');

slider.addEventListener('input', function() {
  const val = parseInt(this.value);
  if (val <= 12) spectrumLabel.innerText = "완전 한글";
  else if (val <= 37) spectrumLabel.innerText = "한세글";
  else if (val <= 62) spectrumLabel.innerText = "세글";
  else if (val <= 87) spectrumLabel.innerText = "두세글";
  else spectrumLabel.innerText = "완전 두글";
});

// 3. 인증 상태 확인 (로그인 여부에 따라 화면 전환)
auth.onAuthStateChanged(user => {
  if (user) {
    authSection.style.display = 'none';
    profileSection.style.display = 'block';
    logoutBtn.style.display = 'block';
    // 여기에 Firestore에서 기존 정보 불러오는 로직 추가 가능
  } else {
    authSection.style.display = 'block';
    profileSection.style.display = 'none';
    logoutBtn.style.display = 'none';
  }
});

// 4. 회원가입 및 로그인 이벤트 (아이디 방식으로 변경)

signupBtn.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const password = document.getElementById('password').value;

  // 아이디나 비밀번호가 비어있는지 먼저 확인 (기본 매너!)
  if (!userid || !password) {
    alert("아이디와 비밀번호를 모두 입력해주세요.");
    return;
  }

  const fakeEmail = userid + "@roundtable.com"; 

  auth.createUserWithEmailAndPassword(fakeEmail, password)
    .then(userCredential => {
      alert("🎉 가입 성공! 이제 프로필을 설정해주세요.");
    })
    .catch(error => {
      // Firebase가 보내주는 에러 코드에 따라 다른 메시지 띄우기
      console.log("에러 코드:", error.code); // 궁금하면 개발자 도구(F12)에서 확인 가능해요!

      if (error.code === 'auth/email-already-in-use') {
        alert("❌ 이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.");
      } 
      else if (error.code === 'auth/weak-password') {
        alert("🔐 비밀번호가 너무 짧아요! 최소 6자리 이상으로 만들어주세요.");
      } 
      else if (error.code === 'auth/invalid-email') {
        alert("🚫 아이디에 사용할 수 없는 특수문자가 포함되어 있습니다.");
      } 
      else {
        alert("❓ 가입 중 알 수 없는 에러가 발생했습니다: " + error.message);
      }
    });
});

loginBtn.addEventListener('click', () => {
  const userid = document.getElementById('userid').value;
  const password = document.getElementById('password').value;
  
  // 로그인할 때도 똑같이 가짜 이메일 주소로 변환해서 확인
  const fakeEmail = userid + "@roundtable.com"; 

  auth.signInWithEmailAndPassword(fakeEmail, password)
    .catch(error => alert("로그인 실패: 아이디나 비밀번호를 확인해주세요."));
});

// 5. 프로필 저장 (Firestore에 기록)
document.getElementById('profile-form').addEventListener('submit', function(e) {
  e.preventDefault(); // 페이지 새로고침 방지
  const user = auth.currentUser;
  
  if (user) {
    const profileData = {
      nickname: document.getElementById('nickname').value,
      birthYear: document.getElementById('birthYear').value,
      city: document.getElementById('city').value,
      personalityScore: parseInt(slider.value),
      intro: document.getElementById('intro').value,
      isParticipating: document.getElementById('isParticipating').checked,
      status: 'active', // 기본 상태
      isAdmin: false // 기본 권한
    };

    db.collection('users').doc(user.uid).set(profileData, { merge: true })
      .then(() => alert("프로필이 저장되었습니다! 대기실로 이동합니다."))
      .catch(error => console.error("Error writing document: ", error));
  }
});