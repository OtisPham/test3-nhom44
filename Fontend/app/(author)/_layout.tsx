// import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
// import { useEffect } from 'react';
// import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'; 
// import { Provider as PaperProvider } from 'react-native-paper';
// import { AuthProvider, useAuth } from '../../context/AuthContext';

// function AuthGuard() {
//   const { user, token, isLoading } = useAuth();
//   const segments = useSegments();
//   const router = useRouter();
//   const pathname = usePathname();

//   useEffect(() => {
//     if (isLoading) return;

//     const inAuthGroup = segments[0] === '(auth)';

//     if (!token) {
//       if (!inAuthGroup) router.replace('/(auth)/login');
//     } else if (user) {
//       // Nếu đang ở trang login hoặc trang gốc, đẩy vào đúng Role
//       if (inAuthGroup || pathname === '/') {
//         if (user.role === 'admin') router.replace('/(admin)/dashboard');
//         else if (user.role === 'author') router.replace('/(author)'); // Tự tìm index.tsx
//         else router.replace('/(reader)/HomeScreen');
//       }
//     }
//   }, [user, token, isLoading, segments, pathname]);

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#000" />
//         <Text style={{ marginTop: 10 }}>Đang kiểm tra quyền...</Text>
//       </View>
//     );
//   }

//   return <Stack screenOptions={{ headerShown: false }} />;
// }

// export default function RootLayout() {
//   return (
//     <PaperProvider>
//       <AuthProvider>
//         <AuthGuard />
//       </AuthProvider>
//     </PaperProvider>
//   );
// }

// const styles = StyleSheet.create({
//   loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }
// });

// import { Stack } from 'expo-router';

// export default function Layout() {
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//        <Stack.Screen name="index" /> 
//        {/* Thêm các màn hình khác của bạn ở đây */}
//     </Stack>
//   );
// }