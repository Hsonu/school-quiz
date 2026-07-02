let activeExam = null;
let currentQuestionIndex = 0;
let studentAnswers = []; // Array of { questionId, selectedAnswer }
let durationSeconds = 0;
let timerInterval = null;

async function startExamSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const examId = urlParams.get('id');

  if (!examId) {
    showToast('No Exam ID specified.', 'danger');
    window.location.href = '/student/exams';
    return;
  }

  try {
    const res = await api.get(`/exams/${examId}`);
    if (res && res.success) {
      activeExam = res.data;
      
      // Initialize Answers Array
      studentAnswers = activeExam.questions.map(q => ({
        questionId: q._id,
        selectedAnswer: -1 // -1 means unanswered
      }));

      // Setup Timer (duration in minutes)
      durationSeconds = activeExam.duration * 60;
      
      // Load UI layout
      renderExamHeader();
      renderQuestionNavigationList();
      showQuestion(0);
      startTimer();
    }
  } catch (err) {
    showToast('Failed to load examination details.', 'danger');
  }
}

function renderExamHeader() {
  const title = document.getElementById('exam-title');
  const details = document.getElementById('exam-subtitle');
  if (title) title.textContent = activeExam.title;
  if (details) details.textContent = `${activeExam.subjectName} | Questions: ${activeExam.questions.length} | Marks: ${activeExam.totalMarks}`;
}

function startTimer() {
  const timerWidget = document.getElementById('timer-display');
  if (!timerWidget) return;

  const updateDisplay = () => {
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    
    timerWidget.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    if (durationSeconds <= 60) {
      timerWidget.classList.add('timer-low');
    }

    if (durationSeconds <= 0) {
      clearInterval(timerInterval);
      showToast('Time has expired! Submitting answers...', 'warning');
      submitExamAnswers(true);
    }
    
    durationSeconds--;
  };

  updateDisplay();
  timerInterval = setInterval(updateDisplay, 1000);
}

function renderQuestionNavigationList() {
  const container = document.getElementById('question-nav-grid');
  if (!container) return;

  container.innerHTML = activeExam.questions.map((q, idx) => `
    <button id="nav-btn-${idx}" onclick="showQuestion(${idx})" class="btn btn-outline-secondary btn-sm m-1" style="width: 40px; height: 40px; border-radius: var(--radius-sm)">
      ${idx + 1}
    </button>
  `).join('');
}

function showQuestion(index) {
  if (index < 0 || index >= activeExam.questions.length) return;
  currentQuestionIndex = index;

  // Highlight active nav item
  const buttons = document.querySelectorAll('[id^="nav-btn-"]');
  buttons.forEach((btn, idx) => {
    btn.classList.remove('btn-primary', 'text-white', 'btn-success');
    
    // Check if answered
    const isAnswered = studentAnswers[idx].selectedAnswer !== -1;

    if (idx === currentQuestionIndex) {
      btn.classList.add('btn-primary', 'text-white');
    } else if (isAnswered) {
      btn.classList.add('btn-success', 'text-white');
    } else {
      btn.classList.add('btn-outline-secondary');
    }
  });

  const question = activeExam.questions[index];
  
  // Render question text
  const questionTextElem = document.getElementById('question-text');
  if (questionTextElem) {
    questionTextElem.innerHTML = `<strong>Q${index + 1}.</strong> ${question.questionText} <span class="text-muted small">(${question.points} pts)</span>`;
  }

  // Render question options
  const optionsElem = document.getElementById('options-holder');
  if (optionsElem) {
    optionsElem.innerHTML = question.options.map((opt, optIdx) => {
      const isChecked = studentAnswers[currentQuestionIndex].selectedAnswer === optIdx;
      return `
        <label class="quiz-option-label ${isChecked ? 'selected' : ''}" onclick="selectExamOption(${optIdx})">
          <input type="radio" name="activeOption" value="${optIdx}" ${isChecked ? 'checked' : ''}>
          <span>${opt}</span>
        </label>
      `;
    }).join('');
  }

  // Update footer button displays (Previous/Next)
  const prevBtn = document.getElementById('prev-question-btn');
  const nextBtn = document.getElementById('next-question-btn');

  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) {
    if (index === activeExam.questions.length - 1) {
      nextBtn.innerHTML = '<i class="fas fa-check-circle"></i> Finish Exam';
      nextBtn.classList.remove('btn-premium-primary');
      nextBtn.classList.add('btn-success');
    } else {
      nextBtn.innerHTML = 'Next Question <i class="fas fa-arrow-right"></i>';
      nextBtn.classList.remove('btn-success');
      nextBtn.classList.add('btn-premium-primary');
    }
  }
}

function selectExamOption(optIdx) {
  studentAnswers[currentQuestionIndex].selectedAnswer = optIdx;
  
  // Highlight UI
  const labels = document.querySelectorAll('.quiz-option-label');
  labels.forEach((label, idx) => {
    if (idx === optIdx) {
      label.classList.add('selected');
      const radio = label.querySelector('input[type="radio"]');
      if (radio) radio.checked = true;
    } else {
      label.classList.remove('selected');
    }
  });

  // Re-sync nav grid colors
  const navBtn = document.getElementById(`nav-btn-${currentQuestionIndex}`);
  if (navBtn) {
    navBtn.classList.remove('btn-outline-secondary');
    navBtn.classList.add('btn-success', 'text-white');
  }
}

function handleNextPrev(direction) {
  if (direction === 'prev') {
    showQuestion(currentQuestionIndex - 1);
  } else if (direction === 'next') {
    if (currentQuestionIndex === activeExam.questions.length - 1) {
      const modal = new bootstrap.Modal(document.getElementById('submitConfirmationModal'));
      modal.show();
    } else {
      showQuestion(currentQuestionIndex + 1);
    }
  }
}

async function submitExamAnswers(autoSubmit = false) {
  if (!autoSubmit && !confirm('Are you sure you want to finish and submit your exam answers?')) return;

  clearInterval(timerInterval);

  const modalElem = document.getElementById('submitConfirmationModal');
  if (modalElem) {
    const modal = bootstrap.Modal.getInstance(modalElem);
    if (modal) modal.hide();
  }

  const answersPayload = studentAnswers.map(ans => ({
    questionId: ans.questionId,
    selectedAnswer: ans.selectedAnswer
  }));

  try {
    const res = await api.post(`/exams/${activeExam.id}/submit`, {
      answers: answersPayload
    });

    if (res && res.success) {
      showToast('Term Examination submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/student/exams';
      }, 1500);
    }
  } catch (err) {
    showToast(err.message || 'Failed to submit exam answers.', 'danger');
  }
}
