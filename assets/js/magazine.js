/**
 * Magazine Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const magazineGrid = document.getElementById('magazineGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const magModal = new bootstrap.Modal(document.getElementById('magModal'));
    
    const magForm = document.getElementById('magForm');
    const magId = document.getElementById('magId');
    const magTitle = document.getElementById('magTitle');
    const magCategory = document.getElementById('magCategory');
    const magPdf = document.getElementById('magPdf');
    const magImage = document.getElementById('magImage');
    const saveMagBtn = document.getElementById('saveMagBtn');
    const modalTitle = document.getElementById('modalTitle');
    const pdfHint = document.getElementById('pdfHint');
    const imgHint = document.getElementById('imgHint');

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    function getToken() {
        return localStorage.getItem('token');
    }

    async function loadMagazines() {
        const token = getToken();
        if (!token) return;

        try {
            loadingState.style.display = 'block';
            magazineGrid.style.display = 'none';
            emptyState.style.display = 'none';

            const response = await fetch(`${API_BASE}/api/allMagazinePdfs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch library data');

            const data = await response.json();
            renderGrid(data);

        } catch (error) {
            console.error('Library Load Error:', error);
            Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            loadingState.style.display = 'none';
        }
    }

    function renderGrid(data) {
        magazineGrid.innerHTML = '';
        if (!data || data.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        // Sort by date descending
        data.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

        data.forEach(mag => {
            const card = document.createElement('div');
            card.className = 'magazine-card';
            
            const coverUrl = mag.magazineFrontImage.startsWith('http') ? mag.magazineFrontImage : `${API_BASE}/${mag.magazineFrontImage}`;
            const pdfUrl = mag.pdfFilePath.startsWith('http') ? mag.pdfFilePath : `${API_BASE}/${mag.pdfFilePath}`;

            card.innerHTML = `
                <div class="cover-wrapper">
                    <img src="${coverUrl}" class="cover-img" alt="Cover" onerror="this.src='https://via.placeholder.com/300x400/111/e0c214?text=Cover+Not+Found'">
                </div>
                <div class="magazine-details">
                    <span class="mag-tag">${mag.tags || 'Magazine'}</span>
                    <div class="mag-title">${escapeHtml(mag.pdfTitle)}</div>
                    <div class="mag-actions">
                        <a href="${pdfUrl}" target="_blank" class="mag-btn" title="View PDF">
                            <i class="fas fa-eye"></i> View
                        </a>
                        <button class="mag-btn" onclick="openEdit('${mag._id}', '${escapeHtml(mag.pdfTitle)}', '${mag.tags}')" title="Edit Metadata">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="mag-btn del" onclick="confirmDelete('${mag._id}')" title="Remove Asset">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;
            magazineGrid.appendChild(card);
        });

        magazineGrid.style.display = 'grid';
    }

    // Modal Handlers
    window.openEdit = (id, title, category) => {
        magId.value = id;
        magTitle.value = title;
        magCategory.value = category || 'Magazine';
        magPdf.required = false;
        magImage.required = false;
        pdfHint.style.display = 'block';
        imgHint.style.display = 'block';
        modalTitle.innerHTML = '<i class="fas fa-edit me-2 text-warning"></i> Edit Metadata';
        magModal.show();
    };

    document.getElementById('openUploadModal').addEventListener('click', () => {
        magForm.reset();
        magId.value = '';
        magPdf.required = true;
        magImage.required = true;
        pdfHint.style.display = 'none';
        imgHint.style.display = 'none';
        modalTitle.innerHTML = '<i class="fas fa-upload me-2 text-warning"></i> Publish Asset';
        magModal.show();
    });

    document.getElementById('emptyPublishBtn').addEventListener('click', () => {
        document.getElementById('openUploadModal').click();
    });

    saveMagBtn.addEventListener('click', async () => {
        const id = magId.value;
        const title = magTitle.value.trim();
        const category = magCategory.value;
        const pdfFile = magPdf.files[0];
        const imgFile = magImage.files[0];

        if (!title || (!id && (!pdfFile || !imgFile))) {
            Swal.fire({ icon: 'warning', title: 'Missing Info', text: 'Please fill all required fields.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        const token = getToken();
        const formData = new FormData();
        formData.append('pdfTitle', title);
        formData.append('tags', category);
        if (pdfFile) formData.append('magazinePdf', pdfFile);
        if (imgFile) formData.append('magazineFrontImage', imgFile);

        try {
            saveMagBtn.disabled = true;
            saveMagBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';

            const url = id ? `${API_BASE}/api/updateMagazinePdf/${id}` : `${API_BASE}/api/addMagazinePdf`;
            const method = id ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Action failed');

            Swal.fire({ icon: 'success', title: id ? 'Updated' : 'Published', text: 'Document library has been synchronized.', background: '#1a1a1a', color: '#fff' });
            magModal.hide();
            loadMagazines();

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Process Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            saveMagBtn.disabled = false;
            saveMagBtn.innerHTML = 'Confirm Publication';
        }
    });

    window.confirmDelete = (id) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: 'This document will be removed from the library permanently.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Yes, delete it',
            background: '#1a1a1a',
            color: '#fff'
        }).then(async (result) => {
            if (result.isConfirmed) {
                const token = getToken();
                try {
                    const response = await fetch(`${API_BASE}/api/deleteMagazinePdf/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!response.ok) throw new Error('Delete failed');

                    Swal.fire({ icon: 'success', title: 'Asset Removed', background: '#1a1a1a', color: '#fff', timer: 1500, showConfirmButton: false });
                    loadMagazines();
                } catch (e) {
                    Swal.fire({ icon: 'error', title: 'Error', text: e.message, background: '#1a1a1a', color: '#fff' });
                }
            }
        });
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

    loadMagazines();
});
