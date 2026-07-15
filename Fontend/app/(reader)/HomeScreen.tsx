// 📂 File: app/(reader)/HomeScreen.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, StyleSheet, FlatList, Image, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react-native';
import GlowLoading from '../../components/GlowLoading';
import { useAuth } from '../../context/AuthContext';

const COLORS = {
  primary: '#8B4513',       
  secondary: '#A0522D',     
  tertiary: '#D4AF37',      
  background: '#F5F2E9',    
  surface: '#FFFFFF',       
  onSurface: '#331D0F',     
  onSurfaceVariant: '#735B4A', 
  outlineVariant: '#E2D5C8', 
};

const GENRES = [
  { id: 'all', name: 'Tất cả', icon: '📚' },
  { id: '1', name: 'Phật học', icon: '🎭' }, // Đã sửa lỗi chính tả từ "Phạt học"
  { id: '2', name: 'Kiếm hiệp', icon: '⚔️' },
  { id: '3', name: 'Tiên hiệp', icon: '🔮' },
  { id: '4', name: 'Ngôn tình', icon: '💕' },
  { id: '5', name: 'Trinh thám', icon: '🕵️' },
  { id: '6', name: 'Kinh dị', icon: '👻' },
];

// =========================================================================
// 🚀 COMPONENT HERO 5-SLIDE CAROUSEL (DÃN CÁCH XA HƠN - HIỆN ĐỦ HÌNH)
// =========================================================================
const Hero3DCarousel = React.memo(({ topStories, onNavigate }: { topStories: any[], onNavigate: (id: any) => void }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (topStories.length === 0) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % Math.min(topStories.length, 5));
    }, 4500);
    return () => clearInterval(interval);
  }, [topStories]);

  if (topStories.length === 0) return null;
  const totalSlides = Math.min(topStories.length, 5);

  const getSlideStyle = (index: number) => {
    if (index === activeIndex) return { style: [styles.carouselBookBody, styles.bookActive], isBlur: false };
    const isLeft1 = index === (activeIndex - 1 + totalSlides) % totalSlides;
    const isLeft2 = index === (activeIndex - 2 + totalSlides) % totalSlides;
    const isRight1 = index === (activeIndex + 1) % totalSlides;
    const isRight2 = index === (activeIndex + 2) % totalSlides;

    if (isLeft1) return { style: [styles.carouselBookBody, styles.bookLeftStack1], isBlur: true };
    if (isLeft2) return { style: [styles.carouselBookBody, styles.bookLeftStack2], isBlur: true };
    if (isRight1) return { style: [styles.carouselBookBody, styles.bookRightStack1], isBlur: true };
    if (isRight2) return { style: [styles.carouselBookBody, styles.bookRightStack2], isBlur: true };

    return { style: [styles.carouselBookBody, { opacity: 0 }], isBlur: true };
  };

  return (
    <View style={styles.carouselContainer}>
      <View style={styles.carousel3DZone}>
        {topStories.slice(0, 5).map((story, index) => {
          const slideConfig = getSlideStyle(index);
          return (
            <TouchableOpacity
              key={story.id}
              activeOpacity={0.9}
              style={slideConfig.style}
              onPress={() => index === activeIndex ? onNavigate(story.id) : setActiveIndex(index)}
            >
              <Image source={{ uri: story.cover }} style={[styles.heroBookImg, slideConfig.isBlur && styles.blurImageOpacity]} resizeMode="stretch" />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.dotsRow}>
        {Array.from({ length: totalSlides }).map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex ? styles.activeDot : styles.inactiveDot]} />
        ))}
      </View>
    </View>
  );
});
Hero3DCarousel.displayName = 'Hero3DCarousel';

export default function ReaderHomeScreen() {
  const router = useRouter();
  const [books, setBooks] = useState<any[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<any[]>([]);
  const [randomCarouselBooks, setRandomCarouselBooks] = useState<any[]>([]);
  const [trendingStories, setTrendingStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState('Tất cả');

  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;

  const loadBooks = async () => {
    try {
      // Lưu ý: Nếu chạy trên điện thoại hoặc máy ảo, hãy thay localhost bằng IP LAN (VD: 192.168.1.x)
      const backendIP = "localhost"; 
      const [allBooksRes, topViewsRes] = await Promise.all([
        fetch(`http://${backendIP}:3000/api/books/all-books`),
        fetch(`http://${backendIP}:3000/api/books/top-views`)
      ]);

      const allBooksData = await allBooksRes.json();
      if (allBooksData.success) {
        setBooks(allBooksData.data);
        setFilteredBooks(allBooksData.data);
        
        const shuffled = [...allBooksData.data].sort(() => 0.5 - Math.random());
        setRandomCarouselBooks(shuffled.slice(0, 5).map(b => ({ id: b.id, cover: b.cover_url })));
      }

      const topViewsData = await topViewsRes.json();
      if (topViewsData.success) {
        setTrendingStories(topViewsData.data.slice(0, 5)); 
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBooks(); }, []);

  // ✅ LOGIC MỚI: Lắng nghe sự thay đổi của Thể loại (selectedGenre) và mảng sách (books)
  useEffect(() => {
    if (selectedGenre === 'Tất cả') {
      setFilteredBooks(books);
    } else {
      const filtered = books.filter(
        (item) => item.genre?.trim().toLowerCase() === selectedGenre.trim().toLowerCase()
      );
      setFilteredBooks(filtered);
    }
    // Bắt buộc reset về trang 1 khi đổi thể loại
    setCurrentPage(1);
  }, [selectedGenre, books]);

  const navigateToDetail = (id: any) => router.push({ pathname: '/BookDetailScreen', params: { id } });

  const paginatedBooks = useMemo(() => {
    const startIndex = (currentPage - 1) * booksPerPage;
    return filteredBooks.slice(startIndex, startIndex + booksPerPage);
  }, [filteredBooks, currentPage]);

  const totalPages = Math.ceil(filteredBooks.length / booksPerPage);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* BANNER + TRENDING ROW */}
      <View style={styles.topBannerFullRow}>
        {/* CỘT TRÁI: CAROUSEL (70%) */}
        <View style={styles.leftCarouselColumn}>
          <Hero3DCarousel topStories={randomCarouselBooks} onNavigate={navigateToDetail} />
        </View>

        {/* CỘT PHẢI: TOP TRENDING SIDEBAR (30%) */}
        <View style={styles.rightTrendingColumn}>
          <View style={styles.trendingSideHeader}>
            <Text style={styles.trendingSideTitle}>THỊNH HÀNH</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {trendingStories.map((item, index) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.trendingMiniCard}
                onPress={() => navigateToDetail(item.id)}
              >
                <Text style={styles.trendingRankText}>{index + 1}</Text>
                <Image source={{ uri: item.cover_url }} style={styles.trendingMiniCover} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.trendingMiniTitle} numberOfLines={1}>{item.title}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* THỂ LOẠI */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Khám phá Thể loại</Text>
      </View>
      <FlatList
        horizontal
        data={GENRES}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.genreCard, selectedGenre === item.name && styles.genreCardActive]} 
            onPress={() => setSelectedGenre(item.name)} // Chỉ cập nhật selectedGenre, pagination đã xử lý trong useEffect
          >
            <View style={styles.genreIconBox}><Text>{item.icon}</Text></View>
            <Text style={[styles.genreName, selectedGenre === item.name && styles.genreNameActive]}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>📚 Tất cả sách ({filteredBooks.length})</Text>
      </View>
    </View>
  );

  const renderFooterPagination = () => {
    if (totalPages <= 1) return <View style={styles.paginationBoxWrapper}><Text style={styles.footerText}>© 2026 The Collection - Premium Archive</Text></View>;
    
    return (
      <View style={styles.paginationBoxWrapper}>
        <View style={styles.paginationContainer}>
          {Array.from({ length: totalPages }).map((_, index) => (
            <TouchableOpacity 
              key={index + 1} 
              style={[styles.pageNumberBtn, currentPage === index + 1 && styles.pageNumberBtnActive]}
              onPress={() => setCurrentPage(index + 1)}
            >
              <Text style={[styles.pageNumberText, currentPage === index + 1 && styles.pageNumberTextActive]}>{index + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.footerText}>© 2026 The Collection - Premium Archive</Text>
      </View>
    );
  };

  if (loading) return <View style={[styles.center, { flex: 1, backgroundColor: COLORS.background }]}><GlowLoading /></View>;

  return (
    <View style={[
      { flex: 1, backgroundColor: COLORS.background },
      Platform.OS === 'web' && { userSelect: 'none' as any } ]}>
      <FlatList
        data={paginatedBooks}
        keyExtractor={(item) => item.id.toString()}
        numColumns={5} 
        columnWrapperStyle={styles.listRow}
        ListHeaderComponent={renderHeader()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.cardWrapper} onPress={() => navigateToDetail(item.id)}>
            <View style={styles.bookPhysicalFrameGrid}>
              <Image source={{ uri: item.cover_url }} style={styles.bookCoverImageMain} resizeMode="stretch" />
              <View style={styles.pureSpineShadow} />
              <View style={styles.innerPagesRightEdge} />
            </View>
            <View style={styles.customCardInfo}>
              <Text style={styles.customTitleText} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.customGenreText}>🎭 {item.genre || 'Phật học'}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={renderFooterPagination()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center', alignItems: 'center' },
  headerContainer: { paddingHorizontal: 40, paddingTop: 10 },

  /* === HÀNG ĐẦU TIÊN (BANNER + TRENDING) === */
  topBannerFullRow: { 
    flexDirection: 'row', 
    width: '100%', 
    height: 420, 
    marginBottom: 30,
    gap: 20
  },
  leftCarouselColumn: { 
    flex: 8,
    backgroundColor: 'transparent',
    borderRadius: 16,
    justifyContent: 'center'
  },
  rightTrendingColumn: { 
    flex: 2,
    backgroundColor: '#EBE5D3', 
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2DEC5'
  },

  /* === TRENDING SIDEBAR STYLES === */
  trendingSideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(139, 69, 19, 0.1)' },
  trendingSideTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 1 },
  trendingMiniCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  trendingRankText: { fontSize: 18, fontWeight: 'bold', color: COLORS.tertiary, width: 20 },
  trendingMiniCover: { width: 45, height: 60, borderRadius: 4, backgroundColor: '#D4AF37' },
  trendingMiniTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.onSurface },
  trendingMiniViews: { fontSize: 10, color: COLORS.onSurfaceVariant, marginTop: 2 },

  /* === CAROUSEL PHÓNG LỚN & DÃN CÁCH XA HƠN === */
  carouselContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  carousel3DZone: { width: '100%', height: 350, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  carouselBookBody: { width: 230, height: 330, borderRadius: 10, position: 'absolute', overflow: 'hidden' }, 
  
  bookActive: { zIndex: 10, width: 250, height: 350, transform: [{ scale: 1 }], ...Platform.select({ web: { boxShadow: '0px 15px 35px rgba(0,0,0,0.15)' } }) },
  
  bookLeftStack1: { zIndex: 5, opacity: 0.5, transform: [{ scale: 0.8 }, { translateX: -240 }] },
  bookLeftStack2: { zIndex: 3, opacity: 0.3, transform: [{ scale: 0.65 }, { translateX: -430 }] },
  bookRightStack1: { zIndex: 5, opacity: 0.5, transform: [{ scale: 0.8 }, { translateX: 240 }] },
  bookRightStack2: { zIndex: 3, opacity: 0.3, transform: [{ scale: 0.65 }, { translateX: 430 }] },
  
  heroBookImg: { width: '100%', height: '100%', borderRadius: 10 },
  blurImageOpacity: { opacity: 0.7 },
  dotsRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  dot: { height: 6, borderRadius: 3 },
  activeDot: { width: 18, backgroundColor: COLORS.primary },
  inactiveDot: { width: 6, backgroundColor: 'rgba(139, 69, 19, 0.2)' },

  /* THỂ LOẠI & HEADER */
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 20, color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontWeight: 'bold' },
  genreList: { gap: 12, paddingBottom: 30 },
  genreCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBE5D3', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  genreCardActive: { backgroundColor: COLORS.primary },
  genreIconBox: { marginRight: 10 },
  genreName: { fontSize: 13, fontWeight: '600', color: COLORS.onSurface },
  genreNameActive: { color: '#FFF' },

  /* GRID SÁCH TẤT CẢ */
  listRow: { justifyContent: 'flex-start', paddingHorizontal: 30 },
  cardWrapper: { flex: 1, padding: 10, maxWidth: '20%', alignItems: 'center' },
  bookPhysicalFrameGrid: {
    width: '100%', aspectRatio: 2 / 3, backgroundColor: '#EBE3D5', position: 'relative',
    borderRadius: 4, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 2, height: 4 }, shadowOpacity: 0.1
  },
  bookCoverImageMain: { width: '100%', height: '100%' },
  pureSpineShadow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
  innerPagesRightEdge: { position: 'absolute', right: 0, top: 2, bottom: 2, width: '3%', backgroundColor: 'rgba(255,255,255,0.4)' },
  
  customCardInfo: { width: '100%', paddingTop: 8, alignItems: 'center' },
  customTitleText: { fontSize: 13, fontWeight: 'bold', color: COLORS.onSurface },
  customGenreText: { fontSize: 11, color: COLORS.onSurfaceVariant, marginTop: 2 },
  
  /* PHÂN TRANG */
  paginationBoxWrapper: { width: '100%', alignItems: 'center', paddingVertical: 40 },
  paginationContainer: { flexDirection: 'row', gap: 8 },
  pageNumberBtn: { width: 35, height: 35, borderRadius: 6, justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBE5D3' },
  pageNumberBtnActive: { backgroundColor: COLORS.primary },
  pageNumberText: { fontWeight: 'bold', color: COLORS.primary },
  pageNumberTextActive: { color: '#FFF' },
  footerText: { marginTop: 20, fontSize: 11, color: '#dac2b6' },
});