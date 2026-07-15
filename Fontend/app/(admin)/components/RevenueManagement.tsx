import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity, TextInput, useWindowDimensions } from 'react-native';
import { Text, Portal, Provider, DataTable } from 'react-native-paper';
import { Calculator, Calendar, DollarSign, Award, Layers, Eye, Users, RefreshCw, Layers3, ChevronDown, Download } from "lucide-react-native";
import { supabase } from '../../../lib/supabase'; 
import GlowLoading from '../../../components/GlowLoading';
export default function RevenueManagement() {
  const { width } = useWindowDimensions();
  
  const [selectedYear, setSelectedYear] = useState('2026');
  const [selectedMonth, setSelectedMonth] = useState('05');
  
  const [calculating, setCalculating] = useState(false);
  const [revenueResult, setRevenueResult] = useState<any>(null);

  const isMobile = width < 768;

  const years = ['2024', '2025', '2026', '2027', '2028'];
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

  // 📥 HÀM XUẤT VÀ TẢI FILE TXT DOANH THU ĐỒNG BỘ CHUẨN DỮ LIỆU
  const handleDownloadTXT = () => {
    if (!revenueResult) return;

    const billingMonth = `${selectedYear}-${selectedMonth}`;
    
    // Khởi tạo nội dung file text định dạng rõ ràng
    const fileContent = `==================================================
BÁO CÁO PHÂN BỔ DOANH THU HỆ THỐNG - NHÓM 44
Chu kỳ kết toán: Tháng ${billingMonth}
Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}
==================================================

1. THÔNG TIN CHUNG:
- Số lượng gói đăng ký kích hoạt: ${revenueResult.subscriptionCount} gói
- Tổng doanh thu mua gói (TR): ${revenueResult.totalRevenue}

2. CHỈ SỐ PHÂN CHIA QUỸ (Tỷ lệ: 40% - 60%):
- Doanh thu Nền tảng (Platform Fee - 40%): ${revenueResult.platformFee}
- Quỹ Tác giả khả dụng (Author Pool - 60%): ${revenueResult.authorPool}

3. CHỈ SỐ LƯỢT ĐỌC & ĐƠN GIÁ:
- Lượt đọc hợp lệ toàn hệ thống (V_total): ${revenueResult.totalValidReads} views
- Giá trị đơn vị / 1 view hợp lệ (UV): ${revenueResult.unitValue}

4. KẾT LUẬN GIẢI NGÂN:
- Tổng số tác giả được phân phối thu nhập: ${revenueResult.distributedAuthorsCount} tác giả
- Trạng thái: Thuật toán đã kết toán thành công & giải ngân lưu vết hệ thống.

==================================================
Trưởng ban quản trị Nhóm 44 ký duyệt`;

    if ((Platform as any).OS === 'web') {
      // Xử lý tạo và tải file ngay lập tức trên trình duyệt Web
      const element = document.createElement("a");
      const file = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `DoanhThu_Nhom44_${billingMonth}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      // Đối với môi trường Mobile App thuần
      if ((Platform as any).OS === 'web') window.alert("Tính năng tải file text hiện tại tối ưu hóa trên nền tảng Web quản trị!");
      console.log("Nội dung báo cáo xuất ra thiết bị di động:\n", fileContent);
    }
  };

  const handleCalculateRevenue = async () => {
    const billingMonth = `${selectedYear}-${selectedMonth}`;
    setCalculating(true);
    setRevenueResult(null);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token;

      const response = await fetch('http://localhost:3000/api/revenue/admin/calculate-share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetMonth: billingMonth })
      });

      const resJson = await response.json();

      if (resJson.success) {
        setRevenueResult(resJson.data); 
      } else {
        if (Platform.OS === 'web') window.alert("Lỗi tính toán: " + resJson.message);
      }
    } catch (err) {
      console.error(">>> [FATAL CALCULATE REVENUE UI]:", err);
      if (Platform.OS === 'web') window.alert("Không thể kết nối đến máy chủ Backend!");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <Provider>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1, minWidth: 260 }}>
            <Text style={styles.title}>Doanh Thu</Text>
            {/* <Text style={styles.subtitle}>Nhóm 44</Text> */}
          </View>
        </View>

        <View style={[styles.mainLayout, { flexDirection: isMobile ? 'column' : 'row' }]}>
          
          {/* CỘT ĐIỀU KHIỂN BÊN TRÁI */}
          <View style={[styles.controlColumn, { flex: isMobile ? undefined : 4 }]}>
            <View style={styles.card}>
              <Text style={styles.fieldLabel}>Chu Kỳ Kết Toán</Text>
              <Text style={styles.labelHint}>Quét hóa đơn và lượt xem Anti-Cheat từ ngày 01 đến ngày cuối tháng.</Text>
              
              <View style={styles.splitInputContainer}>
                <View style={styles.inputWrapperSplit}>
                  <Text style={styles.miniLabel}>Năm</Text>
                  <View style={styles.selectWrapper}>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(e.target.value)}
                      disabled={calculating}
                      style={styles.webSelect}
                    >
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown size={14} color="#4A321F" style={styles.selectIcon} />
                  </View>
                </View>

                <View style={styles.inputWrapperSplit}>
                  <Text style={styles.miniLabel}>Tháng</Text>
                  <View style={styles.selectWrapper}>
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      disabled={calculating}
                      style={styles.webSelect}
                    >
                      {months.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                    </select>
                    <ChevronDown size={14} color="#4A321F" style={styles.selectIcon} />
                  </View>
                </View>
              </View>

              <TouchableOpacity 
                onPress={handleCalculateRevenue}
                disabled={calculating}
                style={[styles.btnExecute, calculating && styles.btnDisabled]}
                activeOpacity={0.8}
              >
                {calculating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Calculator size={16} color="#FFF" />
                    <Text style={styles.btnExecuteText}>Xem Doanh Thu </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {calculating && (
              <View style={{ transform: [{ scale: 0.8 }] }}>
               <GlowLoading   />
              </View>
            )}
          </View>

          {/* CỘT HIỂN THỊ KẾT QUẢ BÊN PHẢI */}
          <View style={[styles.resultColumn, { flex: isMobile ? undefined : 8 }]}>
            {revenueResult ? (
              <View style={[styles.card, styles.resultCard]}>
                <View style={styles.resultHeader}>
                  <Text style={styles.resultTitle}>📋 BẢNG TỔNG KẾT DOANH THU THỰC TẾ TRÊN TOÀN HỆ THỐNG</Text>
                  <View style={styles.successBadge}>
                    <Text style={styles.successBadgeText}>SUCCESS</Text>
                  </View>
                </View>

                <View style={styles.metricsGrid}>
                  <View style={styles.metricBox}>
                    <Layers3 size={16} color="#8A7663" style={{ marginBottom: 4 }} />
                    <Text style={styles.metricLabel}>Số lượng gói đăng ký kích hoạt</Text>
                    <Text style={styles.metricValue}>{revenueResult.subscriptionCount}</Text>
                  </View>
                  <View style={styles.metricBox}>
                    <DollarSign size={16} color="#0D47A1" style={{ marginBottom: 4 }} />
                    <Text style={styles.metricLabel}>Tổng doanh thu mua gói (TR)</Text>
                    <Text style={[styles.metricValue, { color: '#0D47A1', textDecorationLine: 'underline' }]}>
                      {revenueResult.totalRevenue}
                    </Text>
                  </View>
                </View>

                <View style={styles.tableWrapper}>
                  <DataTable>
                    <DataTable.Row style={styles.tableRow}>
                      <DataTable.Cell style={styles.cellLeft}>
                        <Layers size={14} color="#4A321F" style={styles.rowIcon} />
                        <Text style={styles.cellLabel}>Doanh thu Nền tảng (40%):</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric style={styles.cellRight}>
                        <Text style={styles.cellValuePlatform}>{revenueResult.platformFee}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>

                    <DataTable.Row style={styles.tableRow}>
                      <DataTable.Cell style={styles.cellLeft}>
                        <Award size={14} color="#2E7D32" style={styles.rowIcon} />
                        <Text style={styles.cellLabel}>Quỹ Tác giả khả dụng (60%):</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric style={styles.cellRight}>
                        <Text style={styles.cellValueSuccess}>{revenueResult.authorPool}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>

                    <DataTable.Row style={styles.tableRow}>
                      <DataTable.Cell style={styles.cellLeft}>
                        <Eye size={14} color="#4A321F" style={styles.rowIcon} />
                        <Text style={styles.cellLabel}>Lượt đọc hợp lệ toàn hệ thống (V_total):</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric style={styles.cellRight}>
                        <Text style={styles.cellValue}>{revenueResult.totalValidReads}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>

                    <DataTable.Row style={[styles.tableRow, styles.lastRow]}>
                      <DataTable.Cell style={styles.cellLeft}>
                        <DollarSign size={14} color="#C62828" style={styles.rowIcon} />
                        <Text style={styles.cellLabel}>Giá trị đơn vị / 1 view hợp lệ (UV):</Text>
                      </DataTable.Cell>
                      <DataTable.Cell numeric style={styles.cellRight}>
                        <Text style={styles.cellValueSpecial}>{revenueResult.unitValue}</Text>
                      </DataTable.Cell>
                    </DataTable.Row>
                  </DataTable>
                </View>

                <View style={styles.successAlertBox}>
                  <Users size={16} color="#1B5E20" style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={styles.alertText}>
                    🎉 Thuật toán kết toán thành công! Doanh thu trích lập của từng Tác giả dựa trên tổng lượt xem đã được giải ngân lưu vết vào cơ sở dữ liệu. Hệ thống ghi nhận có {revenueResult.distributedAuthorsCount} tác giả được phân phối thu nhập trong chu kỳ tháng này.
                  </Text>
                </View>

                {/* 🔥 BỔ SUNG: NÚT TẢI FILE BÁO CÁO TXT ĐẸP VÀ CHUẨN MÀU */}
                <TouchableOpacity 
                  onPress={handleDownloadTXT}
                  style={styles.btnDownload}
                  activeOpacity={0.8}
                >
                  <Download size={16} color="#FFF" />
                  <Text style={styles.btnDownloadText}>XUẤT FILE BÁO CÁO (.TXT)</Text>
                </TouchableOpacity>

              </View>
            ) : (
              !calculating && (
                <View style={styles.emptyStateBox}>
                  <Calculator size={32} color="#D4C5B3" />
                  <Text style={styles.emptyStateText}>Vui lòng chọn Năm & Tháng kết toán, sau đó nhấn nút để kích hoạt thuật toán tổng hợp dữ liệu sàn.</Text>
                </View>
              )
            )}
          </View>

        </View>
      </ScrollView>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  contentContainer: { 
    padding: Platform.OS === 'web' ? 24 : 16, 
    width: '100%', 
    paddingBottom: 40 
  },
  header: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#4A321F', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? "Georgia" : "serif" },
  subtitle: { fontSize: 13, color: '#8A7663', marginTop: 4 },
  mainLayout: { gap: 20, width: '100%' },
  controlColumn: { width: '100%' },
  resultColumn: { width: '100%' },
  card: {
    backgroundColor: "#FFFFFF", 
    borderRadius: 16, 
    padding: 20,
    borderWidth: 1.5,
    borderColor: "#E6DCD0",
    shadowColor: "#4A321F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  fieldLabel: { fontSize: 12, fontWeight: "800", color: "#4A321F", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.3 },
  labelHint: { fontSize: 12, color: "#8A7663", marginBottom: 16, lineHeight: 16 },
  splitInputContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    width: '100%'
  },
  inputWrapperSplit: { flex: 1 },
  miniLabel: { fontSize: 11, fontWeight: '700', color: '#8A7663', marginBottom: 6, paddingLeft: 2 },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#D4C5B3',
    borderRadius: 10,
    paddingHorizontal: 12,
    position: 'relative',
    height: 44,
  },
  webSelect: {
    flex: 1,
    height: '100%',
    border: 'none',
    outline: 'none',
    backgroundColor: 'transparent',
    fontSize: 15,
    fontWeight: '700',
    color: '#322114',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    appearance: 'none',
    paddingRight: 20,
  } as any,
  selectIcon: { position: 'absolute', right: 12, pointerEvents: 'none' } as any,
  btnExecute: { 
    backgroundColor: "#8B0000", 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    height: 46, 
    borderRadius: 10, 
    gap: 8,
    width: '100%'
  },
  btnDisabled: { backgroundColor: '#CCBBAA' },
  btnExecuteText: { color: "#FFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 },

  resultCard: { borderColor: '#4A321F', borderWidth: 1.5 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 },
  resultTitle: { fontSize: 13, fontWeight: '900', color: '#4A321F', letterSpacing: 0.3 },
  successBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#A5D6A7' },
  successBadgeText: { fontSize: 10, fontWeight: '800', color: '#1B5E20' },
  metricsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
  metricBox: { flex: 1, backgroundColor: '#FAF6F0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E6DCD0' },
  metricLabel: { fontSize: 11, color: '#8A7663', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  metricValue: { fontSize: 16, fontWeight: '900', color: '#322114' },
  tableWrapper: { borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 10, overflow: 'hidden', backgroundColor: '#FFF' },
  tableRow: { borderBottomWidth: 1, borderColor: '#F0EAE3', minHeight: 48, paddingVertical: 4 },
  lastRow: { borderBottomWidth: 0 },
  cellLeft: { flex: Platform.OS === 'web' ? 2 : 1.5, flexDirection: 'row', alignItems: 'center' },
  cellRight: { flex: 1, justifyContent: 'flex-end' },
  rowIcon: { marginRight: 8 },
  cellLabel: { fontSize: 13, color: '#4A321F', fontWeight: '600' },
  cellValue: { fontSize: 14, fontWeight: '700', color: '#322114' },
  cellValuePlatform: { fontSize: 14, fontWeight: '800', color: '#795548' }, 
  cellValueSuccess: { fontSize: 14, fontWeight: '800', color: '#2E7D32' },
  cellValueSpecial: { fontSize: 14, fontWeight: '800', color: '#C62828', fontStyle: 'italic' },
  successAlertBox: { backgroundColor: '#E8F5E9', padding: 14, borderRadius: 10, marginTop: 18, borderColor: '#A5D6A7', borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start' },
  alertText: { fontSize: 12, color: '#1B5E20', lineHeight: 18, flex: 1, fontStyle: 'italic' },
  emptyStateBox: { flex: 1, minHeight: 200, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#E6DCD0', borderStyle: 'dashed', borderRadius: 16, padding: 32 },
  emptyStateText: { color: '#A39281', fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 18, maxWidth: 400, fontWeight: '500' },
  
  // Custom thiết kế nút bấm Tải file (.txt) đồng bộ
  btnDownload: {
    backgroundColor: "#4A321F",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 10,
    gap: 8,
    marginTop: 18,
    width: "100%",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  btnDownloadText: { color: "#FFF", fontSize: 13, fontWeight: "800", letterSpacing: 0.5 }
});