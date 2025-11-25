import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const salt = 10;

app.use(cookieParser());
app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:5173",                     // dev
      
  ],
  methods: ["POST", "GET", "PUT"],
  credentials: true
}));

// PlanetScale MySQL Connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: true }
});

db.connect((err) => {
  if (err) console.log("DB Connection Error:", err);
  else console.log("Connected to PlanetScale");
});

app.post('/log-in', (req, res) => {
    const sql = 'SELECT * FROM login WHERE email = ?';
    db.query(sql, [req.body.email], (err,data) => {
    if(err) return res.json({Error: "Login error in server"});
        if(data.length > 0) {
            bcrypt.compare(req.body.password.toString(), data[0].password, (err, response) => {
                if(err) return res.json({Error: "Password compare error"});
                if (response) {
                  const id = data[0].id
                  const user_id = data[0].id
                  const firstname = data[0].firstname;
                  const lastname = data[0].lastname;
                  const role = data[0].role;
                  const token = jwt.sign({ firstname, lastname, role }, "jwt-key", { expiresIn: "1d" });
                  res.cookie("token", token, {
                  httpOnly: true,
                  secure: false,
                  sameSite: "lax",
                  path: "/",
                });
                return res.json({ Status: "Success", 
                  id, 
                  role, 
                  email: data[0].email, 
                  firstname: data[0].firstname, 
                  lastname: data[0].lastname });
                }

                else {
                    return res.json({Error: "Invalid Password"})
                }
                
            })
        } else return res.json({Error: "No email"});
})
});

app.post('/donate', (req, res) => {
  const { user_email, charity, amount, method } = req.body;
  const sql = "INSERT INTO donations (user_email, charity, amount, method) VALUES (?)";
  const values = [user_email, charity, amount, method];

  db.query(sql, [values], (err, result) => {
    if (err) return res.status(500).json({ Error: "Failed to insert donation" });
    return res.json({ Status: "Donation Successful" });
  });
});

app.get('/donations', (req, res) => {
  const { user_email } = req.query;
  const sql = `
    SELECT d.id, d.user_email, d.charity, d.amount, d.method, d.created_at
    FROM donations d
    WHERE d.user_email = ?
    ORDER BY d.created_at ASC
  `;
  db.query(sql, [user_email], (err, data) => {
    if (err) return res.status(500).json({ Error: "Failed to fetch donations" });
    return res.json(data);
  });
});

app.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;
  const sql = "INSERT INTO messages (name, email, subject, message) VALUES (?)";
  const values = [name, email, subject, message];

  db.query(sql, [values], (err, result) => {
    if (err) return res.status(500).json({ Error: "Failed to send message" });
    return res.status(200).json({ Status: "Message Sent" });
  });
});

app.get('/messages', (req, res) => {
  const sql = "SELECT * FROM messages ORDER BY created_at DESC";
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ Error: "Failed to fetch messages" });
    return res.json(data);
  });
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie('token');
  return res.json({ Status: "Success" });
});

app.get('/all-donations', (req, res) => {
  const sql = `
    SELECT d.id, d.user_email, d.charity, d.amount, d.method, d.created_at,
           l.firstname, l.lastname
    FROM donations d
    JOIN login l ON d.user_email = l.email
    ORDER BY d.created_at DESC
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ Error: "Failed to fetch donations" });
    return res.json(data);
  });
});

app.get('/all-users', (req, res) => {
  const sql = "SELECT id, firstname, lastname, email, role FROM login";

  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ Error: "Failed to fetch users" });
    return res.json(data);
  });
});

app.listen(8081, () => {
    console.log("Working")
})
