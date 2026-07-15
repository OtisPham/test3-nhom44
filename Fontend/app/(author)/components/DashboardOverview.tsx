import React, { useState, useEffect } from "react";
// ✅ FIXED: Xóa import Platform thừa để triệt tiêu cảnh báo vàng dòng 3
import { View, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Text } from "react-native-paper";
import { Eye, Users, BookOpen, DollarSign,BarChart3 } from "lucide-react-native";
import { useAuth } from "../../../context/AuthContext";


interface DashboardOverviewProps {
  searchQuery: string;
}


export default function DashboardOverview({ searchQuery }: DashboardOverviewProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const { user: authUser, token: authToken } = useAuth();


  const [authorName, setAuthorName] = useState<string>("Tác giả");
  const [liveFollowers, setLiveFollowers] = useState<number>(0);
  const [liveChapters, setLiveChapters] = useState<number>(0);
  const [liveReads, setLiveReads] = useState<number>(0);
  const [liveRevenue, setLiveRevenue] = useState<string>("đ0");
  const [trendingStories, setTrendingStories] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);


  const filteredStories = trendingStories.filter(story =>
    story.title?.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );


  const fetchAuthorDashboardData = async (currentUser: any, token: string | undefined) => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const realName = currentUser.name || currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0];
      setAuthorName(realName || "Tác Giả");


      const backendIP = "localhost";
      const requestHeaders: HeadersInit = { "Content-Type": "application/json" };
      if (token) requestHeaders["Authorization"] = `Bearer ${token}`;


      const [followRes, chapterRes, readsRes, revenueRes, globalTopRes] = await Promise.all([
        fetch(`http://${backendIP}:3000/api/authors/follower-count`, { method: "GET", headers: requestHeaders }).catch(() => null),
        fetch(`http://${backendIP}:3000/api/authors/chapters-count`, { method: "GET", headers: requestHeaders }).catch(() => null),
        fetch(`http://${backendIP}:3000/api/authors/views-count`, { method: "GET", headers: requestHeaders }).catch(() => null),
        fetch(`http://${backendIP}:3000/api/revenue/my-earnings`, { method: "GET", headers: requestHeaders }).catch(() => null),
        fetch(`http://${backendIP}:3000/api/books/top-views`, { method: "GET", headers: requestHeaders }).catch(() => null)
      ]);


      if (followRes) {
        const followData = await followRes.json();
        setLiveFollowers(followData.success ? followData.followerCount : 0);
      }
      if (chapterRes) {
        const chapterData = await chapterRes.json();
        setLiveChapters(chapterData.success ? chapterData.chapterCount : 0);
      }
      if (readsRes) {
        const responseText = await readsRes.text();
        if (responseText && !responseText.trim().startsWith("<!DOCTYPE")) {
          const readsData = JSON.parse(responseText);
          setLiveReads(readsData.success ? readsData.totalReads : 0);
        }
      }
      if (revenueRes) {
        const revText = await revenueRes.text();
        if (revText && !revText.trim().startsWith("<!DOCTYPE")) {
          const revData = JSON.parse(revText);
          if (revData.success && Array.isArray(revData.data)) {
            let totalComputedIncome = 0;
            revData.data.forEach((item: any) => { totalComputedIncome += (item.total_income || 0); });
            setLiveRevenue(totalComputedIncome.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }));
          }
        }
      }


      try {
        const commentResponse = await fetch(`http://${backendIP}:3000/api/comments/list`, { method: "GET", headers: requestHeaders });
        const commentData = await commentResponse.json();
        if (commentData.success && Array.isArray(commentData.data)) {
          setComments(commentData.data.filter((c: any) => !c.parent_id));
        }
      } catch {
        setComments([]);
      }


      if (globalTopRes) {
        const topBooksData = await globalTopRes.json();
        if (topBooksData.success && Array.isArray(topBooksData.data)) {
          setTrendingStories(topBooksData.data.map((b: any, index: number) => ({
            id: b.id,
            rank: index + 1,
            title: b.title || "Chưa đặt tên",
            genre: (b.genre || "CHƯA PHÂN LOẠI").toUpperCase(),
            // ✅ Đổi thành b.views, và bọc thêm b.view_count để đề phòng backend trả về 1 trong 2
            views: b.views || b.view_count || 0, 
            cover_bg: b.cover_url || "#4A321F"
          })));
        }
      }
    } catch (error) {
      console.error("Lỗi đồng bộ API Dashboard:", error);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (authUser) fetchAuthorDashboardData(authUser, authToken || undefined);
  }, [authUser, authToken]);


  const stats = [
    { label: "TOTAL READS", value: liveReads.toLocaleString('vi-VN'), sub: "Lifetime engagement", icon: Eye, badge: "" },
    { label: "FOLLOWERS", value: liveFollowers.toLocaleString('vi-VN'), sub: "Global literary guild", icon: Users, badge: "Live ⚡" },
    { label: "CHAPTERS", value: liveChapters.toString(), sub: "Tác phẩm phát hành", icon: BookOpen, badge: "Live" },
    { label: "REVENUE", value: liveRevenue, sub: "Estimated royalties", icon: DollarSign, badge: "Sept" },
  ];


  if (loading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#614124" />
      </View>
    );
  }


  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.welcomeTitle}>Good Morning, {authorName}</Text>
      <Text style={styles.welcomeSub}>Digital Creative Studio.</Text>


      <View style={styles.statsRowGrid}>
        {stats.map((stat, idx) => {
          const StatIcon = stat.icon;
          return (
            <View key={idx} style={styles.statBoxCard}>
              <View style={[styles.statBadgeContainer, { backgroundColor: idx === 1 ? "#E97E5B" : "rgba(255,255,255,0.15)" }]}>
                <Text style={styles.statBadgeText}>{stat.badge}</Text>
              </View>
              <StatIcon size={18} color="#FAF6F0" style={{ opacity: 0.6, marginBottom: 14 }} />
              <Text style={styles.statCardLabel}>{stat.label}</Text>
              <Text style={styles.statCardValue}>{stat.value}</Text>
              <Text style={styles.statCardSub}>{stat.sub}</Text>
            </View>
          );
        })}
      </View>


      <View style={styles.twoColumnGrid}>
        <View style={{ flex: 1.3 }}>
          <Text style={styles.columnSectionHeading}>Reader Comments</Text>
          {comments.map((comment) => (
            <View key={comment.id} style={styles.commentCardItem}>
              <Text style={{ fontWeight: "700", color: "#4A321F", fontSize: 13 }}>{comment.reader_name}</Text>
              {/* ✅ FIXED: Sử dụng template string để nối dấu nháy đơn, triệt tiêu lỗi eslint unescaped entities tại dòng 157 */}
              <Text style={{ color: "#8A7663", fontStyle: "italic", fontSize: 11, marginTop: 2 }}>
                {'tại tác phẩm "' + comment.book_title + '"'}
              </Text>
              <Text style={{ color: "#555", marginTop: 6, fontSize: 13, lineHeight: 18 }}>{comment.content}</Text>
            </View>
          ))}
          {comments.length === 0 && <Text style={styles.emptyNoticeText}>Chưa có bình luận tương tác nào.</Text>}
        </View>


        <View style={{ flex: 1 }}>
          <Text style={styles.columnSectionHeading}>🏆 Top Thịnh Hành Hệ Thống</Text>
          {filteredStories.map((story) => (
            <View key={story.id} style={styles.trendingBookCard}>
              <View style={styles.rankBadge}><Text style={styles.rankText}>{story.rank}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bookGenreHeader}>{story.genre}</Text>
                <Text style={styles.bookMainTitleText} numberOfLines={1}>{story.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                <BarChart3 size={14} color="#8A7663" />
                <View style={{ marginLeft: 6 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#4A321F' }}>
                    {story.views ? story.views.toLocaleString('vi-VN') : '0'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#8A7663', marginTop: 2 }}>
                    Lượt xem
                  </Text>
                </View>
              </View>
              </View>
            </View>
          ))}
          {filteredStories.length === 0 && <Text style={styles.emptyNoticeText}>Không có dữ liệu truyện trùng khớp.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  scrollContent: { padding: 40 },
  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  welcomeTitle: { fontSize: 32, fontWeight: "bold", color: "#4A321F", fontFamily: "serif" },
  welcomeSub: { fontSize: 13, color: '#8A7663', fontStyle: 'italic', marginBottom: 28 },
  statsRowGrid: { flexDirection: "row", gap: 16, marginBottom: 32 },
  statBoxCard: { flex: 1, backgroundColor: "#2C3930", borderRadius: 20, padding: 22, position: "relative" },
  statBadgeContainer: { position: "absolute", top: 14, right: 14, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statBadgeText: { fontSize: 9, fontWeight: "bold", color: "#FAF6F0" },
  statCardLabel: { fontSize: 9, fontWeight: "800", color: "#FAF6F0", opacity: 0.5 },
  statCardValue: { fontSize: 26, fontWeight: "bold", color: "#FAF6F0", marginVertical: 4, fontFamily: "serif" },
  statCardSub: { fontSize: 10, color: "#FAF6F0", opacity: 0.5 },
  twoColumnGrid: { flexDirection: "row", gap: 32 },
  columnSectionHeading: { fontSize: 18, fontWeight: "bold", color: "#4A321F", fontFamily: "serif", marginBottom: 16 },
  commentCardItem: { backgroundColor: "#FFFDF9", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#E6DCD0", marginBottom: 12 },
  trendingBookCard: { flexDirection: "row", backgroundColor: "#FFFDF9", padding: 14, borderRadius: 16, borderWidth: 1, borderColor: "#E6DCD0", alignItems: "center", marginBottom: 10 },
  rankBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E97E5B', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  rankText: { color: '#FAF6F0', fontWeight: 'bold', fontSize: 11 },
  bookGenreHeader: { fontSize: 9, fontWeight: "800", color: "#A39281" },
  bookMainTitleText: { fontSize: 14, fontWeight: "bold", color: "#4A321F", fontFamily: "serif", marginTop: 2 },
  viewCountText: { fontSize: 11, color: '#614124', marginTop: 4, fontWeight: '600' },
  emptyNoticeText: { textAlign: "center", color: "#8A7663", paddingVertical: 10, fontStyle: "italic", fontSize: 13 }
});
