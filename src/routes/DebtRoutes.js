const { Router } = require('express');
const DebtController = require('../controllers/DebtController');
const authMiddleware = require('../middlewares/authMiddleware');

const debtRoutes = Router();
debtRoutes.use(authMiddleware);

debtRoutes.get('/', DebtController.index);
debtRoutes.post('/', DebtController.store);
// debtRoutes.patch('/:id/pay', DebtController.pay);
debtRoutes.patch('/:id/deposit', DebtController.deposit);
debtRoutes.get('/:id', DebtController.show); 
debtRoutes.put('/:id', DebtController.update);
debtRoutes.delete('/:id', DebtController.delete);

module.exports = debtRoutes;