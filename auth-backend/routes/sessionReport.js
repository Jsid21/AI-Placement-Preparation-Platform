const express = require('express');
const { SessionReport } = require('../models/SessionReport');
const router = express.Router();

router.post('/save', async (req, res) => {
    try {
        const report = new SessionReport(req.body);
        await report.save();
        res.status(201).json({ message: 'Session report saved' });
    } catch (err) {
        console.error("SessionReport save error:", err);
        res.status(500).json({ message: 'Failed to save session report', error: err.message });
    }
});

module.exports = router;
