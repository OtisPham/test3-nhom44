import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';

import {
  Text,
  Surface,
  ActivityIndicator,
  Chip,
} from 'react-native-paper';

import {
  Filter,
  Book,
  BookOpen,
  Edit2,
  Save,
  X,
  ImageIcon,
  BarChart3,
  FileText,
} from 'lucide-react-native';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import GlowLoading from '../../../components/GlowLoading';
import { supabase } from '../../../lib/supabase';

interface ManageBooksScreenProps {
  searchQuery: string;
}

interface BookType {
  id: string;
  title: string;
  genre?: string;
  description?: string;
  status?: string;
  cover_url?: string;
  created_at?: string;
  total_views?: number;
  total_follows?: number;
  chapter_count?: number;
}

interface ChapterType {
  id: string;
  title: string; // Trong backend gọi là chapter_title
  chapter_number: number;
  file_url?: string;
  word_count?: number;
  created_at?: string;
}

export default function ManageBooksScreen({ searchQuery }: ManageBooksScreenProps) {
  /* ==========================
     STATE DANH SÁCH TRUYỆN
  ========================== */
  const [books, setBooks] = useState<BookType[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<BookType[]>([]);
  const [selectedBook, setSelectedBook] = useState<BookType | null>(null);

  /* ==========================
     STATE LOADING
  ========================== */
  const [initialLoading, setInitialLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);

  /* ==========================
     STATE SIDEBAR & FORM TRUYỆN
  ========================== */
  const [activeTab, setActiveTab] = useState('details');
  const [editTitle, setEditTitle] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [newCover, setNewCover] = useState<{ uri: string; name?: string } | null>(null);

  /* ==========================
     STATE CHƯƠNG & FORM SỬA CHƯƠNG
  ========================== */
  const [chapters, setChapters] = useState<ChapterType[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editChapterTitle, setEditChapterTitle] = useState('');
  const [editChapterFileUri, setEditChapterFileUri] = useState<string | null>(null);
  const [editChapterFileName, setEditChapterFileName] = useState<string | null>(null);
  const [chapterActionLoading, setChapterActionLoading] = useState(false);

  /* ==========================
     TIỆN ÍCH
  ========================== */
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const getValidToken = async (): Promise<string | null> => {
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;
      if (!token) {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          token = localToken.startsWith('{')
            ? JSON.parse(localToken)?.access_token || JSON.parse(localToken)?.token
            : localToken;
        }
      }
      return token || null;
    } catch {
      return null;
    }
  };

  /* ==========================
     GỌI DỮ LIỆU
  ========================== */
  const loadMyBooks = async () => {
    try {
      const token = await getValidToken();
      const response = await fetch('http://localhost:3000/api/books/my-books', {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = await response.json();
      if (!result.success) return;

      const booksWithChapterCount = await Promise.all(
        (result.data || []).map(async (book: any) => {
          const { count } = await supabase
            .from('chapters')
            .select('*', { count: 'exact', head: true })
            .eq('book_id', book.id);
          return { ...book, chapter_count: count || 0 };
        })
      );

      setBooks(booksWithChapterCount);
      setFilteredBooks(booksWithChapterCount);
    } catch (error) {
      console.error('LOAD BOOKS ERROR', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadChaptersOfBook = async (bookId: string) => {
    setLoadingChapters(true);
    try {
      const { data, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('chapter_number', { ascending: true });

      if (error) throw error;
      
      // Map data DB trả về (chapter_title) map vào trường title của state Frontend
      const formattedChapters = (data || []).map(ch => ({
        ...ch,
        title: ch.chapter_title 
      }));
      setChapters(formattedChapters);
    } catch (err: any) {
      showAlert('Lỗi', err.message);
    } finally {
      setLoadingChapters(false);
    }
  };

  /* ==========================
     XỬ LÝ CẤP ĐỘ TRUYỆN (SÁCH)
  ========================== */
  const pickNewCoverImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setNewCover({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || `cover_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể mở thư viện ảnh');
    }
  };

  const handleUpdateBookProcess = async () => {
    if (!selectedBook) return;
    if (!editTitle.trim()) return showAlert('Nhắc nhở', 'Tên truyện không được để trống!');

    setActionLoading(true);
    try {
      const token = await getValidToken();
      let finalCoverUrl = selectedBook.cover_url || '';

      if (newCover) {
        const imgRes = await fetch(newCover.uri);
        const imgBlob = await imgRes.blob();
        const fileExt = newCover.name?.split('.').pop() || 'jpg';
        const cleanImgName = `${Date.now()}_update_cover.${fileExt}`;

        const { error: imgError } = await supabase.storage
          .from('img')
          .upload(cleanImgName, imgBlob, { contentType: `image/${fileExt}`, upsert: true });

        if (imgError) throw imgError;
        finalCoverUrl = supabase.storage.from('img').getPublicUrl(cleanImgName).data.publicUrl;
      }

      const updateResponse = await fetch(
        `http://localhost:3000/api/books/update-book/${selectedBook.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: editTitle.trim(),
            genre: editGenre.trim(),
            description: editDescription.trim(),
            cover_url: finalCoverUrl,
          }),
        }
      );

      const result = await updateResponse.json();
      if (!result.success) throw new Error(result.message || 'Cập nhật bị Backend từ chối.');

      showAlert('Thành công', 'Đã lưu thông tin chung của truyện!');
      setNewCover(null);
      await loadMyBooks();
    } catch (err: any) {
      showAlert('Thất bại', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  /* ==========================
     XỬ LÝ CẤP ĐỘ CHƯƠNG (CHAPTER)
  ========================== */
  const pickChapterDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditChapterFileUri(result.assets[0].uri);
        setEditChapterFileName(result.assets[0].name);
      }
    } catch (error) {
      showAlert('Lỗi', 'Không thể chọn file PDF');
    }
  };

  const handleUpdateChapter = async (chapter: ChapterType) => {
    if (!editChapterTitle.trim()) return showAlert('Nhắc nhở', 'Tên chương không được bỏ trống!');
    
    setChapterActionLoading(true);
    try {
      const token = await getValidToken();
      let finalFileUrl = chapter.file_url || '';

      // Nếu tác giả chọn PDF mới thì upload, không thì dùng lại URL cũ
      if (editChapterFileUri) {
              // Mẹo nhỏ để chống lỗi file rỗng khi test trên nền tảng Web
              const fileRes = await fetch(editChapterFileUri);
              const fileBlob = await fileRes.blob();
              
              // Đặt tên an toàn, không chứa ký tự lạ
              const cleanFileName = `chapter_${Date.now()}.pdf`;

              const { error: stError } = await supabase.storage
                .from('books')
                .upload(cleanFileName, fileBlob, { 
                  contentType: 'application/pdf', 
                  upsert: true 
                });

              if (stError) throw stError;
              finalFileUrl = supabase.storage.from('books').getPublicUrl(cleanFileName).data.publicUrl;
            }

      // Theo đúng chuẩn API backend của bạn
      const response = await fetch(`http://localhost:3000/api/books/update-chapter/${chapter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          chapter_number: chapter.chapter_number,
          chapter_title: editChapterTitle.trim(),
          file_url: finalFileUrl,
          isPremiumRequired: false // Truyền đúng chuẩn backend cần
        }),
      });

      const resJson = await response.json();
      if (!resJson.success) throw new Error(resJson.message);

      showAlert('Thành công', `Đã cập nhật dữ liệu cho Chương ${chapter.chapter_number}!`);
      
      // Tắt chế độ edit và tải lại list chương
      setEditingChapterId(null);
      await loadChaptersOfBook(selectedBook!.id);
      
    } catch (err: any) {
      showAlert('Thất bại', err.message);
    } finally {
      setChapterActionLoading(false);
    }
  };

  const openBook = async (book: BookType) => {
    setSelectedBook(book);
    setEditTitle(book.title || '');
    setEditGenre(book.genre || '');
    setEditDescription(book.description || '');
    setNewCover(null);
    setActiveTab('details');
    setEditingChapterId(null); // Tắt form sửa chương nếu đang mở
    await loadChaptersOfBook(book.id);
  };

  useEffect(() => {
    const q = searchQuery?.trim().toLowerCase() || '';
    if (!q) {
      setFilteredBooks(books);
      return;
    }
    setFilteredBooks(
      books.filter(
        (book) => book.title?.toLowerCase().includes(q) || book.genre?.toLowerCase().includes(q)
      )
    );
  }, [searchQuery, books]);

  useEffect(() => {
    loadMyBooks();
  }, []);

  const totalChapters = chapters.length;
  const totalWords = chapters.reduce((sum, chapter) => sum + (chapter.word_count || 0), 0);

  if (initialLoading) return <GlowLoading />;

  return (
    <View style={styles.screenContainer}>
      
      {/* ==========================
          LEFT PANEL (Danh sách Truyện)
      ========================== */}
      <View style={[styles.leftPanel, { flex: selectedBook ? 1.1 : 2 }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.pageTitle}>LITERARY ARCHIVE</Text>
            <Text style={styles.pageSubtitle}>Quản lý và đồng bộ tác phẩm của bạn</Text>
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Filter size={16} color="#4A321F" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.booksContainer}>
          <View style={selectedBook ? styles.listLayout : styles.gridLayout}>
            {filteredBooks.map((book) => {
              const isEven = parseInt(book.id || '0') % 2 === 0;
              const statusText = isEven ? 'PUBLISHED' : 'IN PROGRESS';
              const statusBg = isEven ? '#1B6E3E' : '#D4AF37';

              return (
                <TouchableOpacity
                  key={book.id}
                  onPress={() => openBook(book)}
                  style={[styles.gridCard, selectedBook?.id === book.id && styles.activeCard]}
                >
                  <View style={styles.gridCover}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                      <Text style={styles.statusBadgeText}>{statusText}</Text>
                    </View>

                    {book.cover_url ? (
                      <Image source={{ uri: book.cover_url }} style={styles.coverImage} />
                    ) : (
                      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <Book size={40} color="#BAADA0" />
                      </View>
                    )}
                    <View style={styles.chapterBadge}>
                      <Text style={styles.chapterBadgeText}>{book.chapter_count || 0} CHƯƠNG</Text>
                    </View>
                  </View>

                  <View style={styles.bookInfo}>
                    <Text style={styles.genreText}>{(book.genre || 'LITERARY').toUpperCase()}</Text>
                    <Text numberOfLines={1} style={styles.bookTitle}>{book.title}</Text>
                    <View style={styles.metaRow}>
                      {/* CỤM HIỂN THỊ VIEWS BỔ SUNG THÊM */}
                      <View style={styles.metaItem}>
                        <BarChart3 size={14} color="#8A7663" />
                        <View style={{ marginLeft: 6 }}>
                          <Text style={styles.metaValue}>
                            {book.total_views !== undefined ? book.total_views : 0} 
                          </Text>
                          <Text style={styles.metaLabel}>Lượt xem</Text>
                        </View>
                      </View>

                      {/* CỤM NGÀY XUẤT BẢN MẶC ĐỊNH */}
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.metaValue}>
                          {book.created_at ? new Date(book.created_at).toLocaleDateString('vi-VN') : '-'}
                        </Text>
                        <Text style={styles.metaLabel}>Published</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* ==========================
          RIGHT SIDEBAR
      ========================== */}
      {selectedBook && (
        <Surface elevation={2} style={styles.sidebar}>
          {/* HERO */}
          <View style={styles.heroSection}>
            <Image
              source={{ uri: newCover?.uri || selectedBook.cover_url }}
              blurRadius={18}
              style={styles.heroBackground}
            />
            <View style={styles.heroOverlay} />
            <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.closeButton}>
              <X size={16} color="#FFF" />
            </TouchableOpacity>

            <View style={styles.heroContent}>
              <Image
                source={{ uri: newCover?.uri || selectedBook.cover_url }}
                style={styles.heroCover}
              />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {editTitle || selectedBook.title}
                </Text>
                <Chip compact style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                  {editGenre || 'Novel'}
                </Chip>
              </View>
            </View>

            <View style={styles.heroActions}>
              <TouchableOpacity
                onPress={handleUpdateBookProcess}
                disabled={actionLoading}
                style={[styles.heroActionButton, { backgroundColor: '#4A321F' }]}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Save size={12} color="#FFF" />
                    <Text style={[styles.heroActionText, { color: '#FFF' }]}>LƯU THÔNG TIN SÁCH</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* TAB BAR */}
          <View style={styles.tabBar}>
            {['details', 'chapters', 'cover', 'statistics'].map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabItem, activeTab === tab && styles.activeTab]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* TAB CONTENT */}
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            
            {/* 1. DETAILS TAB (Không còn upload PDF ở đây) */}
            {activeTab === 'details' && (
              <View>
                <Text style={styles.inputLabel}>TÊN TÁC PHẨM TRUYỆN</Text>
                <TextInput value={editTitle} onChangeText={setEditTitle} style={styles.inputBox} />

                <Text style={[styles.inputLabel, { marginTop: 18 }]}>THỂ LOẠI</Text>
                <TextInput value={editGenre} onChangeText={setEditGenre} style={styles.inputBox} />

                <Text style={[styles.inputLabel, { marginTop: 18 }]}>MÔ TẢ NGẮN (TÓM TẮT)</Text>
                <TextInput
                  multiline
                  value={editDescription}
                  onChangeText={setEditDescription}
                  style={styles.textArea}
                />
              </View>
            )}

            {/* 2. CHAPTERS TAB (Form Edit nội tuyến cho từng chương) */}
            {activeTab === 'chapters' && (
              <View>
                {loadingChapters ? (
                  <ActivityIndicator color="#4A321F" style={{ marginTop: 20 }} />
                ) : chapters.length === 0 ? (
                  <Text style={{ textAlign: 'center', color: '#8A7663', marginTop: 20 }}>
                    Truyện này chưa có chương nào.
                  </Text>
                ) : (
                  <>
                    {chapters.map((chapter) => (
                      <View key={chapter.id} style={styles.chapterCard}>
                        {editingChapterId === chapter.id ? (
                          /* === GIAO DIỆN CHỈNH SỬA CHƯƠNG === */
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.inputLabel, { marginBottom: 6 }]}>
                              ĐỔI TÊN CHƯƠNG {chapter.chapter_number}
                            </Text>
                            <TextInput
                              value={editChapterTitle}
                              onChangeText={setEditChapterTitle}
                              style={[styles.inputBox, { height: 40, marginBottom: 12 }]}
                              placeholder="Tên chương mới..."
                            />
                            
                            <Text style={[styles.inputLabel, { marginBottom: 6 }]}>CẬP NHẬT FILE PDF</Text>
                            <TouchableOpacity onPress={pickChapterDocument} style={styles.uploadMiniBox}>
                              <FileText size={16} color="#614124" />
                              <Text style={{ fontSize: 12, color: '#4A321F', fontWeight: '600', marginLeft: 8 }}>
                                {editChapterFileName ? ` ${editChapterFileName}` : ' Bấm để tải lên PDF mới'}
                              </Text>
                            </TouchableOpacity>

                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 10 }}>
                              <TouchableOpacity
                                onPress={() => setEditingChapterId(null)}
                                disabled={chapterActionLoading}
                                style={{ padding: 10 }}
                              >
                                <Text style={{ color: '#8A7663', fontWeight: 'bold', fontSize: 12 }}>HỦY BỎ</Text>
                              </TouchableOpacity>
                              
                              <TouchableOpacity
                                onPress={() => handleUpdateChapter(chapter)}
                                disabled={chapterActionLoading}
                                style={styles.saveChapterBtn}
                              >
                                {chapterActionLoading ? (
                                  <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                  <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 12 }}>LƯU CHƯƠNG NÀY</Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          /* === GIAO DIỆN XEM LIST CHƯƠNG BÌNH THƯỜNG === */
                          <>
                            <BookOpen size={18} color="#4A321F" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={styles.chapterTitle}>
                                Chương {chapter.chapter_number} -{' '}
                                <Text style={{ fontWeight: '400', color: '#6A5643' }}>{chapter.title}</Text>
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={styles.editChapterBtn}
                              onPress={() => {
                                setEditingChapterId(chapter.id);
                                setEditChapterTitle(chapter.title);
                                setEditChapterFileUri(null);
                                setEditChapterFileName(null);
                              }}
                            >
                              <Edit2 size={14} color="#8A7663" />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* 3. COVER TAB */}
            {activeTab === 'cover' && (
              <View>
                <Text style={styles.sectionTitle}>Cover Management</Text>

                <View style={styles.coverPreviewCard}>
                  <Image
                    source={{
                      uri: newCover?.uri || selectedBook.cover_url || 'https://via.placeholder.com/340x480?text=No+Cover',
                    }}
                    style={styles.coverPreviewImage}
                  />
                </View>

                <TouchableOpacity onPress={pickNewCoverImage} style={styles.uploadDashedBox}>
                  <ImageIcon size={24} color="#614124" style={{ marginBottom: 8 }} />
                  <Text style={styles.uploadDashedText}>
                    {newCover ? `🖼️ Đã chọn bìa mới` : 'THAY ĐỔI ẢNH BÌA TRUYỆN MỚI'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 4. STATISTICS TAB */}
            {activeTab === 'statistics' && (
              <View>
                <Text style={styles.sectionTitle}>Story Statistics</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{totalChapters}</Text>
                    <Text style={styles.statLabel}>Chapters</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{totalWords.toLocaleString()}</Text>
                    <Text style={styles.statLabel}>Words</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{selectedBook.total_views || 0}</Text>
                    <Text style={styles.statLabel}>Views</Text>
                  </View>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{selectedBook.total_follows || 0}</Text>
                    <Text style={styles.statLabel}>Followers</Text>
                  </View>
                </View>

                <View style={styles.statisticsBanner}>
                  <BarChart3 size={40} color="#4A321F" />
                  <Text style={styles.statisticsText}>
                    Detailed analytics and revenue reports can be integrated here later.
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </Surface>
      )}
    </View>
  );
}

/* ==========================================
   STYLES
========================================== */
const styles = StyleSheet.create({
  screenContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FAF6F0' },
  leftPanel: { paddingHorizontal: 30, paddingVertical: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#4A321F', fontFamily: 'serif' },
  pageSubtitle: { marginTop: 4, color: '#8A7663', fontStyle: 'italic' },
  filterButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EBE3D5', justifyContent: 'center', alignItems: 'center' },
  booksContainer: { paddingBottom: 60 },
  gridLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 28, justifyContent: 'flex-start', alignItems: 'flex-start' },
  listLayout: { gap: 16 },
  gridCard: {
    width: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFDF9',
    borderWidth: 1,
    borderColor: '#E6DCD0',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 4 },
      web: { boxShadow: '0 6px 16px rgba(0,0,0,0.08)' } as any,
    }),
  },
  activeCard: { borderWidth: 2, borderColor: '#4A321F', transform: [{ scale: 1.02 }] },
  gridCover: { height: 230, position: 'relative', backgroundColor: '#2A1E17' },
  coverImage: { width: '100%', height: '100%' },
  statusBadge: { position: 'absolute', top: 12, left: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, zIndex: 2 },
  statusBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  chapterBadge: { position: 'absolute', top: 12, right: 12, backgroundColor: '#D7C88A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 2 },
  chapterBadgeText: { color: '#FFFFFF', fontWeight: '800', fontSize: 10 },
  bookInfo: { padding: 18 },
  genreText: { fontSize: 10, fontWeight: '800', color: '#A39281' },
  bookTitle: { marginTop: 6, fontSize: 16, fontWeight: '700', color: '#4A321F', fontFamily: 'serif' },
  metaRow: { marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: '#FAF6F0', paddingTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaValue: { color: '#4A321F', fontSize: 14, fontWeight: '700' },
  metaLabel: { color: '#8A7663', fontSize: 11, marginTop: 2 },
  sidebar: { flex: 1.25, backgroundColor: '#FAF6F0', borderLeftWidth: 1, borderColor: '#E6DCD0' },
  heroSection: { height: 240, justifyContent: 'flex-end', padding: 24, overflow: 'hidden' },
  heroBackground: { ...StyleSheet.absoluteFillObject },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  closeButton: { position: 'absolute', left: 16, top: 16, zIndex: 10, padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20 },
  heroContent: { flexDirection: 'row', alignItems: 'flex-end', zIndex: 5 },
  heroCover: { width: 100, height: 140, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', fontFamily: 'serif' },
  heroActions: { position: 'absolute', top: 16, right: 16, zIndex: 10 },
  heroActionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  heroActionText: { fontWeight: 'bold', fontSize: 12 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#E6DCD0', backgroundColor: '#FFFDF9', paddingHorizontal: 16 },
  tabItem: { paddingVertical: 14, marginRight: 20, borderBottomWidth: 2, borderColor: 'transparent' },
  activeTab: { borderColor: '#4A321F' },
  tabText: { fontSize: 11, fontWeight: '700', color: '#8A7663' },
  activeTabText: { color: '#4A321F' },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#8A7663', marginBottom: 8 },
  inputBox: { height: 46, borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 10, backgroundColor: '#FFF', paddingHorizontal: 16, fontSize: 15 },
  textArea: { minHeight: 140, borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 10, backgroundColor: '#FFF', padding: 16, textAlignVertical: 'top', fontSize: 15 },
  uploadDashedBox: { borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#A39281', padding: 24, borderRadius: 12, alignItems: 'center', backgroundColor: '#EBE3D5' },
  uploadDashedText: { fontSize: 13, fontWeight: 'bold', color: '#4A321F' },
  chapterCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, borderRadius: 12, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD0' },
  chapterTitle: { fontWeight: '700', color: '#4A321F', fontSize: 15 },
  editChapterBtn: { padding: 10, backgroundColor: '#FAF6F0', borderRadius: 8, borderWidth: 1, borderColor: '#E6DCD0' },
  saveChapterBtn: { backgroundColor: '#4A321F', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  uploadMiniBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EBE3D5', padding: 12, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: '#A39281' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#4A321F', marginBottom: 18, fontFamily: 'serif' },
  coverPreviewCard: { borderRadius: 16, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E6DCD0', alignItems: 'center', backgroundColor: '#FFF', padding: 10 },
  coverPreviewImage: { width: 200, height: 280, borderRadius: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  statCard: { width: '47%', backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 14, padding: 20 },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#4A321F' },
  statLabel: { marginTop: 6, color: '#8A7663', fontWeight: '600' },
  statisticsBanner: { marginTop: 24, padding: 24, borderRadius: 16, backgroundColor: '#EBE3D5', alignItems: 'center' },
  statisticsText: { marginTop: 12, textAlign: 'center', color: '#4A321F', fontWeight: '500' },
});