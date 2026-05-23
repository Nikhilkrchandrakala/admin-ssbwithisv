/**
 * Franchise Dashboard JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loadingState = document.getElementById('loadingState');
    const dashboardContent = document.getElementById('dashboardContent');
    const franchiseNameSpan = document.getElementById('franchiseName');
    const referralCodeSpan = document.getElementById('referralCode');
    const totalSalesSpan = document.getElementById('totalSales');
    const totalOrdersSpan = document.getElementById('totalOrders');
    const commissionEarnedSpan = document.getElementById('commissionEarned');
    const commissionPercentSpan = document.getElementById('commissionPercent');
    const ordersTableBody = document.getElementById('ordersTableBody');

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    function getToken() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = './index.html';
            return null;
        }
        return token;
    }

    window.copyReferralCode = () => {
        const code = referralCodeSpan.innerText;
        if (code && code !== '------') {
            navigator.clipboard.writeText(code).then(() => {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Link copied to clipboard!',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#1a1a1a',
                    color: '#fff'
                });
            });
        }
    };

    async function loadDashboard() {
        const token = getToken();
        if (!token) return;

        try {
            loadingState.style.display = 'block';
            dashboardContent.style.display = 'none';

            const response = await fetch(`${API_BASE}/api/myDashboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('role');
                    localStorage.removeItem('permissions');
                    localStorage.removeItem('name');
                    window.location.href = './index.html';
                    return;
                }
                throw new Error('Failed to load dashboard data');
            }

            const data = await response.json();
            renderDashboard(data);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            loadingState.innerHTML = `
                <div class="spinner-border text-danger" role="status"></div>
                <p class="text-danger mt-3">Failed to load dashboard. ${error.message}</p>
                <button class="thm-btn mt-3" onclick="location.reload()">Retry</button>
            `;
        } finally {
            loadingState.style.display = 'none';
            dashboardContent.style.display = 'block';
        }
    }

    function renderDashboard(data) {
        // Franchise Info
        const franchise = data.franchise;
        if (franchise) {
            franchiseNameSpan.textContent = franchise.name || 'Franchise Partner';
            if (franchise.referralCode) {
                referralCodeSpan.textContent = `https://ssbwithisv.in/?ref=${franchise.referralCode}`;
            } else {
                referralCodeSpan.textContent = 'N/A';
            }
            commissionPercentSpan.textContent = franchise.commissionPercent || 20;
        }

        // Stats
        const totalSales = data.totalSales || 0;
        const totalOrders = data.totalOrders || 0;
        const commission = data.commission || 0;

        totalSalesSpan.textContent = `₹${totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
        totalOrdersSpan.textContent = totalOrders;
        commissionEarnedSpan.textContent = `₹${commission.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

        // Orders Table
        const orders = data.orders || [];
        renderOrdersTable(orders);
    }

    function renderOrdersTable(orders) {
        if (!orders || orders.length === 0) {
            ordersTableBody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-5">No referral orders found yet</td></tr>`;
            return;
        }

        ordersTableBody.innerHTML = '';
        orders.forEach(order => {
            const tr = document.createElement('tr');
            
            const date = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            const userName = order.userId?.name || 'Unknown';
            const userEmail = order.userId?.email || '-';
            const slotTitle = order.slotId?.title || 'Course Batch';
            
            const original = order.originalAmount || 0;
            const discount = order.discount || 0;
            const final = order.price || 0;
            const status = order.status || 'pending';
            const statusClass = status === 'paid' ? 'status-paid' : 'status-pending';

            tr.innerHTML = `
                <td><code style="color:var(--primary-gold)">#${order._id.substring(0, 8)}</code></td>
                <td>
                    <div style="font-weight:600;">${escapeHtml(userName)}</div>
                    <div class="small opacity-50">${escapeHtml(userEmail)}</div>
                </td>
                <td>${escapeHtml(slotTitle)}</td>
                <td>₹${original.toFixed(2)}</td>
                <td class="text-danger">-₹${discount.toFixed(2)}</td>
                <td class="text-success" style="font-weight:700;">₹${final.toFixed(2)}</td>
                <td><span class="badge" style="background: rgba(224, 194, 20, 0.1); color: var(--primary-gold); border: 1px solid rgba(224, 194, 20, 0.2); font-weight: 400;">${order.referralCode || '-'}</span></td>
                <td><span class="status-badge ${statusClass}">${status.toUpperCase()}</span></td>
                <td><span style="font-size:0.85rem; opacity:0.6;">${date}</span></td>
            `;
            ordersTableBody.appendChild(tr);
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

    // Initialize
    loadDashboard();
});
