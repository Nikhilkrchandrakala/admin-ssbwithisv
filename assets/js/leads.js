/**
 * Leads Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const leadsTableBody = document.getElementById("leadsTableBody");
    const leadsTable = document.getElementById("leadsTable");
    const tableLoading = document.getElementById("tableLoading");
    const emptyStateDiv = document.getElementById("emptyLeadsState");
    const infoSpan = document.getElementById("filterInfoMsg");
    
    // Filter Elements
    const fromDateInput = document.getElementById("fromDate");
    const toDateInput = document.getElementById("toDate");
    const applyBtn = document.getElementById("applyDateFilterBtn");
    const clearBtn = document.getElementById("clearDateFilterBtn");
    const exportFilteredBtn = document.getElementById("exportFilteredExcelBtn");
    const globalExcelBtn = document.getElementById("excelDownloadBtn");

    let allLeadsData = [];
    let currentlyFilteredLeads = [];

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    // Fetch leads from API
    async function fetchLeads() {
        try {
            tableLoading.style.display = 'block';
            leadsTable.style.display = 'none';
            emptyStateDiv.style.display = 'none';
            
            const response = await fetch(`${API_BASE}/api/allLeads`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            // Assuming backend returns array of leads. Sort by date desc
            allLeadsData = data.map(lead => ({ ...lead })).sort((a,b) => new Date(b.date) - new Date(a.date));
            currentlyFilteredLeads = [...allLeadsData];
            
            renderLeadsTable(currentlyFilteredLeads);
            updateInfoMsg();
            
            if (allLeadsData.length > 0) {
                leadsTable.style.display = 'table';
            } else {
                emptyStateDiv.style.display = 'block';
            }
        } catch (error) {
            console.error("Error fetching leads:", error);
            leadsTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger p-4"><i class="fas fa-exclamation-triangle me-2"></i> Failed to load leads: ${error.message}</td></tr>`;
            leadsTable.style.display = 'table';
        } finally {
            tableLoading.style.display = 'none';
        }
    }

    function renderLeadsTable(leadsArray) {
        leadsTableBody.innerHTML = "";
        if (!leadsArray || leadsArray.length === 0) {
            emptyStateDiv.style.display = 'block';
            leadsTable.style.display = 'none';
            return;
        }
        
        emptyStateDiv.style.display = 'none';
        leadsTable.style.display = 'table';

        leadsArray.forEach((lead, index) => {
            const dateObj = new Date(lead.date);
            const formattedDate = dateObj.toLocaleDateString("en-GB", { day: '2-digit', month: '2-digit', year: 'numeric' });
            const formattedTime = dateObj.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <div class="date-badge">${formattedDate}</div>
                    <div style="font-size: 0.7rem; opacity: 0.5;">${formattedTime}</div>
                </td>
                <td><span class="lead-name">${escapeHtml(lead.name || "—")}</span></td>
                <td><span class="lead-contact"><i class="far fa-envelope me-1"></i> ${escapeHtml(lead.email || "—")}</span></td>
                <td><span class="lead-contact"><i class="fas fa-phone-alt me-1"></i> ${escapeHtml(lead.phoneNumber || "—")}</span></td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); font-weight: 400;">Magazine</span></td>
            `;
            leadsTableBody.appendChild(row);
        });
    }

    function updateInfoMsg() {
        const from = fromDateInput.value;
        const to = toDateInput.value;
        
        if (from || to) {
            let rangeText = "";
            if (from && to) rangeText = `${from} to ${to}`;
            else if (from) rangeText = `from ${from}`;
            else if (to) rangeText = `until ${to}`;
            infoSpan.innerHTML = `<i class="fas fa-filter me-2"></i> Showing ${currentlyFilteredLeads.length} filtered leads (${rangeText})`;
        } else {
            infoSpan.innerHTML = `<i class="fas fa-check-circle me-2"></i> Showing all ${allLeadsData.length} leads`;
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
        
        renderLeadsTable(currentlyFilteredLeads);
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
            title: `Filter applied: ${currentlyFilteredLeads.length} results`
        });
    }

    function clearFilters() {
        fromDateInput.value = "";
        toDateInput.value = "";
        currentlyFilteredLeads = [...allLeadsData];
        renderLeadsTable(currentlyFilteredLeads);
        updateInfoMsg();
    }

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

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // Event Listeners
    applyBtn.addEventListener("click", applyFilters);
    clearBtn.addEventListener("click", clearFilters);
    
    exportFilteredBtn.addEventListener("click", () => {
        const from = fromDateInput.value;
        const to = toDateInput.value;
        let name = "Leads_Export.xlsx";
        if (from && to) name = `Leads_${from}_to_${to}.xlsx`;
        else if (from) name = `Leads_from_${from}.xlsx`;
        else if (to) name = `Leads_until_${to}.xlsx`;
        
        exportToExcel(currentlyFilteredLeads, name);
    });

    globalExcelBtn.addEventListener("click", () => {
        exportToExcel(allLeadsData, "All_Leads_Complete.xlsx");
    });

    // Initial Load
    fetchLeads();
});
