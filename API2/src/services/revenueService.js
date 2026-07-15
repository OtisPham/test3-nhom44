// 📂 src/services/revenueService.js
const { supabaseAdmin } = require('../configs/supabase');

/**
 * 📊 THUẬT TOÁN KẾT TOÁN & PHÂN BỔ DOANH THU THEO CHU KỲ THÁNG (Từ ngày 1 đến ngày 30/31)
 */
const calculateAndSaveRevenue = async (targetMonth) => {
    // 🎯 Tạo mốc thời gian: Từ 00:00:00 ngày đầu tháng đến 23:59:59 ngày cuối tháng
    const year = parseInt(targetMonth.split('-')[0]);
    const month = parseInt(targetMonth.split('-')[1]);
    
    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    console.log(`📡 [REVENUE SERVICE] Quét chu kỳ từ: ${startOfMonth.toISOString()} đến ${endOfMonth.toISOString()}`);

    // ==========================================================
    // BƯỚC 1: TÍNH TỔNG DOANH THU THỰC TẾ (TR) TỪ CÁC ĐĂNG KÝ TRONG THÁNG
    // ==========================================================
    const { data: activeSubs, error: subErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select('package_id')
        // .eq('status', 'active', 'expired')
        .gte('start_date', startOfMonth.toISOString())
        .lte('start_date', endOfMonth.toISOString());

    if (subErr) throw subErr;

    // Bốc bảng packages để lấy giá tiền đối chiếu live-time
    const { data: packages, error: pkgErr } = await supabaseAdmin
        .from('packages')
        .select('id, price');

    if (pkgErr) throw pkgErr;

    const priceMap = {};
    if (packages) {
        packages.forEach(p => priceMap[p.id] = Number(p.price));
    }

    // Cộng dồn doanh số thực tế (TR) và đếm số lượng đăng ký
    let totalRevenue = 0;
    let subscriptionCount = 0;

    if (activeSubs) {
        subscriptionCount = activeSubs.length;
        activeSubs.forEach(sub => {
            totalRevenue += priceMap[sub.package_id] !== undefined ? priceMap[sub.package_id] : 50000; 
        });
    }

    // 💰 Tỷ lệ trích lập đặc tả hệ thống:
    const platformFee = totalRevenue * 0.40; // Nền tảng hưởng 40% (Vận hành, server)
    const authorPool = totalRevenue * 0.60;  // Quỹ tác giả hưởng 60% (Author Pool)

    // ==========================================================
    // BƯỚC 2: TÍNH TỔNG LƯỢT ĐỌC TOÀN HỆ THỐNG (V_total) -> GIÁ TRỊ MỘT LƯỢT ĐỌC (UV)
    // ==========================================================
    const { data: allLogs, error: logErr } = await supabaseAdmin
        .from('reading_logs')
        .select('id, chapter_id, chapters(book_id, books(user_id))') 
        .gte('created_at', startOfMonth.toISOString())
        .lte('created_at', endOfMonth.toISOString());

    if (logErr) throw logErr;

    const totalValidReads = allLogs ? allLogs.length : 0; 

    // 🎯 BỌC LÓT AN TOÀN ĐỒNG BỘ: Sửa dứt điểm trường hợp 0 lượt đọc để tránh lỗi sập UI Frontend
    if (totalValidReads === 0) {
        return { 
            totalRevenue: `${totalRevenue.toLocaleString('vi-VN')} đ`, 
            platformFee: `${platformFee.toLocaleString('vi-VN')} đ`,
            authorPool: `${authorPool.toLocaleString('vi-VN')} đ`, 
            totalValidReads: "0 lượt đọc", 
            unitValue: "0 đ/lượt", 
            distributedAuthorsCount: 0,
            subscriptionCount: `${subscriptionCount} gói đăng ký`
        };
    }

    // Tính toán Giá trị đơn vị / 1 view hợp lệ: UV = AP / V_total
    const unitValue = authorPool / totalValidReads;

    // ==========================================================
    // BƯỚC 3: PHÂN CHIA THU NHẬP CHO TỪNG TÁC GIẢ X (I_x = V_x * UV * K)
    // ==========================================================
    const authorReadsMap = {};

    allLogs.forEach(log => {
        let authorId = null;
        const chaptersData = log.chapters;
        
        if (chaptersData) {
            const booksData = chaptersData.books;
            if (booksData) {
                if (Array.isArray(booksData) && booksData.length > 0) {
                    authorId = booksData[0].user_id;
                } else {
                    authorId = booksData.user_id;
                }
            }
        }

        if (authorId) {
            authorReadsMap[authorId] = (authorReadsMap[authorId] || 0) + 1;
        }
    });

    const finalCalculatedList = [];

    for (const [authorId, validReadsCount] of Object.entries(authorReadsMap)) {
        const K = 1; // Hệ số thưởng mặc định theo thiết kế
        const totalIncome = validReadsCount * unitValue * K;

        finalCalculatedList.push({
            author_id: authorId,
            billing_month: targetMonth,
            valid_reads: validReadsCount,
            unit_value: unitValue,
            total_income: Math.round(totalIncome) 
        });
    }

    // Đẩy hàng loạt dữ liệu kết toán live vào bảng author_revenues gầm Supabase
    if (finalCalculatedList.length > 0) {
        const { error: insertErr } = await supabaseAdmin
            .from('author_revenues')
            .upsert(finalCalculatedList, { onConflict: 'author_id,billing_month' }); 

        if (insertErr) throw insertErr;
    }

    // Trả về cục object chuỗi văn bản sạch đẹp khớp hoàn toàn với file RevenueManagement.tsx
    return {
        totalRevenue: `${totalRevenue.toLocaleString('vi-VN')} đ`,
        platformFee: `${platformFee.toLocaleString('vi-VN')} đ`, 
        authorPool: `${authorPool.toLocaleString('vi-VN')} đ`,   
        totalValidReads: `${totalValidReads} lượt đọc`,
        unitValue: `${unitValue.toFixed(2)} đ/lượt`,
        distributedAuthorsCount: finalCalculatedList.length,
        subscriptionCount: `${subscriptionCount} gói đăng ký`
    };
};

// 💎 Hàm 2: Tra cứu lịch sử thu nhập cho riêng Tác giả
const getRevenueByAuthor = async (authorId) => {
    const { data, error } = await supabaseAdmin
        .from('author_revenues')
        .select('*')
        .eq('author_id', authorId)
        .order('billing_month', { ascending: false });

    if (error) throw error;
    return data;
};
const getSixMonthsRevenueData = async () => {
    try {
        console.log(">>> [ADMIN SERVICE] Đang tổng hợp doanh thu 6 tháng gần nhất để vẽ đồ thị...");
        
        // 1. Dùng bảng packages làm bản đồ tra cứu giá tiền live-time
        const { data: packages } = await supabaseAdmin.from('packages').select('id, price');
        const priceMap = {};
        if (packages) {
            packages.forEach(p => priceMap[p.id] = Number(p.price));
        }

        // 2. Tạo khung thời gian rỗng cho 6 tháng gần đây (Đảm bảo trục X luôn có đủ 6 tháng)
        const chartDataMap = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            // Chuỗi định dạng chuẩn giống đầu vào của bạn: YYYY-MM
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            chartDataMap[monthKey] = 0;
        }

        // Tìm mốc thời gian ngày đầu tiên của 5 tháng trước để quét DB tối giản nhất
        const oldestMonthDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const startOfRange = new Date(Date.UTC(oldestMonthDate.getFullYear(), oldestMonthDate.getMonth(), 1, 0, 0, 0, 0));

        // 3. Quét toàn bộ gói subscription active nằm trong phạm vi 6 tháng này
        const { data: activeSubs, error: subErr } = await supabaseAdmin
            .from('user_subscriptions')
            .select('package_id, start_date')
            // .eq('status', 'active', 'expired')
            .gte('start_date', startOfRange.toISOString());

        if (subErr) throw subErr;

        // 4. Cộng dồn doanh thu thực tế vào từng tháng tương ứng
        if (activeSubs) {
            activeSubs.forEach(sub => {
                if (!sub.start_date) return;
                const dateObj = new Date(sub.start_date);
                const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                // Nếu tháng của subscription lọt vào danh sách 6 tháng gần đây
                if (chartDataMap[monthKey] !== undefined) {
                    const price = priceMap[sub.package_id] !== undefined ? priceMap[sub.package_id] : 50000;
                    chartDataMap[monthKey] += price;
                }
            });
        }

        // 5. Chuyển đổi định dạng thành mảng Array sạch cho Frontend dễ vẽ đồ thị
        const formattedChartData = Object.keys(chartDataMap).map(month => ({
            month: month,             // Trục X (Chu kỳ tháng)
            revenue: chartDataMap[month] // Trục Y (Tổng số tiền thật kiếm được)
        }));

        // Bốc riêng tổng số tiền của tháng hiện tại (Tháng cuối cùng trong mảng)
        const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const totalCurrentMonthRevenue = chartDataMap[currentMonthKey] || 0;

        return {
            totalRevenue: totalCurrentMonthRevenue, // Tổng số tiền tháng hiện hành
            revenueChartData: formattedChartData   // Mảng 6 tháng làm biểu đồ so sánh tuyến tính
        };

    } catch (err) {
        console.error("❌ Thất bại tại thuật toán getSixMonthsRevenueData:", err.message);
        throw err;
    }
};

module.exports = {
    calculateAndSaveRevenue,
    getRevenueByAuthor,
    getSixMonthsRevenueData
};