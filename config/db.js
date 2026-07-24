// This file's only job is to connect to the database ONCE and share
// that same connection with every route file. Any file that needs to
// run a query just does: const db = require("../config/db");
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: 'c237-marlina-mysql.mysql.database.azure.com',
  port: 3306,
  user: 'c237_002',
  password: 'c237002@2026!',
  database: 'c237_002_team4_eventmanagementdb',
  ssl: {
    rejectUnauthorized: true
  }
});

db.connect((err) => {
  if (err) {
    console.log(err);
    return;
  }
  console.log("MySQL Connected!");
});

module.exports = db;
