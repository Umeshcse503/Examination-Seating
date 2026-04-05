const db = require('../config/database');

const Allocation = {
  async getAll(dept = '') {
    let sql = `
      SELECT a.*, s.name as staffName, s.department as staffDept
      FROM allocations a 
      LEFT JOIN staff s ON a.created_by = s.staff_id
    `;
    let params = [];
    if (dept) {
      sql += " WHERE s.department = ?";
      params.push(dept);
    }
    sql += " ORDER BY a.created_at DESC";
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

  async updateStatus(id, status, remarks) {
    const [result] = await db.execute(
      "UPDATE allocations SET status = ?, remarks = ? WHERE allocation_id = ?",
      [status, remarks, id]
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
