// 📂 File định tuyến cửa ngõ: Fontend/app/(author)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform, Modal, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Search, Bell, LogOut, RefreshCw } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useNavigation, useRoute } from '@react-navigation/native';

// ĐỒNG BỘ ĐƯỜNG DẪN SIDEBAR ĐÃ DI CHUYỂN VÀO TRONG COMPONENTS
import AuthorSidebar from './components/AuthorSidebar';

// 🟢 FIXED PATH
import DashboardOverview from './components/DashboardOverview';
import BookManagementScreen from './components/ManageBooks';      
import CreateManuascripts from './components/CreateManuascript'; 
import AuthorRevenueWatch from './components/AuthorRevenue'; 
import Analyst from './components/future';                     
import Interaction from './components/Interaction';
import AccountAuthor from './components/Account';    
import HelpCenter from './components/Help'; 

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

export default function AuthorDashboardRouter() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [logoutLoading, setLogoutLoading] = useState<boolean>(false);
  const navigation = useNavigation<any>();
  const route = useRoute();

  // STATE QUẢN LÝ THÔNG BÁO VÀ TRẠNG THÁI CHƯA ĐỌC
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // ✅ THÊM: Tự động tải thông báo ngầm khi vừa vào app để lấy số lượng chưa đọc
  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/announcements?limit=5', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          setNotifications(resJson.data);
          // Giả sử mỗi lần mở app lên là có thông báo mới. Thực tế bạn có thể so sánh ID với LocalStorage sau.
          setUnreadCount(resJson.data.length); 
        }
        } catch (error) {
          console.error("Không thể kết nối API tải thông báo ngầm:", error); // Đã dùng biến error
        }
    };

    fetchInitialNotifications();
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await supabase.auth.signOut();
      if (Platform.OS === 'web') {
        localStorage.clear();
        window.location.href = '/';
        return;
      }
      router.replace('/' as any);
    } catch (error: any) {
      console.error("Lỗi đăng xuất:", error.message);
    } finally {
      setLogoutLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'MY STORIES': return <BookManagementScreen searchQuery={searchQuery} />;
      case 'CREATE': return <CreateManuascripts />;
      case 'ANALYTICS': return <Analyst />;
      case 'INTERACTION': return <Interaction />;
      case 'REVENUE': return <AuthorRevenueWatch />;
      case 'ACCOUNT': return <AccountAuthor />;
      case 'HELP': return <HelpCenter />;
      case 'DASHBOARD':
      default: return <DashboardOverview searchQuery={searchQuery} />;
    }
  };

  return (
    <View style={styles.mainContainer}>
      <AuthorSidebar activeMenu={activeTab as any} setActiveMenu={setActiveTab} />

      <View style={{ flex: 1, backgroundColor: '#FAF6F0' }}>
        <View style={styles.topBar}>
          <Text style={styles.sanctuaryTitle}>Digital Library</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <View style={styles.searchWrapper}>
              <Search size={14} color="#8A7663" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search archive..."
                placeholderTextColor="#8A7663"
                style={styles.searchInput}
              />
            </View>

            <TouchableOpacity 
              style={styles.topIconBtn}
              onPress={() => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: route.name, params: route.params }],
                });
              }}
            >
              <RefreshCw size={14} color="#614124" />
            </TouchableOpacity>

            {/* ✅ CẬP NHẬT: NÚT CHUÔNG VÀ LOGIC XÓA SỐ CHƯA ĐỌC KHI BẤM VÀO */}
            <TouchableOpacity 
              style={styles.topIconBtn}
              onPress={() => {
                setUnreadCount(0); // Đánh dấu là đã xem toàn bộ
                setShowNotificationModal(true); // Mở danh sách
              }}
            >
              <Bell size={15} color="#614124" />
              
              {/* HIỂN THỊ CHẤM ĐỎ SỐ LƯỢNG NẾU CÓ THÔNG BÁO CHƯA ĐỌC */}
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleLogout} disabled={logoutLoading} style={styles.logoutBtn}>
              <LogOut size={14} color="#BA1A1A" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.topAvatarPlaceholder}
              onPress={() => setActiveTab('ACCOUNT')} // Thiết lập tab active sang ACCOUNT khi click
            >
              <Text style={styles.avatarLetter}>N</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {renderMainContent()}
        </View>

        {/* MODAL HIỂN THỊ THÔNG BÁO */}
        <Modal 
          visible={showNotificationModal} 
          transparent={true} 
          animationType="fade"
          onRequestClose={() => setShowNotificationModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setShowNotificationModal(false)} 
          >
            <TouchableOpacity activeOpacity={1} style={styles.notificationDropdown}>
              <View style={styles.notificationHeader}>
                <Text style={styles.notificationTitle}>🔔 Hệ thống thông báo</Text>
              </View>
              
              <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
                {notifications.length === 0 ? (
                  <Text style={styles.emptyNotice}>Chưa có thông báo nào mới.</Text>
                ) : (
                  notifications.map((item) => (
                    <View key={item.id} style={styles.noticeItem}>
                      <Text style={styles.noticeText}>{item.content}</Text>
                      <Text style={styles.noticeTime}>
                        🕒 {new Date(item.created_at).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, flexDirection: "row", backgroundColor: "#FAF6F0" },
  topBar: { height: 75, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 40, backgroundColor: "#FAF6F0", borderBottomWidth: 1, borderBottomColor: 'rgba(230,220,208,0.5)' },
  sanctuaryTitle: { fontSize: 20, fontWeight: "bold", color: "#614124", fontFamily: "serif" },
  searchWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: "#EBE3D5", borderRadius: 20, paddingHorizontal: 16, width: 260, height: 38 },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 8, color: "#4A321F", ...Platform.select({ web: { outlineStyle: "none" } as any }) },
  topIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EBE3D5", justifyContent: "center", alignItems: "center" },
  logoutBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FDF0F0", justifyContent: "center", alignItems: "center" },
  topAvatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#614124', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#FAF6F0', fontSize: 14, fontWeight: 'bold' },

  // ✅ THÊM: CSS CHO CHẤM ĐỎ (BADGE) THÔNG BÁO CHƯA ĐỌC
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#E53935', // Màu đỏ thông báo
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FAF6F0',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.15)', 
  },
  notificationDropdown: {
    position: 'absolute',
    top: 70, 
    right: 120, 
    width: 330,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EBE3D5'
  },
  notificationHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE3D5',
    marginBottom: 12
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#614124',
    fontFamily: 'serif'
  },
  noticeItem: {
    backgroundColor: '#FAF6F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#8A7663'
  },
  noticeText: {
    fontSize: 13,
    color: '#4A321F',
    lineHeight: 18
  },
  noticeTime: {
    fontSize: 10,
    color: '#8A7663',
    marginTop: 6,
    textAlign: 'right'
  },
  emptyNotice: {
    padding: 20,
    textAlign: 'center',
    color: '#8A7663',
    fontStyle: 'italic',
    fontSize: 13
  }
});