const db = require('../config/database');

const Student = {
  async getAll() {
    const [rows] = await db.execute("SELECT * FROM students");
    return rows;
  },

  async create(data) {
    const { roll_no, name, branch, year, section, email } = data;
    const [result] = await db.execute(
      "INSERT INTO students (roll_no, name, branch, year, section, email) VALUES (?, ?, ?, ?, ?, ?)",
      [roll_no, name, branch, year, section, email]
    );
    return result.insertId;
  },

  async bulkCreate(students) {
    const values = students.map(s => [s.roll_no, s.name, s.branch, s.year, s.section, s.email]);
    await db.query(
      "INSERT INTO students (roll_no, name, branch, year, section, email) VALUES ? ON DUPLICATE KEY UPDATE name=VALUES(name), branch=VALUES(branch), year=VALUES(year), section=VALUES(section), email=VALUES(email)",
      [values]
    );
  },

  async search(q, dept = '') {
    let sql = "SELECT * FROM students WHERE (name LIKE ? OR roll_no LIKE ?)";
    let params = [`%${q}%`, `%${q}%`];
    if (dept) {
      sql += " AND branch = ?";
      params.push(dept);
    }
    sql += " LIMIT 50";
    const [rows] = await db.execute(sql, params);
    return rows;
  }
};

module.exports = Student;
