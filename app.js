// PALITAN ITO NG URL NG WEB APP MO
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbzbsu4HKBDvSKDJZfSWtKUuHZ2jtB-W51w-Goyz2pczyH9qnBQdIyWBnOutnr-dZcVyuA/exec';

let currentUser = null;
let fileBase64 = "";

// Item definitions
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

// INITIALIZATION
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
  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getSummary', lrn: currentUser.lrn, term: 'Term 1' })
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
    document.getElementById('file-name').textContent = file.name;
    const reader = new FileReader();
    reader.onload = function(event) {
      fileBase64 = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// SUBMIT ITEMS (Student)
function submitItems() {
  if (!currentUser) return;
  
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

  // Function to process queue one by one
  const processQueue = (index, evidenceUrl) => {
    if (index >= itemsToSave.length) {
      showStatus("Successfully submitted!", "green");
      btn.textContent = "Submit Items";
      btn.disabled = false;
      
      // Reset form
      for (const key in ITEMS) document.getElementById(`qty-${key}`).value = "0";
      document.getElementById('evidence-photo').value = "";
      document.getElementById('file-name').textContent = "No file selected";
      fileBase64 = "";
      
      loadStudentData(); // Refresh points
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
        term: 'Term 1'
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.ok) {
        processQueue(index + 1, evidenceUrl); // proceed to next
      } else {
        showStatus("Error saving record: " + data.error, "red");
        btn.textContent = "Submit Items";
        btn.disabled = false;
      }
    });
  };

  // If there's an image, upload it first, then process items
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
    });
  } else {
    // No image, just save items
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

// TEACHER LOGIC
function loadTeacherData() {
  const container = document.getElementById('teacher-records-list');
  fetch(BACKEND_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getAllStudents', term: 'Term 1' })
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
      container.innerHTML = "<p style='text-align:center; color:#666;'>No records found yet.</p>";
    }
  });
}
