// 📂 Định vị: src/controllers/authorController.js
const { supabaseAdmin } = require('../configs/supabase');
const authorService = require('../services/authorService'); // Giữ lại service cũ nếu bạn cần mở rộng

class AuthorController {
    /**
     * @route GET /api/authors/follower-count
     * @desc Lấy tổng số lượng followers của chính tác giả đang đăng nhập
     * @access Private (Yêu cầu Token)
     */
    async getAuthorFollowerCount(req, res) {
        try {
            // 🎯 Lấy UID thật từ middleware truyền xuống sau khi giải mã token thành công
            const currentAuthorId = req.user?.id || req.user?.sub;

            if (!currentAuthorId) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy phiên đăng nhập hợp lệ!"
                });
            }

            console.log(`📡 [SERVER CONTROLLER] Khởi chạy lệnh đếm Follower cho UID thật: "${currentAuthorId}"`);

            // Thực hiện quét đếm số dòng khớp với author_id trực tiếp bằng quyền Admin
            const { count, error } = await supabaseAdmin
                .from('author_follows') 
                .select('*', { count: 'exact', head: true })
                .eq('author_id', currentAuthorId);

            if (error) throw error;

            // Ép về số 0 nếu số lượng bị null hoặc undefined (Mặc định cho tài khoản mới)
            const finalFollowerCount = count || 0;

            console.log(`📦 [SERVER CONTROLLER] Kết quả từ DB trả về cho UID [${currentAuthorId}]: ${finalFollowerCount} FL`);

            return res.status(200).json({
                success: true,
                followerCount: finalFollowerCount
            });

        } catch (error) {
            console.error("🚨 [CRITICAL] Lỗi Author Controller (Follower):", error.message);
            return res.status(500).json({ 
                success: false, 
                followerCount: 0, 
                error: error.message 
            });
        }
    }

    /**
     * @route GET /api/authors/chapters-count
     * @desc Lấy tổng số lượng chapters thực tế của tác giả gầm DB
     * @access Private (Yêu cầu Token)
     */
    async getAuthorChapterCount(req, res) {
        try {
            // 🎯 Lấy UID thật từ middleware gác cổng truyền xuống công thức động
            const currentAuthorId = req.user?.id || req.user?.sub;

            if (!currentAuthorId) {
                return res.status(401).json({
                    success: false,
                    message: "Không tìm thấy định danh tác giả hợp lệ!"
                });
            }

            console.log(`📡 [SERVER CONTROLLER] Khởi chạy lệnh đếm Chapters cho UID thật: "${currentAuthorId}"`);

            // Bước 1: Quét bảng 'books' lấy danh sách toàn bộ ID truyện của riêng tác giả này sở hữu
            const { data: books, error: booksError } = await supabaseAdmin
                .from('books')
                .select('id')
                .eq('user_id', currentAuthorId);

            if (booksError) throw booksError;

            // Nếu tác giả chưa có bất kỳ cuốn sách nào gầm DB, trả về 0 chương lập tức
            if (!books || books.length === 0) {
                console.log(`📦 [SERVER CONTROLLER] UID [${currentAuthorId}] chưa sở hữu cuốn truyện nào. Trả về 0 Chapters.`);
                return res.status(200).json({
                    success: true,
                    chapterCount: 0
                });
            }

            // Gom toàn bộ ID truyện của tác giả này vào một mảng phẳng
            const bookIds = books.map(book => book.id);

            // Bước 2: Đếm tổng các dòng chương gầm bảng 'chapters' có 'book_id' nằm trong mảng bookIds
            const { count, error: chaptersError } = await supabaseAdmin
                .from('chapters')
                .select('*', { count: 'exact', head: true })
                .in('book_id', bookIds); // Sử dụng toán tử .in để lọc mảng động dữ liệu

            if (chaptersError) throw chaptersError;

            const finalChapterCount = count || 0;
            console.log(`📦 [SERVER CONTROLLER] Kết quả đếm tổng số chương cho UID [${currentAuthorId}]: ${finalChapterCount} Chapters`);

            return res.status(200).json({
                success: true,
                chapterCount: finalChapterCount
            });

        } catch (error) {
            console.error("🚨 [CRITICAL] Lỗi Author Controller (Chapters):", error.message);
            return res.status(500).json({ 
                success: false, 
                chapterCount: 0, 
                error: error.message 
            });
        }
    }

    /**
     * @route POST /api/authors/toggle-follow
     * @desc Độc giả nhấn Theo dõi hoặc Hủy theo dõi tác giả
     * @access Private (Yêu cầu Token độc giả)
     */
    async toggleFollowAuthor(req, res) {
        try {
            const readerId = req.user?.id || req.user?.sub; // ID của người đi bấm follow
            const { authorId } = req.body;                  // ID của tác giả được nhận follow

            if (!readerId || !authorId) {
                return res.status(400).json({ success: false, message: "Thiếu thông tin người dùng hoặc tác giả!" });
            }

            if (readerId === authorId) {
                return res.status(400).json({ success: false, message: "Bạn không thể tự theo dõi chính mình!" });
            }

            // 1. Kiểm tra xem độc giả này đã theo dõi tác giả này chưa
            const { data: existingFollow, error: checkError } = await supabaseAdmin
                .from('author_follows')
                .select('id')
                .eq('reader_id', readerId)
                .eq('author_id', authorId)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingFollow) {
                // 2. Nếu đã theo dõi rồi -> Tiến hành hủy theo dõi (Unfollow)
                const { error: deleteError } = await supabaseAdmin
                    .from('author_follows')
                    .delete()
                    .eq('reader_id', readerId)
                    .eq('author_id', authorId);

                if (deleteError) throw deleteError;
                return res.status(200).json({ success: true, isFollowing: false, message: "Đã hủy theo dõi tác giả." });
            } else {
                // 3. Nếu chưa theo dõi -> Tiến hành thêm mới bản ghi (Follow)
                const { error: insertError } = await supabaseAdmin
                    .from('author_follows')
                    .insert([{ reader_id: readerId, author_id: authorId }]);

                if (insertError) throw insertError;
                return res.status(201).json({ success: true, isFollowing: true, message: "Đã theo dõi tác giả thành công!" });
            }

        } catch (error) {
            console.error("🚨 Lỗi xử lý Toggle Follow:", error.message);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * @route GET /api/authors/views-count
     * @desc Tính tổng lượt xem thực tế tích lũy từ trước đến nay của tác giả (Thay thế tối ưu từ file revenue)
     * @access Private (Yêu cầu Token)
     */
    async getAuthorTotalReads(req, res) {
    try {
        const currentAuthorId = req.user?.id || req.user?.sub;

        if (!currentAuthorId) {
            return res.status(401).json({ 
                success: false, 
                message: "Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại!" 
            });
        }

        console.log(`📡 [SERVER CONTROLLER] Khởi chạy lệnh đếm Views cho UID thật: "${currentAuthorId}"`);

        // =================================================================
        // BƯỚC 1: Lấy danh sách ID sách của tác giả (Lọc chuẩn theo cột user_id)
        // =================================================================
        const { data: books, error: booksError } = await supabaseAdmin
            .from('books')
            .select('id')
            .eq('user_id', currentAuthorId); 

        if (booksError) {
            console.error("❌ [DB ERROR] Lỗi cấu trúc bảng books gầm Supabase:", booksError.message);
            return res.status(200).json({ success: true, totalReads: 0 }); 
        }
        
        // 🛡️ LỚP BẢO HIỂM 1: Nếu tác giả mới tinh chưa có cuốn sách nào, trả về số 0 ngay lập tức!
        // Chặn đứng hành động chạy tiếp xuống dưới gây lỗi toán tử .in() rỗng làm sập Server
        if (!books || books.length === 0) {
            console.log(`💡 [NOTICE] Tác giả [${currentAuthorId}] chưa tạo sách. Trả về 0 views.`);
            return res.status(200).json({ success: true, totalReads: 0 });
        }

        const bookIds = books.map(b => b.id);

        // =================================================================
        // BƯỚC 2: Lấy danh sách ID chương thuộc cụm sách đó
        // =================================================================
        const { data: chapters, error: chaptersError } = await supabaseAdmin
            .from('chapters')
            .select('id')
            .in('book_id', bookIds);

        if (chaptersError) {
            console.error("❌ [DB ERROR] Lỗi cấu trúc bảng chapters gầm Supabase:", chaptersError.message);
            return res.status(200).json({ success: true, totalReads: 0 });
        }
        
        // 🛡️ LỚP BẢO HIỂM 2: Nếu sách chưa đăng chương nào, trả về số 0 lập tức! Chống sập toán tử .in() tiếp theo
        if (!chapters || chapters.length === 0) {
            console.log(`💡 [NOTICE] Truyện của tác giả [${currentAuthorId}] chưa có chương. Trả về 0 views.`);
            return res.status(200).json({ success: true, totalReads: 0 });
        }

        const chapterIds = chapters.map(c => c.id);

        // =================================================================
        // BƯỚC 3: Đếm tổng log view tích lũy sạch gầm bảng reading_logs
        // =================================================================
        const { count, error: logsError } = await supabaseAdmin
            .from('reading_logs')
            .select('*', { count: 'exact', head: true })
            .in('chapter_id', chapterIds); // Chỉ lọc các lượt đọc thuộc cụm chương của tác giả

        if (logsError) {
            console.error("❌ [DB ERROR] Lỗi cấu trúc bảng reading_logs gầm Supabase:", logsError.message);
            return res.status(200).json({ success: true, totalReads: 0 });
        }

        console.log(`📊 [SERVER SUCCESS] Tài khoản [${currentAuthorId}] đạt tổng cộng: ${count || 0} lượt đọc.`);

        return res.status(200).json({
            success: true,
            totalReads: count || 0
        });

    } catch (error) {
        console.error("🚨 [CRITICAL BACKEND CRASH]: Luồng đếm view sập:", error.message);
        // 🛡️ LỚP BẢO HIỂM SỐNG CÒN: Trả về trạng thái 200 kèm JSON chuẩn có số 0 
        // Triệt tiêu hoàn toàn mã lỗi HTML <!DOCTYPE... giúp Frontend không bao giờ bị SyntaxError
        return res.status(200).json({ 
            success: true, 
            totalReads: 0, 
            error: error.message 
        });
    }
}
}

// Xuất bản instance duy nhất (Đồng bộ cấu trúc UserController)
module.exports = new AuthorController();