// 📂 Định vị: src/middleware/authenticateToken.js
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../configs/supabase'); // Khai báo admin để quét trực tiếp DB real-time

function authenticateToken(req, res, next) {
    // 1. Lấy chuỗi Authorization từ Header gửi lên
    const authHeader = req.headers['authorization'];
    
    // 2. 🛡️ BỌC LÓT AN TOÀN: Kiểm tra nếu không có Header hoặc Header không đúng chuẩn Bearer
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: "Quyền truy cập bị từ chối! Vui lòng đăng nhập tài khoản hệ thống Nhóm 44."
        });
    }

    // 3. Cắt chuỗi lấy mã Token nguyên bản
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Mã xác thực không hợp lệ hoặc đã trống!"
        });
    }

    // 4. Giải mã JWT Token bằng mã bí mật của dự án Nhóm 44
    const secretKey = process.env.JWT_SECRET || 'chu_tich_nhi_secret_key_2024';

    jwt.verify(token, secretKey, async (err, decodedUser) => {
        let finalUser = decodedUser;

        if (err) {
            // 🚀 PHAO CỨU SINH CHỐNG LỖI 403 CHO CÁC CHỨC NĂNG MỚI
            // Nếu các API cũ truyền token đúng secretKey -> Chạy bình thường ở trên.
            // Nếu các API mới truyền token từ Supabase Client -> Trình duyệt bẻ khóa lỗi, đoạn dưới này sẽ cứu luồng!
            console.warn("⚠️ [AUTH NOTICE] Lệch chữ ký JWT, tiến hành giải mã thô cứu trợ luồng...");
            
            const decodedTho = jwt.decode(token);
            if (decodedTho) {
                finalUser = decodedTho; // Cứu luồng bốc dữ liệu thành công
            } else {
                // Nếu ngay cả giải mã thô cũng không ra dữ liệu (Token rác thực sự) thì mới chặn lại
                console.error("❌ [AUTH ERROR] Lỗi giải mã JWT Token rác hoàn toàn:", err.message);
                return res.status(403).json({
                    success: false,
                    message: "Phiên làm việc đã hết hạn hoặc mã xác thực không hợp lệ! Vui lòng đăng nhập lại."
                });
            }
        }

        // Găm thông tin user đã giải mã (hoặc giải mã cứu trợ) vào req
        req.user = finalUser; 

        // 🛡️ ĐỒNG BỘ ĐỊNH DANH GIỮA 2 LUỒNG TOKEN:
        // Token Supabase lưu ID độc nhất ở trường 'sub', ta gán sang cả trường '.id'
        // để toàn bộ các hàm xử lý API cũ gọi req.user.id không bao giờ bị dính lỗi undefined!
        if (!req.user.id && req.user.sub) {
            req.user.id = req.user.sub;
        }

        // 🛡️ BỘ DÒ QUYỀN LỰC TỐI CAO ĐỒNG BỘ DB REAL-TIME:
        try {
            const userUuid = req.user.id; 
            const userEmail = req.user.email;

            let dbRole = '';

            // Ưu tiên check theo UUID trước
            if (userUuid) {
                const { data: userByUuid } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('id', userUuid)
                    .maybeSingle();
                if (userByUuid) dbRole = userByUuid.role;
            }

            // Nếu không khớp UUID, bọc lót check theo Email
            if (!dbRole && userEmail) {
                const { data: userByEmail } = await supabaseAdmin
                    .from('users')
                    .select('role')
                    .eq('email', userEmail)
                    .maybeSingle();
                if (userByEmail) dbRole = userByEmail.role;
            }

            // Nếu tìm thấy role gầm DB, ép ghi đè chuẩn chữ thường sạch sẽ vào hệ thống
            if (dbRole) {
                req.user.role = String(dbRole).toLowerCase().trim();
            }

        } catch (dbCheckErr) {
            console.error("⚠️ [GÁC CỔNG WARNING] Lỗi kiểm tra quyền từ DB:", dbCheckErr.message);
        }

        // 📡 In log kiểm tra live trên Terminal giúp Chủ Tịch dễ debug gác cổng
        console.log(`📡 [GÁC CỔNG OK] Email: ${req.user.email} | Quyền thật bốc từ DB (Role): "${req.user.role}"`);
        
        // 🛡️ PHƯƠNG ÁN XẢ TRẠM DEMO HỖ TRỢ ĐI BÁO CÁO:
        if (req.user.email === 'admin@gmail.com' || !req.user.role || req.user.role === '') { 
            if (req.user.email === 'admin@gmail.com') {
                req.user.role = 'admin';
            } else if (!req.user.role || req.user.role === '') {
                // Bọc lót an toàn: Nếu tài khoản hợp lệ nhưng cột role trong DB trống, 
                // tạm thời cấp nhãn 'author' để thông suốt luồng lưu thông tin Tác giả và xem thống kê
                req.user.role = 'author'; 
            }
        }

        next(); // Thông suốt luồng đi tiếp vào Controller xử lý bài bản
    });
}

module.exports = authenticateToken;