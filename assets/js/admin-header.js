document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
   
    // Redirect if not logged in (skip if already on login page)
    if (!token && !window.location.pathname.includes('index.html') && window.location.pathname !== '/admin/') {
       window.location.href = './index.html';
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

    // Enforce Assessor restrictions — assessors go straight to PsychBattery
    if (token && role === 'assessor') {
        const psychBaseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:3000'
            : 'https://psych.ssbwithisv.in';
        window.location.href = `${psychBaseUrl}?token=${token}`;
        return;
    }

    // Inject Modern Navbar
    const navbar = document.querySelector('.admin-dashboard-navbar');
    if (navbar) {
        if (role === 'franchise') {
            // Restricted Navbar for Franchisee
            navbar.innerHTML = `
                <div class="admin-dashboard-left">
                    <img src="./assets/imgs/admin-img.jpg" alt="Partner Image" class="admin-dashboard-image" onerror="this.src='https://via.placeholder.com/45'">
                    <span>Franchise Partner</span>
                </div>
                <div class="admin-dashboard-right">
                    <a href="./FranchiseDashboard.html" class="admin-dashboard-link ${currentPath === 'FranchiseDashboard.html' ? 'active' : ''}">Franchise Dashboard</a>
                    <a href="./Profile.html" class="admin-dashboard-link ${currentPath === 'Profile.html' ? 'active' : ''}">Profile</a>
                    <button id="logoutBtn">Logout</button>
                </div>
            `;
        } else {
            // Full Admin Navbar
            navbar.innerHTML = `
                <div class="admin-dashboard-left">
                    <img src="./assets/imgs/admin-img.jpg" alt="Admin Image" class="admin-dashboard-image" onerror="this.src='https://via.placeholder.com/45'">
                    <span>SSB Superadmin</span>
                </div>
                <div class="admin-dashboard-right">
                    <a href="./dashboard.html" class="admin-dashboard-link ${currentPath === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
                    <a href="./magazine.html" class="admin-dashboard-link ${currentPath === 'magazine.html' ? 'active' : ''}">Magazine</a>
                    <a href="./BlogList.html" class="admin-dashboard-link ${currentPath.includes('Blog') ? 'active' : ''}">Blogs</a>
                    
                    <div class="admin-dropdown">
                        <div class="admin-dashboard-link dropdown-toggle">
                            Management <span style="font-size: 10px; margin-left: 5px;">▼</span>
                        </div>
                        <div class="dropdown-menu">
                            <a href="./candidate.html" class="admin-dashboard-link ${currentPath === 'candidate.html' ? 'active' : ''}">Candidates</a>
                            <a href="./Gallery.html" class="admin-dashboard-link ${currentPath === 'Gallery.html' ? 'active' : ''}">Gallery</a>
                            <a href="./Courses.html" class="admin-dashboard-link ${currentPath === 'Courses.html' ? 'active' : ''}">Courses</a>
                            <a href="./Franchise.html" class="admin-dashboard-link ${currentPath === 'Franchise.html' ? 'active' : ''}">Franchise</a>
                            <a href="./TotalSales.html" class="admin-dashboard-link ${currentPath === 'TotalSales.html' ? 'active' : ''}">Total Sales</a>
                            <a href="./CouponManagement.html" class="admin-dashboard-link ${currentPath === 'CouponManagement.html' ? 'active' : ''}">Coupons</a>
                            <a href="./leads.html" class="admin-dashboard-link ${currentPath === 'leads.html' ? 'active' : ''}">Leads</a>
                            <a href="./RolesManagement.html" class="admin-dashboard-link ${currentPath === 'RolesManagement.html' ? 'active' : ''}">Roles & Permissions</a>
                            <a href="#" class="admin-dashboard-link" id="psychBatteryNavLink">Psyche Battery</a>
                        </div>
                    </div>
                    
                    <a href="./Profile.html" class="admin-dashboard-link ${currentPath === 'Profile.html' ? 'active' : ''}">Profile</a>
                    <button id="logoutBtn">Logout</button>
                </div>
            `;
        }

        // Re-attach Logout Event after injection
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('role');
            window.location.href = './index.html';
        });

        // Psyche Battery SSO link (admin only)
        const psychLink = document.getElementById('psychBatteryNavLink');
        if (psychLink) {
            psychLink.addEventListener('click', (e) => {
                e.preventDefault();
                const t = localStorage.getItem('token');
                const baseUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                    ? 'http://localhost:3000'
                    : 'https://psych.ssbwithisv.in';
                window.open(`${baseUrl}?token=${t}`, '_blank');
            });
        }

        // Dropdown toggle logic (only applicable for Admin)
        const dropdown = document.querySelector('.admin-dropdown');
        const dropdownToggle = document.querySelector('.dropdown-toggle');
        
        if (dropdown && dropdownToggle) {
            dropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('show');
                }
            });
        }
    }
});