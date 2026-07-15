import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Card, Portal, Provider, Modal, Switch, Surface, IconButton } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';


export default function AuthorChapterManagement() {
  const router = useRouter();
  const { bookId, bookTitle } = useLocalSearchParams(); // Nhận tham số truyền sang từ màn hình kho truyện


  // States quản lý dữ liệu danh sách chương và gói cước hệ thống
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);


  // States quản lý Modal Form (Thêm / Sửa chương)
  const [modalVisible, setModalVisible] = useState(false);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
 
  // Các ô nhập liệu của Form
  const [chapNum, setChapNum] = useState('');
  const [chapTitle, setChapTitle] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [isPremiumRequired, setIsPremiumRequired] = useState(false); // 🔥 Nút gạt khóa gói Premium


  // 1. Tải danh sách tập truyện hiện tại của bộ truyện này từ Backend
  const loadChapters = async () => {
    if (!bookId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/books/public-detail/${bookId}`);
      const resJson = await res.json();
      if (resJson.success && resJson.data) {
        setChapters(resJson.data.chapters || []);
      }
    } catch (err) {
      console.error(">>> [LOAD CHAPTERS ERROR]:", err);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadChapters();
  }, [bookId]);


  // 2. Kích hoạt mở Modal chế độ ĐĂNG CHƯƠNG MỚI
  const handleOpenAddModal = () => {
    setEditingChapterId(null);
    setChapNum(String(chapters.length + 1)); // Tự động gợi ý số tập tiếp theo dựa trên RAM
    setChapTitle('');
    setPdfUrl('');
    setIsPremiumRequired(false);
    setModalVisible(true);
  };


  // 3. Kích hoạt mở Modal chế độ CHỈNH SỬA chương cũ
  const handleOpenEditModal = (chapter: any) => {
    setEditingChapterId(chapter.id);
    setChapNum(String(chapter.chapter_number));
    setChapTitle(chapter.chapter_title);
    setPdfUrl(chapter.file_url);
    // Nếu package_requirement khác null tức là tập này đang được đặt Premium
    setIsPremiumRequired(chapter.package_requirement !== null);
    setModalVisible(true);
  };


  // 4. Bắn dữ liệu về API Backend để lưu lại (Hỗ trợ cả luồng POST tạo và PUT sửa)
  const handleSaveChapter = async () => {
    if (!chapNum || !chapTitle || !pdfUrl) {
      if (Platform.OS === 'web') window.alert("Chủ Tịch vui lòng điền đầy đủ số chương, tiêu đề và link file PDF truyện!");
      return;
    }


    setSubmitting(true);
    try {
      // Nhận diện đường dẫn dựa vào trạng thái Tạo hay Sửa
      const url = editingChapterId
        ? `http://localhost:3000/api/books/update-chapter/${editingChapterId}`
        : 'http://localhost:3000/api/books/add-chapter';
       
      const method = editingChapterId ? 'PUT' : 'POST';


      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          chapter_number: parseInt(chapNum),
          chapter_title: chapTitle.trim(),
          file_url: pdfUrl.trim(),
          isPremiumRequired: isPremiumRequired // 🔥 Bắn trạng thái công tắc lên Backend xử lý găm ID gói cước
        })
      });


      const resJson = await res.json();
      if (resJson.success) {
        if (Platform.OS === 'web') {
          window.alert(editingChapterId ? "🎉 Đã cập nhật thay đổi tập truyện thành công!" : "🎉 Đã đăng tải tập truyện mới lên kệ thành công!");
        }
        setModalVisible(false);
        loadChapters(); // Quét lại danh sách tươi mới từ Database
      } else {
        if (Platform.OS === 'web') window.alert("Thao tác thất bại: " + resJson.message);
      }
    } catch (err) {
      console.error(">>> [SAVE CHAPTER ERROR]:", err);
    } finally {
      setSubmitting(false);
    }
  };


  if (loading && chapters.length === 0) {
    return (
      <View style={styles.center}><ActivityIndicator size="large" color="#000" /></View>
    );
  }


  return (
    <Provider>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Banner điều khiển phía trên */}
        <Surface style={styles.banner} elevation={1}>
          <IconButton icon="arrow-left" size={24} iconColor="#000" onPress={() => router.back()} style={{ margin: 0 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.bannerSub} numberOfLines={1}>TÁC PHẨM: {String(bookTitle).toUpperCase()}</Text>
            <Text style={styles.bannerTitle}>QUẢN LÝ CÁC TẬP PHÁT HÀNH ({chapters.length})</Text>
          </View>
          <Button mode="contained" icon="plus" buttonColor="#000" textColor="#FFF" style={{ borderRadius: 6 }} onPress={handleOpenAddModal}>
            ĐĂNG CHƯƠNG MỚI
          </Button>
        </Surface>


        {/* Danh sách thẻ chương */}
        <View style={styles.listContainer}>
          {chapters.map((chap) => (
            <Card key={chap.id} style={styles.card} mode="outlined">
              <Card.Content style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleLine}>
                    <Text style={styles.chapNumberText}>TẬP {chap.chapter_number}:</Text>
                    <Text style={styles.chapTitleText} numberOfLines={1}>{chap.chapter_title}</Text>
                   
                    {/* Hiển thị nhãn VIP / FREE trực quan đồng bộ */}
                    {chap.package_requirement ? (
                      <View style={styles.vipTag}><Text style={styles.vipTagText}>💎 PREMIUM</Text></View>
                    ) : (
                      <View style={styles.freeTag}><Text style={styles.freeTagText}>🆓 FREE</Text></View>
                    )}
                  </View>
                  <Text style={styles.fileUrlText} numberOfLines={1}>🔗 {chap.file_url}</Text>
                </View>
               
                <Button mode="outlined" compact textColor="#000" style={styles.btnEdit} onPress={() => handleOpenEditModal(chap)}>
                  CHỈNH SỬA
                </Button>
              </Card.Content>
            </Card>
          ))}


          {chapters.length === 0 && (
            <Text style={styles.emptyText}>Truyện chưa được đăng tải tập nào. Hãy bấm nút phía trên để khai bút tập đầu tiên!</Text>
          )}
        </View>
      </ScrollView>


      {/* 📦 FORM POPUP TẠO/SỬA CHƯƠNG TRUYỆN ĐÃ ĐƯỢC CHUẨN HÓA CSS */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => !submitting && setModalVisible(false)} contentContainerStyle={styles.modalContent as any}>
          <Text style={styles.modalHeaderTitle}>
            {editingChapterId ? '🔧 HIỆU CHỈNH THÔNG TIN TẬP TRUYỆN' : '📝 PHÁT HÀNH TẬP TRUYỆN MỚI'}
          </Text>


          <TextInput
            label="Số thứ tự tập (Chương số)"
            value={chapNum}
            onChangeText={setChapNum}
            keyboardType="numeric"
            mode="outlined"
            activeOutlineColor="#000"
            outlineColor="#DDD"
            style={styles.input}
            disabled={submitting}
          />


          <TextInput
            label="Tiêu đề chương/tập đọc"
            placeholder="Ví dụ: Cuộc gặp gỡ định mệnh..."
            value={chapTitle}
            onChangeText={setChapTitle}
            mode="outlined"
            activeOutlineColor="#000"
            outlineColor="#DDD"
            style={styles.input}
            disabled={submitting}
          />


          <TextInput
            label="Đường dẫn lưu trữ file PDF truyện"
            placeholder="Dán link PDF từ Supabase Storage..."
            value={pdfUrl}
            onChangeText={setPdfUrl}
            mode="outlined"
            activeOutlineColor="#000"
            outlineColor="#DDD"
            style={styles.input}
            disabled={submitting}
          />


          {/* 👑 CÔNG TẮC GẠT PREMIUM VÀNG HOÀNG GIA CHUẨN KIẾN TRÚC */}
          <View style={styles.premiumToggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.premiumLabel}>👑 KHÓA TRUYỆN BẰNG GÓI PREMIUM</Text>
              <Text style={styles.premiumSub}>
                Bật công tắc này, độc giả bắt buộc phải mua Gói Hội Viên của Nhóm 44 mới có quyền xem tệp PDF chương này.
              </Text>
            </View>
            <Switch
              value={isPremiumRequired}
              onValueChange={(value) => setIsPremiumRequired(value)}
              color="#D4AF37"
              disabled={submitting}
            />
          </View>


          <View style={styles.modalButtons}>
            <Button mode="text" textColor="#666" onPress={() => setModalVisible(false)} disabled={submitting}>
              QUAY LẠI
            </Button>
            <Button mode="contained" buttonColor="#000" textColor="#FFF" style={{ marginLeft: 10, borderRadius: 6 }} loading={submitting} disabled={submitting} onPress={handleSaveChapter}>
              {editingChapterId ? 'CẬP NHẬT NGAY' : 'ĐĂNG LÊN KỆ'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </Provider>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', height: 400 },
 
  banner: {
    backgroundColor: '#FFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderColor: '#EAEAEA'
  },
  bannerTitle: { fontSize: 15, fontWeight: 'bold', color: '#000', marginTop: 2 },
  bannerSub: { fontSize: 11, color: '#666', fontWeight: 'bold', letterSpacing: 0.5 },


  listContainer: { padding: 15, gap: 12 },
  card: { backgroundColor: '#FFF', borderColor: '#EAEAEA', borderRadius: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  chapNumberText: { fontWeight: 'bold', fontSize: 14, color: '#000' },
  chapTitleText: { fontSize: 14, color: '#333', fontWeight: '500', maxWidth: 160 },
  fileUrlText: { fontSize: 11, color: '#888', marginTop: 5, maxWidth: 300 },
  btnEdit: { borderColor: '#000', borderRadius: 6, borderWidth: 1, height: 32, justifyContent: 'center' },


  vipTag: { backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#F3E5AB' },
  vipTagText: { fontSize: 9, color: '#B8860B', fontWeight: 'bold' },
  freeTag: { backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: '#C8E6C9' },
  freeTagText: { fontSize: 9, color: '#2E7D32', fontWeight: 'bold' },


  input: { marginBottom: 12, backgroundColor: '#FFF', fontSize: 13 },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 12,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    elevation: 5
  },
  modalHeaderTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#000', letterSpacing: 0.3 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },


  premiumToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF0',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E5AB',
    marginVertical: 10,
  },
  premiumLabel: { fontWeight: 'bold', fontSize: 12, color: '#8B6508' },
  premiumSub: { fontSize: 10, color: '#666', marginTop: 4, lineHeight: 15 },
 
  emptyText: { textAlign: 'center', marginTop: 40, color: '#999', fontStyle: 'italic', fontSize: 13 }
});
