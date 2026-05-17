/**
 * Blogs Management JS
 * Unified Add/Edit logic for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const blogImgUploadArea = document.getElementById("blogImgUploadArea");
    const blogImgInput = document.getElementById("blogImgInput");
    const blogImgPreviewContainer = document.getElementById("blogImgPreviewContainer");
    const imageTextsContainer = document.getElementById("imageTextsContainer");
    const adminBlogFrom = document.getElementById("adminBlogFrom");
    const cancelBtn = document.getElementById("cancelBtn");
    const submitBtn = document.getElementById("submitBtn");
    const pageMainTitle = document.getElementById("pageMainTitle");
    
    // Inputs
    const blogTitleInput = document.getElementById("blogTitle");
    const shortDescriptionInput = document.getElementById("shortDescription");
    const authorNameInput = document.getElementById("authorName");
    const authorQuoteInput = document.getElementById("authorQuote");
    const timeDurationInput = document.getElementById("timeDuration");
    const blogIdInput = document.getElementById("blogId");

    // Global State
    let editor;
    let uploadedImages = [];
    let existingImages = [];
    let imagesToDelete = [];
    let isEditMode = false;

    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    function getToken() {
        const token = localStorage.getItem("token");
        if (!token) {
            Swal.fire({ icon: 'error', title: 'Unauthorized', text: 'Please login to continue.', background: '#1a1a1a', color: '#fff' })
                .then(() => window.location.href = '/');
            return null;
        }
        return token;
    }

    // Initialize Page
    async function init() {
        // Init Editor
        try {
            editor = await ClassicEditor.create(document.querySelector("#editorContainer"), {
                toolbar: ["heading", "|", "bold", "italic", "link", "bulletedList", "numberedList", "|", "undo", "redo"],
                placeholder: "Compose your insightful article here..."
            });
        } catch (error) {
            console.error("Editor failure:", error);
            document.getElementById("editorContainer").innerHTML = `<textarea class="admin-input" id="fallbackEditor" rows="15"></textarea>`;
        }

        const urlParams = new URLSearchParams(window.location.search);
        const blogId = urlParams.get("id");

        if (blogId) {
            isEditMode = true;
            blogIdInput.value = blogId;
            pageMainTitle.innerHTML = `<i class="fas fa-edit me-2"></i> Edit Blog Post`;
            submitBtn.innerHTML = `<i class="fas fa-save me-2"></i> Update Article`;
            await loadBlogForEdit(blogId);
        } else {
            isEditMode = false;
            pageMainTitle.innerHTML = `<i class="fas fa-plus-circle me-2"></i> Create Blog Post`;
            submitBtn.innerHTML = `<i class="fas fa-paper-plane me-2"></i> Publish Article`;
        }
    }

    async function loadBlogForEdit(id) {
        try {
            Swal.fire({ title: 'Loading...', background: '#1a1a1a', color: '#fff', didOpen: () => Swal.showLoading() });
            
            const token = getToken();
            const response = await fetch(`${API_BASE}/api/allBlogs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const blogs = await response.json();
            const blog = blogs.find(b => b._id === id);

            if (!blog) throw new Error("Blog post not found.");

            // Populate Fields
            blogTitleInput.value = blog.title || "";
            shortDescriptionInput.value = blog.shortDescription || "";
            authorNameInput.value = blog.authorName || "";
            authorQuoteInput.value = blog.authorQuote || "";
            timeDurationInput.value = blog.timeDuration || "";
            
            if (editor) editor.setData(blog.content || "");
            else if (document.getElementById("fallbackEditor")) document.getElementById("fallbackEditor").value = blog.content || "";

            existingImages = blog.images || [];
            updateUI();
            
            Swal.close();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Load Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    }

    // Media Logic
    blogImgUploadArea.addEventListener("click", () => blogImgInput.click());
    blogImgInput.addEventListener("change", (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            if (!file.type.startsWith("image/")) return;
            const reader = new FileReader();
            reader.onload = (re) => {
                uploadedImages.push({ id: Date.now() + Math.random(), src: re.target.result, file, imageText: "" });
                updateUI();
            };
            reader.readAsDataURL(file);
        });
        blogImgInput.value = "";
    });

    function updateUI() {
        blogImgPreviewContainer.innerHTML = "";
        imageTextsContainer.innerHTML = "";

        // Render Existing
        if (isEditMode && existingImages.length > 0) {
            const h = document.createElement('h6');
            h.className = "mb-3 text-muted";
            h.innerText = "EXISTING MEDIA";
            blogImgPreviewContainer.appendChild(h);
            
            const grid = document.createElement('div');
            grid.className = "preview-grid mb-4";
            
            existingImages.forEach((img, i) => {
                const item = document.createElement('div');
                item.className = "preview-item";
                item.innerHTML = `
                    <img src="${img.imageUrl}">
                    <button type="button" class="remove-preview" onclick="removeExisting(${i})">×</button>
                `;
                grid.appendChild(item);
                
                // Text Field
                addTextField(img.imageUrl, `Existing Image ${i+1}`, img.imageText || "", (val) => existingImages[i].imageText = val);
            });
            blogImgPreviewContainer.appendChild(grid);
        }

        // Render New
        if (uploadedImages.length > 0) {
            const h = document.createElement('h6');
            h.className = "mb-3 text-muted";
            h.innerText = "NEWLY UPLOADED";
            blogImgPreviewContainer.appendChild(h);
            
            const grid = document.createElement('div');
            grid.className = "preview-grid mb-4";
            
            uploadedImages.forEach((img, i) => {
                const item = document.createElement('div');
                item.className = "preview-item";
                item.innerHTML = `
                    <img src="${img.src}">
                    <button type="button" class="remove-preview" onclick="removeNew(${i})">×</button>
                `;
                grid.appendChild(item);
                
                // Text Field
                addTextField(img.src, `New Image ${i+1}`, img.imageText || "", (val) => uploadedImages[i].imageText = val);
            });
            blogImgPreviewContainer.appendChild(grid);
        }
    }

    function addTextField(thumb, label, val, onChange) {
        const row = document.createElement('div');
        row.className = "image-field-row";
        row.innerHTML = `
            <img src="${thumb}" class="image-field-thumb">
            <div style="flex-grow:1">
                <div class="small text-muted mb-1">${label} Overlay Text</div>
                <input type="text" class="admin-input py-1 px-2" style="font-size:0.85rem;" placeholder="Text shown on image..." value="${val}">
            </div>
        `;
        const input = row.querySelector('input');
        input.addEventListener('input', (e) => onChange(e.target.value));
        imageTextsContainer.appendChild(row);
    }

    window.removeNew = (i) => {
        uploadedImages.splice(i, 1);
        updateUI();
    };

    window.removeExisting = (i) => {
        const img = existingImages[i];
        imagesToDelete.push(img.imageUrl);
        existingImages.splice(i, 1);
        updateUI();
    };

    // Submission
    adminBlogFrom.addEventListener("submit", async (e) => {
        e.preventDefault();
        const token = getToken();
        if (!token) return;

        const content = editor ? editor.getData() : document.getElementById("fallbackEditor")?.value || "";
        if (!content.trim()) {
            Swal.fire({ icon: 'warning', text: 'Article content cannot be empty.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        const fd = new FormData();
        fd.append("title", blogTitleInput.value.trim());
        fd.append("shortDescription", shortDescriptionInput.value.trim());
        fd.append("content", content);
        fd.append("authorName", authorNameInput.value.trim());
        fd.append("authorQuote", authorQuoteInput.value.trim());
        fd.append("timeDuration", timeDurationInput.value.trim());

        // New Images
        uploadedImages.forEach(img => {
            fd.append("images", img.file);
            fd.append("imageTexts", img.imageText || "");
        });

        // Existing
        if (isEditMode) {
            fd.append("existingImageTexts", JSON.stringify(existingImages.map(img => ({ imageUrl: img.imageUrl, imageText: img.imageText || "" }))));
            if (imagesToDelete.length > 0) fd.append("imagesToDelete", JSON.stringify(imagesToDelete));
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin me-2"></i> Processing...`;

            const url = isEditMode ? `${API_BASE}/api/updateBlog/${blogIdInput.value}` : `${API_BASE}/api/addBlog`;
            const method = isEditMode ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: fd
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || "Action failed.");

            await Swal.fire({ icon: 'success', title: 'Success!', text: `Article ${isEditMode ? 'updated' : 'published'} successfully.`, background: '#1a1a1a', color: '#fff' });
            window.location.href = "./BlogList.html";
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Submission Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
            submitBtn.disabled = false;
            submitBtn.innerHTML = isEditMode ? `<i class="fas fa-save me-2"></i> Update Article` : `<i class="fas fa-paper-plane me-2"></i> Publish Article`;
        }
    });

    cancelBtn.addEventListener("click", () => {
        Swal.fire({
            title: 'Discard Changes?',
            text: "Any unsaved progress will be lost.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Yes, Discard',
            background: '#1a1a1a',
            color: '#fff'
        }).then((result) => { if (result.isConfirmed) window.location.href = "./BlogList.html"; });
    });

    init();
});