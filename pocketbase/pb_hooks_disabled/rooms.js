// Rooms collection hooks for automatic room management

// Hook that runs after updating a room record
onRecordAfterUpdateRequest((e) => {
    const record = e.record;
    const oldRecord = e.oldRecord;

    // Check if owner left the room
    if (oldRecord && record.owner_id !== oldRecord.owner_id) {
        console.log("Owner changed from " + oldRecord.owner_id + " to " + record.owner_id + " in room " + record.id);

        // If owner left and no members remain, delete the room
        if (!record.members || record.members.length === 0) {
            console.log("Room " + record.id + " is now empty, deleting...");
            $app.dao().deleteRecord($app.dao().findCollectionByNameOrId("rooms"), record.id);
            return;
        }

        // If owner left but members remain, transfer ownership to first member
        if (record.members && record.members.length > 0) {
            const newOwner = record.members[0];
            console.log("Transferring ownership of room " + record.id + " to " + newOwner);

            record.owner_id = newOwner;
            // Remove the new owner from members list since they're now owner
            record.members = record.members.filter(member => member !== newOwner);

            $app.dao().saveRecord(record);
        }
    }

    // Check if members list changed (someone left or was kicked)
    if (oldRecord && JSON.stringify(record.members) !== JSON.stringify(oldRecord.members)) {
        console.log("Members changed in room " + record.id + ":", record.members);

        // If room becomes empty and owner is gone, delete it
        if (!record.members || record.members.length === 0) {
            if (!record.owner_id) {
                console.log("Room " + record.id + " has no owner and no members, deleting...");
                $app.dao().deleteRecord($app.dao().findCollectionByNameOrId("rooms"), record.id);
                return;
            }
        }

        // If room exceeds max_members, this would be handled by validation rules
        // but we can log it here
        if (record.max_members && record.members && record.members.length > record.max_members) {
            console.warn("Room " + record.id + " has more members than max_members limit!");
        }
    }

    return e.next();
}, "rooms");

// Hook that runs before creating a room record
onRecordBeforeCreateRequest((e) => {
    const record = e.record;

    // Set default status to "waiting"
    if (!record.status) {
        record.status = "waiting";
    }

    // Ensure owner is in members list
    if (record.owner_id && (!record.members || !record.members.includes(record.owner_id))) {
        record.members = record.members || [];
        if (!record.members.includes(record.owner_id)) {
            record.members.push(record.owner_id);
        }
    }

    // Set default max_members if not provided
    if (!record.max_members) {
        record.max_members = 4;
    }

    return e.next();
}, "rooms");

// Hook that runs before updating a room record
onRecordBeforeUpdateRequest((e) => {
    const record = e.record;
    const oldRecord = e.oldRecord;

    // Validate that room doesn't exceed max_members
    if (record.max_members && record.members && record.members.length > record.max_members) {
        throw new BadRequestError("Cannot add more members than max_members limit");
    }

    // Ensure owner cannot be kicked (owner can only leave voluntarily)
    if (oldRecord && oldRecord.owner_id && record.members && !record.members.includes(oldRecord.owner_id)) {
        // If owner is being removed from members, this means owner is leaving
        // The after update hook will handle ownership transfer or deletion
        console.log("Owner " + oldRecord.owner_id + " is leaving room " + record.id);
    }

    return e.next();
}, "rooms");

// API endpoint to kick a member from a room
routerAdd("POST", "/api/rooms/:id/kick", (c) => {
    const roomId = c.pathParam("id");
    const requestData = c.request().json();
    const memberId = requestData.memberId;

    if (!memberId) {
        return c.json(400, { error: "memberId is required" });
    }

    // Get current user
    const authRecord = c.get("authRecord");
    if (!authRecord) {
        return c.json(401, { error: "Authentication required" });
    }

    // Get room
    const roomsCollection = $app.dao().findCollectionByNameOrId("rooms");
    const room = $app.dao().findRecordById(roomsCollection, roomId);

    if (!room) {
        return c.json(404, { error: "Room not found" });
    }

    // Check if current user is the owner
    if (room.owner_id !== authRecord.id) {
        return c.json(403, { error: "Only room owner can kick members" });
    }

    // Check if member exists in room
    if (!room.members || !room.members.includes(memberId)) {
        return c.json(400, { error: "Member not in room" });
    }

    // Cannot kick yourself (owner)
    if (memberId === room.owner_id) {
        return c.json(400, { error: "Cannot kick yourself" });
    }

    // Remove member from room
    room.members = room.members.filter(member => member !== memberId);

    // Save updated room
    $app.dao().saveRecord(room);

    return c.json(200, {
        message: "Member kicked successfully",
        room: room
    });
});

// API endpoint to leave a room
routerAdd("POST", "/api/rooms/:id/leave", (c) => {
    const roomId = c.pathParam("id");

    // Get current user
    const authRecord = c.get("authRecord");
    if (!authRecord) {
        return c.json(401, { error: "Authentication required" });
    }

    // Get room
    const roomsCollection = $app.dao().findCollectionByNameOrId("rooms");
    const room = $app.dao().findRecordById(roomsCollection, roomId);

    if (!room) {
        return c.json(404, { error: "Room not found" });
    }

    // Check if user is in the room
    const isOwner = room.owner_id === authRecord.id;
    const isMember = room.members && room.members.includes(authRecord.id);

    if (!isOwner && !isMember) {
        return c.json(400, { error: "You are not in this room" });
    }

    if (isOwner) {
        // Owner is leaving - the after update hook will handle ownership transfer or deletion
        room.owner_id = null;
    } else {
        // Member is leaving
        room.members = room.members.filter(member => member !== authRecord.id);
    }

    // Save updated room
    $app.dao().saveRecord(room);

    return c.json(200, {
        message: "Left room successfully",
        room: room
    });
});

// API endpoint to join a room
routerAdd("POST", "/api/rooms/:id/join", (c) => {
    const roomId = c.pathParam("id");
    const requestData = c.request().json();
    const password = requestData.password;

    // Get current user
    const authRecord = c.get("authRecord");
    if (!authRecord) {
        return c.json(401, { error: "Authentication required" });
    }

    // Get room
    const roomsCollection = $app.dao().findCollectionByNameOrId("rooms");
    const room = $app.dao().findRecordById(roomsCollection, roomId);

    if (!room) {
        return c.json(404, { error: "Room not found" });
    }

    // Check if room is private and password is required
    if (room.is_private && room.password) {
        if (!password || password !== room.password) {
            return c.json(403, { error: "Incorrect password" });
        }
    }

    // Check if room is full
    const currentMemberCount = (room.members ? room.members.length : 0) + (room.owner_id ? 1 : 0);
    if (room.max_members && currentMemberCount >= room.max_members) {
        return c.json(400, { error: "Room is full" });
    }

    // Check if user is already in the room
    if (room.owner_id === authRecord.id || (room.members && room.members.includes(authRecord.id))) {
        return c.json(400, { error: "You are already in this room" });
    }

    // Add user to members
    room.members = room.members || [];
    room.members.push(authRecord.id);

    // Save updated room
    $app.dao().saveRecord(room);

    return c.json(200, {
        message: "Joined room successfully",
        room: room
    });
});
