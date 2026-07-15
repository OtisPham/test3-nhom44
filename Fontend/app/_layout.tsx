import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet, Text as RNText } from 'react-native'; 
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from '../context/AuthContext';

// 🚀 ĐỒNG BỘ ĐỘC QUYỀN: Import chú dê núi phát sáng gác cổng ma thuật thay thế loading cũ
import GlowLoading from '../components/GlowLoading';

function AuthGuard() {
  const { user, token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 1. Nếu đang load dữ liệu từ máy thì không làm gì cả
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token) {
      // 2. CHƯA ĐĂNG NHẬP: Đá về login nếu không ở trong trang auth
      if (!inAuthGroup) {
        console.log(">>> Chưa có token, đá về Login");
        router.replace('/(auth)/login');
      }
    } else if (user) {
      // 3. ĐÃ ĐĂNG NHẬP: Điều hướng theo Role
      // Chỉ tự động điều hướng khi đang ở trang Login hoặc trang gốc "/"
      if (inAuthGroup || pathname === '/') {
        const role = user.role;
        console.log(">>> Đã có token, Role:", role);

        if (role === 'admin') {
          router.replace('/(admin)/dashboard');
        } else if (role === 'author') {
          // Chỉ replace nếu chưa ở trong nhóm author
          if (segments[0] !== '(author)') {
            router.replace('/(author)'); // Tự tìm index.tsx trong nhóm author
          }
        } else {
          if (segments[0] !== '(reader)') {
            router.replace('/(reader)');
          }
        }
      }
    }
  }, [user, token, isLoading, segments, pathname]);

  // 🐐 MANH HÌNH CHỜ QUÝ TỘC: Gọi chú dê thần lật mở thư tịch cổ gác cổng an ninh
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <GlowLoading />
        <RNText style={styles.loadingText}>Đang kiểm tra thông tin hành giả...</RNText>
      </View>
    );
  }

  // Luôn trả về Stack để các màn hình bên trong có thể render
  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <AuthGuard />
      </AuthProvider>
    </PaperProvider>
  );
}

// 🎨 ĐỒNG BỘ LAYOUT MÀU KEM CỔ ĐIỂN VÀ NÂU ĐẤT ĐỒNG BỘ TOÀN HỆ THỐNG
const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#FAF6F0' // Màu nền kem lụa mờ dịu mắt sang trọng
  },
  loadingText: { 
    color: '#4A321F', // Màu chữ gỗ mun đậm của trang Admin
    marginTop: 15, 
    fontWeight: 'bold',
    fontStyle: 'italic',
    fontSize: 13,
    letterSpacing: 0.3
  }
});