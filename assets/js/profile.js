/**
 * Profile Settings Page Controller
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "./index.html";
        return;
    }

    // Details Form Elements
    const profileDetailsForm = document.getElementById("profileDetailsForm");
    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profilePhone = document.getElementById("profilePhone");
    const roleBadgeContainer = document.getElementById("roleBadgeContainer");

    // Avatar Upload Elements
    const avatarFileInput = document.getElementById("avatarFileInput");
    const avatarOverlayBtn = document.getElementById("avatarOverlayBtn");
    const profileAvatarImg = document.getElementById("profileAvatarImg");

    // Load local profile avatar on load
    const savedAvatar = localStorage.getItem("profile_avatar");
    if (savedAvatar && profileAvatarImg) {
        profileAvatarImg.src = savedAvatar;
    }

    // Avatar Upload Event Listeners
    if (avatarOverlayBtn && avatarFileInput) {
        avatarOverlayBtn.addEventListener("click", () => avatarFileInput.click());
    }

    if (avatarFileInput) {
        avatarFileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                // Limit size to 2MB to keep localStorage base64 string lightweight
                if (file.size > 2 * 1024 * 1024) {
                    Swal.fire({
                        icon: "error",
                        title: "File Too Large",
                        text: "Please select an image smaller than 2MB.",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#ff6b6b"
                    });
                    return;
                }
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const base64Data = evt.target.result;
                    localStorage.setItem("profile_avatar", base64Data);
                    if (profileAvatarImg) {
                        profileAvatarImg.src = base64Data;
                    }
                    // Sync header avatar immediately
                    if (typeof window.renderNavbar === "function") {
                        window.renderNavbar();
                    }
                    Swal.fire({
                        icon: "success",
                        title: "Avatar Updated",
                        text: "Your profile picture has been updated and synchronized across all dashboards!",
                        background: "#1a1a1a",
                        color: "#fff",
                        confirmButtonColor: "#e0c214",
                        timer: 1500,
                        showConfirmButton: false
                    });
                };
                reader.readAsDataURL(file);
            }
        });
    }



    // Fetch and Render Profile
    async function loadProfile() {
        try {
            Swal.fire({
                title: "Loading Profile...",
                text: "Please wait.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`${API_BASE}/api/profile`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('permissions');
                    localStorage.removeItem('name');
                    window.location.href = "./index.html";
                    return;
                }
                throw new Error("Failed to load profile details");
            }

            const data = await response.json();
            const user = data.user;

            profileName.value = user.name || "";
            profileEmail.value = user.email || "";
            profilePhone.value = user.phone || "";

            // Render Role Badge labels
            let roleLabel = "Staff User";
            if (user.role === "owner") {
                roleLabel = "OWNER";
            } else if (user.role === "admin") {
                if (user.permissions && user.permissions.includes("super_admin")) {
                    roleLabel = "SUPER ADMIN";
                } else {
                    roleLabel = "System Admin";
                }
            } else if (user.role === "franchise") {
                roleLabel = "Franchise Partner";
            } else if (user.role === "assessor") {
                roleLabel = "Assessor";
            }

            if (roleBadgeContainer) {
                roleBadgeContainer.innerHTML = `
                    <div class="profile-badge-display">
                        <i class="fas fa-user-shield me-1"></i> ${roleLabel}
                    </div>
                `;
            }

            // Populating UI Header Card Elements
            const headerProfileName = document.getElementById("headerProfileName");
            const roleSubtext = document.getElementById("roleSubtext");
            if (headerProfileName) {
                headerProfileName.textContent = user.name || "SSB Staff";
            }
            if (roleSubtext) {
                roleSubtext.textContent = roleLabel;
            }

            // Render Notifications in the feed timeline
            await loadProfileNotifications();

            Swal.close();
        } catch (error) {
            console.error("Load Profile Error:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    }

    async function loadProfileNotifications() {
        const timeline = document.getElementById("profileNotificationsTimeline");
        if (!timeline) return;

        try {
            const response = await fetch(`${API_BASE}/api/notifications`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const notifications = await response.json();
                if (notifications.length === 0) {
                    timeline.innerHTML = `<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 20px;">No recent notifications</div>`;
                } else {
                    timeline.innerHTML = notifications.map(n => `
                        <div class="notification-item ${n.isRead ? '' : 'unread'}">
                            <div class="notification-marker">
                                <i class="fas ${n.type === 'ALLOTMENT' ? 'fa-user-plus' : 'fa-info'}"></i>
                            </div>
                            <div class="notification-content" style="${!n.isRead ? 'border-color: rgba(224, 194, 20, 0.4); background: rgba(224, 194, 20, 0.05);' : ''}">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <div class="notification-icon-col" style="${!n.isRead ? 'color: #fff;' : ''}">
                                        ${n.title}
                                    </div>
                                    <div class="d-flex align-items-center gap-2">
                                        <span class="notification-relative-time">${new Date(n.createdAt).toLocaleDateString()}</span>
                                        <button class="btn btn-sm text-danger p-0 m-0" onclick="deleteNotification('${n._id}')" title="Delete Notification" style="background:none; border:none; outline:none; box-shadow:none;">
                                            <i class="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                </div>
                                <p class="notification-desc">${n.message}</p>
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (e) {
            console.error("Failed to load profile notifications:", e);
            timeline.innerHTML = `<div style="color: #ff6b6b; font-size: 13px; text-align: center; padding: 20px;">Failed to load notifications</div>`;
        }
    }

    // Global function to delete a notification
    window.deleteNotification = async (id) => {
        const result = await Swal.fire({
            title: 'Delete Notification?',
            text: "Are you sure you want to dismiss this?",
            icon: 'warning',
            showCancelButton: true,
            background: '#1a1a1a',
            color: '#fff',
            confirmButtonColor: '#e0c214',
            cancelButtonColor: '#ff6b6b',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch(`${API_BASE}/api/notifications/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Notification removed.',
                        background: '#1a1a1a',
                        color: '#fff',
                        timer: 1500,
                        showConfirmButton: false
                    });
                    loadProfileNotifications();
                } else {
                    console.error("Failed to delete notification:", data);
                    Swal.fire({
                        icon: 'error',
                        title: 'Oops...',
                        text: data.error || 'Failed to delete notification.',
                        background: '#1a1a1a',
                        color: '#fff'
                    });
                }
            } catch (error) {
                console.error("Delete notification error:", error);
                Swal.fire({
                    icon: 'error',
                    title: 'Network Error',
                    text: 'Could not reach the server.',
                    background: '#1a1a1a',
                    color: '#fff'
                });
            }
        }
    };

    // Submit details update
    profileDetailsForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = profileName.value.trim();
        const phone = profilePhone.value.trim();

        try {
            Swal.fire({
                title: "Saving Details...",
                text: "Please wait.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`${API_BASE}/api/profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, phone })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to update profile");
            }

            // Sync updated details in local storage to keep navbar header updated
            localStorage.setItem("name", name);

            // Update UI elements instantly
            const headerProfileName = document.getElementById("headerProfileName");
            if (headerProfileName) {
                headerProfileName.textContent = name;
            }

            // Refresh top header navbar
            if (typeof window.renderNavbar === "function") {
                window.renderNavbar();
            }

            Swal.fire({
                icon: "success",
                title: "Saved",
                text: "Your profile details have been saved successfully!",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#e0c214"
            });
        } catch (error) {
            console.error("Update Profile Error:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    });

    // Initial load
    loadProfile();
});
