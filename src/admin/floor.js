const { App } = require('@slack/bolt');
const {insertFloor, getFloors, getAreasByFloorId, deleteFloorById, reserveHotSeat, getFloorNameByFloorId } = require('../../database/database');

function Floors(app) {
    app.action('view_floors', async ({ ack, client, body }) => {
        try {
            await ack();

            const floors = await getFloors();

            await publishFloorsView(client, body.user.id, floors);

        } catch (error) {
            console.error('Error handling view_floors action:', error);
        }
    });

    const getFloorsBlocks = (floors) => {
        const blocks = [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "➕ *Add a new floor:*"
                },
                accessory: {
                    type: "button",
                    text: {
                        type: "plain_text",
                        text: "Add Floor",
                        emoji: true
                    },
                    action_id: "add_floor"
                }
            },
            { type: "divider" }
        ];

        if (floors.length > 0) {
            blocks.push(
                ...floors.flatMap(floor => [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `🏢 *Floor ID:* ${floor.floor_id}`
                        },
                        accessory: {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "View",
                                emoji: true
                            },
                            value: `${floor.floor_id}`,
                            action_id: "view_area",
                            style: "primary"
                        }
                    },
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Floor Name:* ${floor.floor_name}`
                        },
                        accessory: {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Delete",
                                emoji: true
                            },
                            value: `${floor.floor_id}`,
                            action_id: "delete_floor",
                            style: "danger"
                        }
                    },
                    { type: "divider" }
                ])
            );
        } else {
            blocks.push({
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "No floors available."
                }
            });
        }

        return blocks;
    };

    //publish the floors
    const publishFloorsView = async (client, userId, floors) => {
        await client.views.publish({
            user_id: userId,
            view: {
                type: 'home',
                blocks: getFloorsBlocks(floors)
            }
        });
    };

    // Action to open the Add Floor modal
    app.action('add_floor', async ({ ack, client, body }) => {
        try {
            await ack();
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'add_floor_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Add Floor'
                    },
                    blocks: [
                        {
                            type: 'input',
                            block_id: 'floor_name_input',
                            element: {
                                type: 'plain_text_input',
                                action_id: 'floor_name',
                                placeholder: {
                                    type: 'plain_text',
                                    text: "Enter Floor Name"
                                }
                            },
                            label: {
                                type: 'plain_text',
                                text: 'Floor Name'
                            },

                        }],
                    submit: {
                        type: 'plain_text',
                        text: 'Add'
                    }
                }
            });
        } catch (error) {
            console.error('Error handling add_floor action:', error);
        }
    });

    app.view('add_floor_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            const floorName = view.state.values.floor_name_input.floor_name.value;

            await insertFloor(floorName);

            const floors = await getFloors();

            await publishFloorsView(client, body.user.id, floors);

            await client.chat.postMessage({
                channel: body.user.id,
                text: `"${floorName}" has been added successfully!`
            });
        } catch (error) {
            console.error('Error handling add_floor_modal submission:', error);
        }
    });

    //Action to open delete floor modal 
    app.action('delete_floor', async ({ ack, client, body, action }) => {
        try {
            await ack();

            const floorId = action.value;
            const floorName = await getFloorNameByFloorId(floorId);
            await client.views.open({
                trigger_id: body.trigger_id,
                callback_id: 'delete_floor_modal',
                view: {
                    type: 'modal',
                    callback_id: 'delete_floor_modal',
                    private_metadata: `${floorId}`,
                    title: {
                        type: 'plain_text',
                        text: 'Confirm Delete'
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "plain_text",
                                text: `Are you sure you want to delete ${floorName}`,
                                emoji: true
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Delete',
                    }
                }
            });
        } catch (error) {
            console.error('Error opening delete_hot_seat modal:', error);
        }
    });


    app.view('delete_floor_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();

            const floorId = view.private_metadata;

            console.log("Private Metadata:", view.private_metadata);

            // Perform the deletion logic
            const areas = await getAreasByFloorId(floorId);
            const floorName = await getFloorNameByFloorId(floorId);
            if (areas == 0) {
                await deleteFloorById(floorId);
                const floors = await getFloors();
                await publishFloorsView(client, body.user.id, floors);
                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `${floorName} has been successfully deleted`
                });

                console.log(`Successfully deleted floor: ${floorId}`);
            } else {
                console.log('Hot Seats are Available');

                await client.chat.postMessage({
                    channel: body.user.id,
                    text: `Hot seats are availale inside the Area "${floorName}". So, Yo can't delete the Area "${floorName}". `
                });
            }

        } catch (error) {
            console.error('Error handling delete_hot_seat_modal submission:', error);
        }
    });

}

module.exports = { Floors };
