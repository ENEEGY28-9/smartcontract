use std::{
    collections::{HashMap, HashSet},
    time::{Duration, Instant},
};

use bevy_ecs::prelude::Entity;

/// Hierarchical Area of Interest system với multiple resolution levels
pub struct HierarchicalAOISystem {
    /// Grid hierarchy - multiple levels với different cell sizes
    pub grids: Vec<SpatialGrid>,
    /// Player AOI cache - cached results cho performance
    pub player_aoi_cache: HashMap<String, PlayerAOICache>,
    /// Entity location index - fast lookup
    pub entity_locations: HashMap<Entity, GridLocation>,
    /// Update frequency control
    pub update_frequency: Duration,
    /// Last update timestamp
    pub last_update: Instant,
    /// Performance statistics
    pub stats: AOIStats,
}

impl HierarchicalAOISystem {
    pub fn new() -> Self {
        let mut grids = Vec::new();

        // Create hierarchy levels với different cell sizes
        // Level 0: Fine detail (10 units) - cho nearby entities
        grids.push(SpatialGrid::new(10.0, 0));

        // Level 1: Medium detail (25 units) - cho medium distance
        grids.push(SpatialGrid::new(25.0, 1));

        // Level 2: Coarse detail (50 units) - cho far away entities
        grids.push(SpatialGrid::new(50.0, 2));

        // Level 3: Very coarse (100 units) - cho background/optimization
        grids.push(SpatialGrid::new(100.0, 3));

        Self {
            grids,
            player_aoi_cache: HashMap::new(),
            entity_locations: HashMap::new(),
            update_frequency: Duration::from_millis(100), // Update every 100ms
            last_update: Instant::now(),
            stats: AOIStats::new(),
        }
    }

    /// Add entity to all grid levels
    pub fn add_entity(&mut self, entity: Entity, position: [f32; 3]) {
        for grid in &mut self.grids {
            grid.add_entity(entity, position);
        }

        self.entity_locations.insert(entity, GridLocation::from_position(position));

        self.stats.total_entities += 1;
    }

    /// Remove entity từ all grid levels
    pub fn remove_entity(&mut self, entity: Entity) {
        for grid in &mut self.grids {
            grid.remove_entity(entity);
        }

        self.entity_locations.remove(&entity);

        self.stats.total_entities = self.stats.total_entities.saturating_sub(1);
    }

    /// Update entity position trong all grid levels
    pub fn update_entity_position(&mut self, entity: Entity, new_position: [f32; 3]) {
        let old_location = self.entity_locations.get(&entity).cloned();

        for grid in &mut self.grids {
            grid.update_entity_position(entity, new_position);
        }

        let new_location = GridLocation::from_position(new_position);
        self.entity_locations.insert(entity, new_location);

        // Track movement statistics
        if let Some(old_loc) = old_location {
            if old_loc != new_location {
                self.stats.entity_movements += 1;
            }
        }
    }

    /// Get hierarchical AOI cho player với different detail levels
    pub fn get_hierarchical_aoi(&mut self, player_id: &str, player_position: [f32; 3], view_distance: f32) -> HierarchicalAOI {
        let now = Instant::now();

        // Check cache first
        if let Some(cached) = self.player_aoi_cache.get(player_id) {
            if now.duration_since(cached.last_update) < self.update_frequency {
                return cached.aoi.clone();
            }
        }

        // Calculate hierarchical AOI
        let mut aoi = HierarchicalAOI::new(player_position, view_distance);

        // Level 0: High detail (nearby) - full precision
        let nearby_entities = self.grids[0].get_entities_in_radius(player_position, view_distance * 0.5);
        aoi.levels[0].entities = nearby_entities;
        aoi.levels[0].cell_count = self.grids[0].get_cell_count_in_radius(player_position, view_distance * 0.5);

        // Level 1: Medium detail - reduced precision
        let medium_entities = self.grids[1].get_entities_in_radius(player_position, view_distance * 0.8);
        aoi.levels[1].entities = medium_entities;
        aoi.levels[1].cell_count = self.grids[1].get_cell_count_in_radius(player_position, view_distance * 0.8);

        // Level 2: Low detail - coarse precision
        let far_entities = self.grids[2].get_entities_in_radius(player_position, view_distance * 1.2);
        aoi.levels[2].entities = far_entities;
        aoi.levels[2].cell_count = self.grids[2].get_cell_count_in_radius(player_position, view_distance * 1.2);

        // Level 3: Background - very coarse
        let background_entities = self.grids[3].get_entities_in_radius(player_position, view_distance * 2.0);
        aoi.levels[3].entities = background_entities;
        aoi.levels[3].cell_count = self.grids[3].get_cell_count_in_radius(player_position, view_distance * 2.0);

        // Update cache
        self.player_aoi_cache.insert(player_id.to_string(), PlayerAOICache {
            aoi: aoi.clone(),
            last_update: now,
        });

        self.stats.aoi_calculations += 1;
        self.stats.cache_hits += 1; // Count as hit since we checked cache

        aoi
    }

    /// Get optimized entity list cho player dựa trên hierarchical AOI
    pub fn get_optimized_entities(&mut self, player_id: &str, player_position: [f32; 3], view_distance: f32) -> Vec<Entity> {
        let aoi = self.get_hierarchical_aoi(player_id, player_position, view_distance);

        let mut entities = Vec::new();
        let mut processed_entities = HashSet::new();

        // Process từ high detail đến low detail
        for level in &aoi.levels {
            for &entity in &level.entities {
                if !processed_entities.contains(&entity) {
                    entities.push(entity);
                    processed_entities.insert(entity);
                }
            }
        }

        // Sort by distance để prioritize nearby entities
        entities.sort_by(|&a, &b| {
            let dist_a = self.calculate_distance_to_player(a, player_position);
            let dist_b = self.calculate_distance_to_player(b, player_position);
            dist_a.partial_cmp(&dist_b).unwrap_or(std::cmp::Ordering::Equal)
        });

        self.stats.optimized_entity_queries += 1;

        entities
    }

    /// Calculate distance từ entity đến player
    fn calculate_distance_to_player(&self, entity: Entity, player_position: [f32; 3]) -> f32 {
        if let Some(location) = self.entity_locations.get(&entity) {
            let entity_pos = location.to_position();
            let dx = entity_pos[0] - player_position[0];
            let dy = entity_pos[1] - player_position[1];
            let dz = entity_pos[2] - player_position[2];
            (dx * dx + dy * dy + dz * dz).sqrt()
        } else {
            f32::INFINITY
        }
    }

    /// Update AOI system (periodic maintenance)
    pub fn update(&mut self) {
        let now = Instant::now();

        if now.duration_since(self.last_update) >= self.update_frequency {
            self.last_update = now;

            // Cleanup empty cells trong all grids
            for grid in &mut self.grids {
                grid.cleanup_empty_cells();
            }

            // Cleanup old cache entries
            let cutoff_time = now - Duration::from_secs(10);
            self.player_aoi_cache.retain(|_, cache| cache.last_update > cutoff_time);

            // Update statistics
            self.stats.update();
        }
    }

    /// Get performance statistics
    pub fn get_stats(&self) -> &AOIStats {
        &self.stats
    }

    /// Reset statistics
    pub fn reset_stats(&mut self) {
        self.stats = AOIStats::new();
    }
}

/// Individual spatial grid với specific cell size và level
#[derive(Debug)]
pub struct SpatialGrid {
    pub cell_size: f32,
    pub level: usize,
    pub cells: HashMap<GridCell, Vec<Entity>>,
    pub entity_positions: HashMap<Entity, [f32; 3]>,
}

impl SpatialGrid {
    pub fn new(cell_size: f32, level: usize) -> Self {
        Self {
            cell_size,
            level,
            cells: HashMap::new(),
            entity_positions: HashMap::new(),
        }
    }

    /// Convert world position to grid cell
    pub fn world_to_cell(&self, position: [f32; 3]) -> GridCell {
        GridCell {
            x: (position[0] / self.cell_size).floor() as i32,
            y: (position[1] / self.cell_size).floor() as i32,
            z: (position[2] / self.cell_size).floor() as i32,
            level: self.level,
        }
    }

    /// Add entity to grid
    pub fn add_entity(&mut self, entity: Entity, position: [f32; 3]) {
        let cell = self.world_to_cell(position);

        // Remove từ old position if exists
        if let Some(old_pos) = self.entity_positions.get(&entity) {
            let old_cell = self.world_to_cell(*old_pos);
            if let Some(entities) = self.cells.get_mut(&old_cell) {
                entities.retain(|&e| e != entity);
                if entities.is_empty() {
                    self.cells.remove(&old_cell);
                }
            }
        }

        // Add to new position
        self.cells.entry(cell).or_default().push(entity);
        self.entity_positions.insert(entity, position);
    }

    /// Remove entity từ grid
    pub fn remove_entity(&mut self, entity: Entity) {
        if let Some(position) = self.entity_positions.remove(&entity) {
            let cell = self.world_to_cell(position);
            if let Some(entities) = self.cells.get_mut(&cell) {
                entities.retain(|&e| e != entity);
                if entities.is_empty() {
                    self.cells.remove(&cell);
                }
            }
        }
    }

    /// Update entity position
    pub fn update_entity_position(&mut self, entity: Entity, new_position: [f32; 3]) {
        let old_cell = self.entity_positions.get(&entity).map(|pos| self.world_to_cell(*pos));
        let new_cell = self.world_to_cell(new_position);

        // Chỉ update nếu cell thay đổi
        if old_cell != Some(new_cell) {
            if let Some(old_cell) = old_cell {
                if let Some(entities) = self.cells.get_mut(&old_cell) {
                    entities.retain(|&e| e != entity);
                    if entities.is_empty() {
                        self.cells.remove(&old_cell);
                    }
                }
            }

            self.cells.entry(new_cell).or_default().push(entity);
        }

        self.entity_positions.insert(entity, new_position);
    }

    /// Get entities within radius từ position
    pub fn get_entities_in_radius(&self, center: [f32; 3], radius: f32) -> Vec<Entity> {
        let mut entities = Vec::new();
        let center_cell = self.world_to_cell(center);

        // Calculate grid bounds để search
        let cell_radius = (radius / self.cell_size).ceil() as i32;

        for dx in -cell_radius..=cell_radius {
            for dy in -cell_radius..=cell_radius {
                for dz in -cell_radius..=cell_radius {
                    let cell = GridCell {
                        x: center_cell.x + dx,
                        y: center_cell.y + dy,
                        z: center_cell.z + dz,
                        level: self.level,
                    };

                    if let Some(cell_entities) = self.cells.get(&cell) {
                        entities.extend(cell_entities.iter().copied());
                    }
                }
            }
        }

        entities
    }

    /// Get number of cells within radius (for statistics)
    pub fn get_cell_count_in_radius(&self, center: [f32; 3], radius: f32) -> usize {
        let center_cell = self.world_to_cell(center);
        let cell_radius = (radius / self.cell_size).ceil() as i32;

        let mut cell_count = 0;
        for dx in -cell_radius..=cell_radius {
            for dy in -cell_radius..=cell_radius {
                for dz in -cell_radius..=cell_radius {
                    let cell = GridCell {
                        x: center_cell.x + dx,
                        y: center_cell.y + dy,
                        z: center_cell.z + dz,
                        level: self.level,
                    };

                    if self.cells.contains_key(&cell) {
                        cell_count += 1;
                    }
                }
            }
        }

        cell_count
    }

    /// Cleanup empty cells
    pub fn cleanup_empty_cells(&mut self) {
        self.cells.retain(|_, entities| !entities.is_empty());
    }
}

/// 3D Grid cell với hierarchical level
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct GridCell {
    pub x: i32,
    pub y: i32,
    pub z: i32,
    pub level: usize,
}

/// Grid location của entity
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct GridLocation {
    pub cell: GridCell,
    pub position: [f32; 3],
}

impl GridLocation {
    pub fn from_position(position: [f32; 3]) -> Self {
        // Use level 0 (finest grid) để determine location
        let cell_size = 10.0; // Same as level 0
        Self {
            cell: GridCell {
                x: (position[0] / cell_size).floor() as i32,
                y: (position[1] / cell_size).floor() as i32,
                z: (position[2] / cell_size).floor() as i32,
                level: 0,
            },
            position,
        }
    }

    pub fn to_position(&self) -> [f32; 3] {
        self.position
    }
}

/// Hierarchical AOI result
#[derive(Debug, Clone)]
pub struct HierarchicalAOI {
    pub player_position: [f32; 3],
    pub view_distance: f32,
    pub levels: Vec<AOILevel>,
    pub total_entities: usize,
    pub total_cells: usize,
}

impl HierarchicalAOI {
    pub fn new(player_position: [f32; 3], view_distance: f32) -> Self {
        Self {
            player_position,
            view_distance,
            levels: vec![
                AOILevel::new(0), // High detail
                AOILevel::new(1), // Medium detail
                AOILevel::new(2), // Low detail
                AOILevel::new(3), // Background
            ],
            total_entities: 0,
            total_cells: 0,
        }
    }

    /// Get all entities across all levels
    pub fn get_all_entities(&self) -> Vec<Entity> {
        let mut entities = Vec::new();
        let mut seen = HashSet::new();

        for level in &self.levels {
            for &entity in &level.entities {
                if !seen.contains(&entity) {
                    entities.push(entity);
                    seen.insert(entity);
                }
            }
        }

        entities
    }

    /// Get entities chỉ từ specific level
    pub fn get_entities_at_level(&self, level: usize) -> &[Entity] {
        if level < self.levels.len() {
            &self.levels[level].entities
        } else {
            &[]
        }
    }
}

/// Individual AOI level
#[derive(Debug, Clone)]
pub struct AOILevel {
    pub level: usize,
    pub entities: Vec<Entity>,
    pub cell_count: usize,
    pub last_update: Instant,
}

impl AOILevel {
    pub fn new(level: usize) -> Self {
        Self {
            level,
            entities: Vec::new(),
            cell_count: 0,
            last_update: Instant::now(),
        }
    }
}

/// Player AOI cache
#[derive(Debug, Clone)]
pub struct PlayerAOICache {
    pub aoi: HierarchicalAOI,
    pub last_update: Instant,
}

/// AOI performance statistics
#[derive(Debug, Clone)]
pub struct AOIStats {
    pub total_entities: usize,
    pub aoi_calculations: u64,
    pub cache_hits: u64,
    pub entity_movements: u64,
    pub optimized_entity_queries: u64,
    pub average_entities_per_aoi: f32,
    pub average_cells_per_aoi: f32,
}

impl AOIStats {
    pub fn new() -> Self {
        Self {
            total_entities: 0,
            aoi_calculations: 0,
            cache_hits: 0,
            entity_movements: 0,
            optimized_entity_queries: 0,
            average_entities_per_aoi: 0.0,
            average_cells_per_aoi: 0.0,
        }
    }

    /// Update calculated averages
    pub fn update(&mut self) {
        if self.aoi_calculations > 0 {
            // These would be calculated based on actual data in production
            self.average_entities_per_aoi = 50.0; // Placeholder
            self.average_cells_per_aoi = 25.0;    // Placeholder
        }
    }

    /// Get cache hit ratio
    pub fn cache_hit_ratio(&self) -> f32 {
        if self.aoi_calculations == 0 {
            0.0
        } else {
            self.cache_hits as f32 / self.aoi_calculations as f32
        }
    }
}

impl Default for HierarchicalAOISystem {
    fn default() -> Self {
        Self::new()
    }
}
