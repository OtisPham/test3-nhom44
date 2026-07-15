const { supabaseAdmin } = require('../configs/supabase');

/**
 * Service xử lý bình luận và phản hồi cho tác giả
 * Đã bổ sung cơ chế kiểm tra tính toàn vẹn dữ liệu UUID
 */
const commentService = {
    
    /**
     * Lấy toàn bộ bình luận cho một cuốn sách (bao gồm tên người bình luận)
     */
    getCommentsByBook: async (authorId) => {
    // 1. Lấy sách của tác giả
    const { data: myBooks } = await supabaseAdmin
        .from('books')
        .select('id')
        .eq('user_id', authorId);
    
    const bookIds = myBooks.map(b => b.id);

    // 2. Lấy bình luận VÀ KẾT HỢP TÊN SÁCH (JOIN)
    const { data, error } = await supabaseAdmin
        .from('book_comments')
        .select(`
            id, content, created_at, parent_id, book_id,
            users(name),
            books(title) 
        `)
        .in('book_id', bookIds)
        .order('created_at', { ascending: true });

    if (error) throw error;

    // 3. Map lại dữ liệu để FE dễ dùng
    return data.map(c => ({
        ...c,
        reader_name: c.users?.name || "Người dùng",
        book_title: c.books?.title || "Không rõ tên sách" // Lấy tên sách từ bảng books
    }));
},

    /**
     * Thêm phản hồi của Tác giả: Tự động truy vết bookId, làm sạch nội dung và kiểm tra UUID
     */
    addAuthorReply: async (authorId, parentId, content) => {
        // 1. Kiểm tra đầu vào căn bản
        if (!authorId || !parentId || !content || content.trim() === "") {
            throw new Error("Dữ liệu phản hồi không hợp lệ! Vui lòng kiểm tra lại ID hoặc nội dung.");
        }

        // 2. Kiểm tra định dạng UUID (Chặn lỗi 22P02 trước khi gửi xuống DB)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(authorId) || !uuidRegex.test(parentId)) {
            throw new Error("ID định dạng không hợp lệ (yêu cầu UUID 36 ký tự)!");
        }

        // 3. Truy vấn book_id của bình luận gốc
        const { data: parentComment, error: parentErr } = await supabaseAdmin
            .from('book_comments')
            .select('book_id')
            .eq('id', parentId)
            .maybeSingle();

        if (parentErr) {
            console.error("❌ [DB PARENT LOOKUP ERROR]:", parentErr);
            throw new Error("Lỗi truy vấn bình luận gốc!");
        }
        
        if (!parentComment) {
            throw new Error("Bình luận gốc không tồn tại hoặc đã bị xóa!");
        }

        // 4. Chuẩn bị Payload để Insert
        const payload = { 
            book_id: parentComment.book_id, 
            user_id: authorId, 
            content: content.trim(), 
            parent_id: parentId 
        };

        console.log("🚀 [DB INSERTING]:", payload);

        // 5. Insert dữ liệu
        const { data, error } = await supabaseAdmin
            .from('book_comments')
            .insert([payload])
            .select('id, book_id, parent_id, content, created_at');

        if (error) {
            console.error("❌ [DB INSERT ERROR]:", error);
            // Xử lý lỗi ForeignKey (23503) cụ thể
            if (error.code === '23503') {
                throw new Error("Lỗi dữ liệu: User ID hoặc Book ID không tồn tại trong hệ thống.");
            }
            throw new Error("Lỗi lưu phản hồi vào Database: " + error.message);
        }

        return data[0];
    }
};

module.exports = commentService;