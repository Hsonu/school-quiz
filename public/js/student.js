// Debounce Helper
function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Student Dashboard Actions
async function loadStudentDashboard() {
  try {
    const data = await api.get('/dashboard/student');
    if (data && data.success) {
      const stats = data.data;

      // Set statistic card counts
      setCardValue('count-subjects', stats.subjectCount);
      setCardValue('count-completed', stats.completedQuizzes);
      setCardValue('count-pending', stats.pendingQuizzes);
      setCardValue('count-avg', `${stats.averageScore}%`);

      // Set subtitle labels
      const subLabel = document.getElementById('student-sub-details');
      if (subLabel) {
        subLabel.textContent = `Grade: ${stats.className} | Roll No: ${stats.rollNo}`;
      }

      // Render recent completed quizzes
      const listContainer = document.getElementById('recent-quizzes-list');
      if (listContainer) {
        if (stats.recentQuizzes.length === 0) {
          listContainer.innerHTML = '<tr><td colspan="5" class="text-center text-muted">You have not taken any quizzes yet.</td></tr>';
        } else {
          listContainer.innerHTML = stats.recentQuizzes.map(q => `
            <tr>
              <td><strong>${q.quizTitle}</strong></td>
              <td>${q.subjectName}</td>
              <td>
                <span class="erp-badge erp-badge-info">${q.score} / ${q.totalMarks}</span>
              </td>
              <td>
                <span class="erp-badge erp-badge-${q.status === 'Pass' ? 'success' : 'danger'}">${q.percentage}% (${q.status})</span>
              </td>
              <td>
                <a href="/student/result?id=${q.id}" class="btn btn-sm btn-premium-secondary" style="padding: 4px 10px; font-size: 12px">
                  <i class="fas fa-eye"></i> Review
                </a>
              </td>
            </tr>
          `).join('');
        }
      }

      // Render Progression chart
      renderStudentChart(stats.charts.progression);
    }
  } catch (err) {
    showToast('Failed to load dashboard stats.', 'danger');
  }
}

function setCardValue(id, val) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = val;
}

// Chart.js helper for student progression line graph
function renderStudentChart(progressionData) {
  const ctx = document.getElementById('progressionChart');
  if (!ctx) return;

  if (progressionData.length === 0) {
    ctx.parentNode.innerHTML = '<div class="text-center py-5 text-muted">Complete quizzes to visualize your marks progression!</div>';
    return;
  }

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: progressionData.map(p => p.quizTitle),
      datasets: [{
        label: 'Score Percentage (%)',
        data: progressionData.map(p => p.percentage),
        borderColor: '#1e40af',
        backgroundColor: 'rgba(30, 64, 175, 0.1)',
        tension: 0.3,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: '#1e40af',
        pointRadius: 5
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 100 }
      }
    }
  });
}

// Available quizzes display
async function loadQuizzesList(classId, subjectId) {
  const container = document.getElementById('available-quizzes-grid');
  if (!container) return;

  // Bind filter listeners once
  if (!window.quizzesFilterBound) {
    window.quizzesFilterBound = true;
    const filters = ['filter-search', 'filter-status', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', () => {
          const classSelect = document.getElementById('classSelectFilter');
          const subjectSelect = document.getElementById('subjectSelectFilter');
          const cId = classSelect ? classSelect.value : '';
          const sId = subjectSelect ? subjectSelect.value : '';
          loadQuizzesList(cId, sId);
        });
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(() => {
            const classSelect = document.getElementById('classSelectFilter');
            const subjectSelect = document.getElementById('subjectSelectFilter');
            const cId = classSelect ? classSelect.value : '';
            const sId = subjectSelect ? subjectSelect.value : '';
            loadQuizzesList(cId, sId);
          }, 300));
        }
      }
    });
  }

  const search = document.getElementById('filter-search')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'title-asc';

  const [sortBy, sortOrder] = sortVal.split('-');

  try {
    let url = '/quizzes?';
    if (classId) {
      url += `classId=${classId}&`;
    }
    if (subjectId) {
      url += `subjectId=${subjectId}&`;
    }
    if (search) {
      url += `search=${search}&`;
    }
    if (status) {
      url += `status=${status}&`;
    }
    if (sortBy) {
      url += `sortBy=${sortBy}&`;
    }
    if (sortOrder) {
      url += `sortOrder=${sortOrder}&`;
    }
    const data = await api.get(url);
    if (data && data.success) {
      if (data.data.length === 0) {
        container.innerHTML = `
          <div class="col-12 text-center py-5">
            <i class="fas fa-hourglass fa-3x text-muted mb-3"></i>
            <p class="text-muted">No quizzes are currently published for the selected filters.</p>
          </div>`;
      } else {
        container.innerHTML = data.data.map(quiz => {
          let actionButton = '';
          if (quiz.alreadyAttempted) {
            actionButton = `
              <a href="/student/result?id=${quiz.attemptId}" class="btn btn-premium-secondary w-100">
                <i class="fas fa-poll-h"></i> View Result
              </a>`;
          } else {
            actionButton = `
              <a href="/student/quiz?id=${quiz.id}" class="btn btn-premium-primary w-100">
                <i class="fas fa-play"></i> Start Quiz
              </a>`;
          }

          return `
            <div class="col-md-4 mb-4">
              <div class="quiz-card">
                <div class="quiz-card-header">
                  <div class="quiz-card-title">${quiz.title}</div>
                  <span class="erp-badge erp-badge-${quiz.alreadyAttempted ? 'success' : 'warning'}">
                    ${quiz.alreadyAttempted ? 'Completed' : 'Pending'}
                  </span>
                </div>
                <p class="quiz-card-description">${quiz.description || 'No description provided.'}</p>
                <div class="quiz-card-meta">
                  <div class="quiz-card-meta-item">
                    <i class="fas fa-book-open"></i> ${quiz.subjectName}
                  </div>
                  <div class="quiz-card-meta-item">
                    <i class="fas fa-clock"></i> ${quiz.duration} min
                  </div>
                  <div class="quiz-card-meta-item">
                    <i class="fas fa-award"></i> ${quiz.totalMarks} Marks
                  </div>
                  <div class="quiz-card-meta-item">
                    <i class="fas fa-list-ol"></i> ${quiz.questionsCount} Ques
                  </div>
                </div>
                ${actionButton}
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load available quizzes.', 'danger');
  }
}

// Dynamically load subjects for a specific class to populate subject dropdown
async function loadStudentSubjectSelector(classId, defaultSubjectId = '') {
  const subjectSelect = document.getElementById('subjectSelectFilter');
  if (!subjectSelect) return;

  if (!classId) {
    subjectSelect.innerHTML = '<option value="" selected>All Subjects</option>';
    subjectSelect.disabled = true;
    return;
  }

  subjectSelect.disabled = false;
  subjectSelect.innerHTML = '<option value="" disabled selected>Loading subjects...</option>';

  try {
    const data = await api.get(`/subjects?classId=${classId}`);
    if (data && data.success) {
      let optionsHtml = '<option value="" selected>All Subjects</option>';
      data.data.forEach(sub => {
        const isSelected = String(sub.id) === String(defaultSubjectId) ? 'selected' : '';
        optionsHtml += `<option value="${sub.id}" ${isSelected}>${sub.name}</option>`;
      });
      subjectSelect.innerHTML = optionsHtml;
    } else {
      subjectSelect.innerHTML = '<option value="" selected>All Subjects</option>';
    }
  } catch (err) {
    console.error('Failed to load subjects:', err);
    subjectSelect.innerHTML = '<option value="" selected>All Subjects</option>';
  }
}

// Populate classes select element on student portal and filter quizzes
async function initStudentQuizSelection() {
  let defaultClassId = '';
  try {
    const profile = await api.get('/students/profile');
    if (profile && profile.success) {
      defaultClassId = profile.data.classId;
    }
  } catch (err) {
    console.error('Failed to get student profile classId:', err);
  }

  const classSelect = document.getElementById('classSelectFilter');
  const subjectSelect = document.getElementById('subjectSelectFilter');

  if (classSelect) {
    try {
      const data = await api.get('/classes');
      if (data && data.success) {
        classSelect.innerHTML = '<option value="" disabled>Select Class/Grade</option>';
        data.data.forEach(cls => {
          const isSelected = String(cls._id) === String(defaultClassId) ? 'selected' : '';
          classSelect.innerHTML += `<option value="${cls._id}" ${isSelected}>${cls.name}</option>`;
        });
      }
    } catch (err) {
      classSelect.innerHTML = '<option value="">Failed to load classes</option>';
    }

    // Refresh subject select and quiz cards on class dropdown change
    classSelect.addEventListener('change', async () => {
      const classId = classSelect.value;
      await loadStudentSubjectSelector(classId);
      const subjectId = subjectSelect ? subjectSelect.value : '';
      loadQuizzesList(classId, subjectId);
    });
  }

  if (subjectSelect) {
    subjectSelect.addEventListener('change', () => {
      const classId = classSelect ? classSelect.value : defaultClassId;
      const subjectId = subjectSelect.value;
      loadQuizzesList(classId, subjectId);
    });
  }

  // Load initial subjects and quizzes of the selected class (defaults to student's class)
  const classId = classSelect ? classSelect.value : defaultClassId;
  if (classId) {
    await loadStudentSubjectSelector(classId);
  }
  const subjectId = subjectSelect ? subjectSelect.value : '';
  loadQuizzesList(classId, subjectId);
}

// Student results history
async function loadResultsHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  // Bind filter elements once
  if (!window.historyFilterBound) {
    window.historyFilterBound = true;

    // Dynamically load Classes
    try {
      api.get('/classes').then(classesRes => {
        const filterClass = document.getElementById('filter-class');
        if (filterClass && classesRes && classesRes.success) {
          filterClass.innerHTML = '<option value="">All Classes</option>' + 
            classesRes.data.map(c => `<option value="${c.id || c._id}">${c.name}</option>`).join('');
        }
      }).catch(err => console.error('Failed to load classes for filter:', err));
    } catch (e) {
      console.error(e);
    }

    // Dynamically load Courses
    try {
      api.get('/principal/courses').then(coursesRes => {
        const filterCourse = document.getElementById('filter-course');
        if (filterCourse && coursesRes && coursesRes.success) {
          filterCourse.innerHTML = '<option value="">All Courses</option>' + 
            coursesRes.data.map(c => `<option value="${c.id || c._id}">${c.name}</option>`).join('');
        }
      }).catch(err => console.error('Failed to load courses for filter:', err));
    } catch (e) {
      console.error(e);
    }

    // Dynamically load Semesters
    try {
      api.get('/principal/semesters').then(semestersRes => {
        const filterSem = document.getElementById('filter-semester');
        if (filterSem && semestersRes && semestersRes.success) {
          filterSem.innerHTML = '<option value="">All Semesters</option>' + 
            semestersRes.data.map(s => `<option value="${s.id || s._id}">${s.name} (${s.courseName})</option>`).join('');
        }
      }).catch(err => console.error('Failed to load semesters for filter:', err));
    } catch (e) {
      console.error(e);
    }

    // Dynamically load Subjects
    try {
      api.get('/academic/my-subjects').then(subjectsRes => {
        const filterSub = document.getElementById('filter-subject');
        if (filterSub && subjectsRes && subjectsRes.success) {
          filterSub.innerHTML = '<option value="">All Subjects</option>' + 
            subjectsRes.data.map(s => `<option value="${s.id || s._id}">${s.name}</option>`).join('');
        }
      }).catch(err => console.error('Failed to load subjects for filter:', err));
    } catch (e) {
      console.error(e);
    }

    const filters = ['filter-search', 'filter-type', 'filter-class', 'filter-course', 'filter-semester', 'filter-subject', 'filter-date', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadResultsHistory);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadResultsHistory, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const type = document.getElementById('filter-type')?.value || '';
  const classId = document.getElementById('filter-class')?.value || '';
  const courseId = document.getElementById('filter-course')?.value || '';
  const semesterId = document.getElementById('filter-semester')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const endDate = document.getElementById('filter-date')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'createdAt-desc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type) params.append('type', type);
  if (classId) params.append('classId', classId);
  if (courseId) params.append('courseId', courseId);
  if (semesterId) params.append('semesterId', semesterId);
  if (subjectId) params.append('subjectId', subjectId);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/results?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        container.innerHTML = '<tr><td colspan="10" class="text-center text-muted">No assessments matching your filters.</td></tr>';
      } else {
        container.innerHTML = res.data.map(r => {
          const isPass = String(r.status).toLowerCase() === 'pass';
          const statusBadge = isPass 
            ? '<span class="badge bg-success fw-bold py-2 px-3">PASS</span>' 
            : '<span class="badge bg-danger fw-bold py-2 px-3">FAIL</span>';

          return `
            <tr>
              <td><strong>${r.quizTitle}</strong></td>
              <td>${r.subjectName || 'N/A'}</td>
              <td>${r.totalMarks}</td>
              <td class="fw-bold">${r.score}</td>
              <td>${r.passMarks !== undefined ? r.passMarks : 40}</td>
              <td>${statusBadge}</td>
              <td>${r.percentage}%</td>
              <td>${new Date(r.createdAt).toLocaleDateString()}</td>
              <td>
                <a href="/student/result?id=${r.id}" class="btn btn-sm btn-premium-primary" style="padding: 4px 10px; font-size: 12px">
                  <i class="fas fa-eye"></i> Details
                </a>
              </td>
            </tr>
          `;
        }).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load results history.', 'danger');
  }
}

// Student profile management
async function loadStudentProfileDetails() {
  const nameInput = document.getElementById('profName');
  const emailInput = document.getElementById('profEmail');
  const rollInput = document.getElementById('profRoll');
  const classInput = document.getElementById('profClass');
  const imgAvatar = document.getElementById('profile-avatar-large');

  if (!nameInput) return;

  try {
    const res = await api.get('/students/profile');
    if (res && res.success) {
      nameInput.value = res.data.name;
      emailInput.value = res.data.email;
      rollInput.value = res.data.rollNo;
      classInput.value = res.data.className;
      if (imgAvatar && res.data.profilePic) {
        imgAvatar.src = res.data.profilePic;
      }
    }
  } catch (err) {
    showToast('Failed to load profile details.', 'danger');
  }
}

async function setupStudentProfileForm() {
  await loadStudentProfileDetails();

  const form = document.getElementById('student-profile-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('profName').value.trim();
      const password = document.getElementById('profPassword').value;
      const fileInput = document.getElementById('profPic');

      const formData = new FormData();
      if (name) formData.append('name', name);
      if (password) formData.append('password', password);
      if (fileInput && fileInput.files[0]) {
        formData.append('profilePic', fileInput.files[0]);
      }

      try {
        const res = await api.putMultipart('/students/profile', formData);
        if (res && res.success) {
          // Update cached user details
          const cachedUser = api.getUser();
          api.setUser({
            ...cachedUser,
            name: res.data.name,
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

// 7. Student Subjects Portal
async function loadStudentSubjects() {
  const tbody = document.getElementById('subjects-tbody');
  if (!tbody) return;
  try {
    const res = await api.get('/academic/my-subjects');
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No subjects assigned for your semester yet.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.departmentName}</td>
          <td>${s.courseName}</td>
          <td><span class="badge bg-primary px-3 py-1">${s.semesterName}</span></td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 8. Download Notes
async function loadStudentNotes() {
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
        el.addEventListener('change', loadStudentNotes);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadStudentNotes, 300));
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No lecture notes available matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(n => `
        <tr>
          <td><strong>${n.title}</strong></td>
          <td>${n.subjectName}</td>
          <td>${n.teacherName}</td>
          <td class="text-end">
            <a href="${n.filePath}" download class="btn btn-sm btn-success"><i class="fas fa-download me-1"></i> Download Note</a>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 9. Assignments Portal
async function loadStudentAssignments() {
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

    const filters = ['filter-search', 'filter-subject', 'filter-status', 'filter-end-date', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadStudentAssignments);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadStudentAssignments, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const endDate = document.getElementById('filter-end-date')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'dueDate-asc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (subjectId) params.append('subjectId', subjectId);
  if (status) params.append('status', status);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/academic/assignments?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No assignments listed matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(a => {
        let badgeColor = 'secondary';
        if (a.submissionStatus === 'Graded') badgeColor = 'success';
        else if (a.submissionStatus === 'Pending') badgeColor = 'info';

        return `
          <tr>
            <td><strong>${a.title}</strong></td>
            <td>${a.subjectName}</td>
            <td>${new Date(a.dueDate).toLocaleDateString()}</td>
            <td>
              <span class="badge bg-${badgeColor}">${a.submissionStatus}</span>
            </td>
            <td><strong>${a.submissionScore}</strong></td>
            <td class="text-end">
              ${a.submissionStatus === 'Unsubmitted' ? `
                <button onclick="openSubmitModal('${a.id}', '${a.title}')" class="btn btn-sm btn-primary"><i class="fas fa-upload"></i> Submit Solution</button>
              ` : `
                <span class="text-muted small">Completed</span>
              `}
            </td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function openSubmitModal(id, title) {
  document.getElementById('submit-assignment-id').value = id;
  document.getElementById('submit-assignment-title').textContent = title;
  new bootstrap.Modal(document.getElementById('submitAssignmentModal')).show();
}

async function submitAssignmentSolution(e) {
  e.preventDefault();
  const id = document.getElementById('submit-assignment-id').value;
  const fileInput = document.getElementById('submissionFile');

  if (fileInput.files.length === 0) return;

  const formData = new FormData();
  formData.append('submissionFile', fileInput.files[0]);

  try {
    const res = await api.postMultipart(`/academic/assignments/${id}/submit`, formData);
    if (res && res.success) {
      showToast('Assignment solution uploaded successfully!', 'success');
      document.getElementById('submit-assignment-form').reset();
      bootstrap.Modal.getInstance(document.getElementById('submitAssignmentModal')).hide();
      await loadStudentAssignments();
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

// 10. Attendance Stats
async function loadAttendanceStats() {
  const container = document.getElementById('attendance-logs-tbody');
  const percentText = document.getElementById('attendance-percentage');
  const totalLogsText = document.getElementById('total-attendance-logs');

  if (!container) return;

  try {
    const res = await api.get('/academic/attendance/student');
    if (res && res.success) {
      const stats = res.data;
      if (percentText) percentText.textContent = `${stats.percentage}%`;
      if (totalLogsText) totalLogsText.textContent = `${stats.present} / ${stats.total} Classes Present`;

      if (stats.logs.length === 0) {
        container.innerHTML = '<tr><td colspan="3" class="text-center text-muted">No attendance logs registered yet.</td></tr>';
        return;
      }

      container.innerHTML = stats.logs.map(log => `
        <tr>
          <td><strong>${new Date(log.date).toLocaleDateString()}</strong></td>
          <td>Semester Lecture</td>
          <td>
            <span class="badge bg-${log.status === 'Present' || log.status === 'Late' ? 'success' : 'danger'}">
              ${log.status}
            </span>
          </td>
        </tr>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load attendance tracker: ' + err.message, 'danger');
  }
}

// 11. Examinations Attempting
async function loadStudentExams() {
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

    const filters = ['filter-search', 'filter-subject', 'filter-status', 'filter-end-date', 'filter-sort'];
    filters.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', loadStudentExams);
        if (el.tagName === 'INPUT') {
          el.addEventListener('input', debounce(loadStudentExams, 300));
        }
      }
    });
  }

  // Read filter values
  const search = document.getElementById('filter-search')?.value || '';
  const subjectId = document.getElementById('filter-subject')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';
  const endDate = document.getElementById('filter-end-date')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'examDate-asc';

  const [sortBy, sortOrder] = sortVal.split('-');

  // Build query
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (subjectId) params.append('subjectId', subjectId);
  if (status) params.append('status', status);
  if (endDate) params.append('endDate', endDate);
  if (sortBy) params.append('sortBy', sortBy);
  if (sortOrder) params.append('sortOrder', sortOrder);

  try {
    const res = await api.get(`/exams?${params.toString()}`);
    if (res && res.success) {
      if (res.data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No examinations scheduled matching your filters.</td></tr>';
        return;
      }
      tbody.innerHTML = res.data.map(ex => {
        let actionBtn = '';
        if (ex.alreadyAttempted) {
          actionBtn = `<span class="badge bg-success py-2">Attempted (${ex.score} Marks, ${ex.status})</span>`;
        } else {
          actionBtn = `<button onclick="startExamAttempt('${ex.id}')" class="btn btn-sm btn-primary px-3 py-1"><i class="fas fa-play-circle me-1"></i> Start Exam</button>`;
        }

        return `
          <tr>
            <td><strong>${ex.title}</strong></td>
            <td>${ex.subjectName}</td>
            <td>${ex.courseName || 'N/A'}</td>
            <td>${ex.semesterName || 'N/A'}</td>
            <td>${new Date(ex.examDate).toLocaleDateString()}</td>
            <td>${ex.duration} min</td>
            <td>${ex.totalMarks} Marks</td>
            <td class="text-end">${actionBtn}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (err) {
    showToast(err.message, 'danger');
  }
}

function startExamAttempt(examId) {
  if (!confirm('Start term examination? The countdown timer will begin immediately.')) return;
  window.location.href = `/student/takeExam?id=${examId}`;
}
