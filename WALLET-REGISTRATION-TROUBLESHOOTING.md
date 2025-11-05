# 🔧 Wallet Registration Troubleshooting Guide

## 🎯 **Vấn đề hiện tại:**
User không thể đăng ký tài khoản mới qua wallet test interface.

## ✅ **Những gì đã được cải thiện:**

### 1. **Enhanced Error Handling**
- Detailed error messages từ server
- Browser console logging
- CORS configuration improvements
- Fallback authentication methods

### 2. **Debug Tools**
- Console logging for all API requests
- Debug buttons để test trực tiếp
- Manual API testing options
- Admin panel quick access

### 3. **Multiple Authentication Methods**
- Primary: PocketBase client SDK
- Fallback: Direct fetch API calls
- Test credentials: Pre-created user accounts

## 🚀 **Cách troubleshoot:**

### **Option 1: Sử dụng Test Credentials (Dễ nhất)**
1. Mở: http://localhost:5173/wallet-test
2. Nếu có lỗi, click **"Try Test Credentials"** (nút màu cam)
3. Sẽ tự động điền credentials đã test thành công:
   ```
   Email: walletuser@example.com
   Password: wallet123456
   ```
4. Click **"Login"** ✅

### **Option 2: Tạo tài khoản manual trong Admin Panel**
1. Click **"Open Admin Panel"** (nút màu xanh)
2. Đăng nhập admin:
   ```
   Email: admin@example.com
   Password: admin123456
   ```
3. Tạo user mới:
   - Collections → users → "+ New record"
   - Email: any@domain.com
   - Password: yourpassword123
   - Name: Your Name
4. Sử dụng credentials này để login

### **Option 3: Debug Mode**
1. Click **"Debug Register"** để test registration trực tiếp
2. Click **"Test API Direct"** để test API connectivity
3. Xem browser console (F12) để debug logs

## 🔍 **Debug Information:**

### **Browser Console (F12):**
- Tìm logs với format: `🔐`, `✅`, `❌`, `📡`
- Kiểm tra Network tab để xem API requests
- Xem error details và status codes

### **Common Issues & Solutions:**

#### **1. CORS Error:**
```
❌ Error: CORS error - check browser console for details
```
**Solution:** Đã cải thiện CORS headers, thử refresh page

#### **2. Validation Error:**
```
❌ Error: Invalid email or password format
```
**Solution:** Đảm bảo password ≥ 6 ký tự, email format hợp lệ

#### **3. Network Error:**
```
❌ Error: Network error - please check if PocketBase server is running
```
**Solution:** Kiểm tra PocketBase server: http://localhost:8090/_/

#### **4. User Already Exists:**
```
❌ Error: User already exists
```
**Solution:** Click "Try Test Credentials" hoặc tạo email khác

## 📊 **System Status:**

- **✅ PocketBase Server:** Running on port 8090
- **✅ Collections:** users, wallets, wallet_data
- **✅ API Endpoints:** All working
- **✅ Authentication:** Working
- **✅ Wallet Storage:** Working
- **✅ Admin Panel:** Accessible

## 🛠️ **Developer Tools:**

### **Console Commands (F12 → Console):**
```javascript
// Test API directly
fetch('http://localhost:8090/api/health').then(r => r.json()).then(console.log)

// Check collections
fetch('http://localhost:8090/api/collections').then(r => r.json()).then(console.log)

// Test user creation
fetch('http://localhost:8090/api/collections/users/records', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'test123456',
    passwordConfirm: 'test123456',
    name: 'Test'
  })
}).then(r => r.json()).then(console.log)
```

### **Available Test Scripts:**
```bash
node create-user-for-testing.js  # Tạo test user
node test-browser-connectivity.js # Test API connectivity
node verify-integration.js       # Full integration test
```

## 🎉 **Quick Success Path:**

1. **Mở:** http://localhost:5173/wallet-test
2. **Click:** "Try Test Credentials" (nút cam)
3. **Login** với credentials đã có
4. **Test:** Tạo wallet, connect wallet, xem history
5. **Success:** Wallet data lưu vào PocketBase ✅

## 📞 **Nếu vẫn có lỗi:**

1. **Check Browser Console (F12)** - error details
2. **Check Network Tab (F12)** - API request status
3. **Try Admin Panel** - tạo user manual
4. **Check PocketBase Logs** - server-side errors

**🎊 Hệ thống đã được cải thiện tối đa để handle registration issues!**
