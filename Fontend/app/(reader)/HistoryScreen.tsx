// 📂 Định vị file: app/(reader)/HistoryScreen.tsx
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Surface } from 'react-native-paper';
import { ChevronLeft, RefreshCw, CheckCircle2, Clock, Calendar, BookOpen, ArrowRight } from 'lucide-react-native';

import ReaderSidebar from './ReaderSidebar'; 
import GlowLoading from '../../components/GlowLoading';

const COLORS = {
  primary: '#6c2f00',          
  tertiary: '#735c00',        
  backgroundBg: '#EBE4D6',    
  surfacePaper: '#FFFDF8',    
  outlineVariant: '#dac2b6',
  onSurface: '#1c1c17',
  onSurfaceVariant: '#54433a',
  success: '#2e7d32',          
};

export default function HistoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  const fetchReadingStatement = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const minimumDelay = new Promise(resolve => setTimeout(resolve, 1500));
       
      let token = (await supabase.auth.getSession()).data.session?.access_token || await AsyncStorage.getItem('userToken');
       
      if (typeof token === 'string' && token.startsWith('{')) {
        try {
          const parsed = JSON.parse(token);
          token = parsed.access_token || parsed.token;
        } catch (e) {
          console.error("Lỗi parse token hệ thống:", e);
        }
      }

      await minimumDelay;

      if (!token) {
        console.warn("⚠️ Không tìm thấy Token xác thực người dùng. Hãy đăng nhập!");
        setLogs([]);
        setLoading(false);
        return;
      }

      console.log("📡 [FRONTEND] Đang gọi API GET /api/reading-history để tải lịch sử đọc...");

      const response = await fetch('http://localhost:3000/api/reading-history', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const resJson = await response.json();

      if (resJson.success && resJson.data) {
        console.log(`✅ [ĐỒNG BỘ THÀNH CÔNG] Đã nạp ${resJson.data.length} lịch sử đọc từ Backend!`);
        setLogs(resJson.data);
      } else {
        console.warn("⚠️ Cổng API trả dữ liệu không thành công hoặc trống:", resJson.message);
        setLogs([]);
      }

    } catch (err) {
      console.error("❌ Thất bại hoàn toàn tại fetchReadingStatement:", err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReadingStatement(true);
    }, [])
  );

  const formatDateTime = (isoString: string) => {
    if (!isoString) return { date: '--/--/----', time: '--:--' };
    const d = new Date(isoString);
    return {
      date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    };
  };

  const handleNavigateToChapter = (currentChapterId: string, fileUrl: string) => {
    if (!currentChapterId) {
      console.warn("⚠️ Không tìm thấy thông tin ID chương truyện!");
      return;
    }
    console.log(`🚀 [ĐIỀU HƯỚNG]: Chuyển sang trình đọc PDF. ID: ${currentChapterId}`);
    
    router.push({
      pathname: '/(reader)/ReadingScreen', 
      params: { 
        chapterId: currentChapterId, 
      }
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <GlowLoading />
        <Text style={styles.loadingText}>Đang tra cứu biên niên sử nhật ký...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.mainLayout}>

        <View style={styles.centerColumn}>
          
          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={true}>
            <Text style={styles.screenTitle}>📜 Nhật Ký Giao Dịch Đọc Sách</Text>
            <Text style={styles.screenSubTitle}>Chi tiết mốc thời gian và trạng thái ghi nhận các phiên truy cập của bạn.</Text>

            {logs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>Chưa ghi nhận dữ liệu lịch sử đọc nào trên hệ thống.</Text>
              </View>
            ) : (
              <View style={styles.cardGridContainer}>
                {logs.map((log) => {
                  const { date, time } = formatDateTime(log.updated_at);

                  const bookTitle = log.books?.title;
                  const chapterTitle = log.chapters?.title;
                  const chapterNum = log.chapters?.chapter_number;
                  // Lấy link ảnh từ object books (Ví dụ trường: cover_url hoặc image_url)
                  const bookCover = log.books?.cover_url || log.books?.image_url; 
                  
                  const currentChapterId = log.chapter_id || log.chapters?.id;
                  const fileUrl = log.chapters?.file_url; 

                  if (!bookTitle || !chapterTitle) return null;

                  return (
                    <Surface key={log.id} style={styles.novelCard} elevation={2}>
                      <View style={styles.cardMainInfo}>
                        
                        {/* Khu vực ảnh bìa hoặc fallback icon nếu lỗi/thiếu ảnh */}
                        <View style={styles.bookIconWrapper}>
                          {bookCover ? (
                            <Image 
                              source={{ uri: bookCover }} 
                              style={styles.bookCoverImage} 
                              resizeMode="cover"
                            />
                          ) : (
                            <BookOpen size={28} color={COLORS.primary} />
                          )}
                          <View style={styles.chapterBadge}>
                            <Text style={styles.chapterBadgeText}>Tập {chapterNum}</Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <View style={styles.cardHeaderRow}>
                            <Text style={styles.transactionLabel}>NỘI DUNG TRUY CẬP</Text>
                            <View style={styles.statusBadge}>
                              <CheckCircle2 size={11} color={COLORS.success} style={{ marginRight: 3 }} />
                              <Text style={styles.statusText}>ĐÃ GHI</Text>
                            </View>
                          </View>

                          <Text style={styles.bookTitleText} numberOfLines={1}>{bookTitle}</Text>
                          <Text style={styles.chapterText} numberOfLines={1}>Chương {chapterNum}: {chapterTitle}</Text>

                          <View style={styles.metaDataRow}>
                            <View style={styles.metaItem}>
                              <Clock size={12} color={COLORS.onSurfaceVariant} style={{ marginRight: 4 }} />
                              <Text style={styles.metaText}>{time}</Text>
                            </View>
                            <View style={styles.metaItem}>
                              <Calendar size={12} color={COLORS.onSurfaceVariant} style={{ marginRight: 4 }} />
                              <Text style={styles.metaText}>{date}</Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Nút bấm ở đáy thẻ */}
                      <View style={styles.cardActionArea}>
                        <View /> {/* Giữ khoảng trống bên trái */}
                        <TouchableOpacity 
                          style={styles.readContinueBtn}
                          activeOpacity={0.8}
                          onPress={() => handleNavigateToChapter(currentChapterId, fileUrl)}
                        >
                          <Text style={styles.readContinueText}>Đọc tiếp</Text>
                          <ArrowRight size={14} color="#FFF" />
                        </TouchableOpacity>
                      </View>

                    </Surface>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundBg, },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FDF8F4' },
  loadingText: { marginTop: 20, color: COLORS.primary, fontWeight: '600', fontSize: 14, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', letterSpacing: 0.5 },
  
  mainLayout: { flex: 1, flexDirection: 'row' },
  centerColumn: { flex: 1, backgroundColor: COLORS.backgroundBg },

  topControl: { height: 64, backgroundColor: '#fcf9f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderColor: COLORS.outlineVariant },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, marginLeft: 4 },
  headerTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 0.5 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center' },
  refreshBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.tertiary },
  
  scrollBody: { padding: 24, flexGrow: 1 },
  screenTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.primary, fontFamily: 'serif', marginBottom: 4 },
  screenSubTitle: { fontSize: 13, color: COLORS.onSurfaceVariant, marginBottom: 24, opacity: 0.8 },
  emptyBox: { backgroundColor: COLORS.surfacePaper, padding: 32, borderRadius: 8, alignItems: 'center', borderWidth: 0.5, borderColor: COLORS.outlineVariant },
  emptyText: { color: COLORS.onSurfaceVariant, fontStyle: 'italic' },

  /* --- CẤU TRÚC 3 CỘT (GRID) --- */
  cardGridContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 16, 
    width: '100%' 
  },
  novelCard: { 
    backgroundColor: COLORS.surfacePaper, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant,
    // (100% - Khoảng cách gap*2) / 3 cột = ~31.5% để chia đều hoàn hảo 3 cột
    width: '31.5%', 
    minWidth: 280, 
    overflow: 'hidden',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  cardMainInfo: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  
  /* --- KHU VỰC ẢNH BÌA TRUYỆN --- */
  bookIconWrapper: {
    width: 75,
    height: 105, // Tăng nhẹ chiều cao theo tỷ lệ chuẩn của bìa sách truyện (3:4)
    backgroundColor: '#F5EFE4',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden'
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
  },
  chapterBadge: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.primary,
    paddingVertical: 2,
    alignItems: 'center'
  },
  chapterBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

  cardContent: { flex: 1, paddingLeft: 12, justifyContent: 'center' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 4 },
  transactionLabel: { fontSize: 8.5, fontWeight: 'bold', color: COLORS.tertiary, letterSpacing: 0.3 },
  bookTitleText: { fontSize: 14, fontWeight: 'bold', color: COLORS.onSurface, fontFamily: 'serif' },
  chapterText: { fontSize: 11.5, color: COLORS.onSurfaceVariant, marginTop: 2, fontWeight: '500' },
  
  metaDataRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center' },
  metaText: { fontSize: 10.5, color: COLORS.onSurfaceVariant, fontWeight: '500' },

  statusBadge: { backgroundColor: 'rgba(46, 125, 50, 0.08)', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5, borderColor: COLORS.success, flexDirection: 'row', alignItems: 'center' },
  statusText: { fontSize: 8, fontWeight: 'bold', color: COLORS.success, letterSpacing: 0.2 },
  
  cardActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FAF5EC',
    borderTopWidth: 1,
    borderColor: '#ebd9ce'
  },
  readContinueBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  readContinueText: { color: '#FFF', fontSize: 11.5, fontWeight: 'bold', letterSpacing: 0.3 }
});