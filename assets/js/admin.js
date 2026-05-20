/**
 * Admin Login Logic
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
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
                if (result.role === "admin") {
                    window.location.href = "./dashboard.html";
                } else if (result.role === "franchise") {
                    window.location.href = "./FranchiseDashboard.html";
                } else if (result.role === "assessor") {
                    // SSO redirect to Psyche Battery assessor dashboard
                    const psychBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? 'http://localhost:3000'
                        : 'https://psych.ssbwithisv.in';
                    window.location.href = `${psychBaseUrl}?token=${result.token}`;
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
