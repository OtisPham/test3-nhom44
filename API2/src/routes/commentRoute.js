const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authenticateToken = require('../middleware/authenticateToken'); // Middleware gác cổng bảo mật của bạn

// Bổ sung kiểm tra logic để bắt lỗi trước khi Express khởi động
if (typeof commentController.getAuthorBookComments !== 'function') {
    throw new Error("LỖI: getAuthorBookComments không phải là hàm trong commentController!");
}
if (typeof commentController.replyToComment !== 'function') {
    throw new Error("LỖI: replyToComment không phải là hàm trong commentController!");
}

router.get('/list', authenticateToken, commentController.getAuthorBookComments);
router.post('/reply', authenticateToken, commentController.replyToComment);
module.exports = router;