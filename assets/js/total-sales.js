/**
 * Total Sales Analytics JS
 * Standardized for the Charcoal/Gold Admin System
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

            await populatePartners();
            updateStats();
            renderTable();

        } catch (error) {
            console.error('Fetch error:', error);
            Swal.fire({ icon: 'error', title: 'Data Sync Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    async function populatePartners() {
        try {
            const token = getToken();
            const res = await fetch(`${API_BASE}/api/allFranchise`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!res.ok) return;
            const partners = await res.json();

            const current = franchiseFilter.value;
            franchiseFilter.innerHTML = `<option value="all">Global (All Channels)</option><option value="direct">Direct Bookings Only</option>`;
            
            partners.forEach(p => {
                if (!p.referralCode) return;
                const opt = document.createElement('option');
                opt.value = p.referralCode;
                opt.textContent = `${p.name} (${p.referralCode})`;
                if (p.referralCode === current) opt.selected = true;
                franchiseFilter.appendChild(opt);
            });
        } catch (e) { console.error("Partner fetch error:", e); }
    }

    function updateStats() {
        const total = allOrders.length;
        const revenue = allOrders.reduce((s, o) => s + (parseFloat(o.price) || 0), 0);
        const franchiseCount = allOrders.filter(o => o.referralCode && o.referralCode.trim() !== '').length;
        const directCount = total - franchiseCount;

        totalOrdersEl.innerText = total;
        totalRevenueEl.innerText = `₹${revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        franchiseOrdersEl.innerText = franchiseCount;
        directOrdersEl.innerText = directCount;
    }

    function renderTable() {
        let filtered = [...allOrders];

        // Apply Search
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

        // Apply Partner Filter
        const pVal = franchiseFilter.value;
        if (pVal === 'direct') {
            filtered = filtered.filter(o => !o.referralCode || o.referralCode.trim() === '');
        } else if (pVal !== 'all') {
            filtered = filtered.filter(o => o.referralCode === pVal);
        }

        // Apply Batch Filter
        const bVal = batchNoFilter.value.toLowerCase().trim();
        if (bVal) {
            filtered = filtered.filter(o => (o.slotId?.batchNo || '').toLowerCase().includes(bVal));
        }

        // Apply Date Range
        if (startDateFilter.value) {
            const start = new Date(startDateFilter.value);
            start.setHours(0,0,0,0);
            filtered = filtered.filter(o => new Date(o.createdAt) >= start);
        }
        if (endDateFilter.value) {
            const end = new Date(endDateFilter.value);
            end.setHours(23,59,59,999);
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
            
            const isFranchise = o.referralCode && o.referralCode.trim() !== '';
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
                <td>
                    <div class="franchise-info">
                        <i class="fas ${isFranchise ? 'fa-store' : 'fa-user-direct'}"></i>
                        <span>${isFranchise ? escapeHtml(o.referralCode) : 'Direct Booking'}</span>
                    </div>
                </td>
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

    window.showOrderDetail = (o) => {
        const body = document.getElementById('orderDetailBody');
        const finalPrice = parseFloat(o.price) || 0;
        const origPrice = parseFloat(o.originalAmount) || finalPrice;
        const discount = parseFloat(o.discount) || 0;

        body.innerHTML = `
            <div class="order-detail-row"><span>Transaction ID</span><span class="fw-bold">${o.orderId || o._id}</span></div>
            <div class="order-detail-row"><span>Razorpay Payment ID</span><span class="fw-bold">${o.paymentId || 'N/A'}</span></div>
            <div class="order-detail-row"><span>Customer Name</span><span class="fw-bold">${escapeHtml(o.userId?.name || o.customerName || 'Guest')}</span></div>
            <div class="order-detail-row"><span>Customer Email</span><span class="fw-bold">${escapeHtml(o.userId?.email || o.email || '-')}</span></div>
            <div class="order-detail-row"><span>Product Title</span><span class="fw-bold">${escapeHtml(o.slotId?.title || o.courseTitle || 'Product')}</span></div>
            <div class="order-detail-row"><span>Batch Number</span><span class="fw-bold">${o.slotId?.batchNo || 'N/A'}</span></div>
            <div class="order-detail-row"><span>Original Amount</span><span class="fw-bold">₹${origPrice.toFixed(2)}</span></div>
            <div class="order-detail-row"><span>Discount Applied</span><span class="text-success">₹${discount.toFixed(2)}</span></div>
            <div class="order-detail-row" style="background: rgba(224,194,20,0.05); padding: 15px; margin: 10px 0; border-radius: 8px;">
                <span>FINAL PAYOUT</span><span class="fw-bold text-warning" style="font-size: 1.2rem;">₹${finalPrice.toFixed(2)}</span>
            </div>
            <div class="order-detail-row"><span>Coupon Used</span><span class="badge bg-warning text-dark">${o.couponCode || 'NONE'}</span></div>
            <div class="order-detail-row"><span>Referral Partner</span><span class="fw-bold">${o.referralCode || 'Direct (No Partner)'}</span></div>
            <div class="order-detail-row"><span>Status</span><span class="status-badge ${o.status === 'paid' ? 'status-paid' : 'status-pending'}">${(o.status || 'pending').toUpperCase()}</span></div>
            <div class="order-detail-row"><span>Date & Time</span><span class="opacity-70">${new Date(o.createdAt).toLocaleString()}</span></div>
        `;
        new bootstrap.Modal(document.getElementById('orderDetailModal')).show();
    };

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

    // Event Listeners
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
