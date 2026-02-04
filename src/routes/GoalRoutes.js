const { Router } = require('express');
const goalController = require('../controllers/GoalController');

const router = Router();

router.post('/', goalController.create);
router.get('/:userId', goalController.list);
router.patch('/:id/progress', goalController.updateProgress);

module.exports = router;