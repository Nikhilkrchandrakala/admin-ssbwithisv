/**
 * Platform Stats Dashboard JS
 * Standardized for the Charcoal/Gold Admin System
 */

document.addEventListener("DOMContentLoaded", () => {
    const tableBody = document.getElementById('numberMonitorTableBody');
    const API_BASE = config?.backendBaseUrl || 'http://localhost:5001';

    const getToken = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = './index.html';
            return null;
        }
        return token;
    };

    const fetchEntries = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/allNumberMonitors`);
            const data = await response.json();

            if (response.ok) {
                tableBody.innerHTML = '';
                if (data.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center p-5 opacity-50">No statistics entries found</td></tr>';
                    return;
                }

                data.forEach(entry => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><input type="text" value="${entry.officerSelection}" data-id="${entry._id}" class="admin-input py-1 officerSelection"></td>
                        <td><input type="number" value="${entry.yearService}" data-id="${entry._id}" class="admin-input py-1 yearService"></td>
                        <td><input type="number" value="${entry.facultyExperience}" data-id="${entry._id}" class="admin-input py-1 facultyExperience"></td>
                        <td><input type="number" value="${entry.totalFaculty}" data-id="${entry._id}" class="admin-input py-1 totalFaculty"></td>
                        <td>
                            <button class="thm-btn py-1 px-3" onclick="saveEntry('${entry._id}')">
                                <i class="fas fa-save me-1"></i> Save
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            } else {
                throw new Error('Failed to load statistics');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Fetch Error', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    };

    window.saveEntry = async (id) => {
        const token = getToken();
        if (!token) return;

        const updatedEntry = {
            officerSelection: document.querySelector(`.officerSelection[data-id="${id}"]`).value,
            yearService: document.querySelector(`.yearService[data-id="${id}"]`).value,
            facultyExperience: document.querySelector(`.facultyExperience[data-id="${id}"]`).value,
            totalFaculty: document.querySelector(`.totalFaculty[data-id="${id}"]`).value,
        };

        try {
            const response = await fetch(`${API_BASE}/api/updateNumberMonitor/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedEntry),
            });

            const result = await response.json();

            if (response.ok) {
                Swal.fire({
                    toast: true,
                    position: 'top-end',
                    icon: 'success',
                    title: 'Stats updated successfully',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#1a1a1a',
                    color: '#fff'
                });
                fetchEntries();
            } else {
                throw new Error(result.message || 'Update failed');
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
        }
    };

    const contactForm = document.getElementById('contactSettingsForm');
    const whatsappInput = document.getElementById('whatsappNumberInput');
    const callInput = document.getElementById('callNumberInput');

    const fetchContactSettings = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/contactSettings`);
            const data = await response.json();

            if (response.ok && data) {
                whatsappInput.value = data.whatsappNumber || '';
                callInput.value = data.callNumber || '';
            } else {
                throw new Error('Failed to load contact settings');
            }
        } catch (error) {
            console.error('Error fetching contact settings:', error);
        }
    };

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) return;

            const updatedSettings = {
                whatsappNumber: whatsappInput.value,
                callNumber: callInput.value
            };

            try {
                const response = await fetch(`${API_BASE}/api/contactSettings`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(updatedSettings),
                });

                const result = await response.json();

                if (response.ok) {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Contact settings updated successfully',
                        showConfirmButton: false,
                        timer: 2000,
                        background: '#1a1a1a',
                        color: '#fff'
                    });
                    fetchContactSettings();
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Save Failed', text: error.message, background: '#1a1a1a', color: '#fff' });
            }
        });
    }

    fetchEntries();
    fetchContactSettings();
});
