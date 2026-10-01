const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const PDFDocument = require('pdfkit');

const app = express();
const db = new sqlite3.Database(path.join(__dirname, 'registrations.db'));
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me';

const FIELDS = [
  ['full_name', 'Full name', true], ['email', 'Email', true], ['phone', 'Phone', true],
  ['dob', 'Date of birth', true], ['gender', 'Gender', true],
  ['address', 'Address', true], ['city', 'City', true], ['state', 'State', true],
  ['pincode', 'PIN / ZIP code', true], ['country', 'Country', true],
  ['qualification', 'Highest qualification', true], ['occupation', 'Occupation', false],
  ['course', 'Programme', true],
  ['emergency_name', 'Emergency contact', true], ['emergency_phone', 'Emergency phone', true],
];

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reg_no TEXT UNIQUE NOT NULL,
    ${FIELDS.map(f => f[0] + ' TEXT' + (f[0] === 'email'? ' UNIQUE' : '')).join(',\n ')},
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function validate(b) {
  const errors = {};
  for (const [key, label, req] of FIELDS) {
    const v = String(b[key]?? '').trim();
    if (req &&!v) errors[key] = `${label} is required`;
    if (v.length > 200) errors[key] = `${label} is too long`;
  }
  if (!errors.email &&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) errors.email = 'Enter a valid email address';
  for (const k of ['phone', 'emergency_phone'])
    if (!errors[k] &&!/^\+?[0-9 ]{10,15}$/.test(b[k])) errors[k] = 'Enter 10–15 digits';
  if (!errors.dob && (isNaN(Date.parse(b.dob)) || new Date(b.dob) > new Date())) errors.dob = 'Enter a valid date of birth';
  return errors;
}

app.post('/api/register', (req, res) => {
  if (!req.body.consent) return res.status(400).json({ errors: { consent: 'Please accept the declaration' } });
  const errors = validate(req.body);
  if (Object.keys(errors).length) return res.status(400).json({ errors });

  const reg_no = 'REG-' + new Date().getFullYear() + '-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const cols = ['reg_no',...FIELDS.map(f => f[0])];
  const placeholders = cols.map(() => '?').join(', ');
  const values = [reg_no,...FIELDS.map(([k]) => String(req.body[k]?? '').trim())];

  db.run(`INSERT INTO registrations (${cols.join(', ')}) VALUES (${placeholders})`, values, function(e) {
    if (e) {
      if (String(e.message).includes('UNIQUE')) return res.status(409).json({ errors: { email: 'This email is already registered' } });
      console.error(e);
      return res.status(500).json({ error: 'Could not save your registration. Please try again.' });
    }
    res.json({ reg_no });
  });
});

app.get('/api/registration/:regNo/pdf', (req, res) => {
  db.get('SELECT * FROM registrations WHERE reg_no =?', [req.params.regNo], (err, r) => {
    if (err ||!r) return res.status(404).send('Registration not found');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${r.reg_no}.pdf"`);
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);
    doc.rect(0, 0, doc.page.width, 110).fill('#14213d');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(22).text('Registration Confirmation', 50, 38);
    doc.font('Helvetica').fontSize(11).fillColor('#9fe3d8').text('Reg. No: ' + r.reg_no, 50, 70);
    doc.fillColor('#fff').text('Date: ' + new Date(r.created_at + 'Z').toLocaleString('en-IN'), 50, 70, { align: 'right' });
    let y = 140;
    const section = (title, keys) => {
      doc.fillColor('#0f766e').font('Helvetica-Bold').fontSize(13).text(title, 50, y);
      y += 22;
      keys.forEach(k => {
        const f = FIELDS.find(x => x[0] === k);
        doc.fillColor('#667085').font('Helvetica').fontSize(10).text(f[1], 50, y, { width: 150 });
        doc.fillColor('#14213d').font('Helvetica-Bold').fontSize(11).text(r[k] || '-', 210, y, { width: 330 });
        y = Math.max(doc.y, y + 16) + 6;
        doc.moveTo(50, y - 3).lineTo(545, y - 3).strokeColor('#e4e7ec').lineWidth(0.5).stroke();
      });
      y += 14;
    };
    section('Personal details', ['full_name', 'email', 'phone', 'dob', 'gender']);
    section('Address', ['address', 'city', 'state', 'pincode', 'country']);
    section('Education & programme', ['qualification', 'occupation', 'course']);
    section('Emergency contact', ['emergency_name', 'emergency_phone']);
    doc.fillColor('#667085').font('Helvetica-Oblique').fontSize(9).text('This is a system-generated document. Keep your registration number for future reference.', 50, 770, { align: 'center', width: 495 });
    doc.end();
  });
});

app.get('/api/admin/registrations', (req, res) => {
  if (req.get('x-admin-key')!== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  db.all('SELECT * FROM registrations ORDER BY id DESC', (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Registration site running at http://localhost:${PORT}`));