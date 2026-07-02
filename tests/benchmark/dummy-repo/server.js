const express = require('express');
const app = express();

const AWS_SECRET = "AKIAIOSFODNN7EXAMPLE";

app.get('/exec', (req, res) => {
  const code = req.query.code;
  // Intentionally vulnerable to RCE
  eval(code);
  res.send('Executed!');
});

app.listen(3000);
