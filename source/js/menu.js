var playersCountSelect = document.getElementById('playersCount');
var inputsCount = 0;
var playersDiv = document.getElementById('players');
var startGameLink = document.getElementById('startGame');

var playersArray = [];

function init() {
    addListeners();
}

init();

function addListeners() {
    playersCountSelect.addEventListener('change', (event) => {
        const select = event.target;
        inputsCount = Number(select.value);
        updateInputs();
    });
    startGameLink.addEventListener('click', (event) => {
        let inputsArray = document.getElementsByTagName('input');
        for (let inputsArrayElement of inputsArray) {
            const playerName = inputsArrayElement.value;
            const playerObj = {
                name: playerName,
                val: 0
            };
            playersArray.push(playerObj);
        }
        localStorage.setItem('players', JSON.stringify(playersArray));
    });
}

function updateInputs() {
    playersDiv.innerHTML = '';
    for (let i = 0; i < inputsCount; i++) {
        let input = document.createElement('input');
        input.placeholder = 'Имя';
        playersDiv.appendChild(input);
    }
}
