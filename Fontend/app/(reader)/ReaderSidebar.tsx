// 📂 Định vị file: app/(reader)/ReaderSidebar.tsx
import React, { useState } from 'react'; 
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'; 
import { useRouter } from 'expo-router'; // Chỉ giữ lại dùng cho lúc Đăng xuất
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
// Import đầy đủ các icon cho tất cả các trang
import { Home, Search, BarChart2, History, Award, BookOpen, User, LogOut } from 'lucide-react-native';

// 🚀 ĐỒNG BỘ ĐỘC QUYỀN: Triệu hồi chú dê núi phát sáng gác cổng ma thuật khi Đăng xuất
import GlowLoading from '../../components/GlowLoading';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

// ✅ SỬA LỖI 1: Nhận biến activeTab và setActiveTab từ Props
export default function ReaderSidebar({ activeTab, setActiveTab }: SidebarProps) {
  const router = useRouter();
  const { logout: clearNodeAuth, user } = useAuth(); // Lấy thông tin user từ AuthContext

  const [isLoggingOut, setIsLoggingOut] = useState(false); 

  // ✅ SỬA LỖI 2: Dùng activeTab để kiểm tra thay vì dùng usePathname()
  const isActive = (path: string) => activeTab === path;

  // Hàm bổ trợ: Tự động lấy 2 chữ cái đầu của tên tài khoản (Ví dụ: "Minh Anh" -> "MA")
  const getInitials = (name: string) => {
    if (!name) return "??";
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // 🛠️ HÀM ĐĂNG XUẤT TÍCH HỢP CON DÊ LOADING
  const handleLogout = async () => {
    if (isLoggingOut) return; 

    try {
      console.log("🏃‍♂️ Đang giải phóng Token và gọi dê gác cổng giải phóng phiên đăng nhập...");
      setIsLoggingOut(true);

      const { error } = await supabase.auth.signOut();
      if (error) console.error("❌ Lỗi Supabase SignOut:", error.message);
      
      if (clearNodeAuth) {
        await clearNodeAuth();
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      if (Platform.OS === 'web') {
        localStorage.removeItem('userToken');
        localStorage.clear(); 
        window.location.href = '/(auth)/login';
      } else {
        router.replace('/(auth)/login');
      }
    } catch (err) {
      console.error("❌ Sập luồng đăng xuất, kích hoạt cơ chế dự phòng khẩn cấp:", err);
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.href = '/(auth)/login';
      } else {
        router.replace('/(auth)/login');
      }
    } finally {
      setIsLoggingOut(false); 
    }
  };

  return (
    <View style={styles.sidebar}>
      {/* Upper Section: Logo & Toàn bộ danh sách Menu điều hướng */}
      <View style={{ flex: 1 }}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>LibraryApp</Text>
        </View>

        <View style={styles.menuContainer}>
          {/* ✅ SỬA LỖI 3: Đổi toàn bộ router.push thành setActiveTab */}
          <TouchableOpacity 
            style={[styles.menuItem, isActive('/HomeScreen') && styles.activeItem]} 
            onPress={() => setActiveTab('/HomeScreen')}
          >
            <Home size={20} color="#5C3E16" strokeWidth={isActive('/HomeScreen') ? 2.8 : 2.2} />
            <Text style={[styles.menuText, isActive('/HomeScreen') && styles.activeText]}>HOME</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, isActive('/SearchScreen') && styles.activeItem]} 
            onPress={() => setActiveTab('/SearchScreen')}
          >
            <Search size={20} color="#5C3E16" strokeWidth={isActive('/SearchScreen') ? 2.8 : 2.2} />
            <Text style={[styles.menuText, isActive('/SearchScreen') && styles.activeText]}>SEARCH</Text>
          </TouchableOpacity>

          {/* <TouchableOpacity 
            style={[styles.menuItem, isActive('/MyBooksScreen') && styles.activeItem]} 
            onPress={() => setActiveTab('/MyBooksScreen')}
          >
            <BookOpen size={20} color="#5C3E16" strokeWidth={isActive('/MyBooksScreen') ? 2.8 : 2.2} />
            <Text style={[styles.menuText, isActive('/MyBooksScreen') && styles.activeText]}>MY BOOKS</Text>
          </TouchableOpacity> */}

          <TouchableOpacity 
            style={[styles.menuItem, isActive('/HistoryScreen') && styles.activeItem]} 
            onPress={() => setActiveTab('/HistoryScreen')}
          >
            <History size={20} color="#5C3E16" strokeWidth={isActive('/HistoryScreen') ? 2.8 : 2.2} />
            <Text style={[styles.menuText, isActive('/HistoryScreen') && styles.activeText]}>HISTORY</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, isActive('/Plus') && styles.activeItem]} 
            onPress={() => setActiveTab('/Plus')}
          >
            <Award size={20} color="#5C3E16" strokeWidth={isActive('/Plus') ? 2.8 : 2.2} />
            <Text style={[styles.menuText, isActive('/Plus') && styles.activeText]}>PLUS MEMBERSHIP</Text>
          </TouchableOpacity>

        </View>
      </View>

      {/* Bottom Section: Profile Card & Logout Button */}
      <View style={styles.bottomContainer}>
        
        {/* ✅ CHUYỂN HƯỚNG PROFILE BẰNG setActiveTab */}
        <TouchableOpacity 
          style={styles.profileBadge}
          onPress={() => setActiveTab('/ProfileScreen')}
          activeOpacity={0.7}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>
              {user?.name ? getInitials(user.name) : "MA"}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name || "Minh Anh"}
            </Text>
            <Text style={styles.profileRole}>
              {user?.role || "Gold Member"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 🐐 NÚT LOG OUT BIẾN HÌNH */}
        <TouchableOpacity 
          style={[styles.logoutBtn, isLoggingOut && { opacity: 0.6 }]} 
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <View style={styles.loadingWrapper}>
              <View style={{ transform: [{ scale: 0.4 }] }}> 
                <GlowLoading />
              </View>
              <Text style={styles.logoutTextPending}>Đang rời cõi...</Text>
            </View>
          ) : (
            <>
              <LogOut size={16} color="#8C7A6B" />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { 
    width: 250, 
    height: '100%', 
    backgroundColor: '#F5F2E9', 
    paddingVertical: 40, 
    paddingHorizontal: 16, 
    justifyContent: 'space-between',
    borderRightWidth: Platform.OS === 'web' ? 0 : 1,
    borderRightColor: '#E2DEC5'
  },
  logoContainer: { 
    marginBottom: 35, 
    paddingLeft: 12 
  },
  logoText: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#5C3E16', 
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' 
  },
  menuContainer: { 
    gap: 4 
  },
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12,
  },
  activeItem: { 
    backgroundColor: '#EBE4CD' 
  },
  menuText: { 
    marginLeft: 18, 
    fontSize: 12, 
    color: '#5C3E16', 
    fontWeight: '600',
    letterSpacing: 0.8
  },
  activeText: {
    fontWeight: '800'
  },
  bottomContainer: {
    gap: 12,
    marginTop: 20
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBE5D3', 
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D1C7B2', 
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: '#5C3E16',
    fontWeight: 'bold',
    fontSize: 15
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1
  },
  profileName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1C1C1C'
  },
  profileRole: {
    fontSize: 11,
    color: '#8A8374',
    marginTop: 2
  },
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingVertical: 8,
    opacity: 0.7
  },
  logoutText: { 
    marginLeft: 8, 
    color: '#8C7A6B', 
    fontWeight: '600',
    fontSize: 12
  },
  loadingWrapper: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  logoutTextPending: { 
    marginLeft: -5, 
    color: '#5C3E16', 
    fontWeight: 'bold', 
    fontSize: 12, 
    fontStyle: 'italic' 
  }
});