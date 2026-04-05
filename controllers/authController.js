const Staff = require('../models/staffModel');

const authController = {
  async login(req, res) {
    const { username, password } = req.body;
    try {
      const user = await Staff.findByCredentials(username, password);
      if (user) {
        if (user.status !== 'approved' && user.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Account pending approval.' });
        }
        res.json({ success: true, user });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async register(req, res) {
    const { name, email, username, password, department, role } = req.body;
    const status = (role === 'admin' || role === 'principal') ? 'approved' : 'pending';
    try {
      const staff_id = await Staff.create({ name, email, username, password, department, role, status });
      res.json({ success: true, staff_id });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
};

module.exports = authController;
