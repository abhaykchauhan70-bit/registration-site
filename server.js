const express = require('express');
const cors = require('cors');
const path = require('path');
let pool;
let usePostgres = false;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  usePostgres = true;
  console.log("Using Postgres DB");
} else {
  console.log("Using SQLite - set DATABASE_URL");
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function initDB(){
  if(usePostgres){
    await pool.query(`CREATE TABLE IF NOT EXISTS registrations (
      id SERIAL PRIMARY KEY, name TEXT, email TEXT, phone TEXT, dob TEXT,
      gender TEXT, city TEXT, state TEXT, course TEXT, qualification TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
  }
}
initDB();

app.post('/api/register', async (req,res)=>{
  const {name,email,phone,dob,gender,city,state,course,qualification} = req.body;
  try{
    if(usePostgres){
      await pool.query(`INSERT INTO registrations (name,email,phone,dob,gender,city,state,course,qualification) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [name,email,phone,dob,gender,city,state,course,qualification]);
    }
    res.json({success:true});
  }catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});

app.get('/api/registrations', async (req,res)=>{
  if(req.query.key !== 'abhay@123') return res.status(401).json({error:'Unauthorized'});
  try{
    const result = usePostgres ? await pool.query('SELECT * FROM registrations ORDER BY id DESC') : {rows:[]};
    res.json(result.rows);
  }catch(e){ res.status(500).json({error:e.message}); }
});

app.get('/api/export', async (req,res)=>{
  if(req.query.key !== 'abhay@123') return res.status(401).send('Unauthorized');
  const result = await pool.query('SELECT * FROM registrations');
  // simple CSV
  let csv = 'ID,Name,Email,Phone,DOB,Gender,City,State,Course\n';
  result.rows.forEach(r=>{ csv+=`${r.id},${r.name},${r.email},${r.phone},${r.dob},${r.gender},${r.city},${r.state},${r.course}\n`; });
  res.header('Content-Type','text/csv'); res.attachment('registrations.csv'); res.send(csv);
});

app.listen(10000, ()=> console.log('Server running'));S