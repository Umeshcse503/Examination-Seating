const adminScript = {
    async init() {
        const user = Auth.requireAuth(['admin']);
        if (!user) return;

        setupHeader(user);
        this.bindEvents();
        await this.renderUsers();
        await this.renderLogs();
    },

    bindEvents() {
        document.getElementById('navUsers').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('users');
        });

        document.getElementById('navLogs').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('logs');
        });
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

        document.getElementById('usersSection').style.display = tab === 'users' ? 'block' : 'none';
        document.getElementById('logsSection').style.display = tab === 'logs' ? 'block' : 'none';
    },

    async renderUsers() {
        const users = await DB.getUsers();
        this.users = users; // Store for ID-based lookup
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';

        users.forEach(u => {
            const tr = document.createElement('tr');

            // Removed role specific colors
            let roleBadge = `<span class="badge" style="background: #f3f4f6; color: #374151; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">${u.role}</span>`;

            let statusBadge = '';
            if (u.status === 'approved') statusBadge = `<span style="background: #D1FAE5; color: #065F46; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem;">Approved</span>`;
            else if (u.status === 'pending') statusBadge = `<span style="background: #FEF3C7; color: #92400E; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem;">Pending</span>`;
            else if (u.status === 'rejected') statusBadge = `<span style="background: #FEE2E2; color: #991B1B; padding: 0.25rem 0.5rem; border-radius: 9999px; font-size: 0.75rem;">Rejected</span>`;

            let actionButtons = `
                <button class="btn btn-secondary edit-btn-glow" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="adminScript.showEditUserModal(${u.staff_id})">
                    <i class="fas fa-edit"></i> Edit
                </button>
            `;
            if (u.status === 'pending') {
                actionButtons += `
                    <button class="btn btn-primary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--success);" onclick="adminScript.handleStatusUpdate(${u.staff_id}, 'approved')">Approve</button>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--danger);" onclick="adminScript.handleStatusUpdate(${u.staff_id}, 'rejected')">Reject</button>
                `;
            }
            actionButtons += `
                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" onclick="adminScript.deleteUser(${u.staff_id})">Delete</button>
            `;

            tr.innerHTML = `
                <td style="font-weight: 500;">${u.name}</td>
                <td>@${u.username}</td>
                <td>${roleBadge}</td>
                <td>${u.department || 'General'}</td>
                <td>${statusBadge}</td>
                <td>${actionButtons}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async handleStatusUpdate(id, status) {
        if (await DB.updateUserStatus(id, status)) {
            await this.renderUsers();
        } else {
            alert('Failed to update user status.');
        }
    },

    async renderLogs() {
        const logs = await DB.getLogs();
        const tbody = document.querySelector('#logsTable tbody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 2rem;">No logs recorded yet.</td></tr>`;
            return;
        }

        logs.forEach(l => {
            const tr = document.createElement('tr');
            const date = l.exam_date ? new Date(l.exam_date).toLocaleDateString() : '-';
            const time = l.exam_time || '-';
            
            tr.innerHTML = `
                <td>${new Date(l.timestamp).toLocaleString()}</td>
                <td><span style="color: var(--success); font-weight: 600;">${l.action}</span></td>
                <td>${date} at ${time}</td>
                <td>${l.createdByName || 'ID: ' + l.created_by}</td>
                <td>${l.approvedByName || 'ID: ' + l.approved_by}</td>
            `;
            tbody.appendChild(tr);
        });
    },

    async deleteUser(id) {
        if (confirm(`Are you sure you want to delete this user?`)) {
            await DB.deleteUser(id);
            await this.renderUsers();
        }
    },

    showAddUserModal() {
        document.getElementById('addUserModal').style.display = 'flex';
    },

    closeAddUserModal() {
        document.getElementById('addUserModal').style.display = 'none';

        // Clear inputs
        document.getElementById('newName').value = '';
        document.getElementById('newEmail').value = '';
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('newDept').value = 'General';
    },

    async addUser() {
        const name = document.getElementById('newName').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const uname = document.getElementById('newUsername').value.trim();
        const pwd = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        const dept = document.getElementById('newDept').value;

        if (!uname || !pwd) {
            alert('Username and Password are required fields.');
            return;
        }

        // Use the db.js addUser signature: addUser(username, password, role, name, email, department)
        const success = await DB.addUser(uname, pwd, role, name, email, dept);
        if (success) {
            this.closeAddUserModal();
            this.renderUsers();
        } else {
            alert('Username already exists or server error');
        }
    },

    showEditUserModal(staffId) {
        const user = this.users.find(u => u.staff_id === staffId);
        if (!user) return;

        document.getElementById('editStaffId').value = user.staff_id;
        document.getElementById('editName').value = user.name || '';
        document.getElementById('editEmail').value = user.email || '';
        document.getElementById('editDept').value = user.department || 'General';
        document.getElementById('editRole').value = user.role;
        document.getElementById('editUserModal').style.display = 'flex';
    },

    closeEditUserModal() {
        document.getElementById('editUserModal').style.display = 'none';
    },

    async saveUserUpdate() {
        const modal = document.getElementById('editUserModal');
        const saveBtn = modal.querySelector('.btn-primary');
        const originalText = saveBtn.innerText;

        const id = document.getElementById('editStaffId').value;
        const data = {
            name: document.getElementById('editName').value.trim(),
            email: document.getElementById('editEmail').value.trim(),
            department: document.getElementById('editDept').value,
            role: document.getElementById('editRole').value
        };

        try {
            saveBtn.innerText = 'Saving...';
            saveBtn.disabled = true;

            const result = await DB.updateUser(id, data);
            
            if (result.success) {
                this.closeEditUserModal();
                await this.renderUsers();
            } else {
                alert(result.error || 'Failed to update user profile');
            }
        } catch (error) {
            console.error('Update error:', error);
            alert('An unexpected error occurred. Please try again.');
        } finally {
            saveBtn.innerText = originalText;
            saveBtn.disabled = false;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    adminScript.init();
});
