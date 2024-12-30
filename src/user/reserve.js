const moment = require('moment');

const reserveUI = {
    blocks: [
        {
            "type": "divider"
        },
        {
            "type": "input",
            "block_id": "datePickerBlock",
            "element": {
                "type": "datepicker",
                "initial_date": moment().format('YYYY-MM-DD'),
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
        },
        {
            "type": "input",
            "block_id": "timeSelectionBlock",
            "element": {
                "type": "static_select",
                "placeholder": {
                    "type": "plain_text",
                    "text": "Select a time slot",
                    "emoji": true
                },
                "options": [
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "morning",
                            "emoji": true
                        },
                        "value": "morning"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "evening",
                            "emoji": true
                        },
                        "value": "evening"
                    },
                    {
                        "text": {
                            "type": "plain_text",
                            "text": "both",
                            "emoji": true
                        },
                        "value": "both"
                    }
                ],
                "action_id": "timeSelectionAction"
            },
            "label": {
                "type": "plain_text",
                "text": "Time Slot",
                "emoji": true
            }
        }
    ]
};


module.exports = reserveUI;
