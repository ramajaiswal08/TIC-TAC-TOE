let boxes = document.querySelectorAll(".box");
let resetBtn = document.querySelector(".btn");
let newGameBtn = document.querySelector("#new-btn");
let msgContainer = document.querySelector(".msg-container");
let msg = document.querySelector("#msg");
let status = document.querySelector("#status");
let resultGif = document.querySelector("#resultGif");

let turno = true;
let moveCount = 0;
let gameOver = false;

let audioTurn = new Audio("ting.mp3");
let gameOverSound = new Audio("gameover.mp3");

let winPatterns = [
  [0,1,2],
  [3,4,5],
  [6,7,8],
  [0,3,6],
  [1,4,7],
  [2,5,8],
  [0,4,8],
  [2,4,6]
];

boxes.forEach((box) => {

  box.addEventListener("click", () => {

    if(gameOver) return;

    if(turno){
      box.innerText = "O";
      status.innerText = "Player X Turn";
      turno = false;
    } else {
      box.innerText = "X";
      status.innerText = "Player O Turn";
      turno = true;
    }

    audioTurn.play();
    box.disabled = true;

    moveCount++;

    if(checkWinner()){
      gameOver = true;
      return;
    }

    if(moveCount === 9){
      showDraw();
      gameOver = true;
    }

  });

});

function checkWinner(){

  for(let pattern of winPatterns){

    let pos1 = boxes[pattern[0]].innerText;
    let pos2 = boxes[pattern[1]].innerText;
    let pos3 = boxes[pattern[2]].innerText;

    if(pos1 !== "" && pos2 !== "" && pos3 !== ""){

      if(pos1 === pos2 && pos2 === pos3){
        showWinner(pos1);
        return true;
      }

    }
  }

  return false;
}

function showWinner(winner){

  msg.innerText = `🎉 ${winner} Wins!`;
  msgContainer.classList.remove("hide");

  resultGif.src = "win.gif";

  
  gameOverSound.play(); 

  boxes.forEach(box => box.disabled = true);
}

function showDraw(){

  msg.innerText = "🤝 It's a Draw!";
  msgContainer.classList.remove("hide");

   resultGif.src = "draw.gif";

  gameOverSound.play();
}

function resetGame(){

  turno = true;
  moveCount = 0;
  gameOver = false;

  boxes.forEach(box => {
    box.innerText = "";
    box.disabled = false;
  });
  resultGif.src = "win.gif";
  msgContainer.classList.add("hide");
  status.innerText = "Player O Turn";
}

resetBtn.addEventListener("click", resetGame);
newGameBtn.addEventListener("click", resetGame);