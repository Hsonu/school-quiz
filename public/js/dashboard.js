document.addEventListener('DOMContentLoaded', async () => {
  // Dynamic Title branding replacement
  document.title = document.title.replace(/Apex ERP Portal/g, 'QUIZGEN  ERP').replace(/Apex International College/g, 'QUIZGEN ').replace(/NAKUL ERP/g, 'QUIZGEN  ERP');

  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
  }
  // 1. Check Auth & determine current page area
  const isTeacherPage = window.location.pathname.startsWith('/teacher/');
  const isStudentPage = window.location.pathname.startsWith('/student/');
  const isOwnerPage = window.location.pathname.startsWith('/owner/') && !window.location.pathname.endsWith('/login');
  const isPrincipalPage = window.location.pathname.startsWith('/principal/');

  let requiredRole = null;
  if (isTeacherPage) requiredRole = 'teacher';
  if (isStudentPage) requiredRole = 'student';
  if (isOwnerPage) requiredRole = 'owner';
  if (isPrincipalPage) requiredRole = 'principal';

  // For general /about page, check if any role token is active, else default to login
  const isGeneralAbout = window.location.pathname === '/about';
  if (isGeneralAbout) {
    const user = api.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
  } else {
    const user = api.checkAuth(requiredRole);
    if (!user) return;
  }

  const user = api.getUser();

  // 2. Fetch and render layouts partials (sidebar & navbar)
  await loadDashboardPartials(user);

  // 3. Initialize widgets (Live clock, active links, toggle menus)
  initDashboardWidgets(user);
});

async function loadDashboardPartials(user) {
  try {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (sidebarContainer) {
      const res = await fetch('/partials/sidebar.html');
      let html = await res.text();
      // Replace dynamic labels
      html = html.replace(/{{ROLE}}/g, user.role === 'owner' ? 'Owner Portal' : (user.role === 'principal' ? 'Principal Portal' : (user.role === 'teacher' ? 'Teacher Portal' : 'Student Portal')));
      sidebarContainer.innerHTML = html;
      sidebarContainer.classList.add('sidebar');

      // Show/Hide menus based on role
      const tMenu = document.getElementById('teacher-menu');
      const sMenu = document.getElementById('student-menu');
      const oMenu = document.getElementById('owner-menu');
      const pMenu = document.getElementById('principal-menu');
      if (user.role === 'teacher' && tMenu) tMenu.style.display = 'block';
      if (user.role === 'student' && sMenu) sMenu.style.display = 'block';
      if (user.role === 'owner' && oMenu) oMenu.style.display = 'block';
      if (user.role === 'principal' && pMenu) pMenu.style.display = 'block';
    }

    const navbarContainer = document.getElementById('navbar-container');
    if (navbarContainer) {
      const res = await fetch('/partials/navbar.html');
      let html = await res.text();

      const avatarSrc = user.profilePic || '/images/default-avatar.png';
      html = html.replace(/{{USER_NAME}}/g, user.name);
      html = html.replace(/{{USER_ROLE}}/g, user.role.toUpperCase());
      html = html.replace(/{{AVATAR_SRC}}/g, avatarSrc);
      navbarContainer.innerHTML = html;
      navbarContainer.classList.add('top-navbar');
    }
  } catch (err) {
    console.error('Error loading layout partials:', err);
  }
}

function initDashboardWidgets(user) {
  // Update live clock
  const timeElem = document.getElementById('live-time');
  const dateElem = document.getElementById('live-date');

  const updateClock = () => {
    const now = new Date();
    if (timeElem) {
      timeElem.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    if (dateElem) {
      dateElem.textContent = now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
  };
  updateClock();
  setInterval(updateClock, 1000);

  // Set welcome message label
  const welcomeText = document.getElementById('welcome-user-text');
  if (welcomeText) {
    welcomeText.textContent = `Welcome Back, ${user.name}`;
  }

  // Profile avatar dropdown toggle
  const avatarTrigger = document.querySelector('.user-profile-trigger');
  const dropdownMenu = document.querySelector('.erp-dropdown-menu');
  if (avatarTrigger && dropdownMenu) {
    avatarTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
    });
  }

  // Sidebar link highlight
  const links = document.querySelectorAll('.sidebar-menu-item');
  const currentPath = window.location.pathname;
  links.forEach(link => {
    const anchor = link.querySelector('a');
    if (anchor && anchor.getAttribute('href') === currentPath) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Mobile sidebar burger toggle
  const toggleBtn = document.querySelector('.sidebar-toggle-btn');
  const sidebar = document.querySelector('.sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      sidebar.classList.remove('show');
    });
  }

  // Handle Logout trigger
  const logoutBtns = document.querySelectorAll('.sidebar-logout');
  logoutBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      api.logout();
    });
  });

  // Dark Mode Toggle
  const darkToggle = document.getElementById('dark-mode-toggle');
  const darkIcon = document.getElementById('dark-mode-icon');

  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    if (darkIcon) {
      darkIcon.className = 'fas fa-sun text-warning';
    }
  }

  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');

      if (darkIcon) {
        if (isDark) {
          darkIcon.className = 'fas fa-sun text-warning';
        } else {
          darkIcon.className = 'fas fa-moon text-muted';
        }
      }
    });
  }
}
