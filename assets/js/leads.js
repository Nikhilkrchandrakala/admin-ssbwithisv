/**
 * Leads Management JS
 * Features: Pagination, Search, Delete, Elevate to Candidate
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const leadsTableBody = document.getElementById("leadsTableBody");
    const leadsTable = document.getElementById("leadsTable");
    const tableLoading = document.getElementById("tableLoading");
    const emptyStateDiv = document.getElementById("emptyLeadsState");
    const infoSpan = document.getElementById("filterInfoMsg");
    const paginationControls = document.getElementById("paginationControls");
    const paginationInfo = document.getElementById("paginationInfo");
    const paginationButtons = document.getElementById("paginationButtons");
    const perPageSelect = document.getElementById("perPageSelect");
    const searchInput = document.getElementById("searchInput");
    
    // Filter Elements
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const applyBtn = document.getElementById("applyDateFilterBtn");
    const clearBtn = document.getElementById("clearDateFilterBtn");
    const exportFilteredBtn = document.getElementById("exportFilteredExcelBtn");
    const globalExcelBtn = document.getElementById("excelDownloadBtn");

    let allLeadsData = [];
    let currentlyFilteredLeads = [];
    let currentPage = 1;
    let perPage = 25;

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    // =================== FETCH ===================
    async function fetchLeads() {
        try {
            tableLoading.style.display = 'block';
            leadsTable.style.display = 'none';
            emptyStateDiv.style.display = 'none';
            paginationControls.style.display = 'none';
            
            const response = await fetch(`${API_BASE}/api/allLeads`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            allLeadsData = data.map(lead => ({ ...lead })).sort((a,b) => new Date(b.date) - new Date(a.date));
            currentlyFilteredLeads = [...allLeadsData];
            currentPage = 1;
            
            applySearchAndRender();
            updateInfoMsg();
        } catch (error) {
            console.error("Error fetching leads:", error);
            leadsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4"><i class="fas fa-exclamation-triangle me-2"></i> Failed to load leads: ${error.message}</td></tr>`;
            leadsTable.style.display = 'table';
        } finally {
            tableLoading.style.display = 'none';
        }
    }

    // =================== SEARCH ===================
    function getSearchFilteredLeads() {
        const query = (searchInput.value || "").toLowerCase().trim();
        if (!query) return currentlyFilteredLeads;

        return currentlyFilteredLeads.filter(lead => {
            const name = (lead.name || "").toLowerCase();
            const email = (lead.email || "").toLowerCase();
            const phone = (lead.phoneNumber || "").toLowerCase();
            return name.includes(query) || email.includes(query) || phone.includes(query);
        });
    }

    function applySearchAndRender() {
        const searchResults = getSearchFilteredLeads();
        currentPage = 1;
        renderPage(searchResults);
    }

    // =================== PAGINATION ===================
    function renderPage(displayLeads) {
        if (!displayLeads || displayLeads.length === 0) {
            emptyStateDiv.style.display = 'block';
            leadsTable.style.display = 'none';
            paginationControls.style.display = 'none';
            return;
        }

        emptyStateDiv.style.display = 'none';
        leadsTable.style.display = 'table';
        paginationControls.style.display = 'flex';

        const totalPages = Math.ceil(displayLeads.length / perPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIdx = (currentPage - 1) * perPage;
        const endIdx = Math.min(startIdx + perPage, displayLeads.length);
        const pageLeads = displayLeads.slice(startIdx, endIdx);

        // Render table rows
        leadsTableBody.innerHTML = "";
        pageLeads.forEach((lead, index) => {
            const globalIdx = startIdx + index + 1;
            const dateObj = new Date(lead.date);
            const formattedDate = dateObj.toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            let formattedTime = lead.time || "—";
            if (formattedTime === "N/A" && lead.date) {
                formattedTime = new Date(lead.date).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit', hour12: true });
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${globalIdx}</td>
                <td><span class="date-badge"><i class="far fa-calendar-alt me-1"></i> ${formattedDate}</span></td>
                <td><span class="date-badge"><i class="far fa-clock me-1"></i> ${formattedTime}</span></td>
                <td>
                    <span class="lead-name" style="font-size: 0.95rem;">${escapeHtml(lead.name || "—")}</span>
                </td>
                <td><span class="lead-contact"><i class="far fa-envelope me-1"></i> ${escapeHtml(lead.email || "—")}</span></td>
                <td><span class="lead-contact"><i class="fas fa-phone-alt me-1"></i> ${escapeHtml(lead.phoneNumber || "—")}</span></td>
            `;
            leadsTableBody.appendChild(row);
        });

        // Render pagination info
        paginationInfo.textContent = `Showing ${startIdx + 1}–${endIdx} of ${displayLeads.length} leads`;

        // Render pagination buttons
        renderPaginationButtons(totalPages);
    }

    function renderPaginationButtons(totalPages) {
        paginationButtons.innerHTML = "";

        // Previous
        const prevBtn = document.createElement("button");
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener("click", () => { currentPage--; renderPage(getSearchFilteredLeads()); });
        paginationButtons.appendChild(prevBtn);

        // Page numbers (smart range)
        const pages = getPageRange(currentPage, totalPages);
        pages.forEach(p => {
            if (p === "...") {
                const ellipsis = document.createElement("button");
                ellipsis.textContent = "…";
                ellipsis.disabled = true;
                ellipsis.style.cursor = "default";
                paginationButtons.appendChild(ellipsis);
            } else {
                const pageBtn = document.createElement("button");
                pageBtn.textContent = p;
                if (p === currentPage) pageBtn.classList.add("active");
                pageBtn.addEventListener("click", () => { currentPage = p; renderPage(getSearchFilteredLeads()); });
                paginationButtons.appendChild(pageBtn);
            }
        });

        // Next
        const nextBtn = document.createElement("button");
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener("click", () => { currentPage++; renderPage(getSearchFilteredLeads()); });
        paginationButtons.appendChild(nextBtn);
    }

    function getPageRange(current, total) {
        if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
        const pages = [];
        pages.push(1);
        if (current > 3) pages.push("...");
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push("...");
        pages.push(total);
        return pages;
    }

    // =================== DELETE ===================
    async function handleDelete(leadId, leadName) {
        const result = await Swal.fire({
            title: 'Delete Lead?',
            html: `Are you sure you want to permanently delete <strong>${leadName || "this lead"}</strong>?<br><small class="text-muted">This action cannot be undone.</small>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: '#555',
            confirmButtonText: '<i class="fas fa-trash-alt me-1"></i> Yes, Delete',
            cancelButtonText: 'Cancel',
            background: '#1a1a1a',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE}/api/leads/${leadId}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                // Remove from local arrays
                allLeadsData = allLeadsData.filter(l => l._id !== leadId);
                currentlyFilteredLeads = currentlyFilteredLeads.filter(l => l._id !== leadId);
                applySearchAndRender();
                updateInfoMsg();

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: data.message || 'Lead removed successfully.',
                    background: '#1a1a1a',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                throw new Error(data.error || 'Failed to delete');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Delete Failed',
                text: err.message,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    }

    // =================== ELEVATE ===================
    async function handleElevate(leadId, leadName, leadEmail) {
        const result = await Swal.fire({
            title: 'Elevate to Candidate?',
            html: `
                <p>This will create a registered user account for:</p>
                <div style="background: rgba(46, 204, 113, 0.08); border: 1px solid rgba(46, 204, 113, 0.2); border-radius: 8px; padding: 12px; margin: 10px 0; text-align: left;">
                    <strong style="color: #2ecc71;">${leadName || "—"}</strong><br>
                    <small style="opacity: 0.7;">${leadEmail || "—"}</small>
                </div>
                <p style="font-size: 0.85rem; opacity: 0.7;">The user will be assigned a temporary password (<code>password123</code>) and can reset it via Forgot Password.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2ecc71',
            cancelButtonColor: '#555',
            confirmButtonText: '<i class="fas fa-user-plus me-1"></i> Yes, Elevate',
            cancelButtonText: 'Cancel',
            background: '#1a1a1a',
            color: '#fff'
        });

        if (!result.isConfirmed) return;

        try {
            const res = await fetch(`${API_BASE}/api/leads/${leadId}/elevate`, { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                Swal.fire({
                    icon: 'success',
                    title: 'Lead Elevated!',
                    html: `<strong>${data.user?.name || leadName}</strong> is now a registered candidate.<br><small>They can log in with temporary password <code>password123</code>.</small>`,
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#e0c214'
                });
            } else if (res.status === 409) {
                Swal.fire({
                    icon: 'info',
                    title: 'Already Registered',
                    html: `This lead already has a registered account:<br><strong>${data.user?.name}</strong> (${data.user?.email})`,
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#e0c214'
                });
            } else {
                throw new Error(data.error || 'Failed to elevate');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Elevation Failed',
                text: err.message,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    }

    // =================== FILTERS ===================
    function updateInfoMsg() {
        const from = fromDateInput.value;
        const to = toDateInput.value;
        const searchQuery = (searchInput.value || "").trim();
        
        let parts = [];
        if (from || to) {
            let rangeText = "";
            if (from && to) rangeText = `${from} to ${to}`;
            else if (from) rangeText = `from ${from}`;
            else if (to) rangeText = `until ${to}`;
            parts.push(`filtered by date (${rangeText})`);
        }
        if (searchQuery) {
            parts.push(`searching "${searchQuery}"`);
        }
        
        const displayed = getSearchFilteredLeads().length;
        if (parts.length > 0) {
            infoSpan.innerHTML = `<i class="fas fa-filter me-2"></i> ${displayed} leads — ${parts.join(", ")}`;
        } else {
            infoSpan.innerHTML = `<i class="fas fa-check-circle me-2"></i> Total: ${allLeadsData.length} leads`;
        }
    }

    function applyFilters() {
        const from = fromDateInput.value;
        const to = toDateInput.value;
        
        currentlyFilteredLeads = allLeadsData.filter(lead => {
            const leadYMD = new Date(lead.date).toISOString().split("T")[0];
            if (from && to) return leadYMD >= from && leadYMD <= to;
            if (from) return leadYMD >= from;
            if (to) return leadYMD <= to;
            return true;
        });
        
        currentPage = 1;
        applySearchAndRender();
        updateInfoMsg();
        
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            background: '#1a1a1a',
            color: '#fff'
        });
        Toast.fire({
            icon: 'info',
            title: `Filter applied: ${getSearchFilteredLeads().length} results`
        });
    }

    function clearFilters() {
        fromDateInput.value = "";
        toDateInput.value = "";
        searchInput.value = "";
        currentlyFilteredLeads = [...allLeadsData];
        currentPage = 1;
        applySearchAndRender();
        updateInfoMsg();
    }

    // =================== EXPORT ===================
    function exportToExcel(leadsArray, fileName) {
        if (!leadsArray || leadsArray.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'No Data',
                text: 'There is no data to export for the current selection.',
                background: '#1a1a1a',
                color: '#fff'
            });
            return;
        }

        const mappedData = leadsArray.map(lead => {
            const dateObj = new Date(lead.date);
            return {
                "Date": dateObj.toLocaleDateString("en-GB"),
                "Time": dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }),
                "Name": lead.name || "—",
                "Email": lead.email || "—",
                "Phone": lead.phoneNumber || "—"
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(mappedData);
        XLSX.utils.book_append_sheet(wb, ws, "Leads Data");
        XLSX.writeFile(wb, fileName);
        
        Swal.fire({
            icon: 'success',
            title: 'Export Complete',
            text: `File "${fileName}" has been downloaded.`,
            background: '#1a1a1a',
            color: '#fff',
            confirmButtonColor: '#e0c214'
        });
    }

    // =================== HELPERS ===================
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>"']/g, function (m) {
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return map[m] || m;
        });
    }

    // =================== EVENT LISTENERS ===================
    applyBtn.addEventListener("click", applyFilters);
    clearBtn.addEventListener("click", clearFilters);
    
    searchInput.addEventListener("input", () => {
        currentPage = 1;
        applySearchAndRender();
        updateInfoMsg();
    });

    perPageSelect.addEventListener("change", () => {
        perPage = parseInt(perPageSelect.value);
        currentPage = 1;
        renderPage(getSearchFilteredLeads());
    });
    
    exportFilteredBtn.addEventListener("click", () => {
        const exportData = getSearchFilteredLeads();
        const from = fromDateInput.value;
        const to = toDateInput.value;
        let name = "Leads_Export.xlsx";
        if (from && to) name = `Leads_${from}_to_${to}.xlsx`;
        else if (from) name = `Leads_from_${from}.xlsx`;
        else if (to) name = `Leads_until_${to}.xlsx`;
        exportToExcel(exportData, name);
    });

    globalExcelBtn.addEventListener("click", () => {
        exportToExcel(allLeadsData, "All_Leads_Complete.xlsx");
    });

    // =================== INIT ===================
    fetchLeads();
});
