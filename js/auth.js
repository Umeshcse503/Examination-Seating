const Auth = {
  async login(username, password) {
    const result = await DB.login(username, password);

    if (result.success) {
      const user = result.user;
      // Note: In a real app we'd handle the 'pending' status in the backend login
      if (user.role === 'staff' && user.status === 'pending') {
          // Keep compatible with existing logic if needed
      }
      
      // Save session
      localStorage.setItem('currentUser', JSON.stringify(user));
      return { success: true, user };
    }
    
    return { success: false, message: result.message || 'Invalid username or password.' };
  },

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
  },

  requireAuth(allowedRoles = []) {
    const user = this.getCurrentUser();
    if (!user) {
      window.location.href = 'index.html';
      return null;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      alert('Access denied.');
      this.logout();
      return null;
    }

    return user;
  }
};

// Handle login form submission
document.addEventListener('DOMContentLoaded', () => {
    // If we are on ANY page and NOT logged in (except index/homepage), redirect to index
    const user = Auth.getCurrentUser();
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('projectpro/');
    const isHomePage = window.location.pathname.endsWith('homepage.html');

    if (!user && !isLoginPage && !isHomePage) {
        window.location.href = 'index.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const requestForm = document.getElementById('requestForm');

    // Check for explicit logout request in the URL (e.g. index.html?logout=true)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('logout') === 'true') {
        localStorage.removeItem('currentUser');
        // Clear param without reload
        window.history.replaceState({}, document.title, window.location.pathname);
        return window.location.reload(); 
    }
  
    // If we are on the login page
  if (loginForm && isLoginPage) {
    // If already logged in, redirect to respective dashboard
    if (user) {
        redirectToDashboard(user.role);
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const usernameInput = document.getElementById('username').value.trim();
      const passwordInput = document.getElementById('password').value;
      const errorMsg = document.getElementById('loginError');
      
      const result = await Auth.login(usernameInput, passwordInput);
      
      if (result.success) {
        errorMsg.style.display = 'none';
        
        // Add a smooth fade out transition before redirect
        document.body.style.opacity = '0';
        document.body.style.transition = 'opacity 0.5s ease';
        
        setTimeout(() => {
             redirectToDashboard(result.user.role);
        }, 500);
      } else {
        errorMsg.textContent = result.message;
        errorMsg.style.display = 'block';
        
        // Add a little shake animation
        const card = document.querySelector('.login-card');
        card.style.transform = 'translateX(-10px)';
        setTimeout(() => card.style.transform = 'translateX(10px)', 100);
        setTimeout(() => card.style.transform = 'translateX(-10px)', 200);
        setTimeout(() => card.style.transform = 'translateX(10px)', 300);
        setTimeout(() => card.style.transform = 'translateX(0)', 400);
      }
    });

    // Handle Reset
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            document.getElementById('username').value = '';
            document.getElementById('password').value = '';
            document.getElementById('loginError').style.display = 'none';
        });
    }

    // Handle Request Access
    if(requestForm) {
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('reqName').value.trim();
            const email = document.getElementById('reqEmail').value.trim();
            const username = document.getElementById('reqUsername').value.trim();
            const role = document.getElementById('reqRole').value;
            const department = document.getElementById('reqDept').value;
            const password = document.getElementById('reqPassword').value;
            
            const reqMsg = document.getElementById('requestMsg');

            const success = await DB.addUser(username, password, role, name, email, department);
            if(success) {
                reqMsg.style.color = 'var(--success)';
                reqMsg.style.background = 'rgba(16, 185, 129, 0.1)';
                reqMsg.textContent = 'Request submitted successfully! The Principal will review your account soon.';
                reqMsg.style.display = 'block';
                requestForm.reset();
            } else {
                reqMsg.style.color = 'var(--danger)';
                reqMsg.style.background = 'rgba(239, 68, 68, 0.1)';
                reqMsg.textContent = 'Username already exists. Please choose another.';
                reqMsg.style.display = 'block';
            }
        });
    }
  }
});

function redirectToDashboard(role) {
   switch (role) {
       case 'admin': window.location.href = 'admin-dashboard.html'; break;
       case 'principal': window.location.href = 'principal.html'; break;
       case 'hod': window.location.href = 'hod.html'; break;
       case 'staff': window.location.href = 'staff.html'; break;
       default: window.location.href = 'index.html'; break;
   }
}

// Utility to populate user info in headers
function setupHeader(user) {
    const headerTitle = document.getElementById('headerUserRole');
    if(headerTitle && user) {
        headerTitle.textContent = `${user.role.toUpperCase()} Dashboard (${user.name || user.username})`;
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
             // Smooth fade out
             document.body.style.opacity = '0';
             document.body.style.transition = 'opacity 0.4s ease';
             setTimeout(() => { Auth.logout(); }, 400);
        });
    }
}
