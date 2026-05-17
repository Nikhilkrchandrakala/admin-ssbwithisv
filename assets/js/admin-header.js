document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem('token');
   
    // Redirect if not logged in (skip if already on login page)
    if (!token && !window.location.pathname.includes('index.html') && window.location.pathname !== '/admin/') {
       window.location.href = './index.html';
       return;
    }

    // Inject Modern Navbar
    const navbar = document.querySelector('.admin-dashboard-navbar');
    if (navbar) {
        const currentPath = window.location.pathname.split('/').pop() || 'dashboard.html';
        
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
                    </div>
                </div>
                
                <button id="logoutBtn">Logout</button>
            </div>
        `;

        // Re-attach Logout Event after injection
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = './index.html';
        });

        // Dropdown toggle logic
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