import { supabase } from '../lib/supabase'; // Quan trọng: Import cấu hình supabase đã fix key eyJ...

// Đảm bảo IP này khớp với IP máy tính của Chủ Tịch
const API_URL = 'http://localhost:3000/api'; 

export const apiService = {
    // 1. Hàm bổ trợ gửi request - Đã tích hợp lấy Token từ Supabase
    async request(endpoint, options = {}) {
        // LẤY SESSION HIỆN TẠI TỪ SUPABASE
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token; 
        
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // Nếu có token thì đính vào Header Authorization
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...options.headers,
        };

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            
            // Kiểm tra xem phản hồi có phải JSON không
            const contentType = response.headers.get("content-type");
            let data;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                data = { message: await response.text() };
            }

            if (!response.ok) {
                throw new Error(data.message || 'Lỗi kết nối API');
            }
            return data;
        } catch (error) {
            console.error('API Error:', error.message);
            throw error;
        }
    },

    // 2. Chức năng Đăng ký (Gửi sang Backend Node.js của bạn)
    async register(name, email, password) {
        return await this.request('/users', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
    },

    // 3. Chức năng Đăng nhập 
    async login(email, password) {
        return await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    },

    // 🚀 4. CHỨC NĂNG MỚI BỔ SUNG: QUÊN MẬT KHẨU
    // Gọi hàm trung gian `this.request` để gửi email lên cổng `/auth/forgot-password` của Backend Node.js
    async forgotPassword(email) {
        return await this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    },
    async resetPassword(token, newPassword) {
        return await this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    },

    // 5. Lấy danh sách Users
    async getUsers() {
        return await this.request('/users', { method: 'GET' });
    },

    // 6. Đăng xuất
    async logout() {
        // Gọi hàm sign out của Supabase để xóa sạch session
        await supabase.auth.signOut();
    }
};