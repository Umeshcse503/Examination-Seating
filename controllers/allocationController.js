const Allocation = require('../models/allocationModel');
const db = require('../config/database');

const allocationController = {
  async getAll(req, res) {
    const { dept = '' } = req.query;
    try {
      const rows = await Allocation.getAll(dept);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    const { exam_date, exam_time, exam_type, batch, rooms, faculties, created_by } = req.body;
    try {
      const allocation_id = await Allocation.create({
        exam_date,
        exam_time,
        exam_type,
        batch,
        rooms_json: JSON.stringify(rooms),
        faculties_json: JSON.stringify(faculties),
        created_by
      });
      res.json({ success: true, allocation_id });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async updateStatus(req, res) {
    const { status, remarks } = req.body;
    try {
      const success = await Allocation.updateStatus(req.params.id, status, remarks);
      res.json({ success });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async addHODRemark(req, res) {
    const { remark } = req.body;
    try {
      const success = await Allocation.addHODRemark(req.params.id, remark);
      res.json({ success });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async clearHistory(req, res) {
    try {
      const success = await Allocation.clearHistory();
      res.json({ success });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getHODStats(req, res) {
    const { dept = '' } = req.query;
    try {
      // Direct raw query for stats for simplicity, or move to models if complex
      let pendingSql = "SELECT COUNT(*) as pendingApprovals FROM allocations WHERE status = 'pending'";
      let studentsSql = "SELECT COUNT(*) as totalStudents FROM students";
      let staffSql = "SELECT COUNT(*) as totalStaff FROM staff WHERE role = 'staff'";
      let totalExamsSql = "SELECT COUNT(*) as totalExams FROM allocations WHERE status = 'approved'";

      let pendingParams = [], studentsParams = [], staffParams = [], totalParams = [];
      if (dept) {
        pendingSql += " AND created_by IN (SELECT staff_id FROM staff WHERE department = ?)";
        pendingParams.push(dept);
        studentsSql += " WHERE branch = ?";
        studentsParams.push(dept);
        staffSql += " AND department = ?";
        staffParams.push(dept);
        totalExamsSql += " AND created_by IN (SELECT staff_id FROM staff WHERE department = ?)";
        totalParams.push(dept);
      }

      const [[{pendingApprovals}]] = await db.execute(pendingSql, pendingParams);
      const [[{totalStudents}]] = await db.execute(studentsSql, studentsParams);
      const [[{totalStaff}]] = await db.execute(staffSql, staffParams);
      const [[{totalExams}]] = await db.execute(totalExamsSql, totalParams);

      res.json({ totalExams, pendingApprovals, totalStudents, totalStaff });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
};

module.exports = allocationController;
