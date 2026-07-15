const { supabaseAdmin } = require('../configs/supabase');

/**
 * 1. Lấy danh sách tất cả các gói cước đang mở bán
 */
const getAllPackages = async () => {
    const { data, error } = await supabaseAdmin
        .from('packages')
        .select('*')
        .order('price', { ascending: true }); // Xếp từ gói rẻ nhất đến cao nhất

    if (error) {
        console.error(">>> [SERVICE ERROR] Không thể lấy danh sách gói:", error.message);
        throw error;
    }
    return data;
};

/**
 * 2. Xử lý logic Đăng ký mua gói cước hội viên VIP
 */
const subscribeToPackage = async (email, packageId) => {
    // A. Định danh người dùng qua Email từ Token gác cổng
    const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (userErr || !user) {
        throw new Error("Tài khoản người dùng không tồn tại hoặc phiên đăng nhập hết hạn!");
    }

    // B. Kiểm tra thông tin gói cước để lấy số ngày sử dụng (duration_days) và tên gói (name)
    const { data: pkg, error: pkgErr } = await supabaseAdmin
        .from('packages')
        .select('*')
        .eq('id', packageId)
        .maybeSingle();

    if (pkgErr || !pkg) {
        throw new Error("Gói cước hội viên này không tồn tại trên hệ thống!");
    }

    // C. Tính toán mốc thời gian: Bắt đầu từ hôm nay + số ngày hiệu lực của gói
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + parseInt(pkg.duration_days));

    // D. Bơm bản ghi giao dịch đăng ký mới vào bảng user_subscriptions
    const { data: subscription, error: subErr } = await supabaseAdmin
        .from('user_subscriptions')
        .insert([{
            user_id: user.id,
            package_id: packageId,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            // status: 'active'
        }])
        .select();

    if (subErr) {
        console.error(">>> [SERVICE ERROR] Lỗi chèn gói subscription:", subErr.message);
        throw subErr;
    }

    // 🔥 E. ĐÃ BỔ SUNG: Cập nhật live-time tên gói cước vào thẳng bảng 'users' 
    // Giúp đồng bộ giao diện quản trị Admin UserManagement và màn hình thông tin độc giả ngay lập tức!
    const { error: userUpdateErr } = await supabaseAdmin
        .from('users')
        .update({ subscription_plan: pkg.name }) // Găm tên gói (Ví dụ: 'premium') vào hồ sơ người dùng
        .eq('id', user.id);

    if (userUpdateErr) {
        console.error(">>> [SERVICE ERROR] Lỗi cập nhật trường gói cước tại bảng users:", userUpdateErr.message);
    }

    return subscription[0];
};

/**
 * 3. Admin: Tạo gói cước mới tinh
 */
const createPackageByAdmin = async (name, price, duration_days, description) => {
    const { data, error } = await supabaseAdmin
        .from('packages')
        .insert([{ name, price, duration_days, description }])
        .select();
    if (error) throw error;
    return data[0];
};

/**
 * 4. Admin: Cập nhật sửa đổi thông tin gói cước cũ
 */
const updatePackageByAdmin = async (id, name, price, duration_days, description) => {
    const { data, error } = await supabaseAdmin
        .from('packages')
        .update({ name, price, duration_days, description })
        .eq('id', id)
        .select();
    if (error) throw error;
    return data[0];
};
const getMonthlyRevenue = async () => {
    const now = new Date();
    // Tạo mốc thời gian: Ngày đầu tiên của tháng hiện tại (00:00:00)
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Lấy toàn bộ danh sách gói cước hoạt động trong tháng này
    const { data: subs, error: subErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
            status,
            start_date,
            packages ( price )
        `)
        // .eq('status', 'active', 'expired')
        .gte('start_date', firstDayOfMonth);

    if (subErr) {
        console.error(">>> [SERVICE ERROR] Không thể tính doanh thu tháng:", subErr.message);
        throw subErr;
    }

    // Tính tổng tiền từ mảng dữ liệu quan hệ (packages.price)
    const totalRevenue = subs.reduce((sum, item) => {
        const price = item.packages?.price ? parseFloat(item.packages.price) : 0;
        return sum + price;
    }, 0);

    return {
        totalRevenue,
        transactionCount: subs.length
    };
};

const getUserSubscriptionHistory = async (email) => {
    // Tìm ID người dùng trước
    const { data: user, error: userErr } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (userErr || !user) throw new Error("Không tìm thấy người dùng!");

    // Lấy toàn bộ danh sách gói cước user này từng đăng ký, sắp xếp mới nhất lên đầu
    const { data: history, error: historyErr } = await supabaseAdmin
        .from('user_subscriptions')
        .select(`
            id,
            start_date,
            end_date,
            status,
            packages ( name, price )
        `)
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

    if (historyErr) {
        console.error(">>> [SERVICE ERROR] Lỗi lấy lịch sử gói cước:", historyErr.message);
        throw historyErr;
    }
    return history;
};

// 🔥 ĐÃ LÀM SẠCH: Loại bỏ hoàn toàn các thuộc tính xuất bản trùng lặp thừa thãi
module.exports = {
    getAllPackages,
    subscribeToPackage,
    createPackageByAdmin,
    updatePackageByAdmin,
    getMonthlyRevenue,
    getUserSubscriptionHistory
};  