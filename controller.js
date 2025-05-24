/* controller.js - Versione definitiva per Spacewar con toast notifications e input multipli */

document.addEventListener("DOMContentLoaded", function() {
  // Funzione toast globale per notifiche
  window.showToast = function(message, duration = 2000) {
    let toast = document.createElement("div");
    toast.innerText = message;
    Object.assign(toast.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
      color: "#fff",
      padding: "10px 20px",
      borderRadius: "5px",
      zIndex: "10000",
      opacity: "0",
      transition: "opacity 0.5s ease"
    });
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = "1"; });
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => { document.body.removeChild(toast); }, 500);
    }, duration);
  };

  /* ----- EVENTI UI ----- */
  const startBtn = document.getElementById("startGameBtn");
  startBtn.addEventListener("click", function() {
    const name = document.getElementById("playerName").value.trim();
    if(name === ""){
      showToast("Inserisci il tuo nome per iniziare!", 2500);
      return;
    }
    const shipColorElem = document.getElementById("shipColor");
    const missileColorElem = document.getElementById("missileColor");
    const shipColor = shipColorElem ? shipColorElem.value : "#FFEB3B";
    const missileColor = missileColorElem ? missileColorElem.value : "#F44336";
    
    mainGame.setPlayerName(name);
    if(typeof mainGame.setShipColors === "function"){
      mainGame.setShipColors(shipColor, missileColor);
    }
    document.getElementById("homeScreen").classList.remove("active");
    document.getElementById("gameScreen").classList.add("active");
    mainGame.startGame();
  });

  const exitBtn = document.getElementById("exitGameBtn");
  exitBtn.addEventListener("click", function(){
    mainGame.endGame();
    document.getElementById("gameScreen").classList.remove("active");
    document.getElementById("homeScreen").classList.add("active");
  });
  /* ----- FINE EVENTI UI ----- */

  /* ----- GESTIONE DEGLI INPUT ----- */
  // Tastiera
  window.addEventListener("keydown", function(e) {
    if(e.key === "ArrowLeft"){
      mainGame.rotateLeft();
    } else if(e.key === "ArrowRight"){
      mainGame.rotateRight();
    } else if(e.key === "ArrowUp"){
      mainGame.thrust();
    } else if(e.key === " "){
      mainGame.shoot();
    }
  });

  // Mouse
  const canvas = document.getElementById("gameCanvas");
  canvas.addEventListener("click", function(e){
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if(typeof mainGame.getPlayerShipPixel === "function"){
      const pos = mainGame.getPlayerShipPixel();
      if(Math.abs(clickX - pos.x) < 50){
        mainGame.shoot();
      } else if(clickX < pos.x){
        mainGame.rotateLeft();
      } else {
        mainGame.rotateRight();
      }
    }
  });

  // Touch
  let touchStartX = null, touchStartY = null;
  canvas.addEventListener("touchstart", function(e){
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  });
  canvas.addEventListener("touchend", function(e){
    if(touchStartX === null || touchStartY === null) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartX;
    if(Math.abs(diffX) < 20){
      mainGame.shoot();
    } else if(diffX > 0){
      mainGame.rotateRight();
    } else {
      mainGame.rotateLeft();
    }
    touchStartX = null;
    touchStartY = null;
  });

  // Gamepad
  let gamepadIndex = null;
  window.addEventListener("gamepadconnected", function(e){
    gamepadIndex = e.gamepad.index;
    showToast("Gamepad connesso: " + e.gamepad.id, 2000);
  });
  window.addEventListener("gamepaddisconnected", function(e){
    if(gamepadIndex === e.gamepad.index){
      gamepadIndex = null;
      showToast("Gamepad disconnesso", 2000);
    }
  });
  function pollGamepad(){
    if(gamepadIndex !== null){
      const gp = navigator.getGamepads()[gamepadIndex];
      if(gp){
        if(gp.buttons[14] && gp.buttons[14].pressed){
          mainGame.rotateLeft();
        } else if(gp.buttons[15] && gp.buttons[15].pressed){
          mainGame.rotateRight();
        }
        if(gp.buttons[12] && gp.buttons[12].pressed){
          mainGame.thrust();
        }
        if(gp.buttons[0] && gp.buttons[0].pressed){
          mainGame.shoot();
        }
      }
    }
    requestAnimationFrame(pollGamepad);
  }
  pollGamepad();
  /* ----- FINE GESTIONE INPUT ----- */
});
