// 📂 Thư mục: (admin)/components/OverviewManagement.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Dimensions, Platform, TouchableOpacity } from 'react-native';
import { Text, Card, Surface, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Sử dụng Icon của Expo / React Native

// Cấu hình URL API Node.js tổng hợp của bạn
const API_URL = 'http://localhost:3000/api/admin/overview-stats';

// 🚀 NẠP LẠI THƯ VIỆN ĐỒ THỊ CHÍNH CHỦ
import { LineChart } from "react-native-chart-kit"; 

interface OverviewData {
  totalUsers: number;
  totalBooks: number;
  totalChapters: number;
  totalRevenue: number;
  revenueChartData: Array<{ month: string; revenue: number }>;
}

interface OverviewManagementProps {
  adminToken?: string; 
}

export default function OverviewManagement({ adminToken }: OverviewManagementProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewData | null>(null);
  const [renderChart, setRenderChart] = useState(false);
  const [containerWidth, setContainerWidth] = useState(Dimensions.get("window").width * 0.9);

  // Bắt sự kiện thay đổi kích thước của khung chứa biểu đồ thực tế
  const onChartLayout = (event: any) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width - 40); 
    }
  };

  // 📥 1. HÀM FETCH SỐ LIỆU LIVE TỪ BACKEND NODE.JS
  const fetchOverviewStats = async () => {
    try {
      setLoading(true);
      setRenderChart(false);
      
      let token = adminToken;
      if (!token) {
        if (Platform.OS === 'web') {
          token = localStorage.getItem('userToken') || undefined;
        } else {
          const AsyncStorage = require('@react-native-async-storage/async-storage').default;
          token = (await AsyncStorage.getItem('userToken')) || undefined;
        }
      }

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const resJson = await response.json();
      
      if (resJson.success && resJson.data) {
        setStats(resJson.data);
        
        setTimeout(() => {
          setRenderChart(true);
        }, 200);
      }
    } catch (err) {
      console.error("❌ Lỗi gọi API tổng quan từ Frontend:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewStats();
  }, [adminToken]);

  const formatVND = (amount: number) => {
    return (amount ?? 0).toLocaleString('vi-VN') + ' đ';
  };

  // 📈 2. THIẾT LẬP CẤU HÌNH DỮ LIỆU ĐỘNG TỪ POSTMAN DƯỚI DẠNG "Thg MM"
  const chartLabels = stats?.revenueChartData && stats.revenueChartData.length > 0
    ? stats.revenueChartData.map(item => {
        if (!item.month) return "";
        const parts = item.month.split('-');
        return parts.length > 1 ? `Thg ${parts[1]}` : item.month;
      })
    : ["Thg 01", "Thg 02", "Thg 03", "Thg 04", "Thg 05", "Thg 06"];

  const chartValues = stats?.revenueChartData && stats.revenueChartData.length > 0
    ? stats.revenueChartData.map(item => Number(item.revenue || 0)) 
    : [0, 0, 0, 0, 0, 0];

  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        color: (opacity = 1) => `rgba(93, 64, 55, ${opacity})`,
        strokeWidth: 3
      }
    ],
  };

  const chartConfig = {
    backgroundGradientFrom: "#FFFDF9",
    backgroundGradientTo: "#FFFDF9",
    decimalPlaces: 0, 
    color: (opacity = 1) => `rgba(93, 64, 55, 0.15)`,
    labelColor: (opacity = 1) => `rgba(93, 64, 55, 0.8)`,
    style: { borderRadius: 8 },
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#8B7355"
    }
  };

  // 💾 3. HÀM XUẤT FILE TXT HOẠT ĐỘNG TRÊN CẢ WEB VÀ MOBILE SYSTEM
  const exportToTxt = async () => {
    if (!stats?.revenueChartData || stats.revenueChartData.length === 0) {
      alert("Không có dữ liệu doanh thu để xuất file!");
      return;
    }

    // Dựng cấu trúc văn bản báo cáo
    let textContent = "=========================================\n";
    textContent += "   BÁO CÁO DOANH THU 6 THÁNG GẦN NHẤT\n";
    textContent += "=========================================\n";
    textContent += `Ngày xuất bản: ${new Date().toLocaleString('vi-VN')}\n`;
    textContent += "-----------------------------------------\n";
    
    stats.revenueChartData.forEach((item, index) => {
      const parts = item.month.split('-');
      const monthLabel = parts.length > 1 ? `Tháng ${parts[1]}/${parts[0]}` : item.month;
      textContent += `${index + 1}. ${monthLabel}: ${formatVND(item.revenue)}\n`;
    });
    
    textContent += "-----------------------------------------\n";
    textContent += `TỔNG DOANH THU THỰC TẾ: ${formatVND(stats.totalRevenue)}\n`;
    textContent += "=========================================\n";

    if (Platform.OS === 'web') {
      // Logic tải file văn bản xử lý cho giao diện Web browser
      const element = document.createElement("a");
      const file = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      element.download = `BaoCaoDoanhThu_${new Date().toISOString().slice(0,10)}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } else {
      // Logic share/save file văn bản xử lý cho thiết bị Mobile Native (Android/iOS)
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        
        const filename = `${FileSystem.documentDirectory}BaoCaoDoanhThu.txt`;
        await FileSystem.writeAsStringAsync(filename, textContent, { encoding: FileSystem.EncodingType.UTF8 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filename);
        } else {
          alert(`File đã được lưu tại hệ thống: ${filename}`);
        }
      } catch (error) {
        console.error("Lỗi khi lưu file trên thiết bị di động:", error);
        alert("Không thể xuất file trên thiết bị này. Vui lòng kiểm tra lại package Expo.");
      }
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderBox}>
        <ActivityIndicator size="large" color="#5D4037" />
        <Text style={styles.loaderText}>Đang cào dữ liệu thật từ cơ sở dữ liệu hệ thống...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
      
      {/* ─── HEADER KHỐI TỔNG QUAN ─── */}
      <Surface style={styles.headerSurface} elevation={1}>
        <Text style={styles.headerTitle}>📈 BÁO CÁO TOÀN DIỆN HỆ THỐNG (LIVE DATA)</Text>
        <Text style={styles.headerSub}>Số liệu live-time kết nối trực tiếp cơ sở dữ liệu hệ thống thông qua API</Text>
      </Surface>

      {/* ─── LƯỚI 4 CARD HIỂN THỊ SỐ LIỆU ĐỘNG TỪ API ─── */}
      <View style={styles.metricsGrid}>
        
        <Card style={styles.metricCard}>
          <Card.Content style={styles.cardRow}>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardLabel}>Tổng Độc Giả</Text>
              <Text style={styles.stylesCardValue}>{stats?.totalUsers ?? 0}</Text>
            </View>
            <Avatar.Icon size={42} icon="account-group" style={{ backgroundColor: '#BBDEFB' }} color="#0D47A1" />
          </Card.Content>
        </Card>

        <Card style={styles.metricCard}>
          <Card.Content style={styles.cardRow}>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardLabel}>Tổng Đầu Sách</Text>
              <Text style={styles.stylesCardValue}>{stats?.totalBooks ?? 0}</Text>
            </View>
            <Avatar.Icon size={42} icon="book-open-page-variant" style={{ backgroundColor: '#C8E6C9' }} color="#1B5E20" />
          </Card.Content>
        </Card>

        <Card style={styles.metricCard}>
          <Card.Content style={styles.cardRow}>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardLabel}>Tổng Chương</Text>
              <Text style={styles.stylesCardValue}>{stats?.totalChapters ?? 0}</Text>
            </View>
            <Avatar.Icon size={42} icon="file-document-multiple" style={{ backgroundColor: '#FFE0B2' }} color="#E65100" />
          </Card.Content>
        </Card>

        <Card style={[styles.metricCard, { borderBottomColor: '#8B0000', borderBottomWidth: 3 }]}>
          <Card.Content style={styles.cardRow}>
            <View style={styles.cardInfoCol}>
              <Text style={styles.cardLabel}>Doanh Thu Thực Tế</Text>
              <Text style={[styles.stylesCardValue, { color: '#8B0000' }]}>{formatVND(stats?.totalRevenue || 0)}</Text>
            </View>
            <Avatar.Icon size={42} icon="currency-usd" style={{ backgroundColor: '#FFCDD2' }} color="#B71C1C" />
          </Card.Content>
        </Card>

      </View>

      {/* ─── ĐỒ THỊ BIỂU ĐỒ ĐƯỜNG CONG REALTIME TỪ DATABASE ─── */}
      <Surface style={styles.chartSurface} elevation={1} onLayout={onChartLayout}>
        
        {/* 🟢 HÀNG TIÊU ĐỀ BIỂU ĐỒ (CHỨA THÊM NÚT XUẤT FILE PHÍA BÊN PHẢI) */}
        <View style={styles.chartHeaderRow}>
          <Text style={styles.chartTitle}>📊 BIỂU ĐỒ DIỄN BIẾN DOANH THU ĐƯỜNG TUYẾN TÍNH (6 THÁNG GẦN NHẤT)</Text>
          
          {/* 🔘 NÚT XUẤT FILE TXT THAY THẾ VÀO VỊ TRÍ KHOANH ĐỎ */}
          <TouchableOpacity style={styles.exportButton} onPress={exportToTxt} activeOpacity={0.7}>
            <MaterialCommunityIcons name="file-document-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
            <Text style={styles.exportButtonText}>Xuất TXT</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.chartWrapper}>
          {renderChart && stats?.revenueChartData ? (
            <LineChart
              data={chartData}
              width={containerWidth} 
              height={320}
              chartConfig={chartConfig}
              verticalLabelRotation={0} 
              bezier 
              style={{ marginVertical: 8, borderRadius: 12 }}
              formatYLabel={(value) => {
                const num = parseFloat(value);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                return num.toString();
              }}
            />
          ) : (
            <View style={styles.chartLoaderContainer}>
              <ActivityIndicator color="#5D4037" size="small" />
              <Text style={styles.chartLoaderText}>Đang dựng hệ thống sơ đồ tuyến tính động...</Text>
            </View>
          )}
        </View>
      </Surface>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6F0', padding: 15 }, 
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 350 },
  loaderText: { marginTop: 12, color: '#5D4037', fontStyle: 'italic', fontWeight: 'bold', fontSize: 13 },
  
  headerSurface: { backgroundColor: '#FFF', padding: 16, borderRadius: 8, marginBottom: 20, borderWidth: 1, borderColor: '#E6DCD0' },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif' },
  headerSub: { fontSize: 12, color: '#8A7663', marginTop: 4, fontStyle: 'italic' },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 20 },
  metricCard: { flex: 1, minWidth: 200, backgroundColor: '#FFFDF9', borderRadius: 12, borderColor: '#E6DCD0', borderWidth: 1, elevation: 1 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  cardInfoCol: { flex: 1, marginRight: 8 },
  cardLabel: { fontSize: 12, color: '#8A7663', fontWeight: '500' },
  stylesCardValue: { fontSize: 18, fontWeight: '900', color: '#4A321F', marginTop: 5 },

  chartSurface: { backgroundColor: '#FFFDF9', padding: 20, borderRadius: 16, borderColor: '#E6DCD0', borderWidth: 1, width: '100%' },
  
  // 🟢 CSS flex row giúp phân bổ tiêu đề bên trái và nút bấm bên phải cân đối
  chartHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%',
    marginBottom: 15,
    flexWrap: 'wrap',
    gap: 10
  },
  chartTitle: { flex: 1, fontSize: 13, fontWeight: 'bold', color: '#4A321F', letterSpacing: 0.3, fontFamily: 'serif', marginBottom: 0 },
  
  // 🔘 CSS giao diện Nút bấm Xuất File màu đồng bộ cổ điển với hệ thống
  exportButton: {
    flexDirection: 'row',
    backgroundColor: '#8B7355', // Màu nâu cát cổ điển trùng tông viền điểm nút đồ thị
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  exportButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },

  chartWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 260 },
  chartLoaderContainer: { height: 200, justifyContent: 'center', alignItems: 'center' },
  chartLoaderText: { marginTop: 8, color: '#8A7663', fontSize: 11, fontStyle: 'italic' }
});