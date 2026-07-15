const userService = require('../services/userService');
const { supabase } = require('../configs/supabase');

class UserController {
    async register(req, res) {
        try {
            const user = await userService.register(req.body.name, req.body.email, req.body.password);
            const token = userService.generateToken(user);
            res.status(201).json({ message: "Thêm thành công!", token, data: user });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async login(req, res) {
        try {
            const user = await userService.login(req.body.email, req.body.password);
            const token = userService.generateToken(user);
            res.json({ 
                message: "Đăng nhập thành công!", 
                token, 
                user: { id: user.id, name: user.name, email: user.email, role: user.role, plan: user.subscription_plan } 
            });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProfile(req, res) {
        try {
            const userId = req.user?.id; 
            if (!userId) return res.status(410).json({ success: false, message: "Phiên làm việc hết hạn!" });

            // 🚀 BƯỚC QUAN TRỌNG NHẤT: Gọi hàm rpc để ép Supabase quét sạch và gạt các gói hết hạn sang 'expired', hạ users về 'free'
            const { error: rpcErr } = await supabase.rpc('auto_downgrade_expired_subscriptions');
            if (rpcErr) {
                console.error(">>> [CRITICAL ERROR] Lỗi khi chạy rpc hạ cấp tự động:", rpcErr.message);
            }

            // 1. Lấy thông tin tài khoản sau khi Database đã được nắn chỉnh đồng bộ sạch sẽ
            const allUsers = await userService.getAllUsers();
            let currentUser = allUsers.find(u => u.id === userId);

            if (!currentUser) {
                return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ tài khoản cục bộ!" });
            }

            // 2. Tra cứu gói cước (Lúc này nếu hết hạn, nó đã bị lệnh RPC ở trên chuyển sang 'expired' nên query này sẽ trả về null)
            const { data: sub } = await supabase
                .from('user_subscriptions')
                .select('start_date, end_date')
                .eq('user_id', userId)
                .eq('status', 'active') // Chỉ bốc gói đang active
                .maybeSingle();

            // 3. Hợp nhất dữ liệu trả về cho Frontend Plus.tsx hiển thị
            const profilePayload = {
                ...currentUser,
                start_date: sub ? sub.start_date : null,
                end_date: sub ? sub.end_date : null
            };

            return res.status(200).json({ success: true, data: profilePayload });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async refreshToken(req, res) {
        const token = userService.generateToken(req.user);
        res.json({ message: "Đã gia hạn phiên làm việc!", token });
    }

    async getUsers(req, res) {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Bạn không phải Admin!" });
        try {
            const data = await userService.getAllUsers();
            res.json(data);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    

    async update(req, res) {
        if (req.user.id != req.params.id && req.user.role !== 'admin') return res.status(403).json({ message: "Không có quyền!" });
        try {
            const data = await userService.updateUser(req.params.id, req.body);
            res.json({ success: true, message: "Cập nhật thành công!", data });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    /**
     * 🟢 CỔNG PUT ĐỒNG BỘ CHO ACCOUNT.TSX CẬP NHẬT BẢNG PROFILES
     */
    async updateProfile(req, res) {
        if (req.user.id != req.params.id && req.user.role !== 'admin') return res.status(403).json({ message: "Không có quyền!" });
        try {
            const { pseudonym, bio, website_url } = req.body;
            const profileData = { pseudonym, bio, website_url };

            const data = await userService.updateProfile(req.params.id, profileData);
            res.json({ success: true, message: "Cập nhật hồ sơ thành công!", data });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    async delete(req, res) {
        if (req.user.role !== 'admin') return res.status(403).json({ message: "Cấm xóa!" });
        try {
            await userService.deleteUser(req.params.id);
            res.json({ message: `Đã xóa user ID: ${req.params.id}` });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    // =========================================================================
    // 🚀 TÍNH NĂNG MỚI BỔ SUNG: QUÊN VÀ ĐẶT LẠI MẬT KHẨU KHÁCH HÀNG
    // =========================================================================

    /**
     * API: POST /api/auth/forgot-password
     * Tiếp nhận email, tạo token reset và gửi email cho người dùng
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: "Vui lòng cung cấp email tài khoản!" });
            }

            // Gọi service xử lý logic (Tìm user, tạo token hết hạn, gửi mail qua nodemailer)
            await userService.forgotPassword(email.trim());

            res.status(200).json({ 
                success: true,
                message: "Hệ thống đã gửi một liên kết đổi mật khẩu vào Email của bạn. Vui lòng kiểm tra hộp thư!" 
            });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }

    /**
     * API: POST /api/auth/reset-password
     * Xác thực token/OTP hợp lệ và ghi đè mật khẩu mới vào cơ sở dữ liệu
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ message: "Thiếu thông tin xác thực hoặc mật khẩu mới!" });
            }

            // Gọi service kiểm tra token và hash + update mật khẩu mới vào Database
            await userService.resetPassword(token, newPassword);

            res.status(200).json({ 
                success: true,
                message: "Thay đổi mật khẩu thành công! Bạn đã có thể đăng nhập bằng mật khẩu mới." 
            });
        } catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
}

// =========================================================================
// CÁC HÀM XỬ LÝ ANNOUNCEMENT (GIỮ NGUYÊN HOẶC ĐÓNG GÓI VÀO CONTROLLER)
// =========================================================================
const getAnnouncements = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 3;
        const data = await userService.getLatestAnnouncements(limit);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

const createAnnouncement = async (req, res) => {
    try {
        const { content } = req.body;
        const adminId = req.user?.id; 

        if (!adminId) {
            return res.status(401).json({ success: false, message: "Không tìm thấy định danh tài khoản quản trị!" });
        }

        const newNotice = await userService.createAnnouncement(content, adminId);
        return res.status(201).json({ 
            success: true, 
            message: "Đã phát hành thông báo thành công! 🚀", 
            data: newNotice 
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

// Xuất bản instance Controller
module.exports = new UserController();