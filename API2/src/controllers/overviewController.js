// 📂 Định vị và cập nhật lại: src/controllers/overviewController.js
const overviewService = require('../services/overviewService');

const getOverviewData = async (req, res) => {
    try {
        console.log(`📡 [ADMIN CONTROLLER] Bắt đầu bốc số liệu tổng quan hệ thống...`);

        // Gọi tầng service xử lý dữ liệu REAL từ Database
        const overviewStats = await overviewService.getSystemOverviewStats();

        const safeData = {
            totalUsers: Number(overviewStats?.totalUsers ?? 0),
            totalBooks: Number(overviewStats?.totalBooks ?? 0),
            totalChapters: Number(overviewStats?.totalChapters ?? 0),
            totalRevenue: Number(overviewStats?.totalRevenue ?? 0),
            revenueChartData: overviewStats?.revenueChartData || []
        };

        return res.status(200).json({
            success: true,
            message: "Tải số liệu tổng quan hệ thống live-time thực tế thành công! 🎉",
            data: safeData
        });

    } catch (error) {
        console.error("❌ [CRITICAL CONTROLLER ERROR]:", error.message);
        
        // Trả về lỗi 500 thực tế, không dùng dữ liệu mồi nữa để bắt bệnh gầm Service
        return res.status(500).json({
            success: false,
            message: "Lỗi hệ thống không thể lấy dữ liệu thật từ Database!",
            error: error.message
        });
    }
};

module.exports = {
    getOverviewData
};