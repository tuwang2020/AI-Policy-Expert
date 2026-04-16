const express = require('express');
const router = express.Router();
const ReminderController = require('../controllers/reminder.controller');
const { authMiddleware, roleMiddleware } = require('../controllers/auth.controller');

router.get('/', authMiddleware, ReminderController.getList);
router.get('/statistics', authMiddleware, ReminderController.getStatistics);
router.post('/:id/cancel', authMiddleware, roleMiddleware('admin'), ReminderController.cancel);
router.post('/:id/manual-send', authMiddleware, roleMiddleware('admin'), ReminderController.manualSend);

module.exports = router;
