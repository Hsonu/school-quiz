// Debounce Helper
function debounce(func, delay) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// Principal Dashboard and CRUD Handler
const principal = {
  // Load Dashboard stats
  loadDashboard: async () => {
    try {
      const res = await api.get('/principal/dashboard-stats');
      if (res && res.success) {
        const stats = res.data;
        principal.setCardValue('count-depts', stats.deptCount);
        principal.setCardValue('count-courses', stats.courseCount);
        principal.setCardValue('count-semesters', stats.semesterCount);
        principal.setCardValue('count-subjects', stats.subjectCount);
        principal.setCardValue('count-teachers', stats.teacherCount);
        principal.setCardValue('count-students', stats.studentCount);
        principal.setCardValue('count-pending-exams', stats.pendingExamsCount);

        const list = document.getElementById('recent-activity-list');
        if (list) {
          if (stats.recentActivity.length === 0) {
            list.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No recent activities found.</td></tr>';
          } else {
            list.innerHTML = stats.recentActivity.map(act => `
              <tr>
                <td><strong>${act.studentName}</strong></td>
                <td>${act.assessmentTitle}</td>
                <td><span class="badge bg-${act.status === 'Pass' ? 'success' : 'danger'}">${act.percentage}% (${act.status})</span></td>
                <td>${new Date(act.date).toLocaleDateString()}</td>
              </tr>
            `).join('');
          }
        }
      }
    } catch (err) {
      showToast('Error loading dashboard: ' + err.message, 'danger');
    }
  },

  setCardValue: (id, val) => {
    const elem = document.getElementById(id);
    if (elem) elem.textContent = val;
  },

  // --- Departments Operations ---
  loadDepartments: async () => {
    const tbody = document.getElementById('depts-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/departments');
      if (res && res.success) {
        const depts = res.data;
        if (depts.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No departments found.</td></tr>';
          return;
        }
        tbody.innerHTML = depts.map(d => `
          <tr>
            <td><strong>${d.name}</strong></td>
            <td>${d._id}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditDeptModal('${d._id}', '${d.name}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteDept('${d._id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  createDept: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-dept-name').value.trim();
    try {
      const res = await api.post('/principal/departments', { name });
      if (res && res.success) {
        showToast('Department created successfully.', 'success');
        document.getElementById('add-dept-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addDeptModal')).hide();
        await principal.loadDepartments();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditDeptModal: (id, name) => {
    document.getElementById('edit-dept-id').value = id;
    document.getElementById('edit-dept-name').value = name;
    new bootstrap.Modal(document.getElementById('editDeptModal')).show();
  },

  updateDept: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-dept-id').value;
    const name = document.getElementById('edit-dept-name').value.trim();
    try {
      const res = await api.put(`/principal/departments/${id}`, { name });
      if (res && res.success) {
        showToast('Department updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editDeptModal')).hide();
        await principal.loadDepartments();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteDept: async (id) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await api.delete(`/principal/departments/${id}`);
      if (res && res.success) {
        showToast('Department deleted.', 'success');
        await principal.loadDepartments();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Courses Operations ---
  loadCourses: async () => {
    const tbody = document.getElementById('courses-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/courses');
      if (res && res.success) {
        const courses = res.data;
        if (courses.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No courses found.</td></tr>';
          return;
        }
        tbody.innerHTML = courses.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.departmentName}</td>
            <td>${c.durationYears} Years</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditCourseModal('${c.id}', '${c.name}', '${c.departmentId}', ${c.durationYears})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteCourse('${c.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  populateDeptDropdown: async (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/principal/departments');
      if (res && res.success) {
        select.innerHTML = '<option value="" disabled selected>Select Department</option>' +
          res.data.map(d => `<option value="${d._id}">${d.name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  createCourse: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-course-name').value.trim();
    const departmentId = document.getElementById('add-course-dept').value;
    const durationYears = document.getElementById('add-course-duration').value;
    try {
      const res = await api.post('/principal/courses', { name, departmentId, durationYears });
      if (res && res.success) {
        showToast('Course created.', 'success');
        document.getElementById('add-course-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addCourseModal')).hide();
        await principal.loadCourses();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditCourseModal: (id, name, deptId, duration) => {
    document.getElementById('edit-course-id').value = id;
    document.getElementById('edit-course-name').value = name;
    document.getElementById('edit-course-dept').value = deptId;
    document.getElementById('edit-course-duration').value = duration;
    new bootstrap.Modal(document.getElementById('editCourseModal')).show();
  },

  updateCourse: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-course-id').value;
    const name = document.getElementById('edit-course-name').value.trim();
    const departmentId = document.getElementById('edit-course-dept').value;
    const durationYears = document.getElementById('edit-course-duration').value;
    try {
      const res = await api.put(`/principal/courses/${id}`, { name, departmentId, durationYears });
      if (res && res.success) {
        showToast('Course updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editCourseModal')).hide();
        await principal.loadCourses();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteCourse: async (id) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      const res = await api.delete(`/principal/courses/${id}`);
      if (res && res.success) {
        showToast('Course deleted.', 'success');
        await principal.loadCourses();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Semesters Operations ---
  loadSemesters: async () => {
    const tbody = document.getElementById('semesters-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/semesters');
      if (res && res.success) {
        const semesters = res.data;
        if (semesters.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-3">No semesters found.</td></tr>';
          return;
        }
        tbody.innerHTML = semesters.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.courseName}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditSemModal('${s.id}', '${s.name}', '${s.courseId}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteSem('${s.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  populateCourseDropdown: async (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/principal/courses');
      if (res && res.success) {
        select.innerHTML = '<option value="" disabled selected>Select Course</option>' +
          res.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  createSemester: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-sem-name').value.trim();
    const courseId = document.getElementById('add-sem-course').value;
    try {
      const res = await api.post('/principal/semesters', { name, courseId });
      if (res && res.success) {
        showToast('Semester added successfully.', 'success');
        document.getElementById('add-sem-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addSemModal')).hide();
        await principal.loadSemesters();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditSemModal: (id, name, courseId) => {
    document.getElementById('edit-sem-id').value = id;
    document.getElementById('edit-sem-name').value = name;
    document.getElementById('edit-sem-course').value = courseId;
    new bootstrap.Modal(document.getElementById('editSemModal')).show();
  },

  updateSemester: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-sem-id').value;
    const name = document.getElementById('edit-sem-name').value.trim();
    const courseId = document.getElementById('edit-sem-course').value;
    try {
      const res = await api.put(`/principal/semesters/${id}`, { name, courseId });
      if (res && res.success) {
        showToast('Semester updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editSemModal')).hide();
        await principal.loadSemesters();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteSem: async (id) => {
    if (!confirm('Are you sure you want to delete this semester?')) return;
    try {
      const res = await api.delete(`/principal/semesters/${id}`);
      if (res && res.success) {
        showToast('Semester deleted.', 'success');
        await principal.loadSemesters();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Subjects Operations ---
  loadSubjects: async () => {
    const tbody = document.getElementById('subjects-tbody');
    if (!tbody) return;

    // Bind filters once
    if (!window.subjectsFilterBound) {
      window.subjectsFilterBound = true;

      // Populate filter dropdowns
      try {
        const [deptsRes, coursesRes, semsRes] = await Promise.all([
          api.get('/principal/departments'),
          api.get('/principal/courses'),
          api.get('/principal/semesters')
        ]);

        const filterDept = document.getElementById('filter-dept');
        if (filterDept && deptsRes && deptsRes.success) {
          filterDept.innerHTML = '<option value="">All Departments</option>' +
            deptsRes.data.map(d => `<option value="${d._id}">${d.name}</option>`).join('');
        }

        const filterCourse = document.getElementById('filter-course');
        if (filterCourse && coursesRes && coursesRes.success) {
          filterCourse.innerHTML = '<option value="">All Courses</option>' +
            coursesRes.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        }

        const filterSem = document.getElementById('filter-sem');
        if (filterSem && semsRes && semsRes.success) {
          filterSem.innerHTML = '<option value="">All Semesters</option>' +
            semsRes.data.map(s => `<option value="${s.id}">${s.name} (${s.courseName})</option>`).join('');
        }
      } catch (err) {
        console.error('Failed to populate subject filter selectors:', err);
      }

      // Bind events
      const filters = ['filter-search', 'filter-dept', 'filter-course', 'filter-sem', 'filter-class', 'filter-sort'];
      filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.addEventListener('change', principal.loadSubjects);
          if (el.tagName === 'INPUT') {
            el.addEventListener('input', debounce(principal.loadSubjects, 300));
          }
        }
      });
    }

    // Read filter values
    const search = document.getElementById('filter-search')?.value || '';
    const deptId = document.getElementById('filter-dept')?.value || '';
    const courseId = document.getElementById('filter-course')?.value || '';
    const semId = document.getElementById('filter-sem')?.value || '';
    const classId = document.getElementById('filter-class')?.value || '';
    const sortVal = document.getElementById('filter-sort')?.value || 'name-asc';

    const [sortBy, sortOrder] = sortVal.split('-');

    // Build query
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (deptId) params.append('departmentId', deptId);
    if (courseId) params.append('courseId', courseId);
    if (semId) params.append('semesterId', semId);
    if (classId) params.append('classId', classId);
    if (sortBy) params.append('sortBy', sortBy);
    if (sortOrder) params.append('sortOrder', sortOrder);

    try {
      const res = await api.get(`/principal/subjects?${params.toString()}`);
      if (res && res.success) {
        const subjects = res.data;
        if (subjects.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No subjects matching your filters.</td></tr>';
          return;
        }
        tbody.innerHTML = subjects.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge bg-secondary">${s.className || 'N/A'}</span></td>
            <td>${s.departmentName}</td>
            <td>${s.courseName}</td>
            <td>${s.semesterName}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditSubjectModal('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.departmentId}', '${s.courseId}', '${s.semesterId}', '${s.classId || ''}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteSubject('${s.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  populateSemesterDropdown: async (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/principal/semesters');
      if (res && res.success) {
        select.innerHTML = '<option value="" disabled selected>Select Semester</option>' +
          res.data.map(s => `<option value="${s.id}">${s.name} (${s.courseName})</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  populateClassDropdown: async (selectId, isFilter = false) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/classes');
      if (res && res.success) {
        select.innerHTML = (isFilter ? '<option value="">All Classes</option>' : '<option value="">Select Class (Optional)</option>') +
          res.data.map(cls => `<option value="${cls._id || cls.id}">${cls.name}</option>`).join('');
      }
    } catch (err) {
      console.error('Failed to populate class dropdown:', err);
    }
  },

  createSubject: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-subject-name').value.trim();
    const departmentId = document.getElementById('add-subject-dept').value;
    const courseId = document.getElementById('add-subject-course').value;
    const semesterId = document.getElementById('add-subject-sem').value;
    const classId = document.getElementById('add-subject-class').value;
    try {
      const res = await api.post('/principal/subjects', { name, departmentId, courseId, semesterId, classId });
      if (res && res.success) {
        showToast('Subject created successfully.', 'success');
        document.getElementById('add-subject-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addSubjectModal')).hide();
        await principal.loadSubjects();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditSubjectModal: (id, name, deptId, courseId, semId, classId) => {
    document.getElementById('edit-subject-id').value = id;
    document.getElementById('edit-subject-name').value = name;
    document.getElementById('edit-subject-dept').value = deptId;
    document.getElementById('edit-subject-course').value = courseId;
    document.getElementById('edit-subject-sem').value = semId;
    const editClassSelect = document.getElementById('edit-subject-class');
    if (editClassSelect) {
      editClassSelect.value = classId || '';
    }
    new bootstrap.Modal(document.getElementById('editSubjectModal')).show();
  },

  updateSubject: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-subject-id').value;
    const name = document.getElementById('edit-subject-name').value.trim();
    const departmentId = document.getElementById('edit-subject-dept').value;
    const courseId = document.getElementById('edit-subject-course').value;
    const semesterId = document.getElementById('edit-subject-sem').value;
    const classId = document.getElementById('edit-subject-class').value;
    try {
      const res = await api.put(`/principal/subjects/${id}`, { name, departmentId, courseId, semesterId, classId });
      if (res && res.success) {
        showToast('Subject details updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editSubjectModal')).hide();
        await principal.loadSubjects();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteSubject: async (id) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      const res = await api.delete(`/principal/subjects/${id}`);
      if (res && res.success) {
        showToast('Subject deleted.', 'success');
        await principal.loadSubjects();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Teachers Management & Subject Mapping ---
  loadTeachers: async () => {
    const tbody = document.getElementById('teachers-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/teachers');
      if (res && res.success) {
        const teachers = res.data;
        if (teachers.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No teachers registered yet.</td></tr>';
          return;
        }
        tbody.innerHTML = teachers.map(t => {
          const subsText = t.subjects.map(s => `<span class="badge bg-secondary me-1">${s.name}</span>`).join(' ');
          return `
            <tr>
              <td><strong>${t.name}</strong></td>
              <td>${t.email}</td>
              <td>${t.designation}</td>
              <td><strong>${t.departmentName}</strong></td>
              <td>${subsText || '<span class="text-muted small">None Assigned</span>'}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-info me-1" onclick="principal.openAssignModal('${t.id}', '${t.name}')" title="Assign Subjects"><i class="fas fa-book-open"></i></button>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditTeacherModal('${t.id}', '${t.name}', '${t.email}', '${t.designation}', '${t.departmentId}', ${t.isActive})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteTeacher('${t.id}')"><i class="fas fa-trash-alt"></i></button>
              </td>
            </tr>
          `;
        }).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditTeacherModal: (id, name, email, designation, deptId, isActive) => {
    document.getElementById('edit-teacher-id').value = id;
    document.getElementById('edit-teacher-name').value = name;
    document.getElementById('edit-teacher-email').value = email;
    document.getElementById('edit-teacher-designation').value = designation;
    document.getElementById('edit-teacher-dept').value = deptId;
    document.getElementById('edit-teacher-status').value = isActive ? 'true' : 'false';
    new bootstrap.Modal(document.getElementById('editTeacherModal')).show();
  },

  updateTeacher: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-teacher-id').value;
    const name = document.getElementById('edit-teacher-name').value.trim();
    const email = document.getElementById('edit-teacher-email').value.trim();
    const designation = document.getElementById('edit-teacher-designation').value.trim();
    const departmentId = document.getElementById('edit-teacher-dept').value;
    const isActive = document.getElementById('edit-teacher-status').value === 'true';
    try {
      const res = await api.put(`/principal/teachers/${id}`, { name, email, designation, departmentId, isActive });
      if (res && res.success) {
        showToast('Teacher details updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editTeacherModal')).hide();
        await principal.loadTeachers();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteTeacher: async (id) => {
    if (!confirm('Are you sure you want to delete this Teacher account?')) return;
    try {
      const res = await api.delete(`/principal/teachers/${id}`);
      if (res && res.success) {
        showToast('Teacher deleted.', 'success');
        await principal.loadTeachers();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openAssignModal: async (teacherId, teacherName) => {
    document.getElementById('assign-teacher-id').value = teacherId;
    document.getElementById('assign-teacher-name-label').textContent = teacherName;

    // Load checkboxes
    const container = document.getElementById('assign-subjects-checkboxes');
    container.innerHTML = '<p class="text-muted small">Loading subjects checklist...</p>';

    try {
      const subRes = await api.get('/principal/subjects');
      const teachersRes = await api.get('/principal/teachers');

      if (subRes && subRes.success && teachersRes && teachersRes.success) {
        const subjects = subRes.data;
        const currentTeacher = teachersRes.data.find(t => String(t.id) === String(teacherId));
        const assignedIds = currentTeacher ? currentTeacher.subjects.map(s => String(s.id)) : [];

        if (subjects.length === 0) {
          container.innerHTML = '<p class="text-muted small">No subjects defined yet. Create subjects first.</p>';
          return;
        }

        container.innerHTML = subjects.map(s => {
          const checked = assignedIds.includes(String(s.id)) ? 'checked' : '';
          return `
            <div class="form-check col-md-6 mb-2">
              <input class="form-check-input assign-sub-checkbox" type="checkbox" value="${s.id}" id="chk-${s.id}" ${checked}>
              <label class="form-check-label small" for="chk-${s.id}">
                ${s.name} (${s.courseName} - ${s.semesterName})
              </label>
            </div>
          `;
        }).join('');
      }
    } catch (err) {
      container.innerHTML = '<p class="text-danger small">Failed to load subjects checklist.</p>';
    }

    new bootstrap.Modal(document.getElementById('assignSubjectsModal')).show();
  },

  submitSubjectAssignments: async (e) => {
    e.preventDefault();
    const teacherId = document.getElementById('assign-teacher-id').value;
    const checkboxes = document.querySelectorAll('.assign-sub-checkbox:checked');
    const subjectIds = Array.from(checkboxes).map(chk => chk.value);

    try {
      const res = await api.post('/principal/teachers/assign-subjects', { teacherId, subjectIds });
      if (res && res.success) {
        showToast('Subject mapping updated successfully!', 'success');
        bootstrap.Modal.getInstance(document.getElementById('assignSubjectsModal')).hide();
        await principal.loadTeachers();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Students Management ---
  loadStudents: async () => {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/students');
      if (res && res.success) {
        const students = res.data;
        if (students.length === 0) {
          tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No students enrolled yet.</td></tr>';
          return;
        }
        tbody.innerHTML = students.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td>${s.rollNo}</td>
            <td>${s.email}</td>
            <td>${s.departmentName}</td>
            <td>${s.courseName} (${s.semesterName})</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditStudentModal('${s.id}', '${s.name}', '${s.email}', '${s.rollNo}', '${s.departmentId}', '${s.courseId}', '${s.semesterId}', ${s.isActive})"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteStudent('${s.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  createStudent: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-student-name').value.trim();
    const email = document.getElementById('add-student-email').value.trim();
    const password = document.getElementById('add-student-password').value;
    const rollNo = document.getElementById('add-student-roll').value.trim();
    const departmentId = document.getElementById('add-student-dept').value;
    const courseId = document.getElementById('add-student-course').value;
    const semesterId = document.getElementById('add-student-sem').value;

    try {
      const res = await api.post('/principal/students', { name, email, password, rollNo, departmentId, courseId, semesterId });
      if (res && res.success) {
        showToast('Student enrolled successfully.', 'success');
        document.getElementById('add-student-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addStudentModal')).hide();
        await principal.loadStudents();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditStudentModal: (id, name, email, rollNo, deptId, courseId, semId, isActive) => {
    document.getElementById('edit-student-id').value = id;
    document.getElementById('edit-student-name').value = name;
    document.getElementById('edit-student-email').value = email;
    document.getElementById('edit-student-roll').value = rollNo;
    document.getElementById('edit-student-dept').value = deptId;
    document.getElementById('edit-student-course').value = courseId;
    document.getElementById('edit-student-sem').value = semId;
    document.getElementById('edit-student-status').value = isActive ? 'true' : 'false';
    new bootstrap.Modal(document.getElementById('editStudentModal')).show();
  },

  updateStudent: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-student-id').value;
    const name = document.getElementById('edit-student-name').value.trim();
    const email = document.getElementById('edit-student-email').value.trim();
    const rollNo = document.getElementById('edit-student-roll').value.trim();
    const departmentId = document.getElementById('edit-student-dept').value;
    const courseId = document.getElementById('edit-student-course').value;
    const semesterId = document.getElementById('edit-student-sem').value;
    const isActive = document.getElementById('edit-student-status').value === 'true';

    try {
      const res = await api.put(`/principal/students/${id}`, { name, email, rollNo, departmentId, courseId, semesterId, isActive });
      if (res && res.success) {
        showToast('Student profile updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editStudentModal')).hide();
        await principal.loadStudents();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteStudent: async (id) => {
    if (!confirm('Are you sure you want to delete this student record?')) return;
    try {
      const res = await api.delete(`/principal/students/${id}`);
      if (res && res.success) {
        showToast('Student record deleted.', 'success');
        await principal.loadStudents();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Timetable Management ---
  loadTimetables: async () => {
    const tbody = document.getElementById('timetable-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/timetables');
      if (res && res.success) {
        const entries = res.data;
        if (entries.length === 0) {
          tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No timetable entries scheduled.</td></tr>';
          return;
        }
        tbody.innerHTML = entries.map(e => `
          <tr>
            <td><strong>${e.day}</strong></td>
            <td>${e.semesterName}</td>
            <td><strong>${e.subjectName}</strong></td>
            <td>${e.teacherName}</td>
            <td>${e.startTime} - ${e.endTime}</td>
            <td>${e.room || 'N/A'}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="principal.openEditSlotModal('${e.id}', '${e.subjectId}', '${e.teacherId}', '${e.day}', '${e.startTime}', '${e.endTime}', '${e.room}', '${e.semesterId}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-sm btn-outline-danger" onclick="principal.deleteSlot('${e.id}')"><i class="fas fa-trash-alt"></i></button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  populateSubjectsDropdown: async (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/principal/subjects');
      if (res && res.success) {
        select.innerHTML = '<option value="" disabled selected>Select Subject</option>' +
          res.data.map(s => `<option value="${s.id}">${s.name} (${s.courseName} - ${s.semesterName})</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  populateTeachersDropdown: async (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return;
    try {
      const res = await api.get('/principal/teachers');
      if (res && res.success) {
        select.innerHTML = '<option value="" disabled selected>Select Teacher</option>' +
          res.data.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
      }
    } catch (err) {
      console.error(err);
    }
  },

  createTimetableSlot: async (e) => {
    e.preventDefault();
    const subjectId = document.getElementById('add-slot-subject').value;
    const teacherId = document.getElementById('add-slot-teacher').value;
    const day = document.getElementById('add-slot-day').value;
    const startTime = document.getElementById('add-slot-start').value;
    const endTime = document.getElementById('add-slot-end').value;
    const room = document.getElementById('add-slot-room').value.trim();
    const semesterId = document.getElementById('add-slot-sem').value;

    try {
      const res = await api.post('/principal/timetables', { subjectId, teacherId, day, startTime, endTime, room, semesterId });
      if (res && res.success) {
        showToast('Timetable entry created.', 'success');
        document.getElementById('add-slot-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addSlotModal')).hide();
        await principal.loadTimetables();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  openEditSlotModal: (id, subId, teachId, day, start, end, room, semId) => {
    document.getElementById('edit-slot-id').value = id;
    document.getElementById('edit-slot-subject').value = subId;
    document.getElementById('edit-slot-teacher').value = teachId;
    document.getElementById('edit-slot-day').value = day;
    document.getElementById('edit-slot-start').value = start;
    document.getElementById('edit-slot-end').value = end;
    document.getElementById('edit-slot-room').value = room;
    document.getElementById('edit-slot-sem').value = semId;
    new bootstrap.Modal(document.getElementById('editSlotModal')).show();
  },

  updateTimetableSlot: async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-slot-id').value;
    const subjectId = document.getElementById('edit-slot-subject').value;
    const teacherId = document.getElementById('edit-slot-teacher').value;
    const day = document.getElementById('edit-slot-day').value;
    const startTime = document.getElementById('edit-slot-start').value;
    const endTime = document.getElementById('edit-slot-end').value;
    const room = document.getElementById('edit-slot-room').value.trim();
    const semesterId = document.getElementById('edit-slot-sem').value;

    try {
      const res = await api.put(`/principal/timetables/${id}`, { subjectId, teacherId, day, startTime, endTime, room, semesterId });
      if (res && res.success) {
        showToast('Timetable slot updated.', 'success');
        bootstrap.Modal.getInstance(document.getElementById('editSlotModal')).hide();
        await principal.loadTimetables();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteSlot: async (id) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    try {
      const res = await api.delete(`/principal/timetables/${id}`);
      if (res && res.success) {
        showToast('Timetable slot deleted.', 'success');
        await principal.loadTimetables();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Exam Approval Workflow ---
  loadPendingExams: async () => {
    const tbody = document.getElementById('pending-exams-tbody');
    if (!tbody) return;
    try {
      const res = await api.get('/principal/exams/pending');
      if (res && res.success) {
        const exams = res.data;
        principal.pendingExams = exams;
        if (exams.length === 0) {
          tbody.innerHTML = '<tr><td colspan="9" class="text-center text-muted py-3">No examinations are pending approval.</td></tr>';
          return;
        }
        tbody.innerHTML = exams.map(ex => `
          <tr>
            <td><strong>${ex.title}</strong></td>
            <td>${ex.subjectName}</td>
            <td>${ex.courseName || 'N/A'}</td>
            <td>${ex.semesterName || 'N/A'}</td>
            <td>${ex.teacherName}</td>
            <td>${ex.duration} min</td>
            <td>${ex.totalMarks} Marks</td>
            <td>${new Date(ex.examDate).toLocaleDateString()}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-primary me-1 fw-bold" onclick="principal.viewExamDetails('${ex.id}')"><i class="fas fa-eye"></i> View Questions</button>
              <button class="btn btn-sm btn-success me-1 fw-bold" onclick="principal.approveExam('${ex.id}')"><i class="fas fa-check"></i> Approve</button>
              <button class="btn btn-sm btn-danger fw-bold" onclick="principal.rejectExam('${ex.id}')"><i class="fas fa-times"></i> Reject</button>
            </td>
          </tr>
        `).join('');
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  viewExamDetails: (id) => {
    const exams = principal.pendingExams || [];
    const ex = exams.find(e => e.id === id);
    if (!ex) return;

    document.getElementById('modal-exam-title').textContent = ex.title || 'N/A';
    document.getElementById('modal-exam-subject').textContent = ex.subjectName || 'N/A';
    document.getElementById('modal-exam-course-sem').textContent = `${ex.courseName || 'N/A'} - ${ex.semesterName || 'N/A'}`;
    document.getElementById('modal-exam-teacher').textContent = ex.teacherName || 'N/A';
    document.getElementById('modal-exam-duration').textContent = `${ex.duration || 0} minutes`;
    document.getElementById('modal-exam-total-marks').textContent = `${ex.totalMarks || 0} Marks`;

    const descContainer = document.getElementById('modal-exam-desc-container');
    const descElem = document.getElementById('modal-exam-desc');
    if (ex.description) {
      descElem.textContent = ex.description;
      descContainer.style.display = 'block';
    } else {
      descContainer.style.display = 'none';
    }

    const qContainer = document.getElementById('modal-exam-questions');
    qContainer.innerHTML = '';

    if (!ex.questions || ex.questions.length === 0) {
      qContainer.innerHTML = '<div class="alert alert-warning mb-0">No questions added to this examination.</div>';
    } else {
      qContainer.innerHTML = ex.questions.map((q, idx) => {
        const optionsHtml = q.options.map((opt, oIdx) => {
          const isCorrect = q.correctAnswer === oIdx;
          return `
            <div class="p-2 border rounded mb-1 d-flex justify-content-between align-items-center ${isCorrect ? 'bg-success-subtle border-success text-success-emphasis fw-semibold' : 'bg-light'}">
              <div>Option ${oIdx + 1}: ${opt}</div>
              ${isCorrect ? '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i> Correct Option</span>' : ''}
            </div>
          `;
        }).join('');

        return `
          <div class="list-group-item p-3 mb-3 border rounded shadow-sm">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h6 class="mb-0 fw-bold">Q${idx + 1}. ${q.questionText}</h6>
              <span class="badge bg-primary text-white">${q.points || 1} Marks</span>
            </div>
            <div class="ms-2 mt-2">
              ${optionsHtml}
            </div>
          </div>
        `;
      }).join('');
    }

    new bootstrap.Modal(document.getElementById('viewExamModal')).show();
  },

  approveExam: async (id) => {
    if (!confirm('Approve this exam? Students will be allowed to take this exam on the scheduled date.')) return;
    try {
      const res = await api.put(`/principal/exams/${id}/approve`);
      if (res && res.success) {
        showToast('Exam approved and published.', 'success');
        await principal.loadPendingExams();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  rejectExam: async (id) => {
    if (!confirm('Reject and delete this exam entry?')) return;
    try {
      const res = await api.delete(`/principal/exams/${id}/reject`);
      if (res && res.success) {
        showToast('Exam rejected and deleted.', 'warning');
        await principal.loadPendingExams();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  // --- Reports Query ---
  loadReports: async () => {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;

    const reportType = document.getElementById('report-type').value;
    const tableHeader = document.querySelector('.table-light tr');

    if (reportType === 'attendance') {
      if (tableHeader) {
        tableHeader.innerHTML = `
          <th>Student Name</th>
          <th>Roll Number</th>
          <th>Class/Grade</th>
          <th>Subject</th>
          <th>Assessment / Log</th>
          <th>Status</th>
          <th>Timestamp</th>
        `;
      }
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Querying reports database...</td></tr>';
    } else {
      if (tableHeader) {
        tableHeader.innerHTML = `
          <th>Student Name</th>
          <th>Roll Number</th>
          <th>Subject</th>
          <th>Total Marks</th>
          <th>Obtained Marks</th>
          <th>Pass Marks</th>
          <th>Status (PASS/FAIL)</th>
          <th>Percentage</th>
          <th>Timestamp</th>
        `;
      }
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Querying reports database...</td></tr>';
    }

    try {
      const res = await api.get(`/owner/reports?type=${reportType}`);
      if (res && res.success) {
        const data = res.data;
        if (data.length === 0) {
          const colSpan = reportType === 'attendance' ? 7 : 9;
          tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center py-4 text-muted">No ${reportType} logs found for the selected query.</td></tr>`;
          return;
        }

        if (reportType === 'attendance') {
          tbody.innerHTML = data.map(row => `
            <tr>
              <td><strong>${row.studentName}</strong></td>
              <td><code>${row.rollNo}</code></td>
              <td>${row.className}</td>
              <td>${row.subject}</td>
              <td>${row.assessment}</td>
              <td><span class="badge bg-${row.status === 'Present' ? 'success' : 'danger'}">${row.status}</span></td>
              <td>${row.date}</td>
            </tr>
          `).join('');
        } else {
          tbody.innerHTML = data.map(row => {
            const isPass = String(row.status).toLowerCase() === 'pass';
            const statusBadge = isPass
              ? '<span class="badge bg-success fw-bold py-2 px-3">PASS</span>'
              : '<span class="badge bg-danger fw-bold py-2 px-3">FAIL</span>';

            return `
              <tr>
                <td><strong>${row.studentName}</strong></td>
                <td><code>${row.rollNo}</code></td>
                <td>${row.subject || 'N/A'}</td>
                <td>${row.totalMarks !== undefined ? row.totalMarks : '-'}</td>
                <td class="fw-bold">${row.marksObtained !== undefined ? row.marksObtained : '-'}</td>
                <td>${row.passMarks !== undefined ? row.passMarks : '-'}</td>
                <td>${statusBadge}</td>
                <td>${row.percentage}</td>
                <td>${row.date}</td>
              </tr>
            `;
          }).join('');
        }
      }
    } catch (err) {
      const colSpan = reportType === 'attendance' ? 7 : 9;
      tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-danger py-4">Failed to load reports: ${err.message}</td></tr>`;
    }
  },

  setupProfileForm: async () => {
    const nameInput = document.getElementById('profName');
    const emailInput = document.getElementById('profEmail');
    const desInput = document.getElementById('profDesignation');
    const imgAvatar = document.getElementById('profile-avatar-large');

    if (!nameInput) return;

    try {
      const res = await api.get('/principal/profile');
      if (res && res.success) {
        nameInput.value = res.data.name;
        emailInput.value = res.data.email;
        desInput.value = res.data.designation || 'Principal';
        if (imgAvatar && res.data.profilePic) {
          imgAvatar.src = res.data.profilePic;
        }
      }
    } catch (err) {
      showToast('Failed to load profile details.', 'danger');
    }

    const form = document.getElementById('principal-profile-form');
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
          const res = await api.putMultipart('/principal/profile', formData);
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
  },

  loadClassesPage: async () => {
    const tbody = document.getElementById('classes-tbody');
    const teacherSelect = document.getElementById('add-class-teacher');
    if (!tbody) return;

    // Load classes
    try {
      const res = await api.get('/classes');
      if (res && res.success) {
        if (res.data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No classes registered yet.</td></tr>';
        } else {
          tbody.innerHTML = res.data.map(cls => `
            <tr>
              <td><strong>${cls.name}</strong></td>
              <td>${cls.teacherName || 'System Admin'}</td>
              <td><code>${cls._id || cls.id}</code></td>
              <td class="text-end">
                <button class="btn btn-sm btn-danger me-1" onclick="principal.deleteClass('${cls._id || cls.id}')">
                  <i class="fas fa-trash-alt"></i> Delete
                </button>
              </td>
            </tr>
          `).join('');
        }
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Failed to load classes: ${err.message}</td></tr>`;
    }

    // Load teachers selector
    if (teacherSelect) {
      try {
        const tRes = await api.get('/principal/teachers');
        if (tRes && tRes.success) {
          teacherSelect.innerHTML = '<option value="" disabled selected>Select Class Teacher</option>' +
            tRes.data.map(t => `<option value="${t.id || t._id}">${t.name} (${t.designation || 'Teacher'})</option>`).join('');
        }
      } catch (err) {
        console.error('Failed to load teachers for class selector:', err);
      }
    }
  },

  createClass: async (e) => {
    e.preventDefault();
    const name = document.getElementById('add-class-name').value.trim();
    const teacherId = document.getElementById('add-class-teacher').value;

    try {
      const res = await api.post('/classes', { name, teacherId });
      if (res && res.success) {
        showToast('Class created successfully.', 'success');
        document.getElementById('add-class-form').reset();
        bootstrap.Modal.getInstance(document.getElementById('addClassModal')).hide();
        await principal.loadClassesPage();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  },

  deleteClass: async (id) => {
    if (!confirm('Are you absolutely sure you want to delete this class? This cannot be undone.')) return;

    try {
      const res = await api.delete(`/classes/${id}`);
      if (res && res.success) {
        showToast('Class deleted successfully.', 'success');
        await principal.loadClassesPage();
      }
    } catch (err) {
      showToast(err.message, 'danger');
    }
  }
};
window.principal = principal;
