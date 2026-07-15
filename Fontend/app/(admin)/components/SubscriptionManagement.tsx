import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, TouchableOpacity, useWindowDimensions, TextInput } from 'react-native';
import { Text, Portal, Provider, Modal } from 'react-native-paper';
import { Check, Save, Plus, Clock, CreditCard, AlignLeft, Type, X } from "lucide-react-native";

// 💡 ĐÃ ĐỒNG BỘ: Gọi component chú dê ma thuật hoàng gia khi đang tải dữ liệu API
import GlowLoading from "../../../components/GlowLoading"; 

export default function SubscriptionManagement() {
  const { width } = useWindowDimensions();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // State quản lý Modal tạo gói mới
  const [visible, setVisible] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',         
    price: 0,         
    duration_days: 30, 
    description: '' 
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/packages/list');
      const resJson = await res.json();
      if (resJson.success) {
        const formattedData = (resJson.data || []).map((plan: any, idx: number) => ({
          ...plan,
          isElite: idx === 2 || (plan.name || '').toLowerCase().includes('premium')
        }));
        setPlans(formattedData);
      }
    } catch (err: any) {
      console.error("Lỗi fetch danh sách gói của Admin:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name || !newPlan.price || !newPlan.duration_days) {
      if (Platform.OS === 'web') window.alert("Chủ Tịch vui lòng nhập đầy đủ Tên gói, Giá tiền và Số ngày!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/packages/admin-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPlan.name.trim(),
          price: newPlan.price,
          duration_days: newPlan.duration_days,
          description: newPlan.description.trim()
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        if (Platform.OS === 'web') window.alert("Thành công: Đã tạo gói mới lên hệ thống Nhóm 44!");
        setVisible(false);
        setNewPlan({ name: '', price: 0, duration_days: 30, description: '' });
        fetchPlans();
      } else {
        if (Platform.OS === 'web') window.alert("Lỗi: " + resJson.message);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlan = async (plan: any) => {
    setSaving(plan.id);
    try {
      const res = await fetch('http://localhost:3000/api/packages/admin-edit ', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: plan.id,
          name: plan.name,
          price: plan.price,
          duration_days: plan.duration_days,
          description: plan.description
        })
      });
      const resJson = await res.json();
      if (resJson.success) {
        if (Platform.OS === 'web') window.alert(`Thành công: Đã lưu thay đổi cho gói ${plan.name}`);
      } else {
        if (Platform.OS === 'web') window.alert("Lỗi: " + resJson.message);
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setSaving(null);
    }
  };

  if (loading && plans.length === 0) return (
    <View style={styles.loadingCenter}><GlowLoading /></View>
  );

  return (
    <Provider>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 200 }}>
            <Text style={styles.title}>Gói Thành Viên</Text>
            <Text style={styles.subtitle}>Hệ thống quản lý gói đặc quyền thành viên Nhóm 44</Text>
          </View>
          <TouchableOpacity onPress={() => setVisible(true)} style={styles.createBtn} activeOpacity={0.8}>
            <Plus size={16} color="#FFF" />
            <Text style={styles.createBtnText}>Create New</Text>
          </TouchableOpacity>
        </View>

        {/* RESPONSIVE FLUID GRID (ĐÃ FIX CO HẸP) */}
        <View style={styles.grid}>
          {plans.map((plan) => (
            <View 
              key={plan.id} 
              style={[styles.card, plan.isElite && styles.eliteCard]}
            >
              <View style={styles.cardInnerContent}>
                {/* Tag định danh */}
                <View style={[styles.badge, { backgroundColor: plan.isElite ? "#614124" : "#F3EDE4" }]}>
                  <Text style={[styles.badgeText, { color: plan.isElite ? "#FAF6F0" : "#8A7663" }]}>
                    {plan.isElite ? "ELITE SYSTEM PACK" : "STANDARD PACK"}
                  </Text>
                </View>

                {/* Ô nhập Tên gói */}
                <Text style={styles.fieldLabel}> Name</Text>
                <View style={styles.inputWrapper}>
                  <Type size={14} color="#614124" style={styles.inputIcon} />
                  <TextInput
                    value={plan.name}
                    onChangeText={(text) => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, name: text} : p))}
                    style={styles.cardTitleInput}
                  />
                </View>
                
                {/* Ô nhập Đơn giá */}
                <Text style={styles.fieldLabel}>Price (VND)</Text>
                <View style={styles.inputWrapper}>
                  <CreditCard size={14} color="#614124" style={styles.inputIcon} />
                  <TextInput
                    value={plan.price.toString()}
                    keyboardType="numeric"
                    onChangeText={(text) => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, price: parseFloat(text) || 0} : p))}
                    style={styles.priceInput}
                  />
                </View>

                {/* Ô nhập Số ngày hiệu lực */}
                <Text style={styles.fieldLabel}>Duration (Days)</Text>
                <View style={styles.inputWrapper}>
                  <Clock size={14} color="#614124" style={styles.inputIcon} />
                  <TextInput
                    value={plan.duration_days ? plan.duration_days.toString() : ''}
                    keyboardType="numeric"
                    onChangeText={(text) => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, duration_days: parseInt(text) || 0} : p))}
                    style={styles.durationInput}
                  />
                </View>

                {/* Mô tả đặc quyền */}
                <Text style={styles.fieldLabel}> Description</Text>
                <TextInput
                  value={plan.description || ''}
                  onChangeText={(text) => setPlans(prev => prev.map(p => p.id === plan.id ? {...p, description: text} : p))}
                  style={styles.descriptionInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Nhập chuỗi đặc quyền dòng mới..."
                  placeholderTextColor="#A39281"
                />
              </View>

              {/* Nút lưu */}
              <TouchableOpacity 
                onPress={() => handleUpdatePlan(plan)}
                disabled={saving === plan.id}
                style={[styles.saveBtn, plan.isElite && styles.eliteSaveBtn]}
                activeOpacity={0.8}
              >
                {saving === plan.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Save size={14} color="#FFF" />
                    <Text style={styles.saveBtnText}>Save Updates</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* POPUP MODAL THÊM MỚI */}
      <Portal>
        <Modal 
          visible={visible} 
          onDismiss={() => setVisible(false)} 
          contentContainerStyle={[
            styles.modalContent, 
            { width: width < 600 ? '92%' : '480px' }
          ] as any}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>CREATE ARCHIVAL TIER</Text>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeModalBtn}>
              <X size={18} color="#8A7663" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.modalFieldLabel}>Tên hiển thị gói</Text>
          <View style={styles.modalInputWrapper}>
            <Type size={14} color="#614124" style={styles.inputIcon} />
            <TextInput
              placeholder="Ví dụ: Gói Vàng Thượng Đỉnh"
              placeholderTextColor="#A39281"
              value={newPlan.name}
              onChangeText={(text) => setNewPlan({...newPlan, name: text})}
              style={styles.modalInput}
            />
          </View>

          <Text style={styles.modalFieldLabel}>Giá tiền (VNĐ)</Text>
          <View style={styles.modalInputWrapper}>
            <CreditCard size={14} color="#614124" style={styles.inputIcon} />
            <TextInput
              placeholder="0"
              placeholderTextColor="#A39281"
              value={newPlan.price === 0 ? '' : newPlan.price.toString()}
              keyboardType="numeric"
              onChangeText={(text) => setNewPlan({...newPlan, price: parseFloat(text) || 0})}
              style={styles.modalInput}
            />
          </View>

          <Text style={styles.modalFieldLabel}>Thời hạn hiệu lực (Số ngày)</Text>
          <View style={styles.modalInputWrapper}>
            <Clock size={14} color="#614124" style={styles.inputIcon} />
            <TextInput
              placeholder="30"
              placeholderTextColor="#A39281"
              value={newPlan.duration_days.toString()}
              keyboardType="numeric"
              onChangeText={(text) => setNewPlan({...newPlan, duration_days: parseInt(text) || 0})}
              style={styles.modalInput}
            />
          </View>

          <Text style={styles.modalFieldLabel}>Chuỗi nội dung mô tả đặc quyền</Text>
          <TextInput
            placeholder="Đọc full truyện VIP Nhóm 44..."
            placeholderTextColor="#A39281"
            value={newPlan.description}
            onChangeText={(text) => setNewPlan({...newPlan, description: text})}
            style={styles.modalDescriptionInput}
            multiline
            numberOfLines={4}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.modalCancelBtn}>
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCreatePlan} style={styles.modalConfirmBtn} activeOpacity={0.8}>
              <Text style={styles.modalConfirmBtnText}>Confirm Tier</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    </Provider>
  );
}

// 🎨 ĐÃ ĐỒNG BỘ MÀU SẮC ĐẬM ĐÀ, KHÔNG BỊ MỜ CHỮ TRÊN MỌI THIẾT BỊ
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { 
    padding: Platform.OS === 'web' ? 24 : 16, 
    width: '100%', 
    paddingBottom: 60 
  },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF6F0' },
  
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16
  },
  title: { fontSize: 24, fontWeight: '900', color: '#4A321F', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? "Georgia" : "serif" },
  subtitle: { fontSize: 13, color: '#8A7663', marginTop: 2 },
  
  // Sửa Grid: Dùng flexGrow và flexBasis để card tự động mở rộng bao trọn vùng trống
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 16,
    width: "100%",
    justifyContent: "flex-start"
  },
  card: { 
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    padding: 18, 
    justifyContent: "space-between", 
    minHeight: 520,
    borderWidth: 1.5,
    borderColor: "#E6DCD0",
    shadowColor: "#4A321F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    // Thuộc tính cốt lõi giúp card co giãn linh hoạt:
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: Platform.OS === 'web' ? 280 : '100%', // Đảm bảo độ rộng tối thiểu của mỗi Card luôn từ 280px trở lên, không bao giờ bị hẹp nữa
    maxWidth: Platform.OS === 'web' ? 340 : '100%'
  },
  eliteCard: {
    borderWidth: 2.5, 
    borderColor: "#4A321F",
  },
  cardInnerContent: { flex: 1 },

  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, marginBottom: 16 },
  badgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  // Label màu đậm rõ nét
  fieldLabel: { fontSize: 11, fontWeight: "800", color: "#4A321F", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 },
  
  // Border wrapper rõ ràng, đậm màu giúp chống mờ mắt trên Web
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D4C5B3',
    borderRadius: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  inputIcon: { marginRight: 8 },

  // Thay sang TextInput gốc của RN để chữ hiển thị nét 100%, có màu đen/nâu đậm tương phản cao
  cardTitleInput: { flex: 1, height: 38, fontSize: 15, fontWeight: "700", color: "#322114", padding: 0, outlineStyle: 'none' as any },
  priceInput: { flex: 1, height: 38, fontSize: 15, fontWeight: "700", color: "#322114", padding: 0, outlineStyle: 'none' as any },
  durationInput: { flex: 1, height: 38, fontSize: 14, fontWeight: "700", color: "#322114", padding: 0, outlineStyle: 'none' as any },
  descriptionInput: { 
    fontSize: 13, 
    color: "#322114", 
    backgroundColor: "#FFF", 
    paddingHorizontal: 10, 
    paddingVertical: 8, 
    borderRadius: 8, 
    borderWidth: 1.5, 
    borderColor: "#D4C5B3", 
    textAlignVertical: "top",
    minHeight: 100,
    marginBottom: 10,
    outlineStyle: 'none' as any
  },

  saveBtn: { backgroundColor: "#8A7663", flexDirection: "row", alignItems: "center", justifyContent: "center", height: 42, borderRadius: 8, gap: 6, marginTop: 12 },
  eliteSaveBtn: { backgroundColor: "#4A321F" },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
  
  createBtn: { backgroundColor: "#4A321F", flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, gap: 8 },
  createBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // MODAL ĐỒNG BỘ CHẤT LƯỢNG CAO
  modalContent: { 
    backgroundColor: '#FFFDF9', 
    padding: 24, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: '#4A321F', 
    elevation: 24,
    alignSelf: 'center'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '900', color: '#4A321F', fontFamily: Platform.OS === 'ios' ? "Georgia" : 'serif' },
  closeModalBtn: { padding: 4, backgroundColor: '#F3EDE4', borderRadius: 6 },
  
  modalFieldLabel: { fontSize: 12, fontWeight: "800", color: "#4A321F", marginBottom: 6 },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D4C5B3',
    borderRadius: 8,
    marginBottom: 14,
    paddingHorizontal: 10,
  },
  modalInput: { flex: 1, height: 40, fontSize: 14, color: "#322114", padding: 0, outlineStyle: 'none' as any },
  modalDescriptionInput: { 
    backgroundColor: "#FFF", 
    padding: 10, 
    borderRadius: 8, 
    borderWidth: 1.5, 
    borderColor: '#D4C5B3', 
    fontSize: 13, 
    color: "#322114", 
    marginBottom: 20, 
    textAlignVertical: "top",
    minHeight: 100,
    outlineStyle: 'none' as any
  },
  
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F3EDE4' },
  modalCancelBtnText: { color: "#8A7663", fontWeight: "700", fontSize: 13 },
  modalConfirmBtn: { backgroundColor: "#4A321F", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  modalConfirmBtnText: { color: "#FFF", fontWeight: "700", fontSize: 13 }
});