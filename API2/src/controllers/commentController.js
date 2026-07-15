const commentService = require('../services/commentService');

const commentController = {
    // 1. Bạn đang thiếu hàm này (hoặc viết sai tên)
    getAuthorBookComments: async (req, res) => {
    try {
        console.log("DEBUG: Controller nhận request từ:", req.user.id);
        const data = await commentService.getCommentsByBook(req.user.id);
        
        // KIỂM TRA DỮ LIỆU TRƯỚC KHI TRẢ VỀ
        if (!data) {
            return res.status(200).json({ success: true, data: [] });
        }
        
        return res.status(200).json({ success: true, data: data });
    } catch (error) {
        console.error("DEBUG: CATCH LỖI TẠI CONTROLLER:", error);
        // ĐẢM BẢO KHÔNG TRẢ VỀ CHÍNH ERROR OBJECT ĐỂ TRÁNH LỖI SERIALIZE
        return res.status(500).json({ success: false, message: "Lỗi nội bộ server" });
    }
},
    // 2. Hàm này đã có sẵn trong object của bạn
    replyToComment: async (req, res) => {
        try {
            const { parent_id, content } = req.body;
            const authorId = req.user?.id;
            const result = await commentService.addAuthorReply(authorId, parent_id, content);
            res.status(200).json({ success: true, data: result });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = commentController;