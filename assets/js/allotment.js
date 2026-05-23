/**
 * Candidate Assessor Allotment JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    const token = localStorage.getItem("token");

    let allStudents = [];
    let allAssessors = [];
    let isSubmittingAllotment = false;

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

    // Fetch and Load Data
    async function loadData() {
        try {
            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center p-5">
                        <div class="spinner-border text-warning" role="status"></div>
                        <p class="mt-3 mb-0 opacity-70">Fetching active student allotment profiles...</p>
                    </td>
                </tr>
            `;

            // Parallel fetches
            const [studentsRes, assessorsRes] = await Promise.all([
                fetch(`${API_BASE}/api/admin/students`, {
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

            populateBatchFilter();
            updateSummaryStats();
            renderTable(allStudents);
            populateAssessorDropdowns();
        } catch (error) {
            console.error("Load Data Error:", error);
            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center p-5 text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p class="mb-0">Error loading data: ${error.message}</p>
                    </td>
                </tr>
            `;
        }
    }

    // Update Dashboard Metrics
    function updateSummaryStats() {
        const total = allStudents.length;
        const allotted = allStudents.filter(s => 
            s.assignedPsych && s.assignedGTO && s.assignedTO && s.assignedIO
        ).length;
        const unallotted = total - allotted;

        statTotalStudents.innerText = total;
        statAllottedStudents.innerText = allotted;
        statUnallottedStudents.innerText = unallotted;
    }

    // Render Student Rows in Table
    function renderTable(studentsList) {
        if (studentsList.length === 0) {
            allotmentTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center p-5 opacity-50">
                        <i class="fas fa-user-clock fa-2x mb-3"></i>
                        <p class="mb-0">No student profiles found.</p>
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

            // Stage rendering
            let stageClass = "stage-screening";
            let stageLabel = s.clinicalStage || "Screening";
            if (stageLabel === "Psychology") stageClass = "stage-psychology";
            else if (stageLabel === "GTO") stageClass = "stage-gto";
            else if (stageLabel === "Interview") stageClass = "stage-interview";
            else if (stageLabel === "Conference") stageClass = "stage-conference";
            else if (stageLabel === "Completed") stageClass = "stage-completed";

            // Assessor rendering
            const renderAssessorCell = (assessor, label) => {
                if (assessor) {
                    return `<span class="assessor-pill"><span class="assessor-label">${label}:</span>${escapeHtml(assessor.name)}</span>`;
                }
                return `<span class="assessor-pill not-allotted"><span class="assessor-label">${label}:</span>Unassigned</span>`;
            };

            const psychCell = renderAssessorCell(s.assignedPsych, "Psych");
            const gtoCell = renderAssessorCell(s.assignedGTO, "GTO");
            const toCell = renderAssessorCell(s.assignedTO, "TO");
            const ioCell = renderAssessorCell(s.assignedIO, "IO");

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
                    <td><span class="stage-badge ${stageClass}">${stageLabel}</span></td>
                    <td>${psychCell}</td>
                    <td>${gtoCell}</td>
                    <td>${toCell}</td>
                    <td>${ioCell}</td>
                    <td style="text-align: center;">
                        <button class="action-btn" title="Allot Assessors" onclick="openAllotmentModal('${s._id}', '${escapedName}', '${s.email}', '${s.phone || ''}', '${stageLabel}', '${stageClass}', '${s.profileImage || ''}', '${s.assignedPsych?._id || ''}', '${s.assignedGTO?._id || ''}', '${s.assignedTO?._id || ''}', '${s.assignedIO?._id || ''}', '${s.batch || ''}')">
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
    window.openAllotmentModal = (id, name, email, phone, stage, stageClass, avatarUrl, psychId, gtoId, toId, ioId, batch) => {
        modalStudentId.value = id;
        modalStudentName.innerText = name;
        modalStudentEmail.value = email;
        modalStudentPhone.value = phone || "N/A";
        
        modalStudentStage.innerText = stage;
        modalStudentStage.className = `stage-badge ${stageClass}`;

        const batchEl = document.getElementById("modalStudentBatch");
        if (batchEl) {
            batchEl.innerText = batch ? `${batch}` : "—";
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
                    assignedIO
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
            loadData(); // Reload table and active loads
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

    // Filtering and Searching
    function applyFilters() {
        const query = allotmentSearch.value.toLowerCase().trim();
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

    allotmentSearch.addEventListener("input", applyFilters);
    stageFilter.addEventListener("change", applyFilters);
    batchFilter.addEventListener("change", applyFilters);

    // Init
    if (token) {
        loadData();
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
