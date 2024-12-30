const topic = {
    type: "header",
    text: {
        type: "plain_text", // Use "mrkdwn" for formatting
        text: "Hot Seat Reservation Menu" // Bold text
    }
};

const divider = { 
    type: "divider"
};

const reserve = {
    type: "section",
    text: {
        type: "mrkdwn",
        text: "Reserve a Hot Seat"
    },
    accessory: {
        type: "button",
        text: {
            type: "plain_text",
            text: "Reserve",
            emoji: true
        },
        action_id: "reserve" // Unique action_id
    }
};

const viewBookings = {
    type: "section",
    text: {
        type: "mrkdwn",
        text: "View Your Hot Seats"
    },
    accessory: {
        type: "button",
        text: {
            type: "plain_text",
            text: "View",
            emoji: true
        },
        action_id: "viewBookings" // Unique action_id
    }
};

// Export as an array with proper structure
const menu = [topic, divider, reserve, divider, viewBookings, divider];

module.exports = menu; // Correct format for exporting blocks
