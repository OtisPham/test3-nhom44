import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { BarChart2, Users, BookOpen, CreditCard, DollarSign, ShieldAlert, Settings } from "lucide-react-native";

// Định nghĩa chính xác Type nghiêm ngặt khớp với cấu trúc hệ thống của bạn
export interface AdminSidebarProps {
  activeMenu: "DASHBOARD" | "USERS" | "AUTHORS" | "SUBSCRIPTION" | "REVENUE" | "MODERATION" | "ANALYTICS" | "SETTINGS";
}

export default function AdminSidebar({ activeMenu }: AdminSidebarProps) {
  
  // Điều hướng chính xác: Map các sub-folder nằm bên trong app/(admin)/
  const menuItems = [
    { name: "DASHBOARD", path: "", icon: BarChart2, label: "Dashboard" },
    { name: "USERS", path: "users", icon: Users, label: "Users" },
    { name: "AUTHORS", path: "authors", icon: BookOpen, label: "Authors" },
    { name: "SUBSCRIPTION", path: "plans", icon: CreditCard, label: "Subscription" },
    { name: "REVENUE", path: "revenue", icon: DollarSign, label: "Revenue" },
    { name: "MODERATION", path: "moderation", icon: ShieldAlert, label: "Moderation" },
    { name: "ANALYTICS", path: "analytics", icon: BarChart2, label: "Analytics" },
  ];

  return (
    <View style={styles.sidebarContainer}>
      <View>
        {/* Khối thông tin Admin User trên cùng */}
        <View style={styles.adminProfileHeader}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>AD</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={styles.adminName}>Admin User</Text>
            <Text style={styles.adminSubText}>Academic Oversight</Text>
          </View>
        </View>

        {/* Badge định danh SUPER ADMIN độc quyền */}
        <View style={styles.superAdminBadge}>
          <Text style={styles.badgeText}>SUPER ADMIN</Text>
        </View>

        {/* Khối vòng lặp danh sách điều hướng menu chính */}
        <View style={{ gap: 4 }}>
          {menuItems.map((item, idx) => {
            const IconComponent = item.icon;
            const isActive = activeMenu === item.name;

            // 🚀 ĐÃ SỬA CHÍ MẠNG: Ép cấu trúc chuỗi chuẩn để Expo Router lật trang mượt mà không crash
            const finalPath = item.path === "" ? "/(admin)" : `/(admin)/${item.path}`;

            return (
              <Link key={idx} href={finalPath as any} asChild>
                <TouchableOpacity 
                  style={[
                    styles.menuItemBtn,
                    { backgroundColor: isActive ? "#5C3A21" : "transparent" }
                  ]}
                >
                  <IconComponent size={18} color={isActive ? "#FAF6F0" : "#8A7663"} />
                  <Text style={[styles.menuItemText, { color: isActive ? "#FAF6F0" : "#4A321F" }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Link>
            );
          })}
        </View>
      </View>
    </View>
  );
}



const styles = StyleSheet.create({
  sidebarContainer: { width: 240, backgroundColor: "#F9F6F0", padding: 24, justifyContent: "space-between", borderRightWidth: 1, borderColor: "#EBE6DD", height: "100%" },
  adminProfileHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#362215", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FAF6F0", fontWeight: "bold", fontSize: 13 },
  adminName: { fontSize: 15, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" },
  adminSubText: { fontSize: 11, color: "#8A7663" },
  
  superAdminBadge: { backgroundColor: "#4A2E1B", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start", marginBottom: 32 },
  badgeText: { color: "#D2B48C", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },
  
  menuItemBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, marginTop: 2 },
  menuItemText: { marginLeft: 14, fontSize: 13, fontWeight: "bold", letterSpacing: 0.3 },
  
  settingsBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, gap: 14, borderTopWidth: 1, borderColor: "#EBE6DD", borderRadius: 12 },
  settingsBtnText: { fontSize: 13, fontWeight: "bold" }
});