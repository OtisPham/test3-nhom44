import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack, useLocalSearchParams } from 'expo-router';

// 🚀 ĐỒNG BỘ BACKEND NODE.JS: Kết nối trực tiếp dịch vụ API hệ thống của bạn
import { apiService } from '../../lib/api'; 
import AuthLayout from '../../components/AuthLayout';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams(); // Dùng để hứng Token bảo mật từ link email ném về
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Trạng thái kiểm tra xem người dùng đang "yêu cầu gửi mail" hay "đang gõ mật khẩu mới"
  const [isResettingMode, setIsResettingMode] = useState(false);
  const [userToken, setUserToken] = useState('');

  // 🔄 TỰ ĐỘNG BẮT TOKEN KHI USER CLICK LINK TỪ EMAIL QUAY LẠI APP
  useEffect(() => {
    // Supabase thường trả token qua URL hash hoặc query params (ví dụ: #access_token=... hoặc ?token=...)
    // Hoặc nếu bạn cấu hình bốc tách nhanh bằng UUID thông qua luồng Node.js
    if (params?.token || params?.access_token) {
      const tokenString = (params.token || params.access_token) as string;
      setUserToken(tokenString);
      setIsResettingMode(true); // Chuyển sang giao diện gõ mật khẩu mới
    }
  }, [params]);

  // 🛑 LUỒNG 1: GỬI YÊU CẦU ĐẾN EMAIL
  const handleSendEmailRequest = async () => {
    if (!email) {
      Alert.alert("Thông báo", "Vui lòng nhập Email để nhận link khôi phục");
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.forgotPassword(email.trim());
      Alert.alert(
        "Thành công",
        response.message || "Hệ thống đã gửi một liên kết đổi mật khẩu vào Email của bạn. Vui lòng kiểm tra hộp thư!",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert("Lỗi hệ thống", error.message || "Không thể gửi yêu cầu reset password lúc này.");
    } finally {
      setIsLoading(false);
    }
  };

  // 🛑 LUỒNG 2: XÁC NHẬN CẬP NHẬT MẬT KHẨU MỚI VÀO DB
  const handleUpdateNewPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ mật khẩu mới và xác nhận mật khẩu!");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi nhập liệu", "Mật khẩu xác nhận không trùng khớp!");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Lỗi nhập liệu", "Mật khẩu mới phải có độ dài từ 6 ký tự trở lên!");
      return;
    }

    setIsLoading(true);
    try {
      // Gọi lên cổng `/auth/reset-password` của Node.js mà bạn đã tạo ở Router
      const response = await apiService.resetPassword(userToken, newPassword);

      Alert.alert(
        "Thành công 🎉",
        response.message || "Mật khẩu của bạn đã được cập nhật thành công!",
        [{ text: "Đăng nhập ngay", onPress: () => router.replace('/(auth)/login') }]
      );
    } catch (error: any) {
      Alert.alert("Lỗi cập nhật", error.message || "Đường dẫn hết hạn hoặc mã xác thực không hợp lệ.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout title={isResettingMode ? "NEW PASSWORD" : "RESET PASSWORD"}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={{ width: '100%' }}>
        
        {/* TRẠNG THÁI 1: GIAO DIỆN NHẬP MẬT KHẨU MỚI (Khi nhấn link quay lại) */}
        {isResettingMode ? (
          <>
            <Text style={styles.description}>
              Tuyệt vời! Tài khoản của bạn đã được xác thực an toàn. Hãy thiết lập mật khẩu mới cho thư viện của bạn.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu mới</Text>
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor="#777"
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              <TextInput
                style={styles.input}
                placeholder="********"
                placeholderTextColor="#777"
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={styles.btnReset}
              onPress={handleUpdateNewPassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnText}>CẬP NHẬT MẬT KHẨU</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          
          /* TRẠNG THÁI 2: GIAO DIỆN NHẬP EMAIL ĐỂ GỬI MAIL (Mặc định) */
          <>
            <Text style={styles.description}>
              Nhập email tài khoản của bạn. Hệ thống Node.js sẽ kết nối Supabase gửi một liên kết để xác nhận đặt lại mật khẩu.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email tài khoản</Text>
              <TextInput
                style={styles.input}
                placeholder="abc@gmail.com"
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <TouchableOpacity
              style={styles.btnReset}
              onPress={handleSendEmailRequest}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.btnText}>GỬI YÊU CẦU</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      <TouchableOpacity style={{ marginTop: 25 }} onPress={() => router.replace('/(auth)/login')}>
        <Text style={styles.backToLoginText}>
          Quay lại Đăng nhập
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  description: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 20
  },
  inputGroup: { width: '100%', marginBottom: 20 },
  label: { color: '#C5A059', marginBottom: 5, fontWeight: '600', fontSize: 13 },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  btnReset: {
    backgroundColor: '#C5A059',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff',
    marginTop: 10
  },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  backToLoginText: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontSize: 13
  }
});