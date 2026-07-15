// 📂 Định vị: src/routes/bookRoute.js
const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const authenticateToken = require('../middleware/authenticateToken');
const checkPremiumStatus = require('../middleware/premiumMiddleware');

// ========================================================
// 🗺️ ĐỊNH TUYẾN CÁC ENDPOINT HỆ THỐNG TRUYỆN (CHUẨN ĐẦU /api/books)
// ========================================================

// --------------------------------------------------------
// A. CÁC ROUTE CÓ ĐƯỜNG DẪN TĨNH (Phải đặt TRÊN các route chứa tham số :id)
// --------------------------------------------------------

// ✅ ĐỒNG BỘ: Route lấy top truyện đọc nhiều nhất cho Dashboard/Trang chủ
router.get('/top-views', bookController.getTopViewsBooks);

// Lấy toàn bộ danh sách truyện hệ thống nhả về cho trang chủ Độc giả
router.get('/all-books', bookController.getAllBooks);

// 🛠️ BỔ SUNG: Endpoint Admin thêm nhanh chương mới (Yêu cầu Token quyền Admin)
router.post('/admin-add-chapter', authenticateToken, bookController.adminAddChapter);

// Lấy thông tin tiểu sử của tác giả dựa trên ID sách (Khớp hoàn hảo với Frontend)
router.get('/profiles/:bookId', bookController.getAuthorProfile);

// --------------------------------------------------------
// B. LUỒNG DÀNH CHO TÁC GIẢ (Author) - Yêu cầu bảo mật Token
// --------------------------------------------------------

// Đăng ký thông tin truyện mới lên kệ
router.post('/create-book', authenticateToken, bookController.createBookInfo);

// Lấy danh sách toàn bộ truyện do chính Tác giả này đăng
router.get('/my-books', authenticateToken, bookController.getMyBooks);

// Đăng thêm tập/chương mới cho truyện từ phía tác giả
router.post('/add-chapter', authenticateToken, bookController.createChapterInfo);


// --------------------------------------------------------
// C. LUỒNG TƯƠNG TÁC & THEO DÕI HÀNH VI (Yêu cầu đăng nhập)
// --------------------------------------------------------

router.post('/toggle-like', authenticateToken, bookController.handleLikeToggle);
router.post('/comment', authenticateToken, bookController.createComment);
router.post('/track-reading', authenticateToken, bookController.trackValidReadingLog);
router.post('/track-reading-log', authenticateToken, bookController.trackValidReadingLog);


// --------------------------------------------------------
// D. LUỒNG QUẢN TRỊ VIÊN ADMIN CHỈNH SỬA / XÓA (Chứa tham số biến :id)
// --------------------------------------------------------

// Sửa: Endpoint Admin cập nhật truyện bất kỳ theo ID sách
router.put('/admin-update-book/:id', bookController.adminEditBook);

// Xóa: Endpoint Admin xóa bỏ hoàn toàn truyện bất kỳ theo ID sách
router.delete('/admin-delete-book/:id', bookController.adminDeleteBook);

// 🛠️ BỔ SUNG: Admin cập nhật chương/tập truyện bất kỳ (Dùng để bật/tắt phí Premium)
router.put('/admin-update-chapter/:chapterId', bookController.adminUpdateChapter);

// 🛠️ BỔ SUNG: Admin xóa vĩnh viễn một chương cụ thể ra khỏi Database
router.delete('/admin-delete-chapter/:chapterId', bookController.adminDeleteChapter);


// --------------------------------------------------------
// E. LUỒNG ĐỌC & TRUY VẤN DỮ LIỆU ĐỘNG (Đặt ở CUỐI file để tránh tranh chấp Route)
// --------------------------------------------------------

// 🛠️ BỔ SUNG: Endpoint lấy chi tiết sách kèm danh sách chương (Giải quyết lỗi 404 Frontend)
router.get('/detail-with-chapters/:id', bookController.getBookDetailWithChapters);

// Sửa thông tin tổng quan của truyện theo ID (Dành cho tác giả)
router.put('/update-book/:id', authenticateToken, bookController.updateMyBook);


// Thêm Bảo cập nhật chương (Dành cho tác giả)
router.put('/update-chapter/:chapterId', authenticateToken, bookController.updateChapterInfo);

// Lấy thông tin thống kê lượt Thích của truyện
router.get('/like-stats/:bookId', bookController.getLikeStats);

// Lấy danh sách bình luận của truyện
router.get('/comments/:bookId', bookController.getBookComments);

// Xem chi tiết một tác phẩm truyện (Tự động đếm view)
router.get('/public-detail/:id', bookController.getBookDetail);

// Đọc nội dung chương truyện (Có gác cổng kiểm tra gói Premium/VIP công bằng)
router.get('/public-chapter/:chapterId', checkPremiumStatus, bookController.getChapterDetail);

// Xem thông tin tiểu sử của tôi (Tác giả)
router.get('/author/profile', authenticateToken, bookController.getMyProfile);

// Cập nhật/Tạo tiểu sử của tôi (Tác giả)
router.post('/author/profile-update', authenticateToken, bookController.updateMyProfile);

module.exports = router;