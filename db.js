
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { use } = require('./studentRouter');

let db;


open({
  filename: './extra_class.db', // Specify the path to your SQLite database file
  driver: sqlite3.Database
}).then(database => {
  db = database;
}).catch(err => {
  console.error('Error opening database:', err);
});


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
  const slot_id1=choice.start;
  const slot_id2=choice.end;

  const obj1=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<=? and prof_id=?',[choice.day,slot_id1,slot_id2,prof_id]);
  // console.log(choice);
  // console.log(slot_id1);
  // console.log(slot_id2);
  // console.log(obj1);
  // console.log("obj1 length"+obj1.length);
  if(obj1.length != 0)
    {
      return 1;
    }

  const obj2=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<=? and room_id=?',[choice.day,slot_id1,slot_id2,choice.room]);
  console.log(obj2);
  if(obj2.length != 0)
    {
      return 2;
    }
    // console.log("obj2 length"+obj2.length);
  const obj3=await db.all('SELECT * FROM weeklytable WHERE day=? and slot_id>=? and slot_id<? and batch_id=?',[choice.day,slot_id1,slot_id2,choice.batch]);
    if(obj3.length != 0)
    {
      return 3;
    }
    // console.log("obj3 length"+obj3.length);
  return 0;
}
async function get_clashes(choice)
{
  // console.log("batch is "+choice.batch);
  // console.log("start is "+choice.start);
  // console.log("end is "+choice.end);
  const ans1 = await db.all("select s.roll_no, s.first_name, s.second_name from student as s, enrolments as e where e.roll_no = s.roll_no and e.course_id = ? and s.batch_id = case when ? = 0 then s.batch_id else ? end;", [choice.course, choice.batch.length, choice.batch]);
 
 
  const ans2 = await db.all(`
    SELECT s.roll_no, s.first_name, s.second_name
    FROM student AS s
    JOIN enrolments AS e ON e.roll_no = s.roll_no
    JOIN weeklytable AS w ON e.course_id = w.course_id
    WHERE
        w.day = ? AND
        w.slot_id >= ? AND
        w.slot_id < ? AND
        (
            w.batch_id = s.batch_id OR
            w.batch_id IS NULL
        )
    AND EXISTS (
        SELECT 1
        FROM enrolments AS e2
        WHERE
            e2.roll_no = s.roll_no AND
            e2.course_id = ? AND
            (
                s.batch_id = ? OR
                ? IS NULL OR
                ? = ''
            )
    );
`, [choice.day, choice.start, choice.end, choice.course, choice.batch, choice.batch, choice.batch]);

return [ans2,ans1];
}

async function update_dbdata(obj, prof_id) {
  // console.log(obj);
  if (obj.batch.length > 0) {
    if (obj.end - obj.start === 1) {
      await db.all("INSERT INTO weeklytable(day, slot_id, batch_id, course_id, prof_id, room_id) VALUES (?, ?, ?, ?, ?, ?)",
        [obj.day, obj.start, obj.batch, obj.course, prof_id, obj.room]);
    } else {
      var i = obj.start;
      while (i < obj.end) {
        await db.all("INSERT INTO weeklytable(day, slot_id, batch_id, course_id, prof_id, room_id) VALUES (?, ?, ?, ?, ?, ?)",
          [obj.day, i, obj.batch, obj.course, prof_id, obj.room]);
        i += 1;
      }
    }
  } else {
    if (obj.end - obj.start === 1) {
      await db.all("INSERT INTO weeklytable(day, slot_id, course_id, prof_id, room_id) VALUES (?, ?, ?, ?, ?)",
        [obj.day,obj.start, obj.course, prof_id, obj.room]);
    } else {
      var i = obj.start;
      while (i < obj.end) {
        await db.all("INSERT INTO weeklytable(day, slot_id, course_id, prof_id, room_id) VALUES (?, ?, ?, ?, ?)",
          [obj.day, i, obj.course, prof_id, obj.room]);
        i += 1;
      }
    }
  }
}

module.exports = 
  { 
    getStudentByrollno,
    getProfessor,
    getStudentSchedule,
    getBranch_and_Batch,
    get_tt,
    get_prof_tt,
    getcourse_prof,
    getclassroom,
    checkbookings,
    get_clashes,
    update_dbdata,
};

