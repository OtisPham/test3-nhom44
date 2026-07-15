import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  Platform,
  Animated // ✅ THÊM: Import Animated để làm hiệu ứng trượt
} from 'react-native';

import GlowLoading from '../../../components/GlowLoading';
import { useAuth } from "../../../context/AuthContext";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  book_id: string;
  reader_name: string;
  book_title: string;
  replies?: Comment[];
}

const BACKEND_IP = 'localhost'; // Thay bằng IP thực tế của backend nếu cần

export default function ReaderInteraction() {

  
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { token: authToken } = useAuth();
  
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ KHAI BÁO STATE VÀ ANIMATED VALUE CHO THÔNG BÁO PUSH-UP
  const [toastMessage, setToastMessage] = useState('');
  const slideAnim = useRef(new Animated.Value(100)).current; // Khởi tạo vị trí tàng hình ở tít bên dưới (y = 100)

  // ✅ HÀM KÍCH HOẠT THÔNG BÁO TỰ ĐỘNG TẮT
  const showToast = (message: string) => {
    setToastMessage(message);
    
    // 1. Trượt lên
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // 2. Chờ 2.5 giây rồi trượt xuống lại
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setToastMessage(''); // Dọn dẹp message sau khi ẩn
        });
      }, 2500);
    });
  };

  const fetchComments = useCallback(async () => {
    if (!authToken) return;

    setIsLoading(true);
    try {
      const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
      requestHeaders["Authorization"] = `Bearer ${authToken}`; 

      const url = `http://${BACKEND_IP}:3000/api/comments/list`;
      
      const commentResponse = await fetch(url, { 
        method: "GET", 
        headers: requestHeaders 
      });
      
      if (!commentResponse.ok) {
        throw new Error(`Lỗi HTTP: ${commentResponse.status}`);
      }
      
      const commentData = await commentResponse.json();
      
      if (commentData.success && Array.isArray(commentData.data)) {
        const allComments = commentData.data;
        
        const topLevelComments = allComments.filter((c: any) => !c.parent_id);
        const commentsWithReplies = topLevelComments.map((parent: any) => ({
          ...parent,
          replies: allComments.filter((c: any) => c.parent_id === parent.id)
        }));

        setComments(commentsWithReplies);
      }
    } catch (error) {
      console.error("[GET] Lỗi lấy dữ liệu bình luận:", error);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      fetchComments();
    }
  }, [authToken, fetchComments]);

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim()) {
      showToast("Vui lòng nhập nội dung phản hồi.");
      return;
    }

    if (!authToken) {
      showToast("Lỗi: Không tìm thấy token người dùng.");
      return;
    }

    setIsSubmitting(true);
    try {
      const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
      requestHeaders["Authorization"] = `Bearer ${authToken}`;

      const response = await fetch(`http://${BACKEND_IP}:3000/api/comments/reply`, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          parent_id: parentId,
          content: replyContent
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // ✅ Xóa trạng thái đang nhập lập tức
        setReplyingToId(null); 
        setReplyContent(''); 
        
        // ✅ Cập nhật danh sách bình luận
        fetchComments(); 
        
        // ✅ Gọi thông báo Push-up thay cho Alert
        showToast("Đã gửi phản hồi thành công!");
      } else {
        showToast(result.message || "Có lỗi từ server");
      }
    } catch (error) {
      console.error("Lỗi post reply:", error);
      showToast("Lỗi kết nối mạng, không thể gửi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderCommentItem = ({ item }: { item: Comment }) => {
    const isReplying = replyingToId === item.id;

    return (
      <View style={styles.commentCard}>
        <View style={styles.commentHeader}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.reader_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.readerName}>{item.reader_name}</Text>
            <Text style={styles.timeText}>{formatTimeAgo(item.created_at)}</Text>
          </View>
        </View>

        <Text style={styles.commentContent}>{`"${item.content}"`}</Text>

        {/* HIỂN THỊ CÁC PHẢN HỒI CỦA TÁC GIẢ */}
        {item.replies && item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map((reply) => (
              <View key={reply.id} style={styles.authorReplyItem}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <View style={styles.authorBadge}><Text style={styles.authorBadgeText}>AUTHOR</Text></View>
                  <Text style={styles.timeText}>{formatTimeAgo(reply.created_at)}</Text>
                </View>
                <Text style={styles.replyTextContent}>{reply.content}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.interactionRow}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              setReplyingToId(isReplying ? null : item.id);
              setReplyContent('');
            }}
          >
            <Text style={styles.actionIcon}>↩</Text>
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        </View>

        {isReplying && (
          <View style={styles.replyBox}>
            <View style={styles.replyBoxHeader}>
              <View style={styles.authorBadge}><Text style={styles.authorBadgeText}>AUTHOR</Text></View>
              <Text style={styles.draftingText}>Drafting response...</Text>
            </View>
            
            <TextInput
              style={styles.replyInput}
              multiline
              placeholder={`Dear ${item.reader_name}, ...`}
              placeholderTextColor="#A99B8E"
              value={replyContent}
              onChangeText={setReplyContent}
            />
            
            <View style={styles.replyActions}>
              <TouchableOpacity onPress={() => setReplyingToId(null)} disabled={isSubmitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.postButton, isSubmitting && { opacity: 0.7 }]} 
                onPress={() => handlePostReply(item.id)}
                disabled={isSubmitting}
              >
                <Text style={styles.postButtonText}>
                  {isSubmitting ? 'Posting...' : 'Post Response'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  if (isLoading || !authToken) {
    return <GlowLoading />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Reader Interaction</Text>
        <View style={styles.subtitleRow}>
          <Text style={styles.bookTitle}>{"The Alchemist's Quill"}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{comments.length} Active Conversations</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderCommentItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* ✅ KHU VỰC HIỂN THỊ ANIMATED TOAST TỪ DƯỚI LÊN */}
      {toastMessage !== '' && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6B3E11',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookTitle: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#4A321F',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginRight: 12,
  },
  badge: {
    backgroundColor: '#F2E8D5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6DCD0',
  },
  badgeText: {
    fontSize: 12,
    color: '#8A7663',
    fontWeight: 'bold',
  },
  listContainer: {
    paddingBottom: 40,
  },
  commentCard: {
    backgroundColor: '#FCFAF5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFE7DB',
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#5C4A3D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FDFBF7',
    fontSize: 16,
    fontWeight: 'bold',
  },
  readerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2C1E16',
  },
  timeText: {
    fontSize: 12,
    color: '#8A7663',
  },
  commentContent: {
    fontSize: 15,
    color: '#4A4A4A',
    lineHeight: 22,
    marginBottom: 16,
  },
  repliesContainer: {
    marginTop: -8, 
    marginBottom: 16,
    marginLeft: 15,
    paddingLeft: 15,
    borderLeftWidth: 2,
    borderLeftColor: '#E6DCD0',
  },
  authorReplyItem: {
    marginTop: 10,
    backgroundColor: '#F7F0E6',
    padding: 12,
    borderRadius: 8,
  },
  replyTextContent: {
    fontSize: 14,
    color: '#4A321F',
    lineHeight: 20,
    marginTop: 4,
  },
  interactionRow: {
    flexDirection: 'row',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIcon: {
    fontSize: 16,
    color: '#6B3E11',
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#6B3E11',
    fontWeight: '600',
  },
  replyBox: {
    marginTop: 20,
    backgroundColor: '#FAF5ED',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EFE7DB',
  },
  replyBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorBadge: {
    backgroundColor: '#6B3E11',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
  },
  authorBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  draftingText: {
    fontStyle: 'italic',
    color: '#8A7663',
    fontSize: 13,
  },
  replyInput: {
    backgroundColor: '#FDFBF7',
    borderWidth: 1,
    borderColor: '#E6DCD0',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    color: '#4A321F',
    fontSize: 14,
    marginBottom: 12,
  },
  replyActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelText: {
    color: '#4A321F',
    fontWeight: '600',
    marginRight: 20,
    fontSize: 14,
  },
  postButton: {
    backgroundColor: '#8C4A28',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // ✅ CSS DÀNH CHO KHUNG THÔNG BÁO TOAST
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    left: 24,
    right: 24,
    backgroundColor: '#3E2723', // Nền màu nâu sẫm cho đồng bộ thiết kế
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6, // Đổ bóng cho Android
    shadowColor: '#000', // Đổ bóng cho iOS
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    zIndex: 9999,
  },
  toastText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  }
});