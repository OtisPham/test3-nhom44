import { Stack } from 'expo-router';

export default function Layout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
       <Stack.Screen name="dashboard" /> 
       {/* Thêm các màn hình khác của bạn ở đây */}
    </Stack>
  );
}