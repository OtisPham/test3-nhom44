// 📂 Đường dẫn file: app/(reader)/Search.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { Search as SearchIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Card } from 'react-native-paper';
import ReaderSidebar from './ReaderSidebar';
import GlowLoading from '../../components/GlowLoading';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [books, setBooks] = useState<any[]>([]); 
  // 🚀 BỔ SUNG: Tạo state quản lý loading cho trang tìm kiếm
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:3000/api/books/all-books?limit=5')
      .then(res => res.json())
      .then(res => { 
        if(res.success) setBooks(res.data); 
      })
      .catch(err => console.error("Lỗi tải sách tìm kiếm:", err))
      // 🚀 BỔ SUNG: Tắt loading sau khi dữ liệu đã tải xong
      .finally(() => setLoading(false));
  }, []);

  const filtered = books.filter(b => 
    (b.title || '').toLowerCase().includes(query.toLowerCase())
  );

  // 🚀 BỔ SUNG: Nếu đang loading thì chặn lại và hiển thị Chú dê chạy dậm chân
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: '#fcf2e9' }]}>
        <GlowLoading />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.main}>
        {/* THANH TÌM KIẾM */}
        <View style={styles.searchBar}>
          <SearchIcon size={20} color="#8a7663" />
          <TextInput 
            placeholder="Tìm kiếm tác phẩm..." 
            style={styles.input}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        <Text style={styles.sectionTitle}>
          {query ? `Kết quả cho: "${query}"` : "Recommended for you"}
        </Text>
        
        <View style={styles.grid}>
          {filtered.map((item) => (
            <TouchableOpacity 
              key={item.id || item._id} 
              style={styles.cardWrapper} 
              onPress={() => router.push({ 
                pathname: '/BookDetailScreen', 
                params: { id: item.id || item._id } 
              })}
            >
            <Card style={styles.bookCard} mode="outlined">
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.cover_url }} style={styles.bookCover} />
                
                {/* BỔ SUNG CÁC LỚP NÀY ĐỂ TẠO HIỆU ỨNG SÁCH */}
                <View style={styles.spineShadow} />
                <View style={styles.spineLine} />
                <View style={styles.pageEdge} />
                
                <View style={styles.badgePremium}><Text style={styles.badgeText}>PREMIUM</Text></View>
              </View>
              <Card.Content style={{ padding: 12 }}>
                <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.genreText}>🎭 {item.genre || 'Văn học'}</Text>
              </Card.Content>
            </Card>
            </TouchableOpacity>
          ))}
        </View>

        {filtered.length === 0 && (
          <Text style={styles.emptyText}>Không tìm thấy tác phẩm nào phù hợp.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#fcf2e9' },
  main: { flex: 1, padding: 40 },
  // 🚀 BỔ SUNG STYLE: Căn giữa màn hình cho hiệu ứng loading con dê
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchBar: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#dac2b6'
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, ...Platform.select({ web: { outlineStyle: 'none' } as any }) },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#6c2f00', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
  cardWrapper: { width: Platform.OS === 'web' ? '23%' : '48%', marginBottom: 15 },
  bookCard: { 
      backgroundColor: '#EBE3D5', // Màu nền trang sách
      borderRadius: 6, 
      borderWidth: 0, // Bỏ viền mặc định của Card
      overflow: 'hidden',
      // Hiệu ứng bóng đổ như sách thật
      ...Platform.select({ 
        ios: { shadowColor: '#1a0f05', shadowOffset: { width: 4, height: 6 }, shadowOpacity: 0.25, shadowRadius: 4 }, 
        android: { elevation: 5 }, 
        web: { boxShadow: '4px 6px 10px rgba(36, 21, 6, 0.2)' } 
      })
    },
  imageContainer: { 
      width: '100%', 
      aspectRatio: 2/3, 
      position: 'relative',
      // Thêm gáy sách và mép giấy vào đây bằng pseudo-elements hoặc View con
    },
  bookCover: { 
    width: '97%', // Để hở một chút bên trái để lộ gáy sách
    height: '100%', 
    borderTopLeftRadius: 5, 
    borderBottomLeftRadius: 5 
  },
  badgePremium: { position: 'absolute', top: 8, right: 8, backgroundColor: '#E97E5B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  titleText: { fontWeight: 'bold', fontSize: 14, color: '#1c1c17' },
  genreText: { fontSize: 11, color: '#54433a', marginTop: 4 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#8a7663', fontSize: 16 },
  spineShadow: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 2 },
  spineLine: { position: 'absolute', left: 7, top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(0,0,0,0.2)', zIndex: 2 },
  pageEdge: { position: 'absolute', right: 0, top: 1.5, bottom: 1.5, width: '4%', backgroundColor: '#F7F3EB', borderTopRightRadius: 2, borderBottomRightRadius: 2, borderLeftWidth: 0.5, borderLeftColor: '#dac2b6' }
});