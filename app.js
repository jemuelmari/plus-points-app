import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

// Firebase Configuration (Nakuha mula sa iyong console)
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

// ================= LOGIN =================
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
      if (data.password === pass) {
        currentUser = { lrn: user, ...data };
        localStorage.setItem('plusPointsUser', JSON.stringify(currentUser));
        if (data.role === 'student') { 
          showView('student-page'); 
          document.getElementById('student-name').textContent = data.name; 
          loadStudentData(); 
        } else { 
          showView('teacher-page'); 
          document.getElementById('teacher-name').textContent = data.name; 
          loadTeacherData(); 
        }
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

function logout() { localStorage.removeItem('plusPointsUser'); currentUser = null; showView('login-page'); }

function checkSession() {
  const saved = localStorage.getItem('plusPointsUser');
  if (saved) {
    currentUser = JSON.parse(saved);
    if (currentUser.role === 'student') { 
      showView('student-page'); 
      document.getElementById('student-name').textContent = currentUser.name; 
      loadStudentData(); 
    } else { 
      showView('teacher-page'); 
      document.getElementById('teacher-name').textContent = currentUser.name; 
      loadTeacherData(); 
    }
  }
}

// ================= REGISTRATION =================
function openRegisterModal() {
  ['reg-lrn', 'reg-lastname', 'reg-firstname', 'reg-middlename', 'reg-password'].forEach(id => document.getElementById(id).value = "");
  document.getElementById('reg-role').value = "student";
  document.getElementById('register-modal').classList.add('active');
}
function closeRegisterModal() { document.getElementById('register-modal').classList.remove('active'); document.getElementById('register-status').textContent = ""; }

async function registerUser() {
  const role = document.getElementById('reg-role').value;
  const lrn = document.getElementById('reg-lrn').value.trim(); const ln = document.getElementById('reg-lastname').value.trim();
  const fn = document.getElementById('reg-firstname').value.trim(); const mn = document.getElementById('reg-middlename').value.trim();
  const pw = document.getElementById('reg-password').value; const btn = document.getElementById('register-btn'); const status = document.getElementById('register-status');
  if (!lrn || !ln || !fn || !pw) { status.textContent = "Fill required fields."; status.style.color = "var(--danger)"; return; }
  
  btn.textContent = "Registering..."; btn.disabled = true; status.textContent = "";

  try {
    const docRef = doc(db, "users", lrn);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      status.textContent = "LRN/ID is already registered."; status.style.color = "var(--danger)";
    } else {
      await setDoc(docRef, {
        role: role, lastName: ln, firstName: fn, middleName: mn, password: pw,
        name: `${ln}, ${fn} ${mn}`.trim()
      });
      status.textContent = "Created! You can log in."; status.style.color = "var(--success)";
      document.getElementById('username').value = lrn; document.getElementById('password').value = pw;
      setTimeout(() => { closeRegisterModal(); }, 2000);
    }
  } catch (e) {
    status.textContent = "Error: " + e.message; status.style.color = "var(--danger)";
  }
  btn.textContent = "Register"; btn.disabled = false;
}

// ================= RESET PASSWORD =================
function openResetModal() {
  document.getElementById('reset-username').value = ""; document.getElementById('reset-newpassword').value = "";
  document.getElementById('reset-modal').classList.add('active');
}
function closeResetModal() { document.getElementById('reset-modal').classList.remove('active'); document.getElementById('reset-status').textContent = ""; }

async function resetPassword() {
  const user = document.getElementById('reset-username').value.trim(); const pw = document.getElementById('reset-newpassword').value;
  const btn = document.getElementById('reset-btn'); const status = document.getElementById('reset-status');
  if (!user || !pw) { status.textContent = "Fill all fields."; status.style.color = "var(--danger)"; return; }
  
  btn.textContent = "Resetting..."; btn.disabled = true; status.textContent = "";
  
  try {
    const docRef = doc(db, "users", user);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      await setDoc(docRef, { password: pw }, { merge: true });
      status.textContent = "Password reset!"; status.style.color = "var(--success)";
      document.getElementById('username').value = user; document.getElementById('password').value = pw;
      setTimeout(() => { closeResetModal(); }, 2000);
    } else {
      status.textContent = "Account not found."; status.style.color = "var(--danger)";
    }
  } catch (e) {
    status.textContent = "Error: " + e.message; status.style.color = "var(--danger)";
  }
  btn.textContent = "Reset"; btn.disabled = false;
}

// ================= EDIT PROFILE =================
function openProfileModal() {
  document.getElementById('edit-lastname').value = currentUser.lastName || "";
  document.getElementById('edit-firstname').value = currentUser.firstName || "";
  document.getElementById('edit-middlename').value = currentUser.middleName || "";
  document.getElementById('edit-password').value = "";
  document.getElementById('profile-modal').classList.add('active');
}
function closeProfileModal() { document.getElementById('profile-modal').classList.remove('active'); document.getElementById('profile-status').textContent = ""; }

async function saveProfile() {
  const ln = document.getElementById('edit-lastname').value.trim();
  const fn = document.getElementById('edit-firstname').value.trim();
  const mn = document.getElementById('edit-middlename').value.trim();
  const pw = document.getElementById('edit-password').value;
  const btn = document.getElementById('save-profile-btn'); const status = document.getElementById('profile-status');
  if (!fn || !ln) { status.textContent = "First and Last Name required."; status.style.color = "var(--danger)"; return; }
  
  btn.textContent = "Saving..."; btn.disabled = true; status.textContent = "";
  
  try {
    const docRef = doc(db, "users", currentUser.lrn);
    const updateData = { lastName: ln, firstName: fn, middleName: mn, name: `${ln}, ${fn} ${mn}`.trim() };
    if (pw && pw.trim() !== "") updateData.password = pw;
    
    await setDoc(docRef, updateData, { merge: true });
    
    currentUser.lastName = ln; currentUser.firstName = fn; currentUser.middleName = mn; currentUser.name = updateData.name;
    localStorage.setItem('plusPointsUser', JSON.stringify(currentUser));
    if (currentUser.role === 'student') document.getElementById('student-name').textContent = currentUser.name;
    else document.getElementById('teacher-name').textContent = currentUser.name;
    
    status.textContent = "Updated!"; status.style.color = "var(--success)";
    setTimeout(() => { closeProfileModal(); }, 1500);
  } catch (e) {
    status.textContent = "Error: " + e.message; status.style.color = "var(--danger)";
  }
  btn.textContent = "Save"; btn.disabled = false;
}

// ================= STUDENT LOGIC =================
function buildItemsList() {
  let html = '';
  for (const [key, item] of Object.entries(ITEMS)) {
    html += `<div class="item-row"><div class="item-info"><span class="item-name">${item.name}</span><span class="item-points">${item.points} sticker/s</span></div>
    <div class="qty-controls"><button class="qty-btn" onclick="updateQty('${key}', -1)">-</button><input type="text" class="qty-input" id="qty-${key}" value="0" readonly><button class="qty-btn" onclick="updateQty('${key}', 1)">+</button></div></div>`;
  }
  document.getElementById('items-list').innerHTML = html;
}

function updateQty(key, change) {
  const input = document.getElementById(`qty-${key}`); let val = parseInt(input.value) || 0;
  val += change; if (val < 0) val = 0; input.value = val;
}

async function loadStudentData() {
  const term = document.getElementById('student-term-select').value;
  let stickers = 0;
  
  try {
    const q = query(collection(db, "records"), where("lrn", "==", currentUser.lrn), where("term", "==", term));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      stickers += (data.quantity * (ITEMS[data.itemKey]?.points || 0));
    });
    document.getElementById('student-stickers').textContent = stickers;
    document.getElementById('student-points').textContent = Math.floor(stickers / 5);
  } catch (e) {
    console.log("Error loading data (baka offline):", e);
  }
}

document.getElementById('evidence-photo').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('file-name').textContent = "Compressing...";
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas'); const MAX_WIDTH = 800; const scaleSize = MAX_WIDTH / img.width;
        if (scaleSize < 1) { canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; } else { canvas.width = img.width; canvas.height = img.height; }
        const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        fileBase64 = canvas.toDataURL('image/jpeg', 0.7);
        document.getElementById('file-name').textContent = file.name + " (Ready)";
      }; img.src = event.target.result;
    }; reader.readAsDataURL(file);
  }
});

async function submitItems() {
  const term = document.getElementById('student-term-select').value; const itemsToSave = [];
  for (const key in ITEMS) { const qty = parseInt(document.getElementById(`qty-${key}`).value) || 0; if (qty > 0) itemsToSave.push({ key, qty }); }
  if (itemsToSave.length === 0) return showStatus("Select at least one item.", "red");
  
  const btn = document.getElementById('submit-btn'); btn.textContent = "Submitting..."; btn.disabled = true;
  
  try {
    let evidenceUrl = "";
    if (fileBase64) {
      btn.textContent = "Uploading Photo...";
      const blob = await (await fetch(fileBase64)).blob();
      const fileName = `${currentUser.lrn}_${Date.now()}.jpg`;
      const storageRef = ref(storage, 'evidence/' + fileName);
      await uploadBytes(storageRef, blob);
      evidenceUrl = await getDownloadURL(storageRef);
    }

    btn.textContent = "Saving Records...";
    for (const item of itemsToSave) {
      // Gumawa ng unique ID para sa record
      const recordId = `${currentUser.lrn}_${item.key}_${term}_${Date.now()}`;
      await setDoc(doc(db, "records", recordId), {
        lrn: currentUser.lrn,
        studentName: currentUser.name,
        itemKey: item.key,
        quantity: item.qty,
        evidenceUrl: evidenceUrl,
        term: term,
        timestamp: new Date().toISOString()
      });
    }

    showStatus("Successfully submitted!", "green");
    for (const key in ITEMS) document.getElementById(`qty-${key}`).value = "0";
    document.getElementById('evidence-photo').value = ""; document.getElementById('file-name').textContent = "No file selected"; fileBase64 = "";
    loadStudentData();
    
  } catch (e) {
    showStatus("Error submitting. Check internet.", "red");
    console.error(e);
  }
  btn.textContent = "Submit Items"; btn.disabled = false;
}

function showStatus(msg, color) {
  const el = document.getElementById('submit-status'); el.textContent = msg;
  el.style.color = color === "green" ? "var(--success)" : "var(--danger)";
  setTimeout(() => { el.textContent = ""; }, 4000);
}

// ================= TEACHER LOGIC =================
async function loadTeacherData() {
  const container = document.getElementById('teacher-records-list'); const term = document.getElementById('teacher-term-select').value;
  container.innerHTML = "<p style='text-align:center;'>Loading...</p>";
  
  try {
    // Kunin lahat ng records sa term na iyon
    const q = query(collection(db, "records"), where("term", "==", term));
    const querySnapshot = await getDocs(q);
    
    // I-group by student
    const studentsData = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (!studentsData[data.lrn]) {
        studentsData[data.lrn] = { name: data.studentName, lrn: data.lrn, stickers: 0 };
      }
      studentsData[data.lrn].stickers += (data.quantity * (ITEMS[data.itemKey]?.points || 0));
    });

    let html = '';
    for (const lrn in studentsData) {
      const st = studentsData[lrn];
      html += `<div class="record-item"><div class="record-name">${st.name} (${st.lrn})</div>
               <div class="record-details">Stickers: <strong>${st.stickers}</strong> | Points: <strong>${Math.floor(st.stickers / 5)}</strong></div></div>`;
    }
    
    container.innerHTML = html || "<p style='text-align:center;'>No records found yet.</p>";
    
  } catch (e) {
    container.innerHTML = "<p style='text-align:center; color:red;'>Error loading data.</p>";
  }
}
