//User Menu Functions ----Kaveesha----
const menu = require('./menu.js');
const { insertAdmin, isUserAdmin, getHotSeatTables, reserveHotSeat, getBookingsByUser, cancelReservation, getHotSeatTablesbyArea, getTablesByArea, getReservationsAtTimeSlotByUser,isPermanentHotSeatUser,getPermanentSeatName} = require('../../database/database.js');
const reserveUI = require('./reserve.js');
const { bookingsUI, availableSeatList } = require('./bookings.js');


const publishUserMenu = async (client, userId) => {
    await client.views.publish({
        user_id: userId,
        view: {
            type: 'home',
            blocks: menu
        }
    })
}

function User(app){

app.action('reserve', async ({ ack, client, body }) => {
    try {
        await ack();
        const userId = body.user.id;

        const status=await isPermanentHotSeatUser(userId);
        const hotSeatName = await getPermanentSeatName(userId);
        if(status){
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'viewbookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Invalid Date Selection'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `🚫 You have assigned a Perement Seat. Hot Seat: ${hotSeatName[0].hot_seat_name}`
                            }
                        }
                    ]
                }
            });
            return;
        }

        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: 'modal',
                callback_id: 'viewAreasWithHotSeats',
                title: {
                    type: 'plain_text',
                    text: 'Pick a Date and Time'
                },
                blocks: reserveUI.blocks,
                submit: {
                    type: 'plain_text',
                    text: 'View Seats'
                }
            }
        });
    } catch (error) {
        console.error('Error handling reserve action:', error);
    }
});


app.view('viewAreasWithHotSeats', async ({ body, view, client, ack }) => {
    try {
        await ack();

        const date = view.state.values?.datePickerBlock?.datePickerAction?.selected_date;
        const timeSlot = view.state.values?.timeSelectionBlock?.timeSelectionAction?.selected_option?.value;

        if (!date || !timeSlot) {
            await client.chat.postMessage({
                channel: body.user.id,
                text: "*Reservation Failed*: Please select both a date 📅 and a time slot 🕒 to proceed."
            });
            return;
        }

        const today = new Date();
        const selectedDate = new Date(date);
        today.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'viewbookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Invalid Date Selection'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '*🚫 You cannot select a past date.* Please choose today or a future date.',
                            },
                        },
                    ],
                },
            });
            return;
        }

        const userId = body.user.id;
        const areasWithSeats = await getReservationsAtTimeSlotByUser(date, timeSlot, userId);
        console.log("Reservation data:", areasWithSeats);

        if (areasWithSeats) {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'viewbookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Invalid Date Selection'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '🚫 You have a reservation on selected time slots',
                            },
                        },
                    ],
                },
            });
            return;
        }

        if (date && timeSlot) {
            const loadingModal = await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    title: {
                        type: 'plain_text',
                        text: 'Loading...',
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'Please wait while we load the data...',
                            },
                        },
                    ],
                },
            });

            const areasWithSeats = await getHotSeatTablesbyArea(date, timeSlot);
            console.log(areasWithSeats);

            const blocks = [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Selected Date*: ${date} | *Time Slot*: ${timeSlot}`,
                    },
                },
                {
                    type: 'divider',
                },
            ];

            areasWithSeats.forEach((area, index) => {

                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `🔴 *Floor*: ${area.floor_name} | *Area*: ${area.area_name}\n*🟢 Free Tables*: ${area.free_seats}`,
                    },
                    accessory: {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: 'View',
                        },
                        style: 'primary',
                        value: JSON.stringify({
                            floor_name: area.floor_name,
                            area_id: area.area_id,
                            date,
                            imageUrl: area.image_url,
                            time_slot: timeSlot,
                        }),
                        action_id: 'viewButton',
                    },
                });

                if (index < areasWithSeats.length - 1) {
                    blocks.push({
                        type: 'divider',
                    });
                }
            });

            await client.views.update({
                view_id: loadingModal.view.id,
                view: {
                    type: 'modal',
                    title: {
                        type: 'plain_text',
                        text: 'Available Areas',
                    },
                    blocks,
                },
            });
        }

    } catch (error) {
        console.error('Error handling reserve action:', error);
    }
});


app.action('viewButton', async ({ body, ack, client }) => {
    try {
        await ack();

        const { floor_name, area_id, date, time_slot, imageUrl } = JSON.parse(body.actions[0].value);

        const tables = await getTablesByArea(area_id, date, time_slot);
        console.log("Tables:", JSON.stringify(tables, null, 2));
        const userId = body.user.id;

        const fetchSlackUserName = async (slackUserId) => {
            try {
                const response = await client.users.info({ user: slackUserId });
                console.log(response);
                return response.user.real_name || response.user.name || 'Unknown User';
            } catch (error) {
                console.error(`Error fetching Slack username for ${slackUserId}:`, error);
                return 'Unknown User';
            }
        };

        const generateTableRows = async (tableArray) => {
            return Promise.all(
                tableArray.map(async (table) => {
                    let tableText;
                    const tableEmoji = (table.is_reserved || table.is_permanent) ? '🔴' : '🟢'; // Red for reserved, Green for available

                    if (table.is_reserved) {
                        const reservedBy = await fetchSlackUserName(table.reserved_by);
                        tableText = `*Reserved by*: ${reservedBy}`;
                    } else if (table.is_permanent) {
                        tableText = `*Reserved by*: Permanent`;
                    } else {
                        tableText = `*Available*`;
                    }

                    // Build UI blocks
                    if (table.is_reserved || table.is_permanent) {
                        // Non-clickable row for reserved tables
                        return {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `${tableEmoji} *Table*: ${table.hot_seat_name} | *Status*: ${tableText}`,
                            },
                        };
                    } else {
                        // Clickable button for available tables
                        return {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `${tableEmoji} *Table*: ${table.hot_seat_name} | *Status*: ${tableText}`,
                            },
                            accessory: {
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: 'Reserve',
                                },
                                style: 'primary',
                                action_id: 'reserve_table',
                                value: JSON.stringify({
                                    area_id,
                                    hot_seat_id: table.hot_seat_id, // Send the hot_seat_id for reservation
                                    date,
                                    timeSlot: time_slot,
                                    userId,
                                }),
                            },
                        };
                    }
                })
            );
        };

        // Divide tables by their status
        const reservedTables = tables.filter(table => table.is_reserved || table.is_permanent);
        const availableTables = tables.filter(table => !table.is_reserved && !table.is_permanent);

        // Generate table rows for reserved and available tables
        const reservedTableRows = await generateTableRows(reservedTables);
        const availableTableRows = await generateTableRows(availableTables);

        // Add a divider between the sections
        const tableSections = [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "*Reserved Tables*",
                },
            },
            ...reservedTableRows,
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: "*Available Tables*",
                },
            },
            ...availableTableRows,
        ];

        // Create the modal with the fetched tables
        const blocks = [
            {
                type: 'image',
                image_url: imageUrl, // Image URL
                alt_text: 'Area Image', // Alt text for the image
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Selected Details*:\n\n*Floor*: ${floor_name} | *Area ID*: ${area_id} | *Date*: ${date} | *Time Slot*: ${time_slot}`,
                },
            },
            {
                type: 'divider',
            },
            ...tableSections, // Insert the reserved and available tables sections
        ];

        // Update the modal with the table data
        await client.views.update({
            view_id: body.view.id,
            view: {
                type: 'modal',
                callback_id: 'view_area_details_modal',
                title: {
                    type: 'plain_text',
                    text: 'Area Details',
                },
                blocks,
            },
        });
    } catch (error) {
        console.error('Error handling view button action:', error);
    }
});


app.action('viewBookings', async ({ ack, client, body }) => {
    try {
        await ack();

        await client.views.open({
            trigger_id: body.trigger_id, // trigger_id is required to open a modal
            view: {
                type: 'modal',
                callback_id: 'viewbookingsModal',
                title: {
                    type: 'plain_text',
                    text: 'View Your Hot Seats' // Ensure this is under 25 characters
                },
                blocks: bookingsUI.blocks, // Ensure this is correctly defined
                submit: {
                    type: 'plain_text',
                    text: 'View'
                }
            }
        });
    } catch (error) {
        console.error('Error handling viewBookings action:', error);
    }
});


app.view('viewbookingsModal', async ({ ack, body, view, client }) => {
    try {
        await ack();

        const date = view.state.values.viewBookingsDatePickerBlock?.datePickerAction?.selected_date;
        const userId = body.user.id;
        const reservations = await getBookingsByUser(userId, date);

        const today = new Date().toISOString().split('T')[0];

        const blocks = reservations.length > 0
            ? reservations.flatMap((reservation, index) => [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🟢 Seat: ${reservation.hot_seat_name}  |  Reservation ID: _${reservation.reservation_id}_ \nDate: _${reservation.date}_  |  Time Slot: _${reservation.time_slot}_ \nFloor: _${reservation.floor_name}_  |  Area: _${reservation.area_name}_  `
                    },
                    accessory: new Date(reservation.date) >= new Date(today)
                        ? {
                            type: "button",
                            text: {
                                type: "plain_text",
                                text: "Cancel Reservation"
                            },
                            style: "danger",
                            value: String(reservation.reservation_id),
                            action_id: "cancel_reservation"
                        }
                        : undefined
                },

                ...(index < reservations.length - 1 ? [{ type: "divider" }] : [])
            ])
            : [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `You have no reservations for *${date}*.`
                    }
                }
            ];

        await client.views.open({
            trigger_id: body.trigger_id,
            view: {
                type: "modal",
                callback_id: "viewbookings_modal",
                title: {
                    type: "plain_text",
                    text: "Your Reservations"
                },
                blocks: [
                    {
                        type: "header",
                        text: {
                            type: "plain_text",
                            text: `Reservations for ${date}`
                        }
                    },
                    {
                        type: "divider"
                    },
                    ...blocks
                ]
            }
        });
    } catch (error) {
        console.error('Error processing view submission:', error);

        await client.chat.postMessage({
            channel: body.user.id,
            text: "An error occurred while fetching your reservations. Please try again later."
        });
    }
});


app.action('cancel_reservation', async ({ ack, body, client }) => {
    try {
        await ack();

        const reservationId = body.actions[0].value;

        // Cancel the reservation in your database
        await cancelReservation(reservationId);

        // Notify the user
        await client.chat.postMessage({
            channel: body.user.id,
            text: `Reservation ID ${reservationId} has been successfully canceled.`
        });


        await client.views.update({
            view_id: body.view.id,  // Use the current view's ID
            // Use the current view's hash (for safety)
            view: {
                type: "modal",      // Modal type is required to close or update the view
                callback_id: "cancel_reservation",  // (optional) Include a callback_id to identify the view
                title: {
                    type: "plain_text",
                    text: "Cancellation Succeeded" // Custom title here
                },
                close: {
                    type: "plain_text",
                    text: "Close"
                },
                blocks: [
                    {
                        type: "section",
                        block_id: "confirmation_section",
                        text: {
                            type: "mrkdwn",
                            text: `Your cancellation was successful`
                        }
                    }
                ] // Including date and time in the modal blocks
            }
        });



    } catch (error) {
        console.error('Error canceling reservation:', error);

        // Notify the user about the error
        await client.chat.postMessage({
            channel: body.user.id,
            text: "An error occurred while canceling the reservation. Please try again later."
        });
    }
});


app.view('reserve_modal', async ({ ack, body, view, client }) => {
    try {
        await ack();

        // Extract date and time slot
        const date = view.state.values.datePickerBlock?.datePickerAction?.selected_date;
        const timeSlot = view.state.values.timeSelectionBlock?.timeSelectionAction?.selected_option?.value;

        // Validate user inputs
        if (!date || !timeSlot) {
            console.error("Date or Time Slot missing!");
            await client.chat.postMessage({
                channel: body.user.id,
                text: "*Reservation Failed*: Please select both a date 📅 and a time slot 🕒 to proceed."
            });
            return;
        }

        // Check if the selected date is in the past
        const today = new Date();
        const selectedDate = new Date(date);
        today.setHours(0, 0, 0, 0); // Reset today's time to midnight for comparison

        if (selectedDate < today) {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'viewbookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Invalid Date Selection'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: '*🚫 You cannot select a past date.* Please choose today or a future date .'
                            }
                        }
                    ]
                }
            });
            return;
        }

        // Fetch available hot seat tables
        const data = await getHotSeatTables(date, timeSlot);

        if (data.length === 0) {
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'viewbookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'No Seats Available'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: 'No seats are available for the selected time slot 🕒.'
                            }
                        }
                    ]
                }
            });
        } else {
            // Display available hot seats with dividers and blue Reserve button
            const reserveBlocks = data.flatMap((hotSeat, index) => [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🟢 *Hot Seat:* ${hotSeat.hot_seat_name}\nFloor: _${hotSeat.floor_name}_  |  Area: _${hotSeat.area_name}_ `
                    },
                    accessory: {
                        type: "button",
                        text: {
                            type: "plain_text",
                            text: "Reserve"
                        },
                        action_id: "reserveSeat",
                        value: JSON.stringify({
                            hot_seat_id: hotSeat.hot_seat_id,
                            date: date,
                            timeSlot: timeSlot,
                            userId: body.user.id
                        }),
                        style: "primary"  // This makes the button blue
                    }
                },
                // Add a divider after each hot seat except the last one
                ...(index < data.length - 1 ? [{ type: "divider" }] : [])
            ]);

            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'hotseatlist_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Available Hot Seats'
                    },
                    blocks: [
                        {
                            type: "section",
                            text: {
                                type: "mrkdwn",
                                text: `📅 *Date:* ${date}\n\n*🕒 Time Slot:* ${timeSlot}\n\nHere are the available hot seats:`
                            }
                        },
                        {
                            "type": "divider"
                        },
                        ...reserveBlocks
                    ]
                }
            });
        }

    } catch (error) {
        console.error('Error processing view submission:', error);

        await client.chat.postMessage({
            channel: body.user.id,
            text: "*Error*: We couldn't process your reservation. Please try again later."
        });
    }
});


app.action('reserveSeat', async ({ ack, body, client, action }) => {
    try {
        await ack();

        const { hot_seat_id, date, timeSlot, userId } = JSON.parse(action.value);

        await reserveHotSeat(hot_seat_id, date, timeSlot, userId);

        await client.chat.postMessage({
            channel: userId,
            text: `You have successfully reserved hot seat with ID ${hot_seat_id} for ${timeSlot} on ${date}.`
        });

        await client.views.update({
            view_id: body.view.id,  // Use the current view's ID
            hash: body.view.hash,   // Use the current view's hash (for safety)
            view: {
                type: "modal",      // Modal type is required to close or update the view
                callback_id: "reserve_modal",  // (optional) Include a callback_id to identify the view
                title: {
                    type: "plain_text",
                    text: "Reservation Confirmed" // Custom title here
                },
                close: {
                    type: "plain_text",
                    text: "Close"
                },
                blocks: [
                    {
                        type: "section",
                        block_id: "confirmation_section",
                        text: {
                            type: "mrkdwn",
                            text: `✅* Your Reservation is Confirmed!*\n\n\n🟢 Hot Seat ID: ${hot_seat_id} \n\n🔵 Date: ${date}\n\n🔴 Time Slot: ${timeSlot}`

                        }
                    }
                ] // Including date and time in the modal blocks
            }
        });


    } catch (error) {
        console.error('Error handling reserve action:', error);

        await client.chat.postMessage({
            channel: body.user.id,
            text: "Sorry, an error occurred while processing your reservation. Please try again later."
        });
    }
});


app.action('reserve_table', async ({ ack, body, client, action }) => {
    try {
        await ack();

        const { hot_seat_id, date, timeSlot, userId } = JSON.parse(action.value);

        await reserveHotSeat(hot_seat_id, date, timeSlot, userId);

        await client.chat.postMessage({
            channel: userId,
            text: `You have successfully reserved hot seat with ID ${hot_seat_id} for ${timeSlot} on ${date}.`
        });

        await client.views.update({
            view_id: body.view.id,  // Use the current view's ID
            hash: body.view.hash,   // Use the current view's hash (for safety)
            view: {
                type: "modal",      // Modal type is required to close or update the view
                callback_id: "reserve_modal",  // (optional) Include a callback_id to identify the view
                title: {
                    type: "plain_text",
                    text: "Reservation Confirmed" // Custom title here
                },
                close: {
                    type: "plain_text",
                    text: "Close"
                },
                blocks: [
                    {
                        type: "section",
                        block_id: "confirmation_section",
                        text: {
                            type: "mrkdwn",
                            text: `✅* Your Reservation is Confirmed!*\n\n\n🟢 Hot Seat ID: ${hot_seat_id} \n\n🔵 Date: ${date}\n\n🔴 Time Slot: ${timeSlot}`

                        }
                    }
                ] // Including date and time in the modal blocks
            }
        });


    } catch (error) {
        console.error('Error handling reserve action:', error);

        await client.chat.postMessage({
            channel: body.user.id,
            text: "Sorry, an error occurred while processing your reservation. Please try again later."
        });
    }
});
}
module.exports={publishUserMenu,User}