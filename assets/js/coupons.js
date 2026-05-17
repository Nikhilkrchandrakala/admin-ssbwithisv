/**
 * Coupon Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const couponTableBody = document.getElementById('couponTableBody');
    const couponTable = document.getElementById('couponTable');
    const tableLoading = document.getElementById('tableLoading');
    const emptyStateDiv = document.getElementById('emptyCouponState');
    const totalCouponsSpan = document.getElementById('totalCoupons');
    const activeCouponsSpan = document.getElementById('activeCoupons');
    const totalUsedSpan = document.getElementById('totalUsed');

    // Modals
    const couponModalElement = document.getElementById('couponModal');
    const couponModal = new bootstrap.Modal(couponModalElement);
    const modalTitle = document.getElementById('modalTitle');
    const saveBtn = document.getElementById('saveCouponBtn');
    const statusField = document.getElementById('statusField');

    let currentEditId = null;
    let allCoupons = [];

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            Swal.fire({
                icon: 'error',
                title: 'Session Expired',
                text: 'Please login again.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#e0c214'
            }).then(() => window.location.href = '/');
            return null;
        }
        return token;
    }

    // Load all coupons
    async function loadAllCoupons() {
        const token = getToken();
        if (!token) return;

        try {
            tableLoading.style.display = 'block';
            couponTable.style.display = 'none';
            emptyStateDiv.style.display = 'none';
            couponTableBody.innerHTML = '';

            const response = await fetch(`${API_BASE}/api/myCoupons`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch coupons');

            const data = await response.json();
            const coupons = data.coupons || data;
            allCoupons = coupons;

            if (!coupons || coupons.length === 0) {
                emptyStateDiv.style.display = 'block';
                updateStats([]);
                return;
            }

            updateStats(coupons);
            renderCouponTable(coupons);
            couponTable.style.display = 'table';

        } catch (error) {
            console.error(error);
            couponTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-warning p-4">${error.message}</td></tr>`;
            couponTable.style.display = 'table';
        } finally {
            tableLoading.style.display = 'none';
        }
    }

    function updateStats(coupons) {
        const total = coupons.length;
        const now = new Date();
        const active = coupons.filter(c => {
            if (!c.isActive) return false;
            if (c.expiry && new Date(c.expiry) < now) return false;
            return true;
        }).length;
        const totalUsed = coupons.reduce((sum, c) => sum + (c.usedBy?.length || 0), 0);

        totalCouponsSpan.textContent = total;
        activeCouponsSpan.textContent = active;
        totalUsedSpan.textContent = totalUsed;
    }

    function formatDiscount(coupon) {
        const value = coupon.discountValue;
        return coupon.discountType === 'percent' ? `${value}% OFF` : `₹${value} OFF`;
    }

    function getFranchiseDisplay(coupon) {
        if (coupon.franchiseId) {
            const name = typeof coupon.franchiseId === 'object' ? (coupon.franchiseId.name || 'Franchise') : 'Franchise';
            return `<span class="franchise-badge"><i class="fas fa-store me-1"></i> ${escapeHtml(name)}</span>`;
        }
        return '<span style="opacity: 0.5;">Admin</span>';
    }

    function renderCouponTable(coupons) {
        couponTableBody.innerHTML = '';

        coupons.forEach((coupon, index) => {
            const now = new Date();
            const isExpired = coupon.expiry ? new Date(coupon.expiry) < now : false;
            
            let statusClass = 'status-inactive';
            let statusText = 'Inactive';

            if (coupon.isActive && isExpired) {
                statusClass = 'status-expired';
                statusText = 'Expired';
            } else if (coupon.isActive && !isExpired) {
                statusClass = 'status-active';
                statusText = 'Active';
            }

            const expiryDate = coupon.expiry
                ? new Date(coupon.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                : '<span style="opacity: 0.3;">∞</span>';

            const usedCount = coupon.usedBy?.length || 0;
            const createdAt = coupon.createdAt
                ? new Date(coupon.createdAt).toLocaleDateString('en-IN')
                : 'N/A';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="coupon-code-badge">${escapeHtml(coupon.code)}</span></td>
                <td><span class="discount-val">${formatDiscount(coupon)}</span></td>
                <td>${expiryDate}</td>
                <td>${getFranchiseDisplay(coupon)}</td>
                <td><i class="fas fa-user-check me-1" style="opacity:0.5"></i> ${usedCount}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${createdAt}</td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="action-btn edit-btn" data-id="${coupon._id}" title="Edit Coupon">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" style="color: #ff6b6b;" data-id="${coupon._id}" title="Delete Coupon">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            `;

            couponTableBody.appendChild(row);
        });

        // Attach event listeners
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                openEditCouponModal(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                showDeleteConfirm(id);
            });
        });
    }

    // Modal Handlers
    const openAddModal = () => {
        currentEditId = null;
        modalTitle.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Create New Coupon';
        document.getElementById('couponForm').reset();
        document.getElementById('couponId').value = '';
        statusField.style.display = 'none';
        couponModal.show();
    };

    async function openEditCouponModal(id) {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/coupon/${id}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch coupon details');
            const coupon = await response.json();

            currentEditId = id;
            document.getElementById('couponId').value = coupon._id;
            document.getElementById('couponCode').value = coupon.code;
            document.getElementById('discountType').value = coupon.discountType;
            document.getElementById('discountValue').value = coupon.discountValue;

            if (coupon.expiry) {
                const expiryDate = new Date(coupon.expiry);
                const formattedDate = expiryDate.toISOString().slice(0, 16);
                document.getElementById('expiryDate').value = formattedDate;
            } else {
                document.getElementById('expiryDate').value = '';
            }

            document.getElementById('isActive').value = coupon.isActive ? 'true' : 'false';
            statusField.style.display = 'block';
            modalTitle.innerHTML = '<i class="fas fa-edit me-2"></i> Edit Coupon';
            couponModal.show();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message,
                background: '#1a1a1a',
                color: '#fff'
            });
        }
    }

    saveBtn.addEventListener('click', async () => {
        const code = document.getElementById('couponCode').value.trim().toUpperCase();
        const discountType = document.getElementById('discountType').value;
        const discountValue = parseFloat(document.getElementById('discountValue').value);
        const expiry = document.getElementById('expiryDate').value || null;

        if (!code) {
            Swal.fire({ icon: 'warning', title: 'Missing Code', text: 'Please enter a coupon code.', background: '#1a1a1a', color: '#fff' });
            return;
        }
        if (!discountValue || discountValue <= 0) {
            Swal.fire({ icon: 'warning', title: 'Invalid Discount', text: 'Please enter a valid discount value.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        const couponData = {
            code,
            discountType,
            discountValue,
            expiry: expiry ? new Date(expiry).toISOString() : null
        };

        if (currentEditId) {
            couponData.isActive = document.getElementById('isActive').value === 'true';
        }

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

            const token = getToken();
            const method = currentEditId ? 'PUT' : 'POST';
            const url = currentEditId ? `${API_BASE}/api/updateCoupon/${currentEditId}` : `${API_BASE}/api/createCoupon`;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(couponData)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Failed to save coupon');
            }

            Swal.fire({
                icon: 'success',
                title: currentEditId ? 'Coupon Updated' : 'Coupon Created',
                text: 'The coupon has been saved successfully.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#e0c214'
            });

            couponModal.hide();
            loadAllCoupons();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = 'Save Coupon';
        }
    });

    function showDeleteConfirm(id) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This coupon will be deleted forever. You can't undo this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Yes, delete it!',
            background: '#1a1a1a',
            color: '#fff'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = getToken();
                    const response = await fetch(`${API_BASE}/api/deleteCoupon/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Failed to delete coupon');

                    Swal.fire({ icon: 'success', title: 'Deleted!', text: 'Coupon has been removed.', background: '#1a1a1a', color: '#fff' });
                    loadAllCoupons();
                } catch (error) {
                    Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' });
                }
            }
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
    document.getElementById('openAddCouponModal')?.addEventListener('click', openAddModal);
    document.getElementById('emptyAddBtn')?.addEventListener('click', openAddModal);

    couponModalElement.addEventListener('hidden.bs.modal', () => {
        document.getElementById('couponForm').reset();
        currentEditId = null;
        statusField.style.display = 'none';
    });

    // Initial load
    loadAllCoupons();
});
