const principalScript = {
    state: {
        allocations: []
    },
    async init() {
        const user = Auth.requireAuth(['principal']);
        if (!user) return;

        setupHeader(user);
        this.bindEvents();
        await this.renderRequests();
        await this.renderHistory();
        await this.renderAccounts();
        await this.renderLogs();
    },

    bindEvents() {
        document.getElementById('navRequests').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('Requests');
        });

        document.getElementById('navAccounts').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('Accounts');
        });

        document.getElementById('navLogs').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchTab('Logs');
        });
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.getElementById(`nav${tab}`).classList.add('active');

        document.getElementById('requestsSection').style.display = tab === 'Requests' ? 'block' : 'none';
        document.getElementById('accountsSection').style.display = tab === 'Accounts' ? 'block' : 'none';
        document.getElementById('logsSection').style.display = tab === 'Logs' ? 'block' : 'none';
    },

    getStatusBadge(status) {
        if (status === 'approved') return `<span style="background: rgba(16,185,129,0.1); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.75rem;">Approved</span>`;
        if (status === 'rejected') return `<span style="background: rgba(239,68,68,0.1); color: var(--danger); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.75rem;">Rejected</span>`;
        if (status === 'correction') return `<span style="background: rgba(245,158,11,0.1); color: var(--warning); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.75rem;">Correction</span>`;
        return `<span style="background: rgba(100,116,139,0.1); color: var(--text-muted); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600; font-size: 0.75rem;">Pending</span>`;
    },

    async renderRequests() {
        this.state.allocations = await DB.getAllocations();
        const allocations = this.state.allocations.filter(a => a.status === 'pending');
        const tbody = document.querySelector('#requestsTable tbody');
        const mobileContainer = document.getElementById('mobileRequestCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

        if (allocations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending seating requests.</td></tr>`;
            return;
        }

        allocations.forEach(a => {
            const tr = document.createElement('tr');
            let staffIndicator = a.staffName || a.created_by;
            let roomsText = a.rooms ? `${a.rooms.length} Rooms` : '-';

            tr.innerHTML = `
                <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                <td style="font-weight: 600; color: var(--primary);">${a.examDate ? new Date(a.examDate).toLocaleDateString() : '-'} at ${a.examTime || '-'}</td>
                <td>${staffIndicator || '-'}</td>
                <td style="font-weight: 600;">${a.examType || 'General'}</td>
                <td>${a.batch || '-'}</td>
                <td>${roomsText}</td>
                <td>${this.getStatusBadge(a.status)}</td>
                <td><span style="display:inline-block; max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: var(--text-muted);">${a.hodRemark || '<em>None</em>'}</span></td>
                <td>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="principalScript.openDetailsModal('${a.id}')">🔍 View</button>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="principalScript.openActionModal('${a.id}', 'approved')">Approve</button>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: var(--danger); color: var(--danger);" onclick="principalScript.openActionModal('${a.id}', 'rejected')">Reject</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card animate-slide-up';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${a.examType}</div>
                        ${this.getStatusBadge(a.status)}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">By:</span>
                        <span class="mobile-card-value">${staffIndicator}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Date:</span>
                        <span class="mobile-card-value">${a.examDate}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">HOD:</span>
                        <span class="mobile-card-value">${a.hodRemark || 'None'}</span>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button class="btn btn-secondary flex-1" style="font-size: 0.8rem;" onclick="principalScript.openDetailsModal('${a.id}')">View</button>
                        <button class="btn btn-primary flex-1" style="font-size: 0.8rem;" onclick="principalScript.openActionModal('${a.id}', 'approved')">Approve</button>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async renderHistory() {
        this.state.allocations = await DB.getAllocations();
        const allocations = this.state.allocations.filter(a => a.status !== 'pending');
        const tbody = document.querySelector('#historyTable tbody');
        const mobileContainer = document.getElementById('mobileHistoryCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

        if (allocations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">No history found.</td></tr>`;
            return;
        }

        allocations.reverse().forEach(a => {
            const tr = document.createElement('tr');
            let roomsText = a.rooms ? `${a.rooms.length} Rooms` : '-';

            let actionsHtml = `<button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="principalScript.openDetailsModal('${a.id}')">🔍 Details</button>`;
            
            if (a.status === 'approved') {
                 actionsHtml += `<button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; margin-left: 0.25rem; background: var(--success); border-color: var(--success);" onclick="ExportUtils.exportToExcel(principalScript.state.allocations.find(allc => allc.id === '${a.id}'))">⬇️ Excel</button>`;
            }

            tr.innerHTML = `
                <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                <td style="font-weight: 600; color: var(--primary);">${a.examDate ? new Date(a.examDate).toLocaleDateString() : '-'} at ${a.examTime || '-'}</td>
                <td style="font-weight: 600;">${a.examType || 'General'}</td>
                <td>${a.batch || '-'}</td>
                <td>${roomsText}</td>
                <td>${this.getStatusBadge(a.status)}</td>
                <td>${a.remarks || '-'}</td>
                <td>
                    ${actionsHtml}
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card animate-slide-up';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${a.examType}</div>
                        ${this.getStatusBadge(a.status)}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Date:</span>
                        <span class="mobile-card-value">${a.examDate}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Batch:</span>
                        <span class="mobile-card-value">${a.batch}</span>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async renderAccounts() {
        const users = (await DB.getUsers()).filter(u => u.status === 'pending');
        const tbody = document.querySelector('#accountsTable tbody');
        const mobileContainer = document.getElementById('mobileAccountCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No pending staff account requests.</td></tr>`;
            return;
        }

        users.forEach(u => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 600;">${u.name || '-'}</td>
                <td>${u.email || '-'}</td>
                <td>${u.username || '-'}</td>
                <td style="text-transform: capitalize;">${u.role}</td>
                <td>${u.department || '-'}</td>
                <td>
                    <button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; margin-right: 0.25rem;" onclick="principalScript.approveAccount(${u.staff_id})">Approve</button>
                    <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; border-color: var(--danger); color: var(--danger);" onclick="principalScript.rejectAccount(${u.staff_id})">Reject</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${u.name}</div>
                        <span class="badge" style="background:#fef3c7; color:#92400e;">Pending</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Email:</span>
                        <span class="mobile-card-value">${u.email}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Role:</span>
                        <span class="mobile-card-value">${u.role.toUpperCase()}</span>
                    </div>
                    <div class="flex gap-2 mt-3">
                        <button class="btn btn-primary flex-1" style="font-size: 0.8rem;" onclick="principalScript.approveAccount(${u.staff_id})">Approve</button>
                        <button class="btn btn-secondary flex-1" style="font-size: 0.8rem; color:var(--danger);" onclick="principalScript.rejectAccount(${u.staff_id})">Reject</button>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async approveAccount(id) {
        if (confirm(`Approve this staff account?`)) {
            await DB.updateUserStatus(id, 'approved');
            await this.renderAccounts();
        }
    },

    async renderLogs() {
        const logs = await DB.getLogs();
        const tbody = document.querySelector('#logsTable tbody');
        const mobileContainer = document.getElementById('mobileLogCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

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
                <td><span class="badge" style="background:#f3f4f6;">${l.dept || '-'}</span></td>
                <td>${date} at ${time}</td>
                <td>${l.createdByName || 'ID: ' + l.created_by}</td>
                <td>${l.approvedByName || 'ID: ' + l.approved_by}</td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${l.action}</div>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(l.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Dept:</span>
                        <span class="mobile-card-value">${l.dept || '-'}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">By:</span>
                        <span class="mobile-card-value">${l.createdByName || 'System'}</span>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async rejectAccount(id) {
        if (confirm(`Reject this account request? This will delete the user request.`)) {
            await DB.deleteUser(id);
            await this.renderAccounts();
        }
    },

    openActionModal(id, actionType) {
        document.getElementById('actionAllocId').value = id;
        document.getElementById('actionType').value = actionType;
        document.getElementById('actionModalTitle').textContent = actionType === 'approved' ? 'Approve Allocation' : 'Reject Allocation';

        const a = this.state.allocations.find(a => a.id === id);
        if (a) {
            const r = a.room || (a.rooms ? `${a.rooms.length} Rooms` : '-');
            document.getElementById('modalSummary').innerHTML = `
                <strong>Exam:</strong> ${a.examType} <br>
                <strong>Batch:</strong> ${a.batch} <br>
                <strong>Rooms:</strong> ${r}
            `;
        }

        const confirmBtn = document.getElementById('confirmActionBtn');
        if (actionType === 'approved') {
            confirmBtn.className = 'btn btn-primary';
            confirmBtn.style.background = 'linear-gradient(135deg, var(--success) 0%, #059669 100%)';
            confirmBtn.textContent = 'Approve & Finalize';
        } else {
            confirmBtn.className = 'btn';
            confirmBtn.style.background = 'linear-gradient(135deg, var(--danger) 0%, #B91C1C 100%)';
            confirmBtn.style.color = 'white';
            confirmBtn.textContent = 'Reject Request';
        }

        document.getElementById('principalRemarks').value = '';
        document.getElementById('actionModal').style.display = 'flex';
    },

    openDetailsModal(id) {
        const a = this.state.allocations.find(a => a.id === id);
        if (!a) return;

        const container = document.getElementById('detailsModalContent');
        
        let roomsHtml = '';
        let navControls = '';
        
        if (a.rooms && a.rooms.length > 0) {
             roomsHtml = a.rooms.map((r, idx) => {
                  let html = `<div id="prinPreviewRoom_${idx}" style="display: ${idx === 0 ? 'block' : 'none'};">`;
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
                 window.prinCurrentPreviewRoomIndex = 0;
                 window.prinTotalPreviewRooms = a.rooms.length;
                 
                 // Bind global function for modal inline navigation
                 window.switchPrinPreviewRoom = (dir) => {
                      const newIndex = window.prinCurrentPreviewRoomIndex + dir;
                      if (newIndex >= 0 && newIndex < window.prinTotalPreviewRooms) {
                           document.getElementById(`prinPreviewRoom_${window.prinCurrentPreviewRoomIndex}`).style.display = 'none';
                           document.getElementById(`prinPreviewRoom_${newIndex}`).style.display = 'block';
                           window.prinCurrentPreviewRoomIndex = newIndex;
                           document.getElementById('prinPreviewRoomCounter').textContent = `Room ${newIndex + 1} of ${window.prinTotalPreviewRooms}`;
                      }
                 };

                 navControls = `
                     <div class="flex justify-between items-center" style="margin-bottom: 2rem; background: var(--bg-color); padding: 0.5rem; border-radius: 999px; border: 1px solid var(--border);">
                         <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="switchPrinPreviewRoom(-1)">Previous Room</button>
                         <span style="font-weight: 600; color: var(--text-muted);" id="prinPreviewRoomCounter">Room 1 of ${a.rooms.length}</span>
                         <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="switchPrinPreviewRoom(1)">Next Room</button>
                     </div>
                 `;
             }
        } else {
             roomsHtml = `<p>No room grid data attached.</p>`;
        }

        let facultyStr = a.faculties ? a.faculties.map(f => f.facultyName).join(', ') : 'None explicitly assigned';

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem; background: var(--bg-color); padding: 1.5rem; border-radius: 8px;">
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Submitted By</h3>
                    <p style="font-weight: 600;">${a.staffName || a.staffId}</p>
                </div>
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Exam & Date</h3>
                    <p style="font-weight: 600;">${a.examType} (Target: ${a.examDate || '-'})</p>
                </div>
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Batches</h3>
                    <p style="font-size: 0.9rem;">${a.batch}</p>
                </div>
                <div>
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.25rem;">Full Invigilator Pool</h3>
                    <p style="font-size: 0.9rem;">${facultyStr}</p>
                </div>
            </div>
            
            <div style="border-top: 1px solid var(--border); padding-top: 2rem;">
                ${navControls}
                ${roomsHtml}
            </div>
        `;

        document.getElementById('detailsModal').style.display = 'flex';
    },

    closeModal() {
        document.getElementById('actionModal').style.display = 'none';
    },

    async confirmAction() {
        const id = document.getElementById('actionAllocId').value;
        const status = document.getElementById('actionType').value;
        const remarks = document.getElementById('principalRemarks').value.trim();

        const success = await DB.updateAllocationStatus(id, status, remarks);
        if (success) {
            this.closeModal();
            await this.renderRequests();
            await this.renderHistory();
        } else {
            alert('Error updating allocation status.');
        }
    },

    async clearHistory() {
        if (confirm('Are you sure you want to clear ALL allocation history? This cannot be undone.')) {
            const success = await DB.clearAllocationHistory();
            if (success) {
                await this.renderRequests();
                await this.renderHistory();
                alert('History purged successfully!');
            } else {
                alert('Error clearing history.');
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    principalScript.init();
});