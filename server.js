import express from 'express';
import mysql from 'mysql'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser';


const salt = 10;

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(cors({
    origin: ["http://localhost:5173"],
    methods: ["POST", "GET", "PUT"],
    credentials: true
}));

const db = mysql.createConnection({ 
    host:"localhost",
    user: "root",
    password: "",
    database: 'signup'
    
});

app.post('/register', (req, res) => {
  const { firstname, lastname, email, password } = req.body;

  const sql = `
    INSERT INTO login (firstname, lastname, email, password, role)
    VALUES (?, ?, ?, ?, 'user')
  `;

  bcrypt.hash(password.toString(), salt, (err, hash) => {
    if (err) return res.status(500).json({ Error: "Password hashing error" });

    const values = [firstname, lastname, email, hash];

    db.query(sql, values, (err, result) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ Error: "Insert data error" });
      }
      return res.status(200).json({ Status: "Success" });
    });
  });
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