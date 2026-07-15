// 📂 Định vị: src/routes/authorRoute.js
const express = require('express');
const router = express.Router();
const authorController = require('../controllers/authorController');
const authenticateToken = require('../middleware/authenticateToken'); // Middleware gác cổng bảo mật của bạn

// -------------------------------------------------------------------------
// CỤM API CHUYÊN BIỆT CHO TÁC GIẢ & TƯƠNG TÁC ĐỘC GIẢ
// -------------------------------------------------------------------------

// 1. Route cho độc giả: Follow hoặc Unfollow một tác giả
router.post('/toggle-follow', authenticateToken, authorController.toggleFollowAuthor);


// 2. Route cho tác giả: Xem tổng số lượng followers live hiển thị lên ô giao diện
router.get('/follower-count', authenticateToken, authorController.getAuthorFollowerCount);

router.get('/chapters-count', authenticateToken, (req, res) => authorController.getAuthorChapterCount(req, res));

router.get('/views-count', authenticateToken, authorController.getAuthorTotalReads);
module.exports = router;