// 📂 File: Fontend/app/(author)/Analyst.tsx
import React from 'react';
import { View, StyleSheet, ScrollView, Image, Platform } from 'react-native';
import { Text, Surface, ProgressBar } from 'react-native-paper';
import {  CheckCircle2, Circle } from 'lucide-react-native';




export default function Analyst() {
 
  // Điều phối hành động điều hướng nút bấm chân trang
 
  return (
    <View style={styles.screenContainer}>
     


     


      {/* 📜 KHÔNG GIAN NỘI DUNG CHÍNH (HOÀN THIỆN TÍNH NĂNG MỚI) */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainContentScrollBody}
      >
        <Surface style={styles.centralCardContainer} elevation={1}>
         
          {/* Khu vực Ảnh Bìa Minh Họa Thư Phòng kèm Badge góc phải */}
          <View style={styles.imageWrapperStyle}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=600&auto=format&fit=crop' }}
              style={styles.heroBannerImage}
            />
            <View style={styles.topImageBadge}>
              <Text style={styles.topImageBadgeText}>Chương Mới</Text>
            </View>
          </View>


          {/* Tiêu đề chính & Châm ngôn phong cách Cổ điển */}
          <View style={styles.textHeaderCenterGroup}>
            <Text style={styles.mainHeadingTypography}>Chúng Tôi Đang Hoàn Thiện Tính Năng Mới</Text>
           
            <View style={styles.quoteRowContainer}>
              <Text style={styles.descriptionParagraphText}>
                Tính năng này hiện đang trong quá trình phát triển. Chúng tôi đang hoàn thiện những nội dung cuối cùng để mang đến trải nghiệm tốt nhất cho bạn.
              </Text>
             
              <View style={styles.quoteDividerLine} />
             
              <View style={styles.quoteTypographyWrapper}>
                <Text style={styles.nobleQuoteText}>
                  A library is not a luxury but one of the necessities of life.
                </Text>
                <Text style={styles.nobleQuoteAuthor}>— Henry Ward Beecher</Text>
              </View>
            </View>
          </View>


          {/* 📊 THANH TIẾN ĐỘ PHÁT TRIỂN (DEVELOPMENT PROGRESS - 75%) */}
          <View style={styles.progressSectionContainer}>
            <View style={styles.progressLabelRowHeader}>
              <Text style={styles.progressTitleLabel}>DEVELOPMENT PROGRESS</Text>
              <Text style={styles.progressPercentageNumber}>75%</Text>
            </View>
            <ProgressBar progress={0.75} color="#B09E65" style={styles.customProgressBarLine} />
          </View>


          {/* 🗺️ MA TRẬN TIẾN ĐỘ THỰC THI (GRID TASKS) */}
          <View style={styles.tasksMatrixGrid}>
           
            <View style={styles.taskItemCardRow}>
              <CheckCircle2 size={16} color="#B09E65" fill="rgba(176,158,101,0.1)" />
              <Text style={styles.taskLabelTextDone}>Đang thiết kế giao diện</Text>
            </View>


            <View style={styles.taskItemCardRow}>
              <CheckCircle2 size={16} color="#B09E65" fill="rgba(176,158,101,0.1)" />
              <Text style={styles.taskLabelTextDone}>Đang kiểm thử hệ thống</Text>
            </View>


            <View style={styles.taskItemCardRow}>
              <CheckCircle2 size={16} color="#B09E65" fill="rgba(176,158,101,0.1)" />
              <Text style={styles.taskLabelTextDone}>Đang tối ưu hiệu năng</Text>
            </View>


            <View style={styles.taskItemCardRowPending}>
              <Circle size={16} color="#BAADA0" style={{ opacity: 0.6 }} />
              <Text style={styles.taskLabelTextPending}>Sắp phát hành</Text>
            </View>


          </View>


         


        </Surface>


        {/* 📜 FOOTER THƯ VIỆN ĐỒNG BỘ MẪU */}
        <View style={styles.footerSectionContainer}>
          <View style={styles.footerBrandBlock}>
            <Text style={styles.footerLogoText}>The Archive</Text>
            <Text style={styles.footerSubSlogan}>The next chapter is being written...</Text>
          </View>
         
          <View style={styles.footerLinksBlockRow}>
            <Text style={styles.footerLinkItem}>Terms of Service</Text>
            <Text style={styles.footerLinkItem}>Privacy Policy</Text>
            <Text style={styles.footerLinkItem}>Archival Ethics</Text>
          </View>


          <Text style={styles.footerCopyrightText}>
            © 2026 The Archive Digital Library. All rights reserved.
          </Text>
        </View>


      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FAF6F0'
  },
  mainContentScrollBody: {
    flexGrow: 1,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: '#FAF6F0'
  },
  centralCardContainer: {
    backgroundColor: '#FAF6F0',
    width: '100%',
    maxWidth: 820,
    borderRadius: 32,
    paddingHorizontal: 48,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 28
  },
  imageWrapperStyle: {
    width: 260,
    height: 260,
    borderRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#2A1E17',
    ...Platform.select({
      web: { boxShadow: '0px 12px 30px rgba(74, 50, 31, 0.12)' },
      default: { elevation: 6 }
    })
  },
  heroBannerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  },
  topImageBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#D9A343',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  topImageBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FAF6F0'
  },
  textHeaderCenterGroup: {
    width: '100%',
    alignItems: 'center',
    gap: 14
  },
  mainHeadingTypography: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A321F',
    textAlign: 'center',
    fontFamily: 'serif',
    letterSpacing: 0.3
  },
  quoteRowContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 20,
    marginTop: 6,
    alignItems: 'center'
  },
  descriptionParagraphText: {
    flex: 1.2,
    fontSize: 13.5,
    color: '#7A6553',
    lineHeight: 20,
    textAlign: 'justify'
  },
  quoteDividerLine: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(74, 50, 31, 0.15)'
  },
  quoteTypographyWrapper: {
    flex: 0.8
  },
  nobleQuoteText: {
    fontSize: 11,
    color: '#8A7663',
    fontStyle: 'italic',
    lineHeight: 16
  },
  nobleQuoteAuthor: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4A321F',
    marginTop: 4
  },
  progressSectionContainer: {
    width: '100%',
    gap: 8,
    marginTop: 4
  },
  progressLabelRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  progressTitleLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#A38F7A',
    letterSpacing: 1
  },
  progressPercentageNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4A321F',
    fontFamily: 'serif'
  },
  customProgressBarLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EBE3D5'
  },
  tasksMatrixGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between'
  },
  taskItemCardRow: {
    width: '48%',
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EBE3D5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    opacity: 0.9
  },
  taskItemCardRowPending: {
    width: '48%',
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F5EFE6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EBE3D5',
    borderStyle: 'dashed'
  },
  taskLabelTextDone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A321F'
  },
  taskLabelTextPending: {
    fontSize: 13,
    fontWeight: '600',
    color: '#BAADA0'
  },
  buttonActionRowGroup: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    justifyContent: 'center',
    width: '100%'
  },
  primaryBrownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8C5A3C',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  primaryButtonTextLabel: {
    color: '#FAF6F0',
    fontSize: 13,
    fontWeight: 'bold'
  },
  secondaryOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF6F0',
    borderWidth: 1,
    borderColor: '#C8B1A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24
  },
  secondaryButtonTextLabel: {
    color: '#4A321F',
    fontSize: 13,
    fontWeight: 'bold'
  },
  footerSectionContainer: {
    width: '100%',
    maxWidth: 820,
    borderTopWidth: 0.5,
    borderColor: 'rgba(74, 50, 31, 0.1)',
    paddingTop: 24,
    marginTop: 16,
    alignItems: 'center',
    gap: 12
  },
  footerBrandBlock: {
    alignItems: 'center'
  },
  footerLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A321F',
    fontFamily: 'serif'
  },
  footerSubSlogan: {
    fontSize: 11,
    color: '#8A7663',
    fontStyle: 'italic',
    marginTop: 2
  },
  footerLinksBlockRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 4
  },
  footerLinkItem: {
    fontSize: 11,
    color: '#7A6553',
    fontWeight: '500'
  },
  footerCopyrightText: {
    fontSize: 10,
    color: '#BAADA0',
    textAlign: 'center'
  }
});
