const {getAdminMenuBlocks}=require('./adminUI')  
const menu = require('./menu.js');
const { insertAdmin, isUserAdmin, getHotSeatTables, reserveHotSeat, getBookingsByUser, cancelReservation, getHotSeatTablesbyArea, getTablesByArea, getReservationsAtTimeSlotByUser,isPermanentHotSeatUser,getPermanentSeatName} = require('../../database/database.js');

function Admin(app) {
    app.action('view_users', async ({ ack, client, body }) => {
        try {
            await ack();

            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: "modal",
                    title: {
                        type: "plain_text",
                        text: "Users",
                        emoji: true
                    },
                    close: {
                        type: "plain_text",
                        text: "Close",
                        emoji: true
                    },
                    blocks: [
                        {
                            type: "divider"
                        },
                        {
                            dispatch_action: true,
                            type: "input",
                            element: {
                                type: "plain_text_input",
                                action_id: "search_users",
                                placeholder: {
                                    type: "plain_text",
                                    text: "Search for Available Users..."
                                }
                            },
                            label: {
                                type: "plain_text",
                                text: "Search Users",
                                emoji: true
                            }
                        },
                        {type: "divider"},
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "*View All Users*"
                            },
                            accessory: {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "View",
                                    emoji: true,
                                },
                                action_id: "view_all_users",
                                style: "primary"
                            }

                        }
                    ]
                }
            });

        } catch (error) {
            console.error('Error loading the search bar', error);
        }
    });

    app.action('search_users', async ({ ack, client, body, payload }) => {
        try {
            await ack();
            const query = payload.value?.toLowerCase();

            if (!query) {
                console.log('No query provided.');
                return;
            }

            const appUserId = (await client.auth.test()).user_id;
            const members = [];
            let cursor;

            // Paginate to fetch all workspace members
            do {
                const response = await client.users.list({ cursor });
                if (response.ok) {
                    members.push(...response.members);
                    cursor = response.response_metadata?.next_cursor;
                } else {
                    console.error('Error fetching members:', response.error);
                    break;
                }
            } while (cursor);

            // Filter users based on query
            const filteredUsers = (
                await Promise.all(
                    members.map(async member => {
                        const isAdmin = await isUserAdmin(member.id); // Ensure this function is defined
                        return (
                            member.real_name?.toLowerCase().includes(query) &&
                            !member.is_bot &&
                            !member.deleted &&
                            member.id !== appUserId &&
                            member.id !== 'USLACKBOT' &&
                            !isAdmin
                        )
                            ? member
                            : null;
                    })
                )
            ).filter(Boolean);

            const allBlocks = filteredUsers.map(member => ({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: `👤 *User Id:* ${member.id}\n*User Name:* ${member.real_name || member.name}`
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Add As Admin",
                        emoji: true
                    },
                    value: `${member.id},${member.real_name || member.name}`,
                    action_id: "add_admin",
                    style: "primary"
                }
            }));

            // Update the modal with filtered users
            await client.views.update({
                view_id: body.view.id,
                view: {
                    type: "modal",
                    title: {
                        type: "plain_text",
                        text: "Search Users",
                    },
                    blocks: allBlocks.length > 0 ? allBlocks : [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "No users found matching your query."
                            }
                        }
                    ]
                }
            });

        } catch (error) {
            console.error('Error fetching workspace users:', error);
        }
    });

//View Members in the Channel Who are not Admins
    app.action('view_all_users', async ({ ack, client, body, action }) => {
    try {
        await ack();

        const appUserId = (await client.auth.test()).user_id;

        const members = [];
        let cursor;

        do {
            const response = await client.users.list({ cursor });
            if (response.ok) {
                members.push(...response.members);
                cursor = response.response_metadata?.next_cursor;
            } else {
                console.error('Error fetching members:', response.error);
                break;
            }
        } while (cursor);

        const blocks = await Promise.all(
            members.map(async (member) => {
                if (!member.is_bot && !member.deleted && member.id !== appUserId && member.id != 'USLACKBOT') {
                    const name = member.real_name || member.name;
                    const isAdmin = await isUserAdmin(member.id);

                    if (!isAdmin) {
                        return [
                            {
                                type: "section",
                                text: {
                                    type: "mrkdwn",
                                    text: `👤 *User Id:* ${member.id}\n*User Name:* ${name}`
                                },
                                accessory: {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "Add As Admin",
                                        emoji: true
                                    },
                                    value: `${member.id},${member.real_name || member.name}`,
                                    action_id: "add_admin",
                                    style: "primary"
                                }
                            },
                            { type: "divider" }
                        ];
                    }
                }
                return null;
            })
        );

        const allBlocks = blocks.flat().filter(block => block !== null);

        if (allBlocks.length > 0) {
            await client.views.update({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'view_users_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Users in the Workspace',
                    },
                    blocks: allBlocks, 
                },
            });
        } else {
            await client.views.update({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'view_users_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Users in the Workspace',
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'No users found.',
                            },
                        },
                    ], 
                },
            });
        
            console.log('No users to display or all users are admins.');
        }
        

    } catch (error) {
        console.error('Error fetching workspace users:', error);
    }
    });


    app.action('add_admin', async ({ ack, client, body, action }) => {
        try {
            await ack();
            const [userId, userName] = action.value.split(',');

            // Push the modal to add an admin
            await client.views.update({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'add_admin_modal',
                    private_metadata: `${userId},${userName}`,
                    title: {
                        type: 'plain_text',
                        text: 'Add Admin'
                    },
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `Add As an Admin`,
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            block_id: 'admin_info_section',
                            text: {
                                type: 'mrkdwn',
                                text: `🧑🏻‍💻User Id: ${userId} \n UserName: ${userName}`
                            }
                        },
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Add'
                    }
                }
            });
        } catch (error) {
            console.error('Error handling add_admin action:', error);
        }
    });

    // View submission handler for the Add Admin modal
    app.view('add_admin_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            // Extract input values
            const [userId, userName] = view.private_metadata.split(',');

            await insertAdmin(userId, userName);

            // Notify the user that the admin has been added
            await client.chat.postMessage({
                channel: body.user.id,
                text: `"${userName}" has been added as an Admin successfully!`
            });

        } catch (error) {
            console.error('Error handling add_admin_modal submission:', error);
        }
    });

}

const publishAdminMenu = async (client, userId) => {
    const adminMenuBlocks = getAdminMenuBlocks(); // Get Admin Menu blocks
    const combinedBlocks = [...adminMenuBlocks, ...menu];
    await client.views.publish({
        user_id: userId,
        view: {
            type: 'home',
            blocks: combinedBlocks
        }
    });
};

module.exports = { Admin , publishAdminMenu };