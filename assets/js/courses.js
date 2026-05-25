/**
 * Batch/Courses Management JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const slotsContainer = document.getElementById('slotsGridContainer');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const emptyMonthState = document.getElementById('emptyMonthState');
    const currentMonthDisplay = document.getElementById('currentMonthDisplay');
    const batchStatsInfo = document.getElementById('batchStatsInfo');
    
    // Modals
    const slotModalElement = document.getElementById('slotModal');
    const slotModal = new bootstrap.Modal(slotModalElement);
    const manualBookModalElement = document.getElementById('manualBookModal');
    const manualBookModal = new bootstrap.Modal(manualBookModalElement);

    // State
    let currentDate = new Date();
    let allBatches = [];
    let currentEditId = null;
    let currentBookingSlotId = null;

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

    // Fetch all batches
    async function fetchAllBatches() {
        const token = getToken();
        if (!token) return;
        
        try {
            loadingSpinner.style.display = 'block';
            slotsContainer.style.display = 'none';
            emptyMonthState.style.display = 'none';

            const response = await fetch(`${API_BASE}/api/allSlots`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to fetch batches');
            
            const batches = await response.json();
            allBatches = batches || [];
            renderMonthView();
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Fetch Failed', text: err.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            loadingSpinner.style.display = 'none';
        }
    }

    function renderMonthView() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        currentMonthDisplay.innerText = `${monthNames[month]} ${year}`;

        const monthBatches = allBatches.filter(batch => {
            if (!batch.startTime) return false;
            const d = new Date(batch.startTime);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        const totalBatches = monthBatches.length;
        const totalCapacity = monthBatches.reduce((sum, b) => sum + (b.maxStudents || 0), 0);
        const totalBooked = monthBatches.reduce((sum, b) => sum + (b.bookedStudents ? b.bookedStudents.length : 0), 0);
        
        batchStatsInfo.innerHTML = `<span class="me-3">${totalBatches} BATCHES</span> <span class="me-3">CAPACITY: ${totalCapacity}</span> <span>BOOKED: ${totalBooked}</span>`;

        if (monthBatches.length === 0) {
            slotsContainer.style.display = 'none';
            emptyMonthState.style.display = 'block';
            document.getElementById('emptyMonthName').innerText = `${monthNames[month]} ${year}`;
            return;
        }

        slotsContainer.style.display = 'flex';
        emptyMonthState.style.display = 'none';
        renderBatchCards(monthBatches);
    }

    function renderBatchCards(batches) {
        slotsContainer.innerHTML = '';
        batches.forEach(slot => {
            const startDate = slot.startTime ? new Date(slot.startTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
            let finalPriceVal = slot.price;
            if (slot.isFullCourse) {
                finalPriceVal = getCoursePrice('full_course', slot.price || 12499);
            }
            const price = finalPriceVal ? `₹${Number(finalPriceVal).toLocaleString('en-IN')}` : 'FREE';
            const max = slot.maxStudents || 0;
            const booked = slot.bookedStudents ? slot.bookedStudents.length : 0;
            const available = max - booked;
            const isFull = (max > 0 && booked >= max);
            
            const isMorning = (slot.batchType === 'morning' || (slot.title && slot.title.toLowerCase().includes('morning')));
            const typeClass = isMorning ? 'morning-type' : 'evening-type';
            const typeIcon = isMorning ? 'fa-sun' : 'fa-moon';

            const col = document.createElement('div');
            col.className = 'col-lg-4 col-md-6';
            col.innerHTML = `
                <div class="batch-card">
                    <div class="batch-header">
                        <span class="type-badge ${typeClass}"><i class="fas ${typeIcon} me-2"></i>${slot.title || (isMorning ? 'Morning' : 'Evening')}</span>
                        <span style="font-size: 0.75rem; opacity: 0.5;">ID: ${slot.batchNo || '—'}</span>
                    </div>
                    <div class="batch-body">
                        <div class="stat-item">
                            <span class="stat-label"><i class="far fa-calendar-alt me-2"></i>Start Date</span>
                            <span class="stat-value">${startDate}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="fas fa-users me-2"></i>Capacity</span>
                            <span class="stat-value">${max} Seats</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="fas fa-user-check me-2"></i>Booked</span>
                            <span class="stat-value">${booked} Students</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label"><i class="fas fa-tag me-2"></i>Price</span>
                            <span class="price-badge">${price}</span>
                        </div>
                        
                        <div class="mt-3 text-center">
                            ${isFull ? 
                                '<span class="badge bg-danger w-100 p-2" style="border-radius: 8px;"><i class="fas fa-ban me-2"></i>BATCH FULL</span>' : 
                                `<span class="badge bg-success w-100 p-2" style="background: rgba(46, 204, 113, 0.1) !important; color: #2ecc71; border: 1px solid rgba(46, 204, 113, 0.3); border-radius: 8px;"><i class="fas fa-check me-2"></i>${available} SPOTS AVAILABLE</span>`
                            }
                        </div>
                    </div>
                    <div class="batch-footer">
                        <button class="action-btn edit-btn" style="flex:1" data-id="${slot._id}" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="action-btn manual-btn" style="flex:2; background: rgba(39, 174, 96, 0.1); border-color: rgba(39, 174, 96, 0.3); color: #2ecc71;" data-id="${slot._id}" ${isFull ? 'disabled' : ''}><i class="fas fa-user-plus me-1"></i> Book</button>
                        <button class="action-btn delete-btn" style="flex:1; color: #ff6b6b;" data-id="${slot._id}"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            slotsContainer.appendChild(col);
        });

        // Events
        document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
        document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => showDeleteConfirm(btn.dataset.id)));
        document.querySelectorAll('.manual-btn').forEach(btn => btn.addEventListener('click', () => openManualBookingModal(btn.dataset.id)));
    }

    // Helper functions for dynamic pricing calculator in Create/Edit Batch Modal
    function getCoursePrice(courseId, defaultPrice) {
        if (dbCourses && Array.isArray(dbCourses)) {
            const course = dbCourses.find(c => c.courseId === courseId);
            if (course) return course.price;
        }
        return defaultPrice;
    }

    function updateModalCheckboxLabels() {
        const modules = [
            { id: 'ssb_ppdt', labelId: 'label_mod_ssb_ppdt', defaultPrice: 1999, name: 'Intro to SSB & PPDT' },
            { id: 'psych', labelId: 'label_mod_psych', defaultPrice: 3499, name: 'Psychology Prep Program' },
            { id: 'interview', labelId: 'label_mod_interview', defaultPrice: 2499, name: 'Interview & Mock Course' },
            { id: 'group_testing', labelId: 'label_mod_group_testing', defaultPrice: 7999, name: 'GTO Course on VTX' }
        ];

        modules.forEach(mod => {
            const label = document.getElementById(mod.labelId);
            if (label) {
                const price = getCoursePrice(mod.id, mod.defaultPrice);
                label.innerHTML = `${mod.name} (<span class="text-warning font-weight-bold">₹${price.toLocaleString('en-IN')}</span>)`;
            }
        });
    }

    function toggleFullCourseUI(isInitialPopulate = false) {
        const isFull = document.getElementById('isFullCourse').checked;
        const priceInput = document.getElementById('price');
        const container = document.getElementById('individualCoursesContainer');

        if (isFull) {
            if (container) container.style.display = 'none';
            priceInput.disabled = true;
            const fullPrice = getCoursePrice('full_course', 12499);
            priceInput.value = fullPrice;
        } else {
            if (container) container.style.display = 'block';
            priceInput.disabled = false;
            if (!isInitialPopulate) {
                document.querySelectorAll('.module-checkbox').forEach(cb => cb.checked = false);
                priceInput.value = 0;
            }
        }
    }

    function calculateModuleSum() {
        let sum = 0;
        const modules = [
            { id: 'ssb_ppdt', checkboxId: 'mod_ssb_ppdt', defaultPrice: 1999 },
            { id: 'psych', checkboxId: 'mod_psych', defaultPrice: 3499 },
            { id: 'interview', checkboxId: 'mod_interview', defaultPrice: 2499 },
            { id: 'group_testing', checkboxId: 'mod_group_testing', defaultPrice: 7999 }
        ];

        modules.forEach(mod => {
            const cb = document.getElementById(mod.checkboxId);
            if (cb && cb.checked) {
                sum += getCoursePrice(mod.id, mod.defaultPrice);
            }
        });

        document.getElementById('price').value = sum;
    }

    // Modal Logic
    const openAddModal = () => {
        currentEditId = null;
        document.getElementById('slotForm').reset();
        document.getElementById('slotId').value = '';
        document.getElementById('isFullCourse').checked = true; // By default it will be ticked
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('startDate').value = tomorrow.toISOString().slice(0, 10);
        document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle me-2"></i> Create New Batch';
        toggleFullCourseUI(true); // Initialize toggle view
        slotModal.show();
    };

    async function openEditModal(id) {
        try {
            const token = getToken();
            const resp = await fetch(`${API_BASE}/api/slotDetail/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (!resp.ok) throw new Error('Batch not found');
            const slot = await resp.json();
            
            currentEditId = id;
            document.getElementById('slotId').value = slot._id;
            document.getElementById('batchType').value = (slot.batchType || '').toLowerCase();
            document.getElementById('batchNo').value = slot.batchNo || '';
            if (slot.startTime) {
                document.getElementById('startDate').value = new Date(slot.startTime).toISOString().slice(0, 10);
            }
            document.getElementById('maxStudents').value = slot.maxStudents || 10;
            document.getElementById('price').value = slot.price || 0;
            document.getElementById('isFullCourse').checked = slot.isFullCourse || false;
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit me-2"></i> Edit Batch Details';
            toggleFullCourseUI(true); // Initialize toggle view with existing data
            slotModal.show();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message, background: '#1a1a1a', color: '#fff' });
        }
    }

    document.getElementById('saveSlotBtn').addEventListener('click', async () => {
        const token = getToken();
        if (!token) return;

        const type = document.getElementById('batchType').value;
        const start = document.getElementById('startDate').value;
        if (!type || !start) {
            Swal.fire({ icon: 'warning', text: 'Please complete all required fields.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        const payload = {
            title: type === 'morning' ? 'Morning Batch' : 'Evening Batch',
            batchNo: document.getElementById('batchNo').value,
            batchType: type,
            startTime: new Date(start).toISOString(),
            endTime: new Date(new Date(start).getTime() + 86400000).toISOString(),
            maxStudents: parseInt(document.getElementById('maxStudents').value) || 0,
            price: parseFloat(document.getElementById('price').value) || 0,
            isFullCourse: document.getElementById('isFullCourse').checked
        };

        try {
            const btn = document.getElementById('saveSlotBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

            const url = currentEditId ? `${API_BASE}/api/updateSlot/${currentEditId}` : `${API_BASE}/api/addSlot`;
            const method = currentEditId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to save batch');

            Swal.fire({ icon: 'success', title: 'Success', text: 'Batch has been saved.', background: '#1a1a1a', color: '#fff' });
            slotModal.hide();
            fetchAllBatches();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Save Failed', text: err.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            document.getElementById('saveSlotBtn').disabled = false;
            document.getElementById('saveSlotBtn').innerText = 'Save Batch';
        }
    });

    function showDeleteConfirm(id) {
        Swal.fire({
            title: 'Delete Batch?',
            text: "This will remove the batch permanently. Confirmed students will lose their slot reference.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff6b6b',
            cancelButtonColor: 'rgba(255,255,255,0.1)',
            confirmButtonText: 'Yes, Delete',
            background: '#1a1a1a',
            color: '#fff'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const token = getToken();
                    const resp = await fetch(`${API_BASE}/api/deleteSlot/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
                    if (!resp.ok) throw new Error('Delete failed');
                    Swal.fire({ icon: 'success', title: 'Deleted', background: '#1a1a1a', color: '#fff' });
                    fetchAllBatches();
                } catch (err) {
                    Swal.fire({ icon: 'error', text: err.message, background: '#1a1a1a', color: '#fff' });
                }
            }
        });
    }

    // Manual Booking
    function openManualBookingModal(id) {
        currentBookingSlotId = id;
        document.getElementById('manualUserId').value = '';
        document.getElementById('manualBookInfo').classList.add('d-none');
        
        // Reset manual checkboxes
        document.querySelectorAll('.manual-module-checkbox').forEach(cb => {
            cb.checked = false;
            cb.disabled = false;
        });

        const slot = allBatches.find(b => b._id === id);
        const container = document.getElementById('manualCoursesContainer');
        if (slot && slot.isFullCourse) {
            if (container) container.style.display = 'block';
        } else {
            if (container) container.style.display = 'none';
        }

        calculateManualModulePrice();
        manualBookModal.show();
    }

    function updateManualCheckboxLabels() {
        const modules = [
            { id: 'full_course', labelId: 'label_manual_mod_full_course', defaultPrice: 14999, name: 'Full 10-day SSB Hackathon' },
            { id: 'ssb_ppdt', labelId: 'label_manual_mod_ssb_ppdt', defaultPrice: 1999, name: 'Intro to SSB & PPDT' },
            { id: 'psych', labelId: 'label_manual_mod_psych', defaultPrice: 3499, name: 'Psychology Prep Program' },
            { id: 'interview', labelId: 'label_manual_mod_interview', defaultPrice: 2499, name: 'Interview & Mock Course' },
            { id: 'group_testing', labelId: 'label_manual_mod_group_testing', defaultPrice: 7999, name: 'GTO Course on VTX' }
        ];

        modules.forEach(mod => {
            const label = document.getElementById(mod.labelId);
            if (label) {
                const price = getCoursePrice(mod.id, mod.defaultPrice);
                label.innerHTML = `${mod.name} (<span class="text-warning font-weight-bold">₹${price.toLocaleString('en-IN')}</span>)`;
            }
        });
    }

    function toggleManualModules(changedId) {
        const fullCourseCheckbox = document.getElementById('manual_mod_full_course');
        const otherCheckboxes = [
            document.getElementById('manual_mod_ssb_ppdt'),
            document.getElementById('manual_mod_psych'),
            document.getElementById('manual_mod_interview'),
            document.getElementById('manual_mod_group_testing')
        ];

        if (changedId === 'full_course') {
            if (fullCourseCheckbox.checked) {
                // If Full Course is checked, uncheck and disable all individual modules
                otherCheckboxes.forEach(cb => {
                    if (cb) {
                        cb.checked = false;
                        cb.disabled = true;
                    }
                });
            } else {
                // If Full Course is unchecked, enable all individual modules
                otherCheckboxes.forEach(cb => {
                    if (cb) {
                        cb.disabled = false;
                    }
                });
            }
        } else {
            // If any individual module is checked, disable full course
            const anyChecked = otherCheckboxes.some(cb => cb && cb.checked);
            if (anyChecked) {
                if (fullCourseCheckbox) {
                    fullCourseCheckbox.checked = false;
                    fullCourseCheckbox.disabled = true;
                }
            } else {
                if (fullCourseCheckbox) {
                    fullCourseCheckbox.disabled = false;
                }
            }
        }

        calculateManualModulePrice();
    }

    function calculateManualModulePrice() {
        const slot = allBatches.find(b => b._id === currentBookingSlotId);
        if (!slot) return;

        let basePrice = 0;
        const fullCourseCheckbox = document.getElementById('manual_mod_full_course');
        
        if (slot.isFullCourse) {
            const isFullChecked = fullCourseCheckbox && fullCourseCheckbox.checked;
            const otherCheckboxes = [
                { id: 'ssb_ppdt', cb: document.getElementById('manual_mod_ssb_ppdt'), defaultPrice: 1999 },
                { id: 'psych', cb: document.getElementById('manual_mod_psych'), defaultPrice: 3499 },
                { id: 'interview', cb: document.getElementById('manual_mod_interview'), defaultPrice: 2499 },
                { id: 'group_testing', cb: document.getElementById('manual_mod_group_testing'), defaultPrice: 7999 }
            ];

            const checkedOthers = otherCheckboxes.filter(item => item.cb && item.cb.checked);

            if (isFullChecked) {
                basePrice = getCoursePrice('full_course', 14999);
            } else if (checkedOthers.length === 4) {
                // Apply Full Course bundle price automatically if all 4 individual courses are selected
                basePrice = getCoursePrice('full_course', 14999);
            } else {
                let sum = 0;
                checkedOthers.forEach(item => {
                    sum += getCoursePrice(item.id, item.defaultPrice);
                });
                basePrice = sum;
            }
        } else {
            basePrice = slot.price || 0;
        }

        const gst = basePrice * 0.18;
        const total = basePrice + gst;

        document.getElementById('manualBasePrice').innerText = `₹${basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('manualGstPrice').innerText = `₹${gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('manualTotalPrice').innerText = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    document.getElementById('confirmManualBookBtn').addEventListener('click', async () => {
        const token = getToken();
        if (!token || !currentBookingSlotId) return;

        const identifier = document.getElementById('manualUserId').value.trim();
        if (!identifier) {
            Swal.fire({ icon: 'warning', text: 'Please enter a student email or ID.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        // Compile selected modules
        const selectedModules = [];
        const slot = allBatches.find(b => b._id === currentBookingSlotId);
        if (slot && slot.isFullCourse) {
            if (document.getElementById('manual_mod_full_course').checked) {
                selectedModules.push('full_course');
            } else {
                const otherCheckboxes = [
                    { id: 'ssb_ppdt', cb: document.getElementById('manual_mod_ssb_ppdt') },
                    { id: 'psych', cb: document.getElementById('manual_mod_psych') },
                    { id: 'interview', cb: document.getElementById('manual_mod_interview') },
                    { id: 'group_testing', cb: document.getElementById('manual_mod_group_testing') }
                ];
                otherCheckboxes.forEach(item => {
                    if (item.cb && item.cb.checked) {
                        selectedModules.push(item.id);
                    }
                });
            }
        }

        if (slot && slot.isFullCourse && selectedModules.length === 0) {
            Swal.fire({ icon: 'warning', text: 'Please select at least one course/module.', background: '#1a1a1a', color: '#fff' });
            return;
        }

        try {
            const btn = document.getElementById('confirmManualBookBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';

            const response = await fetch(`${API_BASE}/api/manualBookSlot/${currentBookingSlotId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    email: identifier,
                    selectedModules: selectedModules
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Booking failed');
            }

            Swal.fire({ icon: 'success', title: 'Booked!', text: 'Student has been added to this batch.', background: '#1a1a1a', color: '#fff' });
            manualBookModal.hide();
            fetchAllBatches();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Booking Error', text: err.message, background: '#1a1a1a', color: '#fff' });
        } finally {
            document.getElementById('confirmManualBookBtn').disabled = false;
            document.getElementById('confirmManualBookBtn').innerHTML = '<i class="fas fa-check-circle me-1"></i> Confirm Booking';
        }
    });

    // Navigation
    document.getElementById('prevMonthBtn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderMonthView(); });
    document.getElementById('nextMonthBtn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderMonthView(); });
    document.getElementById('openAddSlotModalBtn').addEventListener('click', openAddModal);
    document.getElementById('emptyAddSlotBtn').addEventListener('click', openAddModal);

    // Dynamic modal checkbox event listeners
    const isFullCourseCheckbox = document.getElementById('isFullCourse');
    if (isFullCourseCheckbox) {
        isFullCourseCheckbox.addEventListener('change', () => toggleFullCourseUI(false));
    }

    document.querySelectorAll('.module-checkbox').forEach(cb => {
        cb.addEventListener('change', calculateModuleSum);
    });

    document.querySelectorAll('.manual-module-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            toggleManualModules(e.target.value);
        });
    });

    // Global Course Pricing variables
    const globalPricingForm = document.getElementById('globalPricingForm');
    const pricingSyncIcon = document.getElementById('pricingSyncIcon');
    let dbCourses = [];

    // Fetch dynamic global prices
    async function fetchGlobalPrices() {
        try {
            if (pricingSyncIcon) pricingSyncIcon.style.display = 'inline-block';
            
            const response = await fetch(`${API_BASE}/api/allCourses`);
            if (!response.ok) throw new Error('Failed to fetch courses');
            
            dbCourses = await response.json();
            
            // Populate inputs if elements exist and lock them
            dbCourses.forEach(course => {
                if (course.courseId) {
                    const input = document.getElementById(`price_${course.courseId}`);
                    if (input) {
                        input.value = course.price;
                        input.disabled = true;
                    }
                    const btn = document.querySelector(`.edit-price-btn[data-target="price_${course.courseId}"]`);
                    if (btn) {
                        btn.innerHTML = '<i class="fas fa-edit me-1"></i> Edit';
                        btn.style.background = 'var(--surface-light)';
                        btn.style.borderColor = '#444';
                    }
                }
            });

            // Update modal checkboxes with live DB prices
            updateModalCheckboxLabels();
            updateManualCheckboxLabels();
        } catch (err) {
            console.error('Error loading global pricing:', err);
        } finally {
            if (pricingSyncIcon) pricingSyncIcon.style.display = 'none';
        }
    } // Refactor: Use standard disabled property toggle instead of hasAttribute / removeAttribute which gets out of sync

    // Individual Edit button listeners to toggle input locks
    document.querySelectorAll('.edit-price-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input) {
                const isCurrentlyDisabled = input.disabled;
                if (isCurrentlyDisabled) {
                    input.disabled = false;
                    input.focus();
                    btn.innerHTML = '<i class="fas fa-unlock-alt me-1"></i> Unlock';
                    btn.style.background = 'rgba(224, 194, 20, 0.15)';
                    btn.style.borderColor = 'var(--primary-gold)';
                } else {
                    input.disabled = true;
                    btn.innerHTML = '<i class="fas fa-edit me-1"></i> Edit';
                    btn.style.background = 'var(--surface-light)';
                    btn.style.borderColor = '#444';
                }
            }
        });
    });

    // Save global prices
    if (globalPricingForm) {
        globalPricingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const saveBtn = document.getElementById('saveGlobalPricesBtn');
            const originalBtnHtml = saveBtn.innerHTML;

            // Collect only inputs that were active/unlocked by the admin
            const updates = [];
            const allModules = ['ssb_ppdt', 'psych', 'interview', 'group_testing', 'full_course'];
            
            allModules.forEach(key => {
                const input = document.getElementById(`price_${key}`);
                if (input && !input.disabled) {
                    updates.push({ key, val: parseFloat(input.value) });
                }
            });

            if (updates.length === 0) {
                Swal.fire({
                    icon: 'info',
                    title: 'No Changes to Save',
                    text: 'Please click the "Edit" button next to any course price to unlock and edit it.',
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#e0c214'
                });
                return;
            }

            try {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Saving...';

                for (const update of updates) {
                    const match = dbCourses.find(c => c.courseId === update.key);
                    if (!match) continue;

                    // Only update if value actually changed
                    if (match.price === update.val) continue;

                    const response = await fetch(`${API_BASE}/api/updateCourse/${match._id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ price: update.val })
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to update price for ${match.title || update.key}`);
                    }
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Prices Updated Globally!',
                    text: 'Selected course module prices have been saved successfully.',
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#e0c214'
                });

                // Refresh prices to lock state and fetch updated db state
                await fetchGlobalPrices();

            } catch (err) {
                console.error(err);
                Swal.fire({
                    icon: 'error',
                    title: 'Pricing Save Failed',
                    text: err.message,
                    background: '#1a1a1a',
                    color: '#fff',
                    confirmButtonColor: '#ff6b6b'
                });
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalBtnHtml;
            }
        });
    }

    // Init
    fetchAllBatches();
    fetchGlobalPrices();
});
