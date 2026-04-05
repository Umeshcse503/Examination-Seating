const db = require('../config/database');

const Room = {
  async getAll() {
    const [rows] = await db.execute("SELECT * FROM rooms");
    return rows;
  },

  async create(data) {
    const { room_name, building, total_rows, total_columns, capacity } = data;
    const [result] = await db.execute(
      "INSERT INTO rooms (room_name, building, total_rows, total_columns, capacity) VALUES (?, ?, ?, ?, ?)",
      [room_name, building, total_rows, total_columns, capacity]
    );
    return result.insertId;
  }
};

module.exports = Room;
