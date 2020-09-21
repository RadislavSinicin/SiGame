// window.onbeforeunload = function () {
//    // localStorage.clear();
//     return "Если вы покинете страницу текущий тест будет завершен!";
// }

/**
 * Main variables.
 */
var allPlayers = [];
var allRounds = [];
var allTopics = [];
var currentRound = 0;
var roundRules = {
    filePath: '../resources/game.json',
    ball: 100,
}
var currentPlayerWhoAnswerCorrect;
var currentPlayersWhoAnsweredWrong = new Set();

/**
 * Timer variables
 */
var questionTimer = {
    timer: {},
    currentTime: 10
}

/**
 * Element variables
 * @type {HTMLElement}
 */
var nextRoundButton = document.getElementById('next-round');
var modal = document.getElementById('modal');
var modalContentDiv = document.getElementById('content');

/**
 * Music variables
 * @type {HTMLAudioElement}
 */
var applause = new Audio("../resources/applause.mp3");
var catSound = new Audio("../resources/cat.mp3");

/**
 * Init methods
 */
function initGame() {
    initPlayers();
    initScore();
    initRoundsAndTopics();
    initGameTable();

    attachListeners();
}

initGame();

function attachListeners() {
    nextRoundButton.addEventListener('click', (event) => {
        const yes = confirm('Перейти в следующий раунд?');
        if (yes) {
            updateRound();
            initGameTable();
        }
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function initPlayers() {
    allPlayers = JSON.parse(localStorage.getItem('players'));
    if (allPlayers === null || allPlayers === undefined) {
        window.location = 'menu.html';
    }
}

function initScore() {
    let score = document.getElementsByClassName('score')[0];
    clearElement(score);
    allPlayers.sort(function (a, b) {
        return b.val - a.val;
    });
    for (let player of allPlayers) {
        let playerDiv = createBaseDiv('player_div');
        playerDiv.id = `${player.name}`;
        playerDiv.innerHTML = `${player.name}<br> ${player.val}`;
        playerDiv.addEventListener('wheel', (event) => {
                if (event.deltaY < 0) {
                    playerDiv.innerHTML = `${player.name}<br> ${player.val += 100}`;
                } else if (event.deltaY > 0) {
                    playerDiv.innerHTML = `${player.name}<br> ${player.val -= 100}`;
                }
            }
        );
        playerDiv.addEventListener('mouseleave', () => {
            initScore();
        });
        score.appendChild(playerDiv);
    }
}

function initRoundsAndTopics() {
    loadRoundsJson(function (response) {
        allRounds = JSON.parse(response);
    });
    allTopics = allRounds[currentRound];
}

function loadRoundsJson(callback) {
    let xmlHttpRequest = new XMLHttpRequest();
    xmlHttpRequest.overrideMimeType("application/json");
    xmlHttpRequest.open('GET', roundRules.filePath, false);
    xmlHttpRequest.onreadystatechange = function () {
        if (xmlHttpRequest.readyState == 4 && xmlHttpRequest.status == "200") {
            callback(xmlHttpRequest.responseText);
        }
    };
    xmlHttpRequest.send(null);
}

function initGameTable() {
    let table = document.createElement('table');
    for (let topic of allTopics) {
        let row = document.createElement('tr');
        let ball = roundRules.ball;
        for (let answer in topic) {
            let column;
            if (answer === 'Название') {
                column = document.createElement('th');
                column.innerHTML = topic[answer];
            } else {
                column = document.createElement('td');
                column.innerHTML = ball;
                column.setAttribute('questionText', topic[answer]);
                ball += roundRules.ball;
                column.addEventListener('click', (event) => {
                    const question = topic[answer];
                    const ball = event.target.textContent;
                    openModal(question, answer, ball);
                });
            }
            row.appendChild(column);
        }
        table.appendChild(row);
    }
    let tableDiv = document.getElementById('table');
    clearElement(tableDiv);
    tableDiv.appendChild(table);
}

function updateRound() {
    roundRules.ball += 100;
    allTopics = allRounds[++currentRound];
}

function returnPhoto(photoName) {
    return `<img class='question-photo' src='../photos/${photoName}'/>`
}

function showQuestion(question, answer, ball) {
    startQuestionTimer();
    clearElement(modalContentDiv);

    let questionHolderDiv = createBaseDiv('question-holder');
    if (question.includes('PHOTO')) {
        questionHolderDiv.innerHTML = returnPhoto(question.substring(6)) + "<br>";
    } else if (question.includes('КОТ В МЕШКЕ')) {
        playCatSound();
        alert('КОТ В МЕШКЕ! ОТАЙДЕ ВОПРОС ЛЮБОМУ ИГРОКУ!');
        questionHolderDiv.innerHTML = question.substring(12) + "<br>";
    } else if (question.includes('СПОНСОР')) {
        alert('ВОПРОС ОТ СПОНСОРА! ВЫ ОТВЕЧАЕТЕ');
        questionHolderDiv.innerHTML = question.substring(8) + "<br>";
    } else {
        questionHolderDiv.innerHTML = question + "<br>";
    }

    let timerDiv = createBaseDiv('timer');
    timerDiv.id = 'question-timer';

    modalContentDiv.appendChild(questionHolderDiv);
    modalContentDiv.appendChild(timerDiv);
    modalContentDiv.appendChild(createPauseTimerButton());
    modalContentDiv.appendChild(createShowAnswerButton(question, answer, ball));
}

function showAnswer(question, answer, ball) {
    stopQuestionTimer();
    playApplauseSound();

    let closeAnswerButton = document.createElement('button');
    closeAnswerButton.className = 'close-button';
    closeAnswerButton.innerHTML = 'X';
    closeAnswerButton.addEventListener('click', () => {
        choosePlayerWhoAnswerCorrect(question, ball);
    });

    let answerDiv = createBaseDiv();
    answerDiv.id = 'answer';
    if (answer.includes('PHOTO')) {
        answerDiv.innerHTML = returnPhoto(answer.substring(6));
    } else {
        answerDiv.innerHTML = answer;
    }

    modalContentDiv.appendChild(answerDiv);
    modalContentDiv.appendChild(closeAnswerButton);

    document.getElementById('pause-timer-button').style.display = 'none';
    document.getElementById('show-answer-button').style.display = 'none';
}

function choosePlayerWhoAnswerCorrect(question, ball) {
    clearElement(modalContentDiv);
    let whoAnswer = createBaseDiv('who-answer');
    whoAnswer.innerHTML = 'Кто ответил верно?';
    modalContentDiv.appendChild(whoAnswer);
    setPlayersToModalContent(question, ball, true);
}

function choosePlayerWhoAnswerWrong(question, ball) {
    clearElement(modalContentDiv);
    let whoAnswer = createBaseDiv('who-answer');
    whoAnswer.innerHTML = 'Кто лоханулся?';
    modalContentDiv.appendChild(whoAnswer);
    setPlayersToModalContent(question, ball, false);
}

function setPlayersToModalContent(question, ball, isCorrectAnswers) {
    let nobodyDiv = createBaseDiv('no_player_div');
    nobodyDiv.innerHTML = 'Никто';
    nobodyDiv.addEventListener('click', (event) => {
        if (isCorrectAnswers) {
            choosePlayerWhoAnswerWrong(question, ball);
        } else {
            if (nobodyDiv.textContent === 'Никто') {
                closeModalWithQuestion(question);
            } else {
                currentPlayersWhoAnsweredWrong.forEach((playerName) => {
                    updatePlayerScore(playerName, ball, false);
                });
                closeModalWithQuestion(question);
                currentPlayersWhoAnsweredWrong.clear();
            }
        }
    });
    for (let player of allPlayers) {
        if (!isCorrectAnswers && currentPlayerWhoAnswerCorrect === player.name) {
            currentPlayerWhoAnswerCorrect = '';
            continue;
        }
        let playerDiv = createBaseDiv((!isCorrectAnswers) ? "player-wrong-answer" : 'player-correct-answer');
        playerDiv.innerHTML = player.name;
        playerDiv.addEventListener('click', (event) => {
            const playerName = event.target.textContent;
            if (isCorrectAnswers) {
                currentPlayerWhoAnswerCorrect = playerName;
                updatePlayerScore(playerName, ball, true);
                choosePlayerWhoAnswerWrong(question, ball);
            } else {
                if (currentPlayersWhoAnsweredWrong.has(playerName)) {
                    currentPlayersWhoAnsweredWrong.delete(playerName);
                    console.log('delete ' + playerName);
                    playerDiv.style.background = 'none';
                } else {
                    currentPlayersWhoAnsweredWrong.add(playerName);
                    console.log('add ' + playerName);
                    playerDiv.style.background = 'red';
                }
                if (currentPlayersWhoAnsweredWrong.size === 0) {
                    console.log(currentPlayersWhoAnsweredWrong.size);
                    nobodyDiv.textContent = 'Никто';
                } else {
                    console.log(currentPlayersWhoAnsweredWrong.size);
                    nobodyDiv.textContent = 'Снять очки и закрыть';
                }
            }
        });
        modalContentDiv.append(playerDiv);
    }

    modalContentDiv.append(nobodyDiv);
}

function closeModalWithQuestion(question) {
    closeModal();
    hideCell(question);
    stopApplauseSound();
}

function updatePlayerScore(playerName, ballValue, correct) {
    let playerToUpdate = allPlayers.find(player => {
        return player.name === playerName;
    });
    if (correct) {
        playerToUpdate.val += Number(ballValue);
    } else {
        playerToUpdate.val -= Number(ballValue);
    }
    initScore();
}

function createBaseDiv(className) {
    const elementDiv = document.createElement('div');
    if (className) {
        elementDiv.className = className;
    }
    return elementDiv;
}

function clearElement(element) {
    element.innerHTML = '';
}

function hideCell(questionText) {
    let column = document.querySelector(`[questionText='${questionText}']`);
    column.addEventListener('click', () => {
    });
    column.style.background = 'black';
}


/**
 * Modal methods
 */
function openModal(question, answer, ball) {
    modal.style.display = 'block';
    showQuestion(question, answer, ball);
}

function closeModal() {
    modal.style.display = 'none';
}

/**
 * Audio methods
 */
function playApplauseSound() {
    applause.play();
}

function playCatSound() {
    catSound.play();
}

function stopApplauseSound() {
    applause.pause();
    applause.currentTime = 0;
}

/**
 * Timer methods
 */
function startQuestionTimer() {
    let sec = questionTimer.currentTime;
    questionTimer.timer = setInterval(function () {
        console.log("CURRENT SEC:" + sec);
        let questionTimerDiv = document.getElementById('question-timer');
        questionTimerDiv.innerHTML = sec;
        sec--;
        if (sec < 0) {
            stopQuestionTimer();
            let answerDiv = document.getElementById('show-answer-button');
            answerDiv.dispatchEvent(new Event('click'));
        }
    }, 1000);
}

function pauseQuestionTimer() {
    let questionTimerDiv = document.getElementById('question-timer');
    questionTimer.currentTime = Number(questionTimerDiv.textContent);
    questionTimer.currentTime--;
    clearInterval(questionTimer.timer);
}

function resumeQuestionTimer() {
    startQuestionTimer();
}

function stopQuestionTimer() {
    let questionTimerDiv = document.getElementById('question-timer');
    clearElement(questionTimerDiv);
    clearInterval(questionTimer.timer);
    questionTimer.currentTime = 10;
}

/**
 * Static elemets creation
 */
function initStatic() {

}

function createPauseTimerButton() {
    const pauseTimerButton = document.createElement('button');
    pauseTimerButton.id = 'pause-timer-button';
    pauseTimerButton.className = 'utility-button';
    pauseTimerButton.textContent = 'Пауза';
    pauseTimerButton.addEventListener('click', () => {
        if (pauseTimerButton.textContent === 'Пауза') {
            pauseTimerButton.textContent = 'Продолжить';
            pauseQuestionTimer();
        } else {
            pauseTimerButton.textContent = 'Пауза';
            resumeQuestionTimer();
        }
    });
    return pauseTimerButton;
}

function createShowAnswerButton(question, answer, ball) {
    const showAnswerButton = document.createElement('button');
    showAnswerButton.id = 'show-answer-button';
    showAnswerButton.className = 'utility-button';
    showAnswerButton.innerHTML = 'Показать ответ';
    showAnswerButton.addEventListener('click', () => {
        showAnswer(question, answer, ball);
    });
    return showAnswerButton;
}
