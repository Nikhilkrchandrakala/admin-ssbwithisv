/**
 * Total Sales Analytics JS
 * Standardized for the Charcoal/Gold Admin System
 * v2 — Booking Method tagging (manual / standard / franchise)
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const ordersTableBody = document.getElementById('ordersTableBody');
    const ordersTable = document.getElementById('ordersTable');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const franchiseFilter = document.getElementById('franchiseFilter');
    const batchNoFilter = document.getElementById('batchNoFilter');
    const startDateFilter = document.getElementById('startDateFilter');
    const endDateFilter = document.getElementById('endDateFilter');
    const clearFiltersBtn = document.getElementById('clearFiltersBtn');
    const refreshBtn = document.getElementById('refreshBtn');

    // Stats Elements
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const franchiseOrdersEl = document.getElementById('franchiseOrders');
    const directOrdersEl = document.getElementById('directOrders');

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    let allOrders = [];

    function getToken() {
        return localStorage.getItem('token');
    }

    // ─────────────────────────────────────────────────────────────────
    //  Resolve booking method
    //
    //  Source-of-truth rules (works for ALL orders incl. legacy):
    //    • No paymentId                        → manual   (admin booked, no Razorpay txn)
    //    • Has paymentId + has referralCode    → franchise (came via partner link, then paid)
    //    • Has paymentId + no referralCode     → standard  (direct gateway payment)
    //
    //  If the stored bookingMethod field is explicitly set it is used as-is
    //  for any future orders written by the new backend code.
    // ─────────────────────────────────────────────────────────────────
    function resolveBookingMethod(o) {
        // Prefer the explicit DB field when present (new orders)
        if (o.bookingMethod) return o.bookingMethod;

        // Infer from paymentId + referralCode (legacy orders & fallback)
        const hasPayment  = o.paymentId && o.paymentId.trim() !== '';
        const hasReferral = o.referralCode && o.referralCode.trim() !== '';

        if (!hasPayment)               return 'manual';    // No Razorpay → admin manual booking
        if (hasPayment && hasReferral) return 'franchise'; // Paid via gateway with a partner code
        return 'standard';                                  // Paid via gateway, no partner
    }

    // ─────────────────────────────────────────────────────────────────
    //  Booking Method Badge HTML
    // ─────────────────────────────────────────────────────────────────
    function bookingMethodBadge(o) {
        const method = resolveBookingMethod(o);
        const badges = {
            manual: {
                icon: 'fa-tools',
                label: 'Manual',
                style: 'background:rgba(230,126,34,0.15); color:#e67e22; border:1px solid rgba(230,126,34,0.3);'
            },
            standard: {
                icon: 'fa-credit-card',
                label: 'Standard',
                style: 'background:rgba(52,152,219,0.15); color:#3498db; border:1px solid rgba(52,152,219,0.3);'
            },
            franchise: {
                icon: 'fa-store',
                label: o.referralCode ? `Franchise · ${escapeHtml(o.referralCode)}` : 'Franchise',
                style: 'background:rgba(224,194,20,0.12); color:#e0c214; border:1px solid rgba(224,194,20,0.3);'
            }
        };
        const b = badges[method] || badges.standard;
        return `<div class="franchise-info">
                    <span style="padding:3px 8px; border-radius:4px; font-size:0.72rem; font-weight:800;
                                 text-transform:uppercase; display:inline-flex; align-items:center; gap:5px;
                                 ${b.style}">
                        <i class="fas ${b.icon}" style="font-size:0.7rem;"></i>${b.label}
                    </span>
                </div>`;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Load data
    // ─────────────────────────────────────────────────────────────────
    async function loadData() {
        const token = getToken();
        if (!token) return;

        try {
            loadingSpinner.style.display = 'block';
            ordersTable.style.display = 'none';
            emptyState.style.display = 'none';

            const response = await fetch(`${API_BASE}/api/allOrders`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch sales data');

            const data = await response.json();
            allOrders = data.orders || data;

            await populateBookingTypeFilter();
            updateStats();
            renderTable();

        } catch (error) {
            console.error('Fetch error:', error);
            Swal.fire({ icon: 'error', title: 'Data Sync Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  Populate filter dropdown
    //  Structure: All | Manual | Standard | Franchise | — partners —
    // ─────────────────────────────────────────────────────────────────
    async function populateBookingTypeFilter() {
        const current = franchiseFilter.value;

        franchiseFilter.innerHTML = `
            <option value="all">All Booking Types</option>
            <optgroup label="─── By Method ───">
                <option value="manual">🛠 Manual (Admin Booked)</option>
                <option value="standard">💳 Standard (Payment Gateway)</option>
                <option value="franchise">🏪 Franchise (Referral)</option>
            </optgroup>
        `;

        // Append individual franchise partner options
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/allFranchise`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const partners = await res.json();
                const hasPartners = partners && partners.length > 0;
                if (hasPartners) {
                    const group = document.createElement('optgroup');
                    group.label = '─── By Partner Code ───';
                    partners.forEach(p => {
                        if (!p.referralCode) return;
                        const opt = document.createElement('option');
                        opt.value = p.referralCode;
                        opt.textContent = `${p.name} (${p.referralCode})`;
                        if (p.referralCode === current) opt.selected = true;
                        group.appendChild(opt);
                    });
                    franchiseFilter.appendChild(group);
                }
            }
        } catch (e) { console.error("Partner fetch error:", e); }

        // Restore selection if it was a simple method value
        if (['all', 'manual', 'standard', 'franchise'].includes(current)) {
            franchiseFilter.value = current;
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  KPI Stats
    // ─────────────────────────────────────────────────────────────────
    function updateStats() {
        const total = allOrders.length;
        const revenue = allOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);

        const franchiseCount = allOrders.filter(o => resolveBookingMethod(o) === 'franchise').length;
        const directCount = allOrders.filter(o => resolveBookingMethod(o) !== 'franchise').length;

        totalOrdersEl.innerText = total;
        totalRevenueEl.innerText = `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        franchiseOrdersEl.innerText = franchiseCount;
        directOrdersEl.innerText = directCount;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Render table with filters applied
    // ─────────────────────────────────────────────────────────────────
    function renderTable() {
        let filtered = [...allOrders];

        // Search
        const search = searchInput.value.toLowerCase();
        if (search) {
            filtered = filtered.filter(o => {
                const name = (o.userId?.name || o.customerName || '').toLowerCase();
                const email = (o.userId?.email || o.email || '').toLowerCase();
                const id = (o.orderId || o._id || '').toLowerCase();
                const product = (o.slotId?.title || o.courseTitle || '').toLowerCase();
                return name.includes(search) || email.includes(search) || id.includes(search) || product.includes(search);
            });
        }

        // Booking Type / Partner filter
        const pVal = franchiseFilter.value;
        if (pVal === 'manual') {
            filtered = filtered.filter(o => resolveBookingMethod(o) === 'manual');
        } else if (pVal === 'standard') {
            filtered = filtered.filter(o => resolveBookingMethod(o) === 'standard');
        } else if (pVal === 'franchise') {
            filtered = filtered.filter(o => resolveBookingMethod(o) === 'franchise');
        } else if (pVal !== 'all') {
            // Specific franchise partner referral code
            filtered = filtered.filter(o => o.referralCode === pVal);
        }

        // Batch filter
        const bVal = batchNoFilter.value.toLowerCase().trim();
        if (bVal) {
            filtered = filtered.filter(o => (o.slotId?.batchNo || '').toLowerCase().includes(bVal));
        }

        // Date range
        if (startDateFilter.value) {
            const start = new Date(startDateFilter.value);
            start.setHours(0, 0, 0, 0);
            filtered = filtered.filter(o => new Date(o.createdAt) >= start);
        }
        if (endDateFilter.value) {
            const end = new Date(endDateFilter.value);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(o => new Date(o.createdAt) <= end);
        }

        if (filtered.length === 0) {
            ordersTable.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        ordersTable.style.display = 'table';
        ordersTableBody.innerHTML = '';

        filtered.forEach(o => {
            const tr = document.createElement('tr');

            const prodTitle = o.slotId?.title || o.courseTitle || o.courseId?.title || 'Unknown Product';
            const isBatch = !!o.slotId;
            const badgeClass = isBatch ? 'badge-batch' : 'badge-course';
            const badgeIcon = isBatch ? 'fa-calendar-alt' : 'fa-book';

            const statusClass = (o.status || '').toLowerCase() === 'paid' ? 'status-paid' : 'status-pending';
            const date = new Date(o.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

            tr.innerHTML = `
                <td><code style="color:var(--primary-gold)">#${(o.orderId || o._id).substring(0, 10)}</code></td>
                <td>
                    <div style="font-weight:600;">${escapeHtml(o.userId?.name || o.customerName || 'Guest')}</div>
                    <div class="small opacity-50">${escapeHtml(o.userId?.email || o.email || '-')}</div>
                </td>
                <td>
                    <span class="product-badge ${badgeClass}">
                        <i class="fas ${badgeIcon}"></i> ${isBatch ? 'BATCH' : 'COURSE'}
                    </span>
                    <div style="font-size:0.85rem; font-weight:500;">${escapeHtml(prodTitle)}</div>
                </td>
                <td class="text-success" style="font-weight:700;">₹${(parseFloat(o.price) || 0).toFixed(2)}</td>
                <td>${bookingMethodBadge(o)}</td>
                <td><code style="color:var(--text-white); opacity:0.8;">${o.slotId?.batchNo || '—'}</code></td>
                <td><span class="status-badge ${statusClass}">${(o.status || 'pending').toUpperCase()}</span></td>
                <td><span style="font-size:0.85rem; opacity:0.6;">${date}</span></td>
                <td class="text-end">
                    <button class="action-btn" onclick='showOrderDetail(${JSON.stringify(o).replace(/'/g, "&#39;")})'>
                        <i class="fas fa-receipt"></i>
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  Order Detail Modal
    // ─────────────────────────────────────────────────────────────────
    window.showOrderDetail = (o) => {
        const body = document.getElementById('orderDetailBody');
        const finalPrice = parseFloat(o.price) || 0;
        const origPrice = parseFloat(o.originalAmount) || finalPrice;
        const discount = parseFloat(o.discount) || 0;
        const method = resolveBookingMethod(o);

        const methodLabels = {
            manual: '🛠 Manual (Admin Booked)',
            standard: '💳 Standard (Payment Gateway)',
            franchise: `🏪 Franchise — Partner: ${o.referralCode || 'N/A'}`
        };
        const methodDisplay = methodLabels[method] || methodLabels.standard;

        body.innerHTML = `
            <div class="order-detail-row"><span>Transaction ID</span><span class="fw-bold">${o.orderId || o._id}</span></div>
            <div class="order-detail-row"><span>Razorpay Payment ID</span><span class="fw-bold">${o.paymentId || 'N/A'}</span></div>
            <div class="order-detail-row"><span>Customer Name</span><span class="fw-bold">${escapeHtml(o.userId?.name || o.customerName || 'Guest')}</span></div>
            <div class="order-detail-row"><span>Customer Email</span><span class="fw-bold">${escapeHtml(o.userId?.email || o.email || '-')}</span></div>
            <div class="order-detail-row"><span>Product Title</span><span class="fw-bold">${escapeHtml(o.slotId?.title || o.courseTitle || 'Product')}</span></div>
            <div class="order-detail-row" style="align-items: center;">
                <span>Batch Number</span>
                <div class="d-flex gap-2 align-items-center">
                    <input type="text" id="editOrderBatchInput" class="admin-input py-1 px-2" style="max-width: 140px; font-size: 0.85rem; background: var(--surface-light); border: 1px solid rgba(224, 194, 20, 0.25); color: #fff; border-radius: 4px;" value="${o.slotId?.batchNo || ''}" placeholder="e.g. B45">
                    <button class="thm-btn py-1 px-3" style="font-size: 0.78rem; padding: 4px 10px; border-radius: 4px;" onclick="saveOrderBatch('${o._id}', '${o.slotId?._id || ''}')"><i class="fas fa-save"></i> Save</button>
                </div>
            </div>
            <div class="order-detail-row"><span>Original Amount</span><span class="fw-bold">₹${origPrice.toFixed(2)}</span></div>
            <div class="order-detail-row"><span>Discount Applied</span><span class="text-success">₹${discount.toFixed(2)}</span></div>
            <div class="order-detail-row" style="background: rgba(224,194,20,0.05); padding: 15px; margin: 10px 0; border-radius: 8px;">
                <span>FINAL PAYOUT</span><span class="fw-bold text-warning" style="font-size: 1.2rem;">₹${finalPrice.toFixed(2)}</span>
            </div>
            <div class="order-detail-row"><span>Coupon Used</span><span class="badge bg-warning text-dark">${o.couponCode || 'NONE'}</span></div>
            <div class="order-detail-row"><span>Booking Method</span><span class="fw-bold">${methodDisplay}</span></div>
            <div class="order-detail-row"><span>Status</span><span class="status-badge ${o.status === 'paid' ? 'status-paid' : 'status-pending'}">${(o.status || 'pending').toUpperCase()}</span></div>
            <div class="order-detail-row"><span>Date &amp; Time</span><span class="opacity-70">${new Date(o.createdAt).toLocaleString()}</span></div>
        `;
        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    };

    // ─────────────────────────────────────────────────────────────────
    //  Save batch number inline edit
    // ─────────────────────────────────────────────────────────────────
    window.saveOrderBatch = async (orderId, slotId) => {
        const newBatch = document.getElementById('editOrderBatchInput').value.trim();
        if (!newBatch) {
            Swal.fire({ icon: 'warning', text: 'Please enter a batch number.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        try {
            Swal.fire({
                title: 'Saving Batch Info...',
                text: 'Updating batch schedule details.',
                allowOutsideClick: false,
                background: '#1a1a1a',
                color: '#fff',
                didOpen: () => { Swal.showLoading(); }
            });

            const token = getToken();
            const response = await fetch(`${API_BASE}/api/admin/orders/${orderId}/batch`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ batchNo: newBatch })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to update transaction batch');

            Swal.fire({
                icon: 'success',
                title: 'Batch Saved!',
                text: 'The batch number has been updated successfully.',
                background: '#1a1a1a',
                color: '#fff',
                timer: 1500,
                showConfirmButton: false
            });

            // Update in-memory record
            const orderIdx = allOrders.findIndex(o => o._id === orderId);
            if (orderIdx !== -1) {
                if (!allOrders[orderIdx].slotId) allOrders[orderIdx].slotId = {};
                allOrders[orderIdx].slotId.batchNo = newBatch;
            }

            const modalEl = document.getElementById('orderDetailModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();

            renderTable();

        } catch (error) {
            console.error("Save order batch error:", error);
            Swal.fire({
                icon: 'error',
                title: 'Allotment Sync Failed',
                text: error.message,
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#ff6b6b'
            });
        }
    };

    // ─────────────────────────────────────────────────────────────────
    //  Utilities
    // ─────────────────────────────────────────────────────────────────
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    function toggleClear() {
        const hasFilter = searchInput.value || franchiseFilter.value !== 'all' || batchNoFilter.value || startDateFilter.value || endDateFilter.value;
        clearFiltersBtn.style.display = hasFilter ? 'inline-block' : 'none';
    }

    // ─────────────────────────────────────────────────────────────────
    //  Event Listeners
    // ─────────────────────────────────────────────────────────────────
    [searchInput, franchiseFilter, batchNoFilter, startDateFilter, endDateFilter].forEach(el => {
        el.addEventListener('input', () => { renderTable(); toggleClear(); });
    });

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        franchiseFilter.value = 'all';
        batchNoFilter.value = '';
        startDateFilter.value = '';
        endDateFilter.value = '';
        renderTable();
        toggleClear();
    });

    refreshBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Syncing...',
            background: '#1a1a1a',
            color: '#fff',
            timer: 1000,
            didOpen: () => { Swal.showLoading(); loadData(); }
        });
    });

    loadData();
});
