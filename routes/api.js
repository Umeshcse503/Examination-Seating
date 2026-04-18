const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const allocationController = require('../controllers/allocationController');
const Student = require('../models/studentModel');
const Staff = require('../models/staffModel');
const Room = require('../models/roomModel');
const db = require('../config/database');

// Auth
router.post('/login', authController.login);
router.post('/register', authController.register);

// Students
router.get('/students', async (req, res) => {
  try { res.json(await Student.getAll()); } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/students', async (req, res) => {
  try { res.json({ success: true, student_id: await Student.create(req.body) }); } catch (err) { res.status(400).json({ error: err.message }); }
});
router.post('/students/bulk', async (req, res) => {
  try { await Student.bulkCreate(req.body.students); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); }
});
router.get('/students/search', async (req, res) => {
  try { res.json(await Student.search(req.query.q, req.query.dept)); } catch (err) { res.status(500).json({ error: err.message }); }
});

// Rooms
router.get('/halls', async (req, res) => {
  try { res.json(await Room.getAll()); } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/halls', async (req, res) => {
  try { res.json({ success: true, room_id: await Room.create(req.body) }); } catch (err) { res.status(400).json({ error: err.message }); }
});

// Staff
router.get('/staff', async (req, res) => {
  try { res.json(await Staff.getAll(req.query.dept)); } catch (err) { res.status(500).json({ error: err.message }); }
});
router.patch('/staff/:id/status', async (req, res) => {
  try { res.json({ success: await Staff.updateStatus(req.params.id, req.body.status) }); } catch (err) { res.status(400).json({ error: err.message }); }
});
router.put('/staff/:id', async (req, res) => {
  try { res.json({ success: await Staff.update(req.params.id, req.body) }); } catch (err) { res.status(400).json({ error: err.message }); }
});
router.delete('/staff/:id', async (req, res) => {
  try { res.json({ success: await Staff.delete(req.params.id) }); } catch (err) { res.status(400).json({ error: err.message }); }
});

// Allocations
router.get('/allocations', allocationController.getAll);
router.post('/allocations', allocationController.create);
router.patch('/allocations/:id/status', allocationController.updateStatus);
router.patch('/allocations/:id/hod-remark', allocationController.addHODRemark);
router.delete('/allocations/clear-history', allocationController.clearHistory);
router.get('/hod/stats', allocationController.getHODStats);

// Logs
router.get('/logs', async (req, res) => {
    try {
        const { limit } = req.query;
        let sql = `
            SELECT l.*, s1.name as createdByName, s1.department as dept, s2.name as approvedByName 
            FROM exam_logs l
            LEFT JOIN staff s1 ON l.created_by = s1.staff_id
            LEFT JOIN staff s2 ON l.approved_by = s2.staff_id
            ORDER BY l.timestamp DESC
        `;
        let params = [];
        if (limit) {
            sql += " LIMIT ?";
            params.push(parseInt(limit, 10));
        }
        const [rows] = await db.execute(sql, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/logs', async (req, res) => {
    try {
        const [result] = await db.execute("INSERT INTO exam_logs (action, performed_by) VALUES (?, ?)", [req.body.action, req.body.performed_by]);
        res.json({ success: true, log_id: result.insertId });
    } catch (err) { res.status(400).json({ error: err.message }); }
});

// Feedback
router.post('/feedback', async (req, res) => {
  try {
    const [result] = await db.execute("INSERT INTO feedback (staff_name, staff_username, email, message) VALUES (?, ?, ?, ?)", [req.body.staff_name, req.body.staff_username, req.body.email, req.body.message]);
    res.json({ success: true, feedback_id: result.insertId });
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Catch-all: If it's an /api request that didn't match any route, return JSON 404
router.use((req, res) => {
    res.status(404).json({ error: `Path '${req.originalUrl}' not found on API.` });
});

module.exports = router;
