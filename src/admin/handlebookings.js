const { App } = require('@slack/bolt');
const { getBookingsByDate, deleteReservationById, getUserIdByReservationId, getReservationById } = require('../../database/database');
const moment = require('moment');  // Import moment
const { WebClient } = require('@slack/web-api');

function HandleBookings(app) {
    app.action('view_all_reservations', async ({ ack, client, body }) => {
        try {
            await ack(); // Acknowledge the action to avoid timeout

            // Open the modal with bookingUI blocks
            await client.views.open({
                trigger_id: body.trigger_id, // trigger_id is required to open a modal
                view: {
                    type: 'modal',
                    callback_id: 'view_all_bookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'View Bookings' // Ensure this is under 25 characters
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

    const bookingsUI = {
        blocks: [
            {
                "type": "divider"
            },
            {
                "type": "input",
                "block_id": "viewBookingsDatePickerBlock",
                "element": {
                    "type": "datepicker",
                    "initial_date": moment().format('YYYY-MM-DD'), // Sets today's date
                    "placeholder": {
                        "type": "plain_text",
                        "text": "Select a date",
                        "emoji": true
                    },
                    "action_id": "datePickerAction"
                },
                "label": {
                    "type": "plain_text",
                    "text": "Date",
                    "emoji": true
                }
            }
        ]
    };

    app.view('view_all_bookings_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();
    
            const date = view.state.values.viewBookingsDatePickerBlock.datePickerAction.selected_date;
            console.log('Selected Date:', date);
    
            if (!date) {
                console.error('No date selected.');
                return;
            }
    
            const reservations = await getBookingsByDate(date);
            const today = new Date().toISOString().split('T')[0];
    
            let blocks = [];
            if (reservations.length > 0) {
                // Fetch user names asynchronously
                const reservationsWithUsernames = await Promise.all(
                    reservations.map(async (reservation) => {
                        const userName = await getUserNameById(reservation.user_id);
                        return { ...reservation, userName };
                    })
                );
    
                // Map reservations to block structure
                blocks = reservationsWithUsernames.flatMap((reservation, index) => {
                    const reservationBlock = [
                        {
                            type: 'section',
                            text: {
                                type: 'mrkdwn',
                                text: `👨‍💻  *Reservation ID:* _${reservation.reservation_id}_ | *User:* ${reservation.userName}\n` +
                                      `*Seat:* ${reservation.hot_seat_name} | *Time Slot:* _${reservation.time_slot}_\n` +
                                      `*Floor:* _${reservation.floor_name}_ | *Area:* _${reservation.area_name}_`
                            },
                            accessory: new Date(reservation.date) >= new Date(today)
                            ?{
                                type: 'button',
                                text: {
                                    type: 'plain_text',
                                    text: 'Cancel Reservation'
                                },
                                value: `${reservation.reservation_id}`,
                                action_id: 'cancel_reservation_admin',
                                style: 'danger'
                            }
                            : undefined
                        },
                    ];
    
                    // Add a divider block unless it's the last reservation
                    if (index < reservationsWithUsernames.length - 1) {
                        reservationBlock.push({ type: 'divider' });
                    }
    
                    return reservationBlock;
                });
            } else {
                blocks.push({
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `No reservations found for ${date}.`
                    }
                });
            }
    
            // Open modal with the reservations
            await client.views.open({
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'view_all_bookings_modal',
                    title: {
                        type: 'plain_text',
                        text: 'Bookings'
                    },
                    blocks: [
                        {
                            type: 'header',
                            text: {
                                type: 'plain_text',
                                text: `🗓️ Reservations on ${date}\n`
                            }
                        },
                        {type: 'divider'},
                        ...blocks
                    ]
                }
            });
        } catch (error) {
            console.error('Error processing view_all_bookings_modal:', error);
        }
    });
    
    
    async function getUserNameById(userId) {
        const client = new WebClient(process.env.SLACK_BOT_TOKEN);
        try {
            // Fetch user information
            const response = await client.users.info({
                user: userId,
            });
    
            if (response.ok) {
                const user = response.user;
                //console.log(`User Name: ${user.real_name}`);
                return user.real_name; // or user.profile.display_name for the Slack handle
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    }
    

    app.action('cancel_reservation_admin', async ({ action, ack, client, body }) => {
        try {
            await ack();
    
            const reservationId = action.value; // Extract reservationId from button value
            console.log('Reservation ID from action:', reservationId);
    
            if (!reservationId) {
                console.error('Reservation ID is missing.');
                return;
            }
    
            // Open the cancellation confirmation modal
            await client.views.update({
                view_id: body.view.id,
                trigger_id: body.trigger_id,
                view: {
                    type: 'modal',
                    callback_id: 'cancel_reservation_admin_modal',
                    private_metadata: reservationId, // Pass the reservationId
                    title: {
                        type: 'plain_text',
                        text: 'Cancel Reservation'
                    },
                    blocks: [
                        {
                            type: 'section',
                            text: {
                                type: 'plain_text',
                                text: 'Are you sure you want to cancel this reservation?',
                                emoji: true
                            }
                        }
                    ],
                    submit: {
                        type: 'plain_text',
                        text: 'Confirm'
                    }
                }
            });
        } catch (error) {
            console.error('Error opening cancel_reservation_modal:', error);
        }
    });
    
    

    app.view('cancel_reservation_admin_modal', async ({ ack, body, view, client }) => {
        try {
            await ack();
    
            const reservationId = view.private_metadata;
            console.log('Private Metadata (Reservation ID):', reservationId);
            const userId = await getUserIdByReservationId(reservationId);
            const reservations = await getReservationById(reservationId);
            
            const userName = await getUserNameById(userId);
            const adminName = await getUserNameById(body.user.id);

            const reservation = reservations[0];
            console.log(reservation);
    
            if (!reservationId) {
                console.error('Reservation ID is missing from private_metadata.');
                return;
            }
    
            // Delete the reservation
            await deleteReservationById(reservationId);
            console.log(userId);

            await client.chat.postMessage({
                channel: userId,
                text: `Reservation made by you on ${reservation.date}, ${reservation.time_slot} has been cancelled. Please contact ${adminName} for more details`
            });

            await client.chat.postMessage({
                channel: body.user.id,
                text: `Reservation made by ${userName} on ${reservation.date}, ${reservation.time_slot} has been cancelled.`
            });
    
            console.log(`Successfully deleted reservation: ${reservationId}`);
        } catch (error) {
            console.error('Error handling cancel_reservation_admin_modal submission:', error);
        }
    });
    
    
}

module.exports = { HandleBookings };
