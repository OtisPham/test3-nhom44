import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Image, Modal, Alert, ScrollView, StyleSheet, ActivityIndicator, Platform } from "react-native";
import { Shield, Edit2, X, RefreshCw, Filter, Download } from "lucide-react-native";
import { Searchbar } from 'react-native-paper';

// 🚀 ĐỒNG BỘ ĐƯỜNG DẪN: Kết nối cổng Supabase và component chú dê phát sáng độc quyền
import { supabase } from '../../../lib/supabase'; 
import GlowLoading from "../../../components/GlowLoading";

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]); 
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Trạng thái quản lý việc đóng/mở và dữ liệu của Popover Chỉnh sửa nhanh
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // ================= TUYẾN 1: NẠP ĐỒNG BỘ DỰ LIỆU TỪ BẢNG PACKAGES THEO BACKEND =================
  const loadDataFromSupabase = async () => {
    try {
      // A. Lấy danh sách thành viên trong hệ thống Nhóm 44
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .order('email', { ascending: true });

      // B. QUÉT CHUẨN: Lấy dữ liệu gói cước từ bảng 'packages' do backend chỉ định
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('id, name, price')
        .order('price', { ascending: true });

      if (userError || packageError) {
        console.error("Lỗi Supabase:", userError?.message || packageError?.message);
        Alert.alert("Lỗi tải dữ liệu", userError?.message || packageError?.message);
      } else {
        setUsers(userData || []);
        setPlans(packageData || []);
      }
    } catch (err) {
      console.error("Lỗi hệ thống đồng bộ:", err);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromSupabase();
  }, []);

  // ================= TUYẾN 2: BỘ LỌC RAM THỜI GIAN THỰC (GÕ TỚI ĐÂU LỌC TỚI ĐÓ) =================
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter((user) => {
        const nameMatch = (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const emailMatch = (user.email || '').toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || emailMatch;
      });
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users]);

  // ================= TUYẾN 3: CẬP NHẬT TRỰC TIẾP XUỐNG DB LIVE-TIME KHÔNG CẦN F5 =================
  const handleUpdate = async (userId: string, field: string, value: string) => {
    if (loading) return; 
    setLoading(true); 
    try {
      const { error } = await supabase
        .from('users')
        .update({ [field]: value })
        .eq('id', userId);

      if (error) throw error;

      // Cập nhật State cục bộ để giao diện đổi màu lập tức cực kỳ mượt mà
      setUsers(prev => 
        prev.map(u => u.id === userId ? { ...u, [field]: value } : u)
      );
      console.log(`✅ Đã cập nhật thành công ${field} sang giá trị: ${value}`);
    } catch (error: any) {
      if (Platform.OS === 'web') {
        window.alert("Lỗi cập nhật thành viên: " + error.message);
      } else {
        Alert.alert("Lỗi cập nhật", error.message || "Không thể lưu dữ liệu.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm kích hoạt mở cửa sổ chỉnh sửa nhanh cho User được chọn
  const handleOpenEditPopover = (user: any) => {
    setSelectedUser({ ...user });
    setIsPopoverOpen(true);
  };

  // Hàm lưu đồng thời các thay đổi trên Popover xuống DB
  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    setIsPopoverOpen(false);
    
    await handleUpdate(selectedUser.id, 'role', selectedUser.role.toLowerCase());
    await handleUpdate(selectedUser.id, 'subscription_plan', selectedUser.subscription_plan);
    await handleUpdate(selectedUser.id, 'status', selectedUser.status);
  };

  // 🐐 LOADING HOÀNG GIA: Gọi chú dê thần lật sách cổ của bạn ra gác cổng
  if (initialLoading) {
    return (
      <View style={styles.loadingCenter}>
        <GlowLoading />
        <Text style={styles.loadingText}>
          Đang đồng bộ hồ sơ lưu trữ Nhóm 44...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      
      {/* 🔮 TIÊU ĐỀ BẢNG VÀ NÚT THAO TÁC ACTION BAR SANG TRỌNG */}
      <View style={styles.actionBar}>
        <View>
          <Text style={styles.mainTitle}>Member Directory</Text>
          <Text style={styles.subTitleCount}>
            Showing {filteredUsers.length} of {users.length} active records
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity style={styles.actionFilterBtn}><Filter size={12} color="#4A321F" /><Text style={styles.actionBtnText}>Filter</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionFilterBtn}><Download size={12} color="#4A321F" /><Text style={styles.actionBtnText}>Export</Text></TouchableOpacity>
        </View>
      </View>

      {/* THANH TÌM KIẾM NHANH PAPER ĐỒNG BỘ CẤU TRÚC GÕ */}
      <Searchbar
        placeholder="Tìm kiếm theo email tài khoản hoặc tên độc giả..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={{ fontSize: 13, color: '#4A321F' }}
        placeholderTextColor="#8A7663"
      />

      {/* THÂN DANH SÁCH HIỂN THỊ THÀNH VIÊN ĐỘNG THEO CARD VIEW */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={{ gap: 16 }}>
          {filteredUsers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              
              {/* Cột 1: Thông tin định danh thành viên */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, flex: 1.5 }}>
                <Image 
                  source={{ uri: member.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" }} 
                  style={styles.avatarImg} 
                />
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={styles.memberNameText}>{member.name || 'Thành viên mới'}</Text>
                    <View style={[styles.statusDot, { backgroundColor: member.status === "ACTIVE" || !member.status ? "#1B6E3E" : "#C1272D" }]} />
                  </View>
                  <Text style={styles.memberEmailText}>{member.email}</Text>
                </View>
              </View>

              {/* Cột 2: Ngày tham gia hệ thống */}
              <View style={{ flex: 1 }}>
                <Text style={styles.columnLabel}>JOIN DATE</Text>
                <Text style={styles.columnValue}>
                  {member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', {month: 'short', day: '2-digit', year: 'numeric'}) : "Recent"}
                </Text>
              </View>

              {/* Cột 3: Hiển thị Quyền hạn & Cấp độ gói dịch vụ live từ Database */}
              <View style={{ flex: 1.2, flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>{(member.role || 'READER').toUpperCase()}</Text>
                </View>
                <View style={styles.planTag}>
                  <Text style={styles.planTagText}>{(member.subscription_plan || 'CƠ BẢN').toUpperCase()}</Text>
                </View>
              </View>

              {/* Cột 4: Tổ hợp phím hành động điều hành nhanh */}
              <View style={styles.cardActionsGroup}>
                <TouchableOpacity onPress={() => handleOpenEditPopover(member)} style={styles.iconActionBtn}><Edit2 size={13} color="#614124" /></TouchableOpacity>
                <TouchableOpacity onPress={() => handleUpdate(member.id, 'status', member.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')} style={styles.iconActionBtn}><Shield size={13} color={member.status === 'SUSPENDED' ? '#C1272D' : '#614124'} /></TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => handleOpenEditPopover(member)}
                  style={styles.detailsBtn}
                >
                  <Text style={styles.detailsBtnText}>View Details</Text>
                </TouchableOpacity>
              </View>

            </View>
          ))}

          {filteredUsers.length === 0 && (
            <Text style={styles.emptyText}>
              Không tìm thấy tài khoản nào phù hợp trong học viện thư viện cổ.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* ================= MODAL NỔI CHỈNH SỬA CHI TIẾT (POPOVER HOÀNG GIAChuẩn) ================= */}
      {isPopoverOpen && selectedUser && (
        <Modal transparent animationType="fade" visible={isPopoverOpen}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              
              <TouchableOpacity onPress={() => setIsPopoverOpen(false)} style={styles.closeModalBtn}>
                <X size={16} color="#8A7663" />
              </TouchableOpacity>

              <View style={styles.modalUserHeader}>
                <Image source={{ uri: selectedUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&auto=format&fit=crop" }} style={styles.modalAvatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalUserName}>{selectedUser.name || "Reader"}</Text>
                  <Text numberOfLines={1} style={styles.modalUserEmail}>{selectedUser.email}</Text>
                </View>
              </View>

              {/* QUẢN LÝ QUYỀN HẠN (ROLE) */}
              <Text style={styles.modalSectionLabel}>ROLE MANAGEMENT</Text>
              <View style={styles.toggleRowContainer}>
                {["ADMIN", "AUTHOR", "READER"].map((r) => {
                  const isRoleActive = (selectedUser.role || 'READER').toUpperCase() === r;
                  return (
                    <TouchableOpacity 
                      key={r} 
                      onPress={() => setSelectedUser({ ...selectedUser, role: r.toLowerCase() })}
                      style={[styles.toggleBtn, isRoleActive && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, isRoleActive && styles.toggleBtnTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* 🔥 ĐÃ ĐỒNG BỘ ĐỘNG: Quét vòng lặp từ mảng plans bảng packages của backend gửi thay vì ghi cứng */}
              <Text style={styles.modalSectionLabel}>SUBSCRIPTION LEVEL (PACKAGES)</Text>
              <View style={styles.planGridContainer}>
                {/* Nút mặc định cơ bản */}
                <TouchableOpacity 
                  onPress={() => setSelectedUser({ ...selectedUser, subscription_plan: '' })}
                  style={[styles.modalPlanGridBtn, (!selectedUser.subscription_plan || selectedUser.subscription_plan === '') && styles.toggleBtnActive]}
                >
                  <Text style={[styles.toggleBtnText, (!selectedUser.subscription_plan || selectedUser.subscription_plan === '') && styles.toggleBtnTextActive]}>CƠ BẢN</Text>
                </TouchableOpacity>

                {/* Vòng lặp map tự động ăn khớp theo danh sách gói thật */}
                {plans.map((p) => {
                  const isPlanActive = (selectedUser.subscription_plan || '').toLowerCase() === p.name.toLowerCase();
                  return (
                    <TouchableOpacity 
                      key={p.id} 
                      onPress={() => setSelectedUser({ ...selectedUser, subscription_plan: p.name })}
                      style={[styles.modalPlanGridBtn, isPlanActive && styles.toggleBtnActive]}
                    >
                      <Text style={[styles.toggleBtnText, isPlanActive && styles.toggleBtnTextActive]}>{p.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* TRẠNG THÁI KHÓA/MỞ */}
              <Text style={styles.modalSectionLabel}>ACCOUNT STATUS</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 24 }}>
                <TouchableOpacity 
                  onPress={() => setSelectedUser({ ...selectedUser, status: "ACTIVE" })}
                  style={[styles.statusToggleBtn, (selectedUser.status === "ACTIVE" || !selectedUser.status) && { backgroundColor: "#E1F2E8" }]}
                >
                  <Text style={[styles.statusToggleBtnText, (selectedUser.status === "ACTIVE" || !selectedUser.status) ? { color: "#1B6E3E" } : { color: "#8A7663" }]}>ACTIVE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setSelectedUser({ ...selectedUser, status: "SUSPENDED" })}
                  style={[styles.statusToggleBtn, selectedUser.status === "SUSPENDED" && { backgroundColor: "#FDF0F0" }]}
                >
                  <Text style={[styles.statusToggleBtnText, selectedUser.status === "SUSPENDED" ? { color: "#C1272D" } : { color: "#8A7663" }]}>SUSPENDED</Text>
                </TouchableOpacity>
              </View>

              {/* NÚT LƯU TỔNG THỂ */}
              <TouchableOpacity 
                onPress={handleSaveChanges}
                style={styles.modalSaveBtn}
              >
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              </TouchableOpacity>

              <View style={styles.modalFooterActions}>
                <TouchableOpacity onPress={() => { setIsPopoverOpen(false); handleUpdate(selectedUser.id, 'status', 'SUSPENDED'); }}><Text style={styles.suspendTextLink}>SUSPEND USER</Text></TouchableOpacity>
                <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <RefreshCw size={11} color="#8A7663" />
                  <Text style={styles.resetPwdTextLink}>RESET PASSWORD</Text>
                </TouchableOpacity>
              </View>

            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

// 🎨 KHUNG ĐỊNH DẠNG MÀU SẮC LỤA MỜ CỔ ĐIỂN VÀ VÀNG ĐỒNG SANG TRỌNG CỦA KHANH
const styles = StyleSheet.create({
  outerContainer: { flex: 1, width: "100%", paddingHorizontal: 4 },
  loadingCenter: { flex: 1, minHeight: 350, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#614124', fontWeight: 'bold', fontStyle: 'italic', fontSize: 13 },
  
  actionBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  mainTitle: { fontSize: 22, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" },
  subTitleCount: { fontSize: 13, color: "#8A7663", marginTop: 2, fontStyle: "italic" },
  actionFilterBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#FFFDF9", borderWidth: 1, borderColor: "#E6DCD0", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: "bold", color: "#4A321F" },
  
  searchBar: { marginBottom: 20, backgroundColor: '#FFFDF9', borderRadius: 12, height: 44, elevation: 2, borderWidth: 1, borderColor: '#E6DCD0' },
  
  // Thiết kế dòng thẻ danh bạ (Member Cards) của bạn
  memberCard: { backgroundColor: "#FFFDF9", borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#EBE3D5", marginBottom: 12, elevation: 1 },
  avatarImg: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6DCD0' },
  memberNameText: { fontSize: 15, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  memberEmailText: { fontSize: 13, color: "#8A7663", marginTop: 1 },
  
  columnLabel: { fontSize: 10, fontWeight: "bold", color: "#A39281", letterSpacing: 0.5 },
  columnValue: { fontSize: 13, color: "#4A321F", fontWeight: "600", marginTop: 2 },
  
  roleTag: { backgroundColor: "#FCEFDE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  roleTagText: { fontSize: 10, fontWeight: "bold", color: "#614124" },
  planTag: { backgroundColor: "rgba(212,175,55,0.12)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: "rgba(212,175,55,0.25)" },
  planTagText: { fontSize: 9, fontWeight: "bold", color: "#B3922E" },
  
  cardActionsGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconActionBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F3EDE4", alignItems: "center", justifyContent: "center" },
  detailsBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: "#FFFDF9", borderWidth: 1, borderColor: "#E6DCD0" },
  detailsBtnText: { fontSize: 12, fontWeight: "bold", color: "#4A321F" },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8A7663', fontStyle: 'italic', fontSize: 14 },

  // Kiến trúc cửa sổ nổi Popover mờ ảo hoàng gia
  modalOverlay: { flex: 1, backgroundColor: "rgba(74,50,31,0.25)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: 370, backgroundColor: "#FFFDF9", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#E6DCD0", position: "relative" },
  closeModalBtn: { position: "absolute", top: 18, right: 18, zIndex: 10 },
  modalUserHeader: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 },
  modalAvatar: { width: 48, height: 48, borderRadius: 24 },
  modalUserName: { fontSize: 18, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" },
  modalUserEmail: { fontSize: 12, color: "#8A7663", marginTop: 2 },
  
  modalSectionLabel: { fontSize: 10, fontWeight: "bold", color: "#A39281", marginBottom: 8, letterSpacing: 0.5 },
  toggleRowContainer: { flexDirection: "row", backgroundColor: "#F3EDE4", borderRadius: 8, padding: 2, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 6, alignItems: "center", borderRadius: 6 },
  toggleBtnActive: { backgroundColor: "#FCEFDE" },
  toggleBtnText: { fontSize: 11, fontWeight: "bold", color: "#8A7663" },
  toggleBtnTextActive: { color: "#614124" },
  
  planGridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 20 },
  modalPlanGridBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: "#E6DCD0", backgroundColor: "#FFF" },
  
  statusToggleBtn: { backgroundColor: "#F3EDE4", paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  statusToggleBtnText: { fontSize: 11, fontWeight: "bold" },
  
  modalSaveBtn: { backgroundColor: "#C5A059", paddingVertical: 12, borderRadius: 12, alignItems: "center", marginBottom: 16, borderWidth: 1, borderColor: "#FFF" },
  modalSaveBtnText: { color: "#000", fontWeight: "bold", fontSize: 14 },
  
  modalFooterActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 },
  suspendTextLink: { fontSize: 11, color: "#C1272D", fontWeight: "bold" },
  resetPwdTextLink: { fontSize: 11, color: "#8A7663", fontWeight: "bold" }
});