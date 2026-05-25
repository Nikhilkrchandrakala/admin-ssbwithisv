/**
 * Gallery Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const galleryGrid = document.getElementById('galleryGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const uploadModal = new bootstrap.Modal(document.getElementById('uploadModal'));
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    
    const galleryFiles = document.getElementById('galleryFiles');
    const uploadPreviews = document.getElementById('uploadPreviews');
    const captionsWrapper = document.getElementById('captionsWrapper');
    const dynamicCaptions = document.getElementById('dynamicCaptions');
    const startUploadBtn = document.getElementById('startUploadBtn');

    const editPreview = document.getElementById('editPreview');
    const editCaptionText = document.getElementById('editCaptionText');
    const saveEditBtn = document.getElementById('saveEditBtn');

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    let currentEditData = null;

    function getToken() {
        return localStorage.getItem('token');
    }

    async function loadGallery() {
        const token = getToken();
        if (!token) return;

        try {
            loadingState.style.display = 'block';
            galleryGrid.style.display = 'none';
            emptyState.style.display = 'none';

            const response = await fetch(`${API_BASE}/api/allGallery`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch gallery data');

            const galleries = await response.json();
            renderGallery(galleries);

        } catch (error) {
            console.error('Gallery Load Error:', error);
            Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            loadingState.style.display = 'none';
        }
    }

    function renderGallery(galleries) {
        galleryGrid.innerHTML = '';
        let total = 0;

        galleries.forEach(g => {
            if (!g.images) return;
            g.images.forEach(img => {
                total++;
                const card = document.createElement('div');
                card.className = 'gallery-card';
                card.innerHTML = `
                    <div class="gallery-img-container">
                        <img src="${img.imageUrl}" class="gallery-img" alt="Gallery" onerror="this.src='https://via.placeholder.com/400x300/111/e0c214?text=Asset+Not+Found'">
                    </div>
                    <div class="gallery-info">
                        <div class="gallery-caption">${escapeHtml(img.imageText || 'No description provided')}</div>
                        <div class="gallery-meta">
                            <span class="small opacity-50">#${img._id ? img._id.substring(0, 6) : 'Local'}</span>
                            <div class="d-flex gap-2">
                                <button class="action-icon" onclick="openEdit('${g._id}', '${img.imageUrl}', '${escapeHtml(img.imageText || '')}')" title="Edit Caption">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-icon delete" onclick="confirmDelete('${g._id}', '${img.imageUrl}')" title="Delete Asset">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                galleryGrid.appendChild(card);
            });
        });

        if (total === 0) {
            emptyState.style.display = 'block';
        } else {
            galleryGrid.style.display = 'grid';
        }
    }

    // Upload Logic
    galleryFiles.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 10) {
            Swal.fire({ icon: 'warning', title: 'Limit Exceeded', text: 'Max 10 images allowed per batch.', background: '#1a1a1a', color: '#fff' });
            galleryFiles.value = '';
            return;
        }

        uploadPreviews.innerHTML = '';
        dynamicCaptions.innerHTML = '';
        
        if (files.length === 0) {
            captionsWrapper.style.display = 'none';
            return;
        }

        captionsWrapper.style.display = 'block';
        files.forEach((file, i) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'position-relative';
                div.innerHTML = `<img src="${ev.target.result}" class="preview-thumb"><span class="badge bg-warning text-dark position-absolute top-0 end-0 m-1">${i+1}</span>`;
                uploadPreviews.appendChild(div);
            };
            reader.readAsDataURL(file);

            const capDiv = document.createElement('div');
            capDiv.className = 'col-md-6 mb-3';
            capDiv.innerHTML = `
                <div class="small mb-1 opacity-50">Caption for Image ${i+1}</div>
                <input type="text" class="admin-input py-1 caption-input" data-index="${i}" placeholder="Enter caption...">
            `;
            dynamicCaptions.appendChild(capDiv);
        });
    });

    startUploadBtn.addEventListener('click', async () => {
        const token = getToken();
        const files = galleryFiles.files;
        if (!files.length) return;

        const formData = new FormData();
        formData.append('title', `Gallery_${Date.now()}`);
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }

        const captions = Array.from(document.querySelectorAll('.caption-input')).map(input => input.value || '');
        formData.append('imageTexts', JSON.stringify(captions));

        try {
            startUploadBtn.disabled = true;
            startUploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Uploading...';

            const response = await fetch(`${API_BASE}/api/addGallery`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');

            Swal.fire({ icon: 'success', title: 'Assets Secured', text: 'Images have been added to the gallery.', background: '#1a1a1a', color: '#fff' });
            uploadModal.hide();
            loadGallery();

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Upload Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            startUploadBtn.disabled = false;
            startUploadBtn.innerHTML = 'Start Upload Process';
        }
    });

    // Edit Logic
    // Edit Logic
    window.openEdit = (galleryId, url, text) => {
        currentEditData = { galleryId, url };
        editPreview.src = url;
        editCaptionText.value = text;
        
        // Reset file input and display name when opening edit modal
        const editImageFileInput = document.getElementById('editImageFile');
        if (editImageFileInput) editImageFileInput.value = '';
        const editFileNameDisplay = document.getElementById('editFileNameDisplay');
        if (editFileNameDisplay) editFileNameDisplay.innerText = '';
        
        editModal.show();
    };

    saveEditBtn.addEventListener('click', async () => {
        if (!currentEditData) return;
        const token = getToken();
        const editImageFile = document.getElementById('editImageFile');
        const file = editImageFile ? editImageFile.files[0] : null;

        try {
            saveEditBtn.disabled = true;
            saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

            let response;
            if (file) {
                // If replacing image, use FormData for multipart file upload
                const formData = new FormData();
                formData.append('imageUrl', currentEditData.url);
                formData.append('imageText', editCaptionText.value);
                formData.append('image', file);

                response = await fetch(`${API_BASE}/api/updateImageText/${currentEditData.galleryId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`
                        // Note: do not set Content-Type header when uploading file using FormData!
                    },
                    body: formData
                });
            } else {
                // Standard text-only update
                response = await fetch(`${API_BASE}/api/updateImageText/${currentEditData.galleryId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        imageUrl: currentEditData.url,
                        imageText: editCaptionText.value
                    })
                });
            }

            if (!response.ok) throw new Error('Failed to update asset');

            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Asset updated successfully', showConfirmButton: false, timer: 2000, background: '#1a1a1a', color: '#fff' });
            editModal.hide();
            loadGallery();

        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Update Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            saveEditBtn.disabled = false;
            saveEditBtn.innerHTML = 'Save Changes';
        }
    });

    // Delete Logic
    window.confirmDelete = (galleryId, url) => {
        Swal.fire({
            title: 'Delete Asset?',
            text: 'This image will be removed from the gallery permanently.',
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
                    const response = await fetch(`${API_BASE}/api/updateGallery/${galleryId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            imagesToDelete: JSON.stringify([url])
                        })
                    });

                    if (!response.ok) throw new Error('Delete failed');

                    Swal.fire({ icon: 'success', title: 'Asset Removed', background: '#1a1a1a', color: '#fff', timer: 1500, showConfirmButton: false });
                    loadGallery();
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

    // Modal Triggers
    document.getElementById('openUploadModal').addEventListener('click', () => uploadModal.show());
    document.getElementById('emptyUploadBtn').addEventListener('click', () => uploadModal.show());

    // Replacement image change listener for visual preview in edit modal
    const editImageFile = document.getElementById('editImageFile');
    const editFileNameDisplay = document.getElementById('editFileNameDisplay');
    if (editImageFile) {
        editImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    editPreview.src = ev.target.result;
                };
                reader.readAsDataURL(file);
                if (editFileNameDisplay) editFileNameDisplay.innerText = `Replace with: ${file.name}`;
            }
        });
    }

    loadGallery();
});
