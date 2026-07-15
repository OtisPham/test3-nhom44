// 📂 src/controllers/revenueController.js
// 🔥 ĐÃ ĐỒNG BỘ: Import file dịch vụ mới tinh vừa tạo ở trên
const revenueService = require('../services/revenueService');
const { supabaseAdmin } = require('../configs/supabase');

const calculateMonthlyRevenueDistribution = async (req, res) => {
    try {
        const { targetMonth } = req.body; 
        
        if (!targetMonth) {
            return res.status(400).json({ success: false, message: "Vui lòng chọn tháng muốn kết toán! Định dạng YYYY-MM" });
        }

        const resultData = await revenueService.calculateAndSaveRevenue(targetMonth);

        return res.status(200).json({
            success: true,
            message: `🎉 CHỐT DOANH THU THÁNG ${targetMonth} THÀNH CÔNG RỰC RỠ!`,
            data: resultData
        });

    } catch (error) {
        console.error("❌ [CONTROLLER REVENUE ERROR]:", error.message);
        return res.status(500).json({ success: false, message: "Lỗi hệ thống: " + error.message });
    }
};

// const getMyRevenueHistory = async (req, res) => {
//     try {
//         const authorId = req.user.id; // Bốc từ token gác cổng authenticateToken
        
//         // 🚀 Gọi Service tra cứu lịch sử tiền nong
//         const data = await revenueService.getRevenueByAuthor(authorId);
        
//         return res.status(200).json({ success: true, data });
//     } catch (error) {
//         return res.status(500).json({ success: false, message: error.message });
//     }
// };

const getMyRevenueHistory = async (req, res) => {
    try {
        const authorId = req.user.id; 
        const currentMonthStr = "2026-05"; // Tháng đang test demo

        // 1. Lấy lịch sử thu nhập đã chốt từ bảng author_revenues
        const { data: officialRevenues, error: err1 } = await supabaseAdmin
            .from('author_revenues')
            .select('*')
            .eq('author_id', authorId)
            .order('billing_month', { ascending: false });

        if (err1) throw err1;
        let finalHistoryList = officialRevenues ? [...officialRevenues] : [];

        // 2. ⚡ TÍNH TIỀN TƯƠI BIẾN ĐỘNG LIÊN TỤC (REAL-TIME)
        const isAlreadySettled = finalHistoryList.some(r => r.billing_month === currentMonthStr);

        if (!isAlreadySettled) {
            const startOfMonth = new Date();
            startOfMonth.setDate(1); startOfMonth.setHours(0, 0, 0, 0);

            // BƯỚC A: Lấy danh sách ID các cuốn sách của tác giả này
            const { data: myBooks } = await supabaseAdmin
                .from('books')
                .select('id')
                .eq('user_id', authorId); // Đã khớp với User Summary của Chủ Tịch

            if (myBooks && myBooks.length > 0) {
                const bookIds = myBooks.map(b => b.id);

                // BƯỚC B: Lấy ID các chương thuộc những cuốn sách này
                const { data: myChapters } = await supabaseAdmin
                    .from('chapters')
                    .select('id')
                    .in('book_id', bookIds);

                if (myChapters && myChapters.length > 0) {
                    const chapterIds = myChapters.map(c => c.id);

                    // BƯỚC C: Đếm view sạch từ bảng reading_logs
                    const { count, error: countErr } = await supabaseAdmin
                        .from('reading_logs')
                        .select('*', { count: 'exact', head: true })
                        .in('chapter_id', chapterIds)
                        .gte('created_at', startOfMonth.toISOString());

                    if (!countErr && count > 0) {
                        const ESTIMATED_UV = 500; // Đơn giá 500đ/view
                        finalHistoryList.unshift({
                            id: "live_estimated_" + Date.now(),
                            author_id: authorId,
                            billing_month: `${currentMonthStr} (⚡ Đang tích lũy)`,
                            valid_reads: count,
                            unit_value: ESTIMATED_UV,
                            total_income: count * ESTIMATED_UV
                        });
                    }
                }
            }
        }

        return res.status(200).json({ success: true, data: finalHistoryList });
    } catch (error) {
        console.error("❌ Lỗi ví tiền 500:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = {
    calculateMonthlyRevenueDistribution,
    getMyRevenueHistory
};