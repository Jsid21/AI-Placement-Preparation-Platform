const mongoose = require('mongoose');
const express = require('express');
const router = express.Router();

const StateSchema = new mongoose.Schema({
    seconds: Number,
    formatted: String,
}, { _id: false });

const FeedbackSchema = new mongoose.Schema({
    candidate_response: [String], // <-- Change from String to [String]
    correctness: Number,
    depth: Number,
    relevance: Number,
    communication_clarity: Number,
    job_fit_score: Number,
    suggestions: [String],
    recommendation: String,
    assessment_text: String
}, { _id: false });

const SessionReportSchema = new mongoose.Schema({
    session_id: { type: String, required: true, unique: true },
    total_time: {
        seconds: Number,
        formatted: String,
    },
    eye_states: { type: Map, of: StateSchema },
    head_states: { type: Map, of: StateSchema },
    emotions: { type: Map, of: StateSchema },
    frames_processed: Number,
    attention_score: Number,
    ai_feedback: FeedbackSchema, // <-- Add this line
    timestamp: { type: Date, default: Date.now }
});

const SessionReport = mongoose.model('SessionReport', SessionReportSchema);

router.post('/save', async (req, res) => {
    try {
        const report = new SessionReport(req.body);
        await report.save();
        res.status(201).json({ message: 'Session report saved' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to save session report', error: err.message });
    }
});

module.exports = { SessionReport, router };

// Sample data to test the new structure
/*
{
  "session_id": "abc123",
  "total_time": { "seconds": 120, "formatted": "00:02:00" },
  "eye_states": {},
  "head_states": {},
  "emotions": {},
  "frames_processed": 0,
  "attention_score": 0,
  "ai_feedback": {
    "candidate_response": "answer text",
    "correctness": 80,
    "depth": 70,
    "relevance": 90,
    "communication_clarity": 85,
    "job_fit_score": 88,
    "suggestions": ["Be more concise"],
    "recommendation": "Good job",
    "assessment_text": "Detailed feedback"
  }
}
*/

