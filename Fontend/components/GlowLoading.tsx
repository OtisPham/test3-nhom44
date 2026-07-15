import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";



export default function GlowLoading() {
  // 🚀 KHỞI TẠO CÁC BIẾN ANIMATION CHẠY NGẦM
  const goatAnim = useRef(new Animated.Value(0)).current;     // Chuyển động nhảy của dê
  const dustAnim = useRef(new Animated.Value(0)).current;     // Khói bụi lốc xoáy cuộn tròn
  const bookAnim = useRef(new Animated.Value(0)).current;     // Sách cổ lơ lửng phát sáng
  const sparkleAnim = useRef(new Animated.Value(0)).current;  // Hạt bụi vàng lấp lánh

  useEffect(() => {
    // 1. Vòng lặp chú dê tăng tốc nhún sải chân (Chạy liên tục không ngừng)
    Animated.loop(
      Animated.sequence([
        Animated.timing(goatAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(goatAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ])
    ).start();

    // 2. Vòng lặp luồng khói bụi cuộn tròn lốc xoáy phun ra từ chân sau
    Animated.loop(
      Animated.timing(dustAnim, { toValue: 1, duration: 500, useNativeDriver: true })
    ).start();

    // 3. Vòng lặp cuốn sách cổ lật mở bồng bềnh tỏa hào quang
    Animated.loop(
      Animated.sequence([
        Animated.timing(bookAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(bookAnim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    // 4. Vòng lặp các hạt bụi vàng lấp lánh bay tản ra xung quanh sách
    Animated.loop(
      Animated.timing(sparkleAnim, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, []);

  // 🛠️ MAPPING GIÁ TRỊ TOÀN DIỆN SANG BIẾN ĐỔI HÌNH HỌC (TRANSFORM COORD)
  const goatY = goatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const goatRotate = goatAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-3deg"] });

  const dustScale = dustAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.7, 1.1, 1.3, 0.9] });
  const dustX = dustAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0, -20, -45, -60] });
  const dustY = dustAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0, -5, -8, -10] });
  const dustRotate = dustAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-120deg"] });
  const dustOpacity = dustAnim.interpolate({ inputRange: [0, 0.4, 0.8, 1], outputRange: [0.3, 0.7, 0.4, 0] });

  const bookY = bookAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -16] });
  const bookRotate = bookAnim.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "-5deg"] });

  const sparkleX = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 25] });
  const sparkleY = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -15] });
  const sparkleScale = sparkleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] });
  const sparkleOpacity = sparkleAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });

  return (
    <View style={styles.outerWrapper}>
      
      {/* ================= SÂN KHẤU HOẠT HÌNH TOÀN CẢNH ================= */}
      <View style={styles.stageContainer}>
        
        {/* KHỐI BÊN TRÁI: CỤM CHÚ DÊ NÚI & KHÓI LỐC XOÁY */}
        <View style={styles.leftGoatCluster}>
          
          {/* Lớp khói bụi lốc xoáy cuộn tròn dưới gót chân */}
          <Animated.View style={[
            styles.dustCloud, 
            { 
              opacity: dustOpacity,
              transform: [{ scale: dustScale }, { translateX: dustX }, { translateY: dustY }, { rotate: dustRotate }]
            }
          ]} />

          {/* CHÚ DÊ NÚI SỪNG CUỘN (Lật gương scaleX quay mặt chuẩn xác sang phải) */}
          <Animated.View style={{ transform: [{ translateY: goatY }, { rotate: goatRotate }] }}>
            <Text style={styles.goatEmoji}>🐐</Text>
          </Animated.View>
        </View>

        {/* CỤM GIỮA: LUỒNG GIÓ HÀO QUANG NỐI ĐUỔI THEO SÁCH */}
        <View style={[styles.windLine, { left: "42%", transform: [{ rotate: "-15deg" }] }]} />
        <View style={[styles.windLine, { left: "45%", top: "45%", transform: [{ rotate: "-10deg" }] }]} />

        {/* KHỐI BÊN PHẢI: CUỐN SÁCH CỔ LẬT MỞ MA THUẬT */}
        <Animated.View style={{ marginLeft: 20, position: "relative", transform: [{ translateY: bookY }, { rotate: bookRotate }] }}>
          
          {/* Bọc bìa nâu viền vàng lật mở xịn sò phong cách hoàng gia */}
          <View style={styles.ancientBookCover}>
            <Text style={styles.bookEmoji}>📖</Text>
          </View>
          
          {/* Các hạt bụi vàng phát sáng (Sparkles) bay xung quanh */}
          <Animated.Text style={[
            styles.sparkle, 
            { top: -15, left: -10, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }, { translateX: sparkleX }, { translateY: sparkleY }] }
          ]}>✨</Animated.Text>
          <Animated.Text style={[
            styles.sparkle, 
            { top: -5, right: -18, opacity: sparkleOpacity, transform: [{ scale: sparkleScale }, { translateX: sparkleX }, { translateY: sparkleY }] }
          ]}>✨</Animated.Text>
        </Animated.View>

      </View>

      {/* ================= TIÊU ĐỀ TRẠNG THÁI CHUẨN HOÀNG GIA ================= */}
      <View style={styles.statusTextContainer}>
        <Text style={styles.mainTitle}>SEEKING THE LOST ARCHIVES...</Text>
        <Text style={styles.subTitle}>
          Chú dê đang tăng tốc lật mở thư tịch cổ, xin vui lòng đợi
        </Text>
      </View>

    </View>
  );
}

// 🎨 KHUNG ĐỊNH DẠNG LAYOUT VÀ CSS ĐỒNG BỘ 100% KHÔNG LỖI CHẠY ĐA NỀN TẢNG
const styles = StyleSheet.create({
  outerWrapper: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60, backgroundColor: "transparent" },
  stageContainer: { flexDirection: "row", alignItems: "center", width: 400, height: 160, justifyContent: "center", position: "relative" },
  leftGoatCluster: { position: "relative", marginRight: 60, width: 100, height: 100, justifyContent: "center", alignItems: "center" },
  
  // Sửa dứt điểm khói bụi bo góc tròn
  dustCloud: { position: "absolute", bottom: 10, left: -25, backgroundColor: "#E6DCD0", width: 40, height: 30, borderRadius: 20 },
  goatEmoji: { fontSize: 72, color: "#4A321F", transform: [{ scaleX: -1 }], userSelect: "none" as any },
  
  windLine: { position: "absolute", width: 60, height: 2, backgroundColor: "rgba(212,175,55,0.3)", borderRadius: 1 },
  
  // Cấu trúc bóng đổ sang trọng chuẩn mobile thay thế hoàn toàn boxShadow cũ của Web
  ancientBookCover: { 
    backgroundColor: "#4A321F", 
    paddingVertical: 14, 
    paddingHorizontal: 18, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: "#D4AF37",
    ...Platform.select({
      ios: { shadowColor: "#4A321F", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20 },
      android: { elevation: 8 },
      web: { boxShadow: "0 10px 20px rgba(97,65,36,0.25)" } as any
    })
  },
  bookEmoji: { color: "#D4AF37", fontSize: 26, fontWeight: "bold" },
  sparkle: { position: "absolute", fontSize: 13, color: "#D4AF37" },
  
  statusTextContainer: { alignItems: "center", gap: 8, marginTop: 10 },
  mainTitle: { fontSize: 15, fontWeight: "900", color: "#4A321F", fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', letterSpacing: 2.5, textTransform: "uppercase" },
  subTitle: { fontSize: 12, color: "#8A7663", fontWeight: "600", fontStyle: "italic", letterSpacing: 0.3 }
});