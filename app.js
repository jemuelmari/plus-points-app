import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// I-paste ang Firebase Config mo dito
const firebaseConfig = {
  apiKey: "AIzaSyD-o6OSRYCFpHiUQGg669hHrf-bmDP1-tI",
  authDomain: "plus-points-app.firebaseapp.com",
  projectId: "plus-points-app",
  storageBucket: "plus-points-app.firebasestorage.app",
  messagingSenderId: "943293465754",
  appId: "1:943293465754:web:0db25176296345f7a04b23"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let fileBase64 = "";

const ITEMS = {
  sack: { name: '1 Sack', points: 1 }, detergent: { name: '3 Detergent Powders', points: 2 },
  basahan: { name: '1 Rag (Basahan)', points: 1 }, galon: { name: '1 Gallon (5L)', points: 2 },
  vegetable_plant: { name: 'Vegetable Plant', points: 5 }, medicinal_plant: { name: 'Medicinal Plant', points: 5 },
  pail: { name: 'Small Black Pail', points: 5 }, parent_meeting: { name: 'Parent Attended Meeting', points: 5 },
  fb_react: { name: 'Reacted on FB Post', points: 1 }, fb_share: { name: 'Shared FB Post', points: 1 },
  black_soil: { name: '1 Sack Black Soil', points: 5 }
};

document.addEventListener('DOMContentLoaded', () => { checkSession(); buildItemsList(); });

function showView(viewId) { document.querySelectorAll('.view').forEach(v => v.classList.remove('active')); document.getElementById(viewId).classList.add('active'); }

// LOGIN
async function loginUser() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const btn = document.getElementById('login-btn'); const err = document.getElementById('login-error');
  if (!user || !pass) { err.textContent = "Please enter username and password."; return; }
  btn.textContent = "Logging in..."; btn.disabled = true; err.textContent = "";

  try {
    const docRef = doc(db, "users", user);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // NOTE: Sa totoong app, dapat may encryption. Pero para sa offline-first, ito muna.
      if (data.password === pass) {
        currentUser = { lrn: user, ...data };
        localStorage.setItem('plusPointsUser', JSON.stringify(currentUser));
        if (data.role === 'student') { showView('student-page'); document.getElementById('student-name').textContent = data.name; loadStudentData(); }
        else if (data.role === 'teacher') { showView('teacher-page'); document.getElementById('teacher-name').textContent = data.name; loadTeacherData(); }
      } else {
        err.textContent = "Mali ang password.";
      }
    } else {
      err.textContent = "Hindi mahanap ang account.";
    }
  } catch (e) {
    err.textContent = "Network error. Check internet.";
  }
  btn.textContent = "Log In"; btn.disabled = false;
}

// REGISTRATION
async function registerUser() {
  const role = document.getElementById('reg-role').value;
  const lrn = document.getElementById('reg-lrn').value.trim(); const ln = document.getElementById('reg-lastname').value.trim();
  const fn = document.getElementById('reg-firstname').value.trim(); const mn = document.getElementById('reg-middlename').value.trim();
  const pw = document.getElementById('reg-password').value; const btn = document.getElementById('register-btn'); const status = document.getElementById('register-status');
  if (!lrn || !ln || !fn || !pw) { status.textContent = "Fill required fields."; status.style.color = "var(--danger)"; return; }
  btn.textContent = "Registering..."; btn.disabled = true; status.textContent = "";

  try {
    const docRef = doc(db, "users", lrn);
    await setDoc(docRef, {
      role: role, lastName: ln, firstName: fn, middleName: mn, password: pw,
      name: `${ln}, ${fn} ${mn}`.trim()
    });
    status.textContent = "Created! You can log in."; status.style.color = "var(--success)";
    document.getElementById('username').value = lrn; document.getElementById('password').value = pw;
    setTimeout(() => { closeRegisterModal(); }, 2000);
  } catch (e) {
    status.textContent = "Error: " + e.message; status.style.color = "var(--danger)";
  }
  btn.textContent = "Register"; btn.disabled = false;
}

// ... (Ang iba pang function na loadStudentData, submitItems, atbp. ay nasa ibaba)
