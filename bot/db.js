// bot/db.js
const mysql = require('mysql');
require('dotenv').config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sc1'
});

module.exports = pool;
