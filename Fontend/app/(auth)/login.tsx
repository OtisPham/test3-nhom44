import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Button } from 'react-native-paper';

// 🚀 THUẬT TOÁN BACKEND: Kết nối trực tiếp hệ thống API Server Node.js & Lưu Token
import { apiService } from '../../lib/api'; 
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false); // Quản lý vòng xoay xử lý của nút bấm
  const router = useRouter();

  // Lấy hàm login từ AuthContext để lưu trạng thái phiên đăng nhập của backend
  const { login: saveAuthStatus } = useAuth();

  // 🚀 LUỒNG XỬ LÝ ĐĂNG NHẬP NODE.JS THẬT (GIỮ NGUYÊN ALGORITHM CỦA BACKEND)
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ Email và Mật khẩu");
      return;
    }

    setLoading(true);
    try {
      // Gọi dịch vụ API đăng nhập đến Server Node.js của bạn
      const response = await apiService.login(email.trim(), password);
      
      if (response.token) {
        // Lưu token mã hóa vào bộ nhớ Context hệ thống
        await saveAuthStatus(response.token);
        
        Alert.alert("Thành công", "Chào mừng Chủ Tịch Nhi đã quay lại!");
        // Expo Router sẽ tự động nhận diện token trong Context để định tuyến vào app chính
      }
    } catch (err: any) {
      // Trả lỗi thân thiện trực tiếp từ Backend tự xây (Sai pass, tài khoản không có...)
      Alert.alert("Lỗi đăng nhập", err.message || "Không thể kết nối đến server");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert("Thông báo", "Tính năng Google đang được nâng cấp để chạy với Token riêng!");
  };

  return (
    <AuthLayout title="LOGIN">
      <Stack.Screen options={{ headerShown: false }} />

      {/* 🔮 GIỮ NGUYÊN 100% GIAO DIỆN KHUNG Ô NHẬP QUÝ TỘC CỦA BẠN */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
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

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Password</Text>
        <TextInput 
          style={styles.input} 
          placeholder="********" 
          placeholderTextColor="#777" 
          secureTextEntry 
          value={password} 
          onChangeText={setPassword} 
        />
      </View>

      <View style={styles.footerLinks}>
        <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
          <Text style={styles.linkText}>Register</Text>
        </TouchableOpacity>
        
        {/* 🛠️ ĐÃ FIX CHUẨN: Viết thường resetpassword để tránh crash lỗi đường dẫn Expo Router */}
        <TouchableOpacity onPress={() => router.push('/(auth)/resetpassword')}>
          <Text style={styles.linkText}>Lost password?</Text>
        </TouchableOpacity>
      </View>

      {/* NÚT BẤM SIGN IN ĐĂNG NHẬP VÀNG ĐỒNG CHÍNH CHỦ CỦA BẠN */}
      <TouchableOpacity 
        style={styles.btnSignIn} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.btnText}>SIGN IN</Text>
        )}
      </TouchableOpacity>

      {/* THANH NGĂN CÁCH TUYẾN CHỌN ĐĂNG NHẬP KHÁC */}
      {/* <View style={styles.dividerContainer}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>OR</Text>
        <View style={styles.divider} />
      </View> */}

      {/* NÚT ĐĂNG NHẬP GMAIL ĐỒNG BỘ VỚI DESIGN BO CONG 30 ĐỘ SANG TRỌNG */}
      {/* <Button
        mode="contained"
        icon="google"
        onPress={handleGoogleLogin}
        style={styles.googleBtn}
        labelStyle={styles.googleBtnLabel}
        buttonColor="#fff"
      >
        Tiếp tục với Gmail
      </Button>  */}
    </AuthLayout>
  );
}

// 🎨 BẢO TOÀN TRỌN VẸN 100% BỘ FRAME STYLES SANG TRỌNG ĐÚNG MÃ CỦA BẠN
const styles = StyleSheet.create({
  inputGroup: { width: '100%', marginBottom: 15 },
  label: { color: '#C5A059', marginBottom: 5, fontWeight: '600' },
  input: { 
    backgroundColor: 'rgba(255,255,255,0.08)', 
    borderRadius: 12, 
    padding: 15, 
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)'
  },
  footerLinks: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 25 },
  linkText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, textDecorationLine: 'underline' },
  // Tìm đến style của nút bấm Đăng nhập (ví dụ: btnSignIn hoặc submitButton)
  btnSignIn: {
    backgroundColor: '#C5A059',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff', 
  },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  
  // Styles bổ sung đồng bộ hóa cho các nút phụ của Backend
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, width: '100%' },
  divider: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  dividerText: { color: 'rgba(255, 252, 252, 0.6)', paddingHorizontal: 10, fontSize: 12, fontWeight: '600' },
  googleBtn: { width: '100%', borderRadius: 15, paddingVertical: 4, elevation: 2 },
  googleBtnLabel: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});