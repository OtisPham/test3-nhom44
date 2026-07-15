const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SUPABASE_URL = 'https://xvnmhvuxfurvhqgopjiz.supabase.co';

// 1. Client thông thường (Dùng Anon Key công khai) để truy vấn bảng 'users'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bm1odnV4ZnVydmhxZ29waml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODM0MzAsImV4cCI6MjA5MTQ1OTQzMH0.qDxUutDaNBOHcI33PcNZMYlF968grY_JeJHuvfWM3O0';
const supabase = createClient(SUPABASE_URL, supabaseAnonKey);

// 2. Client Tối Cao (Dùng Service Role Key) - CHỈ đặt tại Backend để đồng bộ lên Authentication
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bm1odnV4ZnVydmhxZ29waml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTg4MzQzMCwiZXhwIjoyMDkxNDU5NDMwfQ.RW8vgRQJ6OPWxVH3UeRVaHCZWxZ2uiI1246sWkeD5kQ'; 
const supabaseAdmin = createClient(SUPABASE_URL, supabaseServiceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const JWT_SECRET = 'chu_tich_nhi_secret_key_2024';

class UserService {
    // Hàm tạo thẻ từ JWT
    generateToken(user) {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role, plan: user.subscription_plan || user.plan, name: user.name },
            JWT_SECRET,
            { expiresIn: '2m' }
        );
    }

    // =========================================================================
    // 🚀 LÓGIC ĐĂNG NHẬP & ĐĂNG KÝ (POST)
    // =========================================================================

    /**
     * Xác thực người dùng và lấy thông tin tài khoản kèm hồ sơ cá nhân
     * Có tích hợp cơ chế tự vá dữ liệu nếu bảng users/profiles bị khuyết bản ghi
     */
    async login(email, password) {
        console.log(`>>> [LOGIN PROCESS] Tài khoản ${email} đang gõ cửa đăng nhập...`);

        // --- BƯỚC 1: Gọi Supabase Auth xác thực mật khẩu và lấy Token xịn ---
        const { data: authSession, error: authError } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (authError) {
            console.error(">>> [LOGIN AUTH ERROR]:", authError.message);
            throw new Error(`Sai tài khoản hoặc mật khẩu: ${authError.message}`);
        }

        const supabaseAccessToken = authSession.session?.access_token;
        const supabaseUID = authSession.user?.id;

        console.log(`>>> [LOGIN AUTH SUCCESS] Xác thực Auth thành công cho UID: ${supabaseUID}`);

        // --- BƯỚC 2: Kiểm tra dữ liệu kèm profile bằng maybeSingle() ---
        let { data: user, error: dbError } = await supabaseAdmin
            .from('users')
            .select('*, profiles(*)') 
            .eq('id', supabaseUID)
            .maybeSingle(); 

        // --- BƯỚC 3: CƠ CHẾ TỰ VÁ DỮ LIỆU ---
        if (!user) {
            console.warn(`>>> [WARN] Tài khoản hợp lệ trên Auth nhưng bảng dữ liệu users bị thiếu! Tiến hành tự động vá dữ liệu...`);
            
            const hashedPassword = await bcrypt.hash(password, 10);
            const defaultName = email.split('@')[0];

            // Tự động chèn bù bản ghi bị khuyết vào bảng users
            const { data: insertedData, error: insertError } = await supabaseAdmin
                .from('users')
                .insert([{
                    id: supabaseUID,
                    name: defaultName, 
                    email: email,
                    password: hashedPassword,
                    role: 'author', // Mặc định vá diện author
                    subscription_plan: 'premium'
                }])
                .select();

            if (insertError) {
                console.error(">>> [VÁ DỮ LIỆU THẤT BẠI]:", insertError.message);
                throw new Error("Không thể đồng bộ dữ liệu vào bảng users: " + insertError.message);
            }

            // Vá tiếp dữ liệu tương ứng sang bảng profiles cho tác giả
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .insert([{
                    id: supabaseUID,
                    pseudonym: defaultName,
                    bio: 'Chưa cập nhật tiểu sử tác giả.',
                    website_url: null
                }]);

            if (profileError) {
                console.error(">>> [VÁ PROFILE THẤT BẠI]:", profileError.message);
            }

            // Đồng bộ lại cấu trúc dữ liệu hoàn chỉnh sau khi vá
            const { data: patchedUser } = await supabaseAdmin
                .from('users')
                .select('*, profiles(*)')
                .eq('id', supabaseUID)
                .single();

            user = patchedUser;
            console.log(`>>> [VÁ DỮ LIỆU THÀNH CÔNG] Đã tạo bù bản ghi ID ${supabaseUID} với quyền author và hồ sơ profile!`);
        }

        return {
            ...user,
            supabaseToken: supabaseAccessToken
        };
    }

    /**
     * Đăng ký tài khoản hệ thống, tự động phân tách dữ liệu bảng profiles
     * Tác giả (author): Điền các giá trị khởi tạo. Độc giả (reader): Để null các trường tác giả
     */
    async register(name, email, password, role = 'reader') {
        console.log(`>>> [REGISTRATION] Bắt đầu tiến trình tạo tài khoản liên kết cho: ${email} với vai trò: ${role}`);

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password, 
            email_confirm: true 
        });

        if (authError) {
            console.error(">>> [AUTH ERROR] Thất bại khi đẩy lên Authentication:", authError.message);
            throw new Error(`Lỗi đồng bộ hệ thống Auth: ${authError.message}`);
        }

        const supabaseUID = authData.user.id;
        console.log(`>>> [AUTH SUCCESS] Đã tạo Auth User thành công. ID liên kết: ${supabaseUID}`);

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 1. Ghi thông tin vào bảng 'users'
        const { data: userData, error: dbError } = await supabaseAdmin.from('users').insert([{ 
            id: supabaseUID, 
            name, 
            email, 
            password: hashedPassword, 
            role: role, 
            subscription_plan: role === 'author' ? 'premium' : 'free' 
        }]).select();

        if (dbError) {
            console.error(">>> [DATABASE ERROR] Lỗi khi ghi vào bảng users:", dbError.message);
            await supabaseAdmin.auth.admin.deleteUser(supabaseUID);
            throw new Error(`Lỗi lưu cơ sở dữ liệu: ${dbError.message}`);
        }

        // 2. Phân nhánh dữ liệu ghi vào bảng 'profiles' dựa theo vai trò (Role)
        let profilePayload = { id: supabaseUID };

        if (role === 'author') {
            profilePayload.pseudonym = name; 
            profilePayload.bio = 'Chào mừng đến với trang của tác giả.';
            profilePayload.website_url = null;
        } else {
            // Độc giả: Những dữ liệu tác giả có mà độc giả không dùng đến sẽ để null hoàn toàn
            profilePayload.pseudonym = null;
            profilePayload.bio = null;
            profilePayload.website_url = null;
        }

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert([profilePayload]);

        if (profileError) {
            console.error(">>> [PROFILES ERROR] Lỗi khi ghi vào bảng profiles:", profileError.message);
            // Kích hoạt cơ chế Rollback ngược để đảm bảo tính nhất quán dữ liệu các bảng
            await supabaseAdmin.from('users').delete().eq('id', supabaseUID);
            await supabaseAdmin.auth.admin.deleteUser(supabaseUID);
            throw new Error(`Lỗi lưu cấu hình hồ sơ cá nhân: ${profileError.message}`);
        }

        console.log(`>>> [SUCCESS] Tài khoản ${email} đã liên kết thành công toàn bộ hệ thống!`);
        return {
            ...userData[0],
            profile: profilePayload
        };
    }

    // =========================================================================
    // 🚀 TRUY XUẤT VÀ LẤY DỮ LIỆU (GET)
    // =========================================================================

    /**
     * Lấy toàn bộ danh sách thành viên trong hệ thống đính kèm chi tiết Profiles
     */
    async getAllUsers() {
        console.log(">>> [ADMIN BACKEND] Đang dùng quyền tối cao lấy toàn bộ danh sách thành viên...");
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*, profiles(*)') 
            .order('created_at', { ascending: false }); 

        if (error) {
            console.error(">>> [GET ALL USERS ERROR]:", error.message);
            throw new Error(error.message);
        }

        console.log(`>>> [SUCCESS] Đã lấy thành công ${data?.length || 0} thành viên về Backend!`);
        return data;
    }

    /**
     * Đếm tổng số lượng người dùng hiện có trong hệ thống thư viện
     */
    async getTotalUsersCount() {
        console.log(">>> [ADMIN SERVICE] Đang đếm tổng số lượng thành viên hệ thống...");
        try {
            const { count, error } = await supabaseAdmin
                .from('users')
                .select('id', { count: 'exact', head: true }); 

            if (error) {
                console.error(">>> [COUNT USERS ERROR]:", error.message);
                throw error;
            }

            return count || 0;
        } catch (err) {
            console.error("❌ Thất bại tại thuật toán getTotalUsersCount:", err.message);
            throw err;
        }
    }

    /**
     * Truy xuất tiến trình lịch sử đọc của độc giả
     */
    async getUserReadingHistory(userId) {
    console.log(`>>> [READING HISTORY] Đang truy xuất danh sách lịch sử đọc của người dùng: ${userId}`);
    try {
        // 1. Lấy dữ liệu thô từ bảng lịch sử đọc
        const { data: historyData, error: historyError } = await supabaseAdmin
            .from('reading_history')
            .select('id, book_id, last_chapter_id, last_read_position, updated_at')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (historyError) {
            console.error("❌ Lỗi lấy lịch sử đọc thô:", historyError.message);
            throw historyError;
        }

        if (!historyData || historyData.length === 0) return [];

        // 2. Bốc dữ liệu Sách & Chương chuẩn xác theo đúng các trường trên sơ đồ DB của bạn
        // - Bảng books: lấy trường 'title' thay cho 'author' (vì không có cột author)
        // - Bảng chapters: lấy chính xác trường 'chapter_title' (thay vì 'title')
        const { data: allBooks, error: bError } = await supabaseAdmin
            .from('books')
            .select('id, title, cover_url');
            
        const { data: allChapters, error: cError } = await supabaseAdmin
            .from('chapters')
            .select('id, chapter_title, chapter_number');

        if (bError || cError) {
            console.error("❌ Lỗi khi tải danh sách đối chiếu sách/chương:", bError?.message || cError?.message);
        }

        // Tạo bản đồ tra cứu siêu tốc O(1)
        const bookMap = new Map(allBooks?.map(b => [b.id, b]) || []);
        const chapterMap = new Map(allChapters?.map(c => [c.id, c]) || []);

        // 3. Tiến hành trộn (Map) dữ liệu thật
        const mappedData = historyData.map(item => {
            const rawBook = bookMap.get(item.book_id);
            const rawChapter = chapterMap.get(item.last_chapter_id);

            // Cấu trúc lại object để khớp nối hoàn hảo với các thuộc tính Front-end đang hiển thị
            const bookInfo = rawBook ? {
                id: rawBook.id,
                title: rawBook.title,
                cover_url: rawBook.cover_url,
                author: "Tác giả hệ thống" // Vì DB không có cột author, ta gán cứng hoặc lấy tạm email nếu muốn
            } : null;

            const chapterInfo = rawChapter ? {
                id: rawChapter.id,
                title: rawChapter.chapter_title, // Map 'chapter_title' trên DB sang thuộc tính 'title' ở Frontend
                chapter_number: rawChapter.chapter_number
            } : null;

            return {
                id: item.id,
                last_read_position: item.last_read_position,
                updated_at: item.updated_at,
                books: bookInfo,    
                chapters: chapterInfo 
            };
        });

        // Chỉ trả về các bản ghi có dữ liệu sách và chương thật sự tồn tại trên hệ thống
        return mappedData.filter(log => log.books !== null && log.chapters !== null);

        } catch (err) {
            console.error("❌ Thất bại tại hàm getUserReadingHistory:", err.message);
            throw err;
        }
    }


    /**
     * Lấy danh sách các thông báo mới phát hành từ hệ thống
     */
    async getLatestAnnouncements(limit = 3) {
        console.log(`>>> [ANNOUNCEMENT SERVICE] Đang tải ${limit} thông báo mới nhất...`);
        try {
            const { data, error } = await supabaseAdmin
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) {
                console.error("❌ Lỗi truy vấn bảng announcements:", error.message);
                throw error;
            }

            return data || [];
        } catch (err) {
            console.error("❌ Thất bại tại hàm getLatestAnnouncements:", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 🚀 CẬP NHẬT DỮ LIỆU (PUT / UPSERT)
    // =========================================================================

    /**
     * Cập nhật thông tin tài khoản cơ bản thuộc bảng 'users'
     */
    async updateUser(id, updateData) {
        console.log(`>>> [DATABASE UPDATE] Khởi chạy lệnh ghi đè bảng users cho ID: ${id}`);
        const { data, error } = await supabaseAdmin // Đổi từ supabase sang supabaseAdmin
            .from('users')
            .update(updateData)
            .eq('id', id)
            .select();
            
        if (error) {
            console.error("❌ Lỗi ghi bảng users:", error.message);
            throw new Error(error.message);
        }
        return data;
    }

    /**
     * Cập nhật thông tin chi tiết hồ sơ cá nhân thuộc bảng 'profiles' (Sửa bút danh, tiểu sử...)
     */
    async updateProfile(id, profileData) {
        console.log(`>>> [DATABASE UPDATE] Khởi chạy lệnh ghi đè bảng profiles cho ID: ${id}`);
        const { data, error } = await supabaseAdmin // Đổi từ supabase sang supabaseAdmin
            .from('profiles')
            .update(profileData)
            .eq('id', id)
            .select();

        if (error) {
            console.error("❌ Lỗi ghi bảng profiles:", error.message);
            throw new Error(error.message);
        }
        return data;
    }

    /**
     * Ghi nhận hoặc cập nhật tiến trình đọc sách hiện tại của người dùng (Upsert)
     */
    async saveReadingHistory(userId, bookId, chapterId, position = 0) {
        console.log(`>>> [READING HISTORY] Độc giả ${userId} đang lưu tiến trình sách ${bookId}, chương ${chapterId}`);
        try {
            if (!userId || !bookId || !chapterId) {
                throw new Error("Dữ liệu truyền vào bị khuyết (userId, bookId, chapterId)!");
            }

            const { data, error } = await supabaseAdmin
                .from('reading_history')
                .upsert(
                    {
                        user_id: userId,
                        book_id: bookId,
                        last_chapter_id: chapterId,
                        last_read_position: position,
                        updated_at: new Date() 
                    },
                    { onConflict: 'user_id,book_id' } 
                )
                .select();

            if (error) {
                console.error("❌ Lỗi thực thi UPSERT bảng reading_history:", error.message);
                throw error;
            }

            return data[0];
        } catch (err) {
            console.error("❌ Thất bại tại hàm saveReadingHistory:", err.message);
            throw err;
        }
    }

    // =========================================================================
    // 🚀 CÁC TÁC VỤ QUẢN TRỊ / HỆ THỐNG KHÁC (DELETE & AUTH RESET)
    // =========================================================================

    /**
     * Khởi tạo thông báo hệ thống mới (Chỉ dành cho Admin)
     */
    async createAnnouncement(content, adminId) {
        console.log(`>>> [ANNOUNCEMENT SERVICE] Khởi tạo phát hành thông báo từ Admin UID: ${adminId}`);
        try {
            if (!content || content.trim() === '') {
                throw new Error("Nội dung thông báo bắt buộc không được để trống!");
            }

            const { data, error } = await supabaseAdmin
                .from('announcements')
                .insert([
                    {
                        content: content.trim(),
                        created_by: adminId 
                    }
                ])
                .select();

            if (error) {
                console.error("❌ Ghi bảng dữ liệu announcements thất bại:", error.message);
                throw error;
            }

            console.log(">>> [SUCCESS] Thông báo hệ thống đã được lưu và kích hoạt thành công!");
            return data[0];
        } catch (err) {
            console.error("❌ Thất bại tại hàm createAnnouncement:", err.message);
            throw err;
        }
    }

    /**
     * Gửi mail kích hoạt khôi phục mật khẩu thông qua Supabase Auth
     */
    async forgotPassword(email) {
        console.log(`>>> [FORGOT PASSWORD] Đang xử lý yêu cầu khôi phục mật khẩu cho: ${email}`);

        const { data: user, error: dbError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', email.trim())
            .maybeSingle();

        if (dbError) throw new Error(`Lỗi truy vấn cơ sở dữ liệu: ${dbError.message}`);
        if (!user) {
            throw new Error("Email này không tồn tại trong hệ thống thư viện!");
        }

        const { error: authResetError } = await supabaseAdmin.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: 'http://localhost:8081/(auth)/resetpassword', 
        });

        if (authResetError) {
            console.error("❌ Lỗi kích hoạt gửi mail từ Supabase Auth:", authResetError.message);
            throw new Error(`Không thể gửi mail khôi phục: ${authResetError.message}`);
        }

        console.log(`>>> [SUCCESS] Đã kích hoạt lệnh gửi mail đặt lại mật khẩu thành công tới: ${email}`);
        return true;
    }

    /**
     * Đồng bộ ghi đè cấu trúc mật khẩu mới trên cả Auth và DB cục bộ
     */
    async resetPassword(token, newPassword) {
        console.log(`>>> [RESET PASSWORD] Tiến hành ghi đè cấu trúc mật khẩu mới...`);

        if (!token) {
            throw new Error("Mã xác thực bảo mật (Token) trống hoặc đã hết hạn!");
        }

        if (newPassword.length < 6) {
            throw new Error("Mật khẩu mới bắt buộc phải có độ dài từ 6 ký tự trở lên!");
        }

        const { data: authData, error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
            token, 
            { password: newPassword }
        );

        if (authUpdateError) {
            console.error("❌ Đổi mật khẩu trên Supabase Auth thất bại:", authUpdateError.message);
            throw new Error(`Lỗi cập nhật hệ thống xác thực: ${authUpdateError.message}`);
        }

        const supabaseUID = authData.user.id;
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        const { error: dbUpdateError } = await supabaseAdmin
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', supabaseUID);

        if (dbUpdateError) {
            console.error("❌ Lỗi đồng bộ mật khẩu mới vào bảng users:", dbUpdateError.message);
            throw new Error(`Đã đổi mật khẩu Auth, nhưng lỗi cập nhật bảng users: ${dbUpdateError.message}`);
        }

        console.log(`>>> [SUCCESS] Đã đồng bộ đổi mật khẩu mới thành công cho tài khoản ID: ${supabaseUID}`);
        return true;
    }

    /**
     * Xóa đồng bộ một tài khoản ra khỏi hệ thống (Auth -> Profiles -> Users)
     */
    async deleteUser(id) {
        console.log(`>>> [DELETE] Tiến hành xóa đồng bộ User có ID: ${id}`);
        
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authDeleteError) {
            console.warn(`>>> [WARN] Không tìm thấy hoặc không thể xóa User trên Auth: ${authDeleteError.message}`);
        }

        // Thực hiện xóa tuần tự bảng con trước tránh xung đột ràng buộc khóa ngoại (Foreign Key Constraint)
        await supabase.from('profiles').delete().eq('id', id);
        const { error: dbDeleteError } = await supabase.from('users').delete().eq('id', id);
        
        if (dbDeleteError) throw new Error(dbDeleteError.message);
        
        return true;
    }
}

module.exports = new UserService();