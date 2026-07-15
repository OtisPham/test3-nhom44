// 📂 File: Fontend/app/(author)/components/AuthorSidebar.tsx
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import {
  BarChart2,
  BookOpen,
  PenTool,
  MessageSquare,
  DollarSign,
  HelpCircle,
  User,
  Plus,
  Settings
} from "lucide-react-native";


// Định nghĩa chính xác các kiểu dữ liệu cho menu được Active công phá lỗi gác cổng TypeScript
interface AuthorSidebarProps {
  activeMenu: "DASHBOARD" | "MY STORIES" | "CREATE" | "ANALYTICS" | "INTERACTION" | "REVENUE" | "HELP" | "ACCOUNT" | "SETTINGS" | string;
  setActiveMenu: (menu: string) => void; // ✅ Nhận diện bộ đổi Tab từ file gốc index.tsx gửi vào
}


export default function AuthorSidebar({ activeMenu, setActiveMenu }: AuthorSidebarProps) {
 
  // Danh sách các mục Menu chính ở nửa trên Sidebar - Chuyển sang cơ chế định vị Tab động dạng chuỗi chuẩn
  const mainMenuItems = [
    { name: "DASHBOARD", icon: BarChart2 },
    { name: "MY STORIES", icon: BookOpen },
    { name: "CREATE", icon: PenTool },
    { name: "ANALYTICS", icon: BarChart2 },
    { name: "INTERACTION", icon: MessageSquare },
    { name: "REVENUE", icon: DollarSign },
  ];


  // Danh sách các mục cài đặt/tiện ích ở nửa dưới Sidebar
  const footerMenuItems = [
    { name: "HELP", icon: HelpCircle, label: "Help Center" },
    { name: "ACCOUNT", icon: User, label: "Account" },
    { name: "SETTINGS", icon: Settings, label: "Settings" },
  ];


  return (
    <View style={{ width: 220, backgroundColor: "#F3EDE4", padding: 24, justifyContent: "space-between", borderRightWidth: 1, borderColor: "#E6DCD0", height: "100%" }}>
     
      {/* PHẦN TRÊN: TIÊU ĐỀ & MENU CHỨC NĂNG CHÍNH ĐIỀU HƯỚNG ĐỘNG */}
      <View>
        <Text style={{ fontSize: 20, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" }}>Library Archive</Text>
        <Text style={{ fontSize: 11, color: "#8A7663", fontWeight: "600", letterSpacing: 0.5, marginBottom: 35, marginTop: 2 }}>Premium Author Suite</Text>


        <View style={{ gap: 4 }}>
          {mainMenuItems.map((item, idx) => {
            const IconComponent = item.icon;
            const isActive = activeMenu === item.name;


            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.8}
                onPress={() => setActiveMenu(item.name)} // ✅ ĐỔI THÀNH: Trả ngược sự kiện kích hoạt Tab về cho index.tsx phản hồi mượt mà
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor: isActive ? "#E97E5B" : "transparent",
                  marginTop: 2
                }}
              >
                <IconComponent size={18} color={isActive ? "#FAF6F0" : "#8A7663"} />
                <Text style={{ marginLeft: 12, fontSize: 12, fontWeight: "bold", color: isActive ? "#FAF6F0" : "#8A7663", letterSpacing: 0.5 }}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>


      {/* PHẦN DƯỚI: NÚT TẠO TRUYỆN MỚI TẮT & TIỆN ÍCH HỆ THỐNG */}
      <View style={{ gap: 4 }}>
       
        {/* Nút tắt chuyển nhanh trực tiếp đến phân đoạn Tab Đăng Bản thảo mượt mà */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveMenu("CREATE")} // ✅ FIXED: Bấm một cái nhảy ngay sang Tab Đăng tập mới không lo lệch định tuyến
          style={{ backgroundColor: "#5C3A21", flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 20, marginBottom: 16, gap: 8 }}
        >
          <Plus size={14} color="#FAF6F0" />
          <Text style={{ color: "#FAF6F0", fontWeight: "bold", fontSize: 12 }}>New Manuscript</Text>
        </TouchableOpacity>


        {/* Vòng lặp tự động đồng bộ hóa các nút cài đặt phía dưới bằng cơ chế gửi State */}
        {footerMenuItems.map((item, idx) => {
          const IconComponent = item.icon;
          const isActive = activeMenu === item.name;


          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.8}
              onPress={() => setActiveMenu(item.name)} // ✅ ĐỔI THÀNH: Gửi lệnh mở mục tài khoản/cài đặt linh hoạt
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor: isActive ? "rgba(233, 126, 91, 0.15)" : "transparent",
                gap: 12,
                marginTop: 2
              }}
            >
              <IconComponent size={16} color={isActive ? "#E97E5B" : "#8A7663"} />
              <Text style={{ fontSize: 12, fontWeight: "600", color: isActive ? "#E97E5B" : "#8A7663" }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
