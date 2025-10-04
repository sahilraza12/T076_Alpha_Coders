// ----------------------------------------------------------------
// 🚀 AdhikarNOW Complete Backend Server
// ----------------------------------------------------------------

// --- 1. Import Required Libraries ---
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const PDFDocument = require('pdfkit');

// --- 2. Initialize the App and Database ---
const app = express();
const PORT = 3000; // The port our server will run on

// Connect to the SQLite database file
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("Error opening database", err.message);
    } else {
        console.log("✅ Connected to the SQLite database.");
        // Use db.serialize to run database commands in order
        db.serialize(() => {
            // Create the 'users' table
            db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)');
            
            // Create the 'questions' table
            db.run('CREATE TABLE IF NOT EXISTS questions (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, category TEXT, details TEXT, is_anonymous BOOLEAN, user_id INTEGER, FOREIGN KEY(user_id) REFERENCES users(id))');
            
            // Create the 'cases' table
            db.run(`
                CREATE TABLE IF NOT EXISTS cases (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    case_id TEXT UNIQUE NOT NULL,
                    subject TEXT,
                    assigned_advocate TEXT,
                    user_id INTEGER,
                    timeline TEXT 
                )
            `);

            // Add a sample case for testing if it doesn't exist
            const sampleCaseId = 'ANOW-12345';
            const checkSql = 'SELECT * FROM cases WHERE case_id = ?';
            db.get(checkSql, [sampleCaseId], (err, row) => {
                if (!row) { // Only insert if the case doesn't already exist
                    const timelineData = JSON.stringify([
                        { status: 'Case Filled', date: 'September 15, 2025', icon: 'fa-check', completed: true },
                        { status: 'Advocate Assigned', date: 'September 16, 2025', icon: 'fa-check', completed: true },
                        { status: 'First Consultation Held', date: 'September 18, 2025', icon: 'fa-gavel', completed: false }
                    ]);
                    const insertSql = `INSERT INTO cases (case_id, subject, assigned_advocate, user_id, timeline) VALUES (?, ?, ?, ?, ?)`;
                    db.run(insertSql, [sampleCaseId, 'Tenant Eviction Notice', 'Adv. Arjun Mehta', 1, timelineData]);
                    console.log('✅ Sample case created for testing.');
                }
            });
        });
    }
});

// --- 3. Add Middleware ---
app.use(cors());
app.use(express.json());

// --- 4. API Routes ---

// Test Route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the AdhikarNOW Backend API!' });
});

// User Signup
app.post('/api/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    try {
        const password_hash = await bcrypt.hash(password, 10);
        const sql = 'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)';
        db.run(sql, [name, email, password_hash], function(err) {
            if (err) {
                return res.status(409).json({ error: 'This email address is already registered.' });
            }
            res.status(201).json({ message: 'User created successfully!', userId: this.lastID });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error while hashing password.' });
    }
});

// User Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    const sql = 'SELECT * FROM users WHERE email = ?';
    db.get(sql, [email], async (err, user) => {
        if (!user) {
            return res.status(401).json({ error: 'Incorrect email or password.' });
        }
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (isMatch) {
            res.status(200).json({ message: 'Login successful!', user: { id: user.id, name: user.name } });
        } else {
            res.status(401).json({ error: 'Incorrect email or password.' });
        }
    });
});

// Submit a Legal Question
app.post('/api/questions', (req, res) => {
    const { title, category, details, isAnonymous } = req.body;
    if (!title || !category || !details) {
        return res.status(400).json({ error: 'Title, category, and details are required.' });
    }
    const sql = 'INSERT INTO questions (title, category, details, is_anonymous) VALUES (?, ?, ?, ?)';
    db.run(sql, [title, category, details, isAnonymous], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Could not save question.' });
        }
        res.status(201).json({ message: 'Question submitted successfully!', questionId: this.lastID });
    });
});

// Get Case Details by Case ID
app.get('/api/case/:caseId', (req, res) => {
    const caseId = req.params.caseId;
    const sql = "SELECT * FROM cases WHERE case_id = ?";
    
    db.get(sql, [caseId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Database error." });
        }
        if (row) {
            row.timeline = JSON.parse(row.timeline); 
            res.status(200).json(row);
        } else {
            res.status(404).json({ error: "Case not found." });
        }
    });
});

// Generate a Legal Notice PDF
app.post('/api/generate-notice', (req, res) => {
    const { senderName, senderFatherName, senderAddress, recipientName, recipientAddress, reason, amount } = req.body;
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Legal_Notice_${Date.now()}.pdf`);
    doc.pipe(res);
    doc.fontSize(18).font('Helvetica-Bold').text('LEGAL NOTICE', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(12).font('Helvetica').text(`Date: ${new Date().toLocaleDateString('en-IN')}`).moveDown();
    doc.font('Helvetica-Bold').text('From:');
    doc.font('Helvetica').text(senderName || '[Not Provided]').text(`s/o ${senderFatherName || '[Not Provided]'}`).text(senderAddress || '[Not Provided]').moveDown();
    doc.font('Helvetica-Bold').text('To:');
    doc.font('Helvetica').text(recipientName || '[Not Provided]').text(recipientAddress || '[Not Provided]').moveDown(2);
    doc.font('Helvetica-Bold').text(`Subject: Legal Notice for Non-Payment of Dues Amounting to Rs. ${amount || '______'}`);
    doc.moveDown();
    doc.text(`Under instructions from my client, ${senderName}, you are hereby served with the following legal notice:`);
    doc.moveDown();
    doc.text(`That you have failed to pay the outstanding amount of Rs. ${amount || '______'} for the following reason: ${reason || '[REASON FOR NON-PAYMENT]'}.`);
    doc.moveDown();
    doc.text(`You are hereby called upon to make the payment of the said amount within 15 days from the receipt of this notice, failing which my client shall be constrained to take further legal action against you.`);
    doc.moveDown(3);
    doc.font('Helvetica-Bold').text('(Advocate Signature)');
    doc.end();
});

// --- 5. Start the Server ---
app.listen(PORT, () => {
    console.log(`👨‍💻 Server is running and listening on http://localhost:${PORT}`);
});