const express = require('express');
const router = express.Router();
const MatchController = require('../controllers/match.controller');
const { authMiddleware, roleMiddleware } = require('../controllers/auth.controller');

router.post('/match', authMiddleware, roleMiddleware('admin', 'operator'), MatchController.matchPolicy);
router.get('/results', MatchController.getResults);
router.put('/:id/adjust-score', authMiddleware, roleMiddleware('admin', 'operator'), MatchController.adjustScore);
router.put('/:id/approve', authMiddleware, roleMiddleware('admin'), MatchController.approveMatch);
router.put('/:id/reject', authMiddleware, roleMiddleware('admin'), MatchController.rejectMatch);

module.exports = router;
