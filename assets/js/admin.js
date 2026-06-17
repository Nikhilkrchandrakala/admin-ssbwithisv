/**
 * Admin Login Logic
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // Auto-redirect if already logged in and on the login/index page
    const existingToken = localStorage.getItem('token');
    const existingRole = localStorage.getItem('role');

    // Helper to verify JWT expiration clientside
    const isTokenExpired = (t) => {
        if (!t) return true;
        try {
            const base64Url = t.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                return true;
            }
            return false;
        } catch (e) {
            return true;
        }
    };

    if (existingToken && isTokenExpired(existingToken)) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('permissions');
        localStorage.removeItem('name');
    } else if (existingToken && existingRole) {
        if (existingRole === "admin" || existingRole === "owner" || existingRole === "assessor") {
            window.location.href = window.location.pathname.includes('admin-login') ? "./admin/Profile.html" : "./Profile.html";
            return;
        } else if (existingRole === "franchise") {
            window.location.href = window.location.pathname.includes('admin-login') ? "./admin/FranchiseDashboard.html" : "./FranchiseDashboard.html";
            return;
        }
    }

    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            Swal.fire({
                icon: 'warning',
                text: 'Please enter both email and password.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#e0c214'
            });
            return;
        }

        try {
            // Loading state
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Authenticating...';

            const response = await fetch(`${API_BASE}/api/AdminLogin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok) {
                // Save Session
                localStorage.setItem('token', result.token);
                localStorage.setItem('role', result.role);
                localStorage.setItem('name', result.user?.name || "");
                if (result.role === "admin" || result.role === "owner") {
                    localStorage.setItem('permissions', JSON.stringify(result.user?.permissions || []));
                } else {
                    localStorage.removeItem('permissions');
                }

                // Success Feedback
                await Swal.fire({
                    icon: 'success',
                    title: 'Access Granted',
                    text: 'Welcome back to the command center.',
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#1a1a1a',
                    color: '#fff'
                });

                // Role-based routing
                if (result.role === "admin" || result.role === "owner" || result.role === "assessor") {
                    window.location.href = window.location.pathname.includes('admin-login') ? "./admin/Profile.html" : "./Profile.html";
                } else if (result.role === "franchise") {
                    window.location.href = window.location.pathname.includes('admin-login') ? "./admin/FranchiseDashboard.html" : "./FranchiseDashboard.html";
                } else {
                    window.location.href = "/";
                }
            } else {
                throw new Error(result.error || result.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Authentication Failed',
                text: error.message,
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            });
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt me-2"></i> Authenticate';
        }
    });
});
