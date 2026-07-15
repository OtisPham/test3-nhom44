// 📂 File: Fontend/app/(author)/components/AuthorUploadScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Image, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text, Surface, Switch } from 'react-native-paper';
import { Check, UploadCloud, FileText, BookOpen, Layers, CheckCircle2, ArrowRight } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';


// --- ĐỊNH NGHĨA KIỂU DỮ LIỆU ĐỒNG BỘ FRONTEND LOGIC ---
interface BookData {
  id: string;
  title: string;
  genre: string;
  cover_url?: string;
  file_url?: string;
  views?: number;
  status?: string;
  created_at?: string;
  latest_chapter_number?: number | string;
  total_chapters?: number | string;
}


export default function AuthorUploadScreen() {
  // --- STATE ĐIỀU PHỐI TAB & STEP GIAO DIỆN ---
  const [currentTab, setCurrentTab] = useState<'new_book' | 'new_chapter'>('new_book');
  const [bookStep, setBookStep] = useState<number>(1);
  const [chapterStep, setChapterStep] = useState<number>(1);


  // --- STATE XỬ LÝ DỮ LIỆU ĐỘNG TỪ LOGIC GỐC ---
  const [myBooksList, setMyBooksList] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(false);


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
  const [isPremiumRequired, setIsPremiumRequired] = useState(false);


  // Xử lý thông báo an toàn không phụ thuộc require() động
  const showAlert = (t: string, m: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${t}: ${m}`);
    } else {
      Alert.alert(t, m);
    }
  };


  // 🔥 THUẬT TOÁN KIỂM TRA VÀ TRÍCH XUẤT TOKEN TRÁNH SẬP PHIÊN CHUYÊN NGHIỆP
  const getValidToken = async (): Promise<string | null> => {
    try {
      const sessionRes = await supabase.auth.getSession();
      let token = sessionRes.data.session?.access_token;


      if (!token) {
        const localToken = localStorage.getItem('userToken');
        if (localToken) {
          if (localToken.startsWith('{')) {
            token = JSON.parse(localToken)?.access_token || JSON.parse(localToken)?.token;
          } else {
            token = localToken;
          }
        }
      }
      return token || null;
    } catch (err) {
      console.error(">>> [TOKEN EXTRACTION ERROR]:", err);
      return null;
    }
  };


  // Hàm lấy danh sách truyện của tác giả từ Server Node.js phục vụ Dropdown
  const fetchMyBooksForDropdown = async () => {
    try {
      const token = await getValidToken();
      if (!token) return;
     
      const response = await fetch('http://localhost:3000/api/books/my-books', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resJson = await response.json();
      if (resJson.success) {
        const booksData = resJson.data || [];
        setMyBooksList(booksData);
       
        if (booksData.length > 0) {
          const defaultBook = booksData[0];
          setSelectedBookId(defaultBook.id);


          const currentMaxChapter = Number(defaultBook.latest_chapter_number || defaultBook.total_chapters || 0);
          setChapterNumber(String(currentMaxChapter + 1));
        }
      }
    } catch (err) {
      console.error(">>> [DROPDOWN LOAD ERROR]:", err);
    }
  };


  // 📌 LOGIC TỊNH TIẾN SỐ TẬP KHI THAY ĐỔI DROPDOWN SELECTION
  useEffect(() => {
    if (selectedBookId && myBooksList.length > 0) {
      const currentBook = myBooksList.find(b => b.id === selectedBookId);
      if (currentBook) {
        const currentMaxChapter = Number(currentBook.latest_chapter_number || currentBook.total_chapters || 0);
        setChapterNumber(String(currentMaxChapter + 1));
      }
    }
  }, [selectedBookId, myBooksList]);


  useEffect(() => {
    if (currentTab === 'new_chapter') {
      fetchMyBooksForDropdown();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);


  // Bộ chọn file ảnh bìa (Hỗ trợ Web)
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


  // Bộ chọn file tập văn bản PDF (Hỗ trợ Web)
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


  // 🚀 LUỒNG XỬ LÝ 1: TẠO ĐẦU TRUYỆN MỚI LÊN NODE.JS + STORAGE
  const handleCreateBook = async (): Promise<boolean> => {
    if (!title.trim() || !genre.trim() || !webCoverRaw) {
      showAlert("Nhắc nhở", "Thiếu trường thông tin dữ liệu!");
      return false;
    }


    const token = await getValidToken();
    if (!token) return false;


    setLoading(true);
    try {
      const imgBuffer = await webCoverRaw.arrayBuffer();
      const cleanImgName = `${Date.now()}_cover.${webCoverRaw.name.split('.').pop()}`;
      const { error: imgError } = await supabase.storage
        .from('img')
        .upload(cleanImgName, new Blob([imgBuffer], { type: webCoverRaw.type }), { contentType: webCoverRaw.type, upsert: true });
     
      if (imgError) throw imgError;
      const finalCoverUrl = supabase.storage.from('img').getPublicUrl(cleanImgName).data.publicUrl;


      const response = await fetch('http://localhost:3000/api/books/create-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), genre: genre.trim(), file_url: 'Đầu truyện nhiều tập', cover_url: finalCoverUrl }),
      });


      const resJson = await response.json();
      if (resJson.success) {
        setTitle(''); setGenre(''); setCover(null); setWebCoverRaw(null);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };


  // 🚀 LUỒNG XỬ LÝ 2: ĐĂNG TẬP / CHƯƠNG MỚI LÊN NODE.JS + STORAGE
  const handleUploadChapter = async (): Promise<boolean> => {
    if (!selectedBookId || !chapterNumber.trim() || !chapterTitle.trim() || !chapterFile) {
      return false;
    }


    const token = await getValidToken();
    if (!token) return false;


    setLoading(true);
    try {
      if (!webChapterFileRaw) return false;
      const pdfBuffer = await webChapterFileRaw.arrayBuffer();
      const cleanPdfName = `${Date.now()}_chapter_${chapterNumber}.pdf`;


      const { error: pdfError } = await supabase.storage
        .from('books')
        .upload(cleanPdfName, new Blob([pdfBuffer], { type: 'application/pdf' }), { contentType: 'application/pdf', upsert: true });
     
      if (pdfError) throw pdfError;
      const finalPdfUrl = supabase.storage.from('books').getPublicUrl(cleanPdfName).data.publicUrl;


      const response = await fetch('http://localhost:3000/api/books/add-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
        setChapterNumber(''); setChapterTitle(''); setChapterFile(null); setWebChapterFileRaw(null);
        setIsPremiumRequired(false);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };


  return (
    <View style={styles.subWrapper}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
       
        {/* TIÊU ĐỀ TRANG BIẾN ĐỔI THEO TAB ĐANG CHỌN */}
        <Text style={styles.pageMainHeading}>
          {currentTab === 'new_book' ? 'Tạo Bộ Truyện Mới' : 'Đăng Chương Hoặc Tập Mới'}
        </Text>


        {/* PHÂN HỆ SUB-TAB NẰM NGANG */}
        <View style={styles.tabHeaderRow}>
          <TouchableOpacity
            onPress={() => { setCurrentTab('new_book'); setBookStep(1); }}
            style={[styles.tabSubButton, currentTab === 'new_book' && styles.tabSubButtonActive]}
          >
            <Text style={[styles.tabSubButtonText, currentTab === 'new_book' && styles.tabSubButtonTextActive]}>Tạo truyện mới</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setCurrentTab('new_chapter'); setChapterStep(1); }}
            style={[styles.tabSubButton, currentTab === 'new_chapter' && styles.tabSubButtonActive]}
          >
            <Text style={[styles.tabSubButtonText, currentTab === 'new_chapter' && styles.tabSubButtonTextActive]}>Thêm chương mới</Text>
          </TouchableOpacity>
        </View>


        {/* ----------------- TAB 1: KHỞI TẠO BỘ TRUYỆN MỚI ----------------- */}
        {currentTab === 'new_book' && (
          <View style={{ width: '100%' }}>
            <View style={styles.stepperContainerLine}>
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, bookStep >= 1 && styles.stepCircleIconActive]}>
                  {bookStep > 1 ? <Check size={14} color="#FAF6F0" /> : <UploadCloud size={14} color={bookStep === 1 ? "#FAF6F0" : "#8A7663"} />}
                </View>
                <Text style={[styles.stepLabelText, bookStep === 1 && styles.stepLabelTextActive]}>Step 1 Upload</Text>
              </View>
              <View style={[styles.stepConnectorLine, bookStep >= 2 && styles.stepConnectorLineActive]} />
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, bookStep >= 2 && styles.stepCircleIconActive]}>
                  {bookStep > 2 ? <Check size={14} color="#FAF6F0" /> : <FileText size={14} color={bookStep === 2 ? "#FAF6F0" : "#8A7663"} />}
                </View>
                <Text style={[styles.stepLabelText, bookStep >= 2 && styles.stepLabelTextActive]}>Step 2 Metadata</Text>
              </View>
              <View style={[styles.stepConnectorLine, bookStep >= 3 && styles.stepConnectorLineActive]} />
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, bookStep >= 3 && styles.stepCircleIconActive]}>
                  <CheckCircle2 size={14} color={bookStep === 3 ? "#FAF6F0" : "#8A7663"} />
                </View>
                <Text style={[styles.stepLabelText, bookStep >= 3 && styles.stepLabelTextActive]}>Step 3 Complete</Text>
              </View>
            </View>


            {bookStep === 1 && (
              <View style={styles.layoutFlexRowContainer}>
                <Surface style={[styles.mainFormCardBody, { alignItems: 'center', paddingVertical: 50 }]} elevation={0}>
                  <View style={styles.pdfIconBigCircle}>
                    <BookOpen size={42} color="#614124" />
                  </View>
                  <Text style={styles.depositMainTitle}>Deposit Your Manuscript</Text>
                  <Text style={styles.depositSubDescription}>
                    Tải lên hình quyển truyện đầu tiên để bắt đầu tạo bộ truyện mới. Chúng tôi sẽ phân tích định dạng của bạn để tối ưu hiển thị.
                  </Text>
                  <TouchableOpacity onPress={pickCoverImage} style={styles.dragDropImageBorderContainer}>
                    {cover?.preview ? (
                      <Image source={{ uri: cover.preview }} style={styles.coverImageObjectInside} />
                    ) : (
                      <View style={{ alignItems: 'center', padding: 20 }}>
                        <UploadCloud size={24} color="#A39281" style={{ marginBottom: 10 }} />
                        <Text style={styles.dragDropMainText}>Kéo thả hoặc nhấp để tải ảnh</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.supportFileNoteText}>Hỗ trợ hình Tối đa 100MB</Text>
                </Surface>


                <View style={styles.rightAssistanceColumn}>
                  <View style={styles.rightGuideBox}>
                    <BookOpen size={16} color="#614124" style={{ marginBottom: 8 }} />
                    <Text style={styles.guideBoxText}>
                      Tiến trình xuất bản của bạn được bảo mật theo tiêu chuẩn kỹ thuật số cao nhất. Mọi bản thảo đều được mã hóa tự động.
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (!cover) {
                        showAlert("Nhắc nhở", "Vui lòng chọn hình quyển truyện trước khi tiếp tục!");
                        return;
                      }
                      setBookStep(2);
                    }}
                    style={styles.nextStepPrimaryButton}
                  >
                    <Text style={styles.nextStepBtnText}>Tiếp tục</Text>
                    <ArrowRight size={14} color="#FAF6F0" />
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {bookStep === 2 && (
              <View style={styles.layoutFlexRowContainer}>
                <Surface style={styles.mainFormCardBody} elevation={0}>
                  <Text style={styles.formSectionTitle}>Thông Tin Bộ Truyện</Text>
                  <Text style={styles.formSectionSubHint}>Vui lòng cung cấp đầy đủ thông tin để độc giả có thể tìm thấy tác phẩm của bạn dễ dàng hơn.</Text>
                 
                  <Text style={styles.inputCustomLabel}>Tên truyện</Text>
                  <TextInput value={title} onChangeText={setTitle} placeholder="Ví dụ: Đại Đạo Độc Hành" style={styles.nativeStyledInput} placeholderTextColor="#A39281" />
                 
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputCustomLabel}>Thể loại</Text>
                      <View style={styles.nativeDropdownWrapper}>
                        {Platform.OS === 'web' ? (
                          <select
                            value={genre}
                            onChange={(e) => setGenre(e.target.value)}
                            style={styles.cleanWebSelectTag as any}
                          >
                            <option value="" disabled>-- Chọn thể loại truyện --</option>
                            <option value="Kiếm hiệp">Kiếm hiệp</option>
                            <option value="Triết học">Triết học</option>
                            <option value="Ngôn tình">Ngôn tình</option>
                            <option value="Kinh tế - Tài chính">Kinh tế - Tài chính</option>
                            <option value="Phật học">Phật Học</option>
                            <option value="Trinh thám">Trinh thám</option>
                            <option value="Kinh dị">Kinh dị</option>
                            <option value="Khoa học">Khoa học</option>
                            <option value="Lịch sử">Lịch sử</option>
                            <option value="Công nghệ">Công nghệ</option>
                          </select>
                        ) : null}
                      </View>
                    </View>
                  </View>


                  <Text style={[styles.inputCustomLabel, { marginTop: 14 }]}>Mô tả ngắn</Text>
                  <TextInput multiline numberOfLines={4} placeholder="Tóm tắt nội dung câu chuyện của bạn trong 200 chữ..." style={[styles.nativeStyledInput, { height: 100, textAlignVertical: 'top' }]} placeholderTextColor="#A39281" />


                  <View style={styles.checkboxLineRow}>
                    <Switch value={isPremiumRequired} onValueChange={setIsPremiumRequired} color="#C5A059" />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={[styles.checkTitleMain, { color: '#8B6508', fontWeight: 'bold' }]}>★ Truyện Premium</Text>
                    </View>
                  </View>
                </Surface>


                <View style={styles.rightAssistanceColumn}>
                  <TouchableOpacity
                    disabled={loading}
                    onPress={async () => {
                      if (!title.trim() || !genre.trim()) {
                        showAlert("Nhắc nhở", "Vui lòng điền tên truyện và thể loại!");
                        return;
                      }
                      const isSuccess = await handleCreateBook();
                      if (isSuccess) setBookStep(3);
                    }}
                    style={[styles.nextStepPrimaryButton, { marginTop: 24, backgroundColor: '#4A321F' }]}
                  >
                    {loading ? <ActivityIndicator size="small" color="#FAF6F0" /> : <Text style={styles.nextStepBtnText}>🔥 PHÁT HÀNH TRUYỆN</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {bookStep === 3 && (
              <Surface style={[styles.mainFormCardBody, { maxWidth: 800, alignSelf: 'center', alignItems: 'center', paddingVertical: 45 }]} elevation={0}>
                <View style={styles.successCheckedBigCircle}><Check size={32} color="#614124" /></View>
                <Text style={styles.successMainTitleText}>Truyện đã được tạo thành công</Text>
                <Text style={styles.successSubDescText}>Bộ truyện của bạn đã được lưu vào hệ thống mây và sẵn sàng để xuất bản.</Text>
                <TouchableOpacity onPress={() => { setBookStep(1); setCurrentTab('new_chapter'); }} style={styles.successPrimaryActionBtn}>
                  <Text style={styles.successPrimaryActionBtnText}>+ Thêm chương mới</Text>
                </TouchableOpacity>
              </Surface>
            )}
          </View>
        )}


        {/* ----------------- TAB 2: ĐĂNG TẬP / CHƯƠNG MỚI ----------------- */}
        {currentTab === 'new_chapter' && (
          <View style={{ width: '100%' }}>
            <View style={styles.stepperContainerLine}>
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, chapterStep >= 1 && styles.stepCircleIconActive]}>
                  {chapterStep > 1 ? <Check size={14} color="#FAF6F0" /> : <Layers size={14} color={chapterStep === 1 ? "#FAF6F0" : "#8A7663"} />}
                </View>
                <Text style={[styles.stepLabelText, chapterStep === 1 && styles.stepLabelTextActive]}>Information</Text>
              </View>
              <View style={[styles.stepConnectorLine, chapterStep >= 2 && styles.stepConnectorLineActive]} />
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, chapterStep >= 2 && styles.stepCircleIconActive]}>
                  {chapterStep > 2 ? <Check size={14} color="#FAF6F0" /> : <UploadCloud size={14} color={chapterStep === 2 ? "#FAF6F0" : "#8A7663"} />}
                </View>
                <Text style={[styles.stepLabelText, chapterStep === 2 && styles.stepLabelTextActive]}>Upload PDF</Text>
              </View>
              <View style={[styles.stepConnectorLine, chapterStep >= 3 && styles.stepConnectorLineActive]} />
              <View style={styles.stepItemUnit}>
                <View style={[styles.stepCircleIcon, chapterStep >= 3 && styles.stepCircleIconActive]}>
                  <CheckCircle2 size={14} color={chapterStep === 3 ? "#FAF6F0" : "#8A7663"} />
                </View>
                <Text style={[styles.stepLabelText, chapterStep >= 3 && styles.stepLabelTextActive]}>Complete</Text>
              </View>
            </View>


            {chapterStep === 1 && (
              <View style={styles.layoutFlexRowContainer}>
                <Surface style={styles.mainFormCardBody} elevation={0}>
                  <Text style={styles.formSectionTitle}>Đăng Tập Mới</Text>
                  <Text style={styles.formSectionSubHint}>Cấu hình siêu dữ liệu và phân quyền đọc VIP cho tập truyện mới của bạn.</Text>


                  <Text style={styles.inputCustomLabel}>Chọn truyện</Text>
                  <View style={styles.nativeDropdownWrapper}>
                    {Platform.OS === 'web' ? (
                      <select value={selectedBookId} onChange={(e) => setSelectedBookId(e.target.value)} style={styles.cleanWebSelectTag as any}>
                        {myBooksList.map((b) => (
                          <option key={b.id} value={b.id}>{b.title}</option>
                        ))}
                      </select>
                    ) : null}
                  </View>


                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputCustomLabel}>Số tập</Text>
                      <TextInput value={chapterNumber} onChangeText={setChapterNumber} placeholder="1" keyboardType="numeric" style={styles.nativeStyledInput} placeholderTextColor="#A39281" />
                    </View>
                  </View>


                  <Text style={[styles.inputCustomLabel, { marginTop: 14 }]}>Tên chương </Text>
                  <TextInput value={chapterTitle} onChangeText={setChapterTitle} placeholder="Chương 42: Sự thật cuối cùng" style={styles.nativeStyledInput} placeholderTextColor="#A39281" />


                  <Text style={[styles.inputCustomLabel, { marginTop: 14 }]}>Ghi chú tác giả (Tùy chọn)</Text>
                  <TextInput multiline numberOfLines={4} placeholder="Viết vài dòng chia sẻ về chương này..." style={[styles.nativeStyledInput, { height: 90, textAlignVertical: 'top' }]} placeholderTextColor="#A39281" />
                </Surface>


                <View style={styles.rightAssistanceColumn}>
                  <View style={styles.rightGuideBox}>
                    <Text style={styles.tipBoxTitle}>Quyền truy cập</Text>
                    <TouchableOpacity onPress={() => setIsPremiumRequired(false)} style={styles.radioOptionLineRow}>
                      <View style={[styles.outerRadioCircle, !isPremiumRequired && styles.outerRadioCircleActive]}>
                        {!isPremiumRequired && <View style={styles.innerRadioDot} />}
                      </View>
                      <Text style={[styles.radioLabelMain, { marginLeft: 10 }]}>Công khai (Miễn phí)</Text>
                    </TouchableOpacity>


                    <TouchableOpacity onPress={() => setIsPremiumRequired(true)} style={[styles.radioOptionLineRow, { marginTop: 14 }]}>
                      <View style={[styles.outerRadioCircle, isPremiumRequired && styles.outerRadioCircleActive]}>
                        {isPremiumRequired && <View style={styles.innerRadioDot} />}
                      </View>
                      <Text style={[styles.radioLabelMain, { marginLeft: 10 }]}>Premium (VIP Hội Viên)</Text>
                    </TouchableOpacity>
                  </View>


                  <TouchableOpacity
                    onPress={() => {
                      if (!chapterTitle.trim() || !chapterNumber.trim()) {
                        showAlert("Nhắc nhở", "Vui lòng điền số tập và tiêu đề tập truyện trước!");
                        return;
                      }
                      setChapterStep(2);
                    }}
                    style={[styles.nextStepPrimaryButton, { marginTop: 24 }]}
                  >
                    <Text style={styles.nextStepBtnText}>Tiếp tục chọn File</Text>
                    <ArrowRight size={14} color="#FAF6F0" />
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {chapterStep === 2 && (
              <View style={styles.layoutFlexRowContainer}>
                <Surface style={[styles.mainFormCardBody, { alignItems: 'center', paddingVertical: 50 }]} elevation={0}>
                  <View style={styles.pdfIconBigCircle}>
                    <FileText size={42} color="#614124" />
                  </View>
                  <Text style={styles.depositMainTitle}>Deposit Your Chapter Content</Text>
                  <Text style={styles.depositSubDescription}>
                    Tải lên tệp văn bản PDF chứa toàn bộ nội dung của chương số {chapterNumber}. Hệ thống sẽ mã hóa bảo mật chống copy.
                  </Text>
                 
                  <TouchableOpacity onPress={pickChapterPdf} style={styles.choosePdfLargeButton}>
                    <UploadCloud size={16} color="#FAF6F0" />
                    <Text style={styles.choosePdfButtonText}>
                      {chapterFile ? ` Đã chọn: ${chapterFile.name}` : "Choose PDF File"}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.supportFileNoteText}>Hỗ trợ định dạng PDF chuẩn tòa soạn</Text>
                </Surface>


                <View style={styles.rightAssistanceColumn}>
                  <View style={styles.rightGuideBox}>
                    <Text style={{ fontSize: 12, color: '#8A7663', marginTop: 4 }}>Chế độ: {isPremiumRequired ? "Premium VIP 👑" : "Công khai 🌍"}</Text>
                  </View>


                  <TouchableOpacity
                    disabled={loading}
                    onPress={async () => {
                      if (!chapterFile) {
                        showAlert("Nhắc nhở", "Vui lòng nhấp chọn tệp PDF nội dung chương trước khi xuất bản!");
                        return;
                      }
                      const isSuccess = await handleUploadChapter();
                      if (isSuccess) setChapterStep(3);
                    }}
                    style={[styles.nextStepPrimaryButton, { marginTop: 24, backgroundColor: '#4A321F' }]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FAF6F0" />
                    ) : (
                      <Text style={styles.nextStepBtnText}> XUẤT BẢN CHƯƠNG MỚI</Text>
                    )}
                  </TouchableOpacity>


                  <TouchableOpacity onPress={() => setChapterStep(1)} style={styles.saveDraftSecondaryButton}>
                    <Text style={styles.saveDraftBtnText}>Quay lại Bước 1</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}


            {chapterStep === 3 && (
              <Surface style={[styles.mainFormCardBody, { maxWidth: 800, alignSelf: 'center', alignItems: 'center', paddingVertical: 45 }]} elevation={0}>
                <View style={styles.successCheckedBigCircle}><Check size={32} color="#614124" /></View>
                <Text style={styles.successMainTitleText}>Chương mới đã lên kệ thành công!</Text>
                <Text style={styles.successSubDescText}>
                  {"Nội dung tập số " + chapterNumber + " mang tên \"" + chapterTitle + "\" đã được đồng bộ an toàn lên hệ thống đám mây."}
                </Text>
                <TouchableOpacity onPress={() => { setChapterStep(1); setChapterTitle(''); setChapterNumber(''); }} style={styles.successPrimaryActionBtn}>
                  <Text style={styles.successPrimaryActionBtnText}>Đăng tập tiếp theo</Text>
                </TouchableOpacity>
              </Surface>
            )}
          </View>
        )}


      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  // ✅ FIXED LAYOUT: Cô lập component con lọt lòng Tab phải lụa mờ
  subWrapper: { flex: 1, backgroundColor: "#FAF6F0" },
  container: { paddingHorizontal: 40, paddingBottom: 60, paddingTop: 20 },
  pageMainHeading: { fontSize: 32, fontWeight: "bold", color: "#4A321F", fontFamily: "serif", letterSpacing: 0.5 },
  tabHeaderRow: { flexDirection: 'row', gap: 28, marginTop: 16, borderBottomWidth: 1, borderBottomColor: '#E6DCD0', paddingBottom: 1 },
  tabSubButton: { paddingBottom: 10, position: 'relative' },
  tabSubButtonActive: { borderBottomWidth: 2, borderBottomColor: '#614124' },
  tabSubButtonText: { fontSize: 14, color: '#8A7663', fontWeight: '500' },
  tabSubButtonTextActive: { color: '#4A321F', fontWeight: '700' },
  stepperContainerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 32, alignSelf: 'center', maxWidth: 600, width: '100%' },
  stepItemUnit: { alignItems: 'center', width: 100 },
  stepCircleIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FAF6F0', borderWidth: 1.5, borderColor: '#E6DCD0', justifyContent: 'center', alignItems: 'center' },
  stepCircleIconActive: { backgroundColor: '#614124', borderColor: '#614124' },
  stepLabelText: { fontSize: 11, color: '#8A7663', marginTop: 8, fontWeight: '500', width: 120, textAlign: 'center' },
  stepLabelTextActive: { color: '#4A321F', fontWeight: '700' },
  stepConnectorLine: { flex: 1, height: 2, backgroundColor: '#E6DCD0', marginHorizontal: 8, marginTop: -16 },
  stepConnectorLineActive: { backgroundColor: '#614124' },
  layoutFlexRowContainer: { flexDirection: 'row', gap: 32, width: '100%', marginTop: 8 },
  mainFormCardBody: { flex: 1.6, backgroundColor: '#FFFDF9', borderRadius: 24, padding: 32, borderWidth: 1, borderColor: '#E6DCD0' },
  rightAssistanceColumn: { flex: 0.9, minWidth: 260 },
  pdfIconBigCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3EDE4', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  depositMainTitle: { fontSize: 24, fontWeight: 'bold', color: '#614124', fontFamily: 'serif', marginBottom: 12 },
  depositSubDescription: { fontSize: 13, color: '#8A7663', textAlign: 'center', lineHeight: 22, maxWidth: 440, marginBottom: 28 },
  choosePdfLargeButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#614124', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
  choosePdfButtonText: { color: '#FAF6F0', fontSize: 13, fontWeight: '700' },
  supportFileNoteText: { fontSize: 11, color: '#A39281', marginTop: 12, fontStyle: 'italic' },
  rightGuideBox: { backgroundColor: '#FFFDF9', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E6DCD0' },
  guideBoxText: { fontSize: 12, color: '#8A7663', lineHeight: 18, fontStyle: 'italic' },
  tipBoxTitle: { fontSize: 13, fontWeight: 'bold', color: '#8B6508', marginBottom: 6, letterSpacing: 0.3 },
  rightColumnLabelHeading: { fontSize: 11, fontWeight: '800', color: '#8A7663', marginBottom: 8, letterSpacing: 0.5 },
  dragDropImageBorderContainer: { width: '100%', height: 200, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#C5A059', backgroundColor: '#F3EDE4', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  coverImageObjectInside: { width: '100%', height: '100%', resizeMode: 'cover' },
  dragDropMainText: { fontSize: 12, fontWeight: '700', color: '#4A321F', textAlign: 'center' },
  nextStepPrimaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#614124', paddingVertical: 12, borderRadius: 24 },
  nextStepBtnText: { color: '#FAF6F0', fontSize: 13, fontWeight: '700' },
  saveDraftSecondaryButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 24, borderWidth: 1, borderColor: '#614124', marginTop: 12, backgroundColor: '#FFFDF9' },
  saveDraftBtnText: { color: '#614124', fontSize: 13, fontWeight: '700' },
  formSectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif' },
  formSectionSubHint: { fontSize: 13, color: '#8A7663', marginTop: 4, marginBottom: 24 },
  inputCustomLabel: { fontSize: 12, fontWeight: '700', color: '#614124', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.3 },
  nativeStyledInput: {
    borderWidth: 1,
    borderColor: '#C5A059',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#4A321F',
    backgroundColor: '#FFFDF9',
    marginBottom: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any
    })
  },
  nativeDropdownWrapper: { borderWidth: 1, borderColor: '#C5A059', borderRadius: 8, overflow: 'hidden', backgroundColor: '#FFFDF9', marginBottom: 14 },
  cleanWebSelectTag: {
    width: '100%',
    padding: 12,
    fontSize: 13,
    color: '#4A321F',
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        cursor: 'pointer',
      } as any
    })
  },
  tagsDisplayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 18 },
  tagBadgeItem: { backgroundColor: '#F3EDE4', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tagBadgeText: { fontSize: 11, color: '#8A7663', fontWeight: '500' },
  checkboxLineRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  checkTitleMain: { fontSize: 13, fontWeight: '600', color: '#4A321F' },
  radioOptionLineRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  outerRadioCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#8A7663', justifyContent: 'center', alignItems: 'center' },
  outerRadioCircleActive: { borderColor: '#614124' },
  innerRadioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#614124' },
  radioLabelMain: { fontSize: 13, fontWeight: '700', color: '#4A321F' },
  switchToggleRowItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: '#FAF6F0', paddingBottom: 8 },
  switchToggleLabelText: { fontSize: 12.5, fontWeight: '600', color: '#4A321F' },
  librarianFooterBox: { flexDirection: 'row', backgroundColor: '#FFFDF0', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#F3E5AB', marginTop: 40, width: '100%' },
  librarianIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3EDE4', justifyContent: 'center', alignItems: 'center' },
  librarianLabelTitle: { fontSize: 13, fontWeight: '700', color: '#8B6508', textTransform: 'uppercase', letterSpacing: 0.5 },
  librarianContentQuoteText: { fontSize: 12.5, color: '#8A7663', fontStyle: 'italic', lineHeight: 20, marginTop: 4 },
  successCheckedBigCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E9E0D2', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  successMainTitleText: { fontSize: 26, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif' },
  successSubDescText: { fontSize: 13, color: '#8A7663', textAlign: 'center', lineHeight: 22, maxWidth: 540, marginTop: 12, marginBottom: 32 },
  successSummaryGridRow: { flexDirection: 'row', gap: 14, width: '100%', maxWidth: 700, marginTop: 10 },
  summaryMetaCardBlock: { flex: 1, backgroundColor: '#FAF6F0', padding: 18, borderRadius: 14, borderWidth: 0.5, borderColor: '#E6DCD0' },
  metaLabelMini: { fontSize: 9, fontWeight: '800', color: '#A39281', letterSpacing: 0.5 },
  metaValueMain: { fontSize: 15, fontWeight: 'bold', color: '#4A321F', fontFamily: 'serif', marginTop: 6 },
  successPrimaryActionBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24, backgroundColor: '#614124', alignSelf: 'center' },
  successPrimaryActionBtnText: { color: '#FAF6F0', fontWeight: '700', fontSize: 13 }
});
