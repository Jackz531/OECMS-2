const express = require('express');
const app = express();
const port = 3000;
const path = require('path');
// Require the studentRouter module

app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'home.html'));
});
// Use the studentRouter as middleware on the /student path
const studentRouter = require('./studentRouter');
app.use('/student', studentRouter);

const professorRouter = require('./professorRouter');
app.use('/professor', professorRouter);

// Define other routes or middleware as needed

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
