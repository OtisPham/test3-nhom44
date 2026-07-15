// 🔥 SỬA ĐÚNG ĐƯỜNG DẪN IMPORT (Ví dụ dùng ../lib/supabase hoặc đường dẫn chạy ngon của Chủ tịch)
const { supabaseAdmin } = require('../configs/supabase'); 
const jwt = require('jsonwebtoken');

const checkPremiumStatus = async (req, res, next) => {
    try {
        const { chapterId } = req.params;

        // 1. Kiểm tra xem tập truyện này có khóa gói cước (package_requirement) không
        const { data: chapter, error: chapErr } = await supabaseAdmin
            .from('chapters')
            .select('package_requirement')
            .eq('id', chapterId)
            .maybeSingle();

        if (chapErr) throw chapErr;

        // ✅ THÔNG LUỒNG TRUYỆN FREE: Nếu không gài gói cước -> Cho qua cửa đọc luôn!
        if (!chapter || !chapter.package_requirement) {
            return next();
        }

        // =========================================================
        // 🔒 TRUYỆN PREMIUM: BẮT ĐẦU ÉP KIỂM TRA QUYỀN HỘI VIÊN CHẶT CHẼ
        // =========================================================
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(403).json({ 
                success: false, 
                isVipBlocked: true,
                message: "Tập truyện Premium! Vui lòng đăng nhập tài khoản để mở khóa." 
            });
        }

        const token = authHeader.split(' ')[1];
        const secretKey = process.env.JWT_SECRET || 'chu_tich_nhi_secret_key_2024';

        // Tiến hành giải mã Token live tại chỗ
        let decodedUser;
        try {
            decodedUser = jwt.verify(token, secretKey);
        } catch (jwtErr) {
            return res.status(403).json({ 
                success: false, 
                isVipBlocked: true,
                message: "Phiên đăng nhập Premium đã hết hạn hoặc Token không hợp lệ!" 
            });
        }

        const userEmail = decodedUser?.email;

        // A. 🎯 BƯỚC MỚI: Bốc chuẩn xác UUID (id) của User từ bảng users bằng Email
        const { data: userData, error: userErr } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', userEmail)
            .maybeSingle();

        if (userErr || !userData) {
            return res.status(403).json({ 
                success: false, 
                isVipBlocked: true,
                message: "Tài khoản độc giả không tồn tại trên hệ thống Nhóm 44!" 
            });
        }

        // B. 🎯 BƯỚC MỚI: Cầm user_id quét bảng đăng ký gói xem có gói nào 'active' và còn hạn dùng không
        const { data: userSub, error: subErr } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id, end_date, status')
            .eq('user_id', userData.id)                      // Đúng tài khoản độc giả này
            .eq('package_id', chapter.package_requirement)   // Đúng mã gói cước của tập truyện này
            .eq('status', 'active')                          // Trạng thái gói phải đang kích hoạt
            .gt('end_date', new Date().toISOString())        // Ngày hết hạn phải lớn hơn hiện tại
            .maybeSingle();

        if (subErr) throw subErr;

        // 🛑 NẾU KHÔNG TÌM THẤY GÓI HỢP LỆ -> CHẶN ĐỨNG KHÔNG CHO ĐỌC!
        if (!userSub) {
            return res.status(403).json({ 
                success: false, 
                isVipBlocked: true,
                message: "Bạn cần đăng ký gói hội viên Premium để mở khóa chương truyện giới hạn này!" 
            });
        }

        // Độc giả có gói cước hợp lệ và còn hạn dùng! Cho phép đi tiếp vào đọc truyện
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi gác cổng hệ thống: " + error.message });
    }
};

module.exports = checkPremiumStatus;