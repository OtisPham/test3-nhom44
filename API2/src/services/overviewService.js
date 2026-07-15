// 📂 Thư mục chuẩn hóa: src/services/overviewService.js
const { supabaseAdmin } = require('../configs/supabase');

const getSystemOverviewStats = async () => {
    try {
        console.log("⚙️ [OVERVIEW SERVICE] Thuật toán bóc tách doanh thu độc lập từng tháng...");

        // 1. 📊 Bốc số lượng tổng quan hệ thống (Exact Count)
        const [usersRes, booksRes, chaptersRes] = await Promise.all([
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('books').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('chapters').select('*', { count: 'exact', head: true })
        ]);

        if (usersRes.error) throw new Error(`Lỗi bảng users: ${usersRes.error.message}`);
        if (booksRes.error) throw new Error(`Lỗi bảng books: ${booksRes.error.message}`);
        if (chaptersRes.error) throw new Error(`Lỗi bảng chapters: ${chaptersRes.error.message}`);

        // 2. 📅 TỰ ĐỘNG DỰNG MỐC 6 THÁNG GẦN NHẤT THEO DẠNG ĐỘC LẬP (Chuẩn năm 2026)
        const revenueChartData = [];
        const now = new Date();
        
        // Mốc so sánh tháng hiện tại
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth(); // 0 - 11

        for (let i = 5; i >= 0; i--) {
            // Tính ngược dòng thời gian để dựng trục X
            const targetDate = new Date(currentYear, currentMonth - i, 1);
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            
            revenueChartData.push({
                month: `${y}-${m}`, // Chuỗi nhận diện "YYYY-MM"
                revenue: 0          // Khởi tạo doanh thu gốc của riêng tháng đó
            });
        }

        // 3. 💰 CÀO VÀ BÓC TÁCH DÒNG TIỀN THEO NGĂN THÁNG CHÍNH XÁC
        // Lấy mốc ngày đầu tiên của ô tháng xa nhất trong biểu đồ để tối ưu vùng quét dữ liệu
        const firstMonthStr = `${revenueChartData[0].month}-01T00:00:00.000Z`;

        const { data: subscriptionRecords, error: revError } = await supabaseAdmin
            .from('user_subscriptions')
            .select(`
                start_date,
                packages ( price )
            `)
            // .eq('status', 'active')
            .gte('start_date', firstMonthStr);

        if (revError) throw new Error(`Lỗi cào dữ liệu hóa đơn: ${revError.message}`);

        let currentMonthRevenue = 0;
        const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

        if (subscriptionRecords) {
            subscriptionRecords.forEach(record => {
                if (!record.start_date || !record.packages?.price) return;

                const price = parseFloat(record.packages.price || 0);
                
                // 🛠️ CHUYỂN ĐỔI AN TOÀN: Ép chuỗi start_date từ DB thành đối tượng Date để bốc chuỗi chính xác
                const dateObj = new Date(record.start_date);
                const recYear = dateObj.getFullYear();
                const recMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
                const recordMonthKey = `${recYear}-${recMonth}`; // Chuỗi "YYYY-MM" thực tế của hóa đơn

                // Ngăn 1: Tính riêng tiền cho thẻ Card "Doanh Thu Tháng Này"
                if (recordMonthKey === currentMonthKey) {
                    currentMonthRevenue += price;
                }

                // Ngăn 2: Phân bổ độc lập vào biểu đồ lên xuống nhấp nhô
                const targetMonthCell = revenueChartData.find(item => item.month === recordMonthKey);
                if (targetMonthCell) {
                    targetMonthCell.revenue += price; // Chỉ cộng vào đúng ngăn tháng phát sinh hóa đơn đó!
                }
            });
        }

        return {
          totalUsers: usersRes.count || 0,
          totalBooks: booksRes.count || 0,
          totalChapters: chaptersRes.count || 0,
          totalRevenue: currentMonthRevenue, // Chỉ hiển thị tổng doanh thu của riêng tháng này
          revenueChartData: revenueChartData  // Mảng biểu đồ bốc tách biệt độc lập các tháng với nhau
        };

    } catch (error) {
        console.error("❌ [SERVICE ERROR]:", error.message);
        throw error;
    }
};

module.exports = { getSystemOverviewStats };