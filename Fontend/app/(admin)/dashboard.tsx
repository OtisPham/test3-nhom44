import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert, Platform, ScrollView } from 'react-native';
import { Text, Avatar, Divider, Button, TextInput, IconButton, Provider, ActivityIndicator } from 'react-native-paper';
import { supabase } from '../../lib/supabase'; 
import { useRouter } from 'expo-router';

// 🔥 Thêm thư viện Vector Icons để lấy icon nét mảnh như giao diện mẫu
import { MaterialCommunityIcons } from '@expo/vector-icons'; 

import UserManagement from './components/UserManagement';
import SubscriptionManagement from './components/SubscriptionManagement'; 
import RevenueManagement from './components/RevenueManagement';
import BookManagement from './components/BookManagement'; 
import OverviewManagement from './components/OverviewManagement';

// 🟢 KHAI BÁO CẤU HÌNH ĐƯỜNG DẪN CỔNG API NODE.JS CỦA HỆ THỐNG THÔNG BÁO
const ANNOUNCEMENT_API_URL = 'http://localhost:3000/api/announcements';

interface Announcement {
  id: string;
  content: string;
  created_at: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('TONG_QUAN'); 
  
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [loading, setLoading] = useState(false); 
  const [logoutLoading, setLogoutLoading] = useState(false); 

  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [sessionToken, setSessionToken] = useState<string>('');

  // 📢 ĐĂNG THÔNG BÁO STATES
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newNotice, setNewNotice] = useState('');
  const [postingNotice, setPostingNotice] = useState(false);

  const [adminData, setAdminData] = useState({
    id: '',
    full_name: '',
    email: ''
  });

  // 🟢 1. HÀM NẠP LỊCH SỬ THÔNG BÁO THÔNG QUA API NODE.JS (GET REQUEST)
  const fetchAnnouncements = async () => {
    try {
      const response = await fetch(`${ANNOUNCEMENT_API_URL}?limit=3`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const resJson = await response.json();
      
      if (resJson.success && resJson.data) {
        setAnnouncements(resJson.data);
      }
    } catch (err) {
      console.error("❌ Lỗi gọi API lấy danh sách thông báo:", err);
    }
  };

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        const token = localStorage.getItem('userToken');
        if (token) {
          setSessionToken(token); 
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
          
          if (data) {
            setAdminData({
              id: data.id,
              full_name: data.name || 'Admin', 
              email: data.email
            });
          }
        }
      } catch (err) {
        console.error("Lỗi khởi tạo profile:", err);
      }
    };

    const fetchMonthlyRevenue = async () => {
      try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data, error } = await supabase
          .from('user_subscriptions')
          .select(`
            status,
            start_date,
            packages ( price )
          `)
          // .eq('status', 'active', )
          .gte('start_date', firstDayOfMonth);

        if (error) throw error;

        if (data) {
          const total = data.reduce((sum, item: any) => {
            const price = item.packages?.price ? parseFloat(item.packages.price) : 0;
            return sum + price;
          }, 0);
          setMonthlyRevenue(total);
        }
      } catch (err) {
        console.error("Lỗi tính toán doanh thu sidebar:", err);
      }
    };

    fetchAdminProfile();
    fetchMonthlyRevenue();
    fetchAnnouncements();
  }, [activeTab]);

  // 🟢 2. HÀM PHÁT HÀNH THÔNG BÁO MỚI CHẠY QUA API NODE.JS (POST REQUEST CÓ TOKEN)
  const handlePostAnnouncement = async () => {
    if (!newNotice.trim()) {
      Alert.alert("Cảnh báo", "Vui lòng nhập nội dung thông báo trước khi phát hành!");
      return;
    }

    try {
      setPostingNotice(true);
      
      // Lấy mã khóa token trong vùng nhớ cục bộ để gán quyền tối cao gửi lên máy chủ
      const token = localStorage.getItem('userToken') || sessionToken;

      const response = await fetch(ANNOUNCEMENT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Truyền mã xác thực Bearer Token lên Middleware API
        },
        body: JSON.stringify({
          content: newNotice.trim()
        })
      });

      const resJson = await response.json();

      if (response.ok && resJson.success) {
        setNewNotice('');
        Alert.alert("Thành công", "Đã phát hành thông báo mới qua API thành công! 🚀");
        fetchAnnouncements(); // Nạp lại danh sách để hiện ngay lập tức
      } else {
        Alert.alert("Thất bại", resJson.message || "Không thể đăng phát hành thông báo.");
      }
    } catch (err) {
      console.error("❌ Lỗi trong quá trình kết nối API gửi thông báo:", err);
      Alert.alert("Lỗi", "Không thể kết nối tới máy chủ API.");
    } finally {
      setPostingNotice(false);
    }
  };

 

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('users')
        .update({ name: adminData.full_name }) 
        .eq('id', adminData.id);

      if (error) throw error;
      Alert.alert("Thành công", "Cập nhật thông tin cá nhân thành công! 🎉");
      setEditModalVisible(false);
    } catch (error: any) {
      console.error("Lỗi:", error.message);
      Alert.alert("Thất bại", `Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
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

  const formatVND = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    }
    return amount.toLocaleString('vi-VN') + ' đ';
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'TONG_QUAN': return <OverviewManagement adminToken={sessionToken || undefined} />;
      case 'REVENUE': return <RevenueManagement />; 
      case 'USERS': return <UserManagement />;
      case 'GOI_THANH_VIEN': return <SubscriptionManagement />; 
      case 'KHO_SACH': return <BookManagement />;
      default: return <Text style={{ color: '#5D4037' }}>Vui lòng chọn một mục menu</Text>;
    }
  };

  const getAvatarLabel = (name: string) => {
    if (!name) return "AD";
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Provider>
      <View style={styles.container}>
        
        {/* ─── HEADER PHÍA TRÊN ─── */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Hello ADMIN</Text>
        </View>

        {/* ─── THÂN ĐIỀU HÀNH CHÍNH ─── */}
        <View style={styles.body}>
          
          {/* SIDEBAR TRÁI */}
          <View style={styles.sidebar}>
            <View style={styles.menuGroup}>
              <TouchableOpacity 
                onPress={() => setActiveTab('TONG_QUAN')} 
                style={[styles.menuItem, activeTab === 'TONG_QUAN' && styles.activeMenuItem]} 
                disabled={logoutLoading}
              >
                <MaterialCommunityIcons 
                  name="view-dashboard-outline" 
                  size={20} 
                  color={activeTab === 'TONG_QUAN' ? '#FFF' : '#5D4037'} 
                />
                <Text style={[styles.menuText, activeTab === 'TONG_QUAN' && styles.activeMenuText]}>Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('USERS')} 
                style={[styles.menuItem, activeTab === 'USERS' && styles.activeMenuItem]} 
                disabled={logoutLoading}
              >
                <MaterialCommunityIcons 
                  name="account-group-outline" 
                  size={20} 
                  color={activeTab === 'USERS' ? '#FFF' : '#5D4037'} 
                />
                <Text style={[styles.menuText, activeTab === 'USERS' && styles.activeMenuText]}>Users</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('KHO_SACH')} 
                style={[styles.menuItem, activeTab === 'KHO_SACH' && styles.activeMenuItem]} 
                disabled={logoutLoading}
              >
                <MaterialCommunityIcons 
                  name="book-open-variant" 
                  size={20} 
                  color={activeTab === 'KHO_SACH' ? '#FFF' : '#5D4037'} 
                />
                <Text style={[styles.menuText, activeTab === 'KHO_SACH' && styles.activeMenuText]}>Authors & Books</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('GOI_THANH_VIEN')} 
                style={[styles.menuItem, activeTab === 'GOI_THANH_VIEN' && styles.activeMenuItem]} 
                disabled={logoutLoading}
              >
                <MaterialCommunityIcons 
                  name="package" 
                  size={20} 
                  color={activeTab === 'GOI_THANH_VIEN' ? '#FFF' : '#5D4037'} 
                />
                <Text style={[styles.menuText, activeTab === 'GOI_THANH_VIEN' && styles.activeMenuText]}>Subscription</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setActiveTab('REVENUE')} 
                style={[styles.menuItem, activeTab === 'REVENUE' && styles.activeMenuItem]} 
                disabled={logoutLoading}
              >
                <MaterialCommunityIcons 
                  name="wallet-outline" 
                  size={20} 
                  color={activeTab === 'REVENUE' ? '#FFF' : '#5D4037'} 
                />
                <Text style={[styles.menuText, activeTab === 'REVENUE' && styles.activeMenuText]}>Revenue</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity 
              style={styles.adminProfileBox} 
              activeOpacity={0.6} // Tạo hiệu ứng mờ nhẹ khi chạm vào cho giống nút thật
              onPress={() => {}} // Nút bấm không kích hoạt hành động hay menu nào
            >
              <Avatar.Text 
                size={28} 
                label={getAvatarLabel(adminData.full_name)} 
                style={{ backgroundColor: '#5D4037' }} 
                labelStyle={{ fontSize: 10, fontWeight: 'bold' }}
              />
              <View style={styles.adminInfoText}>
                <Text style={styles.adminName} numberOfLines={1}>
                  {adminData.full_name || 'Admin'}
                </Text>
                <Text style={styles.adminRole}>Administrator</Text>
              </View>
            </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleLogout} 
                style={[styles.logoutButton, logoutLoading && { opacity: 0.6 }]} 
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <ActivityIndicator size={18} color="#8B0000" style={{ marginRight: 10 }} />
                ) : (
                  <MaterialCommunityIcons name="logout" size={18} color="#8B0000" style={{ marginRight: 10 }} />
                )}
                <Text style={styles.logoutText}>
                  {logoutLoading ? 'Logging out...' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* KHÔNG GIAN HIỂN THỊ NỘI DUNG TÁC VỤ Ở GIỮA */}
          <View style={styles.mainContent}>{renderMainContent()}</View>

          {/* ─── SIDEBAR PHẢI BÁO CÁO THỐNG KÊ & PHÁT HÀNH THÔNG BÁO ─── */}
          <View style={styles.rightSidebar}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              
              {/* 1. KHỐI CŨ CỦA BẠN: GIAO DỊCH THÁNG (GIỮ NGUYÊN VẸN) */}
              <View>
                <Text style={styles.rightTitle}>Giao dịch tháng</Text>
                <View style={styles.activityItem}>
                  <Avatar.Icon size={30} icon="currency-usd" style={{ backgroundColor: '#5D4037' }} color="#FFF" />
                  <Text style={styles.activityText}>Doanh thu: {formatVND(monthlyRevenue)}</Text>
                </View>
              </View>

              <Divider style={{ backgroundColor: '#EAD7CF', marginVertical: 4 }} />

              {/* 2. KHỐI MỚI THÊM VÀO: ĐĂNG THÔNG BÁO HỆ THỐNG */}
              <View>
                <Text style={styles.rightTitle}>📢 Đăng Thông Báo</Text>
                
                <View style={styles.noticeForm}>
                  <TextInput
                    placeholder="Nhập văn bản thông báo..."
                    value={newNotice}
                    onChangeText={setNewNotice}
                    multiline
                    numberOfLines={3}
                    mode="outlined"
                    disabled={postingNotice}
                    style={styles.noticeInput}
                    outlineColor="#060200"
                    activeOutlineColor="#8B4F1D"
                    placeholderTextColor="#060200"
                    textColor="#5D4037"
                  />
                  <Button
                    mode="contained"
                    onPress={handlePostAnnouncement}
                    loading={postingNotice}
                    disabled={postingNotice}
                    style={styles.noticeSubmitBtn}
                    buttonColor="#8B4F1D"
                    textColor="#FFF"
                    labelStyle={{ fontSize: 11, fontWeight: 'bold' }}
                    compact
                  >
                    Phát Hành
                  </Button>
                </View>

                <Text style={styles.historyTitle}>📋 Thông báo vừa gửi</Text>
                <View style={styles.noticeHistoryList}>
                  {announcements.length === 0 ? (
                    <Text style={styles.emptyNoticeText}>Chưa có thông báo cũ.</Text>
                  ) : (
                    announcements.map((item) => (
                      <View key={item.id} style={styles.noticeItemCard}>
                        <Text style={styles.noticeItemContent}>{item.content}</Text>
                        <Text style={styles.noticeItemTime}>
                          🕒 {new Date(item.created_at).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>

            </ScrollView>
          </View>

        </View>

        {/* ─── MODAL NỔI CẬP NHẬT THÔNG TIN TÀI KHOẢN ─── */}
        <Modal visible={editModalVisible} transparent={true} animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.editProfileCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Thông tin cá nhân</Text>
                <IconButton icon="close" size={20} iconColor="#5D4037" onPress={() => setEditModalVisible(false)} disabled={loading} />
              </View>
              
              <View style={styles.avatarSection}>
                <Avatar.Text size={80} label={getAvatarLabel(adminData.full_name)} style={{ backgroundColor: '#8B7355' }} />
                <Button mode="text" textColor='black' compact disabled={loading} style={{ marginTop: 6 }}>Thay ảnh đại diện</Button>
              </View>

              <TextInput
                label="Tên hiển thị"
                value={adminData.full_name}
                onChangeText={(text) => setAdminData({ ...adminData, full_name: text })}
                mode="outlined"
                style={styles.input}
                outlineColor="#8B7355"
                activeOutlineColor="#5D4037"
                disabled={loading}
                theme={{ colors: { text: '#000', primary: '#5D4037' } }}
              />
              
              <TextInput 
                label="Email" 
                value={adminData.email} 
                disabled 
                mode="outlined" 
                style={[styles.input, { opacity: 0.6 }]} 
                theme={{ colors: { text: '#777' } }}
              />

              <Button 
                mode="contained" 
                onPress={handleSaveProfile} 
                style={styles.saveBtn} 
                buttonColor="#5D4037" 
                textColor="#FFF"
                loading={loading} 
                disabled={loading}
              >
                Lưu thay đổi
              </Button>
            </View>
          </View>
        </Modal>

      </View>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF7F4', padding: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, zIndex: 1000 },
  headerText: { fontSize: 30, fontWeight: 'bold', color: '#5D4037', fontFamily: 'cursive' },
  body: { flex: 1, flexDirection: 'row' },
  
  sidebar: { width: '22%', borderRightWidth: 0.5, borderColor: '#EAD7CF', paddingRight: 15, justifyContent: 'space-between' },
  menuGroup: { gap: 6 }, 
  
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    backgroundColor: 'transparent'
  },
  activeMenuItem: { 
    backgroundColor: '#8B4F1D', 
  },
  menuText: { 
    fontSize: 14, 
    color: '#5D4037', 
    fontWeight: '500', 
    marginLeft: 12 
  },
  activeMenuText: { 
    fontWeight: '600', 
    color: '#FFF' 
  },

  sidebarFooter: { borderTopWidth: 0.5, borderColor: '#EAD7CF', paddingTop: 15, marginBottom: 10, gap: 4 },
  adminProfileBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#FFF0E9', borderRadius: 12, marginBottom: 6 },
  adminInfoText: { marginLeft: 10, flex: 1 },
  adminName: { fontSize: 13, fontWeight: 'bold', color: '#5D4037' },
  adminRole: { fontSize: 10, color: '#8B7355' },
  
  logoutButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    paddingHorizontal: 16,
    borderRadius: 12 
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#8B0000', marginLeft: 2 },

  mainContent: { flex: 1, paddingHorizontal: 15 },

  rightSidebar: { width: '24%', backgroundColor: '#FFF0E9', borderRadius: 16, padding: 15 },
  rightTitle: { fontWeight: 'bold', marginBottom: 12, fontSize: 14, color: '#5D4037', letterSpacing: 0.2 },
  activityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12 },
  activityText: { marginLeft: 10, fontSize: 12, color: '#5D4037', fontWeight: 'bold' },
  
  noticeForm: { gap: 6, marginTop: 4 },
  noticeInput: { 
    backgroundColor: '#fff', 
    color: '#5D4037',
    fontSize: 11, 
    textAlignVertical: 'top'
  },
  noticeSubmitBtn: { 
    borderRadius: 6, 
    alignSelf: 'flex-end',
    marginTop: 2
  },

  historyTitle: { fontSize: 12, fontWeight: 'bold', color: '#5D4037', marginTop: 14, marginBottom: 6 },
  noticeHistoryList: { gap: 6 },
  emptyNoticeText: { fontSize: 11, color: '#de8860', fontStyle: 'italic', marginTop: 4 },
  
  noticeItemCard: { 
    backgroundColor: '#FFF', 
    padding: 8, 
    borderRadius: 8, 
    borderLeftWidth: 3, 
    borderLeftColor: '#8B4F1D',
  },
  noticeItemContent: { fontSize: 11, color: '#4A321F', lineHeight: 15 },
  noticeItemTime: { fontSize: 9, color: '#A89288', marginTop: 4, textAlign: 'right' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  editProfileCard: { width: 400, backgroundColor: '#FFF', padding: 20, borderRadius: 16, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#5D4037' },
  avatarSection: { alignItems: 'center', marginBottom: 20 },
  input: { marginBottom: 15, backgroundColor: '#FFF' },
  saveBtn: { marginTop: 10, paddingVertical: 5, borderRadius: 12 }
});