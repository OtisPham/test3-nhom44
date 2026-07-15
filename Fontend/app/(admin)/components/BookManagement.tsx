import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator, Switch, Button, Divider } from 'react-native-paper';
import { Filter, X, Book as BookIcon, Trash2, RefreshCw, Plus, CheckCircle2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Chapter {
  id: string;
  book_id: string;
  chapter_number: number;
  chapter_title: string;
  file_url: string;
  package_requirement: string | null; 
}

interface Book {
  id: string;
  title: string;
  genre: string;
  file_url: string;
  cover_url: string;
  email: string;
}

const API_BASE_URL = 'http://localhost:3000/api/books'; 

export default function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false); 
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🔑 Khởi tạo State lưu trữ Token quản trị viên toàn cục cho màn hình này
  const [token, setToken] = useState<string | null>(null);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'chapters'>('details');

  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // 📥 TẢI TOKEN VÀ KHO SÁCH KHI MÀN HÌNH KHỞI CHẠY
  useEffect(() => {
    const initializeAdminPanel = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('adminToken');
        if (savedToken) {
          setToken(savedToken);
        } else {
          console.warn("⚠️ Không tìm thấy adminToken trong AsyncStorage!");
        }
      } catch (e) {
        console.error("Lỗi đọc token:", e);
      }
      fetchAllBooks();
    };

    initializeAdminPanel();
  }, []);

  const fetchAllBooks = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/all-books`);
      const result = await response.json();
      
      if (result.success) {
        setBooks(result.data || []);
        setFilteredBooks(result.data || []);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') {
        alert('Không thể tải kho sách từ hệ thống: ' + error.message);
      } else {
        Alert.alert('Lỗi kết nối', 'Không thể tải kho sách từ hệ thống: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      setFilteredBooks(books);
    } else {
      const filtered = books.filter(
        (b) => b.title.toLowerCase().includes(query) || b.email.toLowerCase().includes(query)
      );
      setFilteredBooks(filtered);
    }
  }, [searchQuery, books]);

  const openEditSidebar = async (book: Book) => {
    setSelectedBook(book);
    setTitle(book.title);
    setGenre(book.genre || '');
    setCoverUrl(book.cover_url || '');
    setFileUrl(book.file_url || '');
    setNewChapterTitle('');
    setActiveSubTab('details');
    setChapters([]); 

    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/detail-with-chapters/${book.id}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setChapters(result.data.chapters || []);
      }
    } catch (error: any) {
      console.error("Lỗi lấy danh sách chương từ DB:", error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ➕ THÊM CHƯƠNG MỚI
  const handleAddChapter = async () => {
    if (!newChapterTitle.trim() || !selectedBook) return;

    try {
      setActionLoading(true);
      const nextNumber = chapters.length > 0 ? Math.max(...chapters.map(c => c.chapter_number)) + 1 : 1;

      const response = await fetch(`${API_BASE_URL}/admin-add-chapter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          book_id: selectedBook.id,
          chapter_number: nextNumber,
          chapter_title: newChapterTitle.trim(),
          file_url: selectedBook.file_url, 
          isPremiumRequired: false 
        })
      });

      const result = await response.json();
      if (result.success) {
        setChapters([...chapters, result.data]);
        setNewChapterTitle('');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') alert('Không thể thêm chương mới: ' + error.message);
      else Alert.alert('Lỗi quyền hạn', 'Không thể thêm chương mới: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ❌ CHỨC NĂNG XÓA CHƯƠNG ĐÃ ĐƯỢC FIX LỖI BLOCK TRÊN WEB
  const handleDeleteChapter = (chapterId: string) => {
  // 🛠️ BỔ SUNG: Kiểm tra chặn lỗi undefined ngay lập tức
  if (!chapterId || chapterId === 'undefined') {
    Alert.alert('Lỗi dữ liệu', 'ID chương này đang bị trống (undefined) trên hệ thống. Vui lòng tải lại trang!');
    return;
  }

  const executeDeleteChapter = async () => {
    try {
      setActionLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin-delete-chapter/${chapterId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        }
      });
      const result = await response.json();
      if (result.success) {
        setChapters(prev => prev.filter(c => c.id !== chapterId));
        if (Platform.OS === 'web') alert('Đã xóa chương thành công!');
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') alert('Lỗi thực thi lệnh xóa chương: ' + error.message);
      else Alert.alert('Thất bại', 'Lỗi thực thi lệnh xóa chương: ' + error.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (Platform.OS === 'web') {
    const confirmWeb = window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn chương này khỏi Database?');
    if (confirmWeb) executeDeleteChapter();
  } else {
    Alert.alert('Xác nhận hệ thống', 'Bạn có chắc chắn muốn xóa vĩnh viễn chương này khỏi Database?', [
      { text: 'Hủy bỏ', style: 'cancel' },
      { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: executeDeleteChapter }
    ]);
  }
};

  // 🔄 CẬP NHẬT TRẠNG THÁI TRẢ PHÍ
  const togglePremiumChapter = async (chap: Chapter, isPremiumValue: boolean) => {
    try {
      setChapters(prev => prev.map(c => c.id === chap.id ? { 
        ...c, 
        package_requirement: isPremiumValue ? 'ACTIVE_PREMIUM_ID' : null 
      } : c));

      const response = await fetch(`${API_BASE_URL}/admin-update-chapter/${chap.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          chapter_number: chap.chapter_number,
          chapter_title: chap.chapter_title,
          file_url: chap.file_url,
          isPremiumRequired: isPremiumValue 
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.message);
    } catch (error: any) {
      if (Platform.OS === 'web') alert('Không thể thay đổi trạng thái trả phí: ' + error.message);
      else Alert.alert('Lỗi đồng bộ', 'Không thể thay đổi trạng thái trả phí: ' + error.message);
      if (selectedBook) openEditSidebar(selectedBook);
    }
  };

  // 💾 LƯU THAY ĐỔI TRUYỆN 
  const handleUpdateBook = async () => {
    if (!title.trim() || !selectedBook) {
      Alert.alert('Cảnh báo', 'Tên tác phẩm không được để trống!');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/admin-update-book/${selectedBook.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          title,  
          genre,
          cover_url: coverUrl,
          file_url: fileUrl
        }),
      });

      const result = await response.json();
      if (result.success) {
        if (Platform.OS === 'web') alert('Đã đồng bộ thông tin chỉnh sửa sách lên hệ thống.');
        else Alert.alert('Thành công', 'Đã đồng bộ thông tin chỉnh sửa sách lên hệ thống.');
        setSelectedBook(null);
        fetchAllBooks(); 
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      if (Platform.OS === 'web') alert(error.message);
      else Alert.alert('Thất bại', error.message);
    } finally {
      setLoading(false);
    }
  };

  // ❌ CHỨC NĂNG XÓA SÁCH ĐÃ ĐƯỢC FIX LỖI BLOCK TRÊN WEB
  const handleDeleteBook = (id: string) => {
    const executeDeleteBook = async () => {
      try {
        console.log("📡 Đang gửi lệnh DELETE tới DB cho cuốn sách:", id);
        const response = await fetch(`${API_BASE_URL}/admin-delete-book/${id}`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          }
        });
        
        const result = await response.json();
        if (result.success) {
          if (Platform.OS === 'web') alert(result.message);
          else Alert.alert('Đã gỡ bỏ', result.message);
          setSelectedBook(null);
          fetchAllBooks();
        } else {
          throw new Error(result.message);
        }
      } catch (error: any) {
        if (Platform.OS === 'web') alert('Không thể thực hiện lệnh xóa: ' + error.message);
        else Alert.alert('Lỗi', 'Không thể thực hiện lệnh xóa: ' + error.message);
      }
    };

    // Khắc phục việc block UI trên môi trường trình duyệt Web
    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm('Bạn có chắc chắn muốn xóa vĩnh viễn tác phẩm này khỏi hệ thống? Hành động này không thể hoàn tác.');
      if (confirmWeb) executeDeleteBook();
    } else {
      Alert.alert(
        '🚨 XÁC NHẬN CỦA ADMIN',
        'Bạn có chắc chắn muốn xóa vĩnh viễn tác phẩm này khỏi hệ thống? Hành động này không thể hoàn tác.',
        [
          { text: 'Hủy bỏ', style: 'cancel' },
          { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: executeDeleteBook }
        ]
      );
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* CỘT TRÁI: GRID/LIST TRUYỆN TỔNG HỢP HỆ THỐNG */}
      <View style={[styles.mainStoriesColumn, { flex: selectedBook ? 1.1 : 2 }]}>
        <View style={styles.headerSectionRow}>
          <View>
            <Text style={styles.mainTitleText}>Kho Sách Tổng Hệ Thống</Text>
            <Text style={styles.subTitleText}>Quyền quản trị viên hệ thống (Tất cả tác giả).</Text>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <TextInput 
              placeholder="Tìm tên tác phẩm hoặc email tác giả..." 
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.mainSearchBar}
            />
            <TouchableOpacity style={styles.filterIconCircleButton} onPress={fetchAllBooks}>
              <RefreshCw size={15} color="#4A321F" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollGridContainer}>
          <View style={selectedBook ? styles.verticalListLayout : styles.matrixGridLayout}>
            {filteredBooks.map((book) => (
              <TouchableOpacity 
                key={book.id} 
                onPress={() => openEditSidebar(book)} 
                style={[
                  selectedBook ? styles.rowBookCardItem : styles.gridBookCardItem, 
                  selectedBook?.id === book.id && styles.activeEditingCardBorder
                ]}
              >
                <View style={selectedBook ? styles.rowCoverWrapper : styles.gridCoverWrapper}>
                  {book.cover_url ? (
                    <Image source={{ uri: book.cover_url }} style={styles.coverImageStyle} />
                  ) : (
                    <BookIcon size={28} color="#BAADA0" />
                  )}
                </View>
                
                <View style={styles.bookShortMetaWrapper}>
                  <Text style={styles.genreTagText}>{(book.genre || 'CHƯA PHÂN LOẠI').toUpperCase()}</Text>
                  <Text style={styles.bookMainTitleText} numberOfLines={1}>{book.title}</Text>
                  <Text style={styles.authorEmailText} numberOfLines={1}>✍️ {book.email}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* CỘT PHẢI: SIDEBAR ĐIỀU KHIỂN CHI TIẾT TÁC PHẨM & CHAPTER DỮ LIỆU ĐỘNG */}
      {selectedBook && (
        <Surface style={styles.rightControlSidebarPanel} elevation={2}>
          <View style={styles.royalTopBannerHeroSection}>
            <Image source={{ uri: coverUrl || selectedBook.cover_url }} style={styles.blurHeroBackgroundMask} blurRadius={20} />
            <View style={styles.blackTintOverlayMask} />
            
            <TouchableOpacity onPress={() => setSelectedBook(null)} style={styles.absoluteCloseTopButton}>
              <X size={16} color="#FAF6F0" />
            </TouchableOpacity>Khúc

            <View style={styles.heroContentBookRowContainer}>
              <Image source={{ uri: coverUrl || selectedBook.cover_url }} style={styles.floatingPanelCoverThumbnail} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.heroBookMainTitleText} numberOfLines={1}>{title || selectedBook.title}</Text>
                <Text style={styles.heroAuthorText} numberOfLines={1}>Tác giả: {selectedBook.email}</Text>
              </View>
            </View>

            <View style={styles.floatingActionButtonGroupStickyRow}>
              <TouchableOpacity onPress={() => handleDeleteBook(selectedBook.id)} style={[styles.blurGlassCircleButton, { backgroundColor: 'rgba(200,50,50,0.4)' }]}>
                <Trash2 size={12} color="#FFF" />
                <Text style={styles.blurGlassBtnText}>Xóa Sách</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.subTabNavigationTabBarLineRow}>
            <TouchableOpacity onPress={() => setActiveSubTab('details')} style={[styles.subTabItemTriggerButton, activeSubTab === 'details' && styles.activeSubTabUnderlineBorderIndicator]}>
              <Text style={[styles.subTabItemLabelText, activeSubTab === 'details' && styles.activeSubTabLabelText]}>THÔNG TIN TỔNG QUAN</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setActiveSubTab('chapters')} style={[styles.subTabItemTriggerButton, activeSubTab === 'chapters' && styles.activeSubTabUnderlineBorderIndicator]}>
              <Text style={[styles.subTabItemLabelText, activeSubTab === 'chapters' && styles.activeSubTabLabelText]}>QUẢN LÝ CHAPTER ({chapters.length})</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.sidebarFieldsScrollContentPaddingBody} showsVerticalScrollIndicator={false}>
            {actionLoading && <ActivityIndicator size="small" color="#4A321F" style={{ marginBottom: 15 }} />}
            
            {activeSubTab === 'details' && (
              <View style={{ gap: 15 }}>
                <View>
                  <Text style={styles.inputFieldHeaderTitleLabelText}>TÊN ĐẦU SÁCH / TÁC PHẨM</Text>
                  <TextInput value={title} onChangeText={setTitle} style={styles.inputBoxStyle} />
                </View>
                <View>
                  <Text style={styles.inputFieldHeaderTitleLabelText}>THỂ LOẠI</Text>
                  <TextInput value={genre} onChangeText={setGenre} style={styles.inputBoxStyle} />
                </View>
                <View>
                  <Text style={styles.inputFieldHeaderTitleLabelText}>ĐƯỜNG DẪN ẢNH BÌA (COVER URL)</Text>
                  <TextInput value={coverUrl} onChangeText={setCoverUrl} style={styles.inputBoxStyle} />
                </View>
                <View>
                  <Text style={styles.inputFieldHeaderTitleLabelText}>ĐƯỜNG DẪN FILE TẬP TIN NỘI DUNG</Text>
                  <TextInput value={fileUrl} onChangeText={setFileUrl} style={styles.inputBoxStyle} />
                </View>
              </View>
            )}

            {activeSubTab === 'chapters' && (
              <View>
                <View style={styles.addChapterMiniRow}>
                  <TextInput 
                    placeholder="Tên chương mới cần thêm vào DB..." 
                    value={newChapterTitle}
                    onChangeText={setNewChapterTitle}
                    style={styles.miniChapterInput}
                    editable={!actionLoading}
                  />
                  <TouchableOpacity style={styles.miniAddBtn} onPress={handleAddChapter} disabled={actionLoading}>
                    <Plus size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputFieldHeaderTitleLabelText, { marginBottom: 10 }]}>DANH SÁCH CHƯƠNG CHI TIẾT DƯỚI DATABASE</Text>
                
                <View style={{ gap: 10 }}>
                  {chapters.map((chap) => (
                    <View key={chap.id} style={styles.adminChapterCardRow}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={styles.chapterTitleMainText} numberOfLines={1}>
                          Chương {chap.chapter_number}: {chap.chapter_title}
                        </Text>
                      </View>

                      <View style={styles.chapterControllerWrapper}>
                        <View style={styles.switchBoxRow}>
                          <Text style={styles.switchStateText}>{chap.package_requirement ? "Trả phí" : "Miễn phí"}</Text>
                          <Switch 
                            value={chap.package_requirement !== null} 
                            onValueChange={(val) => togglePremiumChapter(chap, val)} 
                            color="#4A321F"
                            disabled={actionLoading}
                          />
                        </View>

                        {chap.package_requirement !== null && (
                          <View style={styles.premiumBadgeContainer}>
                            <Text style={styles.premiumBadgeText}>VIP</Text>
                          </View>
                        )}

                        <TouchableOpacity style={styles.miniDeleteChapterBtn} onPress={() => handleDeleteChapter(chap.id)}>
                          <Trash2 size={14} color="#8B0000" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  
                  {chapters.length === 0 && !actionLoading && (
                    <Text style={styles.emptyChapterText}>Truyện này hiện chưa có nội dung chương dưới cơ sở dữ liệu.</Text>
                  )}
                </View>
              </View>
            )}
          </ScrollView>

          <Divider />
          <View style={styles.actionFixedFooter}>
            <Button 
              mode="contained" 
              icon={() => <CheckCircle2 size={16} color="#FFF" />}
              buttonColor="#4A321F" 
              textColor="#FFF"
              onPress={handleUpdateBook}
              style={{ borderRadius: 8 }}
              loading={loading}
              disabled={loading}
            >
              Phê duyệt lưu trữ hệ thống
            </Button>
          </View>
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: { flex: 1, flexDirection: 'row', backgroundColor: '#FAF6F0' },
  centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 300 },
  mainStoriesColumn: { paddingHorizontal: 30, paddingVertical: 24, paddingBottom: 0 },
  headerSectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  mainTitleText: { fontSize: 22, fontWeight: 'bold', color: '#4A321F', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  subTitleText: { fontSize: 13, color: '#8A7663', fontStyle: 'italic' },
  mainSearchBar: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 20, height: 36, paddingHorizontal: 15, width: 260, fontSize: 13 },
  filterIconCircleButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EBE3D5', justifyContent: 'center', alignItems: 'center' },
  scrollGridContainer: { paddingBottom: 40 },
  matrixGridLayout: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  gridBookCardItem: { width: '31%', minWidth: 220, backgroundColor: '#FFFDF9', borderRadius: 16, borderWidth: 1, borderColor: '#E6DCD0', overflow: 'hidden', elevation: 1 },
  gridCoverWrapper: { height: 230, backgroundColor: '#2A1E17', justifyContent: 'center', alignItems: 'center' },
  verticalListLayout: { flexDirection: 'column', gap: 14 },
  rowBookCardItem: { flexDirection: 'row', backgroundColor: '#FFFDF9', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#E6DCD0', alignItems: 'center' },
  rowCoverWrapper: { width: 65, height: 90, backgroundColor: '#2A1E17', borderRadius: 8, marginRight: 16, overflow: 'hidden' },
  activeEditingCardBorder: { borderColor: '#4A321F', borderWidth: 1.5, backgroundColor: '#F4ECE1' },
  coverImageStyle: { width: '100%', height: '100%', resizeMode: 'cover' },
  bookShortMetaWrapper: { flex: 1, padding: 10 },
  genreTagText: { fontSize: 9, fontWeight: '800', color: '#A39281', letterSpacing: 0.5 },
  bookMainTitleText: { fontSize: 15, fontWeight: 'bold', color: '#4A321F', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  authorEmailText: { fontSize: 11, color: '#8A7663', marginTop: 4 },
  rightControlSidebarPanel: { flex: 1.2, backgroundColor: '#FAF6F0', borderLeftWidth: 1, borderColor: '#E6DCD0' },
  royalTopBannerHeroSection: { height: 180, position: 'relative', justifyContent: 'flex-end', padding: 20, overflow: 'hidden' },
  blurHeroBackgroundMask: { ...StyleSheet.absoluteFillObject },
  blackTintOverlayMask: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  absoluteCloseTopButton: { position: 'absolute', top: 16, left: 16, zIndex: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  heroContentBookRowContainer: { flexDirection: 'row', alignItems: 'flex-end', zIndex: 2 },
  floatingPanelCoverThumbnail: { width: 60, height: 85, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  heroBookMainTitleText: { fontSize: 18, fontWeight: 'bold', color: '#FFF', fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
  heroAuthorText: { fontSize: 12, color: '#DDD', marginTop: 4 },
  floatingActionButtonGroupStickyRow: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', gap: 8, zIndex: 10 },
  blurGlassCircleButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  blurGlassBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  subTabNavigationTabBarLineRow: { flexDirection: 'row', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: '#E6DCD0', backgroundColor: '#FFFDF9' },
  subTabItemTriggerButton: { paddingVertical: 14, marginRight: 24, borderBottomWidth: 2, borderColor: 'transparent' },
  activeSubTabUnderlineBorderIndicator: { borderColor: '#4A321F' },
  subTabItemLabelText: { fontSize: 11, fontWeight: 'bold', color: '#8A7663', letterSpacing: 0.5 },
  activeSubTabLabelText: { color: '#4A321F' },
  sidebarFieldsScrollContentPaddingBody: { padding: 20, paddingBottom: 40 },
  inputFieldHeaderTitleLabelText: { fontSize: 10, fontWeight: '800', color: '#BAADA0', marginBottom: 6, letterSpacing: 0.3 },
  inputBoxStyle: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 8, height: 40, paddingHorizontal: 12, color: '#4A321F', fontSize: 13 },
  addChapterMiniRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  miniChapterInput: { flex: 1, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 6, height: 36, paddingHorizontal: 12, fontSize: 13 },
  miniAddBtn: { backgroundColor: '#8A7663', width: 36, height: 36, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  adminChapterCardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 8, padding: 10 },
  chapterTitleMainText: { fontSize: 13, fontWeight: '600', color: '#4A321F' },
  chapterControllerWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchBoxRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  switchStateText: { fontSize: 11, color: '#8A7663', fontWeight: '500' },
  premiumBadgeContainer: { backgroundColor: '#DEB887', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  premiumBadgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },
  miniDeleteChapterBtn: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  emptyChapterText: { textAlign: 'center', color: '#8A7663', fontStyle: 'italic', marginTop: 20, fontSize: 13 },
  emptyText: { textAlign: 'center', marginTop: 40, color: '#8B7355', fontSize: 14, width: '100%' },
  actionFixedFooter: { padding: 15, backgroundColor: '#FFFDF9' }
});