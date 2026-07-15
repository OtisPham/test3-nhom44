import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from "react-native";
import { Bell, Mail, Plus } from "lucide-react-native";

// 🚀 ĐỒNG BỘ ĐƯỜNG DẪN IMPORT CHUẨN CỦA BẠN
import { supabase } from "../../lib/supabase";
import AdminSidebar from "./components/AdminSidebar";
import UserManagement from "./components/UserManagement";

export default function UserManagementScreen() {
  // Các state để lưu số liệu thống kê thực tế từ Database
  const [metrics, setMetrics] = useState({
    totalMembers: 0,
    premiumSubs: 0,
    activeAuthors: 0,
    mrr: 0, // Giả định tính toán tổng doanh thu ước tính theo tháng (MRR)
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  //  LUỒNG QUÈT BÓC TÁCH SỐ LIỆU THỰC TẾ TỪ SUPABASE (KHÔNG DÙNG ẢO)
  const fetchLiveMetrics = async () => {
    try {
      setMetricsLoading(true);

      // 1. Đếm tổng số lượng học giả (Tất cả user trong bảng)
      const { count: totalCount, error: totalError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      // 2. Đếm số thành viên đăng ký Premium ( subscription_plan khác 'free' hoặc rỗng )
      const { count: premiumCount, error: premiumError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .not("subscription_plan", "is", null)
        .not("subscription_plan", "eq", "")
        .not("subscription_plan", "eq", "free");

      // 3. Đếm số lượng Tác giả đang vận hành bản thảo ( role = 'author' )
      const { count: authorCount, error: authorError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("role", "author");

      // 4. Quét bảng packages để lấy giá tiền thực tế tính toán MRR (Doanh thu tháng sơ bộ)
      const { data: packageData } = await supabase
        .from("packages")
        .select("name, price");

      if (totalError || premiumError || authorError) throw new Error("Lỗi bốc số liệu thống kê");

      //  Thuật toán tính toán MRR sơ bộ dựa trên số user đang dùng gói thật nhân với đơn giá gói
      let calculatedMRR = 0;
      if (packageData && packageData.length > 0) {
        // Lấy tất cả user có đăng ký gói để tính tổng tiền
        const { data: subscribedUsers } = await supabase
          .from("users")
          .select("subscription_plan")
          .not("subscription_plan", "is", null);

        subscribedUsers?.forEach(u => {
          const matchedPackage = packageData.find(p => p.name.toLowerCase() === u.subscription_plan?.toLowerCase());
          if (matchedPackage) {
            calculatedMRR += matchedPackage.price;
          }
        });
      }

      // Cập nhật giá trị thật vào state hiển thị
      setMetrics({
        totalMembers: totalCount || 0,
        premiumSubs: premiumCount || 0,
        activeAuthors: authorCount || 0,
        mrr: calculatedMRR,
      });

    } catch (error: any) {
      console.error("Lỗi nạp số liệu vĩ mô Admin:", error.message);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
  }, []);

  // Tổ hợp mảng mapping để hiển thị UI sau khi có số liệu thật
  const topMetrics = [
    { label: "TOTAL MEMBERS", value: metricsLoading ? "..." : `${metrics.totalMembers}`, badge: "Live" },
    { label: "PREMIUM SUBS", value: metricsLoading ? "..." : `${metrics.premiumSubs}`, badge: "Active" },
    { label: "ACTIVE AUTHORS", value: metricsLoading ? "..." : `${metrics.activeAuthors}`, badge: "Verified" },
    { label: "ESTIMATED MRR", value: metricsLoading ? "..." : `${metrics.mrr.toLocaleString('vi-VN')} đ`, badge: "Realtime" },
  ];

  return (
    <View style={{ flex: 1, flexDirection: "row", backgroundColor: "#FAF6F0" }}>
      
      {/* SIDEBAR ADMIN CHUẨN ĐỒNG BỘ ĐỒ ÁN */}
      <AdminSidebar activeMenu="USERS" />

      {/* KHÔNG GIAN NỀN GRADIENT KHÁM PHÁ USER */}
      <View style={{ flex: 1, position: "relative" }}>
        
        {/* Dải nền màu chuyển tiếp đối xứng nghệ thuật độc quyền */}
        <View style={{ position: "absolute", top: 70, left: 0, right: 0, height: 420, backgroundColor: "#557A76", opacity: 0.85, zIndex: -1 }} />
        <View style={{ position: "absolute", top: 70, left: "40%", right: 0, height: 420, backgroundColor: "#CBB385", opacity: 0.75, zIndex: -1 }} />

        {/* TOPBAR ĐIỀU HÀNH HỆ THỐNG */}
        <View style={{ height: 70, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 40, backgroundColor: "#FAF6F0" }}>
          <Text style={{ fontSize: 22, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" }}>User Management Portal</Text>
          
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            {/* Tổ hợp nút bấm chức năng thông báo nhanh */}
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EBE3D5", justifyContent: "center", alignItems: "center" }}>
              <Bell size={16} color="#614124" />
            </TouchableOpacity>
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#EBE3D5", justifyContent: "center", alignItems: "center" }}>
              <Mail size={16} color="#614124" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => Alert.alert("Thông báo", "Luồng khởi tạo tài khoản Admin trực tiếp đang được nạp bảo mật!")}
              style={{ backgroundColor: "#4A2E1B", flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 10, gap: 6 }}
            >
              <Plus size={14} color="#FAF6F0" />
              <Text style={{ color: "#FAF6F0", fontSize: 12, fontWeight: "bold" }}>New Member</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KHỐI NỘI DUNG CUỘN CHÍNH TRÊN TOÀN MÀN HÌNH */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 40 }}>
          
          {/* HÀNG THẺ 4 CHỈ SỐ THỐNG KÊ VĨ MÔ ĐÃ ĐƯỢC LIVE-TIME CHUẨN DATA THẬT */}
          <View style={{ flexDirection: "row", gap: 20, marginBottom: 40 }}>
            {topMetrics.map((metric, idx) => (
              <View key={idx} style={{ flex: 1, backgroundColor: "#FFFDF9", borderRadius: 20, padding: 20, shadowColor: "#4A321F", shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 11, fontWeight: "bold", color: "#8A7663", letterSpacing: 0.5 }}>{metric.label}</Text>
                  <View style={{ backgroundColor: "rgba(92, 58, 33, 0.06)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
                    {metricsLoading ? (
                      <ActivityIndicator size="small" color="#614124" />
                    ) : (
                      <Text style={{ fontSize: 10, fontWeight: "bold", color: "#614124" }}>{metric.badge}</Text>
                    )}
                  </View>
                </View>
                <Text style={{ fontSize: metric.label.includes("MRR") ? 22 : 32, fontWeight: "bold", color: "#4A321F", marginTop: 12 }}>
                  {metric.value}
                </Text>
              </View>
            ))}
          </View>

          {/* 🚀 LÕI NHÂN LIÊN THÔNG: Hiển thị bảng danh sảnh, bộ lọc tìm kiếm Paper động */}
          <UserManagement />

        </ScrollView>
      </View>
    </View>
  );
}