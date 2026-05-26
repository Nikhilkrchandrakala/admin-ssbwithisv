document.addEventListener("DOMContentLoaded", () => {
    // Self-healing: Capture and persist token from URL parameters (e.g. on redirects back from Psych Battery)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
        localStorage.setItem('token', urlToken);
        try {
            const base64Url = urlToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            if (payload.role) localStorage.setItem('role', payload.role);
            if (payload.name) localStorage.setItem('name', payload.name);
        } catch (e) {
            console.error("Error decoding token in header:", e);
        }
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
    const API_BASE = (typeof config !== 'undefined' && config?.backendBaseUrl) || 'http://localhost:5001';

    // Dynamic login/logout redirect URL
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const loginRedirectUrl = isLocal ? './index.html' : 'https://admin.ssbwithisv.in';

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

    if (token && isTokenExpired(token)) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('permissions');
        localStorage.removeItem('name');
        window.location.href = loginRedirectUrl;
        return;
    }

    // Redirect if not logged in (skip if already on login page)
    if (!token && !window.location.pathname.includes('index.html') && window.location.pathname !== '/admin/') {
        window.location.href = loginRedirectUrl;
        return;
    }

    // Enforce Franchisee restrictions - they should only see the Franchisee page and Profile page
    if (token && role === 'franchise') {
        const pathLower = currentPath.toLowerCase();
        if (pathLower !== 'franchisedashboard.html' && pathLower !== 'profile.html' && pathLower !== 'index.html' && currentPath !== '') {
            window.location.href = './FranchiseDashboard.html';
            return;
        }
    }

    // Enforce Assessor restrictions - they should only see the Profile page
    if (token && role === 'assessor') {
        const pathLower = currentPath.toLowerCase();
        if (pathLower !== 'profile.html' && pathLower !== 'index.html' && currentPath !== '') {
            window.location.href = './Profile.html';
            return;
        }
    }

    // Define page clearance mappings
    const PAGE_PERMISSIONS = {
        'dashboard.html': 'dashboard',
        'magazine.html': 'magazine',
        'BlogList.html': 'blogs',
        'Blogs.html': 'blogs',
        'Gallery.html': 'gallery',
        'candidate.html': 'candidates',
        'Courses.html': 'courses',
        'Franchise.html': 'franchise',
        'TotalSales.html': 'sales',
        'CouponManagement.html': 'coupons',
        'leads.html': 'leads',
        'RolesManagement.html': 'roles',
        'Allotment.html': 'allotment',
        'StudentRoster.html': 'students',
        'psych_battery': 'psych_battery'
    };

    // Helper to check permission
    const hasPermission = (permissionKey) => {
        if (!permissionKey) return true;
        try {
            const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
            return perms.includes('super_admin') || perms.includes(permissionKey);
        } catch (e) {
            return false;
        }
    };

    // 1️⃣ Run immediate static path check from localStorage
    if (token && role === 'admin' && PAGE_PERMISSIONS[currentPath]) {
        const requiredPerm = PAGE_PERMISSIONS[currentPath];
        if (!hasPermission(requiredPerm)) {
            // Rejection routing
            alertAccessDenied();
            return;
        }
    }

    function alertAccessDenied() {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Access Denied',
                text: 'You do not have the required permissions to view this module.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            }).then(() => {
                window.location.href = './Profile.html';
            });
        } else {
            alert('Access Denied: Insufficient clearances for this module.');
            window.location.href = './Profile.html';
        }
    }

    // Inject Navbar
    const navbar = document.querySelector('.admin-dashboard-navbar');
    if (navbar) {
        renderNavbar();
        
        // 2️⃣ Async sync profile permissions to detect runtime changes/privilege updates
        if (token && role === 'admin') {
            fetch(`${API_BASE}/api/profile`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('permissions');
                    localStorage.removeItem('name');
                    window.location.href = loginRedirectUrl;
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data && data.user) {
                    const newPerms = data.user.permissions || [];
                    localStorage.setItem('permissions', JSON.stringify(newPerms));
                    localStorage.setItem('name', data.user.name || "");
                    
                    // Re-evaluate current path permission
                    if (PAGE_PERMISSIONS[currentPath]) {
                        const requiredPerm = PAGE_PERMISSIONS[currentPath];
                        const stillHasAccess = newPerms.includes('super_admin') || newPerms.includes(requiredPerm);
                        if (!stillHasAccess) {
                            alertAccessDenied();
                        }
                    }
                    // Re-render menu to reflect updated links
                    renderNavbar();
                }
            })
            .catch(err => console.error("Real-time clearance validation sync error:", err));
        }
    }

    function renderNavbar() {
        window.renderNavbar = renderNavbar;
        if (!navbar) return;
        const displayName = localStorage.getItem('name') || (role === 'franchise' ? 'Franchise Partner' : 'SSB Admin');
        let roleText = (role || 'ADMIN').replace('_', '').toUpperCase();

        if (role === 'admin') {
            try {
                const perms = JSON.parse(localStorage.getItem('permissions') || '[]');
                if (perms.includes('super_admin')) {
                    roleText = "SUPER ADMIN";
                }
            } catch (e) {
                // ignore
            }
        }

        const savedAvatar = localStorage.getItem('profile_avatar') || './assets/imgs/admin-img.jpg';

        if (role === 'franchise') {
            navbar.innerHTML = `
                <div class="admin-dashboard-left">
                    <img src="./assets/logo/ISV2.png" alt="SSB Seal" class="admin-navbar-seal" style="height: 38px; width: 38px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(224, 194, 20, 0.25)); margin-right: 5px;">
                    <div style="width: 1px; height: 26px; background: rgba(255, 255, 255, 0.15); margin: 0 10px;"></div>
                    <img src="${savedAvatar}" alt="Partner Image" class="admin-dashboard-image" onerror="this.src='https://via.placeholder.com/45'">
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">Welcome, ${displayName}</span>
                        <span style="font-size: 0.72rem; color: var(--primary-gold); font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">${roleText}</span>
                    </div>
                </div>
                <div class="admin-dashboard-right">
                    <a href="./FranchiseDashboard.html" class="admin-dashboard-link ${currentPath === 'FranchiseDashboard.html' ? 'active' : ''}">Franchise Dashboard</a>
                    <a href="./Profile.html" class="admin-dashboard-link ${currentPath === 'Profile.html' ? 'active' : ''}">Profile</a>
                    <button id="logoutBtn">Logout</button>
                </div>
            `;
        } else {
            // CONTENT LINKS: Dashboard, Magazine, Blogs, Gallery, Candidates
            const contentLinks = [];
            if (hasPermission('dashboard')) {
                contentLinks.push(`<a href="./dashboard.html" class="admin-dashboard-link ${currentPath === 'dashboard.html' ? 'active' : ''}">Dashboard</a>`);
            }
            if (hasPermission('magazine')) {
                contentLinks.push(`<a href="./magazine.html" class="admin-dashboard-link ${currentPath === 'magazine.html' ? 'active' : ''}">Magazine</a>`);
            }
            if (hasPermission('blogs')) {
                contentLinks.push(`<a href="./BlogList.html" class="admin-dashboard-link ${currentPath.includes('Blog') ? 'active' : ''}">Blogs</a>`);
            }
            if (hasPermission('gallery')) {
                contentLinks.push(`<a href="./Gallery.html" class="admin-dashboard-link ${currentPath === 'Gallery.html' ? 'active' : ''}">Gallery</a>`);
            }
            if (hasPermission('candidates')) {
                contentLinks.push(`<a href="./candidate.html" class="admin-dashboard-link ${currentPath === 'candidate.html' ? 'active' : ''}">REC Candidates</a>`);
            }

            // MANAGEMENT LINKS: Franchise, Coupons, Leads, Roles & Permissions, Psyche Battery, Courses, Total Sales
            const managementLinks = [];
            if (hasPermission('courses')) {
                managementLinks.push(`<a href="./Courses.html" class="admin-dashboard-link ${currentPath === 'Courses.html' ? 'active' : ''}">Courses</a>`);
            }
            if (hasPermission('franchise')) {
                managementLinks.push(`<a href="./Franchise.html" class="admin-dashboard-link ${currentPath === 'Franchise.html' ? 'active' : ''}">Franchise</a>`);
            }
            if (hasPermission('sales')) {
                managementLinks.push(`<a href="./TotalSales.html" class="admin-dashboard-link ${currentPath === 'TotalSales.html' ? 'active' : ''}">Total Sales</a>`);
            }
            if (hasPermission('coupons')) {
                managementLinks.push(`<a href="./CouponManagement.html" class="admin-dashboard-link ${currentPath === 'CouponManagement.html' ? 'active' : ''}">Coupons</a>`);
            }
            if (hasPermission('leads')) {
                managementLinks.push(`<a href="./leads.html" class="admin-dashboard-link ${currentPath === 'leads.html' ? 'active' : ''}">Leads</a>`);
            }
            if (hasPermission('roles')) {
                managementLinks.push(`<a href="./RolesManagement.html" class="admin-dashboard-link ${currentPath === 'RolesManagement.html' ? 'active' : ''}">Roles & Permissions</a>`);
            }
            if (hasPermission('students')) {
                managementLinks.push(`<a href="./StudentRoster.html" class="admin-dashboard-link ${currentPath === 'StudentRoster.html' ? 'active' : ''}">Student Database</a>`);
            }
            if (hasPermission('allotment')) {
                managementLinks.push(`<a href="./Allotment.html" class="admin-dashboard-link ${currentPath === 'Allotment.html' ? 'active' : ''}">Candidate Allotment</a>`);
            }
            if (hasPermission('psych_battery')) {
                managementLinks.push(`<a href="#" class="admin-dashboard-link" id="psychBatteryNavLink">Psyche Battery</a>`);
            }

            let contentDropdownHtml = '';
            if (contentLinks.length > 0) {
                contentDropdownHtml = `
                    <div class="admin-dropdown">
                        <div class="admin-dashboard-link dropdown-toggle">
                            Content
                        </div>
                        <div class="dropdown-menu">
                            ${contentLinks.join('')}
                        </div>
                    </div>
                `;
            }

            let managementDropdownHtml = '';
            if (managementLinks.length > 0) {
                managementDropdownHtml = `
                    <div class="admin-dropdown">
                        <div class="admin-dashboard-link dropdown-toggle">
                            Management
                        </div>
                        <div class="dropdown-menu">
                            ${managementLinks.join('')}
                        </div>
                    </div>
                `;
            }

            let psychBatteryLinkHtml = '';
            if (role === 'assessor' || role === 'admin') {
                psychBatteryLinkHtml = `<a href="#" class="admin-dashboard-link" id="psychBatteryHeaderLink">Psych Battery</a>`;
            }

            navbar.innerHTML = `
                <div class="admin-dashboard-left">
                    <img src="./assets/logo/ISV2.png" alt="SSB Seal" class="admin-navbar-seal" style="height: 38px; width: 38px; object-fit: contain; filter: drop-shadow(0 0 5px rgba(224, 194, 20, 0.25)); margin-right: 5px;">
                    <div style="width: 1px; height: 26px; background: rgba(255, 255, 255, 0.15); margin: 0 10px;"></div>
                    <img src="${savedAvatar}" alt="Admin Image" class="admin-dashboard-image" onerror="this.src='https://via.placeholder.com/45'">
                    <div style="display: flex; flex-direction: column; line-height: 1.2;">
                        <span style="font-weight: 700; color: #fff; font-size: 0.95rem;">Welcome, ${displayName}</span>
                        <span style="font-size: 0.72rem; color: var(--primary-gold); font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase; margin-top: 2px;">${roleText}</span>
                    </div>
                </div>
                <div class="admin-dashboard-right">
                    ${contentDropdownHtml}
                    ${managementDropdownHtml}
                    ${psychBatteryLinkHtml}
                    <a href="./Profile.html" class="admin-dashboard-link ${currentPath === 'Profile.html' ? 'active' : ''}">Profile</a>
                    <button id="logoutBtn">Logout</button>
                </div>
            `;
        }

        // Re-attach Event Listeners
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('permissions');
                localStorage.removeItem('name');
                window.location.href = loginRedirectUrl;
            });
        }

        const psychLink = document.getElementById('psychBatteryNavLink');
        if (psychLink) {
            psychLink.addEventListener('click', (e) => {
                e.preventDefault();
                const t = localStorage.getItem('token');
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:5173'
                    : 'https://psych.ssbwithisv.in';
                window.open(`${baseUrl}?token=${t}`, '_blank');
            });
        }

        const psychHeaderLink = document.getElementById('psychBatteryHeaderLink');
        if (psychHeaderLink) {
            psychHeaderLink.addEventListener('click', (e) => {
                e.preventDefault();
                const t = localStorage.getItem('token');
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:5173'
                    : 'https://psych.ssbwithisv.in';
                window.open(`${baseUrl}?token=${t}`, '_blank');
            });
        }

        // Multi-Dropdown Toggle Hooking
        const dropdowns = document.querySelectorAll('.admin-dropdown');
        dropdowns.forEach(dropdown => {
            const toggle = dropdown.querySelector('.dropdown-toggle');
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    dropdowns.forEach(other => {
                        if (other !== dropdown) other.classList.remove('show');
                    });
                    dropdown.classList.toggle('show');
                });
            }
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        });
    }
});