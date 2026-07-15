const express = require('express');
const router = express.Router();

// 1. Nhập Controller xử lý gói cước
const packageController = require('../controllers/packageController'); 

// 2. Nhập chính xác file Middleware xác thực của Chủ Tịch
// ✅ ĐÃ SỬA CHUẨN: Gọi đúng tên file 'authenticateToken' và loại bỏ dấu ngoặc nhọn {} để khớp với module.exports
const authenticateToken = require('../middleware/authenticateToken'); 

console.log("=== [HỆ THỐNG KIỂM TRA ROUTE GÓI CƯỚC] ===");
console.log("-> Trạng thái hàm fetchPackages:", typeof packageController?.fetchPackages);
console.log("-> Trạng thái hàm buyPackage:", typeof packageController?.buyPackage);
console.log("-> Trạng thái Middleware authenticateToken:", typeof authenticateToken);
console.log("=========================================");

// 3. Thiết lập các tuyến đường Endpoint gói cước
router.get('/list', packageController.fetchPackages);
router.post('/buy', authenticateToken, packageController.buyPackage);
router.get('/history', authenticateToken, packageController.fetchUserHistory); 
router.post('/admin-add', packageController.addPackage);
router.post('/admin-edit', packageController.editPackage);
router.get('/revenue-monthly', packageController.getRevenueReport);


router.post('/fake-webhook-payment', packageController.handleFakePaymentWebhook);

module.exports = router;