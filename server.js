const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection - Render Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.connect()
 .then(() => console.log('✅ Connected to Postgres Database'))
 .catch(err => console.error('❌ DB Connection Error:', err.message));

// Create Table if not exists
const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        reg_no VARCHAR(50) UNIQUE,
        full_name VARCHAR(200),
        email VARCHAR(200),
        phone VARCHAR(20),
        dob VARCHAR(50),
        gender VARCHAR(20),
        city VARCHAR(100),
        state VARCHAR(100),
        course VARCHAR(100),
        qualification VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Table ready');
  } catch (e) {
    console.log('Table error:', e.message);
  }
};
initDB();

// ========== ROUTES ==========

// 1. Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 2. Admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 3. FORM SUBMIT - Save data
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, full_name, email, phone, dob, gender, city, state, course, qualification } = req.body;
    const finalName = fullName || full_name;

    if (!finalName ||!email ||!phone) {
      return res.status(400).json({ success: false, message: 'Name, Email, Phone required' });
    }

    const reg_no = 'REG' + Date.now().toString().slice(-8);

    const result = await pool.query(
      `INSERT INTO registrations (reg_no, full_name, email, phone, dob, gender, city, state, course, qualification)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [reg_no, finalName, email, phone, dob, gender, city, state, course, qualification]
    );

    console.log('New Registration:', reg_no);
    res.json({ success: true, message: 'Registered Successfully', reg_no: reg_no, data: result.rows[0] });

  } catch (error) {
    console.error('Register Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. GET ALL REGISTRATIONS - For Admin Panel (YE WALA MISSING THA)
app.get('/api/registrations', async (req, res) => {
  try {
    const adminKey = req.query.key;
    if (adminKey!== 'Abhay@2027') {
      return res.status(401).json({ error: 'Unauthorized - Wrong Admin Key' });
    }

    const result = await pool.query('SELECT * FROM registrations ORDER BY id DESC');
    res.json(result.rows);

  } catch (error) {
    console.error('Fetch Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// 5. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: 'Connected' });
});

// Start Server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
