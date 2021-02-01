const express = require('express');
const router = express.Router();
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const { Router } = require('express');
const tokenKey = 'Token Key';

var connectionData = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'marketplacedb'
}

router.use(bodyParser.json());


router.get('/api/users', (req, res) => {
  let connection = mysql.createConnection(connectionData)
  connection.query('SELECT * FROM users', (err, rows, fields) => {
    res.json(rows)
  });
  connection.end();
})

router.post('/api/register', (req, res) => {
  let user = req.body;

  if (user.password.length < 8) {

    let body = {
      "field": "current_password",
      "message": "Wrong current password"
    }
    res.status(422).json(body);
    return;
  }

  let connection = mysql.createConnection(connectionData);
  const queryString = 'INSERT INTO users (name, phone, email, password) VALUES (?, ?, ?, ?)'
  connection.query(queryString, [user.name, user.phone, user.email, user.password], (err, results, fields) => {
    if (err) {
      console.log('Failed to insert new user:' + err)
      res.sendStatus(500)
      return
    }

    console.log(results);

  })
  res.status(200).json({ token: jwt.sign({ id: results.insertId }, tokenKey) });
})

router.post('/api/login', (req, res) => {
  let email = req.body.email;
  let password = req.body.password;
  let connection = mysql.createConnection(connectionData);
  connection.query('SELECT * FROM users WHERE email = ?', email, (err, rows, fields) => {
    if (err || !rows[0]) {
      let body = {
        "field": "email",
        "message": "Wrong email or password"
      }
      res.status(422).json(body);
      return;
    }

    if (rows[0].password != password) {
      let body = {
        "field": "password",
        "message": "Wrong email or password"
      }
      res.status(422).json(body);
      return;
    }

    res.status(200).json({ token: jwt.sign({ id: rows[0].id }, tokenKey) })
  })
})

router.get('/api/me', (req, res) => {
  if (req.headers.authorization) {
    jwt.verify(
      req.headers.authorization.split(' ')[1],
      tokenKey,
      (err, payload) => {
        if (err) {
          res.sendStatus(401)
          return
        }
        else if (payload) {
          let connection = mysql.createConnection(connectionData)
          connection.query('SELECT id, name, phone, email FROM users WHERE id = ?', payload.id, (err, rows, fields) => {
            res.json(rows[0]);
          });
          connection.end();
        }
      }
    )
  }
})

router.get('/api/items', (req, res) => {
  let items = [];
  let connection = mysql.createConnection(connectionData)
  connection.query('SELECT * FROM items', (err, results, fields) => {
    results.forEach(item => {
      connection.query('SELECT id, name, email, phone FROM users WHERE id = ?', item.user_id, (err, results) => {
        items.push({ ...item, user: results[0] })
      })
    });

    connection.end(() => {
      res.json(items);
    });
  });
});

router.post('/api/items', (req, res) => {
  let title = req.body.title;
  let price = req.body.price;
  if (req.headers.authorization) {
    jwt.verify(
      req.headers.authorization.split(' ')[1],
      tokenKey,
      (err, payload) => {
        if (err) {
          res.sendStatus(401)
          return
        }
        else if (payload) {
          let connection = mysql.createConnection(connectionData)
          connection.query('INSERT INTO items (user_id, title, price) VALUES (?, ?, ?)',
            [payload.id, title, price], (err, rows, fields) => {
              res.json(rows[0]);
            });
          connection.end();
        }
      }
    )
  }
})

router.get('/api/items/:id', (req, res) => {
  let connection = mysql.createConnection(connectionData)
  let id = req.params.id;
  connection.query('SELECT * FROM items WHERE id = ?', id, (err, results, fields) => {
    console.log(results);
    if (results.length == 0) {
      res.sendStatus(404)
      return
    }
    let item = results[0];
    connection.query('SELECT id, name, email, phone FROM users WHERE id = ?', item.user_id, (err, results) => {
      res.json({ ...item, user: results[0] })
    })
    connection.end();
  });
});

router.put('/api/items/:id', (req, res) => {
  let id = req.params.id;
  if (req.headers.authorization) {
    jwt.verify(
      req.headers.authorization.split(' ')[1],
      tokenKey,
      (err, payload) => {
        if (err) {
          res.sendStatus(401)
          return
        }
        else if (payload) {
          let connection = mysql.createConnection(connectionData)
          connection.query('SELECT * FROM items WHERE id = ?', id, (err, results, fields) => {
            if (results.length == 0) {
              res.sendStatus(404);
            }
            else if (results[0].user_id != payload.id) {
              res.sendStatus(403)
            }
            else if (req.body.title.length < 3) {
              res.status(422).json({
                "field": "title",
                "message": "Title should contain at least 3 characters"
              });
            }
            else {
              connection.query('UPDATE items SET ? WHERE id = ?', [req.body, id], () => {
                connection.query('SELECT * FROM items WHERE id = ?', id, (err, results) => {
                  let item = results[0];
                  connection.query('SELECT id, name, email, phone FROM users WHERE id = ?', item.user_id, (err, results) => {
                    res.json({ ...item, user: results[0] })
                    connection.end();
                  })
                });
              })
            }
          })
        }
      }
    )
  }
  else {
    res.sendStatus(401);
  }
})

router.delete('/api/items/:id', (req, res) => {
  const id = req.params.id;
  if (req.headers.authorization) {
    jwt.verify(
      req.headers.authorization.split(' ')[1],
      tokenKey,
      (err, payload) => {
        if (err) {
          res.sendStatus(401)
          return
        }
        else if (payload) {
          let connection = mysql.createConnection(connectionData)
          connection.query('SELECT * FROM items WHERE id = ?', id, (err, results, fields) => {
            if (results.length == 0) {
              res.sendStatus(404);
            }
            else if (results[0].user_id != payload.id) {
              res.sendStatus(403)
            }
            connection.query('DELETE FROM items WHERE id = ?', id, (err, result) => {
              res.sendStatus(200);
              connection.end();
            })
          })
        }
      }
    )
  }
  else {
    res.sendStatus(401);
  }
})
module.exports = router;
