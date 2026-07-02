const calculateMarks = (submittedAnswers, questionsList) => {
  let score = 0;
  let totalQuestions = questionsList.length;
  const gradedAnswers = [];

  submittedAnswers.forEach(sub => {
    const question = questionsList.find(q => String(q._id) === String(sub.questionId));
    if (question) {
      const isCorrect = Number(sub.selectedAnswer) === Number(question.correctAnswer);
      if (isCorrect) {
        score += Number(question.points || 1);
      }
      gradedAnswers.push({
        questionId: sub.questionId,
        selectedAnswer: Number(sub.selectedAnswer),
        isCorrect
      });
    }
  });

  // Also include questions that were missed/skipped
  questionsList.forEach(q => {
    const attempted = gradedAnswers.some(ans => String(ans.questionId) === String(q._id));
    if (!attempted) {
      gradedAnswers.push({
        questionId: q._id,
        selectedAnswer: -1, // skipped
        isCorrect: false
      });
    }
  });

  return {
    score,
    totalQuestions,
    gradedAnswers
  };
};

module.exports = calculateMarks;
