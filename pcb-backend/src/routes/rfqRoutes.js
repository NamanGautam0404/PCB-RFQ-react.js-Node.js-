const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const rfqController = require('../controllers/rfqController');

// All routes are protected (require authentication)
router.use(protect);

// RFQ CRUD operations
router.route('/')
  .get(rfqController.getAllRFQs)
  .post(rfqController.createRFQ);

router.route('/:id')
  .get(rfqController.getRFQ)
  .put(rfqController.updateRFQ)
  .delete(rfqController.deleteRFQ);

// RFQ Actions
router.put('/:id/supplier-quote', rfqController.updateSupplierQuote);
router.put('/:id/margin', rfqController.updateMargin);
router.put('/:id/stage', rfqController.updateStage);
router.put('/:id/urgency', rfqController.updateUrgency);
router.put('/:id/confidence', rfqController.updateConfidence);
router.post('/:id/send-to-customer', rfqController.sendToCustomer);
router.post('/:id/communication', rfqController.addCommunication);
router.post('/:id/note', rfqController.addNote);
router.put('/:id/complete', rfqController.markComplete);

// RFQ Queries
router.get('/:id/activity', rfqController.getRFQActivity);
router.get('/stats/overview', rfqController.getRFQStats);
router.get('/stage/:stage', rfqController.getRFQsByStage);
router.get('/search/advanced', rfqController.advancedSearch);

module.exports = router;