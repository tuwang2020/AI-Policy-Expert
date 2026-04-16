const express = require('express');
const router = express.Router();
const EnterpriseController = require('../controllers/enterprise.controller');
const { upload } = EnterpriseController;
const { authMiddleware, roleMiddleware } = require('../controllers/auth.controller');

router.post('/', authMiddleware, roleMiddleware('admin', 'operator'), EnterpriseController.create);
router.put('/:id', authMiddleware, roleMiddleware('admin', 'operator'), EnterpriseController.update);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), EnterpriseController.delete);
router.get('/statistics', EnterpriseController.getStatistics);
router.get('/template/download', EnterpriseController.downloadTemplate);
router.post('/import', authMiddleware, roleMiddleware('admin', 'operator'), upload, EnterpriseController.importExcel);
router.get('/', EnterpriseController.getList);
router.get('/:id', EnterpriseController.getById);

module.exports = router;
