const { App } = require('@slack/bolt');
const { insertArea, getAreasByFloorId, getFloorNameByFloorId, deleteAreaById, getHotSeatsByAreaId, getAreaNameByAreaId, isAvailableArea } = require('../../database/database');

function Areas(app) {
    // Get areas inside a floor
    app.action('view_area', async ({ action, ack, client, body }) => {
        try {
            await ack();

            const floorId = action.value;
            const areas = await getAreasByFloorId(floorId);
            const floorName = await getFloorNameByFloorId(floorId);

            const blocks = getAreasBlocks(floorName, floorId, areas);

            await publishAreasView(client, body.user.id, blocks);

        } catch (error) {
            console.error('Error handling view_area action:', error);
            await client.chat.postMessage({
                channel: body.user.id,
                text: "Sorry, couldn't fetch areas."
            });
        }
    });

    // Function to create the blocks for areas
    const getAreasBlocks = (floorName, floorId, areas) => {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: `🏢 ${floorName}`,
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "➕ *Add a new area:*"
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Add Area",
                        emoji: true
                    },
                    value: floorId,
                    action_id: "add_area"
                }
            },
            { type: "divider" }
        ];

        if (areas.length > 0) {
            const areaBlocks = areas.map(area => [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🏢 *Area ID:* ${area.area_id}`
                    },
                    accessory: {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "View",
                            emoji: true
                        },
                        value: `${area.area_id},${floorId}`,
                        action_id: "view_hot_seats",
                        style: "primary"
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Area Name:* ${area.area_name}`
                    },
                    accessory: {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Delete",
                            emoji: true
                        },
                        value: `${area.area_id}, ${floorId}`,
                        action_id: "delete_area",
                        style: "danger"
                    }
                },
                { type: "divider" }
            ]);

            blocks.push(...areaBlocks.flat());
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "No areas available."
                }
            });
        }

        return blocks;
    };

    // Function to publish the Areas View
    const publishAreasView = async (client, userId, blocks) => {
        await client.views.publish({
            user_id: userId,
            view: {
                type: 'home',
                blocks: blocks
            }
        });
    };

    // Action to open the Add Area modal
    app.action('add_area', async ({ ack, client, body, action }) => {
        try {
            await ack();
            const floorId = action.value;
            const floorName = await getFloorNameByFloorId(floorId);

            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'add_area_modal',
                    private_metadata: floorId,
                    title: {
                        type: 'plain_text',
                        text: 'Add Area'
                    },
                    blocks: [
                        {
                            type: "header",
                            text: {
                                type: "plain_text",
                                text: `🏢${floorName}`,
                                emoji: true
                            }
                        },
                        {
                            type: 'input',
                            block_id: 'area_name_input',
                            element: {
                                type: 'plain_text_input',
                                action_id: 'area_name',
                                placeholder: {
                                    type: 'plain_text',
                                    text: "Enter Area Name"
                                }
                            },
                            label: {
                                type: 'plain_text',
                                text: 'Area Name'
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
            console.error('Error handling add_area action:', error);
        }
    });

    //Insert Area to the database. Handle the Input        
    app.view('add_area_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            const areaName = view.state.values.area_name_input.area_name.value;
            const floorId = view.private_metadata;

            const isAvailable = await isAvailableArea(areaName, floorId);

            if (!isAvailable) {
                await insertArea(areaName, floorId);

                const areas = await getAreasByFloorId(floorId);
                const floorName = await getFloorNameByFloorId(floorId);

                const blocks = getAreasBlocks(floorName, floorId, areas);

                await publishAreasView(client, body.user.id, blocks);

                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Area "${areaName}" has been added successfully to Floor ID: ${floorId}!`
                });
            } else {
                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Area "${areaName}" already exists in Floor ID: ${floorId}!`
                });
            }

        } catch (error) {
            console.error('Error handling add_area_modal submission:', error);
        }
    });

    //Open "Delete Hot Seat" confirmation modal
    app.action('delete_area', async ({ ack, client, body, action }) => {
        try {
            await ack();

            const [areaId, floorId] = action.value.split(',');
            const areaName = await getAreaNameByAreaId(areaId);

            await client.views.open({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'delete_area_modal',
                    private_metadata: `${areaId},${floorId}`,
                    title: {
                        type: 'plain_text',
                        text: 'Confirm Delete'
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: `Are you sure you want to delete Area: ${areaName}`,
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

    app.view('delete_area_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            const [areaId, floorId] = view.private_metadata.split(',');

            const hotSeats = await getHotSeatsByAreaId(areaId);
            const areaName = await getAreaNameByAreaId(areaId);

            if (hotSeats == 0) {
                await deleteAreaById(areaId);

                const areas = await getAreasByFloorId(floorId);
                const floorName = await getFloorNameByFloorId(floorId);

                const blocks = getAreasBlocks(floorName, floorId, areas);

                await publishAreasView(client, body.user.id, blocks);

                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Area "${areaName}" has been successfully deleted`
                });

                console.log(`Successfully deleted area: ${areaId}`);
            } else {
                console.log('Hot Seats are Available');
                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Hot seats are available inside the Area "${areaName}". You can't delete the Area "${areaName}".`
                });
            }
        } catch (error) {
            console.error('Error handling delete_hot_seat_modal submission:', error);
        }
    });

}

module.exports = { Areas };
