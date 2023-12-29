// db.js
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { use } = require('./studentRouter');

let db;

// Connect to SQLite database
open({
  filename: './extra_class.db', // Specify the path to your SQLite database file
  driver: sqlite3.Database
}).then(database => {
  db = database;
}).catch(err => {
  console.error('Error opening database:', err);
});

// Function to retrieve  student details
async function getStudentByrollno(rollno) {
  try {
    const student = await db.get('SELECT * FROM student where roll_no=?',[rollno]);
   
    return student;
  } catch (error) {
    console.error('Error fetching students:', error);
    throw error;
  }
}

async function getStudentSchedule(student) {
  try {
    
    const schedule = await db.all( 'SELECT w.day, w.slot_id, w.course_id, c.room, c.building FROM weeklyTable AS w JOIN enrolments AS e ON w.course_id = e.course_id JOIN classroom AS c ON w.room_id = c.room_id WHERE (EXISTS (SELECT 1 FROM weeklyTable WHERE batch_id = ?) OR w.batch_id IS NULL) AND e.roll_no = ?',[student.batch_id,student.rollNo]);
    // console.log(schedule);
    // console.log(student);
    return schedule;
  } catch (error) {
    console.error('Error fetching student schedule:', error);
    throw error;
  }
}

// async function getcourseinfo(student)
// {
  
// }

async function getcourse_prof(prof_id)
{
  try{
    const course=await db.all('SELECT a.course_id, course_name FROM course as c JOIN teaches as a ON c.course_id = a.course_id WHERE a.prof_id = ?',[prof_id]);
    // console.log(course);
    return course
  }
  catch (error) {
    console.error('Error fetching courses to teach:', error);
    throw error;
  }
}
async function getProfessor(username, pwd) {
  try {
    console.log(username);
    const usernameParts = username.split(' ');

    // Check if username contains at least two parts
    if (usernameParts.length == 1)
    {
      const first_name = usernameParts[0]
      const professor = await db.get('SELECT * FROM professor where first_name=? AND password=?', [first_name, pwd]);
      return professor; 
    }
    else if (usernameParts.length >= 2) {
      const [first_name, second_name] = usernameParts;
      const professor = await db.get('SELECT * FROM professor where first_name=? AND second_name=? AND password=?', [first_name, second_name, pwd]);
      return professor;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching professor:', error);
    throw error;
  }
}
async function getBranch_and_Batch(prof_id)
  {
    // console.log("Dfffwf");
    try {
      const batch=await db.all('select batches.batch_id,batches.department,batches.batch,batches.semester from batches inner join professor on professor.department=batches.department where professor.prof_id=?',[prof_id]);
      return batch

    } catch (error) {
      console.error('Error fetching batch and branch:', error);
      throw error;
    }
  }

async function get_tt(batch_id)
{
  try {
    const schedule=await db.all('select slot_id,course_id,room,building,day from weeklyTable as w,classroom as c where w.room_id = c.room_id and batch_id=?;',[batch_id]);
    return schedule;

  } catch (error) {
    console.error('Error fetching batch and branch:', error);
    throw error;
  }
}
async function get_prof_tt(prof_id) {
  // console.log(prof_id);
  try {
    const schedule = await db.all('SELECT slot_id,day,course.course_id, classroom.building, classroom.room FROM weeklytable INNER JOIN course ON course.course_id = weeklytable.course_id INNER JOIN classroom ON weeklytable.room_id = classroom.room_id WHERE prof_id = ?;', [prof_id]);
    //  console.log(schedule);
    return schedule;
  } catch (error) {
    console.error('Error fetching professor timetable:', error);
    throw error;
  }
}

async function getclassroom()
{
  const classroom=await db.all('select * from classroom');
  // console.log(classroom);
  return classroom;
}

async function checkbookings(choice,prof_id)
{
  console.log(choice);

  const slot_id1=choice.start;
  const slot_id2=choice.end;

  const obj1=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<? and prof_id=?',[choice.day,slot_id1,slot_id2,prof_id]);
  console.log(obj1);
  if(obj1==[])
    {
      return 1;
    }

  const obj2=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<? and room_id=?',[choice.day,slot_id1,slot_id2,choice.room_id]);
    if(obj2==[])
    {
      return 2;
    }
  
  const obj3=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<? and batch_id=?',[choice.day,slot_id1,slot_id2,choice.batch]);
    if(obj3==[])
    {
      return 3;
    }
  
}
module.exports = {
  getStudentByrollno,
  getProfessor,
  getStudentSchedule,
  getBranch_and_Batch,
  get_tt,
  get_prof_tt,
  getcourse_prof,
  getclassroom,
  checkbookings,

};

