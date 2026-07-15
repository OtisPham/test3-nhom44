// 📂 Định vị: src/routes/overviewRoute.js
const express = require('express');
const router = express.Router();

// Nhập lớp điều khiển xử lý logic tổng quan
const overviewController = require('../controllers/overviewController');

// Nhập chính xác lớp Middleware gác cổng bảo mật của dự án
const authenticateToken = require('../middleware/authenticateToken');


router.get('/overview-stats', authenticateToken, overviewController.getOverviewData); // Endpoint tổng hợp số liệu báo cáo hệ thống cho UI Admin

module.exports = router;