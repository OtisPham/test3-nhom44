import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, Button, TextInput, Switch } from 'react-native-paper';
import { ChevronRight, Settings, ShieldCheck, Link2, LogOut, Globe, Edit3, User, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';
import GlowLoading from '../../../components/GlowLoading';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  subscription_plan: string;
  profiles: {
    pseudonym: string | null;
    bio: string | null;
    website_url: string | null;
  } | null;
}

export default function AuthorProfileWatch() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // 🔥 TÍNH NĂNG MỚI: Quản lý giao diện Security Settings con
  const [isSecurityMode, setIsSecurityMode] = useState(false);
  
  // 🔥 Các trạng thái công khai thông tin (Mặc định là bật - true)
  const [showPseudonym, setShowPseudonym] = useState(true);
  const [showBio, setShowBio] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);

  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  // State quản lý Form
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputPseudonym, setInputPseudonym] = useState('');
  const [inputBio, setInputBio] = useState('');
  const [inputWebsite, setInputWebsite] = useState('');

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

      const response = await fetch('http://localhost:3000/api/users/profile/me', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const uData: ProfileData = resJson.data;
        setProfile(uData);
        setInputName(uData.name || '');
        setInputPseudonym(uData.profiles?.pseudonym || '');
        setInputBio(uData.profiles?.bio || '');
        setInputWebsite(uData.profiles?.website_url || '');
      }
    } catch (err) {
      console.error(">>> [FETCH PROFILE ERROR]:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    setStatusMsg({ text: '', type: null });

    try {
      const token = await getValidToken();
      if (!token || !profile?.id) throw new Error("Phiên làm việc hết hạn.");

      const userRes = await fetch(`http://localhost:3000/api/users/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: inputName })
      });

      const profileRes = await fetch(`http://localhost:3000/api/users/${profile.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          pseudonym: inputPseudonym,
          bio: inputBio,
          website_url: inputWebsite
        })
      });

      if (!userRes.ok || !profileRes.ok) throw new Error("Lỗi cập nhật hệ thống!");

      setStatusMsg({ text: 'Cập nhật hồ sơ thành công! 🎉', type: 'success' });
      await fetchProfileData();
      setTimeout(() => setIsEditMode(false), 1000);
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Lỗi lưu dữ liệu!', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
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

      {/* 1. KHỐI HEADER THÔNG TIN TÁC GIẢ (CHẾ ĐỘ XEM) */}
      {!isEditMode && !isSecurityMode ? (
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <User size={40} color="#4A321F" />
              </View>
              <View style={styles.badgeTopTier}>
                <Text style={styles.badgeText}>⭐ TOP TIER</Text>
              </View>
            </View>
            
            <View style={styles.authorMeta}>
              {/* 🔥 BIẾN ĐỘNG THEO SWITCH BẢO MẬT: Kiểm tra hiển thị Bút danh */}
              <Text style={styles.authorName}>
                {showPseudonym 
                  ? (profile?.profiles?.pseudonym || profile?.name || 'Chưa đặt bút danh') 
                  : '👤 Hồ sơ ẩn danh'}
              </Text>
              <Text style={styles.authorTitle}>Novelist & Archival Researcher</Text>
              
              {/* 🔥 BIẾN ĐỘNG THEO SWITCH BẢO MẬT: Kiểm tra hiển thị tiểu sử */}
              <Text style={[styles.authorBio, !showBio && { fontStyle: 'italic', color: '#8A7663' }]}>
                {showBio 
                  ? (profile?.profiles?.bio || 'Chưa cập nhật tiểu sử giới thiệu bản thân.') 
                  : '🔒 Tiểu sử của tác giả đã được ẩn cấu hình riêng tư.'}
              </Text>
              
              {/* 🔥 BIẾN ĐỘNG THEO SWITCH BẢO MẬT: Kiểm tra hiển thị Website */}
              {profile?.profiles?.website_url && showWebsite && (
                <View style={styles.webLinkRow}>
                  <Globe size={12} color="#8A7663" />
                  <Text style={styles.webLinkText}>{profile.profiles.website_url}</Text>
                </View>
              )}
            </View>
          </Card.Content>
        </Card>
      ) : isEditMode && !isSecurityMode ? (
        /* KHỐI FORM SỬA (KHI BẤM EDIT PROFILE) */
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>🛠️ CHỈNH SỬA THÔNG TIN</Text>
            <TextInput
              label="Tên tài khoản (Hệ thống)"
              value={inputName}
              onChangeText={setInputName}
              mode="outlined"
              outlineColor="#E6DCD0"
              activeOutlineColor="#C5A059"
              style={styles.textInput}
              textColor="#000000"
            />
            <TextInput
              label="Bút danh Tác giả"
              value={inputPseudonym}
              onChangeText={setInputPseudonym}
              mode="outlined"
              outlineColor="#E6DCD0"
              activeOutlineColor="#C5A059"
              style={styles.textInput}
              textColor="#000000"
            />
            <TextInput
              label="Tiểu sử"
              value={inputBio}
              onChangeText={setInputBio}
              mode="outlined"
              multiline
              numberOfLines={3}
              outlineColor="#E6DCD0"
              activeOutlineColor="#C5A059"
              style={styles.textInput}
              textColor="#000000"
            />
            <TextInput
              label="Website liên kết"
              value={inputWebsite}
              onChangeText={setInputWebsite}
              mode="outlined"
              autoCapitalize="none"
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
        /* 🔥 KHỐI HIỂN THỊ CÀI ĐẶT BẢO MẬT (KHI BẤM VÀO SECURITY SETTINGS TRONG HÌNH image_a1dac3.png) */
        <Card style={styles.headerCard} mode="outlined">
          <Card.Content style={{ gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity onPress={() => setIsSecurityMode(false)}>
                <ArrowLeft size={18} color="#4A321F" />
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>🛡️ CẤU HÌNH QUYỀN RIÊNG TƯ HỒ SƠ</Text>
            </View>
            <Divider style={{ backgroundColor: '#E6DCD0' }} />

            {/* Switch 1: Quản lý Bút danh */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBlock}>
                {/* 🔥 BIẾN ĐỘNG THEO SWITCH BẢO MẬT: Kiểm tra hiển thị Bút danh */}
                {showPseudonym ? <Eye size={16} color="#8B6508" /> : <EyeOff size={16} color="#8A7663" />}
                <Text style={styles.switchLabel}>Hiển thị bút danh công khai</Text>
              </View>
              <Switch value={showPseudonym} onValueChange={setShowPseudonym} color="#C5A059" />
            </View>

            {/* Switch 2: Quản lý Tiểu sử */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBlock}>
                {showBio ? <Eye size={16} color="#8B6508" /> : <EyeOff size={16} color="#8A7663" />}
                <Text style={styles.switchLabel}>Hiển thị tiểu sử (Bio)</Text>
              </View>
              <Switch value={showBio} onValueChange={setShowBio} color="#C5A059" />
            </View>

            {/* Switch 3: Quản lý Website */}
            <View style={styles.switchRow}>
              <View style={styles.switchLabelBlock}>
                {/* // 🔥 BIẾN ĐỘNG THEO SWITCH BẢO MẬT: Kiểm tra hiển thị Website */}
                {showWebsite ? <Eye size={16} color="#8B6508" /> : <EyeOff size={16} color="#8A7663" />}
                <Text style={styles.switchLabel}>Hiển thị website cá nhân</Text>
              </View>
              <Switch value={showWebsite} onValueChange={setShowWebsite} color="#C5A059" />
            </View>

            <Button 
              mode="contained" 
              onPress={() => setIsSecurityMode(false)}
              style={{ backgroundColor: '#4A321F', marginTop: 6, borderRadius: 8 }}>
                <Text style={styles.ConfirmLabel}>Hoàn tất</Text>

            </Button>
          </Card.Content>
        </Card>
      )}

      {/* 2. KHỐI SETTINGS LIST (DANH SÁCH TÙY CHỌN HÀNG DỌC) */}
      <Card style={styles.settingsCard} mode="outlined">
        <Card.Content style={{ paddingVertical: 10 }}>
          <Text style={styles.settingsGroupTitle}>Account Settings</Text>
          
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
              <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>VERIFIED</Text></View>
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

          {/* 🔥 Hàng 4: Security Settings (Kích hoạt chế độ Switch bảo mật từ ảnh image_a1dac3.png) */}
          <TouchableOpacity style={styles.settingItem} onPress={() => { setIsSecurityMode(true); setIsEditMode(false); }}>
            <View style={styles.settingLeft}>
              <Settings size={18} color="#614124" />
              <Text style={styles.settingText}>Security Settings</Text>
            </View>
            <ChevronRight size={16} color="#8A7663" />
          </TouchableOpacity>
        </Card.Content>
      </Card>

      {/* 3. NÚT ĐĂNG XUẤT (SIGN OUT) */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <LogOut size={16} color="#B22222" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF7F2', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Khối Header Profile Card
  headerCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#E6DCD0', borderWidth: 1, marginBottom: 16, elevation: 1 },
  headerContent: { flexDirection: 'row', gap: 16, paddingVertical: 20 },
  avatarContainer: { alignItems: 'center', position: 'relative' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#EBE3D5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#C5A059' },
  badgeTopTier: { position: 'absolute', bottom: -6, backgroundColor: '#C5A059', paddingHorizontal: 12, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#FFFDF9' },
  badgeText: { fontSize: 9, fontWeight: 'bold', color: '#4A321F', letterSpacing: 0.3 },
  authorMeta: { flex: 1, gap: 4 },
  authorName: { fontSize: 22, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif' },
  authorTitle: { fontSize: 13, fontStyle: 'italic', color: '#8B6508', fontWeight: '500' },
  authorBio: { fontSize: 13, color: '#614124', lineHeight: 18, marginTop: 4 },
  webLinkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  webLinkText: { fontSize: 12, color: '#8B6508', textDecorationLine: 'underline' },

  // Khối cài đặt danh sách hành động
  settingsCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#E6DCD0', borderWidth: 1, marginBottom: 16 },
  settingsGroupTitle: { fontSize: 12, fontWeight: 'bold', color: '#4A321F', paddingHorizontal: 4, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.3 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingText: { fontSize: 14, color: '#4A321F', fontWeight: '500' },
  settingDivider: { backgroundColor: '#F3EDE4' },
  verifiedBadge: { backgroundColor: '#FFFDF9', borderWidth: 0.5, borderColor: '#C5A059', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  verifiedText: { fontSize: 8, color: '#C5A059', fontWeight: 'bold' },

  // Khối dòng Switch cấu hình Security mượt mà
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  switchLabelBlock: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 14, color: '#4A321F', fontWeight: '500' },

  // Khối đăng xuất
  signOutButton: { backgroundColor: '#FFFDF9', borderColor: '#E6DCD0', borderWidth: 1, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  signOutText: { color: '#B22222', fontWeight: 'bold', fontSize: 14 },

  // Edit fields
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif' },
  textInput: { backgroundColor: '#FFFDF9', fontSize: 13 },
  statusBanner: { padding: 12, borderRadius: 10, marginBottom: 15 },
  statusSuccess: { backgroundColor: '#F0F7F4', borderWidth: 1, borderColor: '#D1E7DD' },
  statusError: { backgroundColor: '#FDF2F2', borderWidth: 1, borderColor: '#FDE8E8' },
  textSuccess: { color: '#1A5336', fontWeight: 'bold' },
  textError: { color: '#9B1C1C', fontWeight: 'bold' },
  ConfirmLabel: { color: '#FFFDF9', fontWeight: 'bold', fontSize: 14 }
});