// 📂 Định vị: src/controllers/bookController.js
const bookService = require('../services/bookService');
const { supabaseAdmin } = require('../configs/supabase'); // Khai báo admin kết nối Supabase gầm hệ thống

// 1. Tạo truyện mới 
const createBookInfo = async (req, res) => {
    try {
        const { title, genre, file_url, cover_url } = req.body;
        const verifiedEmail = req.user?.email;
        console.log(`>>> [CONTROLLER BOOK] Nhận request đăng truyện từ email: ${verifiedEmail}`);

        if (!title || !file_url || !verifiedEmail) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin đầu vào bắt buộc!" });
        }

        const data = await bookService.insertBookToDatabase({ 
            title, genre, file_url, cover_url, email: verifiedEmail 
        });

        return res.status(200).json({ success: true, message: "Tác phẩm truyện đã lên kệ!", data: data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Lấy danh sách truyện của tôi
const getMyBooks = async (req, res) => {
    try {
        const email = req.user?.email; 
        const books = await bookService.getBooksByEmail(email);
        return res.status(200).json({ success: true, data: books });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Chỉnh sửa truyện của tôi
const updateMyBook = async (req, res) => {
    try {
        const { id } = req.params; 
        const email = req.user?.email;
        const { title, genre, file_url, cover_url } = req.body;

        const updatedBook = await bookService.updateBookInDatabase(id, email, { title, genre, file_url, cover_url });
        return res.status(200).json({ success: true, message: "Cập nhật truyện thành công!", data: updatedBook });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Controller tiếp nhận request đăng chương mới từ Frontend gửi lên
const createChapterInfo = async (req, res) => {
    try {
        const { book_id, chapter_number, chapter_title, file_url, isPremiumRequired } = req.body;

        if (!book_id || !chapter_number || !chapter_title || !file_url) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đủ: Truyện, Số tập/chương, Tên chương và File PDF!" });
        }

        const data = await bookService.insertChapterToDatabase({ 
            book_id, 
            chapter_number: parseInt(chapter_number), 
            chapter_title, 
            file_url,
            isPremiumRequired: isPremiumRequired === true 
        });

        return res.status(200).json({
            success: true,
            message: "Tập/Chương mới đã được đăng tải lên kệ thành công!",
            data: data
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Cho phép Tác giả sửa thông tin chương cũ
const updateChapterInfo = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const { chapter_number, chapter_title, file_url, isPremiumRequired } = req.body;

        if (!chapterId || !chapter_number || !chapter_title || !file_url) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin cập nhật chương bắt buộc!" });
        }

        const data = await bookService.updateChapterInDatabase(chapterId, {
            chapter_number: parseInt(chapter_number),
            chapter_title,
            file_url,
            isPremiumRequired: isPremiumRequired === true
        });

        return res.status(200).json({
            success: true,
            message: "Cập nhật thay đổi thông tin tập truyện thành công!",
            data: data
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getChapterDetail = async (req, res) => {
    try {
        const { chapterId } = req.params;
        const data = await bookService.getChapterDetailById(chapterId);
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// Hàm public: Bốc toàn bộ danh sách truyện nhả về cho Độc giả đọc ở trang chủ
const getAllBooks = async (req, res) => {
    try {
        const books = await bookService.getAllBooksInSystem();
        return res.status(200).json({ success: true, data: books });
    } catch (error) {
        console.error(">>> [CONTROLLER ERROR]:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔥 Hàm lấy chi tiết truyện có tích hợp đếm view tự động từ logs
const getBookDetail = async (req, res) => {
    try {
        const { id } = req.params; 
        
        const data = await bookService.getBookDetailWithChapters(id);
        
        if (!data || !data.book) {
            return res.status(404).json({ success: false, message: "Tác phẩm không tồn tại!" });
        }

        // 🎯 ĐẾM VIEW REAL-TIME TỪ READING_LOGS:
        let totalViews = 0;
        if (data.chapters && data.chapters.length > 0) {
            const chapterIds = data.chapters.map(c => c.id);

            const { count, error: logErr } = await supabaseAdmin
                .from('reading_logs')
                .select('id', { count: 'exact', head: true })
                .in('chapter_id', chapterIds);

            if (!logErr && count) {
                totalViews = count;
            }
        }

        data.book.views = totalViews;
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const handleLikeToggle = async (req, res) => {
    try {
        const { bookId } = req.body;
        const email = req.user?.email; 
        const result = await bookService.toggleLikeBook(bookId, email);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getLikeStats = async (req, res) => {
    try {
        const { bookId } = req.params;
        const email = req.user?.email; 
        const stats = await bookService.getBookLikesStats(bookId, email);
        return res.status(200).json({ success: true, data: stats });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const createComment = async (req, res) => {
    try {
        const { bookId, content, parentId } = req.body; 
        const email = req.user?.email;
        if (!content || content.trim() === '') return res.status(400).json({ success: false, message: "Nội dung trống!" });

        const comment = await bookService.addCommentToBook(bookId, email, content.trim(), parentId);
        return res.status(200).json({ success: true, message: "Đã gửi!", data: comment });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getBookComments = async (req, res) => {
    try {
        const { bookId } = req.params;
        const comments = await bookService.getBookCommentsInSystem(bookId);
        return res.status(200).json({ success: true, data: comments });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * 🛡️ API TRUNG TÂM: Tiếp nhận tín hiệu đọc truyện hợp lệ và lưu vết chống Cheat
 */
const trackValidReadingLog = async (req, res) => {
    try {
        const { chapterId, dwellTime, scrollDepth } = req.body;
        const userId = req.user?.id; 

        if (!userId) {
            return res.status(401).json({ success: false, message: "Phiên làm việc không hợp lệ, vui lòng đăng nhập!" });
        }

        // 🛡️ ANTI-CHEAT: Điều kiện thời gian ngâm trang (Ví dụ: tối thiểu 3 giây)
        const timeSpent = parseInt(dwellTime) || 0;
        if (timeSpent < 3 && timeSpent !== 30) {
            return res.status(200).json({ success: false, code: "CHEAT_FILTERED", message: "Chưa đủ điều kiện hành vi!" });
        }

        // 🔎 KIỂM TRA TRẠNG THÁI CHƯƠNG TRUYỆN
        const { data: chapter, error: chapErr } = await supabaseAdmin
            .from('chapters')
            .select('package_requirement') 
            .eq('id', chapterId)
            .maybeSingle();

        const isVip = chapter && chapter.package_requirement ? true : false;

        if (chapErr || !chapter || !isVip) {
            return res.status(200).json({ 
                success: false, 
                message: "Chương truyện miễn phí, không đưa vào bể doanh thu trả phí." 
            });
        }

        // 🛡️ ANTI-CHEAT: Giới hạn duy nhất 1 lượt đọc/chương/tháng của cơ chế doanh thu Nhóm 44
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: existingLog } = await supabaseAdmin
            .from('reading_logs')
            .select('id')
            .eq('user_id', userId)
            .eq('chapter_id', chapterId)
            .gt('created_at', startOfMonth.toISOString()) 
            .limit(1)
            .maybeSingle();

        if (existingLog) {
            return res.status(200).json({ success: false, code: "DUPLICATE_READ", message: "Độc giả đã đọc chương này trong tháng!" });
        }

        // ✅ Ghi nhận lượt đọc hợp lệ
        const { data, error } = await supabaseAdmin
            .from('reading_logs')
            .insert([{
                user_id: userId,
                chapter_id: chapterId,
                dwell_time_seconds: timeSpent,
                scroll_depth_percent: parseInt(scrollDepth) || 0
            }])
            .select();

        if (error) throw error;
        
        return res.status(200).json({ success: true, message: "Lượt đọc hợp lệ đã được ghi nhận!", data: data[0] });

    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔄 Gợi ý truyện dựa theo thể loại hay đọc nhất
const getRecommendedBooks = async (req, res) => {
    try {
        const userId = req.user?.id; 

        const { data: userLogs, error: logErr } = await supabaseAdmin
            .from('reading_logs')
            .select('chapters(books(genre, user_id))')
            .eq('user_id', userId)
            .limit(20);

        if (logErr || !userLogs || userLogs.length === 0) {
            const { data: topBooks } = await supabaseAdmin.from('books').select('*').limit(5);
            return res.status(200).json({ success: true, data: topBooks, message: "Gợi ý truyện hot cho bạn" });
        }

        const genreCounts = {};
        userLogs.forEach(log => {
            const genre = log.chapters?.books?.genre;
            if (genre) genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        });

        const favoriteGenre = Object.keys(genreCounts).reduce((a, b) => genreCounts[a] > genreCounts[b] ? a : b);

        const { data: recommended } = await supabaseAdmin
            .from('books')
            .select('*')
            .eq('genre', favoriteGenre)
            .limit(5);

        return res.status(200).json({ success: true, data: recommended });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔄 Gợi ý chương tiếp theo hoặc truyện cùng tác giả
const getNextReadingSuggestion = async (req, res) => {
    try {
        const { currentBookId, currentChapterNum, authorId } = req.query;

        const { data: nextChapter } = await supabaseAdmin
            .from('chapters')
            .select('id, chapter_number, chapter_title')
            .eq('book_id', currentBookId)
            .eq('chapter_number', parseInt(currentChapterNum) + 1)
            .single();

        if (nextChapter) {
            return res.status(200).json({ 
                success: true, 
                type: 'NEXT_CHAPTER', 
                data: nextChapter,
                message: "Mời bạn đọc tập tiếp theo" 
            });
        }

        const { data: otherBooks } = await supabaseAdmin
            .from('books')
            .select('id, title, chapters(id, chapter_title)')
            .eq('user_id', authorId)
            .neq('id', currentBookId) 
            .limit(3);

        return res.status(200).json({ 
            success: true, 
            type: 'OTHER_BOOK', 
            data: otherBooks,
            message: "Khám phá thêm tác phẩm từ tác giả này"
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// 🔥 ĐỒNG BỘ ĐỒNG NHẤT: Hàm xử lý chính cho route /api/books/top-views
const getTopViewsBooks = async (req, res) => {
    try {
        // Gọi qua tầng Service để lấy dữ liệu thống kê lượt xem chuẩn xác nhất
        const books = await bookService.getTopViewsBooksService();
        return res.status(200).json({ success: true, data: books });
    } catch (error) {
        console.error("❌ Lỗi tại getTopViewsBooks Controller:", error.message);
        return res.status(500).json({ 
            success: false, 
            message: "Internal Server Error", 
            error: error.message 
        });
    }
};
const adminEditBook = async (req, res) => {
    try {
        const bookId = req.params.id; // Lấy chính xác tham số ':id' từ URL của Route
        const updateData = req.body;  // Lấy data JSON chỉnh sửa từ Frontend gửi lên

        console.log(`📡 [ADMIN CONTROLLER] Nhận yêu cầu chỉnh sửa sách ID: ${bookId}`);
        console.log(`📦 Data body nhận được:`, updateData);

        // Gọi sang tầng Service xử lý database Supabase
        const updatedBook = await bookService.updateBookByAdmin(bookId, updateData);

        return res.status(200).json({
            success: true,
            message: "Cập nhật thông tin tác phẩm lên hệ thống thành công!",
            data: updatedBook
        });

    } catch (err) {
        console.error("❌ [ADMIN CONTROLLER CRASH - adminEditBook]:", err.message);
        return res.status(500).json({
            success: false,
            message: "Lỗi xử lý cập nhật sách tại hệ thống: " + err.message
        });
    }
};

/**
 * Admin: Tiếp nhận yêu cầu xóa bỏ hoàn toàn cuốn sách
 */
const adminDeleteBook = async (req, res) => {
    try {
        // Lấy chính xác biến 'id' từ route ':id'
        const { id } = req.params; 

        // Truyền đúng biến 'id' vào hàm service để xử lý database
        await bookService.deleteBookByAdmin(id);
        
        return res.status(200).json({ 
            success: true, 
            message: "Admin đã xóa cuốn sách này ra khỏi hệ thống thành công! ❌" 
        });
    } catch (error) {
        console.error("❌ Lỗi tại adminDeleteBook controller:", error.message);
        return res.status(500).json({ success: false, message: "Lỗi Admin xóa sách: " + error.message });
    }
};

/**
 * Lấy thông tin tiểu sử cá nhân của tác giả đang đăng nhập
 */
const getMyProfile = async (req, res) => {
    try {
        const userId = req.user?.id; // Lấy từ authMiddleware sau khi giải mã Token
        const profile = await bookService.getAuthorProfileByUserId(userId);
        
        return res.status(200).json({ success: true, data: profile });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


const updateMyProfile = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { pseudonym, bio, website_url } = req.body;

        const updatedProfile = await bookService.upsertAuthorProfile(userId, {
            pseudonym, bio, website_url
        });

        return res.status(200).json({ 
            success: true, 
            message: "Cập nhật hồ sơ tác giả thành công! 📝", 
            data: updatedProfile 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
const getBookDetailWithChapters = async (req, res) => {
    try {
        const data = await bookService.getBookDetailWithChapters(req.params.id);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Admin thêm nhanh chương mới
const adminAddChapter = async (req, res) => {
    try {
        const data = await bookService.insertChapterToDatabase(req.body);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Admin cập nhật chương (Bật/tắt Premium)
const adminUpdateChapter = async (req, res) => {
    try {
        const data = await bookService.updateChapterInDatabase(req.params.chapterId, req.body);
        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 4. Admin xóa chương riêng lẻ
const adminDeleteChapter = async (req, res) => {
    try {
        const { chapterId } = req.params; // Chuẩn theo route :chapterId từ frontend gửi lên

        if (!chapterId || chapterId === 'undefined') {
            return res.status(400).json({ 
                success: false, 
                message: "Không tìm thấy mã chương (chapterId) hợp lệ." 
            });
        }

        console.log(`📡 [ADMIN CONTROLLER] Yêu cầu xóa chapter: ${chapterId}`);

        // 🚀 Gọi sang tầng Service (Nơi chứa instance Supabase chuẩn đang chạy được)
        await bookService.deleteChapterByAdmin(chapterId);

        return res.status(200).json({ 
            success: true, 
            message: "Đã xóa vĩnh viễn chương này khỏi hệ thống thành công. ✨" 
        });

    } catch (err) {
        console.error("❌ Lỗi tại controller adminDeleteChapter:", err.message);
        return res.status(500).json({ 
            success: false, 
            message: "Lỗi hệ thống khi xóa chương: " + err.message 
        });
    }
};
const getAuthorProfile = async (req, res) => {
    try {
        const { bookId } = req.params; // Lấy ID sách từ URL
        
        // Gọi sang Service (hàm chúng ta vừa sửa)
        const author = await bookService.getAuthorProfileByBookId(bookId);
        
        if (!author) {
            return res.status(404).json({ success: false, message: "Không tìm thấy thông tin tác giả cho cuốn sách này." });
        }
        
        return res.status(200).json({ success: true, data: author });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};


module.exports = { 
    createBookInfo, 
    getMyBooks, 
    updateMyBook,
    createChapterInfo,
    updateChapterInfo, 
    getChapterDetail,
    getAllBooks,
    getBookDetail, 
    handleLikeToggle, 
    getLikeStats, 
    createComment, 
    getBookComments,
    trackValidReadingLog,
    getRecommendedBooks,
    getNextReadingSuggestion,
    getTopViewsBooks,
    adminEditBook,
    adminDeleteBook,
    getMyProfile,
    updateMyProfile,
    getBookDetailWithChapters,
    adminAddChapter,
    adminUpdateChapter,
    adminDeleteChapter,
    getAuthorProfile
};
