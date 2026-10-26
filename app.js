const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzbsu4HKBDvSKDJZfSWtKUuHZ2jtB-W51w-Goyz2pczyH9qnBQdIyWBnOutnr-dZcVyuA/exec';

let currentUser = null;
let fileBase64 = "";

const ITEMS = {
  sack: { name: '1 Sack', points: 1 },
  detergent: { name: '3 Detergent Powders', points: 2 },
  basahan: { name: '1 Rag (Basahan)', points: 1 },
  galon: { name: '1 Gallon (5L)', points: 2 },
  vegetable_plant: { name: 'Vegetable Plant', points: 5 },
  medicinal_plant: { name: 'Medicinal Plant', points: 5 },
  pail: { name: 'Small Black Pail', points: 5 },
  parent_meeting: { name: 'Parent Attended Meeting', points: 5 },
  fb_react: { name: 'Reacted on FB Post', points: 1 },
  fb_share: { name: 'Shared FB Post', points: 1 },
  black_soil: { name: '1 Sack Black Soil', points: 5 }
};

document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  buildItemsList();
});

function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// LOGIN / LOGOUT
function loginUser() {
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');

  if (!user || !pass) {
    err.textContent = "Please enter username and password.";
    return;
  }

  btn.textContent = "Logging in...";
  btn.disabled = true;
  err.textContent = "";

  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'login', username: user, password: pass })
  })
  .then(res => res.json())
  .then(data => {
    btn.textContent = "Log In";
    btn.disabled = false;

    if (data.ok) {
      currentUser = data;
      localStorage.setItem('plusPointsUser', JSON.stringify(data));
      
      if (data.role === 'student') {
        showView('student-page');
        document.getElementById('student-name').textContent = data.name;
        loadStudentData(); 
      } else if (data.role === 'teacher') {
        showView('teacher-page');
        document.getElementById('teacher-name').textContent = data.name;
        loadTeacherData();
      }
    } else {
      err.textContent = data.error || "Login failed.";
    }
  })
  .catch(e => {
    btn.textContent = "Log In";
    btn.disabled = false;
    err.textContent = "Network error. Try again.";
  });
}

function logout() {
  localStorage.removeItem('plusPointsUser');
  currentUser = null;
  showView('login-page');
  document.getElementById('username').value = "";
  document.getElementById('password').value = "";
}

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

// STUDENT LOGIC
function buildItemsList() {
  const container = document.getElementById('items-list');
  let html = '';
  for (const [key, item] of Object.entries(ITEMS)) {
    html += `
      <div class="item-row">
        <div class="item-info">
          <span class="item-name">${item.name}</span>
          <span class="item-points">${item.points} sticker/s</span>
        </div>
        <div class="qty-controls">
          <button class="qty-btn" onclick="updateQty('${key}', -1)">-</button>
          <input type="text" class="qty-input" id="qty-${key}" value="0" readonly>
          <button class="qty-btn" onclick="updateQty('${key}', 1)">+</button>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function updateQty(key, change) {
  const input = document.getElementById(`qty-${key}`);
  let val = parseInt(input.value) || 0;
  val += change;
  if (val < 0) val = 0;
  input.value = val;
}

function loadStudentData() {
  if (!currentUser) return;
  const term = document.getElementById('student-term-select').value;
  
  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getSummary', lrn: currentUser.lrn, term: term })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      document.getElementById('student-stickers').textContent = data.totalStickers;
      document.getElementById('student-points').textContent = data.totalPoints;
    }
  });
}

// IMAGE UPLOAD HANDLER
document.getElementById('evidence-photo').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('file-name').textContent = "Compressing...";
    
    const reader = new FileReader();
    reader.onload = function(event) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        fileBase64 = canvas.toDataURL('image/jpeg', 0.7);
        document.getElementById('file-name').textContent = file.name + " (Ready)";
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// SUBMIT ITEMS (Student)
function submitItems() {
  if (!currentUser) return;
  const term = document.getElementById('student-term-select').value;
  
  const itemsToSave = [];
  for (const key in ITEMS) {
    const qty = parseInt(document.getElementById(`qty-${key}`).value) || 0;
    if (qty > 0) itemsToSave.push({ key: key, qty: qty });
  }

  if (itemsToSave.length === 0) {
    showStatus("Please select at least one item.", "red");
    return;
  }

  const btn = document.getElementById('submit-btn');
  btn.textContent = "Submitting...";
  btn.disabled = true;

  const processQueue = (index, evidenceUrl) => {
    if (index >= itemsToSave.length) {
      showStatus("Successfully submitted!", "green");
      btn.textContent = "Submit Items";
      btn.disabled = false;
      
      for (const key in ITEMS) document.getElementById(`qty-${key}`).value = "0";
      document.getElementById('evidence-photo').value = "";
      document.getElementById('file-name').textContent = "No file selected";
      fileBase64 = "";
      
      loadStudentData();
      return;
    }

    const item = itemsToSave[index];
    fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'saveRecord',
        lrn: currentUser.lrn,
        itemKey: item.key,
        quantity: item.qty,
        evidenceUrl: evidenceUrl,
        term: term 
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        processQueue(index + 1, evidenceUrl);
      } else {
        showStatus("Error saving record: " + data.error, "red");
        btn.textContent = "Submit Items";
        btn.disabled = false;
      }
    });
  };

  if (fileBase64) {
    btn.textContent = "Uploading photo...";
    fetch(BACKEND_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'uploadEvidence',
        lrn: currentUser.lrn,
        base64: fileBase64
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        btn.textContent = "Saving records...";
        processQueue(0, data.url);
      } else {
        showStatus("Image upload failed: " + data.error, "red");
        btn.textContent = "Submit Items";
        btn.disabled = false;
      }
    })
    .catch(err => {
      showStatus("Error uploading. Baka masyadong malaki ang photo.", "red");
      btn.textContent = "Submit Items";
      btn.disabled = false;
    });
  } else {
    btn.textContent = "Saving records...";
    processQueue(0, "");
  }
}

function showStatus(msg, color) {
  const el = document.getElementById('submit-status');
  el.textContent = msg;
  el.style.color = color === "green" ? "var(--success)" : "var(--danger)";
  setTimeout(() => { el.textContent = ""; }, 4000);
}

// PROFILE LOGIC
function openProfileModal() {
  if (!currentUser) return;
  
  const nameParts = currentUser.name.split(',');
  const lastName = nameParts[0] ? nameParts[0].trim() : "";
  const firstName = nameParts[1] ? nameParts[1].trim().split(' ')[0] : "";
  const middleName = nameParts[1] ? nameParts[1].trim().split(' ').slice(1).join(' ') : "";

  document.getElementById('edit-lastname').value = lastName;
  document.getElementById('edit-firstname').value = firstName;
  document.getElementById('edit-middlename').value = middleName;
  document.getElementById('edit-password').value = "";
  
  document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.remove('active');
  document.getElementById('profile-status').textContent = "";
}

function saveProfile() {
  const lastName = document.getElementById('edit-lastname').value.trim();
  const firstName = document.getElementById('edit-firstname').value.trim();
  const middleName = document.getElementById('edit-middlename').value.trim();
  const newPassword = document.getElementById('edit-password').value;
  const btn = document.getElementById('save-profile-btn');
  const status = document.getElementById('profile-status');

  if (!firstName || !lastName) {
    status.textContent = "First and Last Name are required.";
    status.style.color = "var(--danger)";
    return;
  }

  btn.textContent = "Saving...";
  btn.disabled = true;
  status.textContent = "";

  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'updateProfile',
      lrn: currentUser.lrn,
      lastName: lastName,
      firstName: firstName,
      middleName: middleName,
      newPassword: newPassword
    })
  })
  .then(res => res.json())
  .then(data => {
    btn.textContent = "Save";
    btn.disabled = false;

    if (data.ok) {
      status.textContent = "Profile updated successfully!";
      status.style.color = "var(--success)";
      
      currentUser.name = `${lastName}, ${firstName} ${middleName}`.trim().replace(/\s+/g, ' ');
      localStorage.setItem('plusPointsUser', JSON.stringify(currentUser));
      
      if (currentUser.role === 'student') {
        document.getElementById('student-name').textContent = currentUser.name;
      } else {
        document.getElementById('teacher-name').textContent = currentUser.name;
      }

      setTimeout(() => { closeProfileModal(); }, 1500);
    } else {
      status.textContent = data.error || "Failed to update profile.";
      status.style.color = "var(--danger)";
    }
  })
  .catch(err => {
    btn.textContent = "Save";
    btn.disabled = false;
    status.textContent = "Network error. Try again.";
    status.style.color = "var(--danger)";
  });
}

// REGISTRATION LOGIC
function openRegisterModal() {
  document.getElementById('reg-lrn').value = "";
  document.getElementById('reg-lastname').value = "";
  document.getElementById('reg-firstname').value = "";
  document.getElementById('reg-middlename').value = "";
  document.getElementById('reg-password').value = "";
  
  document.getElementById('register-modal').classList.add('active');
}

function closeRegisterModal() {
  document.getElementById('register-modal').classList.remove('active');
  document.getElementById('register-status').textContent = "";
}

function registerStudent() {
  const lrn = document.getElementById('reg-lrn').value.trim();
  const lastName = document.getElementById('reg-lastname').value.trim();
  const firstName = document.getElementById('reg-firstname').value.trim();
  const middleName = document.getElementById('reg-middlename').value.trim();
  const password = document.getElementById('reg-password').value;
  
  const btn = document.getElementById('register-btn');
  const status = document.getElementById('register-status');

  if (!lrn || !lastName || !firstName || !password) {
    status.textContent = "Please fill in all required fields.";
    status.style.color = "var(--danger)";
    return;
  }

  btn.textContent = "Registering...";
  btn.disabled = true;
  status.textContent = "";

  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'register',
      lrn: lrn,
      lastName: lastName,
      firstName: firstName,
      middleName: middleName,
      password: password,
      role: 'student'
    })
  })
  .then(res => res.json())
  .then(data => {
    btn.textContent = "Register";
    btn.disabled = false;

    if (data.ok) {
      status.textContent = "Account created! You can now log in.";
      status.style.color = "var(--success)";
      
      document.getElementById('username').value = lrn;
      document.getElementById('password').value = password;
      
      setTimeout(() => { closeRegisterModal(); }, 2000);
    } else {
      status.textContent = data.error || "Registration failed.";
      status.style.color = "var(--danger)";
    }
  })
  .catch(err => {
    btn.textContent = "Register";
    btn.disabled = false;
    status.textContent = "Network error. Try again.";
    status.style.color = "var(--danger)";
  });
}

// RESET PASSWORD LOGIC (BAGO)
function openResetModal() {
  document.getElementById('reset-username').value = "";
  document.getElementById('reset-newpassword').value = "";
  document.getElementById('reset-modal').classList.add('active');
}

function closeResetModal() {
  document.getElementById('reset-modal').classList.remove('active');
  document.getElementById('reset-status').textContent = "";
}

function resetPassword() {
  const username = document.getElementById('reset-username').value.trim();
  const newPassword = document.getElementById('reset-newpassword').value;
  const btn = document.getElementById('reset-btn');
  const status = document.getElementById('reset-status');

  if (!username || !newPassword) {
    status.textContent = "Please enter your LRN and new password.";
    status.style.color = "var(--danger)";
    return;
  }

  btn.textContent = "Resetting...";
  btn.disabled = true;
  status.textContent = "";

  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({
      action: 'resetPassword',
      username: username,
      newPassword: newPassword
    })
  })
  .then(res => res.json())
  .then(data => {
    btn.textContent = "Reset Password";
    btn.disabled = false;

    if (data.ok) {
      status.textContent = "Password reset successful! You can now log in.";
      status.style.color = "var(--success)";
      
      document.getElementById('username').value = username;
      document.getElementById('password').value = newPassword;
      
      setTimeout(() => { closeResetModal(); }, 2000);
    } else {
      status.textContent = data.error || "Reset failed.";
      status.style.color = "var(--danger)";
    }
  })
  .catch(err => {
    btn.textContent = "Reset Password";
    btn.disabled = false;
    status.textContent = "Network error. Try again.";
    status.style.color = "var(--danger)";
  });
}

// TEACHER LOGIC
function loadTeacherData() {
  const container = document.getElementById('teacher-records-list');
  const term = document.getElementById('teacher-term-select').value;
  
  container.innerHTML = "<p style='text-align:center; color:#666;'>Loading records...</p>";

  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getAllStudents', term: term })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok && data.students.length > 0) {
      let html = '';
      data.students.forEach(st => {
        html += `
          <div class="record-item">
            <div class="record-name">${st.name} (${st.lrn})</div>
            <div class="record-details">
              Stickers: <strong>${st.totalStickers}</strong> | Points: <strong>${st.totalPoints}</strong>
            </div>
          </div>
        `;
      });
      container.innerHTML = html;
    } else {
      container.innerHTML = `<p style='text-align:center; color:#666;'>No records found for ${term}.</p>`;
    }
  })
  .catch(err => {
    container.innerHTML = "<p style='text-align:center; color:red;'>Error loading data.</p>";
  });
}
