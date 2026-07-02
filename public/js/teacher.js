// Debounce Helper
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Teacher Dashboard Actions
async function loadTeacherDashboard() {
  try {
    const data = await api.get('/dashboard/teacher');
    if (data && data.success) {
      const stats = data.data;

      // Set statistic card counts
      setCardValue('count-classes', stats.classCount);
      setCardValue('count-subjects', stats.subjectCount);
      setCardValue('count-questions', stats.questionCount);
      setCardValue('count-students', stats.studentCount);

      // Render recent activity table
      const listContainer = document.getElementById('recent-activity-list');
      if (listContainer) {
        if (stats.recentActivity.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No recent quiz attempts found.</td></tr>';
        } else {
          listContainer.innerHTML = stats.recentActivity.map(act => `
            <tr>
              <td><strong>${act.studentName}</strong></td>
              <td>${act.quizTitle}</td>
              <td>
                <span class="erp-badge erp-badge-info">${act.score} / ${act.totalMarks}</span>
              </td>
              <td>
                <span class="erp-badge erp-badge-${act.status === 'Pass' ? 'success' : 'danger'}">${act.percentage}% (${act.status})</span>
              </td>
              <td>${new Date(act.date).toLocaleDateString()}</td>
            </tr>
          `).join('');
        }
      }

      // Render Charts
      renderTeacherCharts(stats.charts);
    }
  } catch (err) {
    showToast('Failed to load dashboard statistics.', 'danger');
  }
}

function setCardValue(id, val) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = val;
}

// Chart.js helper for teacher dashboard
function renderTeacherCharts(chartData) {
  const performanceCtx = document.getElementById('performanceChart');
  const gradesCtx = document.getElementById('gradesChart');

  if (performanceCtx) {
    // Subject/Quiz Performance chart
    new Chart(performanceCtx, {
      type: 'bar',
      data: {
        labels: chartData.quizPerformance.map(q => q.quizTitle),
        datasets: [{
          label: 'Average Score (%)',
          data: chartData.quizPerformance.map(q => q.averagePercentage),
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { min: 0, max: 100 } }
      }
    });
  }

  if (gradesCtx) {
    // Grade distribution doughnut chart
    new Chart(gradesCtx, {
      type: 'doughnut',
      data: {
        labels: chartData.gradeDistribution.map(g => g.grade),
        datasets: [{
          data: chartData.gradeDistribution.map(g => g.count),
          backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#f87171', '#ef4444']
        }]
      },
      options: {
        responsive: true
      }
    });
  }
}



// Question Bank Functions
async function loadQuestionsTable() {
  const container = document.getElementById('questions-list');
  if (!container) return;

  try {
    const data = await api.get('/questions');
    if (data && data.success) {
      if (data.data.length === 0) {
        container.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No questions found in question bank.</td></tr>';
      } else {
        container.innerHTML = data.data.map(q => `
          <tr>
            <td><strong>${q.questionText}</strong></td>
            <td>${q.className}</td>
            <td>${q.subjectName}</td>
            <td>
              <ol class="mb-0" style="padding-left: 14px">
                ${q.options.map((opt, idx) => `
                  <li class="${idx === q.correctAnswer ? 'text-success font-weight-bold' : ''}">${opt}</li>
                `).join('')}
              </ol>
            </td>
            <td><span class="erp-badge erp-badge-info">${q.points} pt</span></td>
            <td>
              <button onclick="deleteQuestion('${q.id}')" class="btn btn-sm btn-outline-danger">
                <i class="fas fa-trash-alt"></i>
              </button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load questions list.', 'danger');
  }
}

let allAssignedSubjects = [];

async function loadSubjectSelector() {
  const select = document.getElementById('subjectSelect');
  if (!select) return;

  // Load classes dropdown if present
  const classSelect = document.getElementById('classSelect');
  if (classSelect) {
    try {
      const classesRes = await api.get('/classes');
      if (classesRes && classesRes.success) {
        // Clear previous options
        classSelect.innerHTML = classSelect.multiple ? '' : '<option value="" disabled selected>Select Target Class</option>';
        classSelect.innerHTML += classesRes.data.map(cls => `<option value="${cls._id}">${cls.name}</option>`).join('');
      }
      classSelect.addEventListener('change', updateSubjectDropdownOptions);
    } catch (e) {
      console.error('Failed to load classes for selector:', e);
    }
  }

  try {
    const data = await api.get('/academic/my-subjects');
    if (data && data.success) {
      allAssignedSubjects = data.data;
      updateSubjectDropdownOptions();
    }
  } catch (err) {
    console.error('Failed to load subjects options:', err);
  }
}

function updateSubjectDropdownOptions() {
  const select = document.getElementById('subjectSelect');
  if (!select) return;

  const classSelect = document.getElementById('classSelect');
  if (!classSelect) {
    select.innerHTML = '<option value="" disabled selected>Choose a Subject</option>' +
      allAssignedSubjects.map(sub => `<option value="${sub.id || sub._id}">${sub.name} (${sub.courseName || 'N/A'} - ${sub.semesterName || 'N/A'})</option>`).join('');
    return;
  }

  let selectedClasses = [];
  if (classSelect.multiple) {
    selectedClasses = Array.from(classSelect.selectedOptions).map(opt => opt.value);
  } else {
    selectedClasses = classSelect.value ? [classSelect.value] : [];
  }

  if (selectedClasses.length === 0) {
    select.innerHTML = '<option value="" disabled selected>Choose a Subject (Select Class First)</option>';
    return;
  }

  const filtered = allAssignedSubjects.filter(sub => selectedClasses.includes(String(sub.classId)));

  if (filtered.length === 0) {
    select.innerHTML = '<option value="" disabled selected>No subjects assigned for selected class(es)</option>';
  } else {
    select.innerHTML = '<option value="" disabled selected>Choose a Subject</option>' +
      filtered.map(sub => `<option value="${sub.id || sub._id}">${sub.name} (${sub.courseName || 'N/A'} - ${sub.semesterName || 'N/A'})</option>`).join('');
  }
}

async function addQuestion(e) {
  e.preventDefault();
  const subjectId = document.getElementById('subjectSelect').value;
  const classSelect = document.getElementById('classSelect');
  const classId = classSelect ? classSelect.value : null;
  const questionText = document.getElementById('questionText').value.trim();

  const options = [
    document.getElementById('opt0').value.trim(),
    document.getElementById('opt1').value.trim(),
    document.getElementById('opt2').value.trim(),
    document.getElementById('opt3').value.trim()
  ];

  const radioButtons = document.getElementsByName('correctAnswer');
  let correctAnswer = -1;
  for (let i = 0; i < radioButtons.length; i++) {
    if (radioButtons[i].checked) {
      correctAnswer = i;
      break;
    }
  }

  const points = document.getElementById('points').value;

  if (classSelect && !classId) {
    showToast('Please select a target class.', 'warning');
    return;
  }

  if (!subjectId || !questionText || options.some(o => !o) || correctAnswer === -1) {
    showToast('Please fill in all options and check the correct answer choice.', 'warning');
    return;
  }

  try {
    const res = await api.post('/questions', { subjectId, classId, questionText, options, correctAnswer, points });
    if (res && res.success) {
      showToast('Question created successfully in bank.', 'success');
      document.getElementById('questionText').value = '';
      options.forEach((opt, idx) => document.getElementById(`opt${idx}`).value = '');
      radioButtons.forEach(rb => rb.checked = false);
      if (classSelect) classSelect.value = '';
      updateSubjectDropdownOptions();
      if (document.getElementById('questions-list')) {
        loadQuestionsTable();
      }
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteQuestion(id) {
  if (!confirm('Are you sure you want to delete this question?')) return;
  try {
    const res = await api.delete(`/questions/${id}`);
    if (res && res.success) {
      showToast('Question deleted.', 'success');
      loadQuestionsTable();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// Quiz Creation and compilation
async function initQuizCreator() {
  // Load subjects dropdown (this also populates class list and binds change listeners)
  await loadSubjectSelector();

  // Handle subject change to load questions of selected subject
  const subjectSelect = document.getElementById('subjectSelect');
  const container = document.getElementById('question-selection-container');

  if (subjectSelect && container) {
    subjectSelect.addEventListener('change', async () => {
      const subId = subjectSelect.value;
      container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Loading questions...</div>';

      try {
        const data = await api.get(`/questions?subjectId=${subId}`);
        if (data && data.success) {
          if (data.data.length === 0) {
            container.innerHTML = '<p class="text-muted text-center my-3">No questions found for this subject. Create questions in the Question Bank first.</p>';
          } else {
            container.innerHTML = data.data.map(q => `
              <div class="q-selection-row">
                <input type="checkbox" name="quizQuestions" value="${q.id}">
                <div class="q-selection-info">
                  <strong>${q.questionText}</strong>
                  <div class="text-muted small">
                    Options: ${q.options.join(' | ')}
                  </div>
                </div>
                <span class="erp-badge erp-badge-info">${q.points} pt</span>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        container.innerHTML = '<p class="text-danger text-center my-3">Failed to load questions.</p>';
      }
    });
  }

  // Handle quiz compilation form submit
  const quizForm = document.getElementById('quiz-creator-form');
  if (quizForm) {
    quizForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('quizTitle').value.trim();
      const description = document.getElementById('quizDesc').value.trim();
      const classSelect = document.getElementById('classSelect');
      const selectedClasses = Array.from(classSelect.selectedOptions).map(opt => opt.value);
      const subjectId = document.getElementById('subjectSelect').value;
      const duration = document.getElementById('quizDuration').value;

      const checkedBoxes = document.querySelectorAll('input[name="quizQuestions"]:checked');
      const questions = Array.from(checkedBoxes).map(cb => cb.value);

      if (!title || selectedClasses.length === 0 || !subjectId || questions.length === 0) {
        showToast('Please provide a title, at least one target class, subject, and select at least 1 question.', 'warning');
        return;
      }

      try {
        const res = await api.post('/quizzes', { title, description, classIds: selectedClasses, subjectId, duration, questions });
        if (res && res.success) {
          showToast('Quiz published successfully!', 'success');
          window.location.href = '/teacher/dashboard';
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

// Student roster for teacher dashboard
async function loadStudentsRoster() {
  const container = document.getElementById('students-roster-list');
  if (!container) return;

  try {
    const res = await api.get('/students/teacher/students');
    if (res && res.success) {
      if (res.data.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No students enrolled in your classes yet.</td></tr>';
      } else {
        container.innerHTML = res.data.map(std => `
          <tr>
            <td><strong>${std.name}</strong></td>
            <td>${std.rollNo}</td>
            <td>${std.className}</td>
            <td>${std.email}</td>
            <td><span class="erp-badge erp-badge-success">Enrolled</span></td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load student roster.', 'danger');
  }
}

// Results details listing
let allResultsRoster = [];

async function loadResultsRoster() {
  const container = document.getElementById('results-roster-list');
  if (!container) return;

  // Bind filter listeners once
  if (!window.resultsFilterBound) {
    window.resultsFilterBound = true;

    // Dynamically load assigned subjects into the subject dropdown
    try {
      const subRes = await api.get('/academic/my-subjects');
      const subSelect = document.getElementById('filter-subject');
      if (subRes && subRes.success && subSelect) {
        subSelect.innerHTML = '<option value="">All Subjects</option>' +
          subRes.data.map(s => `<option value="${s.id || s._id}">${s.name}</option>`).join('');
      }
    } catch (e) {
      console.error('Failed to load assigned subjects:', e);
    }

    const filters = ['filter-search', 'filter-type', 'filter-subject', 'filter-status', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', applyResultsFiltersAndRender);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(applyResultsFiltersAndRender, 300));
        }
      }
    });
  }

  try {
    const res = await api.get('/results');
    if (res && res.success) {
      allResultsRoster = res.data || [];
      applyResultsFiltersAndRender();
    }
  } catch (err) {
    console.error('Results load error:', err);
    showToast(err.message || 'Failed to load quiz reports.', 'danger');
  }
}

function applyResultsFiltersAndRender() {
  const container = document.getElementById('results-roster-list');
  if (!container) return;

  const search = document.getElementById('filter-search')?.value.trim().toLowerCase() || '';
  const type = document.getElementById('filter-type')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'createdAt-desc';

  // Apply filters
  let filtered = allResultsRoster.filter(r => {
    // 1. Search text (matches student name, roll number, or assessment title)
    if (search) {
      const nameMatch = String(r.studentName || '').toLowerCase().includes(search);
      const rollMatch = String(r.rollNo || '').toLowerCase().includes(search);
      const titleMatch = String(r.quizTitle || '').toLowerCase().includes(search);
      if (!nameMatch && !rollMatch && !titleMatch) return false;
    }

    // 2. Type filter
    if (type && String(r.type || '').toLowerCase() !== type.toLowerCase()) return false;

    // 3. Subject filter
    if (subjectId && String(r.subjectId || '') !== subjectId) return false;

    // 4. Status filter
    if (status && String(r.status || '').toLowerCase() !== status.toLowerCase()) return false;

    return true;
  });

  // Apply Sorting
  const [sortBy, sortOrder] = sortVal.split('-');
  filtered.sort((a, b) => {
    let valA = a[sortBy];
    let valB = b[sortBy];

    if (sortBy === 'createdAt') {
      valA = new Date(valA || 0);
      valB = new Date(valB || 0);
    } else if (sortBy === 'percentage' || sortBy === 'score') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    const orderMultiplier = sortOrder === 'desc' ? -1 : 1;
    if (valA < valB) return -1 * orderMultiplier;
    if (valA > valB) return 1 * orderMultiplier;
    return 0;
  });

  // Render to DOM
  if (filtered.length === 0) {
    container.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-4"><i class="fas fa-search me-1"></i> No matching results found.</td></tr>';
  } else {
    container.innerHTML = filtered.map(r => {
      const isPass = String(r.status).toLowerCase() === 'pass';
      const statusBadge = isPass 
        ? '<span class="badge bg-success fw-bold py-1 px-3">PASS</span>' 
        : '<span class="badge bg-danger fw-bold py-1 px-3">FAIL</span>';
      
      const typeBadge = String(r.type).toLowerCase() === 'exam'
        ? '<span class="badge bg-purple-subtle text-purple border border-purple-subtle fw-semibold me-1 px-2 py-1 small" style="background-color: #f3e8ff; color: #6b21a8; font-size: 0.75rem;">Exam</span>'
        : '<span class="badge bg-blue-subtle text-blue border border-blue-subtle fw-semibold me-1 px-2 py-1 small" style="background-color: #dbeafe; color: #1e40af; font-size: 0.75rem;">Quiz</span>';

      return `
        <tr>
          <td><strong>${r.studentName}</strong></td>
          <td><code>${r.rollNo}</code></td>
          <td>${typeBadge} ${r.quizTitle} <div class="text-muted small">${r.subjectName || 'N/A'}</div></td>
          <td>${r.totalMarks}</td>
          <td class="fw-bold">${r.score}</td>
          <td>${r.passMarks !== undefined ? r.passMarks : 40}</td>
          <td>${statusBadge}</td>
          <td>${r.percentage}%</td>
          <td>${new Date(r.createdAt).toLocaleDateString()} ${new Date(r.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
        </tr>
      `;
    }).join('');
  }
}

// Profile page loaders and forms
async function loadTeacherProfileDetails() {
  const nameInput = document.getElementById('profName');
  const emailInput = document.getElementById('profEmail');
  const desInput = document.getElementById('profDesignation');
  const imgAvatar = document.getElementById('profile-avatar-large');

  if (!nameInput) return;

  try {
    const res = await api.get('/teachers/profile');
    if (res && res.success) {
      nameInput.value = res.data.name;
      emailInput.value = res.data.email;
      desInput.value = res.data.designation;
      if (imgAvatar && res.data.profilePic) {
        imgAvatar.src = res.data.profilePic;
      }
    }
  } catch (err) {
    showToast('Failed to load profile details.', 'danger');
  }
}

async function setupProfileForm() {
  await loadTeacherProfileDetails();

  const form = document.getElementById('teacher-profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profName').value.trim();
      const designation = document.getElementById('profDesignation').value.trim();
      const password = document.getElementById('profPassword').value;
      const fileInput = document.getElementById('profPic');

      const formData = new FormData();
      if (name) formData.append('name', name);
      if (designation) formData.append('designation', designation);
      if (password) formData.append('password', password);
      if (fileInput && fileInput.files[0]) {
        formData.append('profilePic', fileInput.files[0]);
      }

      try {
        const res = await api.putMultipart('/teachers/profile', formData);
        if (res && res.success) {
          // Update cached user details
          const cachedUser = api.getUser();
          api.setUser({
            ...cachedUser,
            name: res.data.name,
            designation: res.data.designation,
            profilePic: res.data.profilePic
          });

          showToast('Profile settings updated successfully!', 'success');
          setTimeout(() => window.location.reload(), 800);
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

// 12. Helper to load teacher's assigned subjects
async function loadTeacherSubjects(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;
  try {
    const res = await api.get('/academic/my-subjects');
    if (res && res.success) {
      select.innerHTML = '<option value="" disabled selected>Select Subject</option>' +
        res.data.map(s => `<option value="${s.id}">${s.name} (${s.courseName} - ${s.semesterName})</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load teacher subjects:', err);
  }
}

// 13. Lecture Notes Functions
async function loadNotesTable() {
  const tbody = document.getElementById('notes-tbody');
  if (!tbody) return;

  // Bind filter listeners once
  if (!window.notesFilterBound) {
    window.notesFilterBound = true;

    // Dynamically load assigned subjects into the subject dropdown
    try {
      const subRes = await api.get('/academic/my-subjects');
      const subSelect = document.getElementById('filter-subject');
      if (subRes && subRes.success && subSelect) {
        subSelect.innerHTML = '<option value="">All Subjects</option>' +
          subRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
    } catch (e) {
      console.error(e);
    }

    const filters = ['filter-search', 'filter-subject', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadNotesTable);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadNotesTable, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'createdAt-desc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (subjectId) params.append('subjectId', subjectId);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/academic/notes?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No notes uploaded yet matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(n => `
        <tr>
          <td><strong>${n.title}</strong></td>
          <td>${n.subjectName}</td>
          <td><a href="${n.filePath}" download class="btn btn-sm btn-outline-primary"><i class="fas fa-download"></i> Download</a></td>
          <td class="text-end">
            <button onclick="deleteNotes('${n.id}')" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function uploadNotes(e) {
  e.preventDefault();
  const title = document.getElementById('notesTitle').value.trim();
  const description = document.getElementById('notesDesc').value.trim();
  const subjectId = document.getElementById('subjectSelect').value;
  const fileInput = document.getElementById('notesFile');

  if (!title || !subjectId || fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('subjectId', subjectId);
  formData.append('notesFile', fileInput.files[0]);

  try {
    const res = await api.postMultipart('/academic/notes', formData);
    if (res && res.success) {
      showToast('Notes uploaded successfully!', 'success');
      document.getElementById('add-notes-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addNotesModal')).hide();
      await loadNotesTable();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function deleteNotes(id) {
  if (!confirm('Are you sure you want to delete this notes file?')) return;
  try {
    const res = await api.delete(`/academic/notes/${id}`);
    if (res && res.success) {
      showToast('Notes deleted.', 'success');
      await loadNotesTable();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 14. Assignments Functions
async function loadAssignmentsTable() {
  const tbody = document.getElementById('assignments-tbody');
  if (!tbody) return;

  // Bind filter listeners once
  if (!window.assignmentsFilterBound) {
    window.assignmentsFilterBound = true;

    // Dynamically load assigned subjects into the subject dropdown
    try {
      const subRes = await api.get('/academic/my-subjects');
      const subSelect = document.getElementById('filter-subject');
      if (subRes && subRes.success && subSelect) {
        subSelect.innerHTML = '<option value="">All Subjects</option>' +
          subRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
    } catch (e) {
      console.error(e);
    }

    const filters = ['filter-search', 'filter-subject', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadAssignmentsTable);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadAssignmentsTable, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'dueDate-asc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (subjectId) params.append('subjectId', subjectId);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/academic/assignments?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No assignments created yet matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(a => `
        <tr>
          <td><strong>${a.title}</strong></td>
          <td>${a.subjectName}</td>
          <td>${new Date(a.dueDate).toLocaleDateString()}</td>
          <td>${a.filePath ? `<a href="${a.filePath}" download class="btn btn-sm btn-outline-info"><i class="fas fa-download"></i> View File</a>` : 'No Attachment'}</td>
          <td class="text-end">
            <button onclick="viewSubmissions('${a.id}', '${a.title}')" class="btn btn-sm btn-primary me-1"><i class="fas fa-tasks"></i> Submissions</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function createAssignment(e) {
  e.preventDefault();
  const title = document.getElementById('assTitle').value.trim();
  const description = document.getElementById('assDesc').value.trim();
  const subjectId = document.getElementById('subjectSelect').value;
  const dueDate = document.getElementById('assDueDate').value;
  const fileInput = document.getElementById('assFile');

  if (!title || !subjectId || !dueDate) return;

  const formData = new FormData();
  formData.append('title', title);
  formData.append('description', description);
  formData.append('subjectId', subjectId);
  formData.append('dueDate', dueDate);
  if (fileInput.files.length > 0) {
    formData.append('assignmentFile', fileInput.files[0]);
  }

  try {
    const res = await api.postMultipart('/academic/assignments', formData);
    if (res && res.success) {
      showToast('Assignment created successfully!', 'success');
      document.getElementById('add-assignment-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('addAssignmentModal')).hide();
      await loadAssignmentsTable();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function viewSubmissions(assId, title) {
  document.getElementById('sub-assignment-id').value = assId;
  document.getElementById('sub-assignment-title').textContent = title;
  const tbody = document.getElementById('submissions-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading submissions...</td></tr>';

  new bootstrap.Modal(document.getElementById('submissionsModal')).show();

  try {
    const res = await api.get(`/academic/assignments/${assId}/submissions`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No student submissions received yet.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(sub => `
        <tr>
          <td><strong>${sub.studentName}</strong> <span class="text-muted small">(${sub.rollNo})</span></td>
          <td><a href="${sub.filePath}" download class="btn btn-xs btn-outline-primary py-1 px-2" style="font-size: 11px;"><i class="fas fa-download"></i> Solution File</a></td>
          <td>${new Date(sub.submittedAt).toLocaleDateString()}</td>
          <td><span class="badge bg-${sub.status === 'Graded' ? 'success' : 'warning'}">${sub.status}</span></td>
          <td><strong>${sub.status === 'Graded' ? sub.marks : '-'}</strong></td>
          <td class="text-end">
            <button onclick="openGradeModal('${sub.id}', '${sub.studentName}', ${sub.marks}, '${sub.feedback}')" class="btn btn-xs btn-outline-dark"><i class="fas fa-edit"></i> Grade</button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load submissions: ' + err.message, 'danger');
  }
}

function openGradeModal(id, studentName, marks, feedback) {
  document.getElementById('grade-sub-id').value = id;
  document.getElementById('grade-student-name').textContent = studentName;
  document.getElementById('grade-marks').value = marks || 0;
  document.getElementById('grade-feedback').value = feedback || '';

  new bootstrap.Modal(document.getElementById('gradeModal')).show();
}

async function submitGrade(e) {
  e.preventDefault();
  const id = document.getElementById('grade-sub-id').value;
  const marks = document.getElementById('grade-marks').value;
  const feedback = document.getElementById('grade-feedback').value.trim();
  const assId = document.getElementById('sub-assignment-id').value;
  const assTitle = document.getElementById('sub-assignment-title').textContent;

  try {
    const res = await api.put(`/academic/assignments/submissions/${id}/grade`, { marks, feedback });
    if (res && res.success) {
      showToast('Submission graded successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('gradeModal')).hide();
      await viewSubmissions(assId, assTitle);
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 15. Attendance Logging
async function loadAttendanceRoster() {
  const subjectId = document.getElementById('subjectSelect').value;
  const date = document.getElementById('attendanceDate').value;
  const tbody = document.getElementById('attendance-tbody');

  if (!subjectId || !date) return;
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Loading students roster...</td></tr>';

  try {
    const res = await api.get(`/academic/subjects/${subjectId}/students?date=${date}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No students enrolled in this course semester placement.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(std => {
        const pres = std.attendanceStatus === 'Present' || std.attendanceStatus === '' ? 'checked' : '';
        const abs = std.attendanceStatus === 'Absent' ? 'checked' : '';
        const late = std.attendanceStatus === 'Late' ? 'checked' : '';
        return `
          <tr data-student-id="${std.id}">
            <td><strong>${std.name}</strong></td>
            <td>${std.rollNo}</td>
            <td>${std.email}</td>
            <td>
              <div class="d-flex gap-3">
                <div class="form-check">
                  <input class="form-check-input att-radio" type="radio" name="att-${std.id}" value="Present" ${pres} id="p-${std.id}">
                  <label class="form-check-label text-success fw-semibold small" for="p-${std.id}">Present</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input att-radio" type="radio" name="att-${std.id}" value="Absent" ${abs} id="a-${std.id}">
                  <label class="form-check-label text-danger fw-semibold small" for="a-${std.id}">Absent</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input att-radio" type="radio" name="att-${std.id}" value="Late" ${late} id="l-${std.id}">
                  <label class="form-check-label text-warning fw-semibold small" for="l-${std.id}">Late</label>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Failed to load: ${err.message}</td></tr>`;
  }
}

async function submitAttendance(e) {
  e.preventDefault();
  const subjectId = document.getElementById('subjectSelect').value;
  const date = document.getElementById('attendanceDate').value;
  const rows = document.querySelectorAll('#attendance-tbody tr[data-student-id]');

  if (!subjectId || !date || rows.length === 0) return;

  const statusLogs = [];
  rows.forEach(row => {
    const studentId = row.getAttribute('data-student-id');
    const checkedRadio = row.querySelector('.att-radio:checked');
    const status = checkedRadio ? checkedRadio.value : 'Present';
    statusLogs.push({ studentId, status });
  });

  try {
    const res = await api.post('/academic/attendance', { subjectId, date, statusLogs });
    if (res && res.success) {
      showToast('Daily attendance sheet submitted successfully!', 'success');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 16. Record Marks
async function loadMarksRoster() {
  const subjectId = document.getElementById('subjectSelect').value;
  const tbody = document.getElementById('marks-tbody');

  if (!subjectId) return;
  tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">Loading students...</td></tr>';

  try {
    const res = await api.get(`/academic/subjects/${subjectId}/students`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No students enrolled.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(std => `
        <tr data-student-id="${std.id}">
          <td><strong>${std.name}</strong> <span class="text-muted small">(${std.rollNo})</span></td>
          <td>
            <input type="number" class="form-control form-control-sm marks-input text-center w-50" min="0" required placeholder="Score">
          </td>
          <td>
            <input type="number" class="form-control form-control-sm total-input text-center w-50" min="1" required placeholder="Total Marks" value="100">
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Failed to load students roster.</td></tr>';
  }
}

async function submitMarks(e) {
  e.preventDefault();
  const subjectId = document.getElementById('subjectSelect').value;
  const assessmentId = document.getElementById('assId').value.trim();
  const assessmentType = document.getElementById('assType').value;
  const rows = document.querySelectorAll('#marks-tbody tr[data-student-id]');

  if (!subjectId || !assessmentId || rows.length === 0) return;

  try {
    for (const row of rows) {
      const studentId = row.getAttribute('data-student-id');
      const marksObtained = row.querySelector('.marks-input').value;
      const totalMarks = row.querySelector('.total-input').value;

      if (marksObtained !== '') {
        await api.post('/academic/marks', {
          studentId, subjectId, assessmentId, assessmentType,
          marksObtained: Number(marksObtained), totalMarks: Number(totalMarks)
        });
      }
    }
    showToast('Marks catalog submitted successfully!', 'success');
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 17. Examinations CRUD
async function loadExamsTable() {
  const tbody = document.getElementById('exams-tbody');
  if (!tbody) return;

  // Bind filter listeners once
  if (!window.examsFilterBound) {
    window.examsFilterBound = true;

    // Dynamically load assigned subjects into the subject dropdown
    try {
      const subRes = await api.get('/academic/my-subjects');
      const subSelect = document.getElementById('filter-subject');
      if (subRes && subRes.success && subSelect) {
        subSelect.innerHTML = '<option value="">All Subjects</option>' +
          subRes.data.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
    } catch (e) {
      console.error(e);
    }

    const filters = ['filter-search', 'filter-subject', 'filter-approved', 'filter-end-date', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadExamsTable);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadExamsTable, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const isApproved = document.getElementById('filter-approved')?.value || '';
  const endDate = document.getElementById('filter-end-date')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'examDate-asc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (subjectId) params.append('subjectId', subjectId);
  if (isApproved) params.append('isApproved', isApproved);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/exams?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No exams created matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(ex => `
        <tr>
          <td><strong>${ex.title}</strong></td>
          <td>${ex.subjectName}</td>
          <td>${ex.courseName || 'N/A'}</td>
          <td>${ex.semesterName || 'N/A'}</td>
          <td>${new Date(ex.examDate).toLocaleDateString()}</td>
          <td>${ex.duration} min</td>
          <td>
            <span class="badge bg-${ex.isApproved ? 'success' : 'warning'}">
              ${ex.isApproved ? 'Approved / Active' : 'Pending Principal Approval'}
            </span>
          </td>
          <td class="text-end">
            <button onclick="openEditExamModal('${ex.id}')" class="btn btn-sm btn-outline-primary me-1"><i class="fas fa-edit"></i></button>
            <button onclick="deleteExam('${ex.id}')" class="btn btn-sm btn-outline-danger"><i class="fas fa-trash-alt"></i></button>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function initExamCreator() {
  let teacherSubjectsList = [];
  const courseSelect = document.getElementById('courseSelect');
  const semesterSelect = document.getElementById('semesterSelect');
  const subjectSelect = document.getElementById('subjectSelect');
  const container = document.getElementById('question-selection-container');

  try {
    const res = await api.get('/academic/my-subjects');
    if (res && res.success) {
      teacherSubjectsList = res.data;

      // Extract unique courses
      const coursesMap = {};
      teacherSubjectsList.forEach(s => {
        if (s.courseId) {
          coursesMap[s.courseId] = s.courseName;
        }
      });

      if (courseSelect) {
        courseSelect.innerHTML = '<option value="" disabled selected>Select Course</option>' +
          Object.keys(coursesMap).map(id => `<option value="${id}">${coursesMap[id]}</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Failed to load teacher subjects:', err);
  }

  if (courseSelect) {
    courseSelect.addEventListener('change', () => {
      const selectedCourseId = courseSelect.value;

      // Filter subjects for course to extract unique semesters
      const semestersMap = {};
      teacherSubjectsList.forEach(s => {
        if (s.courseId === selectedCourseId && s.semesterId) {
          semestersMap[s.semesterId] = s.semesterName;
        }
      });

      if (semesterSelect) {
        semesterSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>' +
          Object.keys(semestersMap).map(id => `<option value="${id}">${semestersMap[id]}</option>`).join('');
      }

      if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
      }
      if (container) {
        container.innerHTML = '<p class="text-muted small text-center my-2">Please select a subject above to load questions catalog.</p>';
      }
    });
  }

  if (semesterSelect) {
    semesterSelect.addEventListener('change', () => {
      const selectedCourseId = courseSelect.value;
      const selectedSemesterId = semesterSelect.value;

      const filteredSubjects = teacherSubjectsList.filter(s => s.courseId === selectedCourseId && s.semesterId === selectedSemesterId);

      if (subjectSelect) {
        subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>' +
          filteredSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
      }
      if (container) {
        container.innerHTML = '<p class="text-muted small text-center my-2">Please select a subject above to load questions catalog.</p>';
      }
    });
  }

  if (subjectSelect && container) {
    const updateCalculatedMarks = () => {
      let total = 0;
      const checked = container.querySelectorAll('input[name="examQuestions"]:checked');
      checked.forEach(cb => {
        const pointsSpan = cb.parentElement.querySelector('.badge');
        if (pointsSpan) {
          const pts = parseInt(pointsSpan.textContent) || 1;
          total += pts;
        }
      });
      document.getElementById('examTotalMarksDisplay').value = total;
    };

    container.addEventListener('change', (e) => {
      if (e.target.name === 'examQuestions') {
        updateCalculatedMarks();
      }
    });

    const passMarksInput = document.getElementById('examPassMarks');
    const failMarksInput = document.getElementById('examFailMarks');
    if (passMarksInput && failMarksInput) {
      passMarksInput.addEventListener('input', () => {
        const pm = parseInt(passMarksInput.value) || 0;
        failMarksInput.value = Math.max(0, pm - 1);
      });
    }

    subjectSelect.addEventListener('change', async () => {
      const subId = subjectSelect.value;
      container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Loading subject questions...</div>';
      document.getElementById('examTotalMarksDisplay').value = 0;

      try {
        const data = await api.get(`/questions?subjectId=${subId}`);
        if (data && data.success) {
          if (data.data.length === 0) {
            container.innerHTML = '<p class="text-muted text-center my-3">No questions defined for this subject. Add questions in the Question Bank first.</p>';
          } else {
            container.innerHTML = data.data.map(q => `
              <div class="q-selection-row d-flex align-items-center gap-3 p-2 rounded hover-bg border-bottom border-color">
                <input type="checkbox" name="examQuestions" value="${q.id}" class="form-check-input ms-1">
                <div style="flex: 1">
                  <strong>${q.questionText}</strong>
                  <div class="text-muted small">Options: ${q.options.join(' | ')}</div>
                </div>
                <span class="badge bg-info">${q.points} pt</span>
              </div>
            `).join('');
          }
        }
      } catch (err) {
        container.innerHTML = '<p class="text-danger text-center my-3">Failed to load questions list.</p>';
      }
    });
  }

  const examForm = document.getElementById('exam-creator-form');
  if (examForm) {
    examForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const title = document.getElementById('examTitle').value.trim();
      const description = document.getElementById('examDesc').value.trim();
      const subjectId = document.getElementById('subjectSelect').value;
      const duration = document.getElementById('examDuration').value;
      const examDate = document.getElementById('examDate').value;

      const checkedBoxes = document.querySelectorAll('input[name="examQuestions"]:checked');
      const questions = Array.from(checkedBoxes).map(cb => cb.value);

      if (!title || !subjectId || !examDate || questions.length === 0) {
        showToast('Provide a Title, Subject, Date, and select at least 1 question.', 'warning');
        return;
      }

      const passMarks = parseInt(document.getElementById('examPassMarks').value) || 0;
      const totalMarksDisplay = parseInt(document.getElementById('examTotalMarksDisplay').value) || 0;

      if (passMarks < 0) {
        showToast('Pass marks cannot be negative.', 'warning');
        return;
      }
      if (passMarks > totalMarksDisplay) {
        showToast('Pass marks cannot exceed calculated Total Marks.', 'warning');
        return;
      }

      try {
        const res = await api.post('/exams', { title, description, subjectId, duration, examDate, questions, passMarks });
        if (res && res.success) {
          showToast('Exam created successfully! Submitted to Principal for approval.', 'success');
          setTimeout(() => {
            window.location.href = '/teacher/exams';
          }, 1000);
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}

async function deleteExam(id) {
  if (!confirm('Are you sure you want to delete this exam schedule?')) return;
  try {
    const res = await api.delete(`/exams/${id}`);
    if (res && res.success) {
      showToast('Exam schedule deleted successfully.', 'success');
      await loadExamsTable();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

async function openEditExamModal(id) {
  try {
    const res = await api.get(`/exams/${id}`);
    if (res && res.success) {
      const exam = res.data;

      document.getElementById('editExamId').value = exam.id;
      document.getElementById('editExamTitle').value = exam.title;
      document.getElementById('editExamDesc').value = exam.description || '';
      document.getElementById('editExamDuration').value = exam.duration;
      document.getElementById('editExamDate').value = new Date(exam.examDate).toISOString().split('T')[0];
      document.getElementById('editExamTotalMarksDisplay').value = exam.totalMarks || 0;
      document.getElementById('editExamPassMarks').value = exam.passMarks !== undefined ? exam.passMarks : 40;
      document.getElementById('editExamFailMarks').value = exam.failMarks !== undefined ? exam.failMarks : 39;

      const subjectsRes = await api.get('/academic/my-subjects');
      if (subjectsRes && subjectsRes.success) {
        const teacherSubjectsList = subjectsRes.data;

        const coursesMap = {};
        teacherSubjectsList.forEach(s => {
          if (s.courseId) {
            coursesMap[s.courseId] = s.courseName;
          }
        });

        const courseSelect = document.getElementById('editCourseSelect');
        const semesterSelect = document.getElementById('editSemesterSelect');
        const subjectSelect = document.getElementById('editSubjectSelect');

        courseSelect.innerHTML = '<option value="" disabled>Select Course</option>' +
          Object.keys(coursesMap).map(cid => `<option value="${cid}">${coursesMap[cid]}</option>`).join('');
        courseSelect.value = exam.courseId;

        const semestersMap = {};
        teacherSubjectsList.forEach(s => {
          if (s.courseId === exam.courseId && s.semesterId) {
            semestersMap[s.semesterId] = s.semesterName;
          }
        });
        semesterSelect.innerHTML = '<option value="" disabled>Select Semester</option>' +
          Object.keys(semestersMap).map(sid => `<option value="${sid}">${semestersMap[sid]}</option>`).join('');
        semesterSelect.value = exam.semesterId;

        const filteredSubjects = teacherSubjectsList.filter(s => s.courseId === exam.courseId && s.semesterId === exam.semesterId);
        subjectSelect.innerHTML = '<option value="" disabled>Select Subject</option>' +
          filteredSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        subjectSelect.value = exam.subjectId;

        courseSelect.onchange = () => {
          const selectedCourseId = courseSelect.value;
          const newSemestersMap = {};
          teacherSubjectsList.forEach(s => {
            if (s.courseId === selectedCourseId && s.semesterId) {
              newSemestersMap[s.semesterId] = s.semesterName;
            }
          });
          semesterSelect.innerHTML = '<option value="" disabled selected>Select Semester</option>' +
            Object.keys(newSemestersMap).map(sid => `<option value="${sid}">${newSemestersMap[sid]}</option>`).join('');
          subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>';
          document.getElementById('edit-question-selection-container').innerHTML = '<p class="text-muted small text-center my-2">Please select a subject above to load questions catalog.</p>';
          document.getElementById('editExamTotalMarksDisplay').value = 0;
        };

        semesterSelect.onchange = () => {
          const selectedCourseId = courseSelect.value;
          const selectedSemesterId = semesterSelect.value;
          const newFilteredSubjects = teacherSubjectsList.filter(s => s.courseId === selectedCourseId && s.semesterId === selectedSemesterId);
          subjectSelect.innerHTML = '<option value="" disabled selected>Select Subject</option>' +
            newFilteredSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
          document.getElementById('edit-question-selection-container').innerHTML = '<p class="text-muted small text-center my-2">Please select a subject above to load questions catalog.</p>';
          document.getElementById('editExamTotalMarksDisplay').value = 0;
        };

        const updateEditCalculatedMarks = () => {
          let total = 0;
          const editContainer = document.getElementById('edit-question-selection-container');
          const checked = editContainer.querySelectorAll('input[name="editExamQuestions"]:checked');
          checked.forEach(cb => {
            const pointsSpan = cb.parentElement.querySelector('.badge');
            if (pointsSpan) {
              const pts = parseInt(pointsSpan.textContent) || 1;
              total += pts;
            }
          });
          document.getElementById('editExamTotalMarksDisplay').value = total;
        };

        const editContainer = document.getElementById('edit-question-selection-container');
        editContainer.onchange = (e) => {
          if (e.target.name === 'editExamQuestions') {
            updateEditCalculatedMarks();
          }
        };

        const editPassMarksInput = document.getElementById('editExamPassMarks');
        const editFailMarksInput = document.getElementById('editExamFailMarks');
        editPassMarksInput.oninput = () => {
          const pm = parseInt(editPassMarksInput.value) || 0;
          editFailMarksInput.value = Math.max(0, pm - 1);
        };

        await loadEditQuestions(exam.subjectId, exam.questions.map(q => q._id));
        updateEditCalculatedMarks();

        subjectSelect.onchange = async () => {
          await loadEditQuestions(subjectSelect.value, []);
          updateEditCalculatedMarks();
        };
      }

      new bootstrap.Modal(document.getElementById('editExamModal')).show();
    }
  } catch (err) {
    showToast('Failed to load exam details: ' + err.message, 'danger');
  }
}

async function loadEditQuestions(subjectId, selectedQuestionIds = []) {
  const container = document.getElementById('edit-question-selection-container');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Loading subject questions...</div>';
  try {
    const data = await api.get(`/questions?subjectId=${subjectId}`);
    if (data && data.success) {
      if (data.data.length === 0) {
        container.innerHTML = '<p class="text-muted text-center my-3">No questions defined for this subject. Add questions in the Question Bank first.</p>';
      } else {
        container.innerHTML = data.data.map(q => {
          const checked = selectedQuestionIds.includes(String(q.id)) ? 'checked' : '';
          return `
            <div class="q-selection-row d-flex align-items-center gap-3 p-2 rounded hover-bg border-bottom border-color">
              <input type="checkbox" name="editExamQuestions" value="${q.id}" ${checked} class="form-check-input ms-1">
              <div style="flex: 1">
                <strong>${q.questionText}</strong>
                <div class="text-muted small">Options: ${q.options.join(' | ')}</div>
              </div>
              <span class="badge bg-info">${q.points} pt</span>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    container.innerHTML = '<p class="text-danger text-center my-3">Failed to load questions list.</p>';
  }
}

function initEditExamForm() {
  const form = document.getElementById('edit-exam-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = document.getElementById('editExamId').value;
      const title = document.getElementById('editExamTitle').value.trim();
      const description = document.getElementById('editExamDesc').value.trim();
      const subjectId = document.getElementById('editSubjectSelect').value;
      const duration = document.getElementById('editExamDuration').value;
      const examDate = document.getElementById('editExamDate').value;

      const checkedBoxes = document.querySelectorAll('input[name="editExamQuestions"]:checked');
      const questions = Array.from(checkedBoxes).map(cb => cb.value);

      if (!title || !subjectId || !examDate || questions.length === 0) {
        showToast('Provide a Title, Subject, Date, and select at least 1 question.', 'warning');
        return;
      }

      const passMarks = parseInt(document.getElementById('editExamPassMarks').value) || 0;
      const totalMarksDisplay = parseInt(document.getElementById('editExamTotalMarksDisplay').value) || 0;

      if (passMarks < 0) {
        showToast('Pass marks cannot be negative.', 'warning');
        return;
      }
      if (passMarks > totalMarksDisplay) {
        showToast('Pass marks cannot exceed calculated Total Marks.', 'warning');
        return;
      }

      try {
        const res = await api.put(`/exams/${id}`, { title, description, subjectId, duration, examDate, questions, passMarks });
        if (res && res.success) {
          showToast('Exam updated successfully! Submitted to Principal for approval.', 'success');
          bootstrap.Modal.getInstance(document.getElementById('editExamModal')).hide();
          await loadExamsTable();
        }
      } catch (err) {
        showToast(err.message, 'danger');
      }
    });
  }
}
