import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, Avatar, Divider, IconButton } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';

const COLORS = {
  primary: '#8B4513',         // Màu nâu thương hiệu
  secondary: '#A0522D',
  neutralDark: '#4A4540',
  backgroundBg: '#EBE4D6',
  surfacePaper: '#FFFDF8',
  outlineVariant: '#dac2b6',
  badgeBg: '#F4EFE6',
  success: '#2e7d32',
};

interface CommentSectionProps {
  bookId: string;
  onLikeStateChange?: () => void; // Thêm prop để báo cho trang cha load lại View khi bấm tim ở đây
}

export default function CommentSection({ bookId, onLikeStateChange }: CommentSectionProps) {
  const [likesInfo, setLikesInfo] = useState({ totalLikes: 0, hasLiked: false });
  const [rawComments, setRawComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // States phục vụ cho việc Reply
  const [replyingToId, setReplyingToId] = useState<string | null>(null); 
  const [replyText, setReplyText] = useState('');

  const loadLikeStats = async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || localStorage.getItem('userToken');
      const headers: any = {};
      if (token) headers['Authorization'] = `Bearer ${typeof token === 'string' && token.startsWith('{') ? JSON.parse(token).access_token : token}`;

      const res = await fetch(`http://localhost:3000/api/books/like-stats/${bookId}`, { headers });
      const resJson = await res.json();
      if (resJson.success) setLikesInfo(resJson.data);
    } catch (err) { console.error(err); }
  };

  const loadComments = async () => {
    try {
      const res = await fetch(`http://localhost:3000/api/books/comments/${bookId}`);
      const resJson = await res.json();
      if (resJson.success) setRawComments(resJson.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (bookId) {
      loadLikeStats();
      loadComments();
    }
  }, [bookId]);

  const handleLikePress = async () => {
    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || localStorage.getItem('userToken');
      if (!token) return Platform.OS === 'web' ? window.alert("Bạn cần đăng nhập để thả tim!") : null;
      if (typeof token === 'string' && token.startsWith('{')) token = JSON.parse(token).access_token;

      const res = await fetch('http://localhost:3000/api/books/toggle-like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookId })
      });
      const resJson = await res.json();
      if (resJson.success) {
        setLikesInfo(prev => ({
          totalLikes: resJson.data.isLiked ? prev.totalLikes + 1 : prev.totalLikes - 1,
          hasLiked: resJson.data.isLiked
        }));
        
        // Kích hoạt load lại trang cha để View nhảy số ngay tắp lự
        if (onLikeStateChange) onLikeStateChange();
      }
    } catch (err) { console.error(err); }
  };

  const handleSendComment = async () => {
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || localStorage.getItem('userToken');
      if (!token) { setSubmitting(false); return window.alert("Vui lòng đăng nhập để bình luận!"); }
      if (typeof token === 'string' && token.startsWith('{')) token = JSON.parse(token).access_token;

      const res = await fetch('http://localhost:3000/api/books/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookId, content: commentText.trim() })
      });
      if ((await res.json()).success) { setCommentText(''); loadComments(); }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const handleSendReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      let token = (await supabase.auth.getSession()).data.session?.access_token || localStorage.getItem('userToken');
      if (!token) { setSubmitting(false); return window.alert("Vui lòng đăng nhập để trả lời!"); }
      if (typeof token === 'string' && token.startsWith('{')) token = JSON.parse(token).access_token;

      const res = await fetch('http://localhost:3000/api/books/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ bookId, content: replyText.trim(), parentId })
      });
      if ((await res.json()).success) { setReplyText(''); setReplyingToId(null); loadComments(); }
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  };

  const rootComments = rawComments.filter(c => !c.parent_id);
  const getRepliesForComment = (commentId: string) => {
    return rawComments.filter(c => c.parent_id === commentId);
  };

  if (loading) {
    return <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 20 }} />;
  }

  return (
    <View style={styles.areaContainer}>
      {/* 1. KHU VỰC THẢ TIM - Đã đặt display 'none' để tránh trùng lặp với nút tim to ở ngoài */}
      <View style={styles.likeRow}>
        <IconButton icon={likesInfo.hasLiked ? "heart" : "heart-outline"} iconColor={likesInfo.hasLiked ? "#E53935" : COLORS.neutralDark} size={26} onPress={handleLikePress} style={{ margin: 0 }} />
        <Text style={styles.likeCounterText}>{likesInfo.totalLikes} người yêu thích tác phẩm này</Text>
      </View>

      {/* 2. KHU VỰC ĐĂNG BÌNH LUẬN GỐC - ĐỒNG BỘ MÀU NÂU CHUẨN CHỈ */}
      <Text style={styles.sectionTitle}>💬 ĐỘC GIẢ THẢO LUẬN ({rawComments.length})</Text>
      <View style={styles.inputRow}>
        <TextInput 
          placeholder="Viết cảm nghĩ của bạn về tác phẩm này..." 
          value={commentText} 
          onChangeText={setCommentText} 
          mode="outlined" 
          style={styles.textInput} 
          textColor={COLORS.neutralDark}
          outlineColor={COLORS.outlineVariant} 
          activeOutlineColor={COLORS.primary} 
          placeholderTextColor="#A09A90"
          disabled={submitting} 
        />
        <Button 
          mode="contained" 
          buttonColor={COLORS.primary} // 🌟 Sửa màu đen cũ thành màu nâu cổ điển
          textColor={COLORS.surfacePaper}
          onPress={handleSendComment} 
          loading={submitting} 
          disabled={submitting} 
          style={styles.btnSend}
          labelStyle={{ fontWeight: 'bold', fontSize: 13 }}
        >
          GỬI
        </Button>
      </View>

      {/* 3. DANH SÁCH BÌNH LUẬN CÂY */}
      <FlatList
        data={rootComments}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => {
          const replies = getRepliesForComment(item.id);

          return (
            <View style={styles.commentBlock}>
              <View style={styles.commentItem}>
                <Avatar.Text size={34} label={item.users?.email ? item.users.email.substring(0, 2).toUpperCase() : '🔥'} style={{ backgroundColor: COLORS.secondary }} labelStyle={{ fontWeight: 'bold', fontSize: 13 }} />
                <View style={styles.commentBody}>
                  <View style={styles.commentMetaRow}>
                    <Text style={styles.userEmail}>{item.users?.email?.split('@')[0] || 'Ẩn danh'}</Text>
                    <Text style={styles.commentTime}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
                  </View>
                  <Text style={styles.commentContent}>{item.content}</Text>
                  
                  <TouchableOpacity onPress={() => { setReplyingToId(item.id); setReplyText(''); }} style={styles.btnReplyTrigger}>
                    <Text style={styles.btnReplyTriggerText}>↩ Trả lời</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form nhập câu trả lời con */}
              {replyingToId === item.id && (
                <View style={styles.replyInputBox}>
                  <TextInput placeholder={`Phản hồi của bạn...`} value={replyText} onChangeText={setReplyText} mode="outlined" style={styles.textInputSmall} outlineColor={COLORS.outlineVariant} activeOutlineColor={COLORS.primary} textColor={COLORS.neutralDark} dense />
                  <Button mode="text" compact textColor={COLORS.neutralDark} onPress={() => setReplyingToId(null)} style={{ marginLeft: 5 }}>HỦY</Button>
                  <Button mode="contained" compact buttonColor={COLORS.success} textColor="#FFF" onPress={() => handleSendReply(item.id)} loading={submitting} style={{ marginLeft: 5 }}>GỬI</Button>
                </View>
              )}

              {/* REPLY CON */}
              {replies.map((reply) => (
                <View key={reply.id} style={styles.replyCommentItem}>
                  <Avatar.Text size={28} label={reply.users?.email ? reply.users.email.substring(0, 2).toUpperCase() : '💬'} style={{ backgroundColor: COLORS.neutralDark }} labelStyle={{ fontSize: 11 }} />
                  <View style={styles.commentBody}>
                    <View style={styles.commentMetaRow}>
                      <Text style={styles.userEmailSmall}>{reply.users?.email?.split('@')[0]} <Text style={styles.authorTag}>Phản hồi</Text></Text>
                      <Text style={styles.commentTime}>{new Date(reply.created_at).toLocaleDateString('vi-VN')}</Text>
                    </View>
                    <Text style={styles.commentContent}>{reply.content}</Text>
                  </View>
                </View>
              ))}
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyCommentText}>Chưa có bình luận nào.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  areaContainer: { backgroundColor: 'transparent', marginTop: 10 },
  likeRow: { flexDirection: 'row', alignItems: 'center', display: 'none' }, // Ẩn hàng thả tim trùng lặp
  likeCounterText: { fontSize: 13, fontWeight: 'bold', marginLeft: 5, color: COLORS.neutralDark },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: COLORS.primary, marginBottom: 12, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  textInput: { flex: 1, backgroundColor: COLORS.surfacePaper, height: 42 },
  btnSend: { marginLeft: 10, height: 40, justifyContent: 'center', borderRadius: 6 },
  commentBlock: { marginBottom: 12, backgroundColor: COLORS.surfacePaper, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: COLORS.outlineVariant },
  commentItem: { flexDirection: 'row' },
  commentBody: { flex: 1, marginLeft: 12 },
  commentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  userEmail: { fontSize: 13, fontWeight: 'bold', color: COLORS.primary, fontFamily: 'serif' },
  userEmailSmall: { fontSize: 12, fontWeight: 'bold', color: COLORS.neutralDark },
  authorTag: { fontSize: 9, color: COLORS.surfacePaper, backgroundColor: COLORS.secondary, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, overflow: 'hidden', fontWeight: 'bold' },
  commentTime: { fontSize: 11, color: '#908A80' },
  commentContent: { fontSize: 13, color: COLORS.neutralDark, lineHeight: 18, marginTop: 2 },
  btnReplyTrigger: { marginTop: 8, alignSelf: 'flex-start' },
  btnReplyTriggerText: { fontSize: 12, color: COLORS.secondary, fontWeight: 'bold' },
  replyInputBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginTop: 12, padding: 6, backgroundColor: COLORS.badgeBg, borderRadius: 6, borderWidth: 0.5, borderColor: COLORS.outlineVariant },
  textInputSmall: { flex: 1, backgroundColor: COLORS.surfacePaper, height: 32 },
  replyCommentItem: { flexDirection: 'row', marginLeft: 40, marginTop: 14, borderLeftWidth: 2, borderLeftColor: COLORS.outlineVariant, paddingLeft: 12 },
  emptyCommentText: { textAlign: 'center', color: COLORS.neutralDark, fontStyle: 'italic', fontSize: 13, paddingVertical: 20, opacity: 0.6 }
});