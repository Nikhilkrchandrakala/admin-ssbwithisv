/**
 * Candidate Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // API Base URL
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';
    
    // DOM Elements
    const candidatesTable = $('#candidatesTable');
    let dataTable = null;

    // Variables
    let currentImageFile = null;
    let currentEditImageFile = null;

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

    // Initialize DataTable
    function initializeDataTable() {
        if (dataTable) {
            dataTable.destroy();
        }

        dataTable = candidatesTable.DataTable({
            "order": [[5, 'desc']],
            "pageLength": 10,
            "responsive": true,
            "autoWidth": false,
            "columnDefs": [
                { "orderable": false, "targets": [0, 6] }
            ],
            "language": {
                "search": "",
                "searchPlaceholder": "Search candidates...",
                "lengthMenu": "_MENU_ per page",
                "info": "Showing _START_ to _END_ of _TOTAL_",
                "paginate": {
                    "next": '<i class="fas fa-chevron-right"></i>',
                    "previous": '<i class="fas fa-chevron-left"></i>'
                }
            }
        });
    }

    // Load Candidates
    async function loadCandidates() {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${API_BASE}/api/allCandidates`);
            const result = await response.json();
            const candidates = result.data || result;

            if (dataTable) {
                dataTable.clear().destroy();
                dataTable = null;
            }

            const tbody = candidatesTable.find('tbody');
            tbody.empty();

            if (!candidates || candidates.length === 0) {
                tbody.append('<tr><td colspan="7" class="text-center p-5 opacity-50">No candidates found</td></tr>');
                return;
            }

            candidates.forEach(candidate => {
                const date = new Date(candidate.createdAt);
                const formattedDate = date.toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });

                const statusClass = candidate.status === 'active' ? 'status-paid' : 'status-pending';

                const row = `
                    <tr>
                        <td>
                            <img src="${candidate.img}" alt="${candidate.name}" class="candidate-img-circle" 
                                 onerror="this.src='https://via.placeholder.com/50?text=User'">
                        </td>
                        <td><span style="font-weight:600; color:var(--primary-gold);">${escapeHtml(candidate.name)}</span></td>
                        <td><code style="color:var(--text-white); opacity:0.8;">${escapeHtml(candidate.entry)}</code></td>
                        <td>${escapeHtml(candidate.board)}</td>
                        <td><span class="status-badge ${statusClass}">${candidate.status || 'active'}</span></td>
                        <td><span style="font-size:0.8rem; opacity:0.6;">${formattedDate}</span></td>
                        <td>
                            <div class="d-flex gap-2">
                                <button class="action-btn" onclick="editCandidate('${candidate._id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" style="color:#ff6b6b;" onclick="deleteCandidate('${candidate._id}')" title="Delete">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.append(row);
            });

            initializeDataTable();
        } catch (error) {
            console.error("Load error:", error);
            Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    }

    // Image Handlers
    function setupImageHandlers() {
        const imageInput = document.getElementById('imageInput');
        const imagePreview = document.getElementById('imagePreview');
        const imageUploadArea = document.getElementById('imageUploadArea');

        const editImageInput = document.getElementById('editImageInput');
        const editImagePreview = document.getElementById('editImagePreview');
        const editImageUploadArea = document.getElementById('editImageUploadArea');

        if (imageInput) {
            imageInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    currentImageFile = file;
                    handlePreview(file, imagePreview, imageUploadArea);
                }
            });
        }

        if (editImageInput) {
            editImageInput.addEventListener('change', function(e) {
                if (e.target.files.length > 0) {
                    const file = e.target.files[0];
                    currentEditImageFile = file;
                    handlePreview(file, editImagePreview, editImageUploadArea);
                }
            });
        }
    }

    function handlePreview(file, preview, area) {
        if (!file.type.startsWith('image/')) {
            Swal.fire({ icon: 'error', title: 'Invalid File', text: 'Please select an image (JPG/PNG)', background: '#1a1a1a', color: '#fff' });
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.src = e.target.result;
            preview.style.display = 'inline-block';
            if (area) area.style.borderColor = 'var(--primary-gold)';
        };
        reader.readAsDataURL(file);
    }

    // Form Submissions
    document.getElementById('addCandidateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        
        if (!currentImageFile) {
            Swal.fire({ icon: 'warning', text: 'Please upload a candidate photo', background: '#1a1a1a', color: '#fff' });
            return;
        }
        fd.append('img', currentImageFile);

        const btn = document.getElementById('submitCandidateBtn');
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Creating...';

            const response = await fetch(`${API_BASE}/api/addCandidate`, {
                method: 'POST',
                body: fd
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Failed to add candidate');

            Swal.fire({ icon: 'success', title: 'Added!', text: 'Candidate has been created.', background: '#1a1a1a', color: '#fff' });
            $('#addCandidateModal').modal('hide');
            e.target.reset();
            document.getElementById('imagePreview').style.display = 'none';
            currentImageFile = null;
            loadCandidates();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Create Candidate';
        }
    });

    document.getElementById('editCandidateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editCandidateId').value;
        const fd = new FormData(e.target);
        
        if (currentEditImageFile) {
            fd.append('img', currentEditImageFile);
        }

        const btn = document.getElementById('updateCandidateBtn');
        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Updating...';

            const response = await fetch(`${API_BASE}/api/updateCandidate/${id}`, {
                method: 'PUT',
                body: fd
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || 'Failed to update candidate');

            Swal.fire({ icon: 'success', title: 'Updated!', text: 'Candidate details saved.', background: '#1a1a1a', color: '#fff' });
            $('#editCandidateModal').modal('hide');
            loadCandidates();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            btn.disabled = false;
            btn.innerText = 'Update Candidate';
        }
    });

    // Global Action Handlers
    window.editCandidate = async (id) => {
        try {
            const token = getToken();
            const response = await fetch(`${API_BASE}/api/candidate/${id}`);
            const result = await response.json();
            const candidate = result.data || result;

            document.getElementById('editCandidateId').value = candidate._id;
            document.getElementById('editName').value = candidate.name;
            document.getElementById('editEntry').value = candidate.entry;
            document.getElementById('editBoard').value = candidate.board;
            document.getElementById('editStatus').value = candidate.status || 'active';

            const preview = document.getElementById('editImagePreview');
            if (candidate.img) {
                preview.src = candidate.img;
                preview.style.display = 'inline-block';
            } else {
                preview.style.display = 'none';
            }

            currentEditImageFile = null;
            $('#editCandidateModal').modal('show');
        } catch (error) {
            Swal.fire({ icon: 'error', text: 'Failed to load details', background: '#1a1a1a', color: '#fff' });
        }
    };

    window.deleteCandidate = (id) => {
        Swal.fire({
            title: 'Are you sure?',
            text: "This candidate record will be removed permanently.",
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
                    const response = await fetch(`${API_BASE}/api/deleteCandidate/${id}`, { method: 'DELETE' });
                    if (!response.ok) throw new Error('Delete failed');
                    Swal.fire({ icon: 'success', title: 'Deleted', background: '#1a1a1a', color: '#fff' });
                    loadCandidates();
                } catch (error) {
                    Swal.fire({ icon: 'error', text: error.message, background: '#1a1a1a', color: '#fff' });
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

    // Init
    setupImageHandlers();
    loadCandidates();
});
