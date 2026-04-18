const hodScript = {
    state: {
        allocations: [],
        students: [],
        stats: null,
        chart: null
    },
    async init() {
        const user = Auth.requireAuth(['hod']);
        if (!user) return;
        
        setupHeader(user);
        this.bindEvents();
        await this.loadStats();
        await this.renderOverview();
    },

    bindEvents() {
        document.getElementById('navMonitor').addEventListener('click', () => this.switchTab('Monitor'));
        document.getElementById('navHistory').addEventListener('click', () => this.switchTab('History'));
        document.getElementById('navStudents').addEventListener('click', () => this.switchTab('Students'));
        
        const searchInput = document.getElementById('globalSearch');
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => this.handleSearch(e.target.value), 300);
        });

        const studentImport = document.getElementById('studentImportFile');
        if (studentImport) studentImport.addEventListener('change', (e) => this.handleStudentImport(e));

        // Total Staff Click
        const statStaff = document.getElementById('statStaff');
        if (statStaff && statStaff.parentElement) {
            statStaff.parentElement.style.cursor = 'pointer';
            statStaff.parentElement.addEventListener('click', () => this.switchTab('Staff'));
        }
        
        // Total Students Click
        const statStudents = document.getElementById('statStudents');
        if (statStudents && statStudents.parentElement) {
            statStudents.parentElement.style.cursor = 'pointer';
            statStudents.parentElement.addEventListener('click', () => this.switchTab('Students'));
        }

        // Total Exams Created Click
        const statExams = document.getElementById('statExams');
        if (statExams && statExams.parentElement) {
            statExams.parentElement.style.cursor = 'pointer';
            statExams.parentElement.addEventListener('click', () => this.switchTab('History'));
        }

        // Pending Approvals Click
        const statPending = document.getElementById('statPending');
        if (statPending && statPending.parentElement) {
            statPending.parentElement.style.cursor = 'pointer';
            statPending.parentElement.addEventListener('click', () => this.switchTab('History'));
        }
    },

    switchTab(tab) {
        const sections = ['overviewSection', 'historySection', 'studentsSection', 'staffSection'];
        const navs = ['navMonitor', 'navHistory', 'navStudents'];
        
        sections.forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });
        navs.forEach(n => {
            const el = document.getElementById(n);
            if (el) el.classList.remove('active');
        });

        if (tab === 'Monitor') {
            document.getElementById('overviewSection').style.display = 'block';
            document.getElementById('navMonitor').classList.add('active');
            this.renderOverview();
        } else if (tab === 'History') {
            document.getElementById('historySection').style.display = 'block';
            document.getElementById('navHistory').classList.add('active');
            this.renderHistory();
        } else if (tab === 'Students') {
            document.getElementById('studentsSection').style.display = 'block';
            document.getElementById('navStudents').classList.add('active');
            this.renderStudents();
        } else if (tab === 'Staff') {
            document.getElementById('staffSection').style.display = 'block';
            this.renderStaff();
        }
    },

    async loadStats() {
        try {
            const user = Auth.getCurrentUser();
            const dept = user ? user.department : '';
            console.log('Fetching stats for dept:', dept);
            this.state.stats = await DB.getHODStats(dept);
            
            const els = {
                'statExams': this.state.stats.totalExams,
                'statPending': this.state.stats.pendingApprovals,
                'statStudents': this.state.stats.totalStudents,
                'statStaff': this.state.stats.totalStaff
            };

            for (const [id, val] of Object.entries(els)) {
                const el = document.getElementById(id);
                if (el) el.textContent = val;
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    },

    async renderOverview() {
        await this.loadStats();
        this.renderChart();
    },

    renderChart() {
        const canvas = document.getElementById('capacityChart');
        if (!canvas || typeof Chart === 'undefined') {
            console.warn('Canvas or Chart.js not available');
            return;
        }
        const ctx = canvas.getContext('2d');
        if (this.state.chart) this.state.chart.destroy();

        this.state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Exams Conducted',
                    data: [12, 19, 3, 5, 2, 3],
                    borderColor: '#1E3A8A',
                    backgroundColor: 'rgba(30, 58, 138, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    async renderHistory(limit = null) {
        const user = Auth.getCurrentUser();
        const dept = user ? user.department : '';
        this.state.allocations = await DB.getAllocations(dept, '', limit);
        const tbody = document.querySelector('#allocationsTable tbody');
        const mobileContainer = document.getElementById('mobileAllocationCards');
        const viewAllBtn = document.getElementById('viewAllAllocationsBtn');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';

        if (this.state.allocations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 2rem;">No allocations found.</td></tr>`;
            return;
        }

        this.state.allocations.forEach(a => {
            const tr = document.createElement('tr');
            let statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.05);">${a.status}</span>`;
            if (a.status === 'approved') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(16,185,129,0.1); color: var(--success);">Approved</span>`;
            
            // Format nice timestamp for the created date
            const createdDate = new Date(a.created_at).toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            const reviewBtnLabel = a.status === 'approved' ? '🔍 View Result' : 'Review & Add Remarks';
            const reviewBtnClass = a.status === 'approved' ? 'btn btn-primary' : 'btn btn-secondary';

            tr.innerHTML = `
                <td>${createdDate}</td>
                <td style="font-weight:600;">${a.examDate} @ ${a.examTime}</td>
                <td>${a.examType}</td>
                <td>${a.batch}</td>
                <td>${a.staffName || 'N/A'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="${reviewBtnClass}" style="padding: 4px 12px; font-size: 12px;" onclick="hodScript.openDetailsModal('${a.allocation_id}')">${reviewBtnLabel}</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${a.examType}</div>
                        ${statusBadge}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Schedule:</span>
                        <span class="mobile-card-value">${a.examDate} @ ${a.examTime}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Batch:</span>
                        <span class="mobile-card-value">${a.batch}</span>
                    </div>
                    <button class="${reviewBtnClass} w-100 mt-3" onclick="hodScript.openDetailsModal('${a.allocation_id}')">${reviewBtnLabel}</button>
                `;
                mobileContainer.appendChild(card);
            }
        });

        });
    },



    async renderStudents() {
        const user = Auth.getCurrentUser();
        const dept = user ? user.department : '';
        const students = await DB.searchStudents('', dept);
        const tbody = document.querySelector('#studentsTable tbody');
        const mobileContainer = document.getElementById('mobileStudentCards');
        
        tbody.innerHTML = '';
        if(mobileContainer) mobileContainer.innerHTML = '';
        
        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${s.roll_no}</td>
                <td>${s.name}</td>
                <td>${s.branch}</td>
                <td>${s.year}</td>
                <td>${s.section}</td>
                <td>
                    <button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px;">Edit</button>
                </td>
            `;
            tbody.appendChild(tr);

            // Mobile Card
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${s.name}</div>
                        <span style="font-size: 0.8rem; color: var(--primary); font-weight: 600;">${s.roll_no}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Branch:</span>
                        <span class="mobile-card-value">${s.branch}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Year/Sec:</span>
                        <span class="mobile-card-value">${s.year} - ${s.section}</span>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    async renderStaff() {
        const user = Auth.getCurrentUser();
        const dept = user ? user.department : '';
        
        // Assuming DB.getUsers() or similar exists. Let's use the API directly via fetch if not in DB
        // But we already updated DB in previous turns to support staff? Let's check DB.getUsers
        try {
            const response = await fetch(`http://localhost:3000/api/staff?dept=${encodeURIComponent(dept)}`);
            const staff = await response.json();
            
            const tbody = document.querySelector('#staffTable tbody');
            const mobileContainer = document.getElementById('mobileStaffCards');
            
            tbody.innerHTML = '';
            if(mobileContainer) mobileContainer.innerHTML = '';
            
            staff.forEach(s => {
                const tr = document.createElement('tr');
                let statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(16,185,129,0.1); color: var(--success);">Active</span>`;
                if(s.status === 'pending') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.05); color: var(--text-muted);">Pending</span>`;

                tr.innerHTML = `
                    <td style="font-weight:600;">${s.name}</td>
                    <td>${s.email}</td>
                    <td><span class="badge" style="background:#e0e7ff; color:#3730a3;">${s.role.toUpperCase()}</span></td>
                    <td>${statusBadge}</td>
                    <td>${new Date(s.created_at).toLocaleDateString()}</td>
                `;
                tbody.appendChild(tr);

                // Mobile Card
                if (mobileContainer) {
                    const card = document.createElement('div');
                    card.className = 'mobile-card';
                    card.innerHTML = `
                        <div class="mobile-card-header">
                            <div class="mobile-card-title">${s.name}</div>
                            ${statusBadge}
                        </div>
                        <div class="mobile-card-row">
                            <span class="mobile-card-label">Email:</span>
                            <span class="mobile-card-value">${s.email}</span>
                        </div>
                        <div class="mobile-card-row">
                            <span class="mobile-card-label">Joined:</span>
                            <span class="mobile-card-value">${new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                    `;
                    mobileContainer.appendChild(card);
                }
            });
        } catch (error) {
            console.error('Error rendering staff:', error);
        }
    },

    async handleSearch(q) {
        if (!q && document.getElementById('overviewSection').style.display !== 'none') return;
        
        this.switchTab('Students');
        const user = Auth.getCurrentUser();
        const dept = user ? user.department : '';
        const students = await DB.searchStudents(q, dept);
        const tbody = document.querySelector('#studentsTable tbody');
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem;">No matching students found.</td></tr>`;
            return;
        }

        students.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:600;">${s.roll_no}</td>
                <td>${s.name}</td>
                <td>${s.branch}</td>
                <td>${s.year}</td>
                <td>${s.section}</td>
                <td><button class="btn btn-secondary" style="padding: 4px 12px; font-size: 12px;">Edit</button></td>
            `;
            tbody.appendChild(tr);
        });
    },

    triggerImport() {
        document.getElementById('studentImportFile').click();
    },

    async handleStudentImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const students = XLSX.utils.sheet_to_json(sheet);
            
            // Map keys if they don't exactly match roll_no, name etc.
            const mapped = students.map(s => ({
                roll_no: s.RollNo || s['Roll No'] || s.roll_no,
                name: s.Name || s.name,
                branch: s.Branch || s.branch,
                year: s.Year || s.year,
                section: s.Section || s.section,
                email: s.Email || s.email || ''
            }));

            if (await DB.bulkSaveStudents(mapped)) {
                alert('Students imported successfully!');
                await this.renderStudents();
                await this.loadStats();
            } else {
                alert('Import failed. Check console for details.');
            }
        };
        reader.readAsArrayBuffer(file);
    },

    async openDetailsModal(id) {
        const a = this.state.allocations.find(a => a.allocation_id == id);
        if (!a) return;
        const container = document.getElementById('detailsModalContent');
        container.innerHTML = `
            <div style="margin-bottom: 2rem;">
                <h3 style="font-size: 1.1rem; color: var(--primary); margin-bottom: 1rem;">Allocation Details</h3>
                <div class="grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div><strong>Exam:</strong> ${a.examType}</div>
                    <div><strong>Date:</strong> ${a.examDate} @ ${a.examTime}</div>
                    <div><strong>Batch:</strong> ${a.batch}</div>
                    <div><strong>Staff:</strong> ${a.staffName || 'N/A'}</div>
                </div>
            </div>
            
            <div class="form-group" style="margin-top: 1.5rem;">
                <label style="font-weight: 600; color: var(--text-main);">HOD Remarks (Optional)</label>
                <textarea id="hodRemarkInput" class="form-control" rows="4" placeholder="Enter feedback or observations for the Principal...">${a.hod_remark || ''}</textarea>
            </div>
            
            <div class="flex gap-4" style="margin-top: 2rem;">
                <button class="btn btn-primary" onclick="hodScript.saveRemark(${a.allocation_id})" style="flex: 2;">Save Remarks & Close</button>
                <button class="btn" style="background: var(--border); flex: 1;" onclick="document.getElementById('detailsModal').style.display='none'">Cancel</button>
            </div>
        `;
        document.getElementById('detailsModal').style.display = 'flex';
    },

    async saveRemark(id) {
        const remark = document.getElementById('hodRemarkInput').value.trim();
        const success = await DB.addHODRemark(id, remark);
        if (success) {
            alert('Remarks saved successfully!');
            document.getElementById('detailsModal').style.display = 'none';
            await this.renderHistory();
        } else {
            alert('Failed to save remarks.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => hodScript.init());
