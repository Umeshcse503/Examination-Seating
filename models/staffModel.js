const db = require('../config/database');

const Staff = {
  async findByCredentials(username, password) {
    const [rows] = await db.execute("SELECT * FROM staff WHERE username = ? AND password = ?", [username, password]);
    return rows[0];
  },

  async create(data) {
    const { name, email, username, password, department, role, status } = data;
    const [result] = await db.execute(
      "INSERT INTO staff (name, email, username, password, department, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [name, email, username, password, department, role, status]
    );
    return result.insertId;
  },

  async getAll(dept = '') {
    let sql = "SELECT staff_id, username, name, email, department, role, status, created_at FROM staff";
    let params = [];
    if (dept) {
      sql += " WHERE department = ?";
      params.push(dept);
    }
    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async updateStatus(id, status) {
    const [result] = await db.execute("UPDATE staff SET status = ? WHERE staff_id = ?", [status, id]);
    // Success if no DB error occurred. (affectedRows could be 0 if no change)
    return true;
  },

  async update(id, data) {
    const { name, email, department, role } = data;
    const [result] = await db.execute(
      "UPDATE staff SET name = ?, email = ?, department = ?, role = ? WHERE staff_id = ?",
      [name, email, department, role, id]
    );
    // Success if no DB error occurred.
    return true;
  },
  
  async delete(id) {
    const [result] = await db.execute("DELETE FROM staff WHERE staff_id = ?", [id]);
    return result.affectedRows > 0;
  }
};

module.exports = Staff;
