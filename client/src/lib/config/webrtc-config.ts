// WebRTC configuration với TURN servers để khắc phục fallback
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  timeout?: number;
  maxReconnectAttempts?: number;
}

// Cấu hình mặc định với STUN servers cơ bản và đáng tin cậy
export const defaultWebRTCConfig: WebRTCConfig = {
  iceServers: [
    // STUN servers cơ bản và đáng tin cậy nhất (Google)
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },

    // STUN servers bổ sung đáng tin cậy
    { urls: 'stun:stun.cloudflare.com:3478' },
    { urls: 'stun:stun.nextcloud.com:443' },

    // Chỉ giữ lại một TURN server cơ bản làm fallback cuối cùng
    // (chỉ sử dụng khi thực sự cần thiết để tránh lỗi)
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
  timeout: 30000, // Giảm xuống 30 giây để người dùng không chờ quá lâu
  maxReconnectAttempts: 3, // Tăng số lần thử lại để ổn định hơn
  iceGatheringTimeout: 15000, // Giảm xuống 15 giây cho ICE gathering
};

// Hàm kiểm tra kết nối TURN server (đơn giản hóa để tránh lỗi)
export async function testTURNServer(server: RTCIceServer): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`Testing TURN server: ${server.urls}`);

    // Đơn giản hóa: chỉ kiểm tra xem server có định dạng đúng không
    // Tránh test thực tế vì các TURN servers công cộng thường không đáng tin cậy
    if (server.urls.startsWith('turn:') && server.username && server.credential) {
      console.log(`TURN server format OK: ${server.urls}`);
      resolve(true);
    } else {
      console.log(`TURN server format invalid: ${server.urls}`);
      resolve(false);
    }
  });
}

// Hàm lấy cấu hình tối ưu dựa trên môi trường mạng (đơn giản hóa)
export async function getOptimalWebRTCConfig(): Promise<WebRTCConfig> {
  const config = { ...defaultWebRTCConfig };

  console.log('Using optimal WebRTC configuration with reliable servers');

  // Với cấu hình đơn giản hóa, chỉ sử dụng các servers cơ bản
  const stunCount = config.iceServers.filter(s => s.urls.startsWith('stun:')).length;
  const turnCount = config.iceServers.filter(s => s.urls.startsWith('turn:')).length;

  console.log(`Using ${config.iceServers.length} ICE servers (${stunCount} STUN, ${turnCount} TURN)`);

  return config;
}

// Hàm tạo cấu hình với TURN credentials tùy chỉnh (cho production)
export function createCustomWebRTCConfig(turnConfig?: { username: string; credential: string }): WebRTCConfig {
  const config = { ...defaultWebRTCConfig };

  if (turnConfig) {
    // Thay thế credentials mặc định bằng custom credentials
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
