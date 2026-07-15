// 📂 File: app/(reader)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform, Modal, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { Bell, Settings, Search } from 'lucide-react-native';
import { supabase } from '../../lib/supabase'; // ✅ Thêm import supabase để lấy user

// 📚 IMPORT CÁC TRANG CÙNG CẤP
import ReaderSidebar from './ReaderSidebar';
import ReaderHomeScreen from './HomeScreen';
import SearchScreen from './SearchScreen';
import HistoryScreen from './HistoryScreen';
import PlusScreen from './Plus';
import ProfileScreen from './ProfileScreen';

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

export default function ReaderDashboardRouter() {
  const [activeTab, setActiveTab] = useState<string>('/HomeScreen');
  const [notifications, setNotifications] = useState<Announcement[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // ✅ THÊM STATE ĐỂ LƯU TÊN ĐỘC GIẢ
  const [userName, setUserName] = useState<string>('Anh quốc'); 

  useEffect(() => {
    // Gọi API thông báo ngầm
    const fetchInitialNotifications = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/announcements?limit=5');
        const resJson = await response.json();
        if (resJson.success && resJson.data) {
          setNotifications(resJson.data);
          setUnreadCount(resJson.data.length); 
        }
      } catch (error) {
        console.error("Lỗi tải thông báo:", error);
      }
    };

    // Lấy thông tin user hiện tại (Tùy chỉnh theo database của bạn)
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.user_metadata?.full_name) {
        setUserName(user.user_metadata.full_name);
      }
    };

    fetchInitialNotifications();
    fetchUser();
  }, []);

  const renderMainContent = () => {
    switch (activeTab) {
      case '/SearchScreen': return <SearchScreen />;
      case '/HistoryScreen': return <HistoryScreen />;
      case '/Plus': return <PlusScreen />;
      case '/ProfileScreen': return <ProfileScreen />;
      case '/HomeScreen':
      default: return <ReaderHomeScreen />;
    }
  };

  // ✅ CẬP NHẬT: ĐƯA LỜI CHÀO LÊN TIÊU ĐỀ TRANG CHỦ & FIX LỖI CÚ PHÁP
  const getHeaderTitle = () => {
    switch (activeTab) {
      case '/SearchScreen': return 'Tìm kiếm Tác phẩm';
      case '/HistoryScreen': return 'Lịch sử Khám phá';
      case '/Plus': return 'Đặc quyền Plus Membership';
      case '/ProfileScreen': return 'Hồ sơ Cá nhân';
      case '/HomeScreen':
      default: return `Chào độc giả, ${userName}`; // Hiển thị lời chào tại đây
    }
  };

  return (
    <View style={styles.mainContainer}>
      <ReaderSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <View style={{ flex: 1, backgroundColor: '#F5F2E9' }}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          
          <View style={styles.rightActions}>
            <TouchableOpacity 
              style={styles.iconBtn}
              onPress={() => {
                setUnreadCount(0); 
                setShowNotificationModal(true); 
              }}
            >
              <Bell size={18} color="#5C3E16" />
              {unreadCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flex: 1 }}>
          {renderMainContent()}
        </View>

        <Modal 
          visible={showNotificationModal} 
          transparent={true} 
          animationType="fade"
          onRequestClose={() => setShowNotificationModal(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNotificationModal(false)}>
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
                      <Text style={styles.noticeTime}>🕒 {new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
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
  mainContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#F5F2E9' 
  },
  topBar: { 
    height: 70, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 30, 
    backgroundColor: '#F5F2E9', 
    borderBottomWidth: 1, 
    borderBottomColor: '#E2DEC5' 
  },
  headerTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#5C3E16', 
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' 
  },
  rightActions: { 
    flexDirection: 'row', 
    gap: 12 
  },
  iconBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#EBE5D3', 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative' 
  },
  // THAY THẾ BADGE CŨ THÀNH BADGE CONTAINER HIỂN THỊ SỐ THỰC TẾ
  badgeContainer: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ff4d4d', 
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#EBE5D3',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  // STYLES CHO MODAL THÔNG BÁO (Hài hòa với màu be/nâu gỗ của Reader)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)', 
  },
  notificationDropdown: {
    position: 'absolute',
    top: 65, 
    right: 30, 
    width: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2DEC5'
  },
  notificationHeader: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2DEC5',
    marginBottom: 12
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#5C3E16',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif'
  },
  noticeItem: {
    backgroundColor: '#F5F2E9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#C4B494'
  },
  noticeText: {
    fontSize: 13,
    color: '#3A2810',
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