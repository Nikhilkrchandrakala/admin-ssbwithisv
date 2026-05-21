/**
 * Roles & Permissions Management Logic
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    const token = localStorage.getItem("token");

    let allUsers = [];

    // Elements
    const usersTableBody = document.getElementById("usersTableBody");
    const userSearch = document.getElementById("userSearch");
    const roleFilter = document.getElementById("roleFilter");
    
    // Modal Elements
    const roleModalOverlay = document.getElementById("roleModalOverlay");
    const roleForm = document.getElementById("roleForm");
    const modalTitle = document.getElementById("modalTitle");
    const modalUserId = document.getElementById("modalUserId");
    const modalUserEmail = document.getElementById("modalUserEmail");
    const modalUserName = document.getElementById("modalUserName");
    const modalUserRole = document.getElementById("modalUserRole");
    const modalUserPhone = document.getElementById("modalUserPhone");
    const modalUserPassword = document.getElementById("modalUserPassword");
    const commissionGroup = document.getElementById("commissionGroup");
    const modalCommission = document.getElementById("modalCommission");

    // Fetch and Load Users
    async function fetchUsers() {
        try {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-5">
                        <div class="spinner-border text-warning" role="status"></div>
                        <p class="mt-3 mb-0 opacity-70">Fetching staff accounts from database...</p>
                    </td>
                </tr>
            `;

            const response = await fetch(`${API_BASE}/api/admin/users`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = "./index.html";
                    return;
                }
                throw new Error("Failed to fetch staff accounts");
            }

            const data = await response.json();
            allUsers = data.users || [];
            renderUsers(allUsers);
        } catch (error) {
            console.error("Fetch Users Error:", error);
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p class="mb-0">Error loading staff users: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    // Render Users in Table
    function renderUsers(usersList) {
        if (usersList.length === 0) {
            usersTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-5 opacity-50">
                        <i class="fas fa-users-slash fa-2x mb-3"></i>
                        <p class="mb-0">No matching staff accounts found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        usersTableBody.innerHTML = usersList.map(u => {
            // Render beautiful role badge
            let roleBadgeClass = "role-student";
            let roleLabel = "Candidate";
            if (u.role === "admin") {
                roleBadgeClass = "role-admin";
                roleLabel = "Admin";
            } else if (u.role === "franchise") {
                roleBadgeClass = "role-franchise";
                roleLabel = "Franchise";
            } else if (u.role === "assessor") {
                roleBadgeClass = "role-assessor";
                roleLabel = "Assessor";
            }

            // Affiliate details for Franchise
            let details = "<span class='opacity-50'>—</span>";
            if (u.role === "franchise") {
                details = `
                    <div style="font-size: 0.85rem;">
                        <span class="text-warning">Code:</span> <code>${u.referralCode || "N/A"}</code><br>
                        <span class="text-warning">Comm:</span> <span>${u.commissionPercent || 20}%</span>
                    </div>
                `;
            }

            // Database collection origin indicator
            const sourceBadge = `<span class="source-badge">${u.sourceCollection}</span>`;

            return `
                <tr>
                    <td><strong>${u.name || "N/A"}</strong></td>
                    <td>${u.email}</td>
                    <td>${u.phone || "N/A"}</td>
                    <td><span class="role-badge ${roleBadgeClass}">${roleLabel}</span></td>
                    <td>${sourceBadge}</td>
                    <td>${details}</td>
                    <td style="text-align: center;">
                        <button class="thm-btn" style="padding: 6px 14px; font-size: 0.8rem;" onclick="openRoleModal('${u.id}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${u.role}', ${u.commissionPercent || 20}, '${u.phone || ''}', '${(u.permissions || []).join(',')}')">
                            <i class="fas fa-user-tag me-1"></i> Edit Role
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Modal Control: Edit Existing Staff Role
    window.openRoleModal = (id, name, email, role, commission, phone, permissionsStr = "") => {
        modalTitle.innerHTML = `<i class="fas fa-user-edit me-2"></i> Update Account Role`;
        modalUserId.value = id;
        modalUserEmail.value = email;
        modalUserEmail.setAttribute("readonly", "true");
        modalUserEmail.style.background = "#2b2b2b";
        modalUserEmail.style.borderColor = "#555";
        modalUserEmail.style.opacity = "0.8";

        modalUserName.value = name || "";
        modalUserName.setAttribute("readonly", "true");
        modalUserName.style.background = "#2b2b2b";
        modalUserName.style.borderColor = "#555";
        modalUserName.style.opacity = "0.8";

        modalUserPhone.value = phone || "";
        modalUserPassword.value = "";

        modalUserRole.value = role || "assessor";
        modalCommission.value = commission || 20;

        // Reset and check permissions
        const permissions = permissionsStr.split(',').filter(Boolean);
        const checkboxes = document.querySelectorAll('input[name="permissions"]');
        checkboxes.forEach(cb => {
            cb.checked = permissions.includes(cb.value);
        });

        // Toggle groups
        commissionGroup.style.display = (role === "franchise") ? "block" : "none";
        document.getElementById("permissionsGroup").style.display = (role === "admin") ? "block" : "none";

        roleModalOverlay.style.display = "flex";
    };

    // Modal Control: Promote / Add Staff
    window.openPromoteModal = () => {
        modalTitle.innerHTML = `<i class="fas fa-user-plus me-2"></i> Promote / Add Staff`;
        modalUserId.value = "new";
        
        modalUserEmail.value = "";
        modalUserEmail.removeAttribute("readonly");
        modalUserEmail.style.background = "";
        modalUserEmail.style.borderColor = "";
        modalUserEmail.style.opacity = "";
        
        modalUserName.value = "";
        modalUserName.removeAttribute("readonly");
        modalUserName.style.background = "";
        modalUserName.style.borderColor = "";
        modalUserName.style.opacity = "";

        modalUserPhone.value = "";
        modalUserPassword.value = "";

        modalUserRole.value = "assessor";
        modalCommission.value = 20;
        commissionGroup.style.display = "none";
        document.getElementById("permissionsGroup").style.display = "none";
        document.querySelectorAll('input[name="permissions"]').forEach(cb => cb.checked = false);

        roleModalOverlay.style.display = "flex";
    };

    window.closeRoleModal = () => {
        roleModalOverlay.style.display = "none";
        roleForm.reset();
    };

    // Toggle Franchise/Admin inputs on role change
    modalUserRole.addEventListener("change", (e) => {
        commissionGroup.style.display = (e.target.value === "franchise") ? "block" : "none";
        document.getElementById("permissionsGroup").style.display = (e.target.value === "admin") ? "block" : "none";
    });
    
    // Super Admin auto-check toggle
    document.getElementById("superAdminCheck").addEventListener("change", (e) => {
        if (e.target.checked) {
            document.querySelectorAll('input[name="permissions"]').forEach(cb => {
                if(cb.id !== "superAdminCheck") cb.checked = true;
            });
        }
    });

    let isSubmittingRole = false;

    // Form submission
    roleForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (isSubmittingRole) return;
        isSubmittingRole = true;

        const id = modalUserId.value;
        const targetRole = modalUserRole.value;
        const email = modalUserEmail.value.trim();
        const name = modalUserName.value.trim();
        const phone = modalUserPhone.value.trim();
        const password = modalUserPassword.value.trim();
        const commission = modalCommission.value;
        
        // Extract permissions
        const permissions = [];
        if (targetRole === 'admin') {
            document.querySelectorAll('input[name="permissions"]:checked').forEach(cb => {
                permissions.push(cb.value);
            });
        }

        try {
            Swal.fire({
                title: "Configuring Role...",
                text: "Please wait while configuration syncs.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            // If promoting new user, target endpoint will search and update by email
            const requestUrl = `${API_BASE}/api/admin/users/${id}/role`;

            const response = await fetch(requestUrl, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: targetRole,
                    email: email,
                    name: name,
                    phone: phone,
                    password: password,
                    commissionPercent: Number(commission),
                    permissions: permissions
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to configure role");
            }

            Swal.fire({
                icon: "success",
                title: "Success",
                text: result.message || "Role updated successfully!",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#e0c214"
            });

            closeRoleModal();
            fetchUsers(); // Refresh accounts list
        } catch (error) {
            console.error("Submit Role Error:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        } finally {
            isSubmittingRole = false;
        }
    });

    // Filtering & Searching Logic
    function applyFilters() {
        const query = userSearch.value.toLowerCase().trim();
        const role = roleFilter.value;

        const filtered = allUsers.filter(u => {
            const matchesSearch = 
                (u.name && u.name.toLowerCase().includes(query)) ||
                (u.email && u.email.toLowerCase().includes(query)) ||
                (u.phone && u.phone.toLowerCase().includes(query));

            const matchesRole = (role === "all") || (u.role === role);

            return matchesSearch && matchesRole;
        });

        renderUsers(filtered);
    }

    userSearch.addEventListener("input", applyFilters);
    roleFilter.addEventListener("change", applyFilters);

    // Initial load
    if (token) {
        fetchUsers();
    } else {
        window.location.href = "./index.html";
    }
});
