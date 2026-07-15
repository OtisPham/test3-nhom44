// 📂 Định vị file: app/(reader)/ProfileScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, Button, TextInput, Switch } from 'react-native-paper';
import { ChevronRight, Settings, ShieldCheck, Link2, LogOut, Edit3, User, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import GlowLoading from '../../components/GlowLoading';

interface ReaderProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  membership_level: string; // Đồng bộ "Gold Member" / "Standard Member"
}

export default function ProfileScreen() {
  const { user: authUser, logout: clearNodeAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSecurityMode, setIsSecurityMode] = useState(false);
  
  // Trạng thái bảo mật ẩn/hiển thị Tên tài khoản đối với cõi đọc giả
  const [showRealName, setShowRealName] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // State quản lý Form
  const [profile, setProfile] = useState<ReaderProfileData | null>(null);
  const [inputName, setInputName] = useState('');

  const getValidToken = async (): Promise<string | null> => {
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;

      if (!token && Platform.OS === 'web') {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          token = localToken.startsWith('{') ? JSON.parse(localToken)?.access_token : localToken;
        }
      }
      return token || null;
    } catch (error) {
      console.error('Get token error:', error);
      return null;
    }
  };

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getValidToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // API lấy thông tin profile độc giả riêng biệt
      const response = await fetch('http://localhost:3000/api/users/profile/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const uData: ReaderProfileData = resJson.data;
        setProfile(uData);
        setInputName(uData.name || '');
      } else if (authUser) {
        // Dự phòng lấy dữ liệu trực tiếp từ AuthContext nếu API chưa sẵn sàng
        setProfile({
          id: authUser.id,
          name: authUser.name || 'Minh Anh',
          email: authUser.email || '',
          role: 'reader',
          membership_level: authUser.plan || 'Gold Member'
        });
        setInputName(authUser.name || 'Minh Anh');
      }
    } catch (err) {
      console.error(">>> [FETCH READER PROFILE ERROR]:", err);
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

const handleSaveProfile = async () => {
    setSaving(true);
    setStatusMsg({ text: '', type: null });

    try {
      const token = await getValidToken();
      if (!token || !profile?.id) throw new Error("Phiên làm việc hết hạn.");

      // Chỉ cập nhật duy nhất trường Tên
      const userRes = await fetch(`http://localhost:3000/api/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: inputName })
      });

      if (!userRes.ok) throw new Error("Lỗi cập nhật hệ thống!");

      setStatusMsg({ text: 'Cập nhật thông tin độc giả thành công! 🎉', type: 'success' });
      
      // ✅ GIẢI PHÁP TẠI ĐÂY: Cập nhật trực tiếp Tên mới lên giao diện ngay lập tức
      setProfile(prev => prev ? { ...prev, name: inputName } : null);

      // (Tùy chọn) Có thể bỏ dòng await fetchProfileData() đi để ứng dụng chạy nhanh hơn
      // await fetchProfileData(); 

      setTimeout(() => setIsEditMode(false), 1000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Lỗi lưu dữ liệu!', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      if (clearNodeAuth) await clearNodeAuth();
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}><GlowLoading /></View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* KHỐI THÔNG BÁO BANNER */}
      {statusMsg.type && (
        <View style={[styles.statusBanner, statusMsg.type === 'success' ? styles.statusSuccess : styles.statusError]}>
          <Text style={statusMsg.type === 'success' ? styles.textSuccess : styles.textError}>{statusMsg.text}</Text>
        </View>
      )}

      {/* 1. KHỐI HEADER THÔNG TIN ĐỘC GIẢ (CHẾ ĐỘ XEM) */}
      {!isEditMode && !isSecurityMode ? (
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <User size={36} color="#5C3E16" />
              </View>
              <View style={styles.badgeTopTier}>
                <Text style={styles.badgeText}>
                  {profile?.membership_level?.toUpperCase() || 'GOLD MEMBER'}
                </Text>
              </View>
            </View>
            
            <View style={styles.authorMeta}>
              <Text style={styles.authorName}>
                {showRealName ? (profile?.name || 'Minh Anh') : '👤 Thư sinh ẩn danh'}
              </Text>
              <Text style={styles.authorTitle}>Học giả đam mê tàng thư cổ</Text>
              <Text style={styles.emailText}>{profile?.email}</Text>
            </View>
          </Card.Content>
        </Card>
      ) : isEditMode && !isSecurityMode ? (
        /* KHỐI FORM SỬA THÔNG TIN ĐỘC GIẢ */
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>🛠️ CHỈNH SỬA THÔNG TIN TÀI KHOẢN</Text>
            <TextInput
              label="Tên hiển thị độc giả"
              value={inputName}
              onChangeText={setInputName}
              mode="outlined"
              outlineColor="#E6DCD0"
              activeOutlineColor="#C5A059"
              style={styles.textInput}
              textColor="#000000"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <Button mode="outlined" onPress={() => setIsEditMode(false)} textColor="#614124" style={{ borderColor: '#E6DCD0' }}>Hủy</Button>
              <Button mode="contained" onPress={handleSaveProfile} loading={saving} style={{ backgroundColor: '#4A321F' }} textColor="#FFFDF9">Lưu</Button>
            </View>
          </Card.Content>
        </Card>
      ) : (
        /* KHỐI HIỂN THỊ CÀI ĐẶT BẢO MẬT TINH GỌN (KHÔNG CÓ BIO & WEB) */
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setIsSecurityMode(false)}>
                <ArrowLeft size={18} color="#4A321F" />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>🛡️ QUYỀN RIÊNG TƯ ĐỘC GIẢ</Text>
            </View>
            <Divider style={{ backgroundColor: '#E6DCD0' }} />

            {/* Switch duy nhất: Quản lý ẩn hiện tên thật danh tính */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBlock}>
                {showRealName ? <Eye size={16} color="#8B6508" /> : <EyeOff size={16} color="#8A7663" />}
                <Text style={styles.switchLabel}>Hiển thị danh tính công khai</Text>
              </View>
              <Switch value={showRealName} onValueChange={setShowRealName} color="#C5A059" />
            </View>

            <Button 
              mode="contained" 
              onPress={() => setIsSecurityMode(false)}
              style={{ backgroundColor: '#4A321F', marginTop: 6, borderRadius: 8 }}
            >
              Hoàn tất cấu hình
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* 2. KHỐI SETTINGS LIST (DANH SÁCH TÙY CHỌN HÀNG DỌC) */}
      <Card style={styles.settingsCard} mode="outlined">
        <Card.Content style={{ paddingVertical: 10 }}>
          <Text style={styles.settingsGroupTitle}>Reader Settings</Text>
          
          {/* Hàng 1: Edit Profile */}
          <TouchableOpacity style={styles.settingItem} onPress={() => { setIsEditMode(true); setIsSecurityMode(false); }}>
            <View style={styles.settingLeft}>
              <Edit3 size={18} color="#614124" />
              <Text style={styles.settingText}>Edit Profile</Text>
            </View>
            <ChevronRight size={16} color="#8A7663" />
          </TouchableOpacity>
          
          <Divider style={styles.settingDivider} />

          {/* Hàng 2: Verification Status */}
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <ShieldCheck size={18} color="#614124" />
              <Text style={styles.settingText}>Verification Status</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>ACTIVE READER</Text></View>
              <ChevronRight size={16} color="#8A7663" />
            </View>
          </TouchableOpacity>

          <Divider style={styles.settingDivider} />

          {/* Hàng 3: Linked Accounts */}
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Link2 size={18} color="#614124" />
              <Text style={styles.settingText}>Linked Accounts</Text>
            </View>
            <ChevronRight size={16} color="#8A7663" />
          </TouchableOpacity>

          <Divider style={styles.settingDivider} />

          {/* Hàng 4: Security Settings */}
          <TouchableOpacity style={styles.settingItem} onPress={() => { setIsSecurityMode(true); setIsEditMode(false); }}>
            <View style={styles.settingLeft}>
              <Settings size={18} color="#614124" />
              <Text style={styles.settingText}>Security Settings</Text>
            </View>
            <ChevronRight size={16} color="#8A7663" />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* 3. NÚT ĐĂNG XUẤT */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={16} color="#B22222" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F2E9', padding: 16 }, // Đồng bộ màu nền be nhạt của sidebar
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F2E9' },
  
  headerCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#E2DEC5', borderWidth: 1, marginBottom: 16, elevation: 1 },
  headerContent: { flexDirection: 'row', gap: 16, paddingVertical: 20 },
  avatarContainer: { alignItems: 'center', position: 'relative' },
  avatarPlaceholder: { width: 84, height: 84, borderRadius: 42, backgroundColor: '#EBE5D3', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#D1C7B2' },
  badgeTopTier: { position: 'absolute', bottom: -6, backgroundColor: '#C5A059', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FFFDF9' },
  badgeText: { fontSize: 8, fontWeight: 'bold', color: '#4A321F', letterSpacing: 0.3 },
  authorMeta: { flex: 1, justifyContent: 'center', gap: 2 },
  authorName: { fontSize: 20, fontWeight: 'bold', color: '#5C3E16', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  authorTitle: { fontSize: 13, fontStyle: 'italic', color: '#8A8374', fontWeight: '500' },
  emailText: { fontSize: 12, color: '#8C7A6B', marginTop: 2 },

  settingsCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#E2DEC5', borderWidth: 1, marginBottom: 16 },
  stylesGroupTitle: { fontSize: 12, fontWeight: 'bold', color: '#4A321F', paddingHorizontal: 4, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  settingsGroupTitle: { fontSize: 11, fontWeight: 'bold', color: '#5C3E16', paddingHorizontal: 4, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { fontSize: 14, color: '#4A321F', fontWeight: '500' },
  settingDivider: { backgroundColor: '#EBE4CD' },
  verifiedBadge: { backgroundColor: '#FFFDF9', borderWidth: 0.5, borderColor: '#C5A059', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 8, color: '#C5A059', fontWeight: 'bold' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  switchLabelBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 14, color: '#4A321F', fontWeight: '500' },

  signOutButton: { backgroundColor: '#FFFDF9', borderColor: '#E2DEC5', borderWidth: 1, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  signOutText: { color: '#B22222', fontWeight: 'bold', fontSize: 14 },

  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#5C3E16', fontFamily: 'serif' },
  textInput: { backgroundColor: '#FFFDF9', fontSize: 13 },
  statusBanner: { padding: 12, borderRadius: 10, marginBottom: 15 },
  statusSuccess: { backgroundColor: '#F0F7F4', borderWidth: 1, borderColor: '#D1E7DD' },
  statusError: { backgroundColor: '#FDF2F2', borderWidth: 1, borderColor: '#FDE8E8' },
  textSuccess: { color: '#1A5336', fontWeight: 'bold' },
  textError: { color: '#9B1C1C', fontWeight: 'bold' }
});