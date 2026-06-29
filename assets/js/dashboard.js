/**
 * Platform Stats Dashboard JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById('numberMonitorTableBody');
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    const getToken = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = './index.html';
            return null;
        }
        return token;
    };

    const fetchEntries = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/allNumberMonitors`);
            const data = await response.json();

            if (response.ok) {
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-5 opacity-50">No statistics entries found</td></tr>';
                    return;
                }

                data.forEach(entry => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="text" value="${entry.officerSelection}" data-id="${entry._id}" class="admin-input py-1 officerSelection"></td>
                        <td><input type="number" value="${entry.yearService}" data-id="${entry._id}" class="admin-input py-1 yearService"></td>
                        <td><input type="number" value="${entry.facultyExperience}" data-id="${entry._id}" class="admin-input py-1 facultyExperience"></td>
                        <td><input type="number" value="${entry.totalFaculty}" data-id="${entry._id}" class="admin-input py-1 totalFaculty"></td>
                        <td>
                            <button class="thm-btn py-1 px-3" onclick="saveEntry('${entry._id}')">
                                <i class="fas fa-save me-1"></i> Save
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                throw new Error('Failed to load statistics');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    };

    window.saveEntry = async (id) => {
        const token = getToken();
        if (!token) return;

        const updatedEntry = {
            officerSelection: document.querySelector(`.officerSelection[data-id="${id}"]`).value,
            yearService: document.querySelector(`.yearService[data-id="${id}"]`).value,
            facultyExperience: document.querySelector(`.facultyExperience[data-id="${id}"]`).value,
            totalFaculty: document.querySelector(`.totalFaculty[data-id="${id}"]`).value,
        };

        try {
            const response = await fetch(`${API_BASE}/api/updateNumberMonitor/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedEntry),
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Stats updated successfully',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#1a1a1a',
                    color: '#fff'
                });
                fetchEntries();
            } else {
                throw new Error(result.message || 'Update failed');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    };

    const contactForm = document.getElementById('contactSettingsForm');
    const whatsappInput = document.getElementById('whatsappNumberInput');
    const callInput = document.getElementById('callNumberInput');

    const fetchContactSettings = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/contactSettings`);
            const data = await response.json();

            if (response.ok && data) {
                whatsappInput.value = data.whatsappNumber || '';
                callInput.value = data.callNumber || '';
            } else {
                throw new Error('Failed to load contact settings');
            }
        } catch (error) {
            console.error('Error fetching contact settings:', error);
        }
    };

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const updatedSettings = {
                whatsappNumber: whatsappInput.value,
                callNumber: callInput.value
            };

            try {
                const response = await fetch(`${API_BASE}/api/contactSettings`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedSettings),
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Contact settings updated successfully',
                        showConfirmButton: false,
                        timer: 2000,
                        background: '#1a1a1a',
                        color: '#fff'
                    });
                    fetchContactSettings();
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
            }
        });
    }

    // ═══════════════ AUTH DISPLAY SETTINGS ═══════════════
    const slideshowSection = document.getElementById("slideshowSection");
    const adSection = document.getElementById("adSection");
    const slideshowImagesPreview = document.getElementById("slideshowImagesPreview");
    const uploadSlideshowForm = document.getElementById("uploadSlideshowForm");
    const slideshowFilesInput = document.getElementById("slideshowFilesInput");
    
    const uploadAdForm = document.getElementById("uploadAdForm");
    const adFileInput = document.getElementById("adFileInput");
    const adImagePreviewContainer = document.getElementById("adImagePreview");
    const adImagePreviewImg = adImagePreviewContainer ? adImagePreviewContainer.querySelector("img") : null;
    const adLinkInput = document.getElementById("adLinkInput");

    const slideshowTransitionForm = document.getElementById("slideshowTransitionForm");
    const transitionValueInput = document.getElementById("transitionValueInput");
    const transitionUnitSelect = document.getElementById("transitionUnitSelect");

    let currentSlideshowCount = 0;

    const toggleAuthSections = (mode) => {
        if (mode === "slideshow") {
            slideshowSection.classList.remove("d-none");
            adSection.classList.add("d-none");
        } else {
            slideshowSection.classList.add("d-none");
            adSection.classList.remove("d-none");
        }
    };

    const fetchAuthDisplaySettings = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/authDisplaySettings`);
            const data = await response.json();

            if (response.ok && data) {
                // Set mode check
                const checkedRadio = document.querySelector(`input[name="authDisplayMode"][value="${data.mode}"]`);
                if (checkedRadio) checkedRadio.checked = true;
                toggleAuthSections(data.mode);

                // Render Slideshow Previews
                slideshowImagesPreview.innerHTML = "";
                const imgs = data.slideshowImages || [];
                currentSlideshowCount = imgs.length;

                if (imgs.length === 0) {
                    slideshowImagesPreview.innerHTML = '<div class="col-12 text-muted small"><i class="fas fa-info-circle me-1"></i> No slideshow images uploaded yet.</div>';
                } else {
                    imgs.forEach((imgUrl, index) => {
                        const col = document.createElement("div");
                        col.className = "col-md-3 col-sm-6 text-center position-relative mb-3";
                        col.innerHTML = `
                            <div style="border: 1px solid #3b3930; border-radius: 8px; overflow: hidden; background: #1a1a1a; padding: 5px;">
                                <img src="${imgUrl}" style="height: 100px; max-width: 100%; object-fit: cover; border-radius: 4px;" />
                                <button type="button" class="btn btn-danger btn-sm w-100 mt-2" onclick="deleteSlideshowImage('${imgUrl}')">
                                    <i class="fas fa-trash-alt me-1"></i> Delete
                                </button>
                            </div>
                        `;
                        slideshowImagesPreview.appendChild(col);
                    });
                }

                // Render Ad Preview
                if (data.adImage) {
                    adImagePreviewImg.src = data.adImage;
                    adImagePreviewContainer.classList.remove("d-none");
                    adFileInput.required = false; // Not required if already uploaded
                } else {
                    adImagePreviewContainer.classList.add("d-none");
                    adFileInput.required = true;
                }

                adLinkInput.value = data.adLink || "";
                
                if (transitionValueInput) {
                    transitionValueInput.value = data.transitionValue !== undefined ? data.transitionValue : 5;
                }
                if (transitionUnitSelect) {
                    transitionUnitSelect.value = data.transitionUnit || "seconds";
                }
            }
        } catch (error) {
            console.error("Error fetching auth display settings:", error);
        }
    };

    // Mode Toggle Change Handlers
    document.querySelectorAll('input[name="authDisplayMode"]').forEach(radio => {
        radio.addEventListener("change", async (e) => {
            const token = getToken();
            if (!token) return;

            const mode = e.target.value;
            toggleAuthSections(mode);

            try {
                const response = await fetch(`${API_BASE}/api/authDisplaySettings`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ mode })
                });

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: `Switched to ${mode} mode`,
                        showConfirmButton: false,
                        timer: 1500,
                        background: "#1a1a1a",
                        color: "#fff"
                    });
                }
            } catch (error) {
                console.error("Error saving mode selection:", error);
            }
        });
    });

    // Save Transition Duration Settings
    if (slideshowTransitionForm) {
        slideshowTransitionForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const value = parseInt(transitionValueInput.value, 10);
            const unit = transitionUnitSelect.value;

            if (!value || value < 1) {
                Swal.fire({ icon: "warning", title: "Invalid Value", text: "Please enter a transition duration of at least 1.", background: "#1a1a1a", color: "#fff" });
                return;
            }

            try {
                const response = await fetch(`${API_BASE}/api/authDisplaySettings`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ transitionValue: value, transitionUnit: unit })
                });

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: "top-end",
                        icon: "success",
                        title: `Slideshow will now rotate every ${value} ${unit}`,
                        showConfirmButton: false,
                        timer: 2000,
                        background: "#1a1a1a",
                        color: "#fff"
                    });
                } else {
                    const result = await response.json();
                    throw new Error(result.message || "Failed to save transition settings");
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Save Failed", text: error.message, background: "#1a1a1a", color: "#fff" });
            }
        });
    }

    // Upload Slideshow Submission
    if (uploadSlideshowForm) {
        uploadSlideshowForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const files = slideshowFilesInput.files;
            if (files.length === 0) return;

            if (currentSlideshowCount + files.length > 10) {
                Swal.fire({
                    icon: "error",
                    title: "Limit Exceeded",
                    text: `You can only upload up to 10 images total. Current: ${currentSlideshowCount}, Selected: ${files.length}.`,
                    background: "#1a1a1a",
                    color: "#fff"
                });
                return;
            }

            const formData = new FormData();
            for (let i = 0; i < files.length; i++) {
                formData.append("images", files[i]);
            }

            Swal.fire({
                title: "Uploading...",
                text: "Please wait while we save your slideshow images",
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                background: "#1a1a1a",
                color: "#fff"
            });

            try {
                const response = await fetch(`${API_BASE}/api/authDisplaySettings/uploadSlideshow`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    },
                    body: formData
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Uploaded!",
                        text: "Slideshow images successfully added.",
                        background: "#1a1a1a",
                        color: "#fff"
                    });
                    uploadSlideshowForm.reset();
                    fetchAuthDisplaySettings();
                } else {
                    throw new Error(result.message || "Upload failed");
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Upload Failed", text: error.message, background: "#1a1a1a", color: "#fff" });
            }
        });
    }

    // Delete Slideshow Image Global Handler
    window.deleteSlideshowImage = async (imageUrl) => {
        const token = getToken();
        if (!token) return;

        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "This image will be permanently removed from the slideshow.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it",
            cancelButtonText: "Cancel",
            background: "#1a1a1a",
            color: "#fff"
        });

        if (!confirm.isConfirmed) return;

        try {
            const response = await fetch(`${API_BASE}/api/authDisplaySettings/deleteSlideshowImage`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ imageUrl })
            });

            if (response.ok) {
                Swal.fire({
                    toast: true,
                    position: "top-end",
                    icon: "success",
                    title: "Image deleted successfully",
                    showConfirmButton: false,
                    timer: 1500,
                    background: "#1a1a1a",
                    color: "#fff"
                });
                fetchAuthDisplaySettings();
            } else {
                throw new Error("Failed to delete slideshow image");
            }
        } catch (error) {
            Swal.fire({ icon: "error", title: "Delete Failed", text: error.message, background: "#1a1a1a", color: "#fff" });
        }
    };

    // Save/Upload Advertisement Submission
    if (uploadAdForm) {
        uploadAdForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            Swal.fire({
                title: "Saving Advertisement...",
                text: "Please wait while we save your ad configuration",
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); },
                background: "#1a1a1a",
                color: "#fff"
            });

            try {
                // 1. Upload file if selected
                if (adFileInput.files.length > 0) {
                    const fileFormData = new FormData();
                    fileFormData.append("image", adFileInput.files[0]);

                    const uploadRes = await fetch(`${API_BASE}/api/authDisplaySettings/uploadAd`, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${token}`
                        },
                        body: fileFormData
                    });

                    if (!uploadRes.ok) {
                        const uploadErr = await uploadRes.json();
                        throw new Error(uploadErr.message || "Failed to upload advertisement image");
                    }
                }

                // 2. Save Link Url
                const linkRes = await fetch(`${API_BASE}/api/authDisplaySettings`, {
                    method: "PUT",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ adLink: adLinkInput.value })
                });

                const result = await linkRes.json();

                if (linkRes.ok) {
                    Swal.fire({
                        icon: "success",
                        title: "Saved!",
                        text: "Advertisement configured successfully.",
                        background: "#1a1a1a",
                        color: "#fff"
                    });
                    adFileInput.value = ""; // Clear file selector
                    fetchAuthDisplaySettings();
                } else {
                    throw new Error(result.message || "Link update failed");
                }
            } catch (error) {
                Swal.fire({ icon: "error", title: "Save Failed", text: error.message, background: "#1a1a1a", color: "#fff" });
            }
        });
    }

    // Smooth scroll to card if hash matches
    const checkHashAndScroll = () => {
        if (window.location.hash === "#authDisplaySettingsCard") {
            const card = document.getElementById("authDisplaySettingsCard");
            if (card) {
                setTimeout(() => {
                    card.scrollIntoView({ behavior: "smooth", block: "center" });
                    card.style.transition = "box-shadow 0.5s ease-in-out, border-color 0.5s ease-in-out";
                    card.style.boxShadow = "0 0 20px rgba(224, 194, 20, 0.4)";
                    card.style.borderColor = "var(--primary-gold)";
                    
                    setTimeout(() => {
                        card.style.boxShadow = "";
                        card.style.borderColor = "";
                    }, 2000);
                }, 300);
            }
        }
    };

    window.addEventListener("hashchange", checkHashAndScroll);
    checkHashAndScroll();

    fetchEntries();
    fetchContactSettings();
    fetchAuthDisplaySettings();
});
