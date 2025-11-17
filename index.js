// index.js
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { attachHandlers } = require('./bot/handlers');
const { init, notifyNOC, sendAdminReport } = require('./bot/notifications');
const { registerMetricsCommands, weeklyReport } = require('./bot/commands');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN missing in .env');

const bot = new TelegramBot(token, { polling: true });

// init notifications module with bot instance
init(bot);

// attach handlers
attachHandlers(bot);

// metrics commands
registerMetricsCommands(bot);


console.log('🤖 Bot modular iniciado correctamente.');
