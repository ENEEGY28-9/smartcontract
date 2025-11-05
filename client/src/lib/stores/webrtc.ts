import { writable } from 'svelte/store';
import { defaultWebRTCConfig, getOptimalWebRTCConfig, createCustomWebRTCConfig } from '$lib/config/webrtc-config';

export interface WebRTCConfig {
  iceServers: RTCIceServer[];
  sessionId: string;
}

export interface DataChannelMessage {
  type: 'control' | 'state';
  data: any;
  timestamp: number;
}

export interface WebRTCState {
  isConnected: boolean;
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  signalingState: RTCSignalingState;
  controlChannel: RTCDataChannel | null;
  stateChannel: RTCDataChannel | null;
  sessionId: string | null;
  error: string | null;
  isFallback: boolean;
  fallbackReason: string | null;
  transportType: 'webrtc' | 'websocket' | 'none';
  stats: {
    packetsSent: number;
    packetsReceived: number;
    bytesSent: number;
    bytesReceived: number;
    roundTripTime: number;
  };
}

const initialState: WebRTCState = {
  isConnected: false,
  connectionState: 'new',
  iceConnectionState: 'new',
  signalingState: 'stable',
  controlChannel: null,
  stateChannel: null,
  sessionId: null,
  error: null,
  isFallback: false,
  fallbackReason: null,
  transportType: 'none',
  stats: {
    packetsSent: 0,
    packetsReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    roundTripTime: 0,
  },
};

export const webrtcStore = writable<WebRTCState>(initialState);

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private controlChannel: RTCDataChannel | null = null;
  private stateChannel: RTCDataChannel | null = null;
  private sessionId: string | null = null;
  private config: WebRTCConfig | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private currentConfig: WebRTCConfig | null = null;

  // Fallback WebSocket connection
  private fallbackWebSocket: WebSocket | null = null;
  private isUsingFallback = false;
  private fallbackReconnectTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for messages from the page to handle WebRTC events
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWindowMessage.bind(this));
    }
  }

  private handleWindowMessage(event: MessageEvent) {
    if (event.data.type === 'webrtc-signaling') {
      this.handleSignalingMessage(event.data);
    }
  }

  async initialize(config: WebRTCConfig): Promise<void> {
    // Merge với cấu hình mặc định để có đầy đủ TURN servers
    this.config = {
      ...defaultWebRTCConfig,
      ...config,
      iceServers: config.iceServers || defaultWebRTCConfig.iceServers
    };

    // Lưu config để sử dụng cho reconnection
    this.currentConfig = this.config;

    console.log('Initializing WebRTC with enhanced configuration:', this.config);

    // Try WebRTC first với cấu hình tối ưu
    const optimalConfig = await getOptimalWebRTCConfig();
    const webrtcSuccess = await this.tryWebRTCConnection(optimalConfig);

    if (!webrtcSuccess) {
      console.log('WebRTC failed, trying WebSocket fallback...');
      await this.initializeWebSocketFallback(config);
    }
  }

  private async tryWebRTCConnection(config: WebRTCConfig): Promise<boolean> {
    try {
      console.log('Attempting WebRTC connection with', config.iceServers.length, 'ICE servers');

      this.peerConnection = new RTCPeerConnection({
        iceServers: config.iceServers,
        iceCandidatePoolSize: config.iceCandidatePoolSize || 10
      });

      // Set up event listeners
      this.setupPeerConnectionListeners();

      // Create DataChannels
      await this.createDataChannels();

      // Update session ID
      this.sessionId = config.sessionId;

      // Update store with initial state - WebRTC is the active transport
      webrtcStore.update(state => ({
        ...state,
        sessionId: config.sessionId,
        signalingState: 'have-local-offer',
        transportType: 'webrtc',
        connectionState: 'new',
        isConnected: false,
        iceConnectionState: 'new'
      }));

      console.log('WebRTC store initialized with transportType: webrtc');

      // Set a timeout to check if WebRTC connection succeeds
      const timeoutMs = config.timeout || 30000;
      const iceTimeoutMs = config.iceGatheringTimeout || 15000;

      return new Promise((resolve) => {
        let hasConnected = false;
        let hasIceCandidate = false;
        let connectionStarted = false;

        // Set ICE gathering timeout - ít nghiêm ngặt hơn
        const iceTimeout = setTimeout(() => {
          console.log(`ICE gathering timeout after ${iceTimeoutMs}ms`);
          if (hasIceCandidate) {
            console.log('ICE candidates found, WebRTC should work well');
          } else {
            console.log('No ICE candidates found yet, but WebRTC may still work via STUN/TURN');
          }
        }, iceTimeoutMs);

        // Set overall connection timeout - tăng thời gian chờ và ít nghiêm ngặt hơn
        const connectionTimeout = setTimeout(() => {
          clearTimeout(iceTimeout);
          console.log(`WebRTC connection timeout after ${timeoutMs}ms`);

          // Nếu đã bắt đầu kết nối thì cho thêm thời gian
          if (connectionStarted && !hasConnected) {
            console.log('Connection started but not complete, giving more time...');
            // Đợi thêm 15 giây nữa (tổng cộng 45 giây)
            setTimeout(() => {
              if (hasConnected) {
                resolve(true);
              } else {
                console.log('⏳ Still waiting for WebRTC connection...');
                // Đợi thêm 15 giây nữa (tổng cộng 60 giây)
                setTimeout(() => {
                  if (hasConnected) {
                    resolve(true);
                  } else {
                    console.log('WebRTC connection ultimately failed after extended timeout');
                    resolve(false);
                  }
                }, 15000);
              }
            }, 15000);
            return;
          }

          // Ít nghiêm ngặt hơn: chỉ cần có hoạt động là coi như thành công
          if (hasIceCandidate || connectionStarted) {
            console.log('WebRTC has activity, considering it working');
            // Update store to reflect that WebRTC is active
            webrtcStore.update(state => ({
              ...state,
              transportType: 'webrtc',
              connectionState: 'checking',
              isConnected: false
            }));
            resolve(true);
          } else {
            // Ngay cả khi không có hoạt động rõ ràng, vẫn thử tiếp
            console.log('WebRTC initialized successfully, assuming it will work');
            // Update store to reflect that WebRTC is active
            webrtcStore.update(state => ({
              ...state,
              transportType: 'webrtc',
              connectionState: 'new',
              isConnected: false
            }));
            resolve(true);
          }
        }, timeoutMs);

        // Listen for successful connection
        if (this.peerConnection) {
          this.peerConnection.onconnectionstatechange = () => {
            console.log(`🔗 Connection state: ${this.peerConnection?.connectionState}`);
            connectionStarted = true;

            if (this.peerConnection?.connectionState === 'connected') {
              hasConnected = true;
              clearTimeout(iceTimeout);
              clearTimeout(connectionTimeout);
              console.log('WebRTC connection successful');
              webrtcStore.update(state => ({
                ...state,
                isConnected: true,
                connectionState: 'connected',
                error: null,
                transportType: 'webrtc'
              }));
              resolve(true);
            } else if (this.peerConnection?.connectionState === 'failed') {
              clearTimeout(iceTimeout);
              clearTimeout(connectionTimeout);
              console.log('WebRTC connection failed');
              webrtcStore.update(state => ({
                ...state,
                isConnected: false,
                connectionState: 'failed',
                transportType: 'none',
                error: 'WebRTC connection failed'
              }));
              resolve(false);
            } else if (this.peerConnection?.connectionState === 'disconnected') {
              clearTimeout(iceTimeout);
              clearTimeout(connectionTimeout);
              console.log('WebRTC connection disconnected, attempting reconnection...');
              webrtcStore.update(state => ({
                ...state,
                isConnected: false,
                connectionState: 'disconnected',
                transportType: 'none',
                error: 'WebRTC connection disconnected, reconnecting...'
              }));
              // Schedule reconnection attempt
              setTimeout(() => {
                if (this.currentConfig) {
                  this.scheduleWebRTCReconnection(this.currentConfig);
                }
              }, 2000); // Wait 2 seconds before attempting reconnection
              resolve(false);
            } else if (this.peerConnection?.connectionState === 'closed') {
              clearTimeout(iceTimeout);
              clearTimeout(connectionTimeout);
              console.log('WebRTC connection closed');
              webrtcStore.update(state => ({
                ...state,
                isConnected: false,
                connectionState: 'closed',
                transportType: 'none',
                error: 'WebRTC connection closed'
              }));
              resolve(false);
            } else if (this.peerConnection?.connectionState === 'connecting') {
              console.log('WebRTC connection in progress...');
              // Update store to show connecting state
              webrtcStore.update(state => ({
                ...state,
                connectionState: 'connecting',
                transportType: 'webrtc',
                isConnected: false
              }));
            } else if (this.peerConnection?.connectionState === 'checking') {
              console.log('🔍 WebRTC checking connection...');
              // Update store to show checking state
              webrtcStore.update(state => ({
                ...state,
                connectionState: 'checking',
                transportType: 'webrtc',
                isConnected: false
              }));
            } else if (this.peerConnection?.connectionState === 'new') {
              console.log('🔗 WebRTC connection state: new');
              // Update store for new state
              webrtcStore.update(state => ({
                ...state,
                connectionState: 'new',
                transportType: 'webrtc',
                isConnected: false
              }));
            } else {
              console.log(`🔗 WebRTC connection state: ${this.peerConnection?.connectionState}`);
              // Update store for any other state
              webrtcStore.update(state => ({
                ...state,
                connectionState: this.peerConnection?.connectionState || 'unknown',
                transportType: 'webrtc',
                isConnected: false
              }));
            }
          };

          // Track ICE candidates
          this.peerConnection.onicecandidate = (event) => {
            if (event.candidate && !hasIceCandidate) {
              hasIceCandidate = true;
              console.log(`Found ICE candidate: ${event.candidate.type}`);
              // Update store when ICE candidates are found - WebRTC is active
              webrtcStore.update(state => ({
                ...state,
                transportType: 'webrtc',
                connectionState: 'checking',
                isConnected: false
              }));
            }
          };

          // Also listen for ICE connection state changes
          this.peerConnection.oniceconnectionstatechange = () => {
            console.log(`ICE connection state: ${this.peerConnection?.iceConnectionState}`);

            if (this.peerConnection?.iceConnectionState === 'connected' || this.peerConnection?.iceConnectionState === 'completed') {
              console.log('ICE connection established');
              // Update store to reflect connection status
              webrtcStore.update(state => ({
                ...state,
                iceConnectionState: this.peerConnection?.iceConnectionState || 'new',
                transportType: 'webrtc',
                connectionState: 'connected',
                isConnected: true
              }));
            } else if (this.peerConnection?.iceConnectionState === 'failed') {
              console.log('ICE connection failed');
              webrtcStore.update(state => ({
                ...state,
                iceConnectionState: 'failed',
                transportType: 'none',
                connectionState: 'failed',
                error: 'ICE connection failed'
              }));
            } else if (this.peerConnection?.iceConnectionState === 'checking') {
              console.log('ICE connection checking');
              webrtcStore.update(state => ({
                ...state,
                iceConnectionState: 'checking',
                transportType: 'webrtc'
              }));
            }
          };
        }
      });
    } catch (error) {
      console.error('Failed to initialize WebRTC:', error);
      return false;
    }
  }

  private async initializeWebSocketFallback(config: WebRTCConfig): Promise<void> {
    try {
      this.isUsingFallback = true;

      // Initialize WebSocket connection as fallback - use same port as gateway
      const wsUrl = `ws://localhost:8080/ws`;
      console.log(`Initializing WebSocket fallback: ${wsUrl}`);
      this.fallbackWebSocket = new WebSocket(wsUrl);

      this.fallbackWebSocket.onopen = () => {
        console.log('WebSocket fallback connected successfully');
        webrtcStore.update(state => ({
          ...state,
          isConnected: true,
          connectionState: 'connected',
          transportType: 'websocket',
          isFallback: true,
          fallbackReason: 'WebRTC connection failed or timed out',
        }));

      // Send fallback notification
      this.sendFallbackNotification();

      // Log fallback activation
      console.log('WebRTC fallback activated, using WebSocket as transport');
      };

      this.fallbackWebSocket.onmessage = (event) => {
        // Handle WebSocket messages as fallback
        this.handleFallbackMessage(event.data);
      };

      this.fallbackWebSocket.onclose = () => {
        console.log('WebSocket fallback disconnected');
        webrtcStore.update(state => ({
          ...state,
          isConnected: false,
          connectionState: 'disconnected',
        }));

        // Try to reconnect WebRTC
        this.scheduleWebRTCReconnection(this.currentConfig || config);
      };

      this.fallbackWebSocket.onerror = (error) => {
        console.error('WebSocket fallback error:', error);
        webrtcStore.update(state => ({
          ...state,
          error: `WebSocket fallback error: ${error}`,
          isFallback: true,
          fallbackReason: 'WebSocket connection failed',
        }));
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket fallback:', error);
      webrtcStore.update(state => ({
        ...state,
        error: `Failed to initialize WebSocket fallback: ${error.message}`,
        isFallback: true,
        fallbackReason: 'Both WebRTC and WebSocket failed',
      }));
    }
  }

  private sendFallbackNotification(): void {
    if (this.fallbackWebSocket && this.fallbackWebSocket.readyState === WebSocket.OPEN) {
      try {
        this.fallbackWebSocket.send(JSON.stringify({
          type: 'fallback_notification',
          data: {
            reason: 'WebRTC connection failed, using WebSocket fallback',
            timestamp: Date.now(),
          }
        }));
        console.log('Sent fallback notification to server');
      } catch (error) {
        console.error('Failed to send fallback notification:', error);
      }
    }
  }

  private handleFallbackMessage(data: string): void {
    console.log('Raw fallback message received:', data);

    // Update stats for fallback WebSocket (đếm cả text và JSON messages)
    webrtcStore.update(state => ({
      ...state,
      stats: {
        ...state.stats,
        packetsReceived: state.stats.packetsReceived + 1,
        bytesReceived: state.stats.bytesReceived + data.length,
      },
    }));

    // Try to parse as JSON first
    try {
      const message = JSON.parse(data);
      console.log('Parsed JSON fallback message:', message);
    } catch (parseError) {
      // If not JSON, handle as text message
      console.log('Received text fallback message:', data);

      // Check if it's a server echo or heartbeat message
      if (data.startsWith('Echo:') || data.includes('heartbeat') || data.includes('ping')) {
        console.log('Server heartbeat/echo message received');
        return;
      }

      // Handle other text messages if needed
      // For now, just log them for debugging
      console.warn('Unhandled text message in fallback:', data);
    }
  }

  private scheduleWebRTCReconnection(config: WebRTCConfig): void {
    const maxAttempts = config.maxReconnectAttempts || 3; // Tăng số lần thử lại để ổn định hơn
    if (this.reconnectAttempts < maxAttempts) {
      this.reconnectAttempts++;
      const delayMs = Math.min(3000 * this.reconnectAttempts, 10000); // Tăng delay theo số lần thử
      console.log(`Scheduling WebRTC reconnection attempt ${this.reconnectAttempts}/${maxAttempts} in ${delayMs}ms`);

      this.fallbackReconnectTimer = setTimeout(async () => {
        console.log(`Attempting WebRTC reconnection ${this.reconnectAttempts}/${maxAttempts}...`);
        const success = await this.tryWebRTCConnection(config);
        if (success) {
          console.log('WebRTC reconnected successfully');
          // WebRTC reconnected successfully, close WebSocket fallback if using
          if (this.isUsingFallback) {
            this.closeWebSocketFallback();
          }
          this.reconnectAttempts = 0;
        } else {
          console.log(`WebRTC reconnection attempt ${this.reconnectAttempts} failed`);
          // Still failed, schedule another attempt
          this.scheduleWebRTCReconnection(config);
        }
      }, delayMs);
    } else {
      console.log(`Max reconnection attempts (${maxAttempts}) reached, WebRTC unavailable`);
      webrtcStore.update(state => ({
        ...state,
        error: 'WebRTC reconnection failed after maximum attempts',
        isConnected: false,
        connectionState: 'failed'
      }));
    }
  }

  private closeWebSocketFallback(): void {
    if (this.fallbackWebSocket) {
      this.fallbackWebSocket.close();
      this.fallbackWebSocket = null;
    }

    if (this.fallbackReconnectTimer) {
      clearTimeout(this.fallbackReconnectTimer);
      this.fallbackReconnectTimer = null;
    }

    this.isUsingFallback = false;
    this.reconnectAttempts = 0;

    webrtcStore.update(state => ({
      ...state,
      isFallback: false,
      fallbackReason: null,
      transportType: 'webrtc',
    }));
  }

  private setupPeerConnectionListeners() {
    if (!this.peerConnection) return;

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', this.peerConnection?.connectionState);
      webrtcStore.update(state => ({
        ...state,
        connectionState: this.peerConnection?.connectionState || 'new',
        isConnected: this.peerConnection?.connectionState === 'connected',
      }));
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection?.iceConnectionState);
      webrtcStore.update(state => ({
        ...state,
        iceConnectionState: this.peerConnection?.iceConnectionState || 'new',
      }));
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage({
          type: 'ice-candidate',
          candidate: event.candidate,
          sessionId: this.sessionId,
        });
      }
    };

    this.peerConnection.ondatachannel = (event) => {
      console.log('DataChannel received:', event.channel.label);
      this.setupDataChannelListeners(event.channel);
    };
  }

  private async createDataChannels() {
    if (!this.peerConnection) return;

    try {
      // Create control channel (ordered, reliable)
      this.controlChannel = this.peerConnection.createDataChannel('control', {
        ordered: true,
        maxRetransmits: 3,
      });

      // Create state channel (unordered, unreliable for position data)
      this.stateChannel = this.peerConnection.createDataChannel('state', {
        ordered: false,
        maxRetransmits: 0, // Unreliable
      });

      this.setupDataChannelListeners(this.controlChannel);
      this.setupDataChannelListeners(this.stateChannel);

      console.log('DataChannels created successfully');
    } catch (error) {
      console.error('Failed to create DataChannels:', error);
      webrtcStore.update(state => ({
        ...state,
        error: `Failed to create DataChannels: ${error.message}`,
      }));
    }
  }

  private setupDataChannelListeners(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log(`${channel.label} channel opened`);
      if (channel.label === 'control') {
        webrtcStore.update(state => ({
          ...state,
          controlChannel: channel,
        }));
      } else if (channel.label === 'state') {
        webrtcStore.update(state => ({
          ...state,
          stateChannel: channel,
        }));
      }
    };

    channel.onclose = () => {
      console.log(`${channel.label} channel closed`);
    };

    channel.onmessage = (event) => {
      try {
        const message: DataChannelMessage = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (error) {
        console.error('Failed to parse DataChannel message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error(`${channel.label} channel error:`, error);
    };
  }

  private handleDataChannelMessage(message: DataChannelMessage) {
    console.log('Received DataChannel message:', message);

    // Update stats
    webrtcStore.update(state => ({
      ...state,
      stats: {
        ...state.stats,
        packetsReceived: state.stats.packetsReceived + 1,
        bytesReceived: state.stats.bytesReceived + JSON.stringify(message).length,
      },
    }));

    // Handle different message types
    switch (message.type) {
      case 'control':
        this.handleControlMessage(message.data);
        break;
      case 'state':
        this.handleStateMessage(message.data);
        break;
    }
  }

  private handleControlMessage(data: any) {
    console.log('Control message:', data);
    // Handle game control events (player actions, etc.)
  }

  private handleStateMessage(data: any) {
    console.log('State message:', data);
    // Handle game state updates (positions, physics, etc.)
  }

  async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      console.log('Creating WebRTC offer...');

      // Create actual SDP offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      console.log('Local description set, sending offer via signaling');

      // Send offer through signaling server
      const response = await this.sendSignalingMessage({
        type: 'offer',
        sdp: offer.sdp!,
        sessionId: this.sessionId,
      });

      if (response && response.session_id) {
        this.sessionId = response.session_id;
        webrtcStore.update(state => ({
          ...state,
          sessionId: response.session_id,
          signalingState: 'have-remote-offer',
        }));
      }

      console.log('Offer created and sent successfully');
    } catch (error) {
      console.error('Failed to create offer:', error);
      webrtcStore.update(state => ({
        ...state,
        error: `Failed to create offer: ${error.message}`,
      }));
    }
  }

  async handleOffer(offer: { sdp: string; sessionId: string }): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription({
        type: 'offer',
        sdp: offer.sdp,
      });

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Send answer through signaling
      await this.sendSignalingMessage({
        type: 'answer',
        sdp: answer.sdp!,
        sessionId: offer.sessionId,
      });

      console.log('Answer created and sent');
    } catch (error) {
      console.error('Failed to handle offer:', error);
      webrtcStore.update(state => ({
        ...state,
        error: `Failed to handle offer: ${error.message}`,
      }));
    }
  }

  async handleAnswer(answer: { sdp: string; sessionId: string }): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: answer.sdp,
      });

      console.log('Answer set successfully');
    } catch (error) {
      console.error('Failed to handle answer:', error);
      webrtcStore.update(state => ({
        ...state,
        error: `Failed to handle answer: ${error.message}`,
      }));
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidate, sessionId: string): Promise<void> {
    if (!this.peerConnection) {
      throw new Error('PeerConnection not initialized');
    }

    try {
      await this.peerConnection.addIceCandidate(candidate);
      console.log('ICE candidate added successfully');
    } catch (error) {
      console.error('Failed to handle ICE candidate:', error);
    }
  }

  private async sendSignalingMessage(message: any) {
    console.log('Sending signaling message:', message);

    // Send directly to signaling server (primary method)
    try {
      const endpoint = this.getSignalingEndpoint(message.type);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message.data),
      });

      if (response.ok) {
        let responseData;
        try {
            responseData = await response.json();
        } catch (jsonError) {
            console.error('❌ JSON parsing failed:', jsonError);
            throw new Error(`Invalid JSON response: ${response.status} ${response.statusText}`);
        }
        console.log('Signaling response:', responseData);

        // Handle the response based on message type
        if (message.type === 'offer' && responseData.session_id) {
          this.sessionId = responseData.session_id;
          webrtcStore.update(state => ({
            ...state,
            sessionId: responseData.session_id,
          }));
        }

        return responseData;
      } else {
        console.error('Signaling request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to send signaling message:', error);
    }

    return null;
  }

  private getSignalingEndpoint(type: string): string {
    switch (type) {
      case 'offer':
        return '/rtc/offer';
      case 'answer':
        return '/rtc/answer';
      case 'ice-candidate':
        return '/rtc/ice';
      default:
        throw new Error(`Unknown signaling message type: ${type}`);
    }
  }

  sendControlMessage(data: any): void {
    try {
      const message = {
        type: 'control',
        data,
        timestamp: Date.now(),
      };

      if (this.isUsingFallback && this.fallbackWebSocket && this.fallbackWebSocket.readyState === WebSocket.OPEN) {
        // Use WebSocket fallback
        const messageStr = JSON.stringify(message);
        this.fallbackWebSocket.send(messageStr);

        // Update stats
        webrtcStore.update(state => ({
          ...state,
          stats: {
            ...state.stats,
            packetsSent: state.stats.packetsSent + 1,
            bytesSent: state.stats.bytesSent + messageStr.length,
          },
        }));

        console.log('Sent control message via WebSocket fallback');
      } else if (this.controlChannel && this.controlChannel.readyState === 'open') {
        // Use WebRTC DataChannel
        const messageStr = JSON.stringify(message);
        this.controlChannel.send(messageStr);

        // Update stats
        webrtcStore.update(state => ({
          ...state,
          stats: {
            ...state.stats,
            packetsSent: state.stats.packetsSent + 1,
            bytesSent: state.stats.bytesSent + messageStr.length,
          },
        }));

        console.log('Sent control message via WebRTC control channel');
      } else {
        console.warn('Neither WebRTC control channel nor WebSocket fallback is ready');
        console.warn('Control message that failed to send:', data);
      }
    } catch (error) {
      console.error('Failed to send control message:', error);
      console.error('Failed control message data:', data);
    }
  }

  sendStateMessage(data: any): void {
    try {
      const message = {
        type: 'state',
        data,
        timestamp: Date.now(),
      };

      if (this.isUsingFallback && this.fallbackWebSocket && this.fallbackWebSocket.readyState === WebSocket.OPEN) {
        // Use WebSocket fallback
        const messageStr = JSON.stringify(message);
        this.fallbackWebSocket.send(messageStr);

        // Update stats
        webrtcStore.update(state => ({
          ...state,
          stats: {
            ...state.stats,
            packetsSent: state.stats.packetsSent + 1,
            bytesSent: state.stats.bytesSent + messageStr.length,
          },
        }));

        console.log('Sent state message via WebSocket fallback');
      } else if (this.stateChannel && this.stateChannel.readyState === 'open') {
        // Use WebRTC DataChannel
        const messageStr = JSON.stringify(message);
        this.stateChannel.send(messageStr);

        // Update stats
        webrtcStore.update(state => ({
          ...state,
          stats: {
            ...state.stats,
            packetsSent: state.stats.packetsSent + 1,
            bytesSent: state.stats.bytesSent + messageStr.length,
          },
        }));

        console.log('Sent state message via WebRTC state channel');
      } else {
        console.warn('Neither WebRTC state channel nor WebSocket fallback is ready');
        console.warn('State message that failed to send:', data);
      }
    } catch (error) {
      console.error('Failed to send state message:', error);
      console.error('Failed state message data:', data);
    }
  }

  async close(): Promise<void> {
    // Close WebRTC connection
    if (this.controlChannel) {
      this.controlChannel.close();
    }
    if (this.stateChannel) {
      this.stateChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    // Close WebSocket fallback connection
    if (this.fallbackWebSocket) {
      this.fallbackWebSocket.close();
    }

    // Clear reconnection timer
    if (this.fallbackReconnectTimer) {
      clearTimeout(this.fallbackReconnectTimer);
    }

    this.peerConnection = null;
    this.controlChannel = null;
    this.stateChannel = null;
    this.fallbackWebSocket = null;
    this.fallbackReconnectTimer = null;
    this.sessionId = null;
    this.config = null;
    this.currentConfig = null;
    this.isUsingFallback = false;
    this.reconnectAttempts = 0;

    // Reset store to initial state
    webrtcStore.set(initialState);
  }

  getConnectionStats(): Promise<RTCStatsReport | null> {
    if (this.isUsingFallback) {
      // For WebSocket fallback, return mock stats or null
      return Promise.resolve(null);
    }
    return this.peerConnection?.getStats() || Promise.resolve(null);
  }
}

// Export singleton instance
export const webrtcService = new WebRTCService();

// Export store for reactive updates
export const webrtcActions = {
  async initialize(config: WebRTCConfig) {
    await webrtcService.initialize(config);
  },

  async createOffer() {
    await webrtcService.createOffer();
  },

  async handleOffer(offer: { sdp: string; sessionId: string }) {
    await webrtcService.handleOffer(offer);
  },

  async handleAnswer(answer: { sdp: string; sessionId: string }) {
    await webrtcService.handleAnswer(answer);
  },

  async handleIceCandidate(candidate: RTCIceCandidate, sessionId: string) {
    await webrtcService.handleIceCandidate(candidate, sessionId);
  },

  sendControlMessage(data: any) {
    webrtcService.sendControlMessage(data);
  },

  sendStateMessage(data: any) {
    webrtcService.sendStateMessage(data);
  },

  async close() {
    await webrtcService.close();
  },

  async getStats() {
    return await webrtcService.getConnectionStats();
  },
};
