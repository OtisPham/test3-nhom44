import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
// 1. Import apiService và useAuth
import { apiService } from '../../lib/api'; 
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../components/AuthLayout';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const { login: saveAuthStatus } = useAuth(); // Dùng để lưu token ngay sau khi đăng ký xong

  const handleRegister = async () => {
    if (!name || !email || !password) {
      return Alert.alert("Lỗi", "Vui lòng nhập đủ thông tin");
    }
    
    setLoading(true);
    try {
      // 2. Gọi API đăng ký của Node.js
      const response = await apiService.register(name, email.trim(), password);
      
      if (response.token) {
        // 3. Nếu đăng ký xong server trả về token luôn, thì đăng nhập thẳng
        await saveAuthStatus(response.token);
        
        Alert.alert("Thành công", "Tài khoản của Chủ Tịch Nhi đã sẵn sàng!", [
          { text: "Vào App ngay", onPress: () => router.replace('/(reader)/HomeScreen') } 
        ]);
      } else {
        // Nếu server chỉ báo thành công mà không trả token, bắt user quay lại Login
        Alert.alert("Thành công", "Đã tạo tài khoản, mời bạn đăng nhập!", [
          { text: "OK", onPress: () => router.replace('/(auth)/login') }
        ]);
      }
    } catch (err: any) {
      // Bắt lỗi trùng email hoặc lỗi server từ Node.js trả về
      Alert.alert("Lỗi đăng ký", err.message || "Email đã tồn tại hoặc server bận rồi!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="REGISTER">
      <TextInput 
        label="Full Name" 
        value={name} 
        onChangeText={setName} 
        mode="flat" 
        style={styles.input} 
        textColor="#fff" 
        theme={{colors:{primary:'#FFD700'}}} 
      />
      
      <TextInput 
        label="Email" 
        value={email} 
        onChangeText={setEmail} 
        mode="flat" 
        style={styles.input} 
        textColor="#fff" 
        autoCapitalize="none" 
        keyboardType="email-address"
        theme={{colors:{primary:'#FFD700'}}} 
      />
      
      <TextInput 
        label="Password" 
        value={password} 
        onChangeText={setPassword} 
        secureTextEntry 
        mode="flat" 
        style={styles.input} 
        textColor="#fff" 
        theme={{colors:{primary:'#FFD700'}}} 
      />
      
      <TouchableOpacity 
        style={styles.actionBtn} 
        onPress={handleRegister} 
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.btnText}>Sign Up</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={{marginTop: 20}}>
        <Text style={{color: '#fff', textAlign: 'center', textDecorationLine: 'underline'}}>
          Back to Login
        </Text>
      </TouchableOpacity>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  input: { backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: 15 },
  actionBtn: { 
    backgroundColor: '#FFD700', 
    padding: 15, 
    borderRadius: 30, 
    alignItems: 'center', 
    marginTop: 10 
  },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 }
});