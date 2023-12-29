const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const fs = require('fs');
const bodyParser = require('body-parser');
// Create a new router object
const router = express.Router();

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

// router.use(bodyParser.json()); 
router.use(express.urlencoded({ extended: true }));


function isAuthenticated(req, res, next) {
  // console.log(req.session.user);
  if (req.session && req.session.user) {
    console.log('User is authenticated.');
    next();
  } else {
    console.log('User is not authenticated. Redirecting to /professor_login');
    res.redirect('/professor_login');
  }
}

// Define the routes using router.METHOD()
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'professor_login.html'));
});

router.post('/login', async (req, res) => {
  const username = req.body.username;
  const pwd=req.body.password;
  // console.log(username);
  // console.log(pwd);
  try {
    const professor = await db.getProfessor(username,pwd);
    
    if (professor) {
      // Login successful, store the user object in the session
      
      req.session.user = { firstname:professor.first_name,second_name:professor.second_name,prof_id:professor.prof_id};
      // console.log(req.session.user );
      res.redirect('/professor/profile');
    } else {
      // Login failed, set the error message in the session
      req.session.error = 'Invalid roll number';
      res.redirect('/professor/login');
    }
  } catch (error) {
    console.error('Error during login:', error);
    req.session.error = 'Internal Server Error';
    res.status(500).send('Internal Server Error');
  }
});


// Use the isAuthenticated middleware for the /professor route

router.get('/profile', isAuthenticated, async (req, res) => {
  professor=req.session.user;
  const filePath = path.join(__dirname, 'views', 'professor_profile.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading HTML file:', err);
      return res.status(500).send('Internal Server Error');
    }
    const injectedData = `
        <script>
          var profileData = ${JSON.stringify({ professor })};
          document.getElementById('professorName').innerText = profileData.professor.firstname + ' ' + profileData.professor.second_name;
          </script>
          `;
          const modifiedHtml = data.replace('</body>', injectedData + '</body>');
          res.send(modifiedHtml);
        });
  });


router.get('/choose_class', async (req, res) => {
  const prof_id = req.session.user.prof_id;
  
  try{
      const batch= await db.getBranch_and_Batch(prof_id);
      const filePath = path.join(__dirname, 'views', 'choose_class.html');
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) 
        {
          console.error('Error reading HTML file:', err);
          return res.status(500).send('Internal Server Error');
        }
      const injectedHTML = injectBatchData(data, batch);
      res.send(injectedHTML);
    })
  }
  catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).send('Internal Server Error');
  }
  

  })
router.get('/prof_tt', async (req, res) => {
  const prof_id = req.session.user.prof_id;
  // console.log(prof_id);
  try{
    
    const schedule=await db.get_prof_tt(prof_id);
    const scheduleTable = scheduleToHtmlTable(schedule);
    const filePath = path.join(__dirname, 'views', 'prof_tt.html');

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
      const injectedData = `
      <script>
        var scheduleBody = document.getElementById('scheduleBody');
        scheduleBody.innerHTML = ${JSON.stringify(scheduleTable)};
      </script>
    `;
  
    
    // Replace placeholders in the HTML file
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
  
    // Send the modified HTML file
    res.send(modifiedHtml);
  });
  
  }catch (error) {
  console.error('Error fetching professor time table:', error);
  res.status(500).send('Internal Server Error');
  }
})

router.post('/student_tt', async (req, res) => {
   try{
    const batch_id = req.body.batch;
    const schedule=await db.get_tt(batch_id);
    const scheduleTable = scheduleToHtmlTable(schedule);
    const filePath = path.join(__dirname, 'views', 'student_tt.html');

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
  
    // Inject data into the HTML file using a script
    const injectedData = `
      <script>
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

router.get('/schedule', async (req, res) => {
  const prof_id = req.session.user.prof_id;
  try{
    const schedule=await db.get_prof_tt(prof_id);
    const batch= await db.getBranch_and_Batch(prof_id);
    const course=await db.getcourse_prof(prof_id);
    const classroom=await db.getclassroom();
    // console.log('Course data:', course);
    // console.log(classroom);
    const b_options = batch.map(b => `<option value="${b.batch_id}">${b.department}   ${b.batch}   ${b.semester}</option>`);
    const options = course.map(c=> `<option value="${c.course_id}">${c.course_id} ${c.course_name} </option>`);
    const cls = classroom.map(d=> `<option value="${d.room_id}"> ${d.building} ${d.room} </option>`);
    const scheduleTable = scheduleToHtmlTable(schedule);
    const filePath = path.join(__dirname, 'views', 'schedule.html');

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
      // const injectedHTML = injectBatchData(data, batch);
      const injectedData = `
      <script>
        var scheduleBody = document.getElementById('scheduleBody');
        scheduleBody.innerHTML = ${JSON.stringify(scheduleTable)};

        var courseSelect = document.getElementById('courseSelect');
        courseSelect.innerHTML += ${JSON.stringify(options)};

        var classroom = document.getElementById('classroom');
        classroom.innerHTML += ${JSON.stringify(cls)};

        var batch=document.getElementById('batch');
        batch.innerHTML+=${JSON.stringify(b_options)};

      </script>
    `;
  
    // Replace placeholders in the HTML file
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
  
    // Send the modified HTML file
    res.send(modifiedHtml); })}
    catch (error) {
      console.error('Error fetching schedule data:', error);
      res.status(500).send('Internal Server Error');
      }
      });

router.post('/schedule', async (req, res) => {
  const obj=req.body;
  console.log(obj);
  const ans=await db.checkbookings(obj,req.session.prof_id);
  // console.log(ans);
//   try{if (ans === 1) {
//     res.json({ errorCode: 1, message: "You already have a class at that time" });
//   } else if (ans === 2) {
//     res.json({ errorCode: 2, message: "Classroom is already booked" });
//   } else if (ans === 3) {
//     res.json({ errorCode: 3, message: "This batch has a class at that time" });
//   } else {
//     res.json({ valid: true });
//   }
// } catch (error) {
//   console.error('Error during schedule validation:', error);
//   res.status(500).json({ errorCode: 500, message: "Internal Server Error" });
// }
  // console.log("sfsfwffwfwf");
})
router.post('/confirmation',async (req, res) => {
  const obj=req.body;
  const filePath = path.join(__dirname, 'views', 'confirmaion.html');
  try {
    
    const { day, room, batch, start, end, course } = req.body;

    
   
    console.log(obj);
  } catch (error) {
    console.error('Error handling professor confirmation:', error);
    res.status(500).send('Internal Server Error');
  }

})
router.get('/deschedule', async (req, res) => {

})
// Helper function to convert schedule data to HTML table
function scheduleToHtmlTable(schedule) {
  // console.log(schedule);
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


// Define the logout route

router.get('/logout', (req, res) => {
  // Destroy the session and clear the cookie
  req.session.destroy((err) => {
    if (err) {
      console.error('Error during logout:', err);
      res.status(500).send('Internal Server Error');
    } else {
     
      res.clearCookie('auth'); 
      
      res.redirect('/professor/login');
    }
  });
});

function injectBatchData(html, batch) {
  const placeholder = '<!-- BATCH_OPTIONS -->';
  
  // Generate options based on batch data
  const options = batch.map(b => `<option value="${b.batch_id}">${b.department} - ${b.batch} - ${b.semester}</option>`);

  // Replace the placeholder with the generated options
  const modifiedHTML = html.replace(placeholder, options.join(''));
  
  return modifiedHTML;
}

module.exports = router;




