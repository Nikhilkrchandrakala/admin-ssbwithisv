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

    // Password Form Elements
    const profilePasswordForm = document.getElementById("profilePasswordForm");
    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmNewPassword = document.getElementById("confirmNewPassword");

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

            // Render Role Badge
            let roleLabel = "Staff User";
            if (user.role === "admin") {
                roleLabel = "System Admin";
            } else if (user.role === "franchise") {
                roleLabel = "Franchise Partner";
            } else if (user.role === "assessor") {
                roleLabel = "Assessor";
            }

            roleBadgeContainer.innerHTML = `
                <div class="profile-badge-display">
                    <i class="fas fa-user-shield me-1"></i> ${roleLabel}
                </div>
            `;

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

            // If name was updated, synchronize in local storage to keep navbar header updated
            localStorage.setItem("name", name);

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

    // Submit password update
    profilePasswordForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const curPass = currentPassword.value;
        const newPass = newPassword.value;
        const confPass = confirmNewPassword.value;

        if (newPass !== confPass) {
            Swal.fire({
                icon: "warning",
                title: "Passwords Do Not Match",
                text: "The new passwords you entered do not match.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff9f43"
            });
            return;
        }

        try {
            Swal.fire({
                title: "Updating Password...",
                text: "Please wait.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`${API_BASE}/api/profile/security`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: curPass,
                    newPassword: newPass
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to update security password");
            }

            Swal.fire({
                icon: "success",
                title: "Password Updated",
                text: "Your password has been changed successfully!",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#e0c214"
            });

            profilePasswordForm.reset();
        } catch (error) {
            console.error("Update Password Error:", error);
            Swal.fire({
                icon: "error",
                title: "Security Verification Failed",
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
