const { App } = require('@slack/bolt');
const {isUserAdmin}=require('./database/database')
const {publishUserMenu, User}=require('./src/user/user')
const {publishAdminMenu}=require('./src/admin/admin');
const { Admin } = require('./src/admin/admin');
const {Floors}=require('./src/admin/floor');
const {Areas}=require('./src/admin/area');
const {HandleBookings}=require('./src/admin/handlebookings');
const {HotSeats}=require('./src/admin/hot_seat_table');
require('dotenv').config();

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    
});


MainMenu(app);
User(app);
Admin(app);
Areas(app);
HandleBookings(app);
Floors(app);
HotSeats(app);
// Start your app
(async () => {
    const port = process.env.PORT || 3000;
    await app.start(port);
    console.log(`⚡️ Bolt app is running on port ${port}!`);
})();


function MainMenu(app) {
    app.event('app_home_opened', async ({ event, client }) => {
        try {
            const userId = event.user;
            console.log(userId);
            const isAdmin = await isUserAdmin(userId);

            if (isAdmin) {
                await publishAdminMenu(client, userId);
            } else {
               
                await publishUserMenu(client, userId);
            }
            console.log('hello')
        } catch (error) {
            console.error("Error handling app_home_opened event:", error);
        }
    });

}








