import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

// 1. Định nghĩa kiểu dữ liệu User đầy đủ quyền hạn
type User = { 
  id: string; 
  name: string; 
  email: string; 
  role: 'admin' | 'author' | 'reader'; 
  plan: 'free' | 'premium' | 'vip';
} | null;

interface AuthContextType {
  user: User;
  token: string | null;
  timeLeft: number;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User>(null);
  const [token, setToken] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [appState, setAppState] = useState(AppState.currentState);
  
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Hàm gia hạn Token (Heartbeat) - Gọi lên Node.js để đổi thẻ mới
  const refreshToken = async (currentDocToken: string) => {
    try {
      console.log("🔄 Đang xin gia hạn thẻ từ cho Chủ Tịch...");
      const response = await fetch('http://localhost:3000/api/refresh-token', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${currentDocToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.token) {
        await AsyncStorage.setItem('userToken', data.token);
        processToken(data.token);
        console.log("✅ Gia hạn thành công! Đồng hồ đã reset.");
      }
    } catch (e) {
      console.error("❌ Không thể gia hạn (có thể server tắt hoặc token hết hạn thật)");
    }
  };

  // 3. Hàm xử lý Token và tính toán thời gian
  const processToken = (jwtToken: string) => {
  try {
    const decoded: any = jwtDecode(jwtToken);
    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - currentTime;

    if (remaining <= 0) {
      logout();
      return;
    }

    setUser({ 
      id: decoded.id, 
      name: decoded.name || 'User', 
      email: decoded.email,
      role: decoded.role,
      plan: decoded.plan
    });
    
    setToken(jwtToken);
    // QUAN TRỌNG: Cập nhật lại timeLeft để đồng hồ nhảy về con số mới (ví dụ 120s)
    setTimeLeft(remaining); 

  } catch (error) {
    logout();
  }
};

  // 4. Khôi phục session & Lắng nghe trạng thái App
  useEffect(() => {
    const loadStorageData = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('userToken');
        if (savedToken) processToken(savedToken);
      } finally {
        setIsLoading(false);
      }
    };
    loadStorageData();

    // Lắng nghe xem Chủ Tịch đang mở app hay thoát app
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const handleAppStateChange = (nextAppState: AppStateStatus) => {
    // Nếu Chủ Tịch quay lại App (Active) -> Đi gia hạn ngay
    if (appState.match(/inactive|background/) && nextAppState === 'active') {
      AsyncStorage.getItem('userToken').then(savedToken => {
        if (savedToken) refreshToken(savedToken);
      });
    }
    setAppState(nextAppState);
  };

  // 5. LOGIC ĐẾM NGƯỢC (Chỉ thực sự quan trọng khi App ở Background)
  useEffect(() => {
  if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);

  if (token && timeLeft > 0) {
    logoutTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        // --- CHỖ MỚI: Tự động gia hạn khi còn 30 giây ---
        if (prev === 30) {
           console.log("⚡ Token sắp hết, đang tự động gia hạn ngầm...");
           refreshToken(token); 
        }
        // -----------------------------------------------

        if (prev <= 1) {
          clearInterval(logoutTimerRef.current!);
          logout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as any;
  }

  return () => {
    if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
  };
}, [token]);

  const login = async (newToken: string) => {
    await AsyncStorage.setItem('userToken', newToken);
    processToken(newToken);
  };

  const logout = async () => {
    if (logoutTimerRef.current) clearInterval(logoutTimerRef.current);
    await AsyncStorage.removeItem('userToken');
    setUser(null);
    setToken(null);
    setTimeLeft(0);
  };

  return (
    <AuthContext.Provider value={{ user, token, timeLeft, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};