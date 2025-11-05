# Infinite Runner 3D - Game Design Document

## 1. Tổng quan dự án
Tạo một **game endless runner 3D** chạy trên web với gameplay cuốn hút, nơi người chơi điều khiển nhân vật chạy liên tục về phía trước, thu thập năng lượng và vượt qua các chướng ngại vật trong môi trường 3D sống động.

### 1.1 Gameplay cơ bản
- Nhân vật tự động chạy về phía trước với tốc độ không đổi
- Người chơi sử dụng chuột để xoay camera và góc nhìn
- Điều khiển di chuyển ngang bằng phím A/D hoặc nút mũi tên ←/→
- Nhảy bằng phím Space hoặc nút ↑
- Trượt thấp bằng phím Shift hoặc nút ↓
- Thu thập các hạt năng lượng để tăng điểm và combo

### 1.2 Đặc điểm nổi bật
- **Endless generation**: Đường đua được tạo vô tận với các đoạn đa dạng
- **Dynamic camera**: Camera mượt mà theo chuyển động và góc nhìn
- **Physics-based**: Vật lý chân thực cho nhảy, va chạm và thu thập
- **Progressive difficulty**: Độ khó tăng dần theo thời gian chơi
- **Combo system**: Thu thập liên tiếp để nhân điểm

---

## 2. Công nghệ và thư viện

### 2.1 Core Technologies
- **Three.js** (r150+): Rendering engine 3D, camera, lighting
- **Rapier3D WASM**: Physics simulation (collision, gravity, forces)
- **Cannon.js** (alternative): Lightweight physics engine
- **Svelte/SvelteKit**: Framework for UI và game state management
- **Vite**: Fast build tool và development server

### 2.2 Svelte + Rapier Compatibility Analysis

**✅ Svelte - Rất phù hợp:**
- Lightweight framework (~2KB runtime)
- Reactive stores cho game state
- Component-based architecture
- Excellent performance cho UI và game logic
- Hot reload nhanh trong development

**✅ Rapier3D - Lý tưởng cho 3D game:**
- Physics engine WASM mạnh mẽ
- Performance cao hơn Cannon.js
- Collision detection chính xác
- Support rigid body dynamics
- Active development và community

### 2.3 Development Tools
- **TypeScript**: Type safety và better development experience
- **Vite Plugin GLTF**: For loading 3D models
- **@types/three**: TypeScript definitions for Three.js
- **@dimforge/rapier3d**: Rapier physics bindings
- **ESLint + Prettier**: Code formatting và linting

### 2.4 Setup Instructions

**Package.json dependencies:**
```json
{
  "dependencies": {
    "three": "^0.150.0",
    "@dimforge/rapier3d": "^0.11.0",
    "svelte": "^4.0.0"
  },
  "devDependencies": {
    "@types/three": "^0.150.0",
    "vite": "^4.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Rapier3D Integration:**
```typescript
// physics/PhysicsManager.ts
import { World, RigidBodyDesc, ColliderDesc } from '@dimforge/rapier3d';

export class PhysicsManager {
  private world: World;
  private rapier: any;

  async init() {
    // Dynamic import Rapier WASM
    const RAPIER = await import('@dimforge/rapier3d');
    this.rapier = RAPIER;
    this.world = new RAPIER.World({ x: 0.0, y: -9.81, z: 0.0 });
  }

  createPlayerBody(position: Vector3): RigidBody {
    let bodyDesc = RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y, position.z);
    return this.world.createRigidBody(bodyDesc);
  }
}
```

**Svelte Store Integration:**
```typescript
// stores/GameStore.ts
import { writable } from 'svelte/store';

export const gameState = writable({
  score: 0,
  isRunning: false,
  playerPosition: { x: 0, y: 0, z: 0 },
  cameraRotation: { x: 0, y: 0 }
});

export const physicsWorld = writable(null);
```

### 2.5 Alternative Options Analysis

**Svelte Alternatives:**
- **React**: Quá nặng cho game (large bundle size)
- **Vue**: Ít reactive hơn Svelte cho game state
- **Vanilla JS**: Không có reactive system tốt

**Physics Engine Alternatives:**
- **Cannon.js**: Lightweight hơn nhưng ít tính năng hơn Rapier
- **Ammo.js**: Chậm hơn và ít được maintain
- **Custom Physics**: Tốn thời gian phát triển và dễ lỗi

**Framework + Physics Verdict:**
```
Svelte + Rapier = ⭐⭐⭐⭐⭐ (Best Choice)
- Perfect match cho 3D web game
- Modern, performant, maintainable
- Excellent community support
```

### 2.6 Asset Pipeline
- **Blender**: 3D modeling for player, collectibles, environment
- **GIMP/Krita**: Texture creation and editing
- **Audacity**: Audio editing and effects
- **gltf-pipeline**: Model optimization and compression

---

## 3. Kiến trúc hệ thống chi tiết

```
/src
  /core
    /engine
      GameLoop.ts          # Main game loop với delta time
      InputManager.ts      # Xử lý input từ keyboard, mouse, touch
      PhysicsManager.ts    # Wrapper cho Rapier3D physics world
      SpawnManager.ts      # Tạo và quản lý các segment đường đua
      PoolManager.ts       # Object pooling cho hiệu suất tối ưu
      CameraController.ts  # Điều khiển camera theo mouse và player
    /entities
      Player.ts           # Nhân vật chính với animation và physics
      TrackSegment.ts     # Đoạn đường đua có thể tái sử dụng
      Collectible.ts      # Hạt năng lượng với physics và effects
      Obstacle.ts         # Chướng ngại vật (tùy chọn nâng cao)
    /world
      WorldGenerator.ts   # Procedural generation của track
      BiomeManager.ts     # Quản lý các loại môi trường khác nhau
      LightingManager.ts  # Dynamic lighting theo biome
    /ui
      HUD.svelte          # Score, combo, health display
      GameMenu.svelte     # Main menu, pause, game over
      Settings.svelte     # Graphics, audio, controls
      MobileControls.svelte # Touch controls for mobile
    /audio
      AudioManager.ts     # Quản lý âm thanh và nhạc nền
      SoundEffects.ts     # SFX cho jump, collect, death
    /utils
      Constants.ts        # Game constants và configuration
      Helpers.ts          # Utility functions
      MathUtils.ts        # Vector, quaternion helpers
  /assets
    /models
      player.glb         # 3D model nhân vật với animation
      collectible.glb    # Model hạt năng lượng
      track_segment.glb  # Template cho đường đua
    /textures
      biome1/            # Textures cho từng loại môi trường
      ui/                # UI textures và sprites
    /audio
      bgm/               # Background music cho các biome
      sfx/               # Sound effects
  /states
    GameState.ts        # Global game state management
    ScoreManager.ts     # Điểm số, combo, achievements
  App.svelte            # Main app component
  main.ts              # Application entry point
```

---

## 4. Cơ chế gameplay chi tiết

### 4.1 Điều khiển (Input System)
```typescript
// InputManager.ts - Các binding chính
enum InputAction {
  MOVE_LEFT = 'move_left',
  MOVE_RIGHT = 'move_right',
  JUMP = 'jump',
  SLIDE = 'slide',
  PAUSE = 'pause',
  CAMERA_ROTATE = 'camera_rotate'
}

interface InputBinding {
  keys: string[];
  mouse?: { button: number };
  touch?: { element: string };
  gamepad?: { button: number };
}
```

**Keyboard Controls:**
- `A` / `←` : Di chuyển trái
- `D` / `→` : Di chuyển phải
- `Space` / `↑` : Nhảy
- `Shift` / `↓` : Trượt thấp
- `P` / `ESC` : Pause menu

**Mouse Controls:**
- Chuột di chuyển: Xoay camera 360°
- Chuột phải giữ: Camera first-person view

**Touch Controls (Mobile):**
- Swipe left/right: Di chuyển ngang
- Tap: Nhảy
- Swipe down: Trượt
- Virtual joystick: Điều khiển camera

### 4.2 Hệ thống vật lý (Physics)
```typescript
// Physics constants
const PHYSICS_CONFIG = {
  GRAVITY: -9.81,
  PLAYER_SPEED: 10,           // m/s
  JUMP_FORCE: 8,              // m/s
  SLIDE_DURATION: 1000,       // ms
  LANE_WIDTH: 2,              // meters between lanes
  TRACK_SEGMENT_LENGTH: 20    // meters
}
```

**Collision Detection:**
- Capsule collider cho player
- Sphere collider cho collectibles
- Box collider cho obstacles
- Raycast để detect ground và lane position

### 4.3 Procedural Generation
**Track Segments:**
```typescript
interface TrackSegment {
  id: string;
  biome: BiomeType;
  length: number;
  lanes: Lane[];
  collectibles: CollectibleSpawn[];
  obstacles?: ObstacleSpawn[];
  decorations: Decoration[];
}
```

**Biome System:**
- **Forest Biome**: Cây cối, lá vàng, khúc gỗ
- **Desert Biome**: Cát, xương rồng, đá tảng
- **Ice Biome**: Tuyết, băng, cầu băng trượt
- **Fire Biome**: Dung nham, đá nóng, lửa

**Spawn Algorithm:**
```typescript
// SpawnManager.ts
class SpawnManager {
  generateNextSegment(currentBiome: BiomeType): TrackSegment {
    // Logic để tạo segment tiếp theo
    // Đảm bảo smooth transition giữa biomes
    // Spawn collectibles với mật độ hợp lý
  }
}
```

### 4.4 Camera System
**Camera Modes:**
- **Third Person**: Camera phía sau lưng player
- **First Person**: Camera từ mắt player (giữ chuột phải)
- **Cinematic**: Camera động khi nhảy cao hoặc sự kiện đặc biệt

**Camera Controller:**
```typescript
class CameraController {
  update(deltaTime: number, playerPosition: Vector3, mouseInput: MouseInput) {
    // Smooth follow player với damping
    // Rotate theo mouse movement với sensitivity setting
    // Handle camera collision với environment
  }
}
```

---

## 5. Scoring và Progression

### 5.1 Điểm hệ thống
**Thu thập năng lượng:**
- **Small Energy Orb**: +10 điểm
- **Medium Energy Orb**: +25 điểm
- **Large Energy Orb**: +50 điểm
- **Rare Energy Crystal**: +100 điểm + bonus effect

**Combo System:**
- Thu thập liên tiếp: Nhân điểm (x2, x3, x4...)
- Combo bar giảm dần theo thời gian
- Max combo: x10 multiplier

**Distance Bonus:**
- Mỗi 100m: +50 điểm bonus
- Tăng dần theo distance: 100m = +50, 200m = +150, etc.

### 5.2 Level Progression
**Speed Increase:**
- Mỗi 30 giây: Tăng tốc độ 5%
- Max speed: 200% tốc độ ban đầu

**Biome Changes:**
- Mỗi 500 điểm: Chuyển biome
- Biome ảnh hưởng đến gameplay và visuals

**Achievements:**
- **First Steps**: Chạy 100m
- **Energy Collector**: Thu thập 100 energy orbs
- **Combo Master**: Đạt x10 combo
- **Biome Explorer**: Thăm tất cả biomes

---

## 6. UI và UX Design

### 6.1 HUD Layout
```
┌─────────────────────────────────────────────────┐
│  Score: 1,250    High Score: 5,000    Combo: x3 │
│  Distance: 245m    Energy: ████████░░   85%    │
│  Speed: 12.5 m/s    Biome: Forest              │
└─────────────────────────────────────────────────┘
```

**HUD Elements:**
- **Score & Multiplier**: Top-left, real-time update
- **Distance & Speed**: Top-center, với animation
- **Combo Meter**: Top-right, với visual feedback
- **Energy Bar**: Bottom, hiển thị năng lượng còn lại
- **Minimap**: Corner, hiển thị upcoming track

### 6.2 Menu System
**Main Menu:**
- Play Game (Single Player)
- Settings (Graphics, Audio, Controls)
- Leaderboard (Local & Global)
- Credits

**Pause Menu:**
- Resume Game
- Restart Game
- Settings
- Exit to Menu

**Game Over Screen:**
- Final Score & Stats
- Personal Best Notification
- Retry Button
- Share Score Button

### 6.3 Mobile Optimization
**Touch Interface:**
- Virtual D-pad cho di chuyển
- Jump/Slide buttons
- Camera control area
- Settings cho touch sensitivity

---

## 7. Audio Design

### 7.1 Music System
**Biome-specific BGM:**
- **Forest**: Ambient forest sounds, light melody
- **Desert**: Middle-eastern inspired, percussion heavy
- **Ice**: Chilling ambient, wind sounds
- **Fire**: Intense orchestral, dramatic

**Dynamic Music:**
- Tempo tăng theo game speed
- Intensity thay đổi theo combo multiplier
- Crossfade mượt giữa biome transitions

### 7.2 Sound Effects
**Player Actions:**
- Jump: "Boing" spring sound
- Slide: "Swoosh" sliding sound
- Collect Energy: "Chime" với pitch theo size
- Death: "Crash" với impact sound

**Environment:**
- Biome ambient sounds
- Collectible spawn effects
- Speed boost whoosh
- Achievement unlock fanfare

---

## 8. Performance Optimization

### 8.1 Object Pooling
**Pooled Objects:**
- Track segments
- Collectibles
- Particles effects
- Audio sources

### 8.2 LOD System
**Level of Detail:**
- High detail gần player
- Medium detail mid-range
- Low detail far away
- Culling objects outside camera frustum

### 8.3 Memory Management
**Asset Loading:**
- Lazy load textures và models
- Unload unused biome assets
- Compress textures cho mobile

**Physics Optimization:**
- Disable physics cho objects xa
- Use simple colliders cho LOD objects
- Limit active physics bodies

---

## 9. Monetization và Analytics

### 9.1 Free-to-Play Model
**Cosmetic Items:**
- Player skins và trails
- Biome themes
- Special effects

**Premium Currency:**
- Daily login bonuses
- Achievement rewards
- In-app purchases

### 9.2 Analytics
**Player Behavior:**
- Session length và frequency
- Death causes và locations
- Popular biomes và strategies
- Conversion rates

---

## 10. Development Roadmap

### Phase 1: Core Gameplay (Week 1-2)
- [ ] Basic player movement và camera
- [ ] Simple track generation
- [ ] Basic collectible spawning
- [ ] Score system

### Phase 2: Polish (Week 3-4)
- [ ] Multiple biomes
- [ ] Advanced physics và animations
- [ ] Audio integration
- [ ] UI polish

### Phase 3: Features (Week 5-6)
- [ ] Mobile controls
- [ ] Achievements system
- [ ] Settings menu
- [ ] Performance optimization

### Phase 4: Launch (Week 7-8)
- [ ] Beta testing
- [ ] Bug fixes
- [ ] Performance tuning
- [ ] Deployment

---

## 11. Risk Assessment

**Technical Risks:**
- **WebGL Performance**: Mobile devices có thể gặp vấn đề với complex 3D scenes
- **Physics Simulation**: Rapier3D WASM có thể chậm trên devices cũ
- **Asset Loading**: Large 3D models có thể gây loading times lâu

**Design Risks:**
- **Difficulty Curve**: Cân bằng độ khó để giữ người chơi interested
- **Monetization**: Free-to-play model cần cẩn thận để không gây frustration

**Mitigation Strategies:**
- Progressive enhancement từ simple đến complex graphics
- Fallback physics engine nếu Rapier3D quá chậm
- LOD system và asset compression để tối ưu performance
