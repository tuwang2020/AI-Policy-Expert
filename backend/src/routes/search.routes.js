const express = require('express');
const router = express.Router();
const SearchController = require('../controllers/search.controller');

router.get('/', SearchController.search);
router.get('/suggestions', SearchController.suggestions);
router.get('/health', SearchController.health);
router.post('/sync-index', SearchController.syncIndex);

module.exports = router;
