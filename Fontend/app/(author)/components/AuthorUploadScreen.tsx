// 📂 File: Fontend/app/(author)/components/AuthorUploadScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ScrollView, Image, Alert } from 'react-native'; // ✅ Đã gọi trực tiếp 'Alert' từ lõi gốc để diệt tận gốc lỗi require()
import { Text, Button, TextInput, Card, Surface, SegmentedButtons, Switch } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';


export default function AuthorUploadScreen() {
  const [currentTab, setCurrentTab] = useState('new_book'); // 'new_book' hoặc 'new_chapter'
  const [myBooksList, setMyBooksList] = useState<any[]>([]);


  // States dành cho Tab 1: Tạo Bộ Truyện Mới
  const [title, setTitle] = useState('');      
  const [genre, setGenre] = useState('');      
  const [cover, setCover] = useState<any>(null);
  const [webCoverRaw, setWebCoverRaw] = useState<File | null>(null);


  // States dành cho Tab 2: Đăng Tập/Chương mới
  const [selectedBookId, setSelectedBookId] = useState('');
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterFile, setChapterFile] = useState<any>(null);
  const [webChapterFileRaw, setWebChapterFileRaw] = useState<File | null>(null);
 
  // 👑 STATE PREMIUM HOÀNG GIA: Đã tích hợp trọn vẹn luồng khóa chương bằng Gói Hội Viên
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);
  const [loading, setLoading] = useState(false);


  // ✅ FIXED CRITICAL ERROR: Sửa lại hàm showAlert bằng cách gọi Alert chính thống từ react-native, diệt tận gốc lỗi cấm nạp require động ở dòng 29
  const showAlert = (t: string, m: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${t}: ${m}`);
    } else {
      Alert.alert(t, m);
    }
  };


  // Hàm lấy danh sách truyện của tác giả từ Server Node.js
  const fetchMyBooksForDropdown = async () => {
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;
     
      if (!token && Platform.OS === 'web') {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          token = localToken.startsWith('{') ? JSON.parse(localToken)?.access_token : localToken;
        }
      }


      const response = await fetch('http://localhost:3000/api/books/my-books', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token || ''}` }
      });
      const resJson = await response.json();
      if (resJson.success) {
        const resData = resJson.data || [];
        setMyBooksList(resData);
        if (resData.length > 0) {
          setSelectedBookId(resData[0].id);
        }
      }
    } catch (err) {
      console.error(">>> [DROPDOWN LOAD ERROR]:", err);
    }
  };


  useEffect(() => {
    if (currentTab === 'new_chapter') {
      fetchMyBooksForDropdown();
    }
  }, [currentTab]);


  const pickCoverImage = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/jpeg, image/png';
      input.onchange = (e: any) => {
        const selected = e.target.files[0];
        if (selected) {
          setWebCoverRaw(selected);
          setCover({ name: selected.name, preview: URL.createObjectURL(selected) });
        }
      };
      input.click();
    }
  };


  const pickChapterPdf = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/pdf';
      input.onchange = (e: any) => {
        const selected = e.target.files[0];
        if (selected) {
          setWebChapterFileRaw(selected);
          setChapterFile({ name: selected.name });
        }
      };
      input.click();
    }
  };


  // 🚀 LUỒNG XỬ LÝ 1: TẠO ĐẦU TRUYỆN MỚI TRÊN KỆ
  const handleCreateBook = async () => {
    if (!title.trim() || !genre.trim() || !webCoverRaw) {
      return showAlert("Nhắc nhở", "Vui lòng nhập tên truyện, thể loại và chọn ảnh bìa!");
    }
    setLoading(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;
     
      if (!token && Platform.OS === 'web') {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          token = localToken.startsWith('{') ? JSON.parse(localToken)?.access_token : localToken;
        }
      }


      const imgBuffer = await webCoverRaw.arrayBuffer();
      const cleanImgName = `${Date.now()}_cover.${webCoverRaw.name.split('.').pop()}`;
      const { error: imgError } = await supabase.storage
        .from('img')
        .upload(cleanImgName, new Blob([imgBuffer], { type: webCoverRaw.type }), { contentType: webCoverRaw.type, upsert: true });
     
      if (imgError) throw imgError;
      const finalCoverUrl = supabase.storage.from('img').getPublicUrl(cleanImgName).data.publicUrl;


      const response = await fetch('http://localhost:3000/api/books/create-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({ title: title.trim(), genre: genre.trim(), file_url: 'Đầu truyện nhiều tập', cover_url: finalCoverUrl }),
      });


      const resJson = await response.json();
      if (resJson.success) {
        showAlert("Thành công", `Đã khởi tạo đầu truyện "${title.trim()}" thành công! Bây giờ bạn có thể sang Tab bên cạnh để đăng tập/chương đầu tiên.`);
        setTitle(''); setGenre(''); setCover(null); setWebCoverRaw(null);
      } else {
        throw new Error(resJson.message);
      }
    } catch (error: any) {
      showAlert("Thất bại", error.message);
    } finally {
      setLoading(false);
    }
  };


  // 🚀 LUỒNG XỬ LÝ 2: ĐĂNG TẬP / CHƯƠNG MỚI TÍCH HỢP PREMIUM TỰ ĐỘNG
  const handleUploadChapter = async () => {
    if (!selectedBookId || !chapterNumber.trim() || !chapterTitle.trim() || !chapterFile) {
      return showAlert("Nhắc nhở", "Vui lòng điền đầy đủ số tập, tên chương và chọn file PDF nội dung!");
    }
    setLoading(true);
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;
     
      if (!token && Platform.OS === 'web') {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          token = localToken.startsWith('{') ? JSON.parse(localToken)?.access_token : localToken;
        }
      }


      if (!webChapterFileRaw) throw new Error("Lỗi đọc file văn bản chương!");
      const pdfBuffer = await webChapterFileRaw.arrayBuffer();
      const cleanPdfName = `${Date.now()}_chapter_${chapterNumber}.pdf`;


      const { error: pdfError } = await supabase.storage
        .from('books')
        .upload(cleanPdfName, new Blob([pdfBuffer], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: true });
     
      if (pdfError) throw pdfError;
      const finalPdfUrl = supabase.storage.from('books').getPublicUrl(cleanPdfName).data.publicUrl;


      const response = await fetch('http://localhost:3000/api/books/add-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token || ''}` },
        body: JSON.stringify({
          book_id: selectedBookId,
          chapter_number: chapterNumber.trim(),
          chapter_title: chapterTitle.trim(),
          file_url: finalPdfUrl,
          isPremiumRequired: isPremiumRequired
        }),
      });


      const resJson = await response.json();
      if (resJson.success) {
        showAlert("Thành công", `Tập/Chương số ${chapterNumber} mang tên "${chapterTitle.trim()}" đã lên kệ thành công!`);
        setChapterNumber(''); setChapterTitle(''); setChapterFile(null); setWebChapterFileRaw(null);
        setIsPremiumRequired(false);
      } else {
        throw new Error(resJson.message);
      }
    } catch (error: any) {
      showAlert("Thất bại", error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <Card style={styles.card}>
        <Text style={styles.mainHeader}>HỆ THỐNG PHÁT HÀNH TRUYỆN TRỰC TUYẾN</Text>
       
        <SegmentedButtons
          value={currentTab}
          onValueChange={setCurrentTab}
          buttons={[
            { value: 'new_book', label: '1. Tạo Bộ Truyện Mới', icon: 'book-plus' },
            { value: 'new_chapter', label: '2. Đăng Tập/Chương Mới', icon: 'file-plus' },
          ]}
          style={styles.segment}
          theme={{ colors: { primary: '#614124', secondaryContainer: '#EBE3D5' } }}
        />


        {/* ----------------- TAB 1: KHỞI TẠO BỘ TRUYỆN MỚI ----------------- */}
        {currentTab === 'new_book' && (
          <Card.Content>
            <Text style={styles.subTitle}>KHAI SINH ĐẦU TRUYỆN MỚI</Text>
            <TextInput label="Tên bộ truyện tổng" value={title} onChangeText={setTitle} mode="outlined" style={styles.input} outlineColor="#8A7663" activeOutlineColor="#614124" theme={{ colors: { primary: '#614124' } }} />
            <TextInput label="Thể loại (Ví dụ: Kiếm hiệp, Trinh thám...)" value={genre} onChangeText={setGenre} mode="outlined" style={styles.input} outlineColor="#8A7663" activeOutlineColor="#614124" theme={{ colors: { primary: '#614124' } }} />
           
            {cover?.preview && (
              <Surface style={styles.previewContainer} elevation={1}>
                <Image source={{ uri: cover.preview }} style={styles.coverPreview} />
                <Text style={styles.previewText}>Bìa truyện lớn của bạn (Lưu tại bucket: img)</Text>
              </Surface>
            )}


            <Button icon="image" mode="outlined" onPress={pickCoverImage} style={styles.btnSelectImg} textColor="#614124">
              {cover ? `🖼️ Đã chọn bìa: ${cover.name}` : "CHỌN ẢNH BÌA TRUYỆN TỔNG"}
            </Button>


            <Button mode="contained" onPress={handleCreateBook} loading={loading} disabled={loading} buttonColor="#614124" style={styles.btnSubmit}>
              KHỞI TẠO ĐẦU TRUYỆN MỚI
            </Button>
          </Card.Content>
        )}


        {/* ----------------- TAB 2: ĐĂNG TẬP / CHƯƠNG MỚI ----------------- */}
        {currentTab === 'new_chapter' && (
          <Card.Content>
            <Text style={styles.subTitle}>THÊM PHẦN MỚI / CHƯƠNG MỚI</Text>
           
            <Text style={styles.dropdownLabel}>Chọn bộ truyện muốn đăng thêm chương:</Text>
            <View style={styles.dropdownWrapper}>
              {Platform.OS === 'web' ? (
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  style={styles.webDropdown as any}
                >
                  {myBooksList.map((b) => (
                    <option key={b.id} value={b.id}>{b.title} [{b.genre}]</option>
                  ))}
                </select>
              ) : null}
            </View>


            <View style={styles.rowInputs}>
              <TextInput label="Tập số" value={chapterNumber} onChangeText={setChapterNumber} keyboardType="numeric" mode="outlined" style={[styles.input, { flex: 1, marginRight: 10 }]} outlineColor="#8A7663" activeOutlineColor="#614124" theme={{ colors: { primary: '#614124' } }} />
              <TextInput label="Tiêu đề chương (Ví dụ: Gặp gỡ kì ngộ)" value={chapterTitle} onChangeText={setChapterTitle} mode="outlined" style={[styles.input, { flex: 2.2 }]} outlineColor="#8A7663" activeOutlineColor="#614124" theme={{ colors: { primary: '#614124' } }} />
            </View>


            <View style={styles.premiumToggleBox}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.premiumLabel}>👑 ĐẶC QUYỀN KHÓA CHƯƠNG PREMIUM</Text>
                <Text style={styles.premiumSub}>Kích hoạt nếu bạn muốn giới hạn chương này cho thành viên gói VIP. Độc giả bắt buộc phải mua gói Hội Viên mới có quyền mở đọc tệp PDF.</Text>
              </View>
              <Switch
                value={isPremiumRequired}
                onValueChange={(value) => setIsPremiumRequired(value)}
                color="#C5A059"
                disabled={loading}
              />
            </View>


            <Button icon="file-pdf-box" mode="outlined" onPress={pickChapterPdf} style={styles.btnSelectPdf} textColor="#614124">
              {chapterFile ? `📄 Đã chọn văn bản: ${chapterFile.name}` : "CHỌN FILE PDF NỘI DUNG TẬP NÀY"}
            </Button>


            <Button mode="contained" onPress={handleUploadChapter} loading={loading} disabled={loading} buttonColor="#4A321F" style={styles.btnSubmit}>
              PHÁT HÀNH CHƯƠNG MỚI LÊN KỆ
            </Button>
          </Card.Content>
        )}
      </Card>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#FAF6F0', justifyContent: 'center' },
  card: { padding: 16, borderRadius: 20, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E6DCD0', elevation: 2, maxWidth: 650, width: '100%', alignSelf: 'center' },
  mainHeader: { fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 0.8, color: '#4A321F', fontFamily: 'serif' },
  segment: { marginBottom: 25, borderRadius: 12 },
  subTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 16, color: '#614124', borderLeftWidth: 3, borderLeftColor: '#614124', paddingLeft: 8, letterSpacing: 0.5 },
  input: { marginBottom: 15, backgroundColor: '#FFFDF9', fontSize: 13 },
  rowInputs: { flexDirection: 'row', width: '100%' },
  btnSelectImg: { marginBottom: 20, borderColor: '#614124', borderStyle: 'solid', borderWidth: 1, borderRadius: 10, backgroundColor: '#F3EDE4' },
  btnSelectPdf: { marginBottom: 25, borderColor: '#8A7663', borderStyle: 'dashed', borderWidth: 1.5, borderRadius: 10, backgroundColor: '#F3EDE4' },
  btnSubmit: { paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#FFF' },
  previewContainer: { alignItems: 'center', marginBottom: 15, padding: 10, backgroundColor: '#F3EDE4', borderRadius: 12, alignSelf: 'center', borderWidth: 0.5, borderColor: '#E6DCD0' },
  coverPreview: { width: 120, height: 160, borderRadius: 8, resizeMode: 'cover' },
  previewText: { fontSize: 11, color: '#8A7663', marginTop: 6, fontStyle: 'italic' },
  premiumToggleBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF0', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#F3E5AB', marginBottom: 22, marginTop: 4 },
  premiumLabel: { fontWeight: 'bold', fontSize: 11, color: '#8B6508', letterSpacing: 0.3 },
  premiumSub: { fontSize: 10, color: '#777', marginTop: 4, lineHeight: 15 },
  dropdownLabel: { fontSize: 13, color: '#614124', marginBottom: 8, fontWeight: '600' },
  dropdownWrapper: { borderWidth: 1, borderColor: '#E6DCD0', borderRadius: 10, marginBottom: 20, backgroundColor: '#FFFDF9', overflow: 'hidden' },
  webDropdown: {
    width: '100%',
    padding: 12,
    fontSize: 13,
    color: '#4A321F',
    fontWeight: '500',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    ...Platform.select({
      web: { outlineStyle: "none" } as any
    })
  }
});
