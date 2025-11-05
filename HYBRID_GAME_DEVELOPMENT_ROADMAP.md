# 🚀 HYBRID GAME DEVELOPMENT ROADMAP
## Endless Runner → Multiplayer Boss Battles

---

## 📋 MỤC LỤC
- [Tổng Quan Dự Án Hiện Tại](#tổng-quan-dự-án-hiện-tại)
- [Ý Tưởng Game Hybrid](#ý-tưởng-game-hybrid)
- [Lộ Trình Phát Triển](#lộ-trình-phát-triển)
- [Technical Architecture](#technical-architecture)
- [Game Design Details](#game-design-details)
- [Risks & Mitigations](#risks--mitigations)

---

## 🎯 TỔNG QUAN DỰ ÁN HIỆN TẠI

### **Current State Analysis**
- **Game Engine**: Endless Runner 3D với Three.js ✅
- **Multiplayer Infrastructure**: Room system + WebRTC ✅
- **Backend**: Rust microservices (Gateway, Worker, Database) ✅
- **Authentication**: User management hoàn chỉnh ✅
- **Current Gameplay**: Basic endless runner với obstacles cơ bản ⚠️

### **Current Limitations**
- Procedural generation chưa có
- Power-up system chưa hoàn thiện
- Boss battles chưa tồn tại
- Transition từ single-player sang multiplayer chưa mượt

---

## 🎮 Ý TƯỞNG GAME HYBRID

### **Core Concept**
**Phase 1**: Endless Runner giống Subway Surfers (Single-player)
**Phase 2**: Multiplayer Boss Battles với bạn bè (Cooperative)

### **Unique Selling Points**
1. **Seamless Transition**: Từ endless runner sang boss battles
2. **Social Gameplay**: Team up với bạn bè đánh boss
3. **Progression Continuity**: Single-player progression ảnh hưởng multiplayer
4. **Hybrid Monetization**: Cosmetics + battle passes

---

## 📅 LỘ TRÌNH PHÁT TRIỂN

### **PHASE 1: ENDLESS RUNNER FOUNDATION** (4-6 tuần)
*Ưu tiên: Làm cho phần đầu game giống Subway Surfers*

#### **Sprint 1: Procedural Generation** (2 tuần)
- [ ] **Track Generation System**
  - Procedural track với curves và straight sections
  - Multiple lane system (3 lanes như Subway Surfers)
  - Dynamic difficulty scaling dựa theo distance/score

- [ ] **Enhanced Obstacle System**
  - Train obstacles (moving trains)
  - Static barriers (walls, fences)
  - Gap obstacles (broken tracks)
  - Low barriers (slide under)

- [ ] **Visual Polish**
  - Better 3D models cho track và obstacles
  - Particle effects cho movement
  - Enhanced lighting và shadows

#### **Sprint 2: Power-up & Progression** (2 tuần)
- [ ] **Power-up System**
  - Coin Magnet (hút coins từ xa)
  - Speed Boost (tăng tốc tạm thời)
  - Jump Boost (nhảy cao hơn)
  - Shield (bảo vệ khỏi obstacles)
  - Score Multiplier (nhân điểm)

- [ ] **Character System**
  - Multiple characters để unlock
  - Character-specific abilities
  - Cosmetic customization

- [ ] **Progression Mechanics**
  - XP và level system
  - Daily challenges
  - Achievement system

#### **Sprint 3: Core Gameplay Polish** (2 tuần)
- [ ] **Game Balance**
  - Obstacle spawn rates
  - Power-up frequency
  - Difficulty curve

- [ ] **UI/UX Improvements**
  - Better HUD design
  - Pause menu và settings
  - Tutorial system

- [ ] **Audio Enhancement**
  - Background music theo gameplay intensity
  - Sound effects cho mọi actions

### **PHASE 2: MOVEMENT-BASED BOSS BATTLES** (8-10 tuần)
*Ưu tiên: Implement movement-based boss combat với weapon shop*

#### **Sprint 4: Arena & Movement System** (2 tuần)
- [ ] **Circular Arena Design**
  - Boss positioning ở center với rotation mechanics
  - Multi-level arena layout với platforms
  - Environmental hazards (traps, moving platforms)
  - Spectator areas và viewing angles

- [ ] **Movement-Based Combat**
  - Run-and-gun mechanics (attack while moving)
  - Positioning system (front/back/sides damage modifiers)
  - Momentum-based attacks (speed affects damage)
  - Dodging integration với movement

- [ ] **Basic Boss Framework**
  - Simple boss với 2-3 attack patterns
  - Health và phase transition system
  - Basic AI state management

#### **Sprint 5: Weapon & Shop System** (2-3 tuần)
- [ ] **Weapon Categories**
  - Ranged weapons (guns, bows, magic projectiles)
  - Melee weapons (swords, hammers, energy blades)
  - Support weapons (healing guns, buff dispensers)
  - Environmental weapons (traps, turrets, area effects)

- [ ] **Shop & Economy**
  - Weapon shop UI với endless runner coins
  - Weapon purchasing và inventory system
  - Durability và ammo mechanics
  - Basic upgrade trees

- [ ] **Weapon Integration**
  - Attack animations và visual effects
  - Sound effects cho weapon types
  - Visual feedback cho hits và damage

#### **Sprint 6: Advanced Boss AI** (2-3 tuần)
- [ ] **Multiple Boss Types**
  - Ground-based (tank bosses với AoE attacks)
  - Flying (aerial bosses với dive attacks)
  - Multi-phase (transformation mechanics)
  - Environmental (using arena hazards)

- [ ] **Complex Attack Patterns**
  - AoE attacks khuyến khích movement
  - Targeted attacks theo player positions
  - Weak points thay đổi theo phases
  - Environmental hazard integration

- [ ] **Boss Balance & Difficulty**
  - Health scaling theo team size
  - Attack frequency và damage tuning
  - Phase transition timing

#### **Sprint 7: Team Coordination** (2-3 tuần)
- [ ] **Role System**
  - Tank: Absorb damage, taunt mechanics
  - DPS: High damage, weak point focus
  - Support: Healing, buffs, utility
  - Scout: Recon, positioning, coordination

- [ ] **Team Features**
  - Shared resources (ammo crates, health packs)
  - Team abilities và combo attacks
  - Communication system (pings, emotes)
  - Performance-based reward distribution

- [ ] **Social Integration**
  - Guild boss battles
  - Boss battle tournaments
  - Spectator mode với commentary
  - Boss kill highlights và sharing

### **PHASE 3: ADVANCED FEATURES & POLISH** (4-6 tuần)
*Ưu tiên: Advanced boss mechanics và performance optimization*

#### **Sprint 8: Advanced Gameplay** (2 tuần)
- [ ] **Advanced Boss Mechanics**
  - Multi-transformation bosses với complex phases
  - Environmental boss interactions và puzzle elements
  - Boss-specific strategies và weak point systems

- [ ] **Advanced Weapon System**
  - Weapon fusion và crafting mechanics
  - Special abilities và ultimate attacks
  - Team weapon synergies và combinations

- [ ] **Events & Seasons**
  - Seasonal boss events với unique mechanics
  - Limited-time challenges và special rewards
  - Community events và tournaments

#### **Sprint 9: Polish & Performance** (2-4 tuần)
- [ ] **Performance Optimization**
  - LOD system cho boss models và arenas
  - Object pooling cho weapons và effects
  - Network prediction và latency compensation

- [ ] **Cross-platform Testing**
  - Mobile optimization cho touch controls
  - Different device performance optimization
  - Network latency handling và prediction

- [ ] **Final Polish**
  - Complete tutorial system cho boss battles
  - Comprehensive settings và accessibility options
  - Achievement và progression showcase

---

## 🏗️ TECHNICAL ARCHITECTURE

### **Current Architecture Strengths**
- ✅ **Microservices** phù hợp cho scaling
- ✅ **WebRTC** cho real-time multiplayer
- ✅ **Rust backend** cho performance
- ✅ **Three.js** cho 3D graphics

### **Required Enhancements**
- **Procedural Generation Engine**
  - Track generation algorithms
  - Obstacle placement logic
  - Performance optimization

- **State Synchronization**
  - Boss battle state sync
  - Player progression sync
  - Seamless mode switching

- **Database Schema Updates**
  - Boss battle records
  - Team statistics
  - Guild data

---

## 🎨 GAME DESIGN DETAILS

### **Endless Runner Phase**
```
🎯 Goal: Replicate Subway Surfers feel
✅ 3-lane movement system
✅ Procedurally generated track
✅ Moving train obstacles
✅ Coin collection với magnet
✅ Power-ups với visual effects
✅ Progressive difficulty
```

### **Boss Battle Phase**
```
🎯 Goal: Movement-based cooperative boss fighting
✅ Multiple boss types với unique mechanics
✅ Team roles: Tank, DPS, Support, Scout
✅ Movement-based combat (chạy vòng quanh boss)
✅ Weapon shop system với endless runner coins
✅ Arena positioning system (front/back/sides damage)
✅ Boss progression với multi-phase fights
```

### **Transition Mechanics**
```
🎯 Goal: Seamless experience
✅ Level 10 unlock multiplayer
✅ Social hub introduction
✅ Progress carry-over
✅ Optional single-player bosses
```

---

## 🎯 **DETAILED BOSS BATTLE DESIGN**

### **Core Combat Concept** 🏃‍♂️⚔️
**Movement-Based Boss Combat:**
- Players chạy vòng tròn quanh boss ở center arena
- Attack while moving (không đứng yên như game thông thường)
- Weapon sử dụng để damage boss và tiêu hao HP
- Boss có multiple phases với attack patterns khác nhau

### **Arena Design** 🏟️
```javascript
✅ Circular arena với multi-level design
✅ Boss fixed position ở center với rotation mechanics
✅ Environmental hazards (traps, moving platforms)
✅ Spectator areas cho friends không tham gia
✅ Dynamic lighting theo boss phases
```

### **Weapon System** 🔫🛒
```javascript
✅ Coins từ endless runner → mua vũ khí ở shop
✅ Weapon categories:
  - Ranged: Guns, bows, magic projectiles
  - Melee: Swords, hammers, energy blades
  - Support: Healing guns, buff dispensers, shields
  - Environmental: Traps, turrets, area effects

✅ Weapon progression:
  - Durability và ammo systems
  - Upgrade trees với specializations
  - Cosmetic skins và visual effects
  - Team loadouts và strategies
```

### **Boss AI & Mechanics** 🤖
```javascript
✅ Multiple boss types:
  - Ground-based (tank bosses với AoE attacks)
  - Flying (aerial bosses với dive attacks)
  - Multi-phase (transformation mechanics)
  - Environmental (using arena hazards)

✅ Attack patterns:
  - AoE attacks khuyến khích movement
  - Targeted attacks theo player positions
  - Weak points thay đổi theo phases
  - Environmental interactions
```

### **Team Coordination** 👥
```javascript
✅ Roles & Responsibilities:
  - Tank: Absorb damage, taunt boss
  - DPS: High damage output, focus weak points
  - Support: Healing, buffs, utility
  - Scout: Recon, positioning, coordination

✅ Team Features:
  - Shared resources (ammo crates, health packs)
  - Team abilities (group buffs, combo attacks)
  - Communication system (pings, emotes)
  - Performance-based rewards
```

### **Boss Battle Flow** ⚡
```javascript
Phase 1: Preparation (30 seconds)
- Team gathers, chooses weapons
- Boss introduction và mechanics explanation
- Arena setup và environmental effects

Phase 2: Combat (5-10 minutes)
- Run-and-gun mechanics
- Boss phase transitions
- Environmental interactions
- Team coordination challenges

Phase 3: Victory/Defeat (30 seconds)
- Loot distribution system
- Performance scoring
- Progression rewards
- Retry mechanics (không lose tất cả progress)
```

### **Economy Integration** 💰
```javascript
✅ Endless Runner → Boss Battles:
  - Coins từ endless runner mua vũ khí
  - XP từ cả 2 phases cộng dồn
  - Shared progression system

✅ Monetization:
  - Cosmetic weapon skins
  - Battle passes với exclusive weapons
  - Seasonal boss events
  - Guild tournaments
```

### **Technical Implementation** 🛠️
```javascript
✅ Synchronization Requirements:
  - Boss position và rotation sync
  - Player movement prediction
  - Attack collision detection
  - Health và damage calculations

✅ Performance Optimization:
  - LOD system cho boss models
  - Particle pooling cho effects
  - Network prediction cho smooth movement
  - Arena streaming (load/unload sections)
```

---

## ⚠️ RISKS & MITIGATIONS

### **Technical Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Performance Issues** | High | - LOD systems<br>- Object pooling<br>- Progressive loading |
| **Network Sync Issues** | High | - Client-side prediction<br>- Server reconciliation<br>- Fallback modes |
| **Memory Leaks** | Medium | - Proper cleanup<br>- Resource pooling<br>- Memory monitoring |

### **Game Design Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Grindy Gameplay** | High | - Multiple progression paths<br>- Daily challenges<br>- Social features |
| **Balance Issues** | Medium | - Extensive playtesting<br>- Data-driven balancing<br>- Community feedback |
| **Monetization** | Low | - Cosmetic focus<br>- Battle passes<br>- No pay-to-win |

### **Development Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Scope Creep** | High | - Strict sprint planning<br>- MVP-first approach<br>- Regular reviews |
| **Team Burnout** | Medium | - Realistic timelines<br>- Proper work-life balance<br>- Milestone celebrations |

---

## 📊 SUCCESS METRICS

### **Phase 1 Metrics**
- [ ] 1000+ daily active users trong endless runner mode
- [ ] 80% player retention sau 7 ngày
- [ ] Average session time: 10+ minutes

### **Phase 2 Metrics**
- [ ] 60% players reach level 10 (unlock multiplayer)
- [ ] 40% multiplayer mode engagement
- [ ] Boss battle completion rate: 70%

### **Technical Metrics**
- [ ] 60 FPS trên 90% devices
- [ ] <100ms latency trong boss battles
- [ ] <5% crash rate

---

## 🚀 NEXT STEPS

1. **Immediate Actions** (Tuần này):
   - Finalize game design document
   - Set up development environment
   - Plan first sprint (Procedural Generation)

2. **Short-term Goals** (1 tháng):
   - Complete Endless Runner foundation
   - Basic power-up system working
   - First playable build

3. **Medium-term Goals** (3 tháng):
   - Multiplayer transition working
   - Basic boss battles implemented
   - Alpha testing phase

4. **Long-term Goals** (6 tháng):
   - Full hybrid experience
   - Beta launch
   - Community building

---

## 💡 INNOVATION OPPORTUNITIES

1. **Procedural Boss Generation**: Bosses adapt theo team composition
2. **Dynamic Difficulty**: Boss difficulty scales với team skill
3. **Cross-mode Integration**: Endless runner items ảnh hưởng boss battles
4. **Social Features**: Guild systems, tournaments, leaderboards

---

*Document này sẽ được cập nhật liên tục dựa trên progress và feedback thực tế.*

**Bạn có muốn bắt đầu với Sprint 1 không? Tôi có thể giúp implement Procedural Track Generation ngay bây giờ!**
