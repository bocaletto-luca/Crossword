/* main.js - Logica principale per Spacewar */

var mainGame = (function(){
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  let canvasWidth, canvasHeight;
  let gameInterval = null;
  
  // Variabili per le astronavi e i missili
  let playerShip, enemyShip, missiles;
  let enemyLastFire = 0;
  
  // Stato del gioco: memorizziamo il nome, il punteggio, il livello corrente, lo stato di esecuzione e le preferenze per i colori
  let gameState = {
    playerName: "",
    score: 0,
    currentLevel: 1,
    running: false,
    recordSaved: false,
    defaultShipColor: "#FFEB3B",    // Valore predefinito per l'astronave del giocatore
    defaultMissileColor: "#F44336"    // Valore predefinito per i missili del giocatore
  };
  
  /* RIDIMENSIONAMENTO DEL CANVAS */
  function resizeCanvas(){
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.6;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
  }
  window.addEventListener("resize", function(){
    resizeCanvas();
    if(gameState.running){
      drawGame();
    }
  });
  
  /* INIZIALIZZAZIONE DEL GIOCO */
  
  // Imposta il nome del giocatore
  function setPlayerName(name){
    gameState.playerName = name;
  }
  
  // Memorizza i colori scelti dal giocatore; verranno usati quando si inizializzano gli oggetti
  function setShipColors(shipColor, missileColor){
    gameState.defaultShipColor = shipColor;
    gameState.defaultMissileColor = missileColor;
  }
  
  // Crea gli oggetti del gioco: la navetta del giocatore, quella del Bot e l'array dei missili
  function initGameObjects(){
    playerShip = {
      x: canvasWidth * 0.2,
      y: canvasHeight * 0.8,
      angle: -Math.PI / 2,  // Punta verso l'alto
      vx: 0,
      vy: 0,
      radius: 15,
      health: 100,
      color: gameState.defaultShipColor,      // Usa il colore scelto
      missileColor: gameState.defaultMissileColor // Usa il colore scelto per i missili
    };
    enemyShip = {
      x: canvasWidth * 0.8,
      y: canvasHeight * 0.2,
      angle: Math.PI / 2,   // Punta verso il basso
      vx: 0,
      vy: 0,
      radius: 15,
      health: 100,
      color: "#4CAF50"      // Colore fisso per il Bot
    };
    missiles = [];
    enemyLastFire = Date.now();
  }
  
  // Inizializza il livello attuale
  function initLevel(){
    gameState.recordSaved = false;
    initGameObjects();
  }
  
  // Avvia il gioco: resetta punteggio e livello, aggiorna l'HUD e avvia il loop
  function startGame(){
    resizeCanvas();
    gameState.score = 0;
    gameState.currentLevel = 1;
    updateHUD();
    initLevel();
    gameState.running = true;
    startGameLoop();
  }
  
  // Avvia il loop di aggiornamento a 30 FPS
  function startGameLoop(){
    let interval = 1000 / 30;
    if(gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(updateGameLoop, interval);
  }
  
  // Funzione loop: aggiorna la logica del gioco e ridisegna
  function updateGameLoop(){
    updateGame();
    drawGame();
    // Se il gioco non è in esecuzione, interrompe il loop
    if(!gameState.running){
      clearInterval(gameInterval);
    }
  }
  
  /* LOGICA DI AGGIORNAMENTO */
  function updateGame(){
    // Aggiorna il movimento delle navicelle
    updateShip(playerShip);
    updateShip(enemyShip);
    // Aggiorna la posizione dei missili
    updateMissiles();
    // Aggiorna l'IA del Bot
    updateEnemyAI();
    // Controllo collisioni tra missili e navicelle
    checkCollisions();
    
    // Verifica la condizione di fine partita
    if(playerShip.health <= 0){
      endGame("Hai perso!");
    }
    if(enemyShip.health <= 0){
      gameState.score += gameState.currentLevel * 100;
      if(gameState.currentLevel < window.stages.length){
        gameState.currentLevel++;
        updateHUD();
        initLevel();
        return; // Non continua oltre per permettere la ricomposizione del livello
      } else {
        endGame("Hai vinto!");
      }
    }
    updateHUD();
  }
  
  // Movimento base: include il wrap-around
  function updateShip(ship){
    const friction = 0.99;
    ship.x += ship.vx;
    ship.y += ship.vy;
    ship.vx *= friction;
    ship.vy *= friction;
    if(ship.x < 0) ship.x = canvasWidth;
    if(ship.x > canvasWidth) ship.x = 0;
    if(ship.y < 0) ship.y = canvasHeight;
    if(ship.y > canvasHeight) ship.y = 0;
  }
  
  // Aggiorna i missili e li elimina se escono dallo schermo
  function updateMissiles(){
    missiles.forEach(missile => {
      missile.x += missile.vx;
      missile.y += missile.vy;
    });
    missiles = missiles.filter(m => m.x >= 0 && m.x <= canvasWidth && m.y >= 0 && m.y <= canvasHeight);
  }
  
  // L'IA del Bot: ruota gradualmente verso il giocatore, applica accelerazione e spara
  function updateEnemyAI(){
    let stageConfig = window.stages[gameState.currentLevel - 1];
    let desiredAngle = Math.atan2(playerShip.y - enemyShip.y, playerShip.x - enemyShip.x);
    let angleDiff = desiredAngle - enemyShip.angle;
    angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
    if(Math.abs(angleDiff) > 0.05){
      enemyShip.angle += (angleDiff > 0 ? 0.05 : -0.05);
    }
    const enemyAcceleration = 0.1 * stageConfig.enemySpeed;
    enemyShip.vx += enemyAcceleration * Math.cos(enemyShip.angle);
    enemyShip.vy += enemyAcceleration * Math.sin(enemyShip.angle);
    
    // Spara se il tempo è scaduto
    const now = Date.now();
    if(now - enemyLastFire > stageConfig.enemyFireRate){
      enemyShoot(stageConfig.enemyMissileSpeed);
      enemyLastFire = now;
    }
  }
  
  // Il Bot spara un missile con la velocità indicata
  function enemyShoot(missileSpeed){
    let missile = {
      x: enemyShip.x + Math.cos(enemyShip.angle) * enemyShip.radius,
      y: enemyShip.y + Math.sin(enemyShip.angle) * enemyShip.radius,
      vx: enemyShip.vx + missileSpeed * Math.cos(enemyShip.angle),
      vy: enemyShip.vy + missileSpeed * Math.sin(enemyShip.angle),
      radius: 4,
      owner: "enemy",
      color: "#4CAF50"
    };
    missiles.push(missile);
  }
  
  // Controlla se i missili colpiscono una nave, infliggendo danno e rimuovendo il missile
  function checkCollisions(){
    missiles.forEach((missile, i) => {
      if(missile.owner === "player"){
        if(distance(missile.x, missile.y, enemyShip.x, enemyShip.y) < enemyShip.radius + missile.radius){
          enemyShip.health -= 20;
          missiles.splice(i, 1);
        }
      } else if(missile.owner === "enemy"){
        if(distance(missile.x, missile.y, playerShip.x, playerShip.y) < playerShip.radius + missile.radius){
          playerShip.health -= 20;
          missiles.splice(i, 1);
        }
      }
    });
  }
  
  // Funzione ausiliaria per calcolare la distanza euclidea
  function distance(x1, y1, x2, y2){
    return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2);
  }
  
  /* DISEGNO */
  function drawGame(){
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    // Disegna le navicelle
    drawShip(playerShip);
    drawShip(enemyShip);
    // Disegna i missili
    missiles.forEach(missile => {
      ctx.fillStyle = missile.color;
      ctx.beginPath();
      ctx.arc(missile.x, missile.y, missile.radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  }
  
  // Disegna una navetta come triangolo
  function drawShip(ship){
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.angle);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-10, 10);
    ctx.lineTo(-10, -10);
    ctx.closePath();
    ctx.fillStyle = ship.color;
    ctx.fill();
    ctx.restore();
  }
  
  /* HUD: Aggiorna i display di punteggio e livello */
  function updateHUD(){
    document.getElementById("scoreDisplay").textContent = "Punteggio: " + gameState.score;
    document.getElementById("levelDisplay").textContent = "Livello: " + gameState.currentLevel + "/10";
  }
  
  /* FUNZIONI ESPOSTE AL CONTROLLO */
  function rotateLeft(){ playerShip.angle -= 0.1; }
  function rotateRight(){ playerShip.angle += 0.1; }
  function thrust(){
    const acceleration = 0.3;
    playerShip.vx += acceleration * Math.cos(playerShip.angle);
    playerShip.vy += acceleration * Math.sin(playerShip.angle);
  }
  function shoot(){
    const missileSpeed = 5;
    let missile = {
      x: playerShip.x + Math.cos(playerShip.angle) * playerShip.radius,
      y: playerShip.y + Math.sin(playerShip.angle) * playerShip.radius,
      vx: playerShip.vx + missileSpeed * Math.cos(playerShip.angle),
      vy: playerShip.vy + missileSpeed * Math.sin(playerShip.angle),
      radius: 4,
      owner: "player",
      color: playerShip.missileColor
    };
    missiles.push(missile);
  }
  
  // Restituisce la posizione corrente della navetta del giocatore per i controlli basati su mouse
  function getPlayerShipPixel(){
    return { x: playerShip.x, y: playerShip.y };
  }
  
  // Termina il gioco, mostra un messaggio di "Game Over" e salva il record (se non già salvato)
  function endGame(message){
    clearInterval(gameInterval);
    gameState.running = false;
    window.showToast("Game Over! " + gameState.playerName + "\n" + message + "\nPunteggio: " + gameState.score + "\nLivello: " + gameState.currentLevel, 3000);
    if(!gameState.recordSaved){
      saveRecord(gameState.playerName, gameState.score, gameState.currentLevel);
      gameState.recordSaved = true;
    }
  }
  
  // Salva il record inviando i dati a save.php tramite fetch
  function saveRecord(name, score, level){
    let formData = new FormData();
    formData.append("name", name);
    formData.append("score", score);
    formData.append("level", level);
    fetch("save.php", { method: "POST", body: formData })
      .then(response => response.json())
      .then(data => console.log("Record salvato:", data))
      .catch(err => console.error("Errore nel salvataggio del record:", err));
  }
  
  /* LOOP DI AGGIORNAMENTO */
  function updateGameLoop(){
    resizeCanvas();
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    updateGame();
  }
  
  return {
    setPlayerName: setPlayerName,
    setShipColors: setShipColors,
    rotateLeft: rotateLeft,
    rotateRight: rotateRight,
    thrust: thrust,
    shoot: shoot,
    getPlayerShipPixel: getPlayerShipPixel,
    startGame: function(){
      resizeCanvas();
      initLevel();
      gameState.running = true;
      updateGameLoop();
      gameInterval = setInterval(updateGameLoop, 1000/30);
    },
    endGame: endGame,
    updateGame: updateGame   // Opzionale, per debug
  };
})();
