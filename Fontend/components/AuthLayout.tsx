import React from 'react';
import { 
  ImageBackground, 
  View, 
  StyleSheet, 
  Dimensions, 
  Image, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Text } from 'react-native-paper';

const { width } = Dimensions.get('window');

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AuthLayout({ children, title }: AuthLayoutProps) {
  return (
    <ImageBackground 
      source={require('../assets/images/Nenbao.jpg')} 
      style={styles.background}
      resizeMode="cover"
    >
      {/* 🚀 ĐÃ SỬA TRÊN iOS: Cấu hình chuẩn hành vi đẩy giao diện mượt mà, chống sập khung gõ */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={styles.overlay}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Khung Form chứa nhân thiết kế lụa mờ */}
          <View style={styles.formContainer}>
            <Text style={styles.title}>{title}</Text>
            
            <Image 
              source={require('../assets/images/download.png')} 
              style={styles.logo} 
            />
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

// 🎨 HỆ THỐNG ĐỊNH VỊ RESPONSIVE KHỚP ĐA NỀN TẢNG (WEB MÁY TÍNH & MOBILE IOS)
const styles = StyleSheet.create({
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingVertical: 40,
    paddingHorizontal: 20
  },
  formContainer: {
    // 💡 ĐÂY CHÍNH LÀ CHÌA KHÓA FIX WEB & MOBILE: 
    // Ép cứng giao diện rộng tối đa 420px trên PC, và rộng 92% khi thu nhỏ về điện thoại
    width: Platform.OS === 'web' ? 420 : width * 0.92,
    maxWidth: 450,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Lớp nền tối mờ ma mị hoàng gia
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    
    // Bóng đổ tăng chiều sâu hiển thị trên thiết bị iOS thực tế
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 }
    })
  },
  title: { 
    color: '#fff', 
    fontSize: 28, 
    fontWeight: '900', 
    letterSpacing: 3, 
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' // Font chữ có chân cổ điển sang trọng
  },
 logo: { 
    width: 100,           // Tăng nhẹ kích thước lên 100 để nhìn rõ chữ "Nhóm 44"
    height: 100,          
    marginBottom: 20, 
    
    // 🚀 CHÍ MẠNG 1: Đổi bắt buộc từ 'contain' sang 'cover' để ảnh tự phóng đầy ô vuông, cắt bỏ 2 dải đen thừa
    resizeMode: 'cover', 
    
    // 🚀 CHÍ MẠNG 2: Bo tròn xoe bằng 1/2 chiều rộng/cao để gọt sạch khối vuông bám góc
    borderRadius: 50,    
    
    // 🎨 ĐỒNG BỘ HOÀNG GIA: Dập thêm viền vàng mảnh đồng bộ 100% với nút bấm có viền trắng của bạn
    borderWidth: 1.5,    
    borderColor: '#C5A059', 
    
    // 💡 KHÓA NỀN: Ép nền phía sau ảnh thành màu đen tuyền để hòa lẫn hoàn toàn với ruột logo
    backgroundColor: '#000000', 
  },
});