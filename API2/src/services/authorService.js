// 📂 Định vị: src/services/authorService.js
const { supabaseAdmin } = require('../configs/supabase');

/**
 * ⚡ Xử lý Bật/Tắt theo dõi tác giả (Toggle Follow)
 * @param {string} readerId - ID người đọc (Độc giả)
 * @param {string} authorId - ID người viết (Tác giả)
 */
const toggleFollow = async (readerId, authorId) => {
    // 🛡️ BẢO VỆ: Chặn trường hợp logic lỗi tự Follow chính bản thân mình
    if (readerId === authorId) {
        throw new Error("Bạn không thể tự theo dõi chính bản thân mình!");
    }

    // 1. Kiểm tra xem độc giả này đã follow tác giả này chưa
    const { data: existing, error: checkError } = await supabaseAdmin
        .from('author_follows')
        .select('id')
        .eq('reader_id', readerId)
        .eq('author_id', authorId)
        .maybeSingle();

    if (checkError) {
        throw new Error(`Lỗi kiểm tra trạng thái tương tác: ${checkError.message}`);
    }

    if (existing) {
        // 2a. Nếu đã tồn tại dòng dữ liệu -> Tiến hành Hủy theo dõi (Delete)
        const { error: deleteError } = await supabaseAdmin
            .from('author_follows')
            .delete()
            .eq('id', existing.id);
            
        if (deleteError) {
            throw new Error(`Lỗi hủy theo dõi gầm DB: ${deleteError.message}`);
        }
        return { success: true, isFollowing: false, message: "Đã hủy theo dõi tác giả thành công." };
    } else {
        // 2b. Nếu chưa tồn tại dòng dữ liệu -> Tiến hành Thêm mới lượt theo dõi (Insert)
        const { error: insertError } = await supabaseAdmin
            .from('author_follows')
            .insert([{ 
                reader_id: readerId, 
                author_id: authorId,
                created_at: new Date().toISOString() // Lưu vết thời gian thực
            }]);
            
        if (insertError) {
            throw new Error(`Lỗi ghi nhận theo dõi gầm DB: ${insertError.message}`);
        }
        return { success: true, isFollowing: true, message: "Đã theo dõi tác giả thành công." };
    }
};

/**
 * 📊 Bốc số lượng Follower thực tế theo thời gian thực (Real-time Count)
 * @param {string} authorId - UID động của tác giả đăng nhập thật
 */
const getFollowerCount = async (authorId) => {
    // 🛡️ BẢO VỆ: Chặn tuyệt đối chuỗi trống hoặc undefined
    if (!authorId || authorId === 'undefined' || authorId === '') {
        console.error("⚠️ [SERVICE WARNING] Cảnh báo: Định danh authorId bị trống khi gọi hàm getFollowerCount.");
        return 0;
    }

    // Truy vấn đếm chính xác số lượng dòng (rows) dựa trên author_id động
    const { count, error } = await supabaseAdmin
        .from('author_follows')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', authorId);
    
    if (error) {
        console.error(`❌ [DB ERROR] Lỗi truy vấn bảng author_follows: ${error.message}`);
        throw error;
    }

    return count || 0;
};

/**
 * 📚 Đếm tổng số lượng Chapter thực tế của tác giả thời gian thực
 * @param {string} authorId - UID động của tác giả đăng nhập thật
 */
const getAuthorChapterCount = async (authorId) => {
    // 🛡️ BẢO VỆ: Chặn chuỗi trống hoặc undefined
    if (!authorId || authorId === 'undefined' || authorId === '') {
        console.error("⚠️ [SERVICE WARNING] Cảnh báo: Định danh authorId bị trống khi gọi hàm getAuthorChapterCount.");
        return 0;
    }

    // Bước 1: Quét bảng 'books' - ĐÃ ĐỒNG BỘ: Dùng cột 'user_id' theo đúng cấu trúc thực tế của bạn
    const { data: books, error: booksError } = await supabaseAdmin
        .from('books')
        .select('id')
        .eq('user_id', authorId);

    if (booksError) {
        console.error(`❌ [DB ERROR] Không thể bốc danh sách truyện của tác giả: ${booksError.message}`);
        throw booksError;
    }

    // Nếu tác giả này chưa có cuốn truyện nào gầm DB, trả về 0 chương lập tức
    if (!books || books.length === 0) {
        return 0; 
    }

    // Gom toàn bộ ID truyện của tác giả vào thành 1 mảng danh sách phẳng
    const bookIds = books.map(book => book.id);

    // Bước 2: Truy cập vào bảng 'chapters' để đếm tất cả các chương
    const { count, error: chaptersError } = await supabaseAdmin
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .in('book_id', bookIds);

    if (chaptersError) {
        console.error(`❌ [DB ERROR] Thất bại khi đếm số lượng dòng gầm bảng chapters: ${chaptersError.message}`);
        throw chaptersError;
    }

    return count || 0;
};

/**
 * 📊 ĐƯỢC BỔ SUNG: Tính tổng số lượt đọc (Views/Reads) trọn đời từ lịch sử reading_logs
 * @param {string} authorId - UID động của tác giả đăng nhập thật
 */
const getAuthorTotalReads = async (authorId) => {
    // 1. Kiểm tra đầu vào chặt chẽ hơn
    if (!authorId || authorId === 'undefined' || authorId === '') return 0;

    try {
        // 🎯 SỬA LỖI Ở ĐÂY: Dùng đúng biến authorId được truyền vào
        const { data: books, error: booksError } = await supabaseAdmin
            .from('books')
            .select('id')
            .eq('user_id', authorId); 

        if (booksError) throw booksError;
        if (!books || books.length === 0) return 0;

        const bookIds = books.map(b => b.id);

        // Bốc danh sách chương theo đúng cột 'book_id' của bảng chapters
        const { data: chapters, error: chaptersError } = await supabaseAdmin
            .from('chapters')
            .select('id')
            .in('book_id', bookIds);

        if (chaptersError) throw chaptersError;
        if (!chapters || chapters.length === 0) return 0;

        const chapterIds = chapters.map(c => c.id);

        // Đếm tổng số dòng log trùng với cụm chapterIds gầm bảng reading_logs (cột chapter_id)
        const { count, error: logsError } = await supabaseAdmin
            .from('reading_logs')
            .select('*', { count: 'exact', head: true })
            .in('chapter_id', chapterIds);

        if (logsError) throw logsError;

        return count || 0;

    } catch (error) {
        console.error("❌ Lỗi đếm lượt đọc gầm Service:", error.message);
        return 0; // Trả về số 0 bảo hiểm chống sập API 500
    }
};

module.exports = { 
    toggleFollow, 
    getFollowerCount, 
    getAuthorChapterCount,
    getAuthorTotalReads // 🔥 Đã xuất bản hàm tính tổng lượt đọc mới tinh
};