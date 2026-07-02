async function runEditTest() {
  try {
    // 1. Login
    const loginRes = await fetch('http://localhost:5050/api/teachers/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'teacher@rajcomputer.com', password: '123456' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success) {
      console.log('Login failed');
      return;
    }
    const token = loginData.data.token;

    // 2. Get exams
    const examsRes = await fetch('http://localhost:5050/api/exams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const examsData = await examsRes.json();
    console.log('\n--- Exams returned from GET /exams ---');
    console.log(examsData);

    if (!examsData.success || examsData.data.length === 0) {
      console.log('No exams available to edit.');
      return;
    }

    const firstExam = examsData.data[0];
    const examId = firstExam.id;
    console.log(`\nTesting edit for exam ID: ${examId}`);

    // 3. Get Details
    const detailsRes = await fetch(`http://localhost:5050/api/exams/${examId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const detailsData = await detailsRes.json();
    console.log('\n--- Exam Details ---');
    console.log(detailsData);

    if (!detailsData.success) {
      console.log('Failed to fetch details');
      return;
    }

    // 4. Update Details
    const updatePayload = {
      title: detailsData.data.title + ' (Edited)',
      description: detailsData.data.description,
      subjectId: detailsData.data.subjectId,
      duration: detailsData.data.duration,
      examDate: detailsData.data.examDate,
      questions: detailsData.data.questions.map(q => q._id)
    };

    console.log('\n--- Sending PUT Update Request ---', updatePayload);
    const updateRes = await fetch(`http://localhost:5050/api/exams/${examId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updatePayload)
    });
    const updateData = await updateRes.json();
    console.log('\n--- Update Response ---');
    console.log(updateData);

  } catch (err) {
    console.error(err);
  }
}

runEditTest();
