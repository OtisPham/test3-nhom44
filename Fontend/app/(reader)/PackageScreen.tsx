import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Alert, Modal, Image, Platform } from 'react-native';
import { Avatar, Surface, Button, Paragraph } from 'react-native-paper';
import { Check, Compass, CreditCard, ShieldCheck, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import GlowLoading from '../../components/GlowLoading'; 

export default function PackageScreen() {
  const router = useRouter();
  const [apiPackages, setApiPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái gói hội viên hiện tại đồng bộ từ DB
  const [userMembership, setUserMembership] = useState({
    tier: 'Gói Thường',
    startDate: '--/--/----',
    endDate: 'Vô thời hạn'
  });

  const [userEmail, setUserEmail] = useState('');
  const [paymentModal, setPaymentModal] = useState<{ visible: boolean; pkg: any }>({ visible: false, pkg: null });
  const [paymentStep, setPaymentStep] = useState<1 | 2>(1);

  // 🛡️ BỘ LỌC SIÊU SẠCH: Xử lý token chống lỗi jwt malformed
  const getValidToken = async (): Promise<string | null> => {
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;

      if (!token && Platform.OS === 'web') {
        const localToken = localStorage.getItem('userToken');
        if (localToken) token = localToken;
      }

      if (typeof token === 'string' && token.trim().startsWith('{')) {
        try {
          token = JSON.parse(token).access_token;
        } catch (e) {
          console.error("Lỗi định dạng cấu trúc JSON token:", e);
        }
      }

      if (typeof token === 'string') {
        token = token.replace(/^"|"$/g, '').trim(); 
      }

      return token || null;
    } catch (error) {
      return null;
    }
  };

  // 1. Tải danh sách gói cước và tự động bù thêm thẻ "GÓI THƯỜNG" nếu trống trải
  const fetchPackages = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/packages/list');
      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        const mapped = resJson.data.map((pkg: any) => ({
          id: pkg.id,
          name: pkg.name || 'VIP',
          price: Number(pkg.price) || 0,
          duration: pkg.duration_days || 30,
          period: pkg.price === 0 ? '/Miễn phí' : `/${pkg.duration_days} ngày`,
          description: pkg.description || 'Đặc quyền mở khóa kho truyện hội viên cực hạn',
          features: pkg.price > 0 
            ? ['Mở khóa HOÀN TOÀN tập truyện VIP', 'Tốc độ tải trang, đọc truyện cực hạn', 'Không quảng cáo ngắt quãng luồng đọc']
            : ['Đọc các chương truyện công khai', 'Lưu trữ truyện vào tủ sách cá nhân', 'Bình luận và tương tác cộng đồng']
        }));

        // Tự động chèn gói thường lên đầu nếu dữ liệu trả về chỉ có gói tính phí
        const hasFreePlan = mapped.some((p: any) => p.price === 0 || p.name.toLowerCase() === 'free' || p.name.toUpperCase() === 'GÓI THƯỜNG');
        if (!hasFreePlan) {
          const defaultFreePlan = {
            id: 'default-free-plan-id',
            name: 'GÓI THƯỜNG',
            price: 0,
            duration: 0,
            period: '/Mặc định',
            description: 'Tài khoản cơ bản dành cho mọi độc giả đọc truyện free',
            features: ['Đọc các chương truyện công khai', 'Lưu trữ truyện vào tủ sách cá nhân', 'Bình luận và tương tác cộng đồng']
          };
          setApiPackages([defaultFreePlan, ...mapped]);
        } else {
          setApiPackages(mapped);
        }
      }
    } catch (err) {
      console.error("❌ Lỗi đồng bộ danh sách gói:", err);
    }
  };

  // 2. Tải thông tin gói hiện hành của tài khoản
  const fetchUserPlusData = useCallback(async () => {
    try {
      const token = await getValidToken();
      const sessionRes = await supabase.auth.getSession();
      
      if (sessionRes.data.session?.user?.email) {
        setUserEmail(sessionRes.data.session.user.email.split('@')[0]);
      }

      if (!token) return;

      const profileRes = await fetch('http://localhost:3000/api/users/profile/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const profileData = await profileRes.json();

      if (profileData.success && profileData.data) {
        const u = profileData.data;
        const currentTier = u.subscription_plan || 'free';
        const isVip = currentTier.toLowerCase() !== 'free' && currentTier.toLowerCase() !== 'empty';
        
        setUserMembership({
          tier: isVip ? currentTier.toUpperCase() : 'Gói Thường',
          startDate: u.start_date ? new Date(u.start_date).toLocaleDateString('vi-VN') : '--/--/----',
          endDate: isVip ? (u.end_date ? new Date(u.end_date).toLocaleDateString('vi-VN') : 'Theo hạn gói') : 'Vô thời hạn'
        });
      }
    } catch (err) {
      console.log("Lỗi đồng bộ hồ sơ độc giả.");
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([fetchPackages(), fetchUserPlusData()]);
      setLoading(false);
    };
    initData();
  }, [fetchUserPlusData]);

  const openPaymentGate = (pkg: any) => {
    const normalizedUserTier = userMembership.tier.toUpperCase() === 'GÓI THƯỜNG' ? 'GÓI THƯỜNG' : userMembership.tier.toUpperCase();
    if (normalizedUserTier === pkg.name.toUpperCase()) return; 

    if (pkg.price === 0) {
      executePurchase(pkg, 'http://localhost:3000/api/packages/buy');
    } else {
      setPaymentStep(1); 
      setPaymentModal({ visible: true, pkg });
    }
  };

  // 3. XỬ LÝ MUA GÓI: Sau khi thành công, trả lại trang đọc truyện trước đó
  const executePurchase = async (pkg: any, endpointUrl: string) => {
    setBuyingId(pkg.id);
    setSubmitting(true);
    setPaymentModal({ visible: false, pkg: null });

    try {
      const token = await getValidToken();
      if (!token) {
        setSubmitting(false);
        setBuyingId(null);
        return Alert.alert("Thông báo", "Vui lòng đăng nhập hệ thống trước khi thanh toán!");
      }

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ packageId: pkg.id, amount: Number(pkg.price) })
      });

      const resJson = await response.json();
      if (resJson.success) {
        Alert.alert("Kích hoạt thành công 🎉", "Đặc quyền VIP đã mở khóa! Hệ thống đang đưa bạn trở lại luồng truyện đọc nhỡ.");
        
        // 🔄 QUAY LẠI TRANG TRUYỆN: Thực hiện lệnh lùi lịch sử để tiếp tục đọc chương truyện tính tiền cũ
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(reader)/HomeScreen');
        }
      } else {
        Alert.alert("Giao dịch thất bại", resJson.message || "Lỗi xử lý hệ thống.");
      }
    } catch (err) {
      Alert.alert("Lỗi kết nối", "Không thể thiết lập liên kết dữ liệu với Backend.");
    } finally {
      setBuyingId(null);
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.centerContainer}><GlowLoading /></View>;
  }

  const qrUrl = paymentModal.pkg 
    ? `https://img.vietqr.io/image/MBBank-0987654321-print.png?amount=${paymentModal.pkg.price}&addInfo=NHOM44%20PREMIUM%20${userEmail || 'USER'}&accountName=NGUYEN%20VAN%20A`
    : '';

  return (
    <View style={styles.container}>
      <View style={styles.contentWrapper}>
        
        {/* NÚT BACK QUAY LẠI TRUYỆN NHANH TRÊN HEADER */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtnRow} onPress={() => router.back()}>
            <ArrowLeft size={20} color="#6c2f00" />
            <Text style={styles.backBtnText}>Quay lại truyện đang đọc</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Compass size={18} color="#b58255" />
            <Text style={styles.topBarTitle}>Mở Khóa Chương VIP</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          
          {/* KHỐI TRẠNG THÁI HIỆN TẠI */}
          <Surface style={styles.statusCard} elevation={1}>
            <View style={styles.statusHeader}>
              <ShieldCheck size={20} color="#6c2f00" />
              <Text style={styles.statusTitle}>Gói hiện tại</Text>
            </View>
            <View style={styles.statusDetailsRow}>
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusLabel}>Gói đang dùng</Text>
                <Text style={[styles.statusValue, { color: '#d97736' }]}>{userMembership.tier}</Text>
              </View>
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusLabel}>Ngày kích hoạt</Text>
                <Text style={styles.statusValue}>{userMembership.startDate}</Text>
              </View>
              <View style={styles.statusDetailItem}>
                <Text style={styles.statusLabel}>Ngày hết hạn</Text>
                <Text style={styles.statusValue}>{userMembership.endDate}</Text>
              </View>
            </View>
          </Surface>

          <View style={styles.heroSection}>
            <Text style={styles.heroTag}>NÂNG CẤP ĐẶC QUYỀN</Text>
            <Text style={styles.heroTitle}>Đầu Tư Cho Không Gian Tri Thức</Text>
          </View>

          {/* HIỂN THỊ THẺ PACKAGES */}
          <View style={styles.cardsRow}>
            {apiPackages.map((pkg) => {
              const normalizedUserTier = userMembership.tier.toUpperCase() === 'GÓI THƯỜNG' ? 'GÓI THƯỜNG' : userMembership.tier.toUpperCase();
              const isCurrentActive = normalizedUserTier === pkg.name.toUpperCase();

              return (
                <View key={pkg.id} style={[styles.packageCard, pkg.price > 0 && styles.hotCardBorder, isCurrentActive && styles.activeCardBorder]}>
                  {pkg.price > 0 && (
                    <View style={styles.hotBadge}><Text style={styles.hotBadgeText}>👑 GÓI VIP</Text></View>
                  )}

                  <Text style={styles.packageName}>{pkg.name.toUpperCase()}</Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.priceValue}>{pkg.price.toLocaleString('vi-VN')}đ</Text>
                    <Text style={styles.period}>{pkg.period}</Text>
                  </View>
                  
                  <View style={styles.featuresList}>
                    <Paragraph style={styles.pkgDesc}>{pkg.description}</Paragraph>
                    <View style={styles.divider} />
                    {pkg.features.map((feat: string, i: number) => (
                      <View key={i} style={styles.featureItem}>
                        <View style={styles.checkIconWrapper}><Check size={11} color="#6c2f00" strokeWidth={3} /></View>
                        <Text style={styles.featureText}>{feat}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flex: 1 }} />
                  
                  <TouchableOpacity 
                    style={[styles.actionBtnBase, isCurrentActive ? styles.btnDisabled : (pkg.price === 0 ? styles.actionBtnNormal : styles.actionBtnHot)]} 
                    disabled={buyingId !== null || isCurrentActive || submitting}
                    onPress={() => openPaymentGate(pkg)}
                  >
                    {buyingId === pkg.id ? (
                      <View style={styles.miniLoadingScale}><GlowLoading /></View>
                    ) : (
                      <Text style={[styles.actionBtnText, isCurrentActive ? styles.textMuted : (pkg.price === 0 ? styles.textBrown : styles.textWhite)]}>
                        {isCurrentActive ? '✓ Đang sử dụng' : (pkg.price === 0 ? 'Mặc định' : 'Đăng ký ngay')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* 💳 CỔNG THANH TOÁN QR MODAL */}
      <Modal visible={paymentModal.visible} transparent={true} animationType="fade" onRequestClose={() => setPaymentModal({ visible: false, pkg: null })}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent} elevation={5}>
            <CreditCard size={32} color="#000" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Cổng Thanh Toán Điện Tử VietQR</Text>
            
            {paymentModal.pkg && (
              <View style={{ width: '100%', alignItems: 'center' }}>
                {paymentStep === 1 ? (
                  <>
                    <View style={styles.paymentBox}>
                      <Text style={styles.payLabel}>Gói đăng ký: <Text style={{ fontWeight: '700' }}>{paymentModal.pkg?.name.toUpperCase()}</Text></Text>
                      <Text style={styles.payLabel}>Chi phí nạp: <Text style={styles.payPrice}>{(paymentModal.pkg?.price || 0).toLocaleString('vi-VN')} đ</Text></Text>
                    </View>
                    <Text style={styles.momoHint}>👉 Nhấp chọn phương thức để hiển thị mã QR ngân hàng hoặc sử dụng cổng duyệt test tự động.</Text>
                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelPayBtn} onPress={() => setPaymentModal({ visible: false, pkg: null })}><Text style={styles.cancelText}>Quay lại</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.confirmPayBtn} onPress={() => setPaymentStep(2)}><Text style={styles.confirmText}>Quét mã QR</Text></TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.qrSectionContainer}>
                      <Image source={{ uri: qrUrl }} style={styles.qrImageStyle} />
                      <View style={styles.qrDetailInfoBox}>
                        <Text style={styles.qrDetailText}>📌 Ngân hàng: <Text style={{ fontWeight: '700' }}>MBBank</Text></Text>
                        <Text style={styles.qrDetailText}>📌 Số tài khoản: <Text style={{ fontWeight: '700' }}>0987654321</Text></Text>
                        <Text style={styles.qrDetailText}>📌 Nội dung: <Text style={{ fontWeight: '700', color: '#b58255' }}>NHOM44 PREMIUM {userEmail || 'USER'}</Text></Text>
                      </View>
                    </View>

                    <Text style={styles.warningHintText}>⚠️ Sau khi chuyển tiền thành công, nhấn một trong hai nút xác nhận phía dưới để hệ thống kích hoạt.</Text>

                    <Button 
                      mode="contained" 
                      buttonColor="#2E7D32" 
                      style={{ width: '100%', borderRadius: 6, marginBottom: 10 }} 
                      loading={submitting} 
                      disabled={submitting} 
                      onPress={() => executePurchase(paymentModal.pkg, 'http://localhost:3000/api/packages/fake-webhook-payment')}
                    >
                      💸 [TEST] GIẢ LẬP NGÂN HÀNG DUYỆT TỰ ĐỘNG
                    </Button>

                    <View style={styles.modalActions}>
                      <TouchableOpacity style={styles.cancelPayBtn} onPress={() => setPaymentStep(1)}><Text style={styles.cancelText}>Thay đổi</Text></TouchableOpacity>
                      <TouchableOpacity style={[styles.confirmPayBtn, { backgroundColor: '#000' }]} onPress={() => executePurchase(paymentModal.pkg, 'http://localhost:3000/api/packages/buy')}><Text style={styles.confirmText}>Xác nhận</Text></TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}
          </Surface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf8f4' },
  contentWrapper: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fdf8f4' },
  miniLoadingScale: { transform: [{ scale: 0.3 }], width: '100%', height: 30, justifyContent: 'center', alignItems: 'center' },
  topBar: { height: 70, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 30, borderBottomWidth: 1, borderBottomColor: '#f3eae1', backgroundColor: '#fdf8f4' },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  backBtnText: { fontSize: 13, fontWeight: '600', color: '#6c2f00' },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  topBarTitle: { fontSize: 14, fontWeight: '700', color: '#b58255' },
  scrollContainer: { padding: 30, width: '100%', alignItems: 'center' },
  statusCard: { width: '100%', maxWidth: 860, backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 35, borderWidth: 1, borderColor: '#eee3d8' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f7ede2', paddingBottom: 10 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: '#4a321a' },
  statusDetailsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statusDetailItem: { flex: 1 },
  statusLabel: { fontSize: 11, color: '#998370', marginBottom: 4 },
  statusValue: { fontSize: 13, fontWeight: '700', color: '#6c2f00' },
  heroSection: { alignItems: 'center', marginBottom: 35 },
  heroTag: { fontSize: 11, fontWeight: '700', color: '#b58255', letterSpacing: 1.5, marginBottom: 10 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#4a321a', textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  cardsRow: { flexDirection: 'row', gap: 24, width: '100%', maxWidth: 860, justifyContent: 'center', flexWrap: 'wrap' },
  packageCard: { width: Platform.OS === 'web' ? 380 : '100%', maxWidth: 390, backgroundColor: '#fff', borderRadius: 12, padding: 25, borderWidth: 1, borderColor: '#eee3d8', minHeight: 390, position: 'relative', justifyContent: 'space-between' },
  hotCardBorder: { borderColor: '#d97736', borderWidth: 2 },
  activeCardBorder: { borderColor: '#6c2f00', borderWidth: 2, backgroundColor: '#fffdfb' },
  hotBadge: { position: 'absolute', top: -12, right: 20, backgroundColor: '#d97736', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  hotBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  packageName: { fontSize: 18, fontWeight: '700', color: '#4a321a', marginBottom: 12 },
  priceContainer: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  priceValue: { fontSize: 28, fontWeight: '700', color: '#4a321a' },
  period: { fontSize: 13, color: '#998370', marginLeft: 4 },
  featuresList: { gap: 12, marginBottom: 25 },
  pkgDesc: { color: '#666', fontSize: 13, fontStyle: 'italic', marginBottom: 5 },
  divider: { width: '100%', height: 1, backgroundColor: '#eee', marginVertical: 4 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkIconWrapper: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fdf8f4', alignItems: 'center', justifyContent: 'center' },
  featureText: { fontSize: 13, color: '#5c4632', flex: 1 },
  actionBtnBase: { width: '100%', padding: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center', height: 48, marginTop: 15 },
  actionBtnNormal: { borderWidth: 1, borderColor: '#6c2f00', backgroundColor: '#fff' },
  actionBtnHot: { backgroundColor: '#d97736' },
  btnDisabled: { backgroundColor: '#e0e0e0' }, 
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  textWhite: { color: '#fff' },
  textBrown: { color: '#6c2f00' },
  textMuted: { color: '#757575' }, 
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 440, backgroundColor: '#fff', borderRadius: 16, padding: 25, alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#4a321a', marginBottom: 15 },
  paymentBox: { width: '100%', backgroundColor: '#fdf8f4', padding: 15, borderRadius: 8, borderWidth: 1, borderColor: '#eee3d8', marginBottom: 15 },
  payLabel: { fontSize: 13, color: '#5c4632', marginBottom: 4 },
  payPrice: { fontSize: 20, fontWeight: '700', color: '#ff4d4d' },
  momoHint: { fontSize: 11, color: '#666', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelPayBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: '#666', fontWeight: '600' },
  confirmPayBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#d97736', alignItems: 'center', justifyContent: 'center' },
  confirmText: { color: '#fff', fontWeight: '700' },
  qrSectionContainer: { width: '100%', alignItems: 'center', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#eee3d8', marginBottom: 15 },
  qrImageStyle: { width: 220, height: 220, resizeMode: 'contain' },
  qrDetailInfoBox: { width: '100%', marginTop: 12, backgroundColor: '#fdf8f4', padding: 12, borderRadius: 6, gap: 4 },
  qrDetailText: { fontSize: 12, color: '#5c4632' },
  warningHintText: { fontSize: 11, color: '#D32F2F', textAlign: 'center', fontStyle: 'italic', lineHeight: 16, marginBottom: 15 }
});