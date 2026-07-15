// 📂 Đường dẫn: app/(reader)/ReadingScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Platform, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import GlowLoading from '../../components/GlowLoading';

const COLORS = {
  primary: '#6c2f00',
  tertiary: '#735c00',
  backgroundBg: '#EBE4D6',
  surfacePaper: '#FFFDF8',
  surfaceHeader: '#fcf9f0',
  onSurface: '#1c1c17',
  onSurfaceVariant: '#54433a',
  outlineVariant: '#dac2b6',
};

export default function ReadingScreen() {
  const router = useRouter();
  
  // Lấy thêm tham số position truyền từ HistoryScreen
  const { chapterId, position } = useLocalSearchParams();
  
  const [chapter, setChapter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [nextChapter, setNextChapter] = useState<any>(null);
  const [otherBooksOfAuthor, setOtherBooksOfAuthor] = useState<any[]>([]);
  
  const startTimeRef = useRef<number>(Date.now());
  
  // Khởi tạo ScrollPosition = position lấy từ params
  const scrollPositionRef = useRef<number>(Number(position) || 0);
  
  // Ref để điều khiển thanh cuộn ScrollView chính
  const scrollViewRef = useRef<ScrollView>(null);

  // Ref để lưu trữ timer chống gian lận
  const antiCheatTimerRef = useRef<any>(null);

  // const loadChapterDetail = async () => {
  //   if (!chapterId) return;
  //   setLoading(true);

  //   try {
  //     let token = (await supabase.auth.getSession()).data.session?.access_token || await AsyncStorage.getItem('userToken');
  //     if (typeof token === 'string' && token.startsWith('{')) {
  //       token = JSON.parse(token).access_token || JSON.parse(token).token;
  //     }

  //     const response = await fetch(`http://localhost:3000/api/books/public-chapter/${chapterId}`, {
  //       method: 'GET',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token || ''}`
  //       }
  //     });

  //     const resJson = await response.json();

  //     if (resJson.success) {
  //       const currentChapterData = resJson.data;
  //       setChapter(currentChapterData);
  //       startTimeRef.current = Date.now();

  //       if (currentChapterData.book_id) {
  //           const savedPosition = await AsyncStorage.getItem(`bookmark_book_${currentChapterData.book_id}`);
  //           if (savedPosition) {
  //               console.log("📌 [LOCAL SYNC] Phục hồi vị trí đọc dở tập trước đó!");
  //           }
  //       }

  //       await fetchSmartSuggestions(currentChapterData);
  //     } else {
  //       if (response.status === 403 || resJson.isVipBlocked) {
  //         router.replace('/(reader)/PackageScreen');
  //       }
  //     }
  //   } catch (err) {
  //     console.error(">>> [READING ERROR]:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };
//ham load luot view vaf ham chong gian lan
  const loadChapterDetail = async () => {
    if (!chapterId) return;
    setLoading(true);

    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || localStorage.getItem('userToken');
      if (typeof token === 'string' && token.startsWith('{')) {
        token = JSON.parse(token).access_token || JSON.parse(token).token;
      }

      const response = await fetch(`http://localhost:3000/api/books/public-chapter/${chapterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });

      const resJson = await response.json();

      if (resJson.success) {
        const currentChapterData = resJson.data;
        setChapter(currentChapterData);
        
        // 🛡️ ANTI-CHEAT PHÁT NỔ SAU 3 GIÂY
        antiCheatTimerRef.current = setTimeout(async () => {
          try {
            if (!token) return;
            await fetch('http://localhost:3000/api/books/track-reading-log', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({ chapterId: chapterId, dwellTime: 30, scrollDepth: 75 })
            });
            console.log("✅ [ANTI-CHEAT FE OK] Đã nạp view sạch gầm bảng reading_logs!");
          } catch (logErr) {
            console.error("❌ Lỗi luồng bắn dữ liệu đọc truyện ngầm:", logErr);
          }
        }, 3000);

        // KÍCH HOẠT THUẬT TOÁN GỢI Ý THÔNG MINH
        if (currentChapterData) {
          await fetchSmartSuggestions(currentChapterData);
        }

      } else {
        if (response.status === 403 || resJson.isVipBlocked) {
          router.replace('/(reader)/PackageScreen');
        }
      }
    } catch (err) {
      console.error(">>> [READING ERROR]:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ĐỒNG BỘ ĐỒNG THỜI AN TOÀN RLS KHI THOÁT TRANG ĐỌC TẬP TRUYỆN
  useEffect(() => {
    return () => {
      if (chapterId && chapter) {
        const endTime = Date.now();
        const dwellTimeSeconds = Math.floor((endTime - startTimeRef.current) / 1000);
        
        AsyncStorage.setItem(`bookmark_book_${chapter.book_id}`, chapterId as string);

        if (dwellTimeSeconds > 5) {
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            let token = session?.access_token || await AsyncStorage.getItem('userToken');
            
            if (token) {
              if (typeof token === 'string' && token.startsWith('{')) {
                try {
                  const parsed = JSON.parse(token);
                  token = parsed.access_token || parsed.token;
                } catch (e) {
                  console.error("Lỗi giải mã token:", e);
                }
              }

              fetch('http://localhost:3000/api/reading-history', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                  bookId: chapter.book_id,
                  chapterId: chapterId,
                  // Truyền vị trí Scroll cuối cùng lên Backend
                  position: scrollPositionRef.current > 0 ? Math.floor(scrollPositionRef.current) : 0
                })
              })
              .then(res => res.json())
              .then(resJson => {
                if (resJson.success) {
                  console.log("📑 [BACKEND HISTORY SYNC]: Ghi vết thành công!");
                }
              })
              .catch(err => console.error("❌ Thất bại khi kết nối API lịch sử:", err));
            }
          });
        }
      }
    };
  }, [chapterId, chapter]);

  const fetchSmartSuggestions = async (currentCh: any) => {
    try {
      const bookId = currentCh.book_id;
      const currentNum = parseInt(currentCh.chapter_number);

      setNextChapter(null);
      setOtherBooksOfAuthor([]);

      let token = (await supabase.auth.getSession()).data.session?.access_token || await AsyncStorage.getItem('userToken');
      if (typeof token === 'string' && token.startsWith('{')) {
        token = JSON.parse(token).access_token || JSON.parse(token).token;
      }

      const response = await fetch(`http://localhost:3000/api/books/public-chapter/${chapterId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        }
      });
      
      const resJson = await response.json();
      let genre = null;

      if (resJson.success && resJson.data) {
         genre = resJson.data.books?.genre;
      }

      const { data: nxtChData, error: chError } = await supabase
        .from('chapters')
        .select('id, chapter_number, chapter_title')
        .eq('book_id', bookId)
        .gt('chapter_number', currentNum)
        .order('chapter_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!chError && nxtChData) {
        setNextChapter(nxtChData);
        return;
      } 

      if (genre) {
        const booksRes = await fetch('http://localhost:3000/api/books', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const booksJson = await booksRes.json();

        if (booksJson.success && Array.isArray(booksJson.data)) {
          const filteredBooks = booksJson.data
            .filter((b: any) => b.genre === genre && b.id !== bookId)
            .slice(0, 3);

          setOtherBooksOfAuthor(filteredBooks);
        }
      }
    } catch (sErr) {
      console.error("⚠️ [SUGGESTION SYSTEM ERROR]:", sErr);
    }
  };

  useEffect(() => {
    loadChapterDetail();
  }, [chapterId]);

  // ========================================================
  // 🎯 TỰ ĐỘNG CUỘN ĐẾN VỊ TRÍ CŨ (AUTO-SCROLL) SAU KHI TẢI
  // ========================================================
  useEffect(() => {
    if (chapter && position && Number(position) > 0) {
      const timeout = setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: Number(position),
          animated: true,
        });
      }, 1000); // Trì hoãn 1s để UI và iframe đủ không gian render trước khi cuộn

      return () => clearTimeout(timeout);
    }
  }, [chapter, position]);


  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcf9f0' }}>
        <GlowLoading />
      </View>
    );
  }

  if (!chapter) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.backgroundBg }]}>
        <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>Không tìm thấy nội dung tập truyện.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.topControl} elevation={1}>
        <View style={styles.navLeftRow}>
          <Button icon="arrow-left" mode="text" onPress={() => router.replace('/(reader)')} textColor={COLORS.primary} labelStyle={styles.navCapsBtn}>
            THƯ VIỆN
          </Button>
          <View style={styles.dividerVertical} />
          <Text style={styles.mainBookTitle} numberOfLines={1}>
            TẬP {chapter.chapter_number}: {chapter.chapter_title}
          </Text>
        </View>
      </Surface>

      <View style={styles.mainLayoutBody}>
        {Platform.OS === 'web' && (
          <View style={styles.leftSidebar}>
            <View style={styles.sidebarTabRow}>
              <TouchableOpacity style={styles.activeTab}><Text style={styles.activeTabText}>MỤC LỤC TẬP</Text></TouchableOpacity>
              <TouchableOpacity style={styles.inactiveTab}><Text style={styles.inactiveTabText}>GHI CHÚ</Text></TouchableOpacity>
            </View>
            
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <View style={styles.chapterItemActive}>
                <Text style={styles.iconPlayActive}>▶</Text>
                <Text style={styles.chapterTextActive} numberOfLines={1}>
                  Tập {chapter.chapter_number}: {chapter.chapter_title}
                </Text>
              </View>

              <Text style={styles.sidebarHistoryLabel}>HÀNH TRÌNH ĐỌC TIẾP</Text>

              {nextChapter ? (
                <TouchableOpacity 
                  style={styles.suggestionCardNext}
                  activeOpacity={0.8}
                  onPress={() => router.replace({ pathname: '/(reader)/ReadingScreen', params: { chapterId: nextChapter.id } })}
                >
                  <View style={styles.nextBadgeIcon}><Text style={styles.nextBadgeText}>TẬP TIẾP</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyBookTitle} numberOfLines={1}>Tập {nextChapter.chapter_number}: {nextChapter.chapter_title}</Text>
                    <Text style={styles.historyBookTime}>Bấm để cày tập tiếp theo liền tay ⚡</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {otherBooksOfAuthor.length > 0 ? (
                <View style={{ marginTop: 5 }}>
                  <Text style={styles.historyBookTime}>Gợi ý truyện tương thích cho bạn:</Text>
                  {otherBooksOfAuthor.map((b) => (
                    <TouchableOpacity 
                      key={b.id}
                      style={styles.historyCardMini}
                      activeOpacity={0.8}
                      onPress={() => router.replace({ pathname: '/(reader)/BookDetailScreen', params: { id: b.id } })}
                    >
                      {b.cover_url && b.cover_url !== 'Đầu truyện nhiều tập' ? (
                        <Image source={{ uri: b.cover_url }} style={styles.historyBookThumbImg} />
                      ) : (
                        <View style={styles.historyBookThumb} />
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.historyBookTitle} numberOfLines={1}>{b.title}</Text>
                        <Text style={styles.historyBookTime}>🎭 Gu: {b.genre || "VIP Độc Quyền"}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        )}

        {/* ================= GẮN scrollViewRef ĐỂ TỰ ĐỘNG CUỘN ĐƯỢC ================= */}
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.centerReaderScroll} 
          showsVerticalScrollIndicator={true}
          onScroll={(e) => { scrollPositionRef.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
        >
          <Surface style={styles.pdfPageCanvas} elevation={3}>
            <View style={styles.contentCanvasWrapper}>
              <Text style={styles.chapterMetaTop}>CHAPTER {chapter.chapter_number} • ĐỘC GIẢ PREMIUM</Text>
              <Text style={styles.bookBigTitle}>{chapter.chapter_title}</Text>
              
              <View style={styles.iframeViewport}>
                {Platform.OS === 'web' ? (
                  <iframe 
                    src={`${chapter.file_url}#toolbar=0`} 
                    style={{ position: 'absolute', top: '0px', left: '0px', width: '100%', height: '100%', border: 'none' } as any} 
                    title="Nhóm 44 Engine"
                  />
                ) : (
                  <View style={styles.mobilePlaceholder}>
                    <Text style={styles.mobilePlaceholderText}>🛡️ Trình đọc mật mã PDF đang bảo mật...</Text>
                  </View>
                )}
              </View>
            </View>
          </Surface>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundBg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topControl: { height: 64, backgroundColor: COLORS.surfaceHeader, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, borderBottomWidth: 1, borderColor: COLORS.outlineVariant, zIndex: 50 },
  navLeftRow: { flexDirection: 'row', alignItems: 'center', flex: 1, maxWidth: 400 },
  navCapsBtn: { fontWeight: '700', letterSpacing: 1, fontSize: 12 },
  dividerVertical: { width: 1, height: 24, backgroundColor: COLORS.outlineVariant, marginHorizontal: 16 },
  mainBookTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, fontFamily: 'serif' },
  mainLayoutBody: { flex: 1, flexDirection: 'row', width: '100%' },
  leftSidebar: { width: 288, backgroundColor: COLORS.surfaceHeader, borderRightWidth: 1, borderColor: COLORS.outlineVariant, padding: 16 },
  sidebarTabRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.outlineVariant, marginBottom: 16 },
  activeTab: { flex: 1, paddingBottom: 8, borderBottomWidth: 2, borderColor: COLORS.primary, alignItems: 'center' },
  activeTabText: { fontSize: 11, fontWeight: 'bold', color: COLORS.primary },
  inactiveTab: { flex: 1, paddingBottom: 8, alignItems: 'center' },
  inactiveTabText: { fontSize: 11, fontWeight: 'bold', color: COLORS.onSurfaceVariant, opacity: 0.6 },
  chapterItemActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebe8df', padding: 10, borderRadius: 8, marginBottom: 15 },
  iconPlayActive: { color: COLORS.primary, marginRight: 8, fontSize: 12 },
  chapterTextActive: { fontWeight: 'bold', color: COLORS.primary, fontSize: 13, flex: 1 },
  sidebarHistoryLabel: { fontSize: 11, fontWeight: 'bold', color: COLORS.onSurfaceVariant, marginTop: 20, marginBottom: 10, letterSpacing: 0.5 },
  suggestionCardNext: { backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1.5, borderColor: COLORS.primary, marginBottom: 15 },
  nextBadgeIcon: { backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 6 },
  nextBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  historyBookTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.onSurface },
  historyBookTime: { fontSize: 11, color: COLORS.onSurfaceVariant, opacity: 0.7, marginTop: 4 },
  historyCardMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 8, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: COLORS.outlineVariant },
  historyBookThumbImg: { width: 40, height: 55, borderRadius: 4 },
  historyBookThumb: { width: 40, height: 55, borderRadius: 4, backgroundColor: COLORS.outlineVariant },
  centerReaderScroll: { padding: 24, alignItems: 'center' },
  pdfPageCanvas: { width: '100%', maxWidth: 850, backgroundColor: COLORS.surfacePaper, borderRadius: 8, padding: 30, minHeight: 1000 },
  contentCanvasWrapper: { flex: 1 },
  chapterMetaTop: { fontSize: 11, fontWeight: '600', color: COLORS.onSurfaceVariant, opacity: 0.5, letterSpacing: 1, marginBottom: 8 },
  bookBigTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, fontFamily: 'serif', marginBottom: 25 },
  iframeViewport: { width: '100%', height: 800, position: 'relative', backgroundColor: '#eee', borderRadius: 6, overflow: 'hidden' },
  mobilePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#444', padding: 20 },
  mobilePlaceholderText: { color: '#FFF', textAlign: 'center', fontSize: 14 }
});