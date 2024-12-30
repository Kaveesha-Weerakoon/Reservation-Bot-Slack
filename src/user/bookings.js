const moment = require('moment');

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

const availableSeatList = {
    blocks: [
        {
            "type": "divider"
        },
        {
            "type": "input",
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
}


module.exports = {
    bookingsUI,
    availableSeatList
};
