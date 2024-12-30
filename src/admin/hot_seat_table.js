const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const {
    insertHotSeat,
    getHotSeatsByAreaId,
    getFloorNameByFloorId,
    getAreaNameByAreaId,
    deleteHotSeat,
    getHotSeatNameByHotSeatId,
    isAvailableHotSeat,
    getAreaImageUrlByAreaId,
    isPermanentHotSeatUser,
    insertPermanentSeat,
    getReservedSeatByHotSeatId,
    removePermanentHotSeat,
    updateAreaImageUrl,
} = require('../../database/database');


function HotSeats(app) {
    // Action to view hot seats in an area
    app.action('view_hot_seats', async ({ action, ack, client, body }) => {
        try {
            await ack();

            const [areaId, floorId] = action.value.split(',');
            const hotSeats = await getHotSeatsByAreaId(areaId);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);
            const areaImageUrl = await getAreaImageUrlByAreaId(areaId);
            const blocks = await getHotSeatsBlocks(floorName, floorId, hotSeats, areaName, areaId, areaImageUrl);

            // Publish updated view with hot seat data
            await publishHotSeatsView(client, body.user.id, blocks);

        } catch (error) {
            console.error('Error fetching hot seats:', error);
        }
    });

    const getHotSeatsBlocks = async (floorName, floorId, hotSeats, areaName, areaId, areaImageUrl) => {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `Hot Seats in ${floorName} - ${areaName}`,
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "➕*Add a new hot seat:*"
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Add Hot Seat",
                        emoji: true
                    },
                    value: JSON.stringify({ areaId, floorId }),
                    action_id: "add_hot_seat"
                }
            }
        ];

        // Add area map image if available
        if (areaImageUrl) {
            blocks.push(
                { type: "divider" },
                {
                    type: "image",
                    image_url: areaImageUrl,
                    alt_text: `${areaName} Map`
                },
                {
                    type: "actions",
                    elements: [
                        {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Update Map",
                                emoji: true
                            },
                            value: `${areaId},${floorId}`,
                            action_id: "add_area_image"
                        }
                    ]
                }
            );
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "*Add Area Map*"
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Add Area Map",
                        emoji: true
                    },
                    value: `${areaId},${floorId}`,
                    action_id: "add_area_image"
                }
            });
        }

        blocks.push({ type: "divider" });

        if (hotSeats.length > 0) {
            const hotSeatBlocks = await Promise.all(
                hotSeats.map(async (hotSeat) => {
                    const permanent = await getReservedSeatByHotSeatId(hotSeat.hot_seat_id);
                    if (permanent.length > 0) {
                        userName = await getUserNameById(permanent[0].user_id);
                    } else {
                        userName = "Not Assigned";
                    }


                    return [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `⛩ *Hot Seat Id:* ${hotSeat.hot_seat_id}`
                            },
                            accessory: permanent.length > 0
                                ? {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "Remove from Permanent Seat",
                                        emoji: true
                                    },
                                    value: `${hotSeat.hot_seat_id},${areaId},${floorId}`,
                                    action_id: "remove_permanent_user",
                                    style: "danger"
                                }
                                : {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "Assign to a User",
                                        emoji: true
                                    },
                                    value: `${hotSeat.hot_seat_id},${areaId},${floorId}`,
                                    action_id: "view_non_permanent_users",
                                    style: "primary"
                                }
                        },
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `*Hot Seat Name:* ${hotSeat.hot_seat_name} | *User:* ${userName}`
                            },
                            accessory: permanent.length === 0
                                ? {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "Delete",
                                        emoji: true
                                    },
                                    value: `${hotSeat.hot_seat_id},${areaId},${floorId}`,
                                    action_id: "delete_hot_seat",
                                    style: "danger"
                                }
                                : undefined
                        },
                        { type: "divider" }
                    ];
                })
            );

            blocks.push(...hotSeatBlocks.flat());
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "No hot seats available in this area."
                }
            });
        }

        return blocks;
    };


    // Function to publish the updated hot seats view to Slack
    const publishHotSeatsView = async (client, userId, blocks) => {
        await client.views.publish({
            user_id: userId,
            view: {
                type: 'home',
                blocks: blocks
            }
        });
    };

    async function getUserNameById(userId) {
        const client = new WebClient(process.env.SLACK_BOT_TOKEN);
        try {
            // Fetch user information
            const response = await client.users.info({
                user: userId,
            });

            if (response.ok) {
                const user = response.user;
                return user.real_name;
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }

    const privateMetadataStore = {};


    app.action("add_area_image", async ({ ack, body, client }) => {
        await ack();

        const [areaId, floorId] = body.actions[0].value.split(",");

        try {
            // Open the modal with a button to upload the image
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: "modal",
                    callback_id: "upload_area_image",
                    title: {
                        type: "plain_text",
                        text: "Upload Area Map"
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "*Please upload an image for the area map:*"
                            }
                        },
                        {
                            type: "actions",
                            elements: [
                                {
                                    type: "button",
                                    text: {
                                        type: "plain_text",
                                        text: "Upload Image"
                                    },
                                    action_id: "upload_image",
                                    value: `${areaId},${floorId}`
                                }
                            ]
                        }
                    ],
                    private_metadata: `${areaId},${floorId}`
                }
            });
        } catch (error) {
            console.error("Error opening modal:", error);
        }
    });

    // Action for handling the button click (upload image prompt)
    app.action('upload_image', async ({ ack, body, client }) => {
        await ack();

        try {
            const [areaId, floorId] = body.actions[0].value.split(',');

            await client.chat.postMessage({
                channel: body.user.id,
                text: "Please upload the image here, and we'll associate it with the area map!",
            });

            privateMetadataStore[body.user.id] = `${areaId},${floorId}`;

        } catch (error) {
            console.error('Error handling upload_image action:', error);
        }
    });

    // Handle file upload completion (store the image URL)
    app.event('file_shared', async ({ event, client }) => {
        try {
            const fileId = event.file.id;

            const fileInfo = await client.files.info({ file: fileId });
            const fileUrl = fileInfo.file.url_private;

            const privateMetadata = privateMetadataStore[event.user_id];

            if (privateMetadata) {
                const [areaId, floorId] = privateMetadata.split(',');

                await updateAreaImageUrl(areaId, fileUrl);

                await client.chat.postMessage({
                    channel: event.user_id,
                    text: `Image successfully uploaded for Area ID: ${areaId}, Floor ID: ${floorId}!`
                });

                delete privateMetadataStore[event.user_id];
            } else {
                console.log('Private metadata not found for this user.');
            }
        } catch (error) {
            console.error('Error handling file_shared event:', error);
        }
    });
    // Action to open the search users modal
    app.action('view_non_permanent_users', async ({ ack, client, body, action }) => {
        try {
            await ack();
            const [hotSeatId, areaId, floorId] = action.value.split(',');

            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: "modal",
                    private_metadata: `${hotSeatId},${areaId},${floorId}`,
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
                        { type: "divider" },
                        {
                            dispatch_action: true,
                            type: "input",
                            element: {
                                type: "plain_text_input",
                                action_id: "search_non_permanent_users",
                                placeholder: {
                                    type: "plain_text",
                                    text: "Search for Users..."
                                },
                            },
                            label: {
                                type: "plain_text",
                                text: "Search Users",
                                emoji: true
                            }
                        },
                        { type: "divider" },
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
                                action_id: "add_permanent_user",
                                style: "primary",
                                value: `${hotSeatId},${areaId},${floorId}`
                            }
                        }
                    ]
                }
            });

        } catch (error) {
            console.error('Error loading the search bar', error);
        }
    });

    app.action('search_non_permanent_users', async ({ ack, client, body, payload }) => {
        try {
            await ack();


            const [hotSeatId, areaId, floorId] = body.view.private_metadata.split(',');
            const query = payload.value?.toLowerCase();

            if (!query) {
                console.log('No query provided.');
                return;
            }

            const appUserId = (await client.auth.test()).user_id;
            const members = [];
            let cursor;

            // Fetch all workspace members
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
                        const isPermanent = await isPermanentHotSeatUser(member.id); // Ensure this function is defined
                        return (
                            member.real_name?.toLowerCase().includes(query) &&
                            !member.is_bot &&
                            !member.deleted &&
                            member.id !== appUserId &&
                            member.id !== 'USLACKBOT' &&
                            !isPermanent
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
                        text: "Assign Hot Seat Permanent",
                        emoji: true
                    },
                    value: `${member.id},${hotSeatId},${areaId},${floorId}`,
                    action_id: "assign_permanent_seat",
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



    // Action to view all users in the workspace who are not permanent hot seat users
    app.action('add_permanent_user', async ({ ack, client, body, action }) => {
        try {
            await ack();

            const appUserId = (await client.auth.test()).user_id;
            const [hotSeatId, areaId, floorId] = action.value.split(',');
            const members = [];
            let cursor;

            // Fetch all workspace members
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

            // Generate blocks for all eligible users
            const blocks = await Promise.all(
                members.map(async member => {
                    if (!member.is_bot && !member.deleted && member.id !== appUserId && member.id !== 'USLACKBOT') {
                        const isPermanent = await isPermanentHotSeatUser(member.id);
                        if (!isPermanent) {
                            return [
                                {
                                    type: "section",
                                    text: {
                                        type: "mrkdwn",
                                        text: `👤 *User Id:* ${member.id}\n*User Name:* ${member.real_name || member.name}`
                                    },
                                    accessory: {
                                        type: "button",
                                        text: {
                                            type: "plain_text",
                                            text: "Assign Hot Seat Permanent",
                                            emoji: true
                                        },
                                        value: `${member.id},${hotSeatId},${areaId},${floorId}`,
                                        action_id: "assign_permanent_seat",
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

            // Update the modal with the list of users
            await client.views.update({
                view_id: body.view.id,
                view: {
                    type: 'modal',
                    title: {
                        type: 'plain_text',
                        text: 'Users in the Workspace'
                    },
                    blocks: allBlocks.length > 0 ? allBlocks : [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: "No eligible users to display."
                            }
                        }
                    ]
                }
            });

        } catch (error) {
            console.error('Error fetching workspace users:', error);
        }
    });


    app.action('assign_permanent_seat', async ({ ack, client, body, action }) => {
        try {
            await ack();
            const [userId, hotSeatId, areaId, floorId] = action.value.split(',');

            await client.views.update({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'assign_permanent_seat_modal',
                    private_metadata: `${userId},${hotSeatId},${areaId},${hotSeatId}`,
                    title: {
                        type: 'plain_text',
                        text: 'Assign Hot Seat'
                    },
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `Assign Hot Seat`,
                                emoji: true
                            }
                        },
                        {
                            type: 'section',
                            block_id: 'admin_info_section',
                            text: {
                                type: 'mrkdwn',
                                text: `🧑🏻‍💻User Id: ${userId} \n Hot Seat Id: ${hotSeatId}`
                            }
                        },
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Assign'
                    }
                }
            });
        } catch (error) {
            console.error('Error handling assign_permanent_seat action:', error);
        }
    });



    // View submission handler for the Add Admin modal
    app.view('assign_permanent_seat_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            const [userId, hotSeatId, areaId, floorId] = view.private_metadata.split(',');

            await insertPermanentSeat(userId, hotSeatId);

            const hotSeats = await getHotSeatsByAreaId(areaId);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);
            const areaImageUrl = await getAreaImageUrlByAreaId(areaId);
            const blocks = await getHotSeatsBlocks(floorName, floorId, hotSeats, areaName, areaId, areaImageUrl);
            await publishHotSeatsView(client, body.user.id, blocks);


        } catch (error) {
            console.error('Error handling assign_permanent_seat_modal submission:', error);
        }
    });

    // Open "Remove Permanent Seat" confirmation modal
    app.action('remove_permanent_user', async ({ ack, client, body, action }) => {
        try {
            await ack();

            const [hotSeatId, areaId, floorId] = action.value.split(',');
            const reserveSeat = await getReservedSeatByHotSeatId(hotSeatId);

            await client.views.open({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'remove_permanent_user_modal',
                    private_metadata: `${reserveSeat[0].permanent_seat_id}, ${areaId}, ${floorId}`,
                    title: {
                        type: 'plain_text',
                        text: 'Confirm Remove'
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: `Are you sure you want to remove Hot Seat: ${hotSeatId}, from permanent assignments?`,
                                emoji: true
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Remove'
                    }
                }
            });
        } catch (error) {
            console.error('Error opening remove_permanent_user modal:', error);
        }
    });

    // Handle deletion of Hot Seat
    app.view('remove_permanent_user_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();
            const [permanentSeatId, areaId, floorId] = view.private_metadata.split(',');
            const hotSeatName = await getHotSeatNameByHotSeatId(permanentSeatId);

            await removePermanentHotSeat(permanentSeatId);

            const hotSeats = await getHotSeatsByAreaId(areaId);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);
            const areaImageUrl = await getAreaImageUrlByAreaId(areaId);
            const blocks = await getHotSeatsBlocks(floorName, floorId, hotSeats, areaName, areaId, areaImageUrl);
            await publishHotSeatsView(client, body.user.id, blocks);

        } catch (error) {
            console.error('Error handling delete_hot_seat_modal submission:', error);
        }
    });
    
    // Open "Add Hot Seat" modal
    app.action('add_hot_seat', async ({ ack, client, body, action }) => {
        await ack();
        try {
            const { areaId, floorId } = JSON.parse(action.value);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);

            await client.views.open({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'add_hot_seat_modal',
                    private_metadata: JSON.stringify({ areaId, floorId }),
                    title: {
                        type: 'plain_text',
                        text: 'Add Hot Seat'
                    },
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `🏢 ${floorName} - ${areaName}`,
                                emoji: true
                            }
                        },
                        {
                            type: 'input',
                            block_id: 'hot_seat_name_input',
                            element: {
                                type: 'plain_text_input',
                                action_id: 'hot_seat_name',
                                placeholder: {
                                    type: 'plain_text',
                                    text: "Enter Hot Seat Name"
                                }
                            },
                            label: {
                                type: 'plain_text',
                                text: 'Hot Seat Name'
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Add'
                    }
                }
            });
        } catch (error) {
            console.error('Error handling add_hot_seat action:', error);
        }
    });

    // Handle submission of "Add Hot Seat" modal
    app.view('add_hot_seat_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();
            const hotSeatName = view.state.values.hot_seat_name_input.hot_seat_name.value;
            const { areaId, floorId } = JSON.parse(view.private_metadata);
            const isAvailable = await isAvailableHotSeat(hotSeatName, areaId);

            if (!isAvailable) {
                await insertHotSeat(hotSeatName, areaId);
                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Hot Seat "${hotSeatName}" has been added successfully to Area ID: ${areaId}!`
                });
            }
            else {
                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Hot Seat "${hotSeatName}" already exists in Area ID: ${areaId}!`
                });
            }

            const hotSeats = await getHotSeatsByAreaId(areaId);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);
            const areaImageUrl = await getAreaImageUrlByAreaId(areaId);
            const blocks = await getHotSeatsBlocks(floorName, floorId, hotSeats, areaName, areaId, areaImageUrl);

            await publishHotSeatsView(client, body.user.id, blocks);

        } catch (error) {
            console.error('Error handling add_hot_seat_modal submission:', error);
        }
    });

    // Open "Delete Hot Seat" confirmation modal
    app.action('delete_hot_seat', async ({ ack, client, body, action }) => {
        try {
            await ack();

            const [hotSeatId, areaId, floorId] = action.value.split(',');
            const hotSeatName = await getHotSeatNameByHotSeatId(hotSeatId);

            await client.views.open({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'delete_hot_seat_modal',
                    private_metadata: `${hotSeatId},${areaId},${floorId}`,
                    title: {
                        type: 'plain_text',
                        text: 'Confirm Delete'
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: `Are you sure you want to delete Hot Seat: ${hotSeatName}?`,
                                emoji: true
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Delete'
                    }
                }
            });
        } catch (error) {
            console.error('Error opening delete_hot_seat modal:', error);
        }
    });

    // Handle deletion of Hot Seat
    app.view('delete_hot_seat_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();
            const [hotSeatId, areaId, floorId] = view.private_metadata.split(',');
            const hotSeatName = await getHotSeatNameByHotSeatId(hotSeatId);

            await deleteHotSeat(hotSeatId);
            await client.chat.postMessage({
                channel: body.user.id,
                text: `Hot Seat "${hotSeatName}" has been deleted successfully`
            });

            const hotSeats = await getHotSeatsByAreaId(areaId);
            const floorName = await getFloorNameByFloorId(floorId);
            const areaName = await getAreaNameByAreaId(areaId);
            const areaImageUrl = await getAreaImageUrlByAreaId(areaId);
            const blocks = await getHotSeatsBlocks(floorName, floorId, hotSeats, areaName, areaId, areaImageUrl);
            await publishHotSeatsView(client, body.user.id, blocks);

        } catch (error) {
            console.error('Error handling delete_hot_seat_modal submission:', error);
        }
    });
}

module.exports = { HotSeats };
