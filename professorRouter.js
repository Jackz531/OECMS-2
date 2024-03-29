const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const fs = require('fs');
const app = express();
const he = require('he');
const bodyParser = require('body-parser');

const router = express.Router();

router.use(express.static(path.join(__dirname, 'views')));

router.use(session({
  secret: 'afafwgwgwgteyegmnSLfghw;rjawvl;mwa', 
  saveUninitialized: false,
  resave:false,
  cookie: {
    name:'auth',
    secure: false, 
    maxAge: 3600000 
  }
}));

router.use(express.json());

router.use(express.urlencoded({ extended: true }));


function isAuthenticated(req, res, next) {

  if (req.session && req.session.user) {
    console.log('User is authenticated.');
    next();
  } else {
    console.log('User is not authenticated. Redirecting to /professor_login');
    res.redirect('/professor_login');
  }
}

router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'professor_login.html'));
});

router.post('/login', async (req, res) => {
  const username = req.body.username;
  const pwd=req.body.password;
  try {
    const professor = await db.getProfessor(username,pwd);
    
    if (professor)
    {
      req.session.user = { firstname:professor.first_name,second_name:professor.second_name,prof_id:professor.prof_id};
      res.redirect('/professor/profile');
    } else 
    {
      req.session.error = 'Invalid roll number';
      res.redirect('/professor/login');
    }
  } catch (error) {
    console.error('Error during login:', error);
    req.session.error = 'Internal Server Error';
    res.status(500).send('Internal Server Error');
  }
});

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
  try{
    const schedule=await db.get_prof_tt(prof_id);
    const scheduleTable = scheduleToHtmlTable(schedule);
    const filePath = path.join(__dirname, 'views', 'prof_tt.html');
    const courses= await db.getcourse_prof(prof_id);
    const courseTable =  coursesToHtmlTable(courses);
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
      const injectedData = `
      <script>
        var scheduleBody = document.getElementById('scheduleBody');
        scheduleBody.innerHTML = ${JSON.stringify(scheduleTable)};
        var coursesTable = document.getElementById('course');
        coursesTable.innerHTML = ${JSON.stringify(courseTable)};
      </script>
    `;
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
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
  
    const injectedData = `
      <script>
        var scheduleBody = document.getElementById('scheduleBody');
        scheduleBody.innerHTML = ${JSON.stringify(scheduleTable)};
      </script>
    `;
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
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
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
    res.send(modifiedHtml); })}
    catch (error) {
      console.error('Error fetching schedule data:', error);
      res.status(500).send('Internal Server Error');
      }
      });

router.post('/schedule', async (req, res) => {
  const obj=req.body;
  // console.log(obj);
  const prof_id=req.session.user.prof_id;
  try{
    const ans=await db.checkbookings(obj,prof_id);

    if (ans == 1) {
      res.json({ errorCode: 1, message: "You already have a class at that time" });
    } else if (ans == 2) {
      res.json({ errorCode: 2, message: "Classroom is already booked" });
    } else if (ans == 3) {
      res.json({ errorCode: 3, message: "This batch has a class at that time" });
    } else 
    {
      res.json({ valid: true });
    }
} catch (error) {
  console.error('Error during schedule validation:', error);
  res.status(500).json({ errorCode: 500, message: "Internal Server Error" });
}
})

router.post('/confirmation', async (req, res) => {
  console.log("confirmation page is being open");
  const obj = req.body;
  const ans=await db.get_clashes(obj);

  const filePath = path.join(__dirname, 'views', 'confirmation.html');
    try {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading HTML file:', err);
        return res.status(500).send('Internal Server Error');
      }
      // console.log(ans[0]);
      const studentsHTML = ans[0].map(student => `${he.encode(`${student.roll_no} ${student.first_name} ${student.second_name}`)}<br>`).join('');
      req.session.weeklyTableData =req.body;
      // console.log(req.session.weeklyTableData);
      const injectedData = `
      <script>
        var clashes = document.getElementById('clash');
        clashes.innerHTML = '${he.encode(`${ans[0].length} out of ${ans[1].length} students have clashes.`)}';
        var student=document.getElementById('student');
        student.innerHTML = '${studentsHTML}';
      </script>`;
      

    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
    res.send(modifiedHtml);
  });
} catch (error) {
  console.error('Error fetching schedule data:', error);
  res.status(500).send('Internal Server Error');
}

})

router.post('/updatetime', async (req, res) => {
  const obj = req.session.weeklyTableData;
  // console.log(obj);
  prof_id=req.session.user.prof_id;
  try{
    ans=db.update_dbdata(obj,prof_id);
  }catch(error) {
    console.error('Error fetching updating database:', error);
    res.status(500).send('Internal Server Error');
  }
  
  // res.sendFile(path.join(__dirname, 'views', 'professor_profile.html'));
  res.redirect('/professor/profile');
  
});

router.get('/deschedule', async (req, res) => {
  const prof_id = req.session.user.prof_id;
  try{
    const schedule=await db.get_prof_tt(prof_id);
    const scheduleTable = scheduleToHtmlTablecheckbox(schedule);
    const filePath = path.join(__dirname, 'views', 'deschedule.html');

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
    const modifiedHtml = data.replace('</body>', injectedData + '</body>');
    res.send(modifiedHtml);
  });
  
  }catch (error) {
  console.error('Error fetching professor time table:', error);
  res.status(500).send('Internal Server Error');
  }

})

router.post('/deschedule', async (req, res) => {
  const prof_id = req.session.user.prof_id;
  const slot = req.body.courseIds;
  try {
        let i = 0;
        while (i < slot.length) {
          let parts = slot[i].split("-");
          let obj = {
            day: parts[0],
            slot_id: parts[1]
          };
          await db.delete_dbdata(obj, prof_id);
          i++;
        }
       res.json({ success: true, message: 'Courses descheduled successfully.' });
      } catch (error) {
        console.error('Error descheduling courses:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
      }
    });

function scheduleToHtmlTablecheckbox(schedule) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const tableRows = [];

  days.forEach(day => {
    const row = [`<th class="days">${day}</th>`];

    for (let slot = 1; slot <= 8; slot++) {
      const slotData = schedule.find(item => item.day === day && item.slot_id === slot);
      if (slotData) {
        // If slotData exists, create a checkbox with course_id as its value
        row.push(`
          <td class="t1">
            <center>
              <input type="checkbox" name="courseCheckbox" value="${slotData.day}-${slotData.slot_id}">
              ${slotData.course_id}<br>${slotData.building} ${slotData.room}
            </center>
          </td>
        `);
      } else {
        
        row.push(`
          <td class="t2">
            <center>
              <br>-
              <br>
            </center>
          </td>
        `);
      }
    }
    tableRows.push(`<tr>${row.join('')}</tr>`);
  });

  return `<table id="scheduleTable"><tbody>${tableRows.join('')}</tbody></table>`;
}

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


function coursesToHtmlTable(courses) {
  let tableRows = '';

  for (let i = 0; i < courses.length; i++) {
    const course = courses[i];
    tableRows += `<tr><td class="t3">${course.course_id}</td><td class="t3">${course.course_name}</td></tr>`;
  }

  return `<table id="courseTable"><tbody>${tableRows}</tbody></table>`;
}


router.get('/logout', (req, res) => {
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
  const options = batch.map(b => `<option value="${b.batch_id}">${b.department} - ${b.batch} - ${b.semester}</option>`);
  const modifiedHTML = html.replace(placeholder, options.join(''));
  return modifiedHTML;
}


module.exports = router;




