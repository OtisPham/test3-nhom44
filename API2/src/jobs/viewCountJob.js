const cron = require('node-cron');
const { supabaseAdmin } = require('../configs/supabase');

// Chạy vào 00:00 mỗi ngày
cron.schedule('0 0 * * *', async () => {
    console.log('>>> [CRON JOB] Bắt đầu đồng bộ lượt xem...');
    
    try {
        // 1. Lấy tất cả lượt đọc mới chưa được cộng dồn (ví dụ từ reading_logs)
        // Bạn nên có cột 'is_counted' trong reading_logs để đánh dấu các dòng đã xử lý
        const { data: logs, error } = await supabaseAdmin
            .from('reading_logs')
            .select('chapter_id')
            .eq('is_counted', false);

        if (error || !logs || logs.length === 0) return;

        // 2. Gom nhóm chapter_id để đếm xem mỗi cuốn sách có bao nhiêu view mới
        // ... (Logic đếm và update bảng books) ...
        
        console.log(`>>> [CRON JOB] Đã đồng bộ thành công ${logs.length} lượt đọc.`);
    } catch (err) {
        console.error(">>> [CRON JOB ERROR]:", err.message);
    }
});