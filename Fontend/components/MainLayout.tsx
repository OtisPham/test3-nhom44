import React from 'react';
import { StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Text, Searchbar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [searchQuery, setSearchQuery] = React.useState('');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      
      {/* HEADER: Chứa Logo, Search và Icons */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Đảm bảo bạn có file logo.png trong thư mục assets/images */}
          <Image 
            source={require('../assets/images/logobao.jpg')} 
            style={styles.logo} 
            defaultSource={{ uri: 'https://via.placeholder.com/40' }} 
          />
          <Text style={styles.headerTitle}>HOME</Text>
        </View>

        <Searchbar
          placeholder="Search stories..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
          placeholderTextColor="#999"
          iconColor="#824921"
        />

        <View style={styles.headerIcons}>
          <IconButton icon="bell-outline" iconColor="#fff" size={20} onPress={() => {}} />
          <TouchableOpacity style={styles.avatarCircle}>
             <Text style={styles.avatarText}>K</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BODY: Nơi hiển thị nội dung của ReaderHome */}
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#824921', // Màu nền phía trên của SafeArea
  },
  header: {
    height: 65,
    flexDirection: 'row',
    backgroundColor: '#824921',
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '20%',
  },
  logo: {
    width: 35,
    height: 35,
    borderRadius: 8,
    marginRight: 10,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  searchBar: {
    flex: 1,
    height: 38,
    backgroundColor: '#D1D9E6',
    borderRadius: 10,
    marginHorizontal: 15,
    elevation: 0, // Bỏ bóng đổ của Searchbar paper
  },
  searchInput: {
    minHeight: 0, // Sửa lỗi padding trên Android
    fontSize: 14,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '15%',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C5A059',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    backgroundColor: '#F5F2E9', // Màu nền chính cho toàn bộ nội dung app
  },
});