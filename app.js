// app.js — Final stable version (Option 2 UI)

import {
  db, collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where
} from "./firebase.js";

/* ------------------------- DOM Helpers ------------------------- */
const $ = id => document.getElementById(id);

/* ------------------------- UI ELEMENTS ------------------------- */
const courseForm = $('courseForm');
const coursesGrid = $('coursesGrid');
const courseClearBtn = $('courseClear');

const studentForm = $('studentForm');
const studentsList = $('studentsList');
const studentSearch = $('studentSearch');

const studentDetail = $('studentDetail');
const detailContent = $('detailContent');
const closeDetail = $('closeDetail');

const topInfo = $('topInfo');
const toastEl = $('toast');

/* ------------------------- Caches ------------------------- */
let courses = [];
let students = [];

/* ------------------------- Collections ------------------------- */
const coursesCol = collection(db, "courses");
const studentsCol = collection(db, "students");

/* ------------------------- Toasts ------------------------- */
function showToast(msg, type="success") {
  toastEl.textContent = msg;
  toastEl.className = `toast show ${type}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.className = 'toast';
  }, 2500);
}
const showError = (m) => showToast(m, "error");
const showSuccess = (m) => showToast(m, "success");

/* ------------------------- Validation ------------------------- */
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}
function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}
function validateMarksOrAttendance(v) {
  if (!/^\d+$/.test(v)) return { ok: false, msg: "Must be an integer" };
  const n = Number(v);
  if (n < 0 || n > 100) return { ok: false, msg: "Must be between 0 and 100" };
  return { ok: true, value: n };
}

/* ------------------------- Firestore Listeners ------------------------- */
onSnapshot(query(coursesCol, orderBy("name")), snap => {
  courses = [];
  snap.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));
  renderCourses();
  updateTopInfo();
  document.body.setAttribute("data-courses-loaded", "true");
});

onSnapshot(query(studentsCol, orderBy("name")), snap => {
  students = [];
  snap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
  renderStudents();
  updateTopInfo();
});

/* ------------------------- Render Courses ------------------------- */
function renderCourses() {
  coursesGrid.innerHTML = "";
  if (!courses.length) {
    coursesGrid.innerHTML = `<p class="small">No courses added.</p>`;
    return;
  }

  courses.forEach(course => {
    const div = document.createElement('div');
    div.className = "card";

    div.innerHTML = `
      <div class="card-title"><strong>${course.name}</strong></div>
      <div class="meta small">${course.credits} credits · ${course.category || ''}</div>
      <div class="meta small">${course.description || ''}</div>

      <div class="card-actions">
        <button class="btnQuickEnroll" data-id="${course.id}">Quick Enroll</button>
        <button class="btnEditCourse" data-id="${course.id}">Edit</button>
        <button class="btnDeleteCourse" data-id="${course.id}">Delete</button>
      </div>
    `;

    coursesGrid.appendChild(div);
  });

  document.querySelectorAll(".btnQuickEnroll").forEach(b =>
    b.onclick = e => openQuickEnroll(e.target.dataset.id)
  );

  document.querySelectorAll(".btnEditCourse").forEach(b =>
    b.onclick = e => loadCourseForEditing(e.target.dataset.id)
  );

  document.querySelectorAll(".btnDeleteCourse").forEach(b =>
    b.onclick = e => deleteCourse(e.target.dataset.id)
  );
}

/* ------------------------- Render Students ------------------------- */
function renderStudents(filter = "") {
  studentsList.innerHTML = "";
  const term = filter.toLowerCase().trim();

  const list = term
    ? students.filter(s =>
        s.name.toLowerCase().includes(term) ||
        s.id.toLowerCase().includes(term)
      )
    : students;

  if (!list.length) {
    studentsList.innerHTML = `<p class="small">No matching students.</p>`;
    return;
  }

  list.forEach(s => {
    const div = document.createElement('div');
    div.className = "card";

    div.innerHTML = `
      <div class="card-title">
        ${s.name}
        <div class="small">${s.id} · ${s.email || ''}</div>
      </div>

      <div class="card-actions">
        <button class="btnEditProfile" data-id="${s.id}">Edit Profile</button>
        <button class="btnDeleteStudent" data-id="${s.id}">Delete Student</button>
      </div>
    `;

    studentsList.appendChild(div);
  });

  document.querySelectorAll(".btnEditProfile").forEach(b =>
    b.onclick = e => openStudentDetail(e.target.dataset.id)
  );

  document.querySelectorAll(".btnDeleteStudent").forEach(b =>
    b.onclick = e => deleteStudent(e.target.dataset.id)
  );
}

/* ------------------------- Course CRUD ------------------------- */
courseForm.onsubmit = async e => {
  e.preventDefault();
  const name = $('courseName').value.trim();
  const credits = Number($('courseCredits').value);
  const category = $('courseCategory').value.trim();
  const description = $('courseDesc').value.trim();

  if (!name) return showError("Course name required");
  if (credits < 1) return showError("Credits must be ≥ 1");

  const normalized = name.toLowerCase();
  const editingId = courseForm.dataset.editing;

  const q = query(coursesCol, where("normalized", "==", normalized));
  const snap = await getDocs(q);

  if (!editingId && snap.size > 0)
    return showError("Course already exists");

  if (editingId && snap.docs.some(d => d.id !== editingId))
    return showError("Another course with this name exists");

  if (editingId) {
    await updateDoc(doc(coursesCol, editingId), {
      name, credits, category, description, normalized
    });
    showSuccess("Course updated");
    delete courseForm.dataset.editing;
  } else {
    await addDoc(coursesCol, {
      name, credits, category, description, normalized
    });
    showSuccess("Course added");
  }

  courseForm.reset();
};

courseClearBtn.onclick = () => {
  delete courseForm.dataset.editing;
  courseForm.reset();
};

async function loadCourseForEditing(id) {
  const ref = doc(coursesCol, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return showError("Course not found");

  const c = snap.data();
  $('courseName').value = c.name;
  $('courseCredits').value = c.credits;
  $('courseCategory').value = c.category || "";
  $('courseDesc').value = c.description || "";
  courseForm.dataset.editing = id;
}

/* ------------------------- Course Delete ------------------------- */
async function deleteCourse(id) {
  if (!confirm("Delete this course?")) return;

  const ref = doc(coursesCol, id);
  await deleteDoc(ref);

  // Remove enrollment from students
  const studentsSnap = await getDocs(studentsCol);
  const ops = [];

  studentsSnap.forEach(docSnap => {
    const s = docSnap.data();
    if (s.enrolled?.includes(id)) {
      const updated = s.enrolled.filter(x => x !== id);
      const cd = { ...(s.courseData || {}) };
      delete cd[id];
      ops.push(updateDoc(docSnap.ref, { enrolled: updated, courseData: cd }));
    }
  });

  await Promise.all(ops);
  showSuccess("Course deleted");
}

/* ------------------------- Student CRUD ------------------------- */
studentForm.onsubmit = async e => {
  e.preventDefault();

  const id = $('stuId').value.trim();
  const name = $('stuName').value.trim();
  const phone = $('stuPhone').value.trim();
  const email = $('stuEmail').value.trim();
  const address = $('stuAddress').value.trim();

  if (!id || !name) return showError("ID and name required");
  if (phone && !validatePhone(phone)) return showError("Phone must be 10 digits");
  if (email && !validateEmail(email)) return showError("Invalid email");

  const ref = doc(studentsCol, id);
  const snap = await getDoc(ref);

  if (snap.exists() && !studentForm.dataset.editing)
    return showError("Student ID already exists");

  await setDoc(ref, {
    id, name, phone, email, address,
    enrolled: snap.exists() ? snap.data().enrolled : [],
    courseData: snap.exists() ? snap.data().courseData : {}
  });

  delete studentForm.dataset.editing;
  studentForm.reset();
  showSuccess("Student saved");
};

async function deleteStudent(id) {
  if (!confirm("Delete this student?")) return;
  await deleteDoc(doc(studentsCol, id));
  showSuccess("Student deleted");
}

/* ------------------------- Student Detail Drawer ------------------------- */
closeDetail.onclick = () => {
  studentDetail.classList.remove("open");
  detailContent.innerHTML = "";
};

async function openStudentDetail(id) {
  const ref = doc(studentsCol, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return showError("Student not found");

  const s = snap.data();
  detailContent.innerHTML = buildStudentDetailHTML(s);
  studentDetail.classList.add("open");

  document.querySelector(".saveStudentInfoBtn").onclick = () =>
    saveStudentInfo(id);

  detailContent.querySelectorAll(".saveMarksBtn").forEach(btn =>
    btn.onclick = () =>
      saveCourseData(id, btn.dataset.cid)
  );

  detailContent.querySelectorAll(".unenrollBtn").forEach(btn =>
    btn.onclick = () =>
      unenroll(id, btn.dataset.cid)
  );

  detailContent.querySelectorAll(".enrollCourseBtn").forEach(btn =>
    btn.onclick = () =>
      enroll(id, btn.dataset.cid)
  );
}

/* ------------------------- Drawer HTML ------------------------- */
function buildStudentDetailHTML(s) {
  const enrolled = (s.enrolled || [])
    .map(cid => {
      const c = courses.find(x => x.id === cid);
      const cd = s.courseData?.[cid] || { marks: 0, attendance: 0 };
      return `
        <div class="card">
          <strong>${c?.name || "Unknown Course"}</strong>
          <div class="small">${c?.credits || 0} credits</div>

          <label>Marks</label>
          <input id="marks_${cid}" value="${cd.marks}">

          <label>Attendance</label>
          <input id="att_${cid}" value="${cd.attendance}">

          <button class="saveMarksBtn" data-cid="${cid}">Save</button>
          <button class="unenrollBtn" data-cid="${cid}">Un-enroll</button>
        </div>
      `;
    })
    .join("") || `<div class="small">Not enrolled in any courses.</div>`;

  const available = courses
    .filter(c => !s.enrolled?.includes(c.id))
    .map(c => `
      <div class="card">
        <strong>${c.name}</strong>
        <div class="small">${c.credits} credits</div>
        <button class="enrollCourseBtn" data-cid="${c.id}">Enroll</button>
      </div>
    `)
    .join("") || `<div class="small">No available courses.</div>`;

  return `
    <h3>Edit Profile — ${s.name}</h3>

    <label>Name</label>
    <input id="detailName" value="${s.name}">

    <label>Phone</label>
    <input id="detailPhone" value="${s.phone || ''}">

    <label>Email</label>
    <input id="detailEmail" value="${s.email || ''}">

    <label>Address</label>
    <input id="detailAddress" value="${s.address || ''}">

    <button class="saveStudentInfoBtn">Save Profile</button>

    <hr>

    <h4>Enrolled Courses</h4>
    ${enrolled}

    <hr>

    <h4>Available Courses</h4>
    ${available}
  `;
}

/* ------------------------- Drawer Actions ------------------------- */
async function saveStudentInfo(id) {
  const name = $('detailName').value.trim();
  const phone = $('detailPhone').value.trim();
  const email = $('detailEmail').value.trim();
  const address = $('detailAddress').value.trim();

  if (phone && !validatePhone(phone)) return showError("Phone must be 10 digits");
  if (email && !validateEmail(email)) return showError("Invalid email");

  await updateDoc(doc(studentsCol, id), { name, phone, email, address });
  showSuccess("Student info updated");
  openStudentDetail(id);
}

async function saveCourseData(sid, cid) {
  const mV = validateMarksOrAttendance($(`marks_${cid}`).value);
  if (!mV.ok) return showError(`Marks: ${mV.msg}`);

  const aV = validateMarksOrAttendance($(`att_${cid}`).value);
  if (!aV.ok) return showError(`Attendance: ${aV.msg}`);

  const ref = doc(studentsCol, sid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  const data = snap.data();
  const courseData = { ...(data.courseData || {}) };
  courseData[cid] = { marks: mV.value, attendance: aV.value };

  await updateDoc(ref, { courseData });
  showSuccess("Course data saved");
  openStudentDetail(sid);
}

async function unenroll(sid, cid) {
  const ref = doc(studentsCol, sid);
  const snap = await getDoc(ref);
  const s = snap.data();

  const updated = s.enrolled.filter(x => x !== cid);
  const cd = { ...(s.courseData || {}) };
  delete cd[cid];

  await updateDoc(ref, { enrolled: updated, courseData: cd });
  showSuccess("Un-enrolled");
  openStudentDetail(sid);
}

async function enroll(sid, cid) {
  const ref = doc(studentsCol, sid);
  const snap = await getDoc(ref);
  const s = snap.data();

  if (s.enrolled.includes(cid)) return showError("Already enrolled");

  const updated = [...s.enrolled, cid];
  const cd = { ...(s.courseData || {}) };
  cd[cid] = { marks: 0, attendance: 0 };

  await updateDoc(ref, { enrolled: updated, courseData: cd });
  showSuccess("Enrolled");
  openStudentDetail(sid);
}

/* ------------------------- Quick Enroll Popup ------------------------- */
function openQuickEnroll(cid) {
  const box = document.createElement("div");
  box.className = "drawer card";
  box.style.width = "300px";
  box.style.right = "20px";
  box.style.top = "80px";
  box.style.height = "auto";
  box.style.position = "fixed";
  box.innerHTML = `
    <h4>Select student</h4>
    ${students
      .map(s => `
        <button class="quickEnrollBtn" data-sid="${s.id}" data-cid="${cid}">
          ${s.name} (${s.id})
        </button>
      `)
      .join("")}
    <button id="closePopup">Close</button>
  `;
  document.body.appendChild(box);

  document.querySelectorAll(".quickEnrollBtn").forEach(btn =>
    btn.onclick = async () => {
      await enroll(btn.dataset.sid, cid);
      box.remove();
    }
  );

  $('closePopup').onclick = () => box.remove();
}

/* ------------------------- Top Info ------------------------- */
function updateTopInfo() {
  topInfo.innerHTML = `${students.length} Students · ${courses.length} Courses`;
}

/* ------------------------- Search ------------------------- */
studentSearch.oninput = e => renderStudents(e.target.value);

/* ------------------------- Initial Focus ------------------------- */
$('stuId').focus();
