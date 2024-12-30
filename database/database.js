const sqlite3 = require("sqlite3").verbose();

// Connect to the database
const db = new sqlite3.Database("./database/hot_seat_reservation.db", sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error("Error connecting to database:", err.message);
    } else {
        console.log("Connected to the database.");
    }
});




function createTable() {
    const floor = `CREATE TABLE IF NOT EXISTS floor (
        floor_id INTEGER PRIMARY KEY AUTOINCREMENT, 
        floor_name TEXT UNIQUE
    );`;
    db.run(floor, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });

    const area = `CREATE TABLE IF NOT EXISTS area (
        area_id INTEGER PRIMARY KEY AUTOINCREMENT,
        area_name TEXT,
        floor_id INTEGER,
        image_url TEXT DEFAULT NULL,
        FOREIGN KEY (floor_id) REFERENCES floor (floor_id)
    );`;
    db.run(area, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });

    const hot_seat = `CREATE TABLE IF NOT EXISTS hot_seat (
        hot_seat_id INTEGER PRIMARY KEY AUTOINCREMENT,
        hot_seat_name TEXT,
        area_id INTEGER,
        FOREIGN KEY (area_id) REFERENCES area (area_id)
    );`;
    db.run(hot_seat, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });

    const reservation = `CREATE TABLE IF NOT EXISTS reservation (
        reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        time_slot TEXT,
        hot_seat_id INTEGER,
        user_id VARCHAR,
        FOREIGN KEY (hot_seat_id) REFERENCES hot_seat (hot_seat_id)
    );`;
    db.run(reservation, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });

    const admin = `CREATE TABLE IF NOT EXISTS admin (
        admin_id VARCHAR PRIMARY KEY, 
        admin_name TEXT,
        admin_pin VARCHAR(6)
    );`;
    db.run(admin, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });

    const permanent_seat = `CREATE TABLE IF NOT EXISTS permanent_seat (
        permanent_seat_id INTEGER PRIMARY KEY AUTOINCREMENT, 
        user_id VARCHAR,
        hot_seat_id INTEGER,
        FOREIGN KEY (hot_seat_id) REFERENCES hot_seat (hot_seat_id)
    );`;
    db.run(permanent_seat, (err) => {
        if (err) {
            console.error("Error creating table:", err.message);
        } else {
            console.log("Table created or already exists.");
        }
    });
}


function insertFloor(floorName) {
    const sql = `INSERT INTO floor(floor_name) VALUES (?)`;
    db.run(sql, [floorName], (err) => {
        if (err) {
            console.error("Error inserting data:", err.message);
        } else {
            console.log(`Inserted floor: ${floorName}`);
        }
    });
}

function insertArea(areaName, floorId) {
    const sql = `INSERT INTO area(area_name, floor_id) VALUES (?, ?)`;
    db.run(sql, [areaName, floorId], (err) => {
        if (err) {
            console.error("Error inserting data:", err.message);
        } else {
            console.log(`Inserted area: ${areaName}`);
        }
    });
}

function updateAreaImageUrl(areaId, imageUrl) {
    const sql = `UPDATE area SET image_url = ? WHERE area_id = ?`;
    db.run(sql, [imageUrl, areaId], (err) => {
        if (err) {
            console.error("Error updating image URL:", err.message);
        } else {
            console.log(`Updated image URL for area ID: ${areaId}`);
        }
    });
}


function insertPermanentSeat(userId, hotSeatId) {
    const sql = `INSERT INTO permanent_seat(user_id, hot_seat_id) VALUES (?, ?)`;
    db.run(sql, [userId, hotSeatId], (err) => {
        if (err) {
            console.error("Error inserting data:", err.message);
        } else {
            console.log(`Inserted permanent hot_seat: ${hotSeatId} for userId: ${userId}`);
        }
    });
}


function insertHotSeat(hotSeatName, areaId) {
    const sql = `INSERT INTO hot_seat(hot_seat_name, area_id) VALUES (?, ?)`;
    db.run(sql, [hotSeatName, areaId], (err) => {
        if (err) {
            console.error("Error inserting data:", err.message);
        } else {
            console.log(`Inserted hot seat: ${hotSeatName}`);
        }
    });
}

function insertAdmin(userId, userName) {
    const sql = `INSERT INTO admin(admin_id, admin_name, admin_pin) VALUES (?, ?, ?)`;
    db.run(sql, [userId, userName, '123456'], (err) => {
        if (err) {
            console.error("Error inserting data:", err.message);
        } else {
            console.log(`Inserted Admin: ${userName}`);
        }
    });
}

function isAvailableArea(areaName, floorId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM area WHERE area_name = ? AND floor_id = ?`;

        db.all(sql, [areaName, floorId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                if (rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

function isAvailableHotSeat(hotSeatName, areaId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM hot_seat WHERE hot_seat_name = ? AND area_id = ?`;

        db.all(sql, [hotSeatName, areaId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                if (rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

function isUserAdmin(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM admin WHERE admin_id = ?`;

        db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                if (rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    });
}

function isPermanentHotSeatUser(userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM permanent_seat WHERE user_id = ?`;

        db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                if (rows.length > 0) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    });
}


function getReservedSeatByHotSeatId(hotSeatId) {
    const sql = `SELECT * FROM permanent_seat WHERE hot_seat_id = ?`;
    return new Promise((resolve, reject) => {
        db.all(sql, [hotSeatId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function checkPinInDatabase(userId, enteredPin) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM admin WHERE admin_id = ? AND admin_pin = ?`;
        db.all(sql, [userId, enteredPin], (err, rows) => {
            if (err) {
                reject(err); 
            } else {
                if (rows.length > 0) {
                    resolve(true); 
                } else {
                    resolve(false); 
                }
            }
        });
    });
}


function deleteHotSeat(hotSeatId) {
    const sql = `DELETE FROM hot_seat WHERE hot_seat_id = ?`;
    db.run(sql, hotSeatId, (err) => {
        if (err) {
            console.error("Error in deleting the hot seat: ", err.message);
        } else {
            console.log(`Successsfully deleted hot seat: ${hotSeatId}`);
        }
    })
}

function deleteAreaById(areaId) {
    const sql = `DELETE FROM area WHERE area_id = ?`;
    db.run(sql, areaId, (err) => {
        if (err) {
            console.error("Error in deleting the area: ", err.message);
        } else {
            console.log(`Successsfully deleted area: ${areaId}`);
        }
    })
}

function deleteFloorById(floorId) {
    const sql = `DELETE FROM floor WHERE floor_id = ?`;
    db.run(sql, floorId, (err) => {
        if (err) {
            console.error("Error in deleting the floor: ", err.message);
        } else {
            console.log(`Successsfully deleted floor: ${floorId}`);
        }
    })
}

function getFloors() {
    const sql = `SELECT * FROM floor`;
    return new Promise((resolve, reject) => {
        db.all(sql, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getFloorNameByFloorId(floor_id) {
    const sql = `SELECT floor_name FROM floor WHERE floor_id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [floor_id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.floor_name : null);
            }
        });
    });
}

function getAreasByFloorId(floor_id) {
    const sql = `SELECT * FROM area WHERE floor_id = ?`;
    return new Promise((resolve, reject) => {
        db.all(sql, [floor_id], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getHotSeatNameByHotSeatId(hot_seat_id) {
    const sql = `SELECT hot_seat_name FROM hot_seat WHERE hot_seat_id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [hot_seat_id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.hot_seat_name : null);
            }
        });
    });
}

function getAreaImageUrlByAreaId(areaId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT image_url FROM area WHERE area_id = ?`;
        db.get(sql, [areaId], (err, row) => {
            if (err) {
                console.error("Error fetching area image URL:", err.message);
                reject(err);
            } else {
                resolve(row ? row.image_url : null); // Return null if no image URL is found
            }
        });
    });
}


function getHotSeatsByAreaId(area_id) {
    const sql = `SELECT * FROM hot_seat WHERE area_id = ?`;
    return new Promise((resolve, reject) => {
        db.all(sql, [area_id], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getAreaNameByAreaId(area_id) {
    const sql = `SELECT area_name FROM area WHERE area_id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [area_id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.area_name : null);
            }
        });
    });
}

function reserveHotSeat(hot_seat_id, date, timeSlot, userId) {
    const sql = `
    INSERT INTO reservation (date, time_slot, hot_seat_id, user_id)
    VALUES (?, ?, ?, ?);
    `;

    const params = [date, timeSlot, hot_seat_id, userId];

    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ reservationId: this.lastID });
            }
        });
    });
}

function getBookingsByDate(date) {
    const sql = `
    SELECT
        r.reservation_id,
        r.date,
        r.time_slot,
        r.user_id,
        f.floor_name,
        a.area_name,
        hs.hot_seat_name
    FROM reservation AS r
    INNER JOIN hot_seat AS hs
        ON r.hot_seat_id = hs.hot_seat_id
    INNER JOIN area AS a
        ON hs.area_id = a.area_id
    INNER JOIN floor AS f
        ON a.floor_id = f.floor_id
    WHERE r.date = ?
    `;

    const params = [date];

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function deleteReservationById(reservationId) {
    const sql = `DELETE FROM reservation WHERE reservation_id = ?`;
    db.run(sql, reservationId, (err) => {
        if (err) {
            console.error("Error in deleting the reservation: ", err.message);
        } else {
            console.log(`Successsfully deleted the reservation: ${reservationId}`);
        }
    })
}

function removePermanentHotSeat(permanentSeatId) {
    const sql = `DELETE FROM permanent_seat WHERE permanent_seat_id = ?`;
    db.run(sql, permanentSeatId, (err) => {
        if (err) {
            console.error("Error in deleting the reservation: ", err.message);
        } else {
            console.log(`Successsfully remove the permanent seat: ${permanentSeatId}`);
        }
    })
}

function getPermanentSeatName(userId){
    const sql = `SELECT hs.hot_seat_name 
    FROM hot_seat AS hs 
    INNER JOIN permanent_seat AS p
    ON hs.hot_seat_id = p.hot_seat_id 
    WHERE p.user_id = ?`;

    return new Promise((resolve, reject) => {
        db.all(sql, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getUserIdByReservationId(reservationId) {
    const sql = `SELECT user_id FROM reservation WHERE reservation_id = ?`;
    return new Promise((resolve, reject) => {
        db.get(sql, [reservationId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.user_id : null);
            }
        });
    });
}

function getReservationById(reservationId) {
    const sql = `SELECT * FROM reservation WHERE reservation_id = ?`;
    return new Promise((resolve, reject) => {
        db.all(sql, [reservationId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getHotSeatTables(date, time_slot) {

    let sql = `
    SELECT 
        hs.hot_seat_id, 
        hs.hot_seat_name,
        f.floor_name, 
        a.area_name
    FROM hot_seat AS hs
    LEFT JOIN area AS a
        ON hs.area_id = a.area_id
    LEFT JOIN floor AS f
        ON a.floor_id = f.floor_id
    LEFT JOIN reservation AS r
        ON hs.hot_seat_id = r.hot_seat_id
        AND r.date = ?
    WHERE 1=1
    `;

    const params = [date];

    if (time_slot === 'morning') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('both', 'morning')
        )`;

        params.push(date); 
    }

    else if (time_slot === 'evening') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('both', 'evening')
        )`;
        params.push(date); 
    }

    else if (time_slot === 'both') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('morning', 'evening','both')
        )`;
        params.push(date);  // push date for the 'both' check
    }

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function getBookingsByUser(userId, date) {
    const sql = `
    SELECT 
        r.reservation_id,
        r.date,
        r.time_slot,
        f.floor_name,
        a.area_name,
        hs.hot_seat_name
    FROM reservation AS r
    INNER JOIN hot_seat AS hs
        ON r.hot_seat_id = hs.hot_seat_id
    INNER JOIN area AS a
        ON hs.area_id = a.area_id
    INNER JOIN floor AS f
        ON a.floor_id = f.floor_id
    WHERE r.user_id = ? AND r.date = ?
    `;

    const params = [userId, date];

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function cancelReservation(reservationId) {
    const sql = `
        DELETE FROM reservation
        WHERE reservation_id = ?
    `;

    return new Promise((resolve, reject) => {
        db.run(sql, [reservationId], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

function getHotSeatTablesbyArea(date, time_slot) {
    let sql = `
    SELECT 
        f.floor_name, 
        a.area_name, 
        a.area_id, 
        a.image_url,
        COUNT(hs.hot_seat_id) AS free_seats
    FROM hot_seat AS hs
    LEFT JOIN area AS a
        ON hs.area_id = a.area_id
    LEFT JOIN floor AS f
        ON a.floor_id = f.floor_id
    LEFT JOIN reservation AS r
        ON hs.hot_seat_id = r.hot_seat_id
        AND r.date = ?
    LEFT JOIN permanent_seat AS ps
        ON hs.hot_seat_id = ps.hot_seat_id  -- Join permanent_seat table
    WHERE ps.hot_seat_id IS NULL  -- Exclude permanent seats
    `;

    const params = [date];

    // Handle time_slot filtering
    if (time_slot === 'morning') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('both', 'morning')
        )`;
        params.push(date);
    } else if (time_slot === 'evening') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('both', 'evening')
        )`;
        params.push(date);
    } else if (time_slot === 'both') {
        sql += `
        AND NOT EXISTS (
            SELECT 1
            FROM reservation
            WHERE reservation.hot_seat_id = hs.hot_seat_id
            AND reservation.date = ?
            AND reservation.time_slot IN ('morning', 'evening', 'both')
        )`;
        params.push(date);
    }

    // Count available seats, group by floor and area, and filter those with available free seats
    sql += `
    GROUP BY f.floor_name, a.area_name, a.area_id
    HAVING free_seats > 0
    `;

    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows); // Each row will have { floor_name, area_name, area_id, free_seats }
            }
        });
    });
}

function getTablesByArea(area_id, date, time_slot) {
 
    let sql=''
 
    if(time_slot=='morning'){
        sql = `
    SELECT
        t.hot_seat_id,
        t.hot_seat_name,
        MAX(ps.hot_seat_id IS NOT NULL) AS is_permanent,  -- Check if seat is permanent
        MAX(r.hot_seat_id IS NOT NULL) AS is_reserved,   -- Check if seat is reserved
        MAX(CASE
            WHEN r.time_slot IN ('both','morning', ?)   THEN r.user_id
            ELSE NULL
        END) AS reserved_by                              -- Get user ID of reservation, if matching time slot
    FROM hot_seat AS t
    LEFT JOIN permanent_seat AS ps
        ON t.hot_seat_id = ps.hot_seat_id
    LEFT JOIN reservation AS r
        ON t.hot_seat_id = r.hot_seat_id
        AND r.date = ?
        AND r.time_slot IN ('both','morning', ?)                     -- Match reservation for 'both' or the specific time slot
    WHERE t.area_id = ?
    GROUP BY t.hot_seat_id, t.hot_seat_name
    `;
    }
 
    if(time_slot=='evening'){
        sql = `
        SELECT
            t.hot_seat_id,
            t.hot_seat_name,
            MAX(ps.hot_seat_id IS NOT NULL) AS is_permanent,  -- Check if seat is permanent
            MAX(r.hot_seat_id IS NOT NULL) AS is_reserved,   -- Check if seat is reserved
            MAX(CASE
                WHEN r.time_slot IN ('both','evening', ?)   THEN r.user_id
                ELSE NULL
            END) AS reserved_by                              -- Get user ID of reservation, if matching time slot
        FROM hot_seat AS t
        LEFT JOIN permanent_seat AS ps
            ON t.hot_seat_id = ps.hot_seat_id
        LEFT JOIN reservation AS r
            ON t.hot_seat_id = r.hot_seat_id
            AND r.date = ?
            AND r.time_slot IN ('both','evening', ?)                    -- Match reservation for 'both' or the specific time slot
        WHERE t.area_id = ?
        GROUP BY t.hot_seat_id, t.hot_seat_name
        `;
    }
 
    if(time_slot=='both'){
        sql = `
        SELECT
            t.hot_seat_id,
            t.hot_seat_name,
            MAX(ps.hot_seat_id IS NOT NULL) AS is_permanent,  -- Check if seat is permanent
            MAX(r.hot_seat_id IS NOT NULL) AS is_reserved,   -- Check if seat is reserved
            MAX(CASE
                WHEN r.time_slot IN ('both','evening','morning', ?)  THEN r.user_id
                ELSE NULL
            END) AS reserved_by                              -- Get user ID of reservation, if matching time slot
        FROM hot_seat AS t
        LEFT JOIN permanent_seat AS ps
            ON t.hot_seat_id = ps.hot_seat_id
        LEFT JOIN reservation AS r
            ON t.hot_seat_id = r.hot_seat_id
            AND r.date = ?
            AND r.time_slot IN ('both','evening','morning', ?)                   -- Match reservation for 'both' or the specific time slot
        WHERE t.area_id = ?
        GROUP BY t.hot_seat_id, t.hot_seat_name
        `;
    }
 
    // Prepare parameters based on the provided time_slot
    const params = [time_slot, date, time_slot, area_id];
 
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                // Map the rows to include all tables with reservation details
                const allTables = rows.map(row => ({
                    hot_seat_id: row.hot_seat_id,
                    hot_seat_name: row.hot_seat_name,
                    is_reserved: Boolean(row.is_reserved),  // Convert to boolean
                    is_permanent: Boolean(row.is_permanent), // Convert to boolean
                    is_available: !row.is_reserved,          // Available if not reserved
                    reserved_by: row.is_reserved ? row.reserved_by : null // User ID if reserved, null otherwise
                }));
 
                resolve(allTables);  // Return all tables with processed data
            }
        });
    });
}

function getReservationsAtTimeSlotByUser(date, time_slot, user_id) {
    return new Promise((resolve, reject) => {
        let query = ''; // Declare the query variable outside
 
        // Define the query based on the time_slot
        if (time_slot === 'morning') {
            query = `
                SELECT *
                FROM reservation
                WHERE date = ? AND time_slot IN ('both', 'morning') AND user_id = ?;
            `;
        } else if (time_slot === 'evening') {
            query = `
                SELECT *
                FROM reservation
                WHERE date = ? AND time_slot IN ('both', 'evening') AND user_id = ?;
            `;
        } else if (time_slot === 'both') {
            query = `
                SELECT *
                FROM reservation
                WHERE date = ? AND time_slot IN ('both', 'morning', 'evening') AND user_id = ?;
            `;
        }
 
        // Execute the query
        const params = [date, user_id];
        db.get(query, params, (err, row) => {
            if (err) {
                reject(err); // Reject the promise with the error
            } else {
                resolve(row); // Resolve the promise with the result
            }
        });
    });
}






// Export the functions
module.exports = {
    insertFloor,
    getFloors,
    insertArea,
    getAreasByFloorId,
    getFloorNameByFloorId,
    insertHotSeat,
    getHotSeatsByAreaId,
    getAreaNameByAreaId,
    deleteHotSeat,
    deleteAreaById,
    deleteFloorById,
    reserveHotSeat,
    getBookingsByDate,
    deleteReservationById,
    getUserIdByReservationId,
    insertAdmin,
    isUserAdmin,
    checkPinInDatabase,
    getHotSeatNameByHotSeatId,
    getReservationById,
    isAvailableArea,
    isAvailableHotSeat,
    getAreaImageUrlByAreaId,
    isPermanentHotSeatUser,
    insertPermanentSeat,
    getReservedSeatByHotSeatId,
    removePermanentHotSeat,
    updateAreaImageUrl,
    getHotSeatTables,
    getBookingsByUser,
    cancelReservation,
    getHotSeatTablesbyArea,
    getTablesByArea,
    getReservationsAtTimeSlotByUser,
    getPermanentSeatName
};

