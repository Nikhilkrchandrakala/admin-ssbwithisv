/**
 * Franchise Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const franchiseTableBody = document.getElementById('franchiseTableBody');
    const franchiseTable = document.getElementById('franchiseTable');
    const tableLoading = document.getElementById('tableLoading');
    const emptyStateDiv = document.getElementById('emptyFranchiseState');
    const listView = document.getElementById('listView');
    const detailView = document.getElementById('detailView');
    const backToListBtn = document.getElementById('backToListBtn');
    
    // Modals
    const addModal = new bootstrap.Modal(document.getElementById('addFranchiseModal'));
    
    // Form Elements
    const createBtn = document.getElementById('createFranchiseBtn');
    const franchiseName = document.getElementById('franchiseName');
    const franchiseEmail = document.getElementById('franchiseEmail');
    const franchisePhone = document.getElementById('franchisePhone');
    const franchiseCommission = document.getElementById('franchiseCommission');
    const franchisePassword = document.getElementById('franchisePassword');
    const modalFormMessage = document.getElementById('modalFormMessage');

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

    function showModalMessage(msg, type) {
        modalFormMessage.innerHTML = `<div class="alert alert-${type === 'danger' ? 'danger' : 'success'} mt-2" style="background: rgba(${type === 'danger' ? '231,76,60' : '46,204,113'}, 0.1); border-color: ${type === 'danger' ? '#e74c3c' : '#2ecc71'}; color: ${type === 'danger' ? '#e74c3c' : '#2ecc71'};">${msg}</div>`;
        setTimeout(() => { modalFormMessage.innerHTML = ''; }, 4000);
    }

    // Create Franchise from Modal
    createBtn.addEventListener('click', async () => {
        const name = franchiseName.value.trim();
        const email = franchiseEmail.value.trim();
        const phone = franchisePhone.value.trim();
        const password = franchisePassword.value;
        let commissionPercent = parseInt(franchiseCommission.value);

        if (!name || !email || !password) {
            showModalMessage('Please fill all required fields (Name, Email, Password)', 'danger');
            return;
        }
        if (password.length < 6) {
            showModalMessage('Password must be at least 6 characters', 'danger');
            return;
        }
        if (isNaN(commissionPercent) || commissionPercent < 0) {
            commissionPercent = 20;
        }
        if (commissionPercent > 100) {
            showModalMessage('Commission percentage cannot exceed 100%', 'danger');
            return;
        }

        try {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating...';

            const response = await fetch(`${API_BASE}/api/createFranchise`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    email,
                    phone,
                    password,
                    commissionPercent: commissionPercent
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Failed to create franchise');

            Swal.fire({
                icon: 'success',
                title: 'Franchise Created',
                text: 'The new franchise partner has been successfully added.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#e0c214'
            });

            // Reset form
            document.getElementById('addFranchiseForm').reset();
            franchiseCommission.value = '20';

            // Close modal
            addModal.hide();
            loadAllFranchises();

        } catch (error) {
            showModalMessage(error.message, 'danger');
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = 'Create Franchise';
        }
    });

    window.copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                background: '#1a1a1a',
                color: '#fff'
            });
            Toast.fire({
                icon: 'success',
                title: 'Referral link copied!'
            });
        }).catch(() => {
            Swal.fire({
                icon: 'error',
                title: 'Copy Failed',
                text: text,
                background: '#1a1a1a',
                color: '#fff'
            });
        });
    };

    // Load all franchises
    async function loadAllFranchises() {
        try {
            tableLoading.style.display = 'block';
            franchiseTable.style.display = 'none';
            emptyStateDiv.style.display = 'none';
            franchiseTableBody.innerHTML = '';

            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/allFranchise`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch franchises');
            const franchises = await response.json();

            if (!franchises || franchises.length === 0) {
                emptyStateDiv.style.display = 'block';
                return;
            }
            renderFranchiseTable(franchises);
            franchiseTable.style.display = 'table';
        } catch (error) {
            console.error(error);
            franchiseTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-warning p-4">${error.message}</td></tr>`;
            franchiseTable.style.display = 'table';
        } finally {
            tableLoading.style.display = 'none';
        }
    }

    function renderFranchiseTable(franchises) {
        franchiseTableBody.innerHTML = '';
        franchises.forEach((franchise, index) => {
            const row = document.createElement('tr');
            row.className = 'clickable-row';
            const createdAt = franchise.createdAt ? new Date(franchise.createdAt).toLocaleDateString() : 'N/A';
            const referralCode = franchise.referralCode || 'N/A';
            const referralLink = `https://ssbwithisv.in/?ref=${referralCode}`;
            const commissionPercent = franchise.commissionPercent !== undefined ? franchise.commissionPercent : 20;

            row.innerHTML = `
                <td>${index + 1}</td>
                <td><span style="color: var(--primary-gold); font-weight: 600;">${escapeHtml(franchise.name || '—')}</span></td>
                <td>${escapeHtml(franchise.email || '—')}</td>
                <td>${escapeHtml(franchise.phone || '—')}</td>
                <td><span class="badge" style="background: rgba(224, 194, 20, 0.1); color: var(--primary-gold); border: 1px solid rgba(224, 194, 20, 0.3);">${commissionPercent}%</span></td>
                <td><span class="badge bg-dark text-warning" style="border: 1px solid rgba(224, 194, 20, 0.3);">${referralCode}</span></td>
                <td>
                    <div class="referral-link-box">
                        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px;">${referralLink}</span>
                        <button class="action-btn" onclick="event.stopPropagation(); copyToClipboard('${referralLink}')" title="Copy Link">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </td>
                <td>${createdAt}</td>
                <td>
                    <button class="action-btn" style="color: #ff6b6b;" onclick="event.stopPropagation(); showDeleteConfirm('${franchise._id}')" title="Delete Franchise">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            row.addEventListener('click', () => openFranchiseDetail(franchise.referralCode));
            franchiseTableBody.appendChild(row);
        });
    }

    window.showDeleteConfirm = function (id) {
        Swal.fire({
            title: 'Are you sure?',
            text: "This franchise partner will be permanently deleted. This action cannot be undone.",
            icon: 'warning',
            showCancelButton: true,
            background: '#1a1a1a',
            color: '#fff',
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                deleteFranchise(id);
            }
        });
    }

    async function deleteFranchise(franchiseId) {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/deleteFranchise/${franchiseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to delete franchise');
            
            Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Franchise has been deleted.',
                background: '#1a1a1a',
                color: '#fff',
                confirmButtonColor: '#e0c214'
            });
            
            loadAllFranchises();
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

    async function openFranchiseDetail(referralCode) {
        try {
            listView.style.display = 'none';
            detailView.style.display = 'block';
            document.getElementById('franchiseInfoCard').innerHTML = '<div class="text-center p-5"><div class="spinner-border text-warning" role="status"></div><p class="mt-3">Loading details...</p></div>';
            document.getElementById('statsRow').innerHTML = '';
            document.getElementById('ordersListContainer').innerHTML = '';

            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/franchiseDetails/${referralCode}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error('Failed to fetch franchise details');
            const data = await response.json();
            renderFranchiseDetail(data);
        } catch (error) {
            document.getElementById('franchiseInfoCard').innerHTML = `<div class="alert alert-danger">Error: ${error.message}</div>`;
        }
    }

    function renderFranchiseDetail(data) {
        const franchise = data.franchise;
        const totalSales = data.totalSales || 0;
        const totalOrders = data.totalOrders || 0;
        const commission = data.commission || 0;
        const orders = data.orders || [];

        document.getElementById('franchiseInfoCard').innerHTML = `
            <div class="row align-items-center">
                <div class="col-md-2 text-center">
                    <div style="width: 80px; height: 80px; background: rgba(224,194,20,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                        <i class="fas fa-user-tie" style="font-size: 2.5rem; color: var(--primary-gold);"></i>
                    </div>
                </div>
                <div class="col-md-5">
                    <h4 style="color: var(--primary-gold); margin-bottom: 10px;">${escapeHtml(franchise.name)}</h4>
                    <p class="mb-1 text-muted"><i class="fas fa-envelope me-2"></i> ${escapeHtml(franchise.email)}</p>
                    <p class="mb-0 text-muted"><i class="fas fa-phone me-2"></i> ${escapeHtml(franchise.phone || '—')}</p>
                </div>
                <div class="col-md-5">
                    <p class="mb-1"><strong class="text-muted">Code:</strong> <code style="color: var(--primary-gold); font-size: 1.1rem; margin-left: 10px;">${escapeHtml(franchise.referralCode)}</code></p>
                    <p class="mb-1"><strong class="text-muted">Commission:</strong> <span style="margin-left: 10px;">${franchise.commissionPercent}%</span></p>
                    <p class="mb-0"><strong class="text-muted">Joined:</strong> <span style="margin-left: 10px;">${new Date(franchise.createdAt).toLocaleDateString()}</span></p>
                </div>
            </div>
        `;

        document.getElementById('statsRow').innerHTML = `
            <div class="col-md-4 mb-3">
                <div class="stat-card-mini">
                    <div class="val">₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div class="lbl">Total Sales Generated</div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="stat-card-mini">
                    <div class="val">${totalOrders}</div>
                    <div class="lbl">Total Orders</div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="stat-card-mini">
                    <div class="val" style="color: #2ecc71;">₹${commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                    <div class="lbl">Total Commission Earned</div>
                </div>
            </div>
        `;

        let ordersHtml = '';
        if (orders.length === 0) {
            ordersHtml = `
                <div class="empty-state text-center p-5">
                    <i class="fas fa-shopping-bag fa-3x mb-3" style="opacity: 0.3;"></i>
                    <p>No orders found for this franchise partner yet.</p>
                </div>
            `;
        } else {
            ordersHtml = orders.map(order => {
                const slotTitle = order.slotId?.title || 'N/A';
                const userName = order.userId?.name || 'N/A';
                const userEmail = order.userId?.email || 'N/A';
                const price = order.price || 0;
                const status = order.status || 'pending';
                const statusClass = status === 'completed' || status === 'paid' ? 'status-paid' : (status === 'cancelled' ? 'status-cancelled' : 'status-pending');
                const startTime = order.slotId?.startTime ? new Date(order.slotId.startTime).toLocaleString() : 'N/A';

                return `
                    <div class="order-item-premium">
                        <div class="row align-items-center">
                            <div class="col-md-4">
                                <div style="font-weight: 600; color: var(--primary-gold);">${escapeHtml(slotTitle)}</div>
                                <div style="font-size: 0.75rem; opacity: 0.6;"><i class="far fa-clock me-1"></i> ${startTime}</div>
                            </div>
                            <div class="col-md-3">
                                <div style="font-weight: 500;">${escapeHtml(userName)}</div>
                                <div style="font-size: 0.75rem; opacity: 0.6;">${escapeHtml(userEmail)}</div>
                            </div>
                            <div class="col-md-2">
                                <div style="font-weight: 700; color: var(--primary-gold);">₹${price}</div>
                                <div style="font-size: 0.65rem; opacity: 0.5;">GST INCLUDED</div>
                            </div>
                            <div class="col-md-2">
                                <span class="status-badge ${statusClass}">${status.toUpperCase()}</span>
                            </div>
                            <div class="col-md-1 text-end">
                                <div style="font-size: 0.75rem; opacity: 0.5;">${new Date(order.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
        document.getElementById('ordersListContainer').innerHTML = ordersHtml;
    }

    backToListBtn.addEventListener('click', () => {
        detailView.style.display = 'none';
        listView.style.display = 'block';
        loadAllFranchises();
    });

    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/[&<>]/g, function (m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }

    // Header logic integration
    document.getElementById('openAddModalBtn')?.addEventListener('click', () => addModal.show());
    document.getElementById('emptyAddBtn')?.addEventListener('click', () => addModal.show());

    // Initial load
    loadAllFranchises();
});
