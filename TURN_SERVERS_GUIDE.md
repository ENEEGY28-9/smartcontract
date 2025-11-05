# Hướng dẫn khắc phục vấn đề TURN servers trong WebRTC

## 🔍 **Vấn đề hiện tại**

Từ console log, tất cả TURN servers công cộng đều không khả dụng:
- ❌ `turn:openrelay.metered.ca` (các port khác nhau)
- ❌ `turn:relay.backups.cz`
- ❌ `turn:stun.nextcloud.com`

Điều này khiến WebRTC không thể kết nối và phải fallback về WebSocket.

## 🚀 **Các giải pháp khắc phục**

### **Giải pháp 1: Sử dụng dịch vụ TURN servers chuyên nghiệp**

#### **A) Twilio (Khuyến nghị)**
1. Đăng ký tài khoản tại [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Vào **Console → Programmable Voice → Tools → Create SIP Domain**
3. Lấy **Account SID** và **Auth Token**
4. Cập nhật cấu hình trong `client/src/lib/config/webrtc-config.ts`:

```typescript
// Trong hàm createCustomWebRTCConfig()
export function createCustomWebRTCConfig(turnConfig?: { username: string; credential: string }): WebRTCConfig {
  const config = { ...defaultWebRTCConfig };

  if (turnConfig) {
    config.iceServers = config.iceServers.map(server => {
      if (server.urls.startsWith('turn:') && server.username && server.credential) {
        return {
          ...server,
          username: turnConfig.username,
          credential: turnConfig.credential
        };
      }
      return server;
    });
  }

  return config;
}

// Sử dụng với credentials thực tế
const twilioConfig = createCustomWebRTCConfig({
  username: 'your-twilio-account-sid',
  credential: 'your-twilio-auth-token'
});
```

#### **B) Xirsys (Alternative)**
1. Đăng ký tại [https://xirsys.com](https://xirsys.com)
2. Tạo project và lấy TURN credentials
3. Sử dụng tương tự như Twilio

### **Giải pháp 2: Tự host TURN server**

#### **Sử dụng CoTURN (Khuyến nghị cho production)**

**Cài đặt trên Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install coturn
```

**Cấu hình cơ bản** (`/etc/turnserver.conf`):
```bash
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=your-server-ip
min-port=10000
max-port=20000
verbose
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=your-secret-key
realm=your-domain.com
total-quota=100
bps-capacity=0
```

**Khởi động:**
```bash
sudo systemctl start coturn
sudo systemctl enable coturn
```

**Cập nhật cấu hình client:**
```typescript
// Thêm vào danh sách iceServers
{
  urls: 'turn:your-server-ip:3478',
  username: 'your-username', // hoặc sử dụng auth-secret
  credential: 'your-password'
}
```

### **Giải pháp 3: Sử dụng local STUN server (Nếu chỉ cần STUN)**

Nếu bạn chỉ cần STUN (không cần TURN), có thể sử dụng local STUN server:

**Cài đặt STUN server đơn giản:**
```bash
# Sử dụng công cụ đơn giản như stunserver
sudo apt install stun-server
# Chỉnh sửa /etc/default/stun-server để cấu hình
```

### **Giải pháp 4: Kiểm tra network và firewall**

#### **Kiểm tra ports cần thiết:**
```bash
# Kiểm tra ports UDP
sudo ufw allow 3478/udp
sudo ufw allow 5349/udp
sudo ufw allow 10000:20000/udp
```

#### **Test kết nối từ client:**
```bash
# Test STUN server
telnet stun.l.google.com 19302

# Test TURN server (nếu có)
# Sử dụng công cụ như turnutils_uclient từ dự án CoTURN
```

### **Giải pháp 5: Debug từng bước**

#### **1. Test từng STUN server:**
```javascript
// Trong browser console, test từng server
const pc = new RTCPeerConnection({
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('Candidate:', event.candidate);
  }
};

pc.createOffer().then(offer => pc.setLocalDescription(offer));
```

#### **2. Kiểm tra network restrictions:**
- Thử trên mạng khác (VPN, mobile hotspot)
- Kiểm tra với browser khác
- Test trên máy khác cùng mạng

## 📋 **Khuyến nghị cho production**

### **Cho dự án cá nhân/small project:**
- Sử dụng Twilio (1,000 phút miễn phí/tháng)
- Hoặc các TURN servers công cộng đáng tin cậy

### **Cho dự án enterprise/scale:**
- Tự host TURN servers với CoTURN
- Sử dụng multiple TURN servers ở nhiều khu vực
- Monitor và health check các servers
- Có backup servers

## 🔧 **Cách áp dụng giải pháp**

1. **Chọn giải pháp phù hợp** (Twilio hoặc tự host)
2. **Lấy credentials** từ dịch vụ đã chọn
3. **Cập nhật cấu hình** trong code
4. **Test lại** với trang `http://localhost:5173/net-test`

Nếu bạn chọn giải pháp nào, tôi sẽ hướng dẫn chi tiết cách implement nhé! 🚀
