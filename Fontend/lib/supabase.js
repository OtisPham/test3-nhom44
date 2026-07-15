import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = 'https://xvnmhvuxfurvhqgopjiz.supabase.co';

// ⚠️ CHÚ Ý QUAN TRỌNG CỦA CHỦ TỊCH: 
// Hãy vào Dashboard Supabase -> Project Settings -> API -> Lấy đúng chuỗi "anon" "public" key gán vào đây.
// KHÔNG ĐƯỢC dùng key "service_role" ở Frontend để tránh bị hack sập Database!
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bm1odnV4ZnVydmhxZ29waml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4ODM0MzAsImV4cCI6MjA5MTQ1OTQzMH0.qDxUutDaNBOHcI33PcNZMYlF968grY_JeJHuvfWM3O0'; 

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Ép cứng lưu session an toàn: Web dùng localStorage, Mobile dùng AsyncStorage
    storage: Platform.OS === 'web' 
      ? (typeof window !== 'undefined' ? window.localStorage : undefined) 
      : AsyncStorage,
    
    autoRefreshToken: true, // Tự động làm mới token khi hết hạn
    persistSession: true,   // Giữ trạng thái đăng nhập khi tắt/mở app hoặc reload web
    detectSessionInUrl: Platform.OS === 'web', // Chỉ bật quét link URL xác thực trên nền Web
  },
  // 🔥 ĐÃ BỎ LAYER GLOBAL HEADERS: 
  // Không cấu hình cố định 'Content-Type': 'application/json' ở đây nữa để né lỗi nghẽn mạch/treo luồng khi upload file Storage (PDF/Image)
});