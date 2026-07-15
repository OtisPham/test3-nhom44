const express = require('express');
const cors = require('cors');
const path = require('path');
const userRoutes = require('./src/routes/userRoutes');
const bookRoute = require('./src/routes/bookRoute');
const packageRoute = require('./src/routes/packageRoute');
const revenueRoute = require('./src/routes/revenueRoute');
const authorRoute = require('./src/routes/authorRoute');
const commentRoute = require('./src/routes/commentRoute');
const overviewRoute = require('./src/routes/overviewRoute')

require('./src/jobs/viewCountJob');

const app = express();

// 🚀 FIX LỖI CỐT LÕI: Đặt CORS lên ĐẦU TIÊN và cấu hình chi tiết cho React Native Web
app.use(cors({
    origin: ['http://localhost:8081', 'http://s:8081'], // Cổng của React Native Web
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Chấp nhận request OPTIONS kiểm tra của trình duyệt
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Tiếp theo mới đến các cấu hình đọc dữ liệu hệ thống
app.use(express.json());
app.use(express.static(__dirname));

// Đưa toàn bộ Routes vào sử dụng
app.use('/api/books', bookRoute);
app.use('/api/packages', packageRoute);
app.use('/api/revenue', revenueRoute);
app.use('/api/authors', authorRoute);
app.use('/api/comments', commentRoute);
app.use('/api/admin', overviewRoute); 

app.use('/api', userRoutes);

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server NHÓM 44 bat dau chạy tại: http://localhost:${PORT}`);
});

module.exports = app;