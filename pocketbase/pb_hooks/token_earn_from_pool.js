// Token earn from pool API endpoint - LOGIC ĐÚNG
// Player nhận token từ game pool (được auto-mint scheduler fill định kỳ)
// KHÔNG PHỤ THUỘC việc mint trực tiếp khi ăn particle

routerAdd("POST", "/api/token/earn-from-pool", (c) => {
    const requestData = c.request().json();
    const { particle_location, particle_type, amount = 1 } = requestData;

    // Get current user
    const authRecord = c.get("authRecord");
    if (!authRecord) {
        return c.json(401, { error: "Authentication required" });
    }

    // Validate required fields
    if (!particle_location || !Array.isArray(particle_location) || particle_location.length !== 2) {
        return c.json(400, { error: "particle_location must be [x, y] array" });
    }

    if (!particle_type) {
        return c.json(400, { error: "particle_type is required" });
    }

    if (amount <= 0) {
        return c.json(400, { error: "amount must be positive" });
    }

    // Get database
    const db = $app.dao();

    try {
        // Get user's energy record
        const energiesCollection = db.findCollectionByNameOrId("energies");
        const energyRecord = db.findFirstRecordByFilter(
            "energies",
            `user_id = "${authRecord.id}"`
        );

        if (!energyRecord) {
            return c.json(404, { error: "User energy record not found" });
        }

        // TODO: Check game pool balance (simulate for now)
        // In real implementation, this would check the smart contract game pool balance
        const gamePoolBalance = 1000; // Mock value - should come from smart contract
        if (gamePoolBalance < amount) {
            return c.json(400, {
                error: "Insufficient game pool balance",
                remaining_pool: gamePoolBalance
            });
        }

        // Update user balance
        const currentPoints = energyRecord.getInt("points") || 0;
        const newPoints = currentPoints + amount;

        energyRecord.set("points", newPoints);
        energyRecord.set("last_updated", new Date().toISOString());

        // Save updated record
        db.saveRecord(energyRecord);

        // Log the earning activity
        console.log(`🎯 User ${authRecord.email} earned ${amount} tokens from pool`);
        console.log(`   Particle location: [${particle_location[0]}, ${particle_location[1]}]`);
        console.log(`   New balance: ${newPoints}`);
        console.log(`   Pool remaining: ${gamePoolBalance - amount}`);

        return c.json(200, {
            success: true,
            new_balance: newPoints,
            earned: amount,
            remaining_pool: gamePoolBalance - amount,
            particle_location,
            particle_type,
            tx_signature: `mock_tx_${Date.now()}`, // Mock transaction signature
            message: `Earned ${amount} tokens from game pool`
        });

    } catch (error) {
        console.error("Error earning tokens from pool:", error);
        return c.json(500, {
            error: "Internal server error",
            details: error.message
        });
    }
});

// Admin endpoint to simulate auto-mint (for testing)
routerAdd("POST", "/api/admin/auto-mint", (c) => {
    // Get current user
    const authRecord = c.get("authRecord");
    if (!authRecord) {
        return c.json(401, { error: "Authentication required" });
    }

    // TODO: Add admin role check
    // For now, allow any authenticated user for testing

    const requestData = c.request().json();
    const { amount = 100 } = requestData;

    if (amount <= 0) {
        return c.json(400, { error: "amount must be positive" });
    }

    try {
        // Simulate auto-mint distribution
        const gameAmount = Math.floor(amount * 0.8); // 80%
        const ownerAmount = Math.floor(amount * 0.2); // 20%

        console.log(`🚀 Auto-mint triggered:`);
        console.log(`   Total: ${amount} tokens`);
        console.log(`   Game pool: ${gameAmount} tokens (80%)`);
        console.log(`   Owner wallet: ${ownerAmount} tokens (20%)`);
        console.log(`   Triggered by: ${authRecord.email}`);

        return c.json(200, {
            success: true,
            total_minted: amount,
            game_pool: gameAmount,
            owner_wallet: ownerAmount,
            distribution: "80/20",
            tx_signature: `auto_mint_tx_${Date.now()}`,
            message: `Auto-minted ${amount} tokens with 80/20 distribution`
        });

    } catch (error) {
        console.error("Error in auto-mint:", error);
        return c.json(500, {
            error: "Internal server error",
            details: error.message
        });
    }
});
