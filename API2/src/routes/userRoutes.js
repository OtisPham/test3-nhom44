const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateToken = require('../middleware/authenticateToken');
const userService = require('../services/userService'); 
const { supabase, supabaseAdmin } = require('../configs/supabase'); 

// ─── CÁC ROUTE QUẢN LÝ TÀI KHOẢN CŨ GỐC ───
router.post('/users', userController.register);
router.post('/login', userController.login);
router.post('/refresh-token', authenticateToken, userController.refreshToken);
router.get('/users', authenticateToken, userController.getUsers);
router.patch('/users/:id', authenticateToken, userController.update);
router.delete('/users/:id', authenticateToken, userController.delete);

// ─── 🚀 HỆ THỐNG PHÂN VÙNG ENDPOINT PROFILE MỚI CHO FRONTEND ───

/**
 * 📥 CỔNG GET: Lấy thông tin tài khoản và profile cá nhân của NGƯỜI ĐANG ĐĂNG NHẬP
 * URL gọi từ FE: ${BASE_URL}/api/users/profile/me
 */
router.get('/users/profile/me', authenticateToken, userController.getMyProfile);

/**
 * 🛠️ CỔNG PUT 1: Cập nhật dữ liệu bảng 'users' (Tên hiển thị)
 * URL gọi từ FE: ${BASE_URL}/api/users/:id
 */
router.put('/users/:id', authenticateToken, userController.update);

/**
 * 🎨 CỔNG PUT 2: Cập nhật dữ liệu chi tiết bảng 'profiles' (Bút danh, tiểu sử, website)
 * URL gọi từ FE: ${BASE_URL}/api/users/:id/profile
 */
router.put('/users/:id/profile', authenticateToken, userController.updateProfile);


// ─── CÁC ROUTE QUÊN MẬT KHẨU ───
router.post('/auth/forgot-password', userController.forgotPassword);
router.post('/auth/reset-password', userController.resetPassword);

// ─── CÁC ROUTE GÓI DỊCH VỤ & THÔNG BÁO HỆ THỐNG ───
router.get('/subscription-plans', async (req, res) => {
    try {
        const { data, error } = await supabase.from('subscription_plans').select('*').order('price', { ascending: true });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

router.get('/announcements', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 3;
        const data = await userService.getLatestAnnouncements(limit);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/announcements', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const adminId = req.user?.id || req.admin?.id || req.adminUser?.id; 
        if (!adminId) return res.status(401).json({ success: false, message: "Không tìm thấy tài khoản quản trị!" });
        if (!content || content.trim() === '') return res.status(400).json({ success: false, message: "Nội dung trống!" });

        const newNotice = await userService.createAnnouncement(content, adminId);
        return res.status(201).json({ success: true, message: "Phát hành thành công! 🚀", data: newNotice });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// ─── CÁC ROUTE LỊCH SỬ ĐỌC TRUYỆN ───
router.post('/reading-history', authenticateToken, async (req, res) => {
    try {
        const { bookId, chapterId, position } = req.body;
        const userId = req.user?.id || req.admin?.id || req.adminUser?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Phiên không hợp lệ!" });

        const historyRecord = await userService.saveReadingHistory(userId, bookId, chapterId, position);
        return res.status(200).json({ success: true, data: historyRecord });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/reading-history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.id || req.admin?.id || req.adminUser?.id;
        if (!userId) return res.status(401).json({ success: false, message: "Yêu cầu đăng nhập!" });

        const historyList = await userService.getUserReadingHistory(userId);
        return res.status(200).json({ success: true, data: historyList });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;