/**
 * Candidate Assessor Allotment JS
 * Standardized for the Charcoal/Gold Admin System
 * With server-side pagination & enrollment filtering
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    const token = localStorage.getItem("token");

    let allStudents = [];
    let allAssessments = [];
    let allAssessors = [];
    let isSubmittingAllotment = false;

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

    // Pagination State
    let currentPage = 1;
    let totalPages = 1;
    let totalCount = 0;
    const PAGE_SIZE = 25;
    let searchDebounceTimer = null;

    // Elements
    const allotmentTableBody = document.getElementById("allotmentTableBody");
    const allotmentSearch = document.getElementById("allotmentSearch");
    const stageFilter = document.getElementById("stageFilter");
    const batchFilter = document.getElementById("batchFilter");

    // Stat Elements
    const statTotalStudents = document.getElementById("statTotalStudents");
    const statAllottedStudents = document.getElementById("statAllottedStudents");
    const statUnallottedStudents = document.getElementById("statUnallottedStudents");

    // Modal Elements
    const allotmentModalOverlay = document.getElementById("allotmentModalOverlay");
    const allotmentForm = document.getElementById("allotmentForm");
    const modalStudentId = document.getElementById("modalStudentId");
    const modalStudentName = document.getElementById("modalStudentName");
    const modalStudentAvatar = document.getElementById("modalStudentAvatar");
    const modalStudentStage = document.getElementById("modalStudentStage");
    const modalStudentEmail = document.getElementById("modalStudentEmail");
    const modalStudentPhone = document.getElementById("modalStudentPhone");

    // Select Elements
    const selectPsych = document.getElementById("selectPsych");
    const selectGTO = document.getElementById("selectGTO");
    const selectTO = document.getElementById("selectTO");
    const selectIO = document.getElementById("selectIO");

    // Dynamic warning for mutual exclusivity
    const checkExclusivity = (changed, other) => {
        if (changed.value && other.value) {
            Swal.fire({
                icon: "warning",
                title: "Mutually Exclusive",
                text: "A candidate cannot have both a Psych Assessor and a Technical Assessor. Clearing the other selection.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
            other.value = "";
        }
    };
    selectPsych.addEventListener('change', () => checkExclusivity(selectPsych, selectTO));
    selectTO.addEventListener('change', () => checkExclusivity(selectTO, selectPsych));

    // Pagination Elements
    const paginationInfo = document.getElementById("paginationInfo");
    const paginationControls = document.getElementById("paginationControls");

    function getInitials(name) {
        if (!name) return "ST";
        const parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    function populateBatchFilter(batches) {
        const current = batchFilter.value;
        batchFilter.innerHTML = `<option value="all">All Batches</option>`;
        (batches || []).forEach(b => {
            const opt = document.createElement("option");
            opt.value = b;
            opt.textContent = `Batch ${b}`;
            if (b === current) opt.selected = true;
            batchFilter.appendChild(opt);
        });
    }

    // Fetch and Load Data — server-side paginated
    async function loadData(page = 1) {
        try {
            currentPage = page;

            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-5">
                        <div class="spinner-border text-warning" role="status"></div>
                        <p class="mt-3 mb-0 opacity-70">Fetching enrolled candidate allotment profiles...</p>
                    </td>
                </tr>
            `;

            // Build query params for server-side filtering
            const params = new URLSearchParams({
                page: currentPage,
                limit: PAGE_SIZE
            });

            const searchQuery = allotmentSearch.value.trim();
            if (searchQuery) params.set("search", searchQuery);

            const stageVal = stageFilter.value;
            if (stageVal && stageVal !== "all") params.set("clinicalStage", stageVal);

            const batchVal = batchFilter.value;
            if (batchVal && batchVal !== "all") params.set("batch", batchVal);

            // Parallel fetches: paginated students + assessors
            const [studentsRes, assessorsRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/allotment-students?${params.toString()}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${API_BASE}/api/admin/assessors`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ]);

            if (!studentsRes.ok || !assessorsRes.ok) {
                if (studentsRes.status === 401 || assessorsRes.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('permissions');
                    localStorage.removeItem('name');
                    window.location.href = "./index.html";
                    return;
                }
                throw new Error("Failed to load records from server");
            }

            const studentsData = await studentsRes.json();
            const assessorsData = await assessorsRes.json();

            allStudents = studentsData.students || [];
            allAssessors = assessorsData.assessors || [];
            totalCount = studentsData.totalCount || 0;
            totalPages = studentsData.totalPages || 1;
            currentPage = studentsData.page || 1;

            populateBatchFilter(studentsData.batches);
            updateSummaryStats();
            renderTable(allStudents);
            renderPagination();
            populateAssessorDropdowns();
        } catch (error) {
            console.error("Load Data Error:", error);
            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p class="mb-0">Error loading data: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    // Update Dashboard Metrics
    function updateSummaryStats() {
        const allotted = allStudents.filter(s => 
            s.assignedPsych && s.assignedGTO && s.assignedTO && s.assignedIO
        ).length;

        // Show total enrolled count from server, not just current page
        statTotalStudents.innerText = totalCount;

        // For allotted/unallotted, show page-level counts with a note
        const pageAllotted = allotted;
        const pageTotal = allStudents.length;
        statAllottedStudents.innerText = pageAllotted;
        statUnallottedStudents.innerText = pageTotal - pageAllotted;
    }

    // Render Pagination Controls
    function renderPagination() {
        if (!paginationInfo || !paginationControls) return;

        const startItem = totalCount === 0 ? 0 : ((currentPage - 1) * PAGE_SIZE) + 1;
        const endItem = Math.min(currentPage * PAGE_SIZE, totalCount);

        paginationInfo.innerHTML = `Showing <strong>${startItem}–${endItem}</strong> of <strong>${totalCount}</strong> enrolled candidates`;

        if (totalPages <= 1) {
            paginationControls.innerHTML = "";
            return;
        }

        let html = "";

        // Previous button
        html += `<button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Prev
                </button>`;

        // Page numbers with ellipsis
        const maxVisible = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) html += `<span class="pagination-ellipsis">…</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">…</span>`;
            html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
        }

        // Next button
        html += `<button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}" 
                    onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
                    Next <i class="fas fa-chevron-right"></i>
                </button>`;

        paginationControls.innerHTML = html;
    }

    // Global page navigation
    window.goToPage = (page) => {
        if (page < 1 || page > totalPages || page === currentPage) return;
        loadData(page);
    };

    // Render Student Rows in Table
    function renderTable(studentsList) {
        if (studentsList.length === 0) {
            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center p-5 opacity-50">
                        <i class="fas fa-user-clock fa-2x mb-3"></i>
                        <p class="mb-0">No enrolled candidates found matching your filters.</p>
                    </td>
                </tr>
            `;
            return;
        }

        allotmentTableBody.innerHTML = studentsList.map(s => {
            const initials = getInitials(s.name);
            const avatarHtml = s.profileImage 
                ? `<img src="${s.profileImage}" alt="${s.name}" class="avatar-circle" onerror="this.outerHTML='<div class=&quot;avatar-circle&quot;>${initials}</div>'">`
                : `<div class="avatar-circle">${initials}</div>`;

            // Course rendering
            const stages = (s.clinicalStage || "full_course").split(",").map(st => st.trim()).filter(Boolean);
            const stageColors = {
                "full_course": "stage-full_course",
                "ssb_ppdt": "stage-ssb_ppdt",
                "psych": "stage-psych",
                "interview": "stage-interview",
                "group_testing": "stage-group_testing"
            };
            const stageTitles = {
                "full_course": "Full Course",
                "ssb_ppdt": "Intro & PPDT",
                "psych": "Psychology",
                "interview": "Interview",
                "group_testing": "GTO Tasks"
            };

            const inlineStageSelect = stages.map(st => {
                const stageClass = stageColors[st] || "stage-full_course";
                const stageLabel = stageTitles[st] || st;
                return `<span class="stage-badge ${stageClass}" style="margin-right: 4px; margin-bottom: 4px; display: inline-block;">${stageLabel}</span>`;
            }).join("");

            // Assessor rendering
            const renderAssessorCell = (assessor) => {
                if (assessor) {
                    return `<span class="assessor-pill">${escapeHtml(assessor.name)}</span>`;
                }
                return `<span class="assessor-pill not-allotted">Unassigned</span>`;
            };

            const psychCell = renderAssessorCell(s.assignedPsych);
            const gtoCell = renderAssessorCell(s.assignedGTO);
            const toCell = renderAssessorCell(s.assignedTO);
            const ioCell = renderAssessorCell(s.assignedIO);

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
                    <td><span class="badge bg-dark border border-secondary text-light px-2 py-1 small" style="font-family: monospace;">${escapeHtml(s.batch) || "—"}</span></td>
                    <td><span class="badge bg-warning border border-warning text-dark px-2 py-1 small" style="font-family: monospace; font-weight: 700;">${escapeHtml(s.chestNo) || "—"}</span></td>
                    <td>${inlineStageSelect}</td>
                    <td>${psychCell}</td>
                    <td>${gtoCell}</td>
                    <td>${toCell}</td>
                    <td>${ioCell}</td>
                    <td style="text-align: center; border-left: 1px solid var(--border-color);">
                        <button class="action-btn" title="Allot Assessors" onclick="openAllotmentModal('${s._id}', '${escapedName}', '${s.email}', '${s.phone || ''}', '${s.clinicalStage || 'full_course'}', '${s.profileImage || ''}', '${s.assignedPsych?._id || ''}', '${s.assignedGTO?._id || ''}', '${s.assignedTO?._id || ''}', '${s.assignedIO?._id || ''}', '${s.batch || ''}', '${s.chestNo || ''}', '${escapeHtml(JSON.stringify(s.assignedAssessments || []))}')">
                            <i class="fas fa-clipboard-list"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    // Populate Select Options with specialized Assessor subtype and load levels
    function populateAssessorDropdowns() {
        const resetDropdown = (selectEl, defaultText) => {
            selectEl.innerHTML = `<option value="">${defaultText}</option>`;
        };

        resetDropdown(selectPsych, "-- Select Psych Assessor --");
        resetDropdown(selectGTO, "-- Select GTO Assessor --");
        resetDropdown(selectTO, "-- Select TO Assessor --");
        resetDropdown(selectIO, "-- Select IO Assessor --");

        const getLoadClass = (load) => {
            if (load <= 2) return "load-low";
            if (load <= 5) return "load-med";
            return "load-high";
        };

        allAssessors.forEach(a => {
            const loadClass = getLoadClass(a.activeLoad || 0);
            const loadText = `${a.activeLoad || 0} active`;

            const opt = document.createElement("option");
            opt.value = a._id;
            opt.innerHTML = `${escapeHtml(a.name)} (${loadText})`;
            
            // Route option to corresponding officer specialization dropdown
            if (a.assessorType === "Psych") {
                selectPsych.appendChild(opt);
            } else if (a.assessorType === "GTO") {
                selectGTO.appendChild(opt);
            } else if (a.assessorType === "TO") {
                selectTO.appendChild(opt);
            } else if (a.assessorType === "IO") {
                selectIO.appendChild(opt);
            }
        });
    }

    // Open Modal
    window.openAllotmentModal = (id, name, email, phone, clinicalStage, avatarUrl, psychId, gtoId, toId, ioId, batch, chestNo, assignedAssessmentsStr) => {
        modalStudentId.value = id;
        modalStudentName.innerText = name;
        modalStudentEmail.value = email;
        modalStudentPhone.value = phone || "N/A";
        
        const stageColors = {
            "full_course": "stage-full_course",
            "ssb_ppdt": "stage-ssb_ppdt",
            "psych": "stage-psych",
            "interview": "stage-interview",
            "group_testing": "stage-group_testing"
        };
        const stageTitles = {
            "full_course": "Full Course",
            "ssb_ppdt": "Intro & PPDT",
            "psych": "Psychology",
            "interview": "Interview",
            "group_testing": "GTO Tasks"
        };

        const stages = (clinicalStage || "full_course").split(",").map(st => st.trim()).filter(Boolean);

        // Render multiple chips adjacent to name inside container
        if (modalStudentStage) {
            const container = modalStudentStage.parentElement;
            const existingBadges = container.querySelectorAll(".stage-badge");
            existingBadges.forEach(b => {
                if (b.id !== "modalStudentStage") {
                    b.remove();
                }
            });
            modalStudentStage.style.display = "none";

            const batchBadge = document.getElementById("modalStudentBatch");
            stages.forEach(st => {
                const badge = document.createElement("span");
                badge.className = `badge stage-badge ${stageColors[st] || "stage-full_course"}`;
                badge.style.marginRight = "4px";
                badge.innerText = stageTitles[st] || st;
                container.insertBefore(badge, batchBadge);
            });
        }

        const batchEl = document.getElementById("modalStudentBatch");
        if (batchEl) {
            batchEl.innerText = batch ? `${batch}` : "—";
        }

        const chestNoEl = document.getElementById("modalStudentChestNo");
        if (chestNoEl) {
            if (chestNo) {
                chestNoEl.innerText = `Chest ${chestNo}`;
                chestNoEl.style.display = "inline-block";
            } else {
                chestNoEl.style.display = "none";
            }
        }

        const initials = getInitials(name);
        const avatarEl = document.getElementById("modalStudentAvatar");
        if (avatarEl) {
            if (avatarUrl) {
                avatarEl.outerHTML = `<img id="modalStudentAvatar" src="${avatarUrl}" alt="${name}" class="avatar-circle" onerror="this.outerHTML='<div id=&quot;modalStudentAvatar&quot; class=&quot;avatar-circle&quot;>${initials}</div>'">`;
            } else {
                avatarEl.outerHTML = `<div id="modalStudentAvatar" class="avatar-circle">${initials}</div>`;
            }
        }

        // Re-locate modalStudentAvatar element in DOM
        setTimeout(() => {
            const av = document.getElementById("modalStudentAvatar");
            if (av) av.style.border = "2px solid var(--primary-gold)";
        }, 50);

        // Bind dropdown values
        selectPsych.value = psychId || "";
        selectGTO.value = gtoId || "";
        selectTO.value = toId || "";
        selectIO.value = ioId || "";

        // Populate Assigned Assessments Checkboxes
        const assignedAssessmentsList = document.getElementById("assignedAssessmentsList");
        if (assignedAssessmentsList) {
            if (allAssessments.length === 0) {
                assignedAssessmentsList.innerHTML = `
                    <div class="text-center p-3 opacity-40">
                        <p class="small mb-0">No active assessments found in system</p>
                    </div>
                `;
            } else {
                let studentAssignedIds = [];
                try {
                    const parsed = JSON.parse(assignedAssessmentsStr || "[]");
                    studentAssignedIds = parsed.map((aId) => aId.toString());
                } catch (e) {
                    console.error("Failed to parse assignedAssessmentsStr", e);
                }

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

        allotmentModalOverlay.style.display = "flex";
    };

    window.closeAllotmentModal = () => {
        allotmentModalOverlay.style.display = "none";
        allotmentForm.reset();
    };

    // Form Submission
    allotmentForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (isSubmittingAllotment) return;
        isSubmittingAllotment = true;

        const id = modalStudentId.value;
        const assignedPsych = selectPsych.value || null;
        const assignedGTO = selectGTO.value || null;
        const assignedTO = selectTO.value || null;
        const assignedIO = selectIO.value || null;

        const assignedAssessments = [];
        document.querySelectorAll(".assessment-checkbox:checked").forEach(cb => {
            assignedAssessments.push(cb.value);
        });

        if (assignedAssessments.length === 0 && allAssessments.length > 0) {
            Swal.fire({
                icon: "error",
                title: "Assessment Required",
                text: "A student MUST be allotted at least one Assessment.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
            isSubmittingAllotment = false;
            return;
        }

        if (assignedPsych && assignedTO) {
            Swal.fire({
                icon: "error",
                title: "Invalid Allotment",
                text: "A candidate cannot be assigned to both a Psych Assessor and a Technical Assessor simultaneously. Please choose one.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
            isSubmittingAllotment = false;
            return;
        }

        try {
            Swal.fire({
                title: "Saving Allotments...",
                text: "Updating assessor schedules.",
                allowOutsideClick: false,
                background: "#1a1a1a",
                color: "#fff",
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${API_BASE}/api/admin/allotment/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    assignedPsych,
                    assignedGTO,
                    assignedTO,
                    assignedIO,
                    assignedAssessments
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Failed to update allotment schedules");

            Swal.fire({
                icon: "success",
                title: "Allotted!",
                text: result.message || "Assessors have been assigned to candidate successfully.",
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#e0c214"
            });

            closeAllotmentModal();
            loadData(currentPage); // Reload current page
        } catch (error) {
            console.error("Allotment Save Error:", error);
            Swal.fire({
                icon: "error",
                title: "Allotment Sync Failed",
                text: error.message,
                background: "#1a1a1a",
                color: "#fff",
                confirmButtonColor: "#ff6b6b"
            });
        } finally {
            isSubmittingAllotment = false;
        }
    });

    // Server-side filtering — reset to page 1 on filter change
    function applyFilters() {
        loadData(1);
    }

    // Debounced search — waits 400ms after user stops typing
    allotmentSearch.addEventListener("input", () => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            loadData(1);
        }, 400);
    });

    stageFilter.addEventListener("change", applyFilters);
    batchFilter.addEventListener("change", applyFilters);

    // Init
    if (token) {
        loadAssessments().then(() => loadData(1));
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
