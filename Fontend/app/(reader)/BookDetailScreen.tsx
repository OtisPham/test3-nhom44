// 📂 Đường dẫn file: app/(reader)/BookDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Platform, Linking } from 'react-native';
import { Text, Button, List, Divider, Surface } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Heart, UserPlus, UserCheck, User, Globe } from 'lucide-react-native'; 
import CommentSection from './components/CommentSection'; 
import GlowLoading from '../../components/GlowLoading'; 
import { supabase } from '../../lib/supabase'; 

const COLORS = {
  primary: '#8B4513',         
  secondary: '#A0522D',       
  tertiary: '#735c00',        
  neutralDark: '#4A4540',     
  backgroundBg: '#EBE4D6',    
  surfacePaper: '#FFFDF8',    
  outlineVariant: '#dac2b6',  
  badgeBg: '#F4EFE6',         
  success: '#2e7d32',
  premiumOrange: '#E97E5B', 
};

export default function BookDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams(); // <--- Lấy 'id' từ URL
  
  const [bookInfo, setBookInfo] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [uniqueViews, setUniqueViews] = useState<number>(0);
  const [currentUser, setCurrentUser] = useState<any>(null); 
  const [isFollowing, setIsFollowing] = useState(false);
  const [authorProfile, setAuthorProfile] = useState<any>(null);


  const refreshUniqueViews = async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('reading_history')
        .select('user_id')
        .eq('book_id', String(id));

      if (!error && data) {
        const uniqueUsers = new Set(data.map(item => item.user_id));
        setUniqueViews(uniqueUsers.size);
      } else {
        setUniqueViews(0);
      }
    } catch (err) {
      console.error("❌ Thất bại lấy view bằng JS:", err);
    }
  };

  const loadBookData = async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      // 1. Gọi API lấy chi tiết sách
      const resDetail = await fetch(`http://localhost:3000/api/books/public-detail/${id}`);
      const jsonDetail = await resDetail.json();
      
      if (jsonDetail.success) {
        const currentBook = jsonDetail.data.book;
        setBookInfo(currentBook);
        setChapters(jsonDetail.data.chapters || []);
      }

      // 2. GỌI API BACKEND LẤY THÔNG TIN TÁC GIẢ (ĐÃ SỬA LỖI BIẾN)
      try {
        // Đổi ${bookId} thành ${id} để truyền đúng mã sách
        const resAuthor = await fetch(`http://localhost:3000/api/books/profiles/${id}`); 
        // Đổi response thành resAuthor cho khớp biến
        const jsonAuthor = await resAuthor.json(); 
        
        if (jsonAuthor.success && jsonAuthor.data) {
          setAuthorProfile(jsonAuthor.data);
        } else {
          console.log("Không lấy được tác giả:", jsonAuthor.message);
        }
      } catch (authorErr) {
        console.error("Lỗi khi gọi API lấy thông tin tác giả:", authorErr);
      }

      // 3. Lấy lượt view
      await refreshUniqueViews();

      // 4. Kiểm tra trạng thái Like
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || (Platform.OS === 'web' ? localStorage.getItem('userToken') : null);
      const headers: any = {};
      if (token) {
        headers['Authorization'] = `Bearer ${typeof token === 'string' && token.startsWith('{') ? JSON.parse(token).access_token : token}`;
      }

      const resStats = await fetch(`http://localhost:3000/api/books/like-stats/${id}`, { headers });
      const jsonStats = await resStats.json();
      if (jsonStats.success) {
        setIsLiked(jsonStats.data.hasLiked);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu màn hình chi tiết sách:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLikeToggle = async () => {
    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || (Platform.OS === 'web' ? localStorage.getItem('userToken') : null);
      if (!token) {
        if (Platform.OS === 'web') window.alert("Vui lòng đăng nhập để thả tim tác phẩm!");
        return;
      }
      if (typeof token === 'string' && token.startsWith('{')) token = JSON.parse(token).access_token;

      const res = await fetch('http://localhost:3000/api/books/toggle-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookId: id })
      });
      const resJson = await res.json();
      if (resJson.success) setIsLiked(resJson.data.isLiked);
    } catch (err) {
      console.error("Lỗi xử lý tương tác Tim:", err);
    }
  };

  const handleFollowToggle = async () => {
    if (!bookInfo?.user_id) return; 

    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || (Platform.OS === 'web' ? localStorage.getItem('userToken') : null);
      if (!token) {
        if (Platform.OS === 'web') window.alert("Vui lòng đăng nhập để theo dõi tác giả!");
        return;
      }
      if (typeof token === 'string' && token.startsWith('{')) token = JSON.parse(token).access_token;

      const res = await fetch('http://localhost:3000/api/authors/toggle-follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ authorId: bookInfo.user_id }) 
      });
      
      const resJson = await res.json();
      if (resJson.success) {
        setIsFollowing(resJson.isFollowing); 
      } else {
        if (Platform.OS === 'web') window.alert(resJson.message);
      }
    } catch (err) {
      console.error("Lỗi xử lý Follow tác giả:", err);
    }
  };

  const handleChapterRead = async (chapterId: string) => {
    router.push({ pathname: '/ReadingScreen', params: { chapterId } });
  };

  const handleGoBack = () => {
    setLoading(true);
    setTimeout(() => {
      router.back();
    }, 120); 
  };

  const openWebsite = (url: string) => {
    if (url) Linking.openURL(url).catch(err => console.error("Không thể mở link", err));
  };

  useEffect(() => {
    loadBookData();
  }, [id]);

  useEffect(() => {
    console.log("Dữ liệu authorProfile nhận được:", authorProfile);
  }, [authorProfile]);

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <GlowLoading />
      </View>
    );
  }

  if (!bookInfo) {
    return (
      <View style={styles.containerSide}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Không tìm thấy tác phẩm (ID: {id})</Text>
          <Button mode="outlined" color={COLORS.primary} onPress={handleGoBack}>
            Quay lại
          </Button>
        </View>
      </View>
    );
  }

  const isBookHasPremiumChapter = chapters.some(
    chap => chap.package_requirement !== null && chap.package_requirement !== undefined
  );

  return (
    <View style={styles.containerSide}>
      <ScrollView style={styles.mainContent} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <Button 
          icon="arrow-left" 
          mode="text" 
          onPress={handleGoBack} 
          textColor={COLORS.primary} 
          style={styles.btnBack}
          labelStyle={styles.btnBackLabel}
        >
          QUAY LẠI THƯ VIỆN
        </Button>

        <View style={styles.pageLayout}>
          
          {/* ======================= CỘT TRÁI ======================= */}
          <View style={styles.leftColumn}>
            
            <Surface style={styles.headerCard} elevation={1}>
              <Image 
                source={{ uri: bookInfo.cover_url || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400' }} 
                style={styles.coverLarge} 
              />
              <View style={styles.infoWrapper}>
                <View style={styles.titleRow}>
                  <Text style={styles.mainTitle}>{bookInfo.title}</Text>
                  {(bookInfo.is_premium || isBookHasPremiumChapter) && (
                    <View style={styles.badgeBookPremium}>
                      <Text style={styles.badgePremiumText}>PREMIUM</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.genreBadge}>🎭 Thể loại: {bookInfo.genre || 'Đang cập nhật'}</Text>
                
                <View style={styles.viewCountRow}>
                  <Text style={styles.viewCountText}>
                    👁️ Lượt đọc hợp lệ: <Text style={styles.viewCountHighlight}>{bookInfo.views !== undefined ? bookInfo.views : 0}</Text> view
                  </Text>
                </View>
              </View>
            </Surface>

            <View style={styles.chapterSection}>
              <Text style={styles.sectionTitle}>DANH SÁCH CÁC TẬP PHÁT HÀNH</Text>
              <Divider style={styles.divider} />

              {chapters.map((chap) => {
                const isChapterPremium = chap.package_requirement !== null && chap.package_requirement !== undefined;
                return (
                  <List.Item
                    key={chap.id}
                    title={
                      <View style={styles.chapterTitleRow}>
                        <Text style={styles.chapterTitle}>Tập / Chương {chap.chapter_number}</Text>
                        {isChapterPremium && (
                          <View style={styles.badgeChapterPremium}>
                            <Text style={styles.badgePremiumText}>PREMIUM</Text>
                          </View>
                        )}
                      </View>
                    }
                    description={chap.chapter_title || "Không có tiêu đề"}
                    descriptionStyle={styles.chapterDesc}
                    left={props => <List.Icon {...props} icon="book-open-variant" color={COLORS.secondary} />}
                    right={() => (
                      <Button 
                        mode="contained" 
                        buttonColor={COLORS.primary} 
                        textColor={COLORS.surfacePaper}
                        onPress={() => handleChapterRead(chap.id)} 
                        style={styles.btnReadNow}
                        labelStyle={styles.btnReadNowLabel}
                      >
                        ĐỌC NGAY
                      </Button>
                    )}
                    style={styles.chapterRow}
                  />
                );
              })}

              {chapters.length === 0 && (
                <Text style={styles.emptyChap}>Tác giả hiện tại đang lên đề cương, chưa phát hành tập nào.</Text>
              )}
            </View>

            <TouchableOpacity style={styles.likeBox} onPress={handleLikeToggle} activeOpacity={0.7}>
              <Heart color={isLiked ? "red" : COLORS.neutralDark} fill={isLiked ? "red" : "none"} size={22} />
              <Text style={styles.likeText}>{isLiked ? 1 : 0} người yêu thích tác phẩm này</Text>
            </TouchableOpacity>
            
            <View style={styles.commentContainer}>
              <Text style={styles.sectionTitle}>ĐỘC GIẢ THẢO LUẬN</Text>
              <CommentSection bookId={String(id)} />
            </View>

          </View>

          {/* ======================= CỘT PHẢI (TÁC GIẢ) ======================= */}
          <View style={styles.rightColumn}>
            <Surface style={styles.authorSidebar} elevation={1}>
              
              {authorProfile?.avatar_url ? (
                <Image 
                  source={{ uri: authorProfile.avatar_url }} 
                  style={{ width: 68, height: 68, borderRadius: 34, marginBottom: 16 }} 
                />
              ) : (
                <View style={styles.authorAvatarPlaceholder}>
                  <User size={30} color={COLORS.primary} opacity={0.6} />
                </View>
              )}
              
              <Text style={styles.authorName}>
                {authorProfile?.pseudonym || authorProfile?.name || 'Tác giả ẩn danh'}
              </Text>
              
              <Text style={styles.authorBioText}>
                {authorProfile?.bio || 'Tác giả hiện chưa cập nhật thông tin tiểu sử cá nhân.'}
              </Text>

              {authorProfile?.website_url && (
                <TouchableOpacity style={styles.socialRow} onPress={() => openWebsite(authorProfile.website_url)}>
                  <Globe size={14} color="#1877F2" />
                  <Text style={styles.socialLink} numberOfLines={1}>
                    Liên kết / Mạng xã hội
                  </Text>
                </TouchableOpacity>
              )}

              {currentUser?.id !== bookInfo.user_id && (
                <TouchableOpacity 
                  style={[styles.followBtn, isFollowing && styles.followingBtn]} 
                  onPress={handleFollowToggle}
                  activeOpacity={0.7}
                >
                  {isFollowing ? (
                    <UserCheck size={14} color="#FFF" />
                  ) : (
                    <UserPlus size={14} color={COLORS.primary} />
                  )}
                  <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                    {isFollowing ? 'Đang theo dõi' : 'Theo dõi tác giả'}
                  </Text>
                </TouchableOpacity>
              )}
            </Surface>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerSide: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.backgroundBg },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcf9f0' },
  mainContent: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundBg },
  errorText: { color: COLORS.neutralDark, fontFamily: 'serif', marginBottom: 12 },
  btnBack: { alignSelf: 'flex-start', marginBottom: 15 },
  btnBackLabel: { fontWeight: 'bold', fontSize: 13 },
  
  pageLayout: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    maxWidth: 1200, 
    width: '100%', 
    alignSelf: 'center', 
    gap: 24, 
    alignItems: 'flex-start' 
  },
  
  leftColumn: {
    flex: 2.5,
    minWidth: 320,
    width: '100%',
  },

  rightColumn: {
    flex: 1,
    minWidth: 280,
    width: '100%',
    ...(Platform.OS === 'web' ? { position: 'sticky', top: 24 } as any : {}),
  },
  
  headerCard: { 
    flexDirection: 'row', 
    padding: 25, 
    borderRadius: 12, 
    backgroundColor: COLORS.surfacePaper, 
    borderWidth: 1, 
    borderColor: COLORS.outlineVariant, 
    marginBottom: 25,
    width: '100%'
  },
  coverLarge: { width: 140, height: 200, borderRadius: 8, resizeMode: 'cover' },
  infoWrapper: { flex: 1, marginLeft: 30, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 },
  mainTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary, fontFamily: 'serif', marginRight: 10 },
  badgeBookPremium: { backgroundColor: COLORS.premiumOrange, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 5 },
  genreBadge: { fontSize: 14, color: COLORS.neutralDark, marginBottom: 8, fontWeight: '500' },
  viewCountRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18, backgroundColor: COLORS.badgeBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 0.5, borderColor: COLORS.outlineVariant, alignSelf: 'flex-start' },
  viewCountText: { fontSize: 12, color: COLORS.neutralDark, fontWeight: 'bold' },
  viewCountHighlight: { color: COLORS.primary, fontWeight: 'bold' },

  authorSidebar: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: COLORS.surfacePaper,
    borderWidth: 1,
    borderColor: COLORS.outlineVariant,
    alignItems: 'center',
    width: '100%',
  },
  authorAvatarPlaceholder: { 
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.badgeBg, 
    justifyContent: 'center', alignItems: 'center', marginBottom: 16 
  },
  authorName: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary, marginBottom: 10, textAlign: 'center', fontFamily: 'serif' },
  authorBioText: { fontSize: 13, color: COLORS.neutralDark, textAlign: 'center', marginBottom: 18, fontStyle: 'italic', lineHeight: 20 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 18 },
  socialLink: { fontSize: 13, color: '#1877F2', textDecorationLine: 'underline', maxWidth: 200 },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.primary, backgroundColor: '#FFF' },
  followingBtn: { backgroundColor: COLORS.primary },
  followBtnText: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary },
  followingBtnText: { color: '#FFF' },

  chapterTitleRow: { flexDirection: 'row', alignItems: 'center' },
  chapterTitle: { color: COLORS.primary, fontWeight: 'bold', fontSize: 15, fontFamily: 'serif', marginRight: 8 },
  badgeChapterPremium: { backgroundColor: COLORS.premiumOrange, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgePremiumText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  chapterSection: { width: '100%', marginTop: 5 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, letterSpacing: 0.5 },
  divider: { marginBottom: 15, backgroundColor: COLORS.outlineVariant, height: 1 },
  chapterRow: { backgroundColor: COLORS.surfacePaper, borderRadius: 8, marginBottom: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.outlineVariant, paddingHorizontal: 8 },
  chapterDesc: { color: COLORS.neutralDark, fontSize: 13, marginTop: 2 },
  btnReadNow: { borderRadius: 6, justifyContent: 'center', height: 38 },
  btnReadNowLabel: { fontWeight: 'bold', letterSpacing: 0.5, fontSize: 13 },
  emptyChap: { fontStyle: 'italic', textAlign: 'center', color: COLORS.neutralDark, marginTop: 20, opacity: 0.6 },
  likeBox: { flexDirection: 'row', alignItems: 'center', width: '100%', padding: 16, backgroundColor: COLORS.surfacePaper, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant, marginTop: 16 },
  likeText: { marginLeft: 12, color: COLORS.neutralDark, fontWeight: '600', fontSize: 13 },
  commentContainer: { width: '100%', marginTop: 30, marginBottom: 10 }
});