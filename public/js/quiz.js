let activeQuiz = null;
let currentQuestionIndex = 0;
let studentAnswers = []; // Array of { questionId, selectedAnswer }
let durationSeconds = 0;
let timerInterval = null;

async function startQuizSession() {
  const urlParams = new URLSearchParams(window.location.search);
  const quizId = urlParams.get('id');

  if (!quizId) {
    showToast('No Quiz ID specified.', 'danger');
    window.location.href = '/student/selectQuiz';
    return;
  }

  try {
    const res = await api.get(`/quizzes/${quizId}`);
    if (res && res.success) {
      activeQuiz = res.data;
      
      // Initialize Answers Array
      studentAnswers = activeQuiz.questions.map(q => ({
        questionId: q._id,
        selectedAnswer: -1 // -1 means unanswered
      }));

      // Setup Timer (duration in minutes)
      durationSeconds = activeQuiz.duration * 60;
      
      // Load UI layout
      renderQuizHeader();
      renderQuestionNavigationList();
      showQuestion(0);
      startTimer();
    }
  } catch (err) {
    showToast('Failed to load quiz details.', 'danger');
  }
}

function renderQuizHeader() {
  const title = document.getElementById('quiz-title');
  const details = document.getElementById('quiz-subtitle');
  if (title) title.textContent = activeQuiz.title;
  if (details) details.textContent = `${activeQuiz.subjectName} | Total Questions: ${activeQuiz.questions.length} | Marks: ${activeQuiz.totalMarks}`;
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
      submitQuizAnswers(true);
    }
    
    durationSeconds--;
  };

  updateDisplay();
  timerInterval = setInterval(updateDisplay, 1000);
}

function renderQuestionNavigationList() {
  const container = document.getElementById('question-nav-grid');
  if (!container) return;

  container.innerHTML = activeQuiz.questions.map((q, idx) => `
    <button id="nav-btn-${idx}" onclick="showQuestion(${idx})" class="btn btn-outline-secondary btn-sm m-1" style="width: 40px; height: 40px; border-radius: var(--radius-sm)">
      ${idx + 1}
    </button>
  `).join('');
}

function showQuestion(index) {
  if (index < 0 || index >= activeQuiz.questions.length) return;
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

  const question = activeQuiz.questions[index];
  
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
        <label class="quiz-option-label ${isChecked ? 'selected' : ''}" onclick="selectQuizOption(${optIdx})">
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
    if (index === activeQuiz.questions.length - 1) {
      nextBtn.innerHTML = '<i class="fas fa-check-circle"></i> Finish Quiz';
      nextBtn.classList.remove('btn-premium-primary');
      nextBtn.classList.add('btn-success');
    } else {
      nextBtn.innerHTML = 'Next Question <i class="fas fa-arrow-right"></i>';
      nextBtn.classList.remove('btn-success');
      nextBtn.classList.add('btn-premium-primary');
    }
  }
}

function selectQuizOption(optIdx) {
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
    if (currentQuestionIndex === activeQuiz.questions.length - 1) {
      // Trigger submission confirmation modal
      const modal = new bootstrap.Modal(document.getElementById('submitConfirmationModal'));
      modal.show();
    } else {
      showQuestion(currentQuestionIndex + 1);
    }
  }
}

async function submitQuizAnswers(autoSubmit = false) {
  if (!autoSubmit && !confirm('Are you sure you want to finish and submit your quiz answers?')) return;

  clearInterval(timerInterval);

  // Close modal if open
  const modalElem = document.getElementById('submitConfirmationModal');
  if (modalElem) {
    const modal = bootstrap.Modal.getInstance(modalElem);
    if (modal) modal.hide();
  }

  // Calculate elapsed time (quiz duration - remaining seconds)
  const totalSeconds = activeQuiz.duration * 60;
  const timeTaken = Math.max(0, totalSeconds - durationSeconds);

  // Map answers to backend expected schema: [{ questionId, selectedAnswer }]
  const answersPayload = studentAnswers.map(ans => ({
    questionId: ans.questionId,
    selectedAnswer: ans.selectedAnswer
  }));

  try {
    const res = await api.post(`/quizzes/${activeQuiz.id}/submit`, {
      answers: answersPayload,
      timeTaken
    });

    if (res && res.success) {
      showToast('Quiz submitted successfully!', 'success');
      setTimeout(() => {
        window.location.href = `/student/result?id=${res.data.attemptId}`;
      }, 1000);
    }
  } catch (err) {
    showToast('Failed to submit quiz answers.', 'danger');
  }
}

// Result Review details loader
async function loadDetailedResultSheet() {
  const urlParams = new URLSearchParams(window.location.search);
  const resultId = urlParams.get('id');

  if (!resultId) {
    showToast('No result ID provided.', 'danger');
    return;
  }

  try {
    const res = await api.get(`/results/${resultId}`);
    if (res && res.success) {
      const data = res.data;

      // Populate results headers
      const title = document.getElementById('res-quiz-title');
      const details = document.getElementById('res-quiz-details');
      const timeTaken = document.getElementById('res-time-taken');
      const completed = document.getElementById('res-completed');
      const gauge = document.getElementById('res-gauge');
      const summaryText = document.getElementById('res-summary-text');

      if (title) title.textContent = data.quizTitle;
      if (details) details.textContent = `${data.subjectName} | Grade: ${data.className}`;
      if (timeTaken) {
        const min = Math.floor(data.timeTaken / 60);
        const sec = data.timeTaken % 60;
        timeTaken.textContent = `${min}m ${sec}s`;
      }
      if (completed) completed.textContent = new Date(data.completedAt).toLocaleString();
      if (gauge) gauge.textContent = `${data.percentage}%`;
      if (summaryText) summaryText.textContent = `Score: ${data.score} / ${data.totalMarks} | Grade Result: ${data.status}`;

      // Populate counts cards
      setCardValue('res-score', `${data.score} / ${data.totalMarks}`);
      setCardValue('res-percentage', `${data.percentage}%`);
      setCardValue('res-status', data.status);
      
      const totalCorrect = data.answers.filter(ans => ans.isCorrect).length;
      setCardValue('res-correct', `${totalCorrect} / ${data.answers.length}`);

      // Render graded answers review sheet
      const container = document.getElementById('graded-questions-review');
      if (container) {
        container.innerHTML = data.answers.map((ans, idx) => {
          let selectedBadge = '';
          if (ans.selectedAnswer === -1) {
            selectedBadge = '<span class="text-danger font-weight-bold">Skipped (No Answer)</span>';
          } else {
            const isCorrect = ans.isCorrect;
            selectedBadge = `
              Selected Option: <span class="${isCorrect ? 'text-success' : 'text-danger'} font-weight-bold">
                Option ${ans.selectedAnswer + 1} (${ans.options[ans.selectedAnswer]})
              </span>`;
          }

          return `
            <div class="review-question-card animated-fade">
              <div class="review-q-header d-flex justify-content-between align-items-start mb-3">
                <div class="review-q-text mb-0"><strong>Q${idx + 1}.</strong> ${ans.questionText}</div>
                <span class="erp-badge erp-badge-${ans.isCorrect ? 'success' : 'danger'}">
                  <i class="fas ${ans.isCorrect ? 'fa-check' : 'fa-times'}"></i> ${ans.isCorrect ? 'Correct' : 'Incorrect'}
                </span>
              </div>
              <ul class="review-options">
                ${ans.options.map((opt, optIdx) => {
                  let cls = 'normal';
                  let icon = '';
                  
                  if (optIdx === ans.correctAnswer) {
                    cls = 'correct';
                    icon = '<i class="fas fa-check-circle text-success mr-2"></i>';
                  } else if (optIdx === ans.selectedAnswer && !ans.isCorrect) {
                    cls = 'incorrect-selected';
                    icon = '<i class="fas fa-times-circle text-danger mr-2"></i>';
                  }
                  
                  return `
                    <li class="review-option ${cls}">
                      ${icon}
                      <span>${opt}</span>
                    </li>
                  `;
                }).join('')}
              </ul>
              <div class="mt-3 pt-3 border-top text-muted small">
                ${selectedBadge} | Correct Option: <span class="text-success font-weight-bold">Option ${ans.correctAnswer + 1} (${ans.options[ans.correctAnswer]})</span>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  } catch (err) {
    showToast('Failed to load review sheet.', 'danger');
  }
}

function setCardValue(id, val) {
  const elem = document.getElementById(id);
  if (elem) elem.textContent = val;
}
