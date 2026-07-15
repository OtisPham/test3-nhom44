// 📂 Định vị: src/services/bookService.js
const { supabaseAdmin } = require('../configs/supabase'); 

// 1. Hàm chèn truyện mới (Hỗ trợ cover_url đẩy vào database)
const insertBookToDatabase = async (bookData) => {
    const { title, genre, file_url, cover_url, email } = bookData;
    console.log(`>>> [SERVICE BOOK] Đang xử lý chèn truyện cho tác giả: ${email}`);

    try {
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', email)
            .maybeSingle();

        if (userError) throw new Error("Lỗi truy vấn tài khoản: " + userError.message);
        if (!user) throw new Error(`Không tìm thấy email ${email} trong bảng users!`);

        const { data: newBook, error: bookError } = await supabaseAdmin
            .from('books')
            .insert([{
                title: title,
                genre: genre,
                file_url: file_url,
                cover_url: cover_url, 
                email: email,
                user_id: user.id
            }])
            .select();

        if (bookError) throw new Error(`Lỗi chèn dữ liệu bảng books: ${bookError.message}`);
        return newBook[0];
    } catch (err) {
        console.error(">>> [CRASH TẠI SERVICE INSERT BOOK]:", err.message);
        throw err;
    }
};

// 2. Hàm lấy danh sách truyện chính chủ của tác giả
const getBooksByEmail = async (email) => {
    console.log(`>>> [SERVICE BOOK] Đang lấy danh sách truyện của: ${email}`);
    const { data, error } = await supabaseAdmin
        .from('books')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Lỗi lấy danh sách truyện: ${error.message}`);
    
    // Kiểm tra nếu không có dữ liệu thì trả về mảng rỗng
    if (!data || data.length === 0) return [];

    // Dùng Promise.all để lấy thêm lượt views cho từng cuốn sách
    const booksWithViews = await Promise.all(
        data.map(async (book) => {
            const views = await getBookViewCount(book.id); // Tính view từ logs
            // Đặt tên là total_views để khớp với Interface BookType ở Frontend
            return { ...book, total_views: views }; 
        })
    );

    return booksWithViews;
};

// 3. Hàm cập nhật truyện cũ
const updateBookInDatabase = async (bookId, email, updateData) => {
    console.log(`>>> [SERVICE BOOK] Tiến hành cập nhật truyện ID: ${bookId} của tác giả: ${email}`);
    
    try {
        const { data, error } = await supabaseAdmin
            .from('books')
            .update({
                title: updateData.title,
                genre: updateData.genre,
                file_url: updateData.file_url,
                cover_url: updateData.cover_url 
            })
            .eq('id', bookId)
            .eq('email', email) 
            .select();

        if (error) throw new Error(`Lỗi cập nhật bảng books: ${error.message}`);
        if (!data || data.length === 0) throw new Error("Truyện không tồn tại hoặc bạn không có quyền chỉnh sửa!");

        return data[0];
    } catch (err) {
        console.error(">>> [CRASH TẠI SERVICE UPDATE BOOK]:", err.message);
        throw err;
    }
};

// 4. Hàm chèn một tập/chương mới vào bảng chapters
const insertChapterToDatabase = async (chapterData) => {
    const { book_id, chapter_number, chapter_title, file_url, isPremiumRequired } = chapterData;
    console.log(`>>> [SERVICE BOOK] Đang tiến hành lưu Chương ${chapter_number} cho đầu truyện ID: ${book_id}. Cần khóa Premium: ${isPremiumRequired}`);

    let packageIdToSave = null;

    if (isPremiumRequired === true) {
        const { data: adminPackage, error: pkgErr } = await supabaseAdmin
            .from('packages')
            .select('id')
            .limit(1)
            .maybeSingle();
        
        if (pkgErr) console.error("⚠️ Lỗi tra cứu gói cước gầm DB:", pkgErr.message);
        if (adminPackage) {
            packageIdToSave = adminPackage.id; 
        }
    }

    const { data: newChapter, error } = await supabaseAdmin
        .from('chapters')
        .insert([{
            book_id,
            chapter_number: parseInt(chapter_number),
            chapter_title,
            file_url,
            package_requirement: packageIdToSave 
        }])
        .select();

    if (error) throw new Error(`Lỗi chèn dữ liệu bảng chapters: ${error.message}`);
    return newChapter[0];
};

// 5. Hàm cập nhật chương cũ
const updateChapterInDatabase = async (chapterId, updateData) => {
    const { chapter_number, chapter_title, file_url, isPremiumRequired } = updateData;
    console.log(`>>> [SERVICE BOOK] Tiến hành cập nhật tập truyện ID: ${chapterId}`);

    let packageIdToSave = null;

    if (isPremiumRequired === true) {
        const { data: adminPackage } = await supabaseAdmin
            .from('packages')
            .select('id')
            .limit(1)
            .maybeSingle();
        
        if (adminPackage) {
            packageIdToSave = adminPackage.id;
        }
    }

    const { data, error } = await supabaseAdmin
        .from('chapters')
        .update({
            chapter_number: parseInt(chapter_number),
            chapter_title,
            file_url,
            package_requirement: packageIdToSave 
        })
        .eq('id', chapterId)
        .select();

    if (error) throw new Error(`Lỗi chỉnh sửa dữ liệu bảng chapters: ${error.message}`);
    return data[0];
};

// 6. Lấy thông tin chi tiết của 1 tập/chương cụ thể
const getChapterDetailById = async (chapterId) => {
    console.log(`>>> [SERVICE BOOK] Đang lấy nội dung của Tập/Chương ID: ${chapterId}`);
    const { data, error } = await supabaseAdmin
        .from('chapters')
        .select('*')
        .eq('id', chapterId)
        .maybeSingle();

    if (error) throw new Error(`Lỗi lấy dữ liệu chương: ${error.message}`);
    if (!data) throw new Error("Tập truyện này không tồn tại hoặc đã bị gỡ bỏ!");
    return data;
};

// 7. Lấy tất cả đầu truyện có trên hệ thống để hiển thị cho Độc giả
const getAllBooksInSystem = async () => {
    try {
        const { data, error } = await supabaseAdmin
            .from('books')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(`Lỗi truy vấn bảng books: ${error.message}`);
        
        // 1. Kiểm tra nếu không có data thì trả về mảng rỗng
        if (!data || data.length === 0) return [];

        // 2. Dùng Promise.all và gọi hàm getBookViewCount cho từng cuốn sách
        const booksWithViews = await Promise.all(
            data.map(async (book) => {
                const views = await getBookViewCount(book.id); // Gọi hàm tính view cực xịn của bạn
                return { ...book, views }; // Gắn biến views vào mỗi object book
            })
        );

        // 3. Trả về dữ liệu đã được nhúng số view
        return booksWithViews;
        
    } catch (err) {
        console.error("Lỗi tại getAllBooksInSystem:", err.message);
        throw err;
    }
};

// Hàm này để lấy chi tiết sách kèm danh sách chương và số lượt xem trực tiếp
const getBookDetailWithChapters = async (bookId) => {
    // 1. Lấy thông tin sách
    const { data: book, error: bookError } = await supabaseAdmin
        .from('books')
        .select('*')
        .eq('id', bookId)
        .maybeSingle();
    
    if (bookError) throw bookError;
    if (!book) throw new Error("Không tìm thấy sách!");

    // 2. TÍCH HỢP HÀM VIEW (Chỗ này là chìa khóa!)
    // Gọi hàm getBookViewCount bạn đã viết sẵn để lấy số view
    const totalViews = await getBookViewCount(bookId);

    // 3. Lấy danh sách chương
    const { data: chapters, error: chapError } = await supabaseAdmin
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });
        
    if (chapError) throw chapError;

    // 4. Trả về object sách đã có trường 'views'
    // Sử dụng spread operator { ...book, views: totalViews } để gộp data
    return { 
        book: { ...book, views: totalViews }, 
        chapters 
    };
};


// --- LOGIC TƯƠNG TÁC LIKE ---
const toggleLikeBook = async (bookId, email) => {
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
    if (!user) throw new Error("Tài khoản không tồn tại!");

    const { data: existingLike } = await supabaseAdmin
        .from('book_likes')
        .select('id')
        .eq('book_id', bookId)
        .eq('user_id', user.id)
        .maybeSingle();

    if (existingLike) {
        await supabaseAdmin.from('book_likes').delete().eq('id', existingLike.id);
        return { isLiked: false };
    } else {
        await supabaseAdmin.from('book_likes').insert([{ book_id: bookId, user_id: user.id }]);
        return { isLiked: true };
    }
};

const getBookLikesStats = async (bookId, email) => {
    const { count } = await supabaseAdmin.from('book_likes').select('*', { count: 'exact', head: true }).eq('book_id', bookId);
    
    let hasLiked = false;
    if (email) {
        const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
        if (user) {
            const { data } = await supabaseAdmin.from('book_likes').select('id').eq('book_id', bookId).eq('user_id', user.id).maybeSingle();
            if (data) hasLiked = true;
        }
    }
    return { totalLikes: count || 0, hasLiked };
};

// --- LOGIC BÌNH LUẬN (COMMENT) ---
const addCommentToBook = async (bookId, email, content, parent_id = null) => {
    const { data: user } = await supabaseAdmin.from('users').select('id').eq('email', email).maybeSingle();
    if (!user) throw new Error("Tài khoản không hợp lệ!");

    const { data, error } = await supabaseAdmin
        .from('book_comments')
        .insert([{ 
            book_id: bookId, 
            user_id: user.id, 
            content, 
            parent_id: parent_id || null 
        }])
        .select();

    if (error) throw error;
    return data[0];
};

const getBookCommentsInSystem = async (bookId) => {
    const { data, error } = await supabaseAdmin
        .from('book_comments')
        .select(`
            id, content, created_at, parent_id,
            users ( email )
        `)
        .eq('book_id', bookId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
};

// Hàm đếm tổng view sạch của 1 cuốn sách từ bảng logs gầm hệ thống
const getBookViewCount = async (bookId) => {
    try {
        const { data: chapters, error: chapErr } = await supabaseAdmin
            .from('chapters')
            .select('id')
            .eq('book_id', bookId);

        if (chapErr) throw chapErr;
        if (!chapters || chapters.length === 0) return 0;

        const chapterIds = chapters.map(c => c.id);

        const { count, error: logErr } = await supabaseAdmin
            .from('reading_logs')
            .select('id', { count: 'exact', head: true }) 
            .in('chapter_id', chapterIds);

        if (logErr) throw logErr;

        return count || 0; 
    } catch (error) {
        console.error("❌ Lỗi tính toán view sách:", error.message);
        return 0;
    }
};

// 🎯 THUẬT TOÁN ĐỒNG BỘ: Tính toán bảng xếp hạng Top View trực tiếp từ logs (RAM Filter)
const getTopViewsBooksService = async (limit = 10) => {
    try {
        // 1. Lấy toàn bộ sách trong hệ thống về trước
        const { data: books, error: bookErr } = await supabaseAdmin
            .from('books')
            .select('*');

        if (bookErr) throw bookErr;
        if (!books || books.length === 0) return [];

        // 2. Chạy vòng lặp tính view cho từng cuốn sách dựa trên logs
        const booksWithViews = await Promise.all(
            books.map(async (book) => {
                const views = await getBookViewCount(book.id);
                return { ...book, views }; // Gán trực tiếp trường views live vào object
            })
        );

        // 3. Sắp xếp giảm dần theo lượt xem (Quyển nhiều view xếp trước) và cắt lấy số lượng giới hạn
        booksWithViews.sort((a, b) => b.views - a.views);
        return booksWithViews.slice(0, limit);

    } catch (error) {
        console.error("❌ Thất bại tại thuật toán getTopViewsBooksService:", error.message);
        throw error;
    }
};
const updateBookByAdmin = async (bookId, updateData) => {
    console.log(`📡 [ADMIN SERVICE] Đang thực hiện ghi đè cập nhật truyện ID: ${bookId}`);
    try {
        if (!bookId) throw new Error("Mã sách (bookId) không hợp lệ hoặc bị trống!");

        // Thực hiện cập nhật trực tiếp vào bảng 'books' của Supabase
        const { data, error } = await supabaseAdmin
            .from('books')
            .update({
                title: updateData.title,
                genre: updateData.genre,
                file_url: updateData.file_url,
                cover_url: updateData.cover_url
            })
            .eq('id', bookId)
            .select();

        if (error) {
            console.error("❌ Lỗi truy vấn Supabase khi update book:", error.message);
            throw error;
        }

        if (!data || data.length === 0) {
            throw new Error("Tác phẩm truyện không tồn tại trên hệ thống hoặc đã bị gỡ bỏ!");
        }

        return data[0];
    } catch (err) {
        console.error("❌ [ADMIN SERVICE CRASH - UPDATE BOOK]:", err.message);
        throw err;
    }
};

/**
 * 9. Admin: Xóa sổ hoàn toàn bất kỳ cuốn sách nào khỏi hệ thống
 */
const deleteBookByAdmin = async (bookId) => {
    console.log(`📡 [ADMIN SERVICE] Đang bắt đầu quy trình xóa sổ truyện ID: ${bookId}`);
    try {
        if (!bookId) throw new Error("Mã sách (bookId) không hợp lệ!");

        // 🛠️ BỔ SUNG: Xóa sạch toàn bộ các chương thuộc về cuốn sách này trước
        console.log(`⏳ [ADMIN SERVICE] 1. Đang dọn dẹp các chương thuộc truyện ID: ${bookId}`);
        const { error: chapterError } = await supabaseAdmin
            .from('chapters')
            .delete()
            .eq('book_id', bookId); // Tìm tất cả hàng có book_id trùng khớp để xóa

        if (chapterError) {
            console.error("❌ Lỗi khi dọn dẹp các chương liên quan:", chapterError.message);
            throw new Error(`Không thể xóa các chương liên quan: ${chapterError.message}`);
        }

        // 2. Sau khi dọn sạch chương, tiến hành xóa cuốn sách khỏi Database
        console.log(`⏳ [ADMIN SERVICE] 2. Tiến hành xóa thông tin đầu sách ID: ${bookId}`);
        const { data, error } = await supabaseAdmin
            .from('books')
            .delete()
            .eq('id', bookId)
            .select();

        if (error) throw error;
        if (!data || data.length === 0) throw new Error("Truyện không tồn tại hoặc đã bị xóa từ trước!");

        console.log(`✅ [ADMIN SERVICE] Đã gỡ bỏ thành công truyện và các chương liên quan.`);
        return true;
    } catch (err) {
        console.error("❌ [ADMIN SERVICE CRASH - DELETE BOOK]:", err.message);
        throw err;
    }
};

//10. Lấy thông tin hồ sơ/tiểu sử tác giả kèm thông tin user gốc

const getAuthorProfileByUserId = async (userId) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('author_profiles')
            .select(`
                bio, pseudonym, website_url,
                users ( name, email, subscription_plan )
            `)
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    } catch (err) {
        console.error("❌ Lỗi lấy hồ sơ tác giả:", err.message);
        throw err;
    }
};

/**
 * 11. Cập nhật hoặc tạo mới tiểu sử tác giả (Cơ chế Upsert găm theo ID)
 */
const upsertAuthorProfile = async (userId, profileData) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('author_profiles')
            .upsert({
                id: userId, // Dùng chung ID với bảng users
                pseudonym: profileData.pseudonym,
                bio: profileData.bio,
                website_url: profileData.website_url
            })
            .select();

        if (error) throw error;
        return data[0];
    } catch (err) {
        console.error("❌ Lỗi cập nhật hồ sơ tác giả:", err.message);
        throw err;
    }
};
const getTotalBooksCount = async () => {
    console.log(">>> [ADMIN SERVICE] Đang tính toán tổng số lượng đầu sách trên kệ...");
    try {
        const { count, error } = await supabaseAdmin
            .from('books')
            .select('id', { count: 'exact', head: true }); // head: true giúp chỉ lấy count, không bốc data sách

        if (error) {
            console.error(">>> [COUNT BOOKS ERROR]:", error.message);
            throw error;
        }

        return count || 0;
    } catch (err) {
        console.error("❌ Thất bại tại thuật toán getTotalBooksCount:", err.message);
        throw err;
    }
};
const getTotalChaptersCount = async () => {
    console.log(">>> [ADMIN SERVICE] Đang tính toán tổng số lượng chương truyện toàn hệ thống...");
    try {
        const { count, error } = await supabaseAdmin
            .from('chapters')
            .select('id', { count: 'exact', head: true }); // head: true giúp chỉ lấy số lượng đếm, tiết kiệm băng thông

        if (error) {
            console.error(">>> [COUNT CHAPTERS ERROR]:", error.message);
            throw error;
        }

        return count || 0;
    } catch (err) {
        console.error("❌ Thất bại tại thuật toán getTotalChaptersCount:", err.message);
        throw err;
    }
};
const deleteChapterByAdmin = async (chapterId) => {
    console.log(`📡 [ADMIN SERVICE] Đang thực hiện xóa chương ID: ${chapterId}`);
    
    // Sử dụng chính xác thực thể kết nối (ví dụ: supabaseAdmin hoặc supabase) 
    // đang chạy thành công ở các hàm xóa sách trong file này của bạn
    const { data, error } = await supabaseAdmin
        .from('chapters') 
        .delete()
        .eq('id', chapterId);

    if (error) throw error;
    return true;
};
//bảo thêm
const getAuthorProfileByBookId = async (bookId) => {
    try {
        // 1. Lấy user_id từ sách
        const { data: book, error: bookErr } = await supabaseAdmin
            .from('books')
            .select('user_id')
            .eq('id', bookId)
            .maybeSingle();

        if (bookErr) throw bookErr;
        if (!book || !book.user_id) return null; // Trả về null nếu sách không có user_id

        // 2. Thử lấy dữ liệu từ bảng profiles trước
        const { data: authorProfile, error: authorErr } = await supabaseAdmin
            .from('profiles')
            .select(`
                pseudonym, 
                bio, 
                website_url,
                users ( name, email )
            `) 
            .eq('id', book.user_id)
            .maybeSingle();

        if (authorErr) throw authorErr;

        // Nếu tìm thấy hồ sơ tác giả
        if (authorProfile) {
            return {
                pseudonym: authorProfile.pseudonym || '',
                bio: authorProfile.bio || '',
                website_url: authorProfile.website_url || '',
                name: authorProfile.users?.name || 'Tác giả ẩn danh',
                email: authorProfile.users?.email || ''
            };
        }

        // 🔄 CƠ CHẾ DỰ PHÒNG: Nếu profiles trống, lấy thẳng từ bảng users để cứu vớt (Tránh lỗi 404)
        const { data: fallbackUser, error: userErr } = await supabaseAdmin
            .from('users')
            .select('name, email')
            .eq('id', book.user_id)
            .maybeSingle();

        if (!userErr && fallbackUser) {
            return {
                pseudonym: '', // Chưa có bút danh
                bio: 'Tác giả này chưa cập nhật tiểu sử.',
                website_url: '',
                name: fallbackUser.name,
                email: fallbackUser.email
            };
        }

        return null;
    } catch (error) {
        console.error("❌ Lỗi Service:", error.message);
        throw error;
    }
};

module.exports = { 
    insertBookToDatabase, 
    getBooksByEmail, 
    updateBookInDatabase,
    insertChapterToDatabase,
    updateChapterInDatabase, 
    getChapterDetailById,
    getAllBooksInSystem,
    getBookDetailWithChapters,
    toggleLikeBook, 
    getBookLikesStats, 
    addCommentToBook,
    getBookCommentsInSystem,
    getBookViewCount,
    getTopViewsBooksService,
    updateBookByAdmin,
    deleteBookByAdmin,
    getAuthorProfileByUserId,
    upsertAuthorProfile,
    getTotalBooksCount,
    getTotalChaptersCount,
    deleteChapterByAdmin,
    getAuthorProfileByBookId
};