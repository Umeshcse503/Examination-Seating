const staffScript = {
    currentUser: null,
    currentStep: 1,
    totalSteps: 4,
    
    // Form Data State
    state: {
        examDate: '',
        examTime: '',
        examType: '',
        branchSelections: {}, // format: { 'CSE': ['1st Year', '2nd Year'], 'ECE': ['1st Year'] }
        supplyStudents: [], // Array of supply roll numbers
        rooms: [],     // Array of { id, roomName, capacity, rows, cols }
        faculties: [],  // Array of { roomId, facultyName }
        allocations: [] // Fetched allocations for history
    },

    // Mock constants for UI
    branches: ['CSE', 'CSM', 'ECE', 'MECH', 'CIVIL'],
    years: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
    STUDENTS_PER_BATCH: 60, // Estimated count for UI

    // Update mock data for room grids with dimensions
    availableRooms: [],
    availableFaculty: [],

    async init() {
        this.currentUser = Auth.requireAuth(['staff']);
        if (!this.currentUser) return;
        
        setupHeader(this.currentUser);
        document.getElementById('headerUserRole').innerHTML = `Staff Dashboard: ${this.currentUser.name} – ${this.currentUser.department || 'General'}`;
        this.bindEvents();
        await this.loadData();
        await this.renderMyAllocations();
    },

    async loadData() {
        // Fetch real halls from DB
        const halls = await DB.getAllHalls();
        if (halls && halls.length > 0) {
            this.availableRooms = halls.map(h => ({
                roomName: h.room_name,
                capacity: h.capacity,
                rows: h.total_rows || 10,  // Fallback if DB has 0
                cols: h.total_columns || 6  // Fallback if DB has 0
            }));
        }
        // Fetch staff for faculty selection - prioritize own department
        const users = await DB.getUsers();
        if (users && users.length > 0) {
            const currentDept = this.currentUser.department;
            const sortedUsers = [...users].filter(u => u.role === 'staff').sort((a, b) => {
                if (a.department === currentDept && b.department !== currentDept) return -1;
                if (a.department !== currentDept && b.department === currentDept) return 1;
                return 0;
            });
            this.availableFaculty = sortedUsers.map(u => `${u.name} (${u.department || 'Staff'})`);
        }
    },

    async renderMyAllocations() {
        const user = Auth.getCurrentUser();
        const allocations = await DB.getAllocations();
        const myAllocations = allocations.filter(a => a.created_by == user.staff_id);
        const tbody = document.querySelector('#myAllocationsTable tbody');
        const mobileContainer = document.getElementById('mobileCardList');
        
        if (!tbody) return;
        tbody.innerHTML = '';
        if (mobileContainer) mobileContainer.innerHTML = '';

        if (myAllocations.length === 0) {
            const emptyMsg = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">You haven't generated any seating arrangements yet.</td></tr>`;
            tbody.innerHTML = emptyMsg;
            if(mobileContainer) mobileContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No seating arrangements yet.</div>`;
            return;
        }

        myAllocations.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).forEach(a => {
            const tr = document.createElement('tr');
            let statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(0,0,0,0.05);">${a.status}</span>`;
            if (a.status === 'approved') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(16,185,129,0.1); color: var(--success);">Approved</span>`;
            if (a.status === 'correction' || a.status === 'rejected') statusBadge = `<span style="padding: 0.25rem 0.5rem; border-radius: 99px; font-size: 0.75rem; font-weight: 600; background: rgba(239,68,68,0.1); color: var(--danger);">${a.status}</span>`;

            tr.innerHTML = `
                <td>${new Date(a.created_at).toLocaleDateString()}</td>
                <td><strong style="color: var(--primary);">${a.examType}</strong><br><small style="color: var(--text-muted);">at ${a.examTime}</small></td>
                <td>${a.batch}</td>
                <td>${a.rooms ? a.rooms.length : 0} Rooms</td>
                <td>${a.faculties ? a.faculties.length : 0} Faculty</td>
                <td>${statusBadge}</td>
            `;
            tbody.appendChild(tr);

            // Add to mobile card list
            if (mobileContainer) {
                const card = document.createElement('div');
                card.className = 'mobile-card animate-slide-up';
                card.innerHTML = `
                    <div class="mobile-card-header">
                        <div class="mobile-card-title">${a.examType}</div>
                        ${statusBadge}
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Date:</span>
                        <span class="mobile-card-value">${new Date(a.created_at).toLocaleDateString()}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Batch:</span>
                        <span class="mobile-card-value">${a.batch}</span>
                    </div>
                    <div class="mobile-card-row">
                        <span class="mobile-card-label">Rooms:</span>
                        <span class="mobile-card-value">${a.rooms ? a.rooms.length : 0} Halls</span>
                    </div>
                `;
                mobileContainer.appendChild(card);
            }
        });
    },

    bindEvents() {
        document.getElementById('navSchedule').addEventListener('click', (e) => {
             e.preventDefault();
             this.switchTab('schedule');
        });
        
        document.getElementById('navMyAllocations').addEventListener('click', (e) => {
             e.preventDefault();
             this.switchTab('myAllocations');
        });

        // Close auto-suggests
        document.addEventListener('click', (e) => {
            if(!e.target.closest('.input-wrapper')) {
                document.querySelectorAll('.suggestion-box').forEach(box => box.style.display = 'none');
            }
        });

        // Initialize Batch UI
        this.renderBatchUI();

        // Binding Exam Type buttons
        document.querySelectorAll('#examTypeContainer .year-tag').forEach(tag => {
             tag.addEventListener('click', () => {
                 document.querySelectorAll('#examTypeContainer .year-tag').forEach(t => t.classList.remove('selected'));
                 tag.classList.add('selected');
                 this.state.examType = tag.dataset.val;
                 
                 const supplyContainer = document.getElementById('supplyFileContainer');
                 if(this.state.examType === 'End Semester Examination') {
                     supplyContainer.style.display = 'block';
                 } else {
                     supplyContainer.style.display = 'none';
                     if(this.state.supplyStudents && this.state.supplyStudents.length > 0) {
                         this.state.supplyStudents = [];
                         document.getElementById('supplyFileInput').value = '';
                         document.getElementById('supplyFileStatus').innerHTML = 'For end-semester supply students. Optional.';
                         this.updateStudentCount();
                     }
                 }
             });
        });

        // Binding Time input (Phase 2 Revert)
        document.getElementById('examTime').addEventListener('change', (e) => {
            this.state.examTime = e.target.value;
        });

        document.getElementById('examDate').addEventListener('change', (e) => {
            this.state.examDate = e.target.value;
        });

        // Supply file upload logic
        const supplyInput = document.getElementById('supplyFileInput');
        if(supplyInput) {
            supplyInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                const statusEl = document.getElementById('supplyFileStatus');
                if (!file) {
                    this.state.supplyStudents = [];
                    statusEl.innerHTML = 'For end-semester supply students. Optional.';
                    this.updateStudentCount();
                    return;
                }

                statusEl.innerHTML = 'Processing Excel file...';
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = new Uint8Array(event.target.result);
                        const workbook = XLSX.read(data, {type: 'array'});
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const jsonData = XLSX.utils.sheet_to_json(firstSheet, {header: 1});
                        
                        let rolls = new Set();
                        // JNTU roll number pattern (10 chars, alphanumeric)
                        const rollRegex = /^[A-Z0-9]{10}$/i;
                        
                        jsonData.forEach(row => {
                            if(Array.isArray(row)) {
                                row.forEach(cell => {
                                    const str = String(cell).trim().toUpperCase();
                                    if(rollRegex.test(str)) {
                                        rolls.add(str);
                                    }
                                });
                            }
                        });
                        
                        this.state.supplyStudents = Array.from(rolls).sort();
                        statusEl.innerHTML = `<span style="color: var(--success); font-weight: 600;">✅ Found ${this.state.supplyStudents.length} supply student roll numbers.</span>`;
                        this.updateStudentCount();
                    } catch(err) {
                        console.error(err);
                        statusEl.innerHTML = `<span style="color: var(--danger);">❌ Error parsing Excel file. Please ensure it is valid.</span>`;
                        this.state.supplyStudents = [];
                        this.updateStudentCount();
                    }
                };
                reader.readAsArrayBuffer(file);
            });
        }
    },

    renderBatchUI() {
        const container = document.getElementById('batchSelectionContainer');
        container.innerHTML = '';

        this.branches.forEach(branch => {
            const section = document.createElement('div');
            section.className = 'batch-section';
            
            const headerContainer = document.createElement('div');
            headerContainer.className = 'flex items-center mb-4';
            headerContainer.style.gap = '1rem';
            
            const header = document.createElement('div');
            header.className = 'batch-header';
            header.style.marginBottom = '0';
            header.textContent = branch;
            
            // Checkbox for Select All
            const selectAllWrapper = document.createElement('label');
            selectAllWrapper.className = 'flex items-center';
            selectAllWrapper.style.cursor = 'pointer';
            selectAllWrapper.style.fontSize = '0.9rem';
            selectAllWrapper.style.color = 'var(--text-muted)';
            selectAllWrapper.style.fontWeight = '500';
            
            const selectAllCheck = document.createElement('input');
            selectAllCheck.type = 'checkbox';
            selectAllCheck.style.width = '16px';
            selectAllCheck.style.height = '16px';
            selectAllCheck.style.marginRight = '0.5rem';
            selectAllCheck.style.cursor = 'pointer';
            
            selectAllWrapper.appendChild(selectAllCheck);
            selectAllWrapper.appendChild(document.createTextNode('Select All'));
            
            headerContainer.appendChild(header);
            headerContainer.appendChild(selectAllWrapper);
            
            const btnGroup = document.createElement('div');
            btnGroup.className = 'year-btn-group';
            
            // Reusable logic to sync UI with state
            const syncButtons = () => {
                const selectedYears = this.state.branchSelections[branch] || [];
                Array.from(btnGroup.children).forEach(btn => {
                    if (selectedYears.includes(btn.dataset.year)) {
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                    }
                });
                
                // Update checkbox state
                selectAllCheck.checked = selectedYears.length === this.years.length;
                this.updateStudentCount();
            };
            
            selectAllCheck.addEventListener('change', (e) => {
                const isChecked = e.target.checked;
                if (isChecked) {
                    this.state.branchSelections[branch] = [...this.years];
                } else {
                    delete this.state.branchSelections[branch];
                }
                syncButtons();
            });

            this.years.forEach(year => {
                const btn = document.createElement('div');
                btn.className = 'year-tag';
                btn.textContent = year;
                btn.dataset.branch = branch;
                btn.dataset.year = year;
                
                // Click handler for multi-selection per branch
                btn.addEventListener('click', () => {
                     const isCurrentlySelected = btn.classList.contains('selected');
                     
                     if (!this.state.branchSelections[branch]) {
                         this.state.branchSelections[branch] = [];
                     }

                     if (isCurrentlySelected) {
                         // Toggle off
                         this.state.branchSelections[branch] = this.state.branchSelections[branch].filter(y => y !== year);
                         if (this.state.branchSelections[branch].length === 0) {
                             delete this.state.branchSelections[branch];
                         }
                     } else {
                         // Toggle on
                         this.state.branchSelections[branch].push(year);
                     }
                     
                     syncButtons();
                });
                
                btnGroup.appendChild(btn);
            });
            
            section.appendChild(headerContainer);
            section.appendChild(btnGroup);
            container.appendChild(section);
            
            // Initialization Sync
            syncButtons();
        });
    },

    updateStudentCount() {
         document.getElementById('selectedStudentCount').textContent = this.getTotalStudents();
    },

    switchTab(tab) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.getElementById(`nav${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');

        document.getElementById('scheduleSection').style.display = tab === 'schedule' ? 'block' : 'none';
        document.getElementById('myAllocationsSection').style.display = tab === 'myAllocations' ? 'block' : 'none';
        
        if (tab === 'myAllocations') {
            this.renderMyAllocations();
        }
    },

    /* --- STEP NAVIGATION --- */

    nextStep(toStep) {
        if(!this.validateStep(this.currentStep)) return;

        const currentEl = document.getElementById(`step${this.currentStep}`);
        const nextEl = document.getElementById(`step${toStep}`);
        
        // Transition Out Left
        currentEl.classList.remove('active');
        currentEl.classList.add('exit-left');

        setTimeout(() => {
            currentEl.classList.remove('exit-left');
            // Before transitioning in, prepare the next step DOM
            this.prepareStep(toStep);
            
            // Transition In Right
            nextEl.classList.add('active');
            
            this.updateIndicators(toStep);
            this.currentStep = toStep;
        }, 300); // Wait for half animation
    },

    prevStep(toStep) {
        const currentEl = document.getElementById(`step${this.currentStep}`);
        const nextEl = document.getElementById(`step${toStep}`);
        
        // Transition Out Right
        currentEl.classList.remove('active');
        currentEl.classList.add('exit-right');

        setTimeout(() => {
            currentEl.classList.remove('exit-right');
            // Transition In Left
            nextEl.classList.add('active');
            
            this.updateIndicators(toStep);
            this.currentStep = toStep;
        }, 300);
    },

    updateIndicators(step) {
        for(let i=1; i<=this.totalSteps; i++) {
            const ind = document.getElementById(`ind-${i}`);
            ind.classList.remove('active', 'completed');
            if(i < step) ind.classList.add('completed');
            if(i === step) ind.classList.add('active');
        }
    },

    validateStep(step) {
        if(step === 1) {
            this.state.examDate = document.getElementById('examDate').value;
            this.state.examTime = document.getElementById('examTime').value;

            if (!this.state.examDate) {
                alert('Please select an Exam Date.');
                return false;
            }
            if (!this.state.examTime) {
                alert('Please select an Exam Time.');
                return false;
            }
            if (Object.keys(this.state.branchSelections).length === 0) {
                alert('Please select at least one batch/year target.');
                return false;
            }
            if(!this.state.examType) { 
                alert('Please select an Examination Type.'); 
                return false; 
            }
            return true;
        }

        if(step === 2) {
            let totalCap = 0;
            this.state.rooms.forEach(r => totalCap += r.capacity);
            const totalStudents = this.getTotalStudents();
            
            if(this.state.rooms.length === 0) {
                alert('Please select at least one Room from the grid.');
                return false;
            }
            if(totalCap < totalStudents) {
                alert(`Insufficient Capacity! Selected rooms hold ${totalCap} students, but you need space for ${totalStudents}. Please select more rooms.`);
                return false;
            }
            return true;
        }

        if(step === 3) {
             // Calculate total selected students
             let totalBatches = 0;
             for (const branch in this.state.branchSelections) {
                 totalBatches += this.state.branchSelections[branch].length;
             }
             const totalStudents = totalBatches * this.STUDENTS_PER_BATCH;
             const requiredFaculty = Math.ceil(totalStudents / 30); // 1 staff per 30 students

             if(this.state.faculties.length !== requiredFaculty) { 
                 alert(`Invalid Faculty Ratio: You have ${totalStudents} total students. You MUST assign exactly ${requiredFaculty} invigilator(s) from the grid (1 per 30 students). You have currently assigned ${this.state.faculties.length}.`); 
                 return false; 
             }
             return true;
        }

        return true;
    },

    getTotalStudents() {
         let totalBatches = 0;
         for (const branch in this.state.branchSelections) {
             totalBatches += this.state.branchSelections[branch].length;
         }
         const regularStudents = totalBatches * this.STUDENTS_PER_BATCH;
         const supplyStudentsCount = this.state.supplyStudents ? this.state.supplyStudents.length : 0;
         return regularStudents + supplyStudentsCount;
    },

    prepareStep(step) {
        if(step === 2) {
            this.renderRoomFields();
        }

        if(step === 3) {
            this.renderFacultyFields();
        }

        if(step === 4) {
            this.renderPreview();
        }
    },

    /* --- STEP 2: ROOMS --- */

    renderRoomFields(searchTerm = '') {
        const container = document.getElementById('roomSelectionGrid');
        container.innerHTML = '';
        
        const totalStudents = this.getTotalStudents();
        document.getElementById('requiredRoomCapacity').textContent = totalStudents;
        
        const updateRoomCapacityVisual = () => {
             let totalCap = 0;
             this.state.rooms.forEach(r => totalCap += r.capacity);
             const capEl = document.getElementById('selectedRoomCapacity');
             capEl.textContent = totalCap;
             if(totalCap >= totalStudents) {
                 capEl.style.color = 'var(--success)';
             } else {
                 capEl.style.color = 'var(--primary)';
             }
        };

        const tempSelectedRooms = this.state.rooms.map(r => r.roomName);
        
        let filteredRooms = this.availableRooms;
        if(searchTerm.trim() !== '') {
             filteredRooms = this.availableRooms.filter(r => r.roomName.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        filteredRooms.forEach((roomObj, index) => {
            const isSelected = tempSelectedRooms.includes(roomObj.roomName);
            const btn = document.createElement('div');
            btn.className = `year-tag ${isSelected ? 'selected' : ''}`;
            btn.style.textAlign = 'center';
            btn.style.padding = '1rem';
            btn.innerHTML = `<strong>${roomObj.roomName}</strong><br><span style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">Capacity: ${roomObj.capacity}</span>`;

            btn.addEventListener('click', () => {
                const currentlySelected = btn.classList.contains('selected');
                
                if (currentlySelected) {
                    btn.classList.remove('selected');
                    this.state.rooms = this.state.rooms.filter(r => r.roomName !== roomObj.roomName);
                } else {
                    btn.classList.add('selected');
                    this.state.rooms.push({
                        id: `room_${roomObj.roomName.replace(/\s+/g, '')}`,
                        roomName: roomObj.roomName,
                        capacity: roomObj.capacity,
                        rows: roomObj.rows,
                        cols: roomObj.cols
                    });
                }
                updateRoomCapacityVisual();
            });

            container.appendChild(btn);
        });
        
        updateRoomCapacityVisual();
    },

    autoSelectRooms() {
        // Clear current room selection
        this.state.rooms = [];
        const totalStudents = this.getTotalStudents();
        let currentCap = 0;
        
        // Greedily pick from availableRooms until capacity met
        for (const roomObj of this.availableRooms) {
            if (currentCap >= totalStudents) break;
            
            this.state.rooms.push({
                id: `room_${roomObj.roomName.replace(/\s+/g, '')}`,
                roomName: roomObj.roomName,
                capacity: roomObj.capacity,
                rows: roomObj.rows,
                cols: roomObj.cols
            });
            currentCap += roomObj.capacity;
        }

        // Re-render field visual selections explicitly
        this.renderRoomFields(document.getElementById('roomSearchInput') ? document.getElementById('roomSearchInput').value : '');
    },

    /* --- STEP 3: FACULTY --- */

    renderFacultyFields(searchTerm = '') {
         const container = document.getElementById('facultySelectionGrid');
         container.innerHTML = '';
         
         // Update counter
         const reqCounter = document.getElementById('requiredFacultyCount');
         const selCounter = document.getElementById('selectedFacultyCount');
         
         const totalStudents = this.getTotalStudents();
         const requiredFaculty = Math.ceil(totalStudents / 30);
         
         reqCounter.textContent = requiredFaculty;
         
         const updateCounter = () => {
              selCounter.textContent = this.state.faculties.length;
              if (this.state.faculties.length === requiredFaculty) {
                  selCounter.style.color = 'var(--success)';
              } else {
                  selCounter.style.color = 'var(--primary)';
              }
         };

         const tempSelectedFaculty = this.state.faculties.map(f => f.facultyName);
         
         let filteredFaculty = this.availableFaculty;
         if(searchTerm.trim() !== '') {
             filteredFaculty = this.availableFaculty.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
         }

         filteredFaculty.forEach((facultyName, index) => {
             const isSelected = tempSelectedFaculty.includes(facultyName);
             const btn = document.createElement('div');
             btn.className = `year-tag ${isSelected ? 'selected' : ''}`;
             btn.style.textAlign = 'center';
             btn.style.padding = '1rem';
             btn.textContent = facultyName;

             btn.addEventListener('click', () => {
                 const currentlySelected = btn.classList.contains('selected');
                 
                 if (currentlySelected) {
                     btn.classList.remove('selected');
                     this.state.faculties = this.state.faculties.filter(f => f.facultyName !== facultyName);
                 } else {
                     // Allow selection up to required limit
                     if (this.state.faculties.length >= requiredFaculty) {
                          alert(`You only need ${requiredFaculty} invigilators. Unselect someone first.`);
                          return;
                     }
                     
                     btn.classList.add('selected');
                     // Assign sequentially to rooms or just randomly pool them for Step 4
                     // We will pool them using a generic ID since rooms are decoupled in selection
                     this.state.faculties.push({
                         roomId: `pool_${index}`, // Dummy id for now, Step 4 will assign
                         facultyName: facultyName
                     });
                 }
                 updateCounter();
             });

             container.appendChild(btn);
         });
         
         updateCounter();
    },

    autoSelectFaculty() {
        // Clear current faculty selection
        this.state.faculties = [];
        const requiredFaculty = Math.ceil(this.getTotalStudents() / 30);
        
        // Greedily select the required exact number from top-down
        for (let i = 0; i < requiredFaculty && i < this.availableFaculty.length; i++) {
             this.state.faculties.push({
                 roomId: `pool_${i}`,
                 facultyName: this.availableFaculty[i]
             });
        }

        this.renderFacultyFields(document.getElementById('facultySearchInput') ? document.getElementById('facultySearchInput').value : '');
    },

    /* --- STEP 4: PREVIEW & SUBMIT --- */

    generateRollNumbers() {
        // Updated exact JNTU branch codes
        const branchCodes = { 'CSE': '05', 'CSM': '66', 'ECE': '04', 'MECH': '03', 'CIVIL': '01' };
        const yearPrefixes = { '1st Year': '25XW1A', '2nd Year': '24XW1A', '3rd Year': '23XW1A', '4th Year': '22XW1A' };
        
        let poolByBatch = [];
        
        for (const branch in this.state.branchSelections) {
            const bCode = branchCodes[branch];
            this.state.branchSelections[branch].forEach(year => {
                const yPrefix = yearPrefixes[year];
                let batchRolls = [];
                for (let i = 1; i <= this.STUDENTS_PER_BATCH; i++) {
                    const num = i.toString().padStart(2, '0');
                    batchRolls.push(`${yPrefix}${bCode}${num}`);
                }
                poolByBatch.push({
                    id: `${branch}-${year}`,
                    branch: branch,
                    rolls: batchRolls
                });
            });
        }
        
        // Group by branch alphabetically so years from the same branch are naturally queued together
        poolByBatch.sort((a, b) => a.branch.localeCompare(b.branch));
        
        // Append Supply Students as their own batch if they exist
        if(this.state.supplyStudents && this.state.supplyStudents.length > 0) {
            poolByBatch.push({
                id: 'Supply-Students',
                branch: 'Supply',
                rolls: [...this.state.supplyStudents]
            });
        }
        
        return poolByBatch;
    },

    renderPreview() {
        const container = document.getElementById('previewSummaryContainer');
        const rollPoolByBatch = this.generateRollNumbers();
        
        // Alternating allocation logic pointer tracking
        let activeA = null;
        let activeB = null;

        const getNextRoll = (toggleIndex) => {
            // Refill A if empty, finding next available different from B
            if (!activeA || activeA.rolls.length === 0) {
                activeA = rollPoolByBatch.find(p => p.rolls.length > 0 && p !== activeB);
            }
            // Refill B if empty, finding next available different from A
            if (!activeB || activeB.rolls.length === 0) {
                activeB = rollPoolByBatch.find(p => p.rolls.length > 0 && p !== activeA);
            }

            // Decide which one to pick based on the alternating board toggle
            let targetGroup = toggleIndex === 0 ? activeA : activeB;
            
            // If the strict structural toggle is empty, just fallback to whatever has students left
            if (!targetGroup || targetGroup.rolls.length === 0) {
                targetGroup = (toggleIndex === 0 ? activeB : activeA);
            }

            // Extract seat if we found a valid group
            if (targetGroup && targetGroup.rolls.length > 0) {
                const roll = targetGroup.rolls.shift();
                return { roll, batchId: targetGroup.id };
            }
            return null; // All selected students exhausted
        };

        let finalRoomData = [];
        
        this.state.rooms.forEach((r, idx) => {
             const rows = parseInt(r.rows) || 10;
             const cols = parseInt(r.cols) || 6;
             const capacity = rows * cols;
             
             // Create a 2D array representation
             let grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
             let totalAllocatedInThisRoom = 0;
             
             // Vertical Seating Filling (Column-Major) - Corrected Phase 2
             for (let col = 0; col < cols; col++) {
                 for (let row = 0; row < rows; row++) {
                     // Alternates cleanly horizontally and vertically
                     let toggle = (row + col) % 2;
                     
                     let seat = getNextRoll(toggle);
                     if (seat) {
                         grid[row][col] = seat;
                         totalAllocatedInThisRoom++;
                     }
                 }
             }
             
             // Flatten the grid back into a 1D array for rendering if needed, though 2D is better for HTML generation
             // We'll pass the 2D grid string directly
             const fac = this.state.faculties[idx];
             
             finalRoomData.push({
                  ...r,
                  grid2D: grid,
                  allocatedCount: totalAllocatedInThisRoom,
                  capacity: capacity,
                  faculty: fac ? fac.facultyName : 'Pending Assignment'
             });
        });

        this.finalSubmitData = finalRoomData;

        let targetBatchObjStr = Object.entries(this.state.branchSelections).map(([b, years]) => `${b} (${years.join(', ')})`).join('; ');
        let totalStudentsCount = this.getTotalStudents();

        // Render interactive rooms natively from the 2D grid structure
        let roomsHtml = finalRoomData.map((r, i) => {
            let gridHtml = '';
            const rows = r.rows;
            const cols = r.cols;
            
            for(let row=0; row<rows; row++) {
                 gridHtml += `<div style="display: flex; gap: 0.5rem; justify-content: center; margin-bottom: 0.5rem;">`;
                 for(let col=0; col<cols; col++) {
                     const seatData = r.grid2D[row][col];
                     if(seatData) {
                         // Distinct color block based on batch ID string hash length to visually separate them
                         const hue = Array.from(seatData.batchId).reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
                         const bgColor = `hsl(${hue}, 70%, 96%)`;
                         const borderColor = `hsl(${hue}, 70%, 50%)`;
                         
                         gridHtml += `<div title="${seatData.batchId}" style="padding: 0.5rem; border: 1px solid ${borderColor}; border-radius: 6px; background: ${bgColor}; font-family: monospace; font-size: 0.8rem; min-width: 90px; text-align: center; color: var(--text-main); font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">${seatData.roll}</div>`;
                     } else {
                         // Empty seat
                         gridHtml += `<div style="padding: 0.5rem; border: 1px dashed var(--border); border-radius: 6px; background: rgba(0,0,0,0.02); min-width: 90px; text-align: center; opacity: 0.5;">Empty</div>`;
                     }
                 }
                 gridHtml += `</div>`;
            }

            return `
                <div class="room-preview-card" style="display: ${i === 0 ? 'block' : 'none'};" id="previewRoom_${i}">
                    <div style="background: rgba(30,58,138,0.05); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid var(--primary);">
                        <div class="flex justify-between items-center mb-4">
                            <strong style="color: var(--text-main); font-size: 1.2rem;">${r.roomName} <span style="font-weight: 500; color: var(--text-muted); font-size: 0.9rem;">(${r.rows}x${r.cols} Grid)</span></strong>
                            <span style="color: var(--primary); font-weight: 600; background: white; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.9rem;">Invigilator: ${r.faculty}</span>
                        </div>
                        <div style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem;">
                            Assigned ${r.allocatedCount} students (Capacity: ${r.capacity}).
                        </div>
                        
                        <div style="background: rgba(255,255,255,0.5); padding: 1rem; border-radius: 12px; overflow-x: auto;">
                             ${gridHtml || '<div style="text-align: center; color: var(--text-muted); padding: 2rem;">No students allocated to this room due to capacity limits.</div>'}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Room Navigation Controls
        let navControls = '';
        if(finalRoomData.length > 1) {
            navControls = `
                <div class="flex justify-between items-center" style="margin-bottom: 2rem; background: white; padding: 0.5rem; border-radius: 999px; box-shadow: var(--shadow-sm); border: 1px solid var(--border);">
                    <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="staffScript.switchPreviewRoom(-1)">Previous Room</button>
                    <span style="font-weight: 600; color: var(--text-muted);" id="previewRoomCounter">Room 1 of ${finalRoomData.length}</span>
                    <button class="btn btn-secondary" style="border-radius: 999px; padding: 0.5rem 1.5rem;" onclick="staffScript.switchPreviewRoom(1)">Next Room</button>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="summary-row">
                <span class="summary-label">Exam Date:</span>
                <span class="summary-value">${this.state.examDate}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Exam Type:</span>
                <span class="summary-value">${this.state.examType}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Target Batches:</span>
                <span class="summary-value" style="font-size: 0.9rem;">${targetBatchObjStr}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Total Students:</span>
                <span class="summary-value">${totalStudentsCount}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Invigilators:</span>
                <span class="summary-value" style="font-size: 0.9rem;">${this.state.faculties.map(f => f.facultyName).join(', ')}</span>
            </div>
            <div class="summary-row flex-col" style="align-items: stretch; border-bottom: none; padding-bottom: 0; padding-top: 2rem;">
                <span class="summary-label" style="margin-bottom: 1.5rem; font-size: 1.1rem; color: var(--text-main);">Visual Seating Grid:</span>
                ${navControls}
                <div style="width: 100%;" id="visualGridContainer">
                    ${roomsHtml}
                </div>
            </div>
        `;
        
        this.currentPreviewRoomIndex = 0;
        this.totalPreviewRooms = finalRoomData.length;
    },

    switchPreviewRoom(dir) {
         const newIndex = this.currentPreviewRoomIndex + dir;
         if (newIndex >= 0 && newIndex < this.totalPreviewRooms) {
              document.getElementById(`previewRoom_${this.currentPreviewRoomIndex}`).style.display = 'none';
              document.getElementById(`previewRoom_${newIndex}`).style.display = 'block';
              this.currentPreviewRoomIndex = newIndex;
              document.getElementById('previewRoomCounter').textContent = `Room ${newIndex + 1} of ${this.totalPreviewRooms}`;
         }
    },

    async submitAllocation() {
        const targetBatchObjStr = Object.entries(this.state.branchSelections).map(([b, yrs]) => `${b} (${yrs.join(', ')})`).join('; ');
        
        const data = {
            examDate: this.state.examDate,
            examTime: this.state.examTime,
            examType: this.state.examType,
            batch: targetBatchObjStr,
            rooms: this.finalSubmitData, // Saves the full 2D grid matrix down to the database
            faculties: this.state.faculties, // Save explicitly selected faculty list
            created_by: this.currentUser.staff_id,
            timestamp: new Date().toISOString(),
            status: 'pending'
        };

        // Ensure robust saving
        try {
            const result = await DB.saveAllocation(data);
            if (!result) throw new Error('Failed to save');
            
            // Non-blocking toast notification instead of native alert
            const toast = document.createElement('div');
            toast.textContent = 'Allocation request & 2D Seat Matrices submitted successfully to Principal!';
            toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: var(--success, #10B981); color: white; padding: 1rem 1.5rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-weight: 500; transition: opacity 0.3s;';
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);

            // Fetch latest allocations
            await this.renderMyAllocations();
            
            // --- STATE RESET LOGIC ---
            // Clear the internal state entirely
            this.state = {
                examDate: '',
                examType: '',
                branchSelections: {},
                supplyStudents: [],
                rooms: [],
                faculties: []
            };
            this.finalSubmitData = [];
            
            // Reset Steps
            this.currentStep = 1;
            document.querySelectorAll('.step').forEach(s => s.classList.remove('active', 'exit-left', 'exit-right'));
            document.getElementById('step1').classList.add('active');
            this.updateIndicators(1);
            
            // Clear inputs
            document.getElementById('examDate').value = '';
            document.getElementById('examTime').value = '';
            const supplyInput = document.getElementById('supplyFileInput');
            if(supplyInput) supplyInput.value = '';
            const supplyStatus = document.getElementById('supplyFileStatus');
            if(supplyStatus) supplyStatus.innerHTML = 'For end-semester supply students. Optional.';
            const supplyContainer = document.getElementById('supplyFileContainer');
            if(supplyContainer) supplyContainer.style.display = 'none';
            
            // Re-render Batch UI to clear selections visually
            this.renderBatchUI();
            
            // Deselect any Exam Types
            document.querySelectorAll('#examTypeContainer .year-tag').forEach(t => t.classList.remove('selected'));
            
            // Reset dynamic counters to 0
            const selectedCount = document.getElementById('selectedStudentCount');
            if(selectedCount) selectedCount.textContent = '0';
            const roomCounter = document.getElementById('selectedRoomCapacity');
            if(roomCounter) { roomCounter.textContent = '0'; roomCounter.style.color = 'var(--text-muted)'; }
            const facultyCounter = document.getElementById('selectedFacultyCount');
            if(facultyCounter) { facultyCounter.textContent = '0'; facultyCounter.style.color = 'var(--text-muted)'; }
            
            // Go to History Tab automatically
            await this.renderMyAllocations();
            this.switchTab('myAllocations');
            
        } catch(e) {
            console.error('Save error:', e);
            alert('Error saving allocation: ' + e.message);
        }
    },

    /* --- HISTORY --- */

    async renderMyAllocations() {
        this.state.allocations = await DB.getAllocations();
        const allocations = this.state.allocations.filter(a => a.created_by === this.currentUser.staff_id);
        const tbody = document.querySelector('#myAllocationsTable tbody');
        tbody.innerHTML = '';

        if(allocations.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">No allocations submitted yet. Float on over to 'Schedule Exam' to start!</td></tr>`;
            return;
        }

        allocations.reverse().forEach(a => {
             const tr = document.createElement('tr');
             
             let statusBadge = '';
             if(a.status === 'approved') statusBadge = `<span style="background: rgba(16,185,129,0.1); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 999px;">Approved</span>`;
             else if(a.status === 'rejected') statusBadge = `<span style="background: rgba(239,68,68,0.1); color: var(--danger); padding: 0.25rem 0.75rem; border-radius: 999px;">Rejected</span>`;
             else statusBadge = `<span style="background: rgba(217,119,6,0.1); color: var(--secondary); padding: 0.25rem 0.75rem; border-radius: 999px;">Pending</span>`;

             // Compatibility with old data structure if needed, or format new one
             let roomsText = a.room || (a.rooms ? `${a.rooms.length} Rooms` : '-');
             let facultyText = a.faculty || (a.faculties ? `${a.faculties.length} Staff` : '-');
             
             if(a.rooms && a.rooms.length > 0) {
                 roomsText = `<span title="${a.rooms.map(r=>r.roomName).join(', ')}"><b>${a.rooms.length} Rooms</b><br><span style="font-size: 0.7rem; color: #888;">(Hover to view)</span></span>`;
             }

             let actionsCell = "";
             if (a.status === 'approved') {
                 actionsCell = `<button class="btn btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background: var(--success); border-color: var(--success);" onclick="ExportUtils.exportToExcel(staffScript.state.allocations.find(allc => allc.id === '${a.id}'))">⬇️ Download Excel</button>`;
             }

             tr.innerHTML = `
                 <td>${a.created_at ? new Date(a.created_at).toLocaleDateString() : 'N/A'}</td>
                 <td style="font-weight: 600;">${a.exam_type || a.examType || 'N/A'} (at ${a.examTime || '-'})</td>
                 <td>${a.batch || 'N/A'}</td>
                 <td>${roomsText}</td>
                 <td>${facultyText}</td>
                 <td>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
                        ${statusBadge}
                        ${actionsCell}
                    </div>
                 </td>
             `;
             tbody.appendChild(tr);
         });
    }
};

document.addEventListener('DOMContentLoaded', () => {
    staffScript.init();
});
