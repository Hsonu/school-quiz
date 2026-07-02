document.addEventListener('DOMContentLoaded', () => {
  // Login Role Switching Tabs
  const tabs = document.querySelectorAll('.role-tab');
  const roleInput = document.getElementById('login-role');
  
  if (tabs && tabs.length > 0) {
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const selectedRole = tab.getAttribute('data-role');
        if (roleInput) {
          roleInput.value = selectedRole;
        }

        // Change card titles or headings if needed
        const roleLabel = document.getElementById('selected-role-label');
        if (roleLabel) {
          roleLabel.textContent = selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1);
        }
      });
    });
  }

  // Handle Login form submit
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const role = roleInput ? roleInput.value : 'teacher';

      if (!email || !password) {
        showToast('Please fill in all fields.', 'danger');
        return;
      }

      showSpinner();

      try {
        let endpoint = '/teachers/login';
        if (role === 'student') endpoint = '/students/login';
        else if (role === 'principal') endpoint = '/principal/login';

        const response = await api.post(endpoint, { email, password });

        if (response && response.success) {
          api.setToken(response.data.token);
          
          // Save user and embed role
          const userData = {
            ...response.data.teacher,
            ...response.data.student,
            ...response.data.principal,
            role
          };
          api.setUser(userData);

          showToast('Login successful! Redirecting...', 'success');
          
          setTimeout(() => {
            let redirectUrl = '/teacher/dashboard';
            if (role === 'student') redirectUrl = '/student/dashboard';
            else if (role === 'principal') redirectUrl = '/principal/dashboard';
            window.location.href = redirectUrl;
          }, 1000);
        } else {
          showToast(response.message || 'Login failed.', 'danger');
          hideSpinner();
        }
      } catch (err) {
        showToast(err.message || 'Server error. Please try again.', 'danger');
        hideSpinner();
      }
    });
  }


  // Handle Student Signup form submit
  const studentSignupForm = document.getElementById('student-signup-form');
  if (studentSignupForm) {
    // Load classes dropdown first
    loadClassOptions();

    studentSignupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const classId = document.getElementById('classSelect').value;
      const rollNo = document.getElementById('rollNo').value.trim();

      if (!name || !email || !password || !classId || !rollNo) {
        showToast('Please fill in all fields.', 'danger');
        return;
      }

      showSpinner();

      try {
        const response = await api.post('/students/signup', { name, email, password, classId, rollNo });
        if (response && response.success) {
          api.setToken(response.data.token);
          api.setUser({ ...response.data.student, role: 'student' });

          showToast('Registration successful! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/student/dashboard';
          }, 1000);
        }
      } catch (err) {
        showToast(err.message || 'Registration failed.', 'danger');
        hideSpinner();
      }
    });
  }
});

// Load classes for student signup dropdown selector
async function loadClassOptions() {
  const select = document.getElementById('classSelect');
  if (!select) return;

  try {
    const res = await fetch('/api/classes');
    const response = await res.json();
    if (response && response.success) {
      select.innerHTML = '<option value="" disabled selected>Choose your Class/Grade</option>';
      response.data.forEach(cls => {
        select.innerHTML += `<option value="${cls._id}">${cls.name} (Teacher: ${cls.teacherName || 'System Admin'})</option>`;
      });
    }
  } catch (err) {
    console.error('Failed to load classes dropdown options:', err);
  }
}

// Helpers: Spinners & Toasts
function showSpinner() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'flex';
}

function hideSpinner() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.style.display = 'none';
}

function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `erp-toast toast-${type}`;
  
  const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  toast.innerHTML = `
    <i class="fas ${icon}" style="color: var(--${type === 'success' ? 'success' : 'danger'})"></i>
    <span style="font-weight: 500">${message}</span>
  `;

  container.appendChild(toast);

  // Fade out
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
