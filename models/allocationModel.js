const db = require('../config/database');

const Allocation = {
  async getAll(dept = '', staff_id = '', limit = null) {
    let sql = `
      SELECT a.*, s.name as staffName, s.department as staffDept, s2.name as approvedByName
      FROM allocations a 
      LEFT JOIN staff s ON a.created_by = s.staff_id
      LEFT JOIN staff s2 ON a.approved_by = s2.staff_id
      WHERE 1=1
    `;
    let params = [];
    if (dept) {
      sql += " AND s.department = ?";
      params.push(dept);
    }
    if (staff_id) {
      sql += " AND a.created_by = ?";
      params.push(staff_id);
    }
    sql += " ORDER BY a.created_at DESC";
    if (limit) {
      sql += " LIMIT ?";
      params.push(parseInt(limit, 10));
    }
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async create(data) {
    const { exam_date, exam_time, exam_type, batch, rooms_json, faculties_json, created_by } = data;
    const [result] = await db.execute(
      "INSERT INTO allocations (exam_date, exam_time, exam_type, batch, rooms_json, faculties_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [exam_date, exam_time, exam_type, batch, rooms_json, faculties_json, created_by]
    );
    return result.insertId;
  },

  async updateStatus(id, status, remarks, approved_by = null) {
    const [result] = await db.execute(
      "UPDATE allocations SET status = ?, remarks = ?, approved_by = ? WHERE allocation_id = ?",
      [status, remarks, approved_by, id]
    );
    return result.affectedRows > 0;
  },

  async addHODRemark(id, remark) {
    const [result] = await db.execute(
      "UPDATE allocations SET hod_remark = ? WHERE allocation_id = ?",
      [remark, id]
    );
    return result.affectedRows > 0;
  },

  async clearHistory() {
    const [result] = await db.execute("DELETE FROM allocations");
    return result.affectedRows > 0;
  }
};

module.exports = Allocation;
