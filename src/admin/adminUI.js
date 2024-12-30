const getAdminMenuBlocks = () => [
    {
        type: "header",
        text: {
            type: "plain_text",
            text: "Admin Menu",
            emoji: true
        }
    },
    { type: "divider" },
    {
        type: "section",
        text: {
            type: "mrkdwn",
            text: "Manage Hot Seat Tables"
        },
        accessory: {
            type: "button",
            text: {
                type: "plain_text",
                text: "Manage",
                emoji: true
            },
            action_id: "view_floors"
        }
    },
    { type: "divider" },
    {
        type: "section",
        text: {
            type: "mrkdwn",
            text: "View Reservations"
        },
        accessory: {
            type: "button",
            text: {
                type: "plain_text",
                text: "Reservations",
                emoji: true
            },
            action_id: "view_all_reservations"
        }
    },
    { type: "divider" },
    {
        type: "section",
        text: {
            type: "mrkdwn",
            text: "Add Admin"
        },
        accessory: {
            type: "button",
            text: {
                type: "plain_text",
                text: "View",
                emoji: true
            },
            action_id: "view_users"
        }
    },
    { type: "divider" }
];

module.exports= {getAdminMenuBlocks}