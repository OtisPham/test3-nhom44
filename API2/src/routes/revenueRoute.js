// 📂 src/routes/revenueRoute.js
const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const authenticateToken = require('../middleware/authenticateToken');

// Tuyến đường 1 dành cho Admin: Chạy kích hoạt thuật toán phân bổ tiền cuối tháng
router.post('/admin/calculate-share', revenueController.calculateMonthlyRevenueDistribution);

// Tuyến đường 2 dành cho Tác giả: Tự xem ví tiền thu nhập từng tháng của mình
router.get('/my-earnings', authenticateToken, revenueController.getMyRevenueHistory);

module.exports = router;