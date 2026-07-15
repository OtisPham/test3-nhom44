import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';

export default function Index() {
  const [authChecked, setAuthChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) return null; // Đứng im để chờ lấy session

  // Nếu có session thì KHÔNG làm gì cả (để _layout.tsx tự điều hướng theo Role)
  // Nếu không có session thì mới bắt về Login
  return hasSession ? null : <Redirect href="/(auth)/login" />;
}