// 📂 File: Fontend/app/(author)/components/AuthorRevenueWatch.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Card, Divider, DataTable, Button } from 'react-native-paper';
import { RefreshCw, CalendarDays, Coins } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase'; // Điều chỉnh đường dẫn gốc chuẩn hệ thống
import GlowLoading from '../../../components/GlowLoading'; 

interface RevenueRow {
  id: string;
  billing_month: string;
  total_income: number | string;
  valid_reads: number | string;
  unit_value: number | string;
}

export default function AuthorRevenueWatch() {
  const [loading, setLoading] = useState(true);
  const [revenueHistory, setRevenueHistory] = useState<RevenueRow[]>([]);

  // 🔥 THUẬT TOÁN KIỂM TRA VÀ TRÍCH XUẤT TOKEN TRÁNH SẬP PHIÊN CHUYÊN NGHIỆP
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

  // 📡 Hàm bốc dữ liệu lịch sử ví tiền từ Backend Node.js
  const fetchMyRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getValidToken();

      if (!token) {
        console.warn("⚠️ [REVENUE UI] Không tìm thấy mã Token. Vui lòng thử Đăng nhập lại.");
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:3000/api/revenue/my-earnings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });

      const resJson = await response.json();
      if (resJson.success) {
        setRevenueHistory(resJson.data || []);
      }
    } catch (err) {
      console.error(">>> [FATAL FETCH AUTHOR REVENUE UI]:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyRevenueData();
  }, [fetchMyRevenueData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <GlowLoading />
      </View>
    );
  }

  return (
    <View style={{ width: '100%', padding: 20 }}>
      {/* ✅ FIXED CRITICAL ERROR: Đã xóa hoàn toàn khối thẻ gọi <AuthorSidebar /> bị thiếu import lỗi đỏ ở dòng 83 */}
      
      {/* CARD TỔNG QUAN VÍ HIỆN TẠI - MÀU VÀNG ĐỒNG SANG TRỌNG */}
      <Card style={styles.walletCard} mode="outlined">
        <Card.Content>
          <Text style={styles.walletLabel}>Tổng thu nhập tích lũy chu kỳ gần nhất:</Text>
          <Text style={styles.walletBalance}>
            {revenueHistory.length > 0 
              ? `${Number(revenueHistory[0].total_income).toLocaleString('vi-VN')} đ` 
              : "0 đ"}
          </Text>
          
          <Divider style={{ marginVertical: 12, backgroundColor: '#E6DCD0' }} />
          
          <View style={styles.rowInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <CalendarDays size={14} color="#8A7663" />
              <Text style={styles.miniLabel}>
                Chu kỳ chốt gần nhất: <Text style={{fontWeight: 'bold', color: '#4A321F'}}>{revenueHistory[0]?.billing_month || 'Chưa kết toán'}</Text>
              </Text>
            </View>
            
            <Button 
              icon={() => <RefreshCw size={12} color="#614124" />} 
              mode="text" 
              compact 
              onPress={fetchMyRevenueData} 
              textColor="#614124"
              style={{ backgroundColor: '#F3EDE4', borderRadius: 8 }}
            >
              Làm mới ví
            </Button>
          </View>
        </Card.Content>
      </Card>

      {/* BẢNG BIỂU CHI TIẾT CÁC THÁNG KẾT TOÁN MÀU LỤA MỜ */}
      <Card style={styles.tableCard} mode="outlined">
        <Card.Content>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Coins size={16} color="#4A321F" />
            <Text style={styles.tableTitle}>📋 LỊCH SỬ BIẾN ĐỘNG SỐ DƯ TỪNG CHU KỲ THÁNG</Text>
          </View>
          <Divider style={{ marginVertical: 10, backgroundColor: '#E6DCD0' }} />

          <DataTable>
            <DataTable.Header style={styles.tableHeader}>
              <DataTable.Title><Text style={styles.headerText}>Chu Kỳ Tháng</Text></DataTable.Title>
              <DataTable.Title numeric><Text style={styles.headerText}>Lượt Đọc Sạch</Text></DataTable.Title>
              <DataTable.Title numeric><Text style={styles.headerText}>Đơn Giá (UV)</Text></DataTable.Title>
              <DataTable.Title numeric><Text style={styles.headerText}>Thu Nhập Nhận</Text></DataTable.Title>
            </DataTable.Header>

            {revenueHistory.map((row, index) => (
              <DataTable.Row key={row.id || index} style={styles.tableRow}>
                <DataTable.Cell><Text style={styles.monthText}>📅 Thg {row.billing_month}</Text></DataTable.Cell>
                <DataTable.Cell numeric><Text style={styles.readsText}>{row.valid_reads} view</Text></DataTable.Cell>
                <DataTable.Cell numeric><Text style={styles.uvText}>{Number(row.unit_value).toFixed(1)} đ</Text></DataTable.Cell>
                <DataTable.Cell numeric>
                  <Text style={styles.moneyText}>+{Number(row.total_income).toLocaleString('vi-VN')} đ</Text>
                </DataTable.Cell>
              </DataTable.Row>
            ))}

            {revenueHistory.length === 0 && (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Text style={{ fontStyle: 'italic', color: '#8A7663', fontSize: 13, textAlign: 'center' }}>
                  Hệ thống chưa chốt doanh thu chu kỳ nào cho tài khoản tác giả này.
                </Text>
              </View>
            )}
          </DataTable>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 60, justifyContent: 'center', alignItems: 'center', width: '100%' },
  walletCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#C5A059', borderWidth: 1.5, marginBottom: 20, elevation: 2 },
  walletLabel: { fontSize: 12, color: '#8A7663', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  walletBalance: { fontSize: 32, fontWeight: 'bold', color: '#4A321F', marginTop: 6, letterSpacing: 0.5, fontFamily: 'serif' },
  rowInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniLabel: { fontSize: 13, color: '#614124' },
  tableCard: { backgroundColor: '#FFFDF9', borderRadius: 16, borderColor: '#E6DCD0', borderWidth: 1, elevation: 1 },
  tableTitle: { fontSize: 13, fontWeight: 'bold', color: '#4A321F', letterSpacing: 0.3, fontFamily: 'serif' },
  tableHeader: { backgroundColor: '#EBE3D5', borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  headerText: { fontWeight: 'bold', fontSize: 12, color: '#4A321F' },
  tableRow: { paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#E6DCD0' },
  monthText: { fontWeight: 'bold', color: '#4A321F', fontSize: 13 },
  readsText: { color: '#4A321F', fontWeight: '600' },
  uvText: { color: '#8A7663', fontStyle: 'italic' },
  moneyText: { fontWeight: 'bold', color: '#8B6508', fontSize: 14 }
});