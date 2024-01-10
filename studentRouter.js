const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const fs = require('fs');

// Create a new router object
const router = express.Router();
router.use(express.static(path.join(__dirname, 'views')));
// Use the session middleware
router.use(session({
  secret: 'some random string', 
  saveUninitialized: false,
  resave:false,
  cookie: {
    name:'auth',
    secure: false, 
    maxAge: 3600000 
  }
}));

// Use the express.urlencoded middleware
router.use(express.urlencoded({ extended: true }));

// Define the isAuthenticated middleware
function isAuthenticated(req, res, next) {
  // console.log(req.session.user);
  
  
  if (req.session && req.session.user) {
    console.log('User is authenticated.');
    next();
  } else {
    console.log('User is not authenticated. Redirecting to /student_login');
    res.redirect('/student_login');
  }
}

// Define the routes using router.METHOD()
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'student_login.html'));
});

router.post('/login', async (req, res) => {
  const rollNo = req.body.rollNo;
  // console.log(rollNo);
  try {
    const student = await db.getStudentByrollno(rollNo);
    // console.log(student.roll_no);
    if (student) {
      // Login successful, store the user object in the session
      
      req.session.user = { rollNo: student.roll_no,firstname:student.first_name,second_name:student.second_name,batch_id:student.batch_id};
      // console.log(req.session.user );
      res.redirect('/student/profile');
    } else {
      // Login failed, set the error message in the session
      req.session.error = 'Invalid roll number';
      res.redirect('/student/login');
    }
  } catch (error) {
    console.error('Error during login:', error);
    req.session.error = 'Internal Server Error';
    res.status(500).send('Internal Server Error');
  }
});


// Use the isAuthenticated middleware for the /student route

router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const student = req.session.user;
    const schedule = await db.getStudentSchedule(student);
    console.log('Rendering student_profile.html...');
    const filePath = path.join(__dirname, 'views', 'student_profile.html');

    // Read the HTML file
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }

      // Create the schedule table HTML
      const scheduleTable = scheduleToHtmlTable(schedule);

      // Inject data into the HTML file using a script
      const injectedData = `
        <script>
          var profileData = ${JSON.stringify({ student, schedule })};
          document.getElementById('studentName').innerText = profileData.student.firstname + ' ' + profileData.student.second_name;
          document.getElementById('rollNo').innerText = profileData.student.rollNo;
          var scheduleBody = document.getElementById('scheduleBody');
          scheduleBody.innerHTML = ${JSON.stringify(scheduleTable)};
        </script>
      `;

      // Replace placeholders in the HTML file
      const modifiedHtml = data.replace('</body>', injectedData + '</body>');

      // Send the modified HTML file
      res.send(modifiedHtml);
    });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Helper function to convert schedule data to HTML table
function scheduleToHtmlTable(schedule) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const tableRows = [];

  days.forEach(day => {
    const row = [`<th class="days">${day}</th>`];

    for (let slot = 1; slot <= 8; slot++) {
      const slotData = schedule.find(item => item.day === day && item.slot_id === slot);

      if (slotData) {
        row.push(`<td class="t1"><center>${slotData.course_id}<br>${slotData.building} ${slotData.room}</center></td>`);
      } else {
        row.push('<td class="t2"><br>-<br></td>');
      }
    }

    tableRows.push(`<tr>${row.join('')}</tr>`);
  });

  return `<table id="scheduleTable"><tbody>${tableRows.join('')}</tbody></table>`;
}




router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).send('Internal Server Error');
    } else {
     
      res.clearCookie('auth'); 
      
      res.redirect('/student/login');
    }
  });
});


module.exports = router;




