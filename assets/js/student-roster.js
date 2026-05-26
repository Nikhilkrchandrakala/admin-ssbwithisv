/**
 * Historical Student Database JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    const token = localStorage.getItem("token");

    let allStudents = [];
    let allAssessments = [];

    async function loadAssessments() {
        try {
            const response = await fetch(`${API_BASE}/api/admin/assessments`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            const data = await response.json();
            allAssessments = data.assessments || [];
        } catch (e) {
            console.error("Failed to load active assessments:", e);
        }
    }

    // Elements
    const studentTableBody = document.getElementById("studentTableBody");
    const studentSearch = document.getElementById("studentSearch");
    const stageFilter = document.getElementById("stageFilter");
    const batchFilter = document.getElementById("batchFilter");

    // Modal Elements
    const studentModalOverlay = document.getElementById("studentModalOverlay");
    const detailStudentAvatar = document.getElementById("detailStudentAvatar");
    const detailStudentStageContainer = document.getElementById("detailStudentStageContainer");
    const detailAssessorStack = document.getElementById("detailAssessorStack");
    const detailCourseList = document.getElementById("detailCourseList");

    const editStudentId = document.getElementById("editStudentId");
    const editStudentName = document.getElementById("editStudentName");
    const editStudentEmail = document.getElementById("editStudentEmail");
    const editStudentPhone = document.getElementById("editStudentPhone");
    const editStudentBatch = document.getElementById("editStudentBatch");
    const editProfileForm = document.getElementById("editProfileForm");

    // Exclusive Checkbox Logic matching Checkout/PerCourses
    const checkboxFull = document.getElementById("mod_full_course");
    const checkboxesOthers = [
        document.getElementById("mod_ssb_ppdt"),
        document.getElementById("mod_psych"),
        document.getElementById("mod_interview"),
        document.getElementById("mod_group_testing")
    ];

    if (checkboxFull) {
        checkboxFull.addEventListener("change", () => {
            if (checkboxFull.checked) {
                checkboxesOthers.forEach(cb => { if (cb) { cb.checked = false; cb.disabled = true; } });
            } else {
                checkboxesOthers.forEach(cb => { if (cb) { cb.disabled = false; } });
            }
        });
    }

    checkboxesOthers.forEach(cb => {
        if (cb) {
            cb.addEventListener("change", () => {
                if (checkboxesOthers.some(c => c && c.checked)) {
                    if (checkboxFull) { checkboxFull.checked = false; checkboxFull.disabled = true; }
                } else {
                    if (checkboxFull) { checkboxFull.disabled = false; }
                }
            });
        }
    });

    function getInitials(name) {
        if (!name) return "ST";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function populateBatchFilter() {
        const current = batchFilter.value;
        const batches = [...new Set(allStudents.map(s => s.batch).filter(Boolean))].sort();
        
        batchFilter.innerHTML = `<option value="all">All Batches</option>`;
        batches.forEach(b => {
            const opt = document.createElement("option");
            opt.value = b;
            opt.textContent = `Batch ${b}`;
            if (b === current) opt.selected = true;
            batchFilter.appendChild(opt);
        });
    }

    // Load Student Profiles
    async function loadStudents() {
        try {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-5">
                        <div class="spinner-border text-warning" role="status"></div>
                        <p class="mt-3 mb-0 opacity-70">Fetching unified candidate records from database...</p>
                    </td>
                </tr>
            `;

            const response = await fetch(`${API_BASE}/api/admin/students`, {
                headers: { "Authorization": `Bearer ${token}` }
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
                throw new Error("Failed to fetch candidate profiles");
            }

            const data = await response.json();
            allStudents = data.students || [];
            populateBatchFilter();
            renderTable(allStudents);
        } catch (error) {
            console.error("Load Students Error:", error);
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p class="mb-0">Error loading database: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    // Render Student Table Rows
    function renderTable(studentsList) {
        if (studentsList.length === 0) {
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-5 opacity-50">
                        <i class="fas fa-database fa-2x mb-3"></i>
                        <p class="mb-0">No candidate records found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        studentTableBody.innerHTML = studentsList.map(s => {
            const initials = getInitials(s.name);
            const avatarHtml = s.profileImage 
                ? `<img src="${s.profileImage}" alt="${s.name}" class="avatar-circle" onerror="this.outerHTML='<div class=&quot;avatar-circle&quot;>${initials}</div>'">`
                : `<div class="avatar-circle">${initials}</div>`;

            // Joined date formatting
            const joinedDate = new Date(s.createdAt).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Course badge rendering
            const stages = (s.clinicalStage || "full_course").split(",").map(st => st.trim()).filter(Boolean);
            const stageColors = {
                "full_course": "stage-val-full_course",
                "ssb_ppdt": "stage-val-ssb_ppdt",
                "psych": "stage-val-psych",
                "interview": "stage-val-interview",
                "group_testing": "stage-val-group_testing"
            };
            const stageTitles = {
                "full_course": "Full Course",
                "ssb_ppdt": "Intro & PPDT",
                "psych": "Psychology",
                "interview": "Interview",
                "group_testing": "GTO Tasks"
            };

            const inlineStageSelect = stages.map(st => {
                const stageClass = stageColors[st] || "stage-val-full_course";
                const stageLabel = stageTitles[st] || st;
                return `
                    <span class="stage-select-inline ${stageClass}" style="padding: 4px 10px; border-radius: 50px; font-size: 10px; display: inline-block; font-weight: 700; text-transform: uppercase; cursor: default; margin-right: 4px; margin-bottom: 4px;">
                        ${stageLabel}
                    </span>
                `;
            }).join("");

            // Assessor stack summary
            const renderAssessorLabel = (assessor, label) => {
                if (assessor) {
                    return `<span class="mini-badge" style="font-size:0.7rem; margin-right:4px;"><span>${label}:</span> ${escapeHtml(assessor.name.split(' ')[0])}</span>`;
                }
                return "";
            };

            const GTObadge = renderAssessorLabel(s.assignedGTO, "GTO");
            const TObadge = renderAssessorLabel(s.assignedTO, "TO");
            const Psychbadge = renderAssessorLabel(s.assignedPsych, "Psych");
            const IObadge = renderAssessorLabel(s.assignedIO, "IO");

            const assessorBadges = [GTObadge, TObadge, Psychbadge, IObadge].filter(Boolean).join(" ");
            const badgesContainer = assessorBadges 
                ? `<div class="d-flex flex-wrap gap-1">${assessorBadges}</div>` 
                : `<span class="text-muted small">No allotments configured</span>`;

            // Assigned Assessments rendering
            const assignedAssessmentsList = s.assignedAssessments || [];
            let assessmentsBadges = "";
            if (assignedAssessmentsList.length === 0) {
                assessmentsBadges = `<span class="text-muted small">None assigned</span>`;
            } else {
                assessmentsBadges = `<div class="d-flex flex-wrap gap-1">` + assignedAssessmentsList.map(aid => {
                    const match = allAssessments.find(a => a._id.toString() === aid.toString());
                    if (match) {
                        const cleanTitle = match.title
                            .replace("Psychological Test Battery - ", "")
                            .replace("Psychological Test Battery ", "")
                            .replace("Psychological Test ", "");
                        return `
                            <span class="badge" style="background: rgba(224, 194, 20, 0.1); border: 1px solid rgba(224, 194, 20, 0.2); color: var(--primary-gold); padding: 4px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 500;">
                                <i class="fas fa-file-alt me-1"></i> ${escapeHtml(cleanTitle)}
                            </span>
                        `;
                    }
                    return "";
                }).filter(Boolean).join("") + `</div>`;
            }

            const escapedName = s.name.replace(/'/g, "\\'");

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center gap-3">
                            ${avatarHtml}
                            <div>
                                <strong style="color: #fff; font-size: 0.95rem;">${escapeHtml(s.name)}</strong><br>
                                <span class="small opacity-50">${s.email}</span>
                            </div>
                        </div>
                    </td>
                    <td><code>${s.phone || "N/A"}</code></td>
                    <td><span class="badge bg-dark border border-secondary text-light px-2 py-1 small" style="font-family: monospace;">${escapeHtml(s.batch) || "—"}</span></td>
                    <td><span class="badge bg-warning border border-warning text-dark px-2 py-1 small" style="font-family: monospace; font-weight: 700;">${escapeHtml(s.chestNo) || "—"}</span></td>
                    <td><span style="font-size: 0.85rem; opacity: 0.7;">${joinedDate}</span></td>
                    <td>${inlineStageSelect}</td>
                    <td>${assessmentsBadges}</td>
                    <td>${badgesContainer}</td>
                    <td style="text-align: center;">
                        <button class="action-btn" title="View Full Profile" onclick="openStudentModal('${s._id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Inline Clinical Stage Change Handler
    window.changeStudentStage = async (studentId, newStage, selectEl) => {
        try {
            // Instant color update on select class
            if (selectEl) {
                // Strip existing stage classes
                selectEl.className = "stage-select-inline";
                selectEl.classList.add(`stage-val-${newStage}`);
            }

            const response = await fetch(`${API_BASE}/api/admin/students/${studentId}/stage`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ clinicalStage: newStage })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to update Course");

            // Toast feedback
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                background: '#1a1a1a',
                color: '#fff',
                iconColor: '#e0c214'
            });
            Toast.fire({
                icon: 'success',
                title: 'Course updated!'
            });

            // Update in-memory state
            const studentIdx = allStudents.findIndex(s => s._id === studentId);
            if (studentIdx !== -1) {
                allStudents[studentIdx].clinicalStage = newStage;
            }
        } catch (error) {
            console.error("Change Course Error:", error);
            Swal.fire({
                icon: "error",
                title: "Failed to Update Course",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
            loadStudents(); // Revert select visually by reloading
        }
    };

    // Open Trainee Detail Modal
    window.openStudentModal = async (id) => {
        try {
            Swal.fire({
                title: "Loading Profile Details...",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${API_BASE}/api/admin/students/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to load details from server");

            const result = await response.json();
            const { student, orders } = result;

            Swal.close();

            // 1. Populate Trainee credentials
            editStudentId.value = student._id;
            editStudentName.value = student.name || "";
            editStudentEmail.value = student.email || "";
            editStudentPhone.value = student.phone || "";
            editStudentBatch.value = student.batch || "";

            // Populate Checkboxes according to split stages list
            const activeStages = (student.clinicalStage || "full_course").split(",").map(st => st.trim()).filter(Boolean);
            const allModules = ["full_course", "ssb_ppdt", "psych", "interview", "group_testing"];
            allModules.forEach(mod => {
                const el = document.getElementById(`mod_${mod}`);
                if (el) {
                    el.checked = activeStages.includes(mod);
                    el.disabled = false;
                }
            });

            // Re-apply disabled properties based on selection
            if (activeStages.includes("full_course")) {
                checkboxesOthers.forEach(cb => { if (cb) cb.disabled = true; });
            } else if (activeStages.some(st => st !== "full_course")) {
                if (checkboxFull) checkboxFull.disabled = true;
            }
            
            const editStudentChestNo = document.getElementById("editStudentChestNo");
            if (editStudentChestNo) {
                editStudentChestNo.value = student.chestNo || "";
            }
            
            const initials = getInitials(student.name);
            const avatarEl = document.getElementById("detailStudentAvatar");
            if (avatarEl) {
                if (student.profileImage) {
                    avatarEl.outerHTML = `<img id="detailStudentAvatar" src="${student.profileImage}" alt="${student.name}" class="avatar-circle" style="width:60px; height:60px; font-size:1.35rem;" onerror="this.outerHTML='<div id=&quot;detailStudentAvatar&quot; class=&quot;avatar-circle&quot; style=&quot;width:60px; height:60px; font-size:1.35rem;&quot;>${initials}</div>'">`;
                } else {
                    avatarEl.outerHTML = `<div id="detailStudentAvatar" class="avatar-circle" style="width:60px; height:60px; font-size:1.35rem;">${initials}</div>`;
                }
            }

            // Render course badges into container as chips
            if (detailStudentStageContainer) {
                const stageColors = {
                    "full_course": "stage-screening",
                    "ssb_ppdt": "stage-conference",
                    "psych": "stage-psychology",
                    "interview": "stage-interview",
                    "group_testing": "stage-gto"
                };
                const stageTitles = {
                    "full_course": "Full Course",
                    "ssb_ppdt": "Intro & PPDT",
                    "psych": "Psychology",
                    "interview": "Interview",
                    "group_testing": "GTO Tasks"
                };
                detailStudentStageContainer.innerHTML = activeStages.map(st => {
                    const stageClass = stageColors[st] || "stage-screening";
                    const stageLabel = stageTitles[st] || st;
                    return `<span class="badge ${stageClass}">${stageLabel}</span>`;
                }).join("");
            }

            // 4. Populate Assigned Assessments Checkboxes
            const assignedAssessmentsList = document.getElementById("assignedAssessmentsList");
            if (assignedAssessmentsList) {
                if (allAssessments.length === 0) {
                    assignedAssessmentsList.innerHTML = `
                        <div class="text-center p-3 opacity-40">
                            <p class="small mb-0">No active assessments found in system</p>
                        </div>
                    `;
                } else {
                    const studentAssignedIds = (student.assignedAssessments || []).map(id => id.toString());
                    assignedAssessmentsList.innerHTML = allAssessments.map(a => {
                        const isChecked = studentAssignedIds.includes(a._id.toString());
                        return `
                            <div class="form-check">
                                <input class="form-check-input assessment-checkbox" type="checkbox" value="${a._id}" id="assess_${a._id}" ${isChecked ? 'checked' : ''}>
                                <label class="form-check-label text-white small" for="assess_${a._id}">
                                    ${escapeHtml(a.title)} <span class="opacity-50">(${escapeHtml(a.type)} | ${a.duration || 0}m)</span>
                                </label>
                            </div>
                        `;
                    }).join("");
                }
            }

            // 2. Populate Allotted Assessors list
            const renderDetailAssessor = (assessor, label) => {
                if (assessor) {
                    return `
                        <div class="mini-badge w-100 p-2 d-flex justify-content-between align-items-center mb-1">
                            <span><i class="fas fa-user-shield me-1"></i> ${label} Assessor</span>
                            <strong style="color: #fff;">${escapeHtml(assessor.name)}</strong>
                        </div>
                    `;
                }
                return `
                    <div class="mini-badge w-100 p-2 d-flex justify-content-between align-items-center mb-1" style="background: rgba(231, 76, 60, 0.04); border-color: rgba(231, 76, 60, 0.15);">
                        <span style="color: #ff6b6b;"><i class="fas fa-times-circle me-1"></i> ${label} Assessor</span>
                        <strong style="color: #ff6b6b; font-weight:500;">Unassigned</strong>
                    </div>
                `;
            };

            detailAssessorStack.innerHTML = `
                ${renderDetailAssessor(student.assignedPsych, "Psychology")}
                ${renderDetailAssessor(student.assignedGTO, "Group Testing (GTO)")}
                ${renderDetailAssessor(student.assignedTO, "Technical (TO)")}
                ${renderDetailAssessor(student.assignedIO, "Interviewing (IO)")}
            `;

            // 3. Populate course registrations list
            if (!orders || orders.length === 0) {
                detailCourseList.innerHTML = `
                    <div class="text-center p-5 opacity-40">
                        <i class="fas fa-receipt fa-2x mb-2"></i>
                        <p class="small mb-0">No paid courses or batch slots found for this candidate</p>
                    </div>
                `;
            } else {
                detailCourseList.innerHTML = orders.map(o => {
                    const price = o.price || 0;
                    const date = new Date(o.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    const slotTitle = o.slotId?.title || "Purchased Course Registration";
                    const batchNo = o.slotId?.batchNo ? `Batch #${o.slotId.batchNo}` : "Course Module";

                    return `
                        <div class="course-item-card">
                            <div class="course-item-left">
                                <h6>${escapeHtml(slotTitle)}</h6>
                                <p><code style="color:var(--primary-gold)">#${(o.orderId || o._id).substring(0, 10)}</code> &nbsp;|&nbsp; ${escapeHtml(batchNo)}</p>
                            </div>
                            <div class="course-item-right">
                                <div class="price">₹${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                <div class="date">${date}</div>
                            </div>
                        </div>
                    `;
                }).join("");
            }

            studentModalOverlay.style.display = "flex";
        } catch (error) {
            console.error("Load student details error:", error);
            Swal.fire({
                icon: "error",
                title: "Failed to Fetch Details",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    };

    window.closeStudentModal = () => {
        studentModalOverlay.style.display = "none";
    };

    // Filter Triggering
    function applyFilters() {
        const query = studentSearch.value.toLowerCase().trim();
        const stage = stageFilter.value;
        const batch = batchFilter.value;

        const filtered = allStudents.filter(s => {
            const matchesSearch = 
                s.name.toLowerCase().includes(query) ||
                s.email.toLowerCase().includes(query) ||
                (s.phone && s.phone.toLowerCase().includes(query));

            const matchesStage = (stage === "all") || (s.clinicalStage === stage);
            const matchesBatch = (batch === "all") || (s.batch === batch);

            return matchesSearch && matchesStage && matchesBatch;
        });

        renderTable(filtered);
    }

    studentSearch.addEventListener("input", applyFilters);
    stageFilter.addEventListener("change", applyFilters);
    batchFilter.addEventListener("change", applyFilters);

    // Save Profile Form Submission
    editProfileForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const id = editStudentId.value;
        const name = editStudentName.value.trim();
        const email = editStudentEmail.value.trim();
        const phone = editStudentPhone.value.trim();
        const batch = editStudentBatch.value.trim();
        
        // Gather all checked modules
        const checkedModules = [];
        const allModulesList = ["full_course", "ssb_ppdt", "psych", "interview", "group_testing"];
        allModulesList.forEach(mod => {
            const el = document.getElementById(`mod_${mod}`);
            if (el && el.checked) {
                checkedModules.push(mod);
            }
        });
        const clinicalStage = checkedModules.length > 0 ? checkedModules.join(",") : "full_course";
        
        const chestNo = document.getElementById("editStudentChestNo")?.value.trim() || "";

        // Gather all checked assessments
        const assignedAssessments = [];
        document.querySelectorAll(".assessment-checkbox:checked").forEach(cb => {
            assignedAssessments.push(cb.value);
        });

        try {
            Swal.fire({
                title: "Saving Credentials...",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${API_BASE}/api/admin/students/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, phone, batch, clinicalStage, chestNo, assignedAssessments })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to update profile");

            Swal.fire({
                icon: "success",
                title: "Profile Saved!",
                text: "Candidate profile credentials updated successfully.",
                background: "#1a1a1a",
                color: "#fff",
                timer: 1500,
                showConfirmButton: false
            });

            closeStudentModal();
            loadStudents(); // Refresh data
        } catch (error) {
            console.error("Edit Profile Error:", error);
            Swal.fire({
                icon: "error",
                title: "Save Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    });

    // Add Student Actions
    window.openAddStudentModal = () => {
        document.getElementById("addStudentModalOverlay").style.display = "flex";
    };

    window.closeAddStudentModal = () => {
        document.getElementById("addStudentModalOverlay").style.display = "none";
        document.getElementById("addStudentForm").reset();
    };

    document.getElementById("addStudentForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const name = document.getElementById("addStudentName").value.trim();
        const email = document.getElementById("addStudentEmail").value.trim();
        const phone = document.getElementById("addStudentPhone").value.trim();
        const password = document.getElementById("addStudentPassword").value;
        const batch = document.getElementById("addStudentBatch").value.trim();
        const clinicalStage = document.getElementById("addStudentStage").value;
        const chestNo = document.getElementById("addStudentChestNo")?.value.trim() || "";

        try {
            Swal.fire({
                title: "Creating Trainee Account...",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${API_BASE}/api/admin/students`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ name, email, phone, password, batch, clinicalStage, chestNo })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to create candidate trainee");

            Swal.fire({
                icon: "success",
                title: "Candidate Added!",
                text: "The trainee record has been saved successfully in the database.",
                background: "#1a1a1a",
                color: "#fff",
                timer: 2000,
                showConfirmButton: false
            });

            closeAddStudentModal();
            loadStudents(); // Refresh data
        } catch (error) {
            console.error("Add Student Error:", error);
            Swal.fire({
                icon: "error",
                title: "Creation Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        }
    });

    // Initial load
    if (token) {
        loadAssessments().then(() => loadStudents());
    } else {
        window.location.href = "./index.html";
    }
});

function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
