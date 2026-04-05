// Mock Database using localStorage
const API_URL = '/api';

const DB = {
  // Initialize - checks for backend connectivity
  async init() {
    try {
      const response = await fetch(`${API_URL}/students`);
      if (response.ok) {
        console.log('Connected to backend database.');
      }
    } catch (error) {
      console.warn('Backend not reachable, check if server.js is running.');
    }
  },

  async getUsers() {
    try {
      const response = await fetch(`${API_URL}/staff`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  async getLogs() {
    try {
      const response = await fetch(`${API_URL}/logs`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  },

  async getAllHalls() {
    try {
      const response = await fetch(`${API_URL}/halls`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching halls:', error);
      return [];
    }
  },

  async getAllocations(dept = '') {
    try {
      const url = dept ? `${API_URL}/allocations?dept=${encodeURIComponent(dept)}` : `${API_URL}/allocations`;
      const response = await fetch(url);
      const data = await response.json();
      // Map allocation_id to id and parse rooms_json for frontend compatibility
      return data.map(a => ({
        ...a,
        id: a.allocation_id.toString(),
        rooms: typeof a.rooms_json === 'string' ? JSON.parse(a.rooms_json) : a.rooms_json,
        examDate: a.exam_date,
        examTime: a.exam_time,
        examType: a.exam_type,
        faculties: typeof a.faculties_json === 'string' ? JSON.parse(a.faculties_json) : a.faculties_json,
        hodRemark: a.hod_remark,
        principalRemarks: a.remarks
      }));
    } catch (error) {
      console.error('Error fetching allocations:', error);
      return [];
    }
  },

  async saveAllocation(allocation) {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      const response = await fetch(`${API_URL}/allocations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exam_date: allocation.examDate,
          exam_time: allocation.examTime,
          exam_type: allocation.examType,
          batch: allocation.batch,
          rooms: allocation.rooms,
          faculties: allocation.faculties,
          created_by: user ? user.staff_id : null
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Server error');
      return { ...allocation, id: result.allocation_id.toString() };
    } catch (error) {
      console.error('Error saving allocation:', error);
      throw error; // Let the caller handle the specific error
    }
  },

  async updateAllocationStatus(id, status, remarks) {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser'));
      const response = await fetch(`${API_URL}/allocations/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks, principalId: user ? user.staff_id : null })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating allocation status:', error);
      return false;
    }
  },
  async addHODRemark(id, remark) {
    try {
      const response = await fetch(`${API_URL}/allocations/${id}/hod-remark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error adding HOD remark:', error);
      return false;
    }
  },

  async clearAllocationHistory() {
    try {
      const response = await fetch(`${API_URL}/allocations/clear-history`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error clearing allocation history:', error);
      return false;
    }
  },

  async addUser(username, password, role, name = '', email = '', department = '') {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name || username, email: email || `${username}@system.local`, username, password, role, department })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error adding user:', error);
      return false;
    }
  },

  async updateUserStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/staff/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error updating user status:', error);
      return false;
    }
  },
  
  async updateUser(id, userData) {
    try {
      const response = await fetch(`${API_URL}/staff/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return await response.json();
    } catch (error) {
      console.error('Network error during updateUser:', error);
      return { success: false, error: 'Network connection failed: ' + error.message };
    }
  },

  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server connection failed' };
    }
  },

  async addStudent(studentData) {
    try {
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error adding student:', error);
      return { success: false };
    }
  },



  async createRoom(roomData) {
    try {
      const response = await fetch(`${API_URL}/halls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating room:', error);
      return { success: false };
    }
  },

  async deleteUser(id) {
    try {
      const response = await fetch(`${API_URL}/staff/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  },

  async logAction(action, performedBy) {
    try {
      await fetch(`${API_URL}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, performed_by: performedBy })
      });
    } catch (error) {
      console.error('Log error:', error);
    }
  },

  async getHODStats(dept = '') {
    try {
      const url = dept ? `${API_URL}/hod/stats?dept=${encodeURIComponent(dept)}` : `${API_URL}/hod/stats`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error fetching HOD stats:', error);
      return { totalExams: 0, pendingApprovals: 0, totalStudents: 0, totalStaff: 0 };
    }
  },

  async searchStudents(q, dept = '') {
    try {
      let url = `${API_URL}/students/search?q=${encodeURIComponent(q)}`;
      if (dept) url += `&dept=${encodeURIComponent(dept)}`;
      const response = await fetch(url);
      return await response.json();
    } catch (error) {
      console.error('Error searching students:', error);
      return [];
    }
  },

  async bulkSaveStudents(students) {
    try {
      const response = await fetch(`${API_URL}/students/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students })
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error bulk saving students:', error);
      return false;
    }
  },

  async saveFeedback(feedbackData) {
    try {
      const response = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedbackData)
      });
      return await response.json();
    } catch (error) {
      console.error('Error saving feedback:', error);
      return { success: false };
    }
  }
};

// Initialize DB on script load
DB.init();
