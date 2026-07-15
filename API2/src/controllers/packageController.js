const packageService = require('../services/packageService');

/**
 * Lấy danh sách gói cước gửi về Frontend hiển thị Price Cards
 */
const fetchPackages = async (req, res) => {
    try {
        const packages = await packageService.getAllPackages();
        return res.status(200).json({
            success: true,
            data: packages
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi tải danh sách gói cước!",
            error: error.message
        });
    }
};

/**
 * Xử lý yêu cầu mua gói cước (Yêu cầu phải đi qua Middleware xác thực Token)
 */
const buyPackage = async (req, res) => {
    try {
        const { packageId } = req.body;
        const email = req.user?.email; // Được đính kèm vào req từ authMiddleware sau khi giải mã JWT

        if (!packageId) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp mã gói cước (packageId) muốn mua!"
            });
        }

        const subscription = await packageService.subscribeToPackage(email, packageId);
        
        return res.status(200).json({
            success: true,
            message: "Kích hoạt gói đặc quyền Hội viên thành công!",
            data: subscription
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Giao dịch đăng ký gói thất bại!"
        });
    }
};

/**
 * Admin: Tạo gói cước dịch vụ mới tinh
 */
const addPackage = async (req, res) => {
    try {
        const { name, price, duration_days, description } = req.body;
        
        // 🛡️ Tối ưu hóa: Ép kiểu số an toàn chống crash Database
        const parsedPrice = parseFloat(price) || 0;
        const parsedDuration = parseInt(duration_days) || 30;

        const newPkg = await packageService.createPackageByAdmin(name, parsedPrice, parsedDuration, description);
        return res.status(200).json({ success: true, message: "Đã tạo gói mới!", data: newPkg });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Admin: Sửa đổi cập nhật thông tin gói cước
 */
const editPackage = async (req, res) => {
    try {
        const { id, name, price, duration_days, description } = req.body;

        // 🛡️ Tối ưu hóa: Ép kiểu số an toàn chống crash Database
        const parsedPrice = parseFloat(price) || 0;
        const parsedDuration = parseInt(duration_days) || 30;

        const updatedPkg = await packageService.updatePackageByAdmin(id, name, parsedPrice, parsedDuration, description);
        return res.status(200).json({ success: true, message: "Đã cập nhật gói!", data: updatedPkg });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const handleFakePaymentWebhook = async (req, res) => {
    try {
        const { amount, packageId } = req.body; 
        
        // 1. Đón nhận chuỗi Authorization từ Header do FE bắn lên
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: "Cửa sau từ chối: Thiếu Token xác thực tài khoản!" });
        }

        const token = authHeader.split(' ')[1];
        const secretKey = process.env.JWT_SECRET || 'chu_tich_nhi_secret_key_2024'; // Sử dụng đúng mã Secret Key dự án của bạn

        // 2. Tiến hành bẻ khóa giải mã Token trực tiếp ngay tại chỗ để bốc Email
        let decodedUser;
        try {
            decodedUser = jwt.verify(token, secretKey);
        } catch (jwtErr) {
            return res.status(403).json({ success: false, message: "Token test giả lập hết hạn hoặc sai chữ ký!" });
        }

        console.log(`📡 [CỬA SAU BE] Đang tự động định danh tài khoản: ${decodedUser.email}`);

        // 3. Tra cứu bảng users gầm DB Supabase bằng Email để bốc chuẩn chuỗi mã UUID (id)
        const { data: user, error: userErr } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', decodedUser.email)
            .maybeSingle();

        if (userErr || !user) {
            return res.status(404).json({ success: false, message: "Không tìm thấy hồ sơ người dùng tương ứng gầm DB!" });
        }

        // 4. Tính toán mốc mạn hạn dùng: Hôm nay + 30 ngày sử dụng
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30);

        // =================================================================
        // 🚀 GĂM DỮ LIỆU TƯƠI VÀO LỊCH SỬ MUA ĐỂ ĐẬP TAN LỖI 403 KHI ĐỌC TRUYỆN
        // =================================================================
        const { data: existingSub } = await supabaseAdmin
            .from('user_subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('package_id', packageId)
            .maybeSingle();

        if (existingSub) {
            await supabaseAdmin
                .from('user_subscriptions')
                .update({
                    status: 'active',
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString()
                })
                .eq('id', existingSub.id);
        } else {
            const { error: insertSubErr } = await supabaseAdmin
                .from('user_subscriptions')
                .insert([{
                    user_id: user.id,
                    package_id: packageId, // Lưu chuẩn UUID gói cước phục vụ cho premiumMiddleware quét
                    start_date: startDate.toISOString(),
                    end_date: endDate.toISOString(),
                    status: 'active'
                }]);
                
            if (insertSubErr) throw insertSubErr;
        }

        // Thao tác đồng bộ nhãn Premium sang bảng users
        await supabaseAdmin
            .from('users')
            .update({ subscription_plan: 'Premium' })
            .eq('id', user.id);

        console.log(`🎉 [XỬ LÝ THÀNH CÔNG] Cửa sau đã tự động thăng cấp Premium chuẩn đét cho User ID: ${user.id}`);

        return res.status(200).json({ 
            success: true, 
            message: "Kích hoạt đặc quyền thành công!" 
        });

    } catch (error) {
        console.error("❌ Lỗi sập luồng cửa sau:", error.message);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống cửa sau Backend: " + error.message });
    }
};
const getRevenueReport = async (req, res) => {
    try {
        const report = await packageService.getMonthlyRevenue();
        return res.status(200).json({
            success: true,
            data: report
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi thống kê doanh thu!",
            error: error.message
        });
    }
};
const fetchUserHistory = async (req, res) => {
    try {
        const email = req.user?.email; // Lấy từ middleware giải mã token
        if (!email) {
            return res.status(401).json({ success: false, message: "Thiếu thông tin xác thực!" });
        }

        const history = await packageService.getUserSubscriptionHistory(email);
        return res.status(200).json({
            success: true,
            data: history
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống khi tải lịch sử giao dịch!",
            error: error.message
        });
    }
};



// 🔥 ĐÃ LÀM SẠCH: Xuất bản Object tinh gọn, loại bỏ hoàn toàn thuộc tính trùng lặp rác
module.exports = {
    fetchPackages,
    buyPackage,
    addPackage,
    editPackage,
    handleFakePaymentWebhook,
    getRevenueReport,
    fetchUserHistory
};