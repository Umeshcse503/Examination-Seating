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
        const mobileContainer = document.getElementById('mobileUserCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

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

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card animate-slide-up';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${u.name}</div>
                        ${statusBadge}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Role:</span>
                        <span class="mobile-card-value">${roleBadge}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Dept:</span>
                        <span class="mobile-card-value">${u.department || 'General'}</span>
                    </div>
                    <div class="flex gap-2 mt-3">
                        ${actionButtons}
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async handleStatusUpdate(id, status) {
        if (await DB.updateUserStatus(id, status)) {
            await this.renderUsers();
        } else {
            alert('Failed to update user status.');
        }
    },

    async renderLogs(limit = null) {
        const allocations = await DB.getAllocations('', '', limit);
        const tbody = document.querySelector('#logsTable tbody');
        const mobileContainer = document.getElementById('mobileLogCards');
        const viewAllBtn = document.getElementById('viewAllLogsBtn');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

        if (allocations.length === 0) {
            const emptyMsg = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No allocation history found.</td></tr>`;
            tbody.innerHTML = emptyMsg;
            return;
        }

        allocations.forEach(a => {
            const tr = document.createElement('tr');
            const date = a.examDate ? new Date(a.examDate).toLocaleDateString() : '-';
            const details = a.batch ? `Batch: ${a.batch} (${a.examType})` : (a.examType || '-');
            
            // Allocation ID is available for result viewing
            let viewBtnHtml = `<button class="btn btn-secondary" style="padding: 0.2rem 0.6rem; font-size: 0.7rem; margin-top: 0.25rem;" onclick="adminScript.openDetailsModal('${a.allocation_id}')">🔍 View Result</button>`;

            let statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.05);">${a.status}</span>`;
            if (a.status === 'approved') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(16,185,129,0.1); color: var(--success);">Approved</span>`;
            else if (a.status === 'rejected') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(239,68,68,0.1); color: var(--danger);">Rejected</span>`;

            tr.innerHTML = `
                <td>${new Date(a.created_at).toLocaleString()}</td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        ${statusBadge}
                        ${viewBtnHtml}
                    </div>
                </td>
                <td>${date}</td>
                <td>${details}</td>
                <td>${a.staffName || 'ID: ' + a.created_by}</td>
                <td>${a.approvedByName || (a.status !== 'pending' ? 'Principal' : '-')}</td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card animate-slide-up';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${a.examType}</div>
                        ${statusBadge}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Exam:</span>
                        <span class="mobile-card-value">${date}</span>
                    </div>
                    <div class="mobile-card-row" style="flex-direction: column; align-items: flex-start;">
                        <span class="mobile-card-label" style="margin-bottom: 0.5rem;">Results:</span>
                        ${viewBtnHtml}
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },



    async openDetailsModal(id) {
        // Fetch specific allocation
        // Since we don't have a single-fetch API yet, we'll fetch all with this staff ID if we knew it,
        // but easier to just use the existing allocations endpoint with no filters and find it.
        const allAllocations = await DB.getAllocations();
        const a = allAllocations.find(item => item.id == id);
        
        if (!a) {
            alert('Allocation details not found.');
            return;
        }

        const container = document.getElementById('detailsModalContent');
        
        let roomsHtml = '';
        let navControls = '';
        
        if (a.rooms && a.rooms.length > 0) {
             roomsHtml = a.rooms.map((r, idx) => {
                  let html = `<div id="adminPreviewRoom_${idx}" style="display: ${idx === 0 ? 'block' : 'none'};">`;
                  html += `<h4 style="margin-bottom: 0.5rem; text-align: center; color: var(--primary); font-size: 1.25rem;">${r.roomName} Matrix</h4>`;
                  html += `<p style="text-align: center; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">Assigned Invigilator: <strong>${a.faculties && a.faculties[idx] ? a.faculties[idx].facultyName : 'N/A'}</strong></p>`;
                  
                  html += `<div style="display: grid; grid-template-columns: repeat(${r.cols}, 1fr); gap: 8px; width: 100%; overflow-x: auto; padding-bottom: 1rem;">`;
                  
                  if(r.grid2D) {
                      for (let row = 0; row < r.rows; row++) {
                          for (let col = 0; col < r.cols; col++) {
                              let seat = r.grid2D[row][col];
                              if (seat) {
                                  let color = seat.batchId.includes('CSE') ? '#3B82F6' : (seat.batchId.includes('ECE') ? '#10B981' : (seat.batchId.includes('MECH') ? '#F59E0B' : '#8B5CF6'));
                                  html += `<div style="background: rgba(0,0,0,0.03); border-top: 3px solid ${color}; padding: 0.5rem; text-align: center; font-size: 0.75rem; border-radius: 4px; box-shadow: var(--shadow-sm);">
                                            <div style="font-weight: 700;">${seat.roll}</div>
                                            <div style="font-size: 0.65rem; color: var(--text-muted);">${seat.batchId}</div>
                                           </div>`;
                              } else {
                                  html += `<div style="background: var(--bg-color); border: 1px dashed var(--border); border-radius: 4px; display: flex; align-items: center; justify-content: center; min-height: 45px;"><span style="color: var(--text-muted); font-size: 0.7rem;">Empty</span></div>`;
                              }
                          }
                      }
                  } else {
                      html += `<p style="grid-column: 1 / -1; text-align: center; padding: 2rem;">No 2D Grid data stored.</p>`;
                  }
                  
                  html += `</div></div>`;
                  return html;
             }).join('');

             if(a.rooms.length > 1) {
                 window.adminCurrentPreviewRoomIndex = 0;
                 window.adminTotalPreviewRooms = a.rooms.length;
                 
                 window.switchAdminPreviewRoom = (dir) => {
                      const newIndex = window.adminCurrentPreviewRoomIndex + dir;
                      if (newIndex >= 0 && newIndex < window.adminTotalPreviewRooms) {
                           document.getElementById(`adminPreviewRoom_${window.adminCurrentPreviewRoomIndex}`).style.display = 'none';
                           document.getElementById(`adminPreviewRoom_${newIndex}`).style.display = 'block';
                           window.adminCurrentPreviewRoomIndex = newIndex;
                           document.getElementById('adminPreviewRoomCounter').textContent = `Room ${newIndex + 1} of ${window.adminTotalPreviewRooms}`;
                      }
                 };

                 navControls = `
                     <div class="flex justify-between items-center" style="margin-bottom: 2rem; background: var(--bg-color); padding: 0.5rem; border-radius: 999px; border: 1px solid var(--border);">
                         <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="switchAdminPreviewRoom(-1)">Previous Room</button>
                         <span style="font-weight: 600; color: var(--text-muted);" id="adminPreviewRoomCounter">Room 1 of ${a.rooms.length}</span>
                         <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="switchAdminPreviewRoom(1)">Next Room</button>
                     </div>
                 `;
             }
        } else {
             roomsHtml = `<p>No room grid data attached.</p>`;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: var(--bg-color); padding: 1.5rem; border-radius: 8px;">
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Exam & Date</h3>
                    <p style="font-weight: 600;">${a.examType} (Target: ${a.examDate || '-'})</p>
                </div>
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Batches</h3>
                    <p style="font-size: 0.9rem;">${a.batch}</p>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--border); padding-top: 2rem;">
                ${navControls}
                ${roomsHtml}
            </div>
        `;

        document.getElementById('detailsModal').style.display = 'flex';
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
