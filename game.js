"use strict";

/* =========================================
   OCTOPUS ESCAPE - GAME JAVASCRIPT
========================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const screen = document.getElementById("screen");

const startOverlay = document.getElementById("start-overlay");
const messageOverlay = document.getElementById("message-overlay");
const messageText = document.getElementById("message-text");

const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const keysEl = document.getElementById("keys");
const oxygenEl = document.getElementById("oxygen");
const floodEl = document.getElementById("flood");
const proximityEl = document.getElementById("proximity");

const oxygenFill = document.getElementById("oxygen-fill");
const oxygenReading = document.getElementById("oxygen-reading");

const floodBox = document.getElementById("flood-box");
const proximityBox = document.getElementById("proximity-box");
const vignette = document.getElementById("vignette");

const radarEnemies = document.getElementById("radar-enemies");
const radarStatus = document.getElementById("radar-status");

const TOTAL_LEVELS = 5;

/* =========================================
   LEVEL SETTINGS
========================================= */

const levelSettings = [
    {
        keys: 1,
        enemies: 1,
        enemySpeed: 0.65,
        floodRate: 0.025,
        oxygenDrain: 0.07,
        obstacles: 3
    },

    {
        keys: 2,
        enemies: 2,
        enemySpeed: 0.85,
        floodRate: 0.035,
        oxygenDrain: 0.10,
        obstacles: 5
    },

    {
        keys: 3,
        enemies: 3,
        enemySpeed: 1.05,
        floodRate: 0.050,
        oxygenDrain: 0.14,
        obstacles: 7
    },

    {
        keys: 4,
        enemies: 4,
        enemySpeed: 1.25,
        floodRate: 0.070,
        oxygenDrain: 0.18,
        obstacles: 9
    },

    {
        keys: 5,
        enemies: 5,
        enemySpeed: 1.50,
        floodRate: 0.095,
        oxygenDrain: 0.23,
        obstacles: 12
    }
];

/* =========================================
   GAME VARIABLES
========================================= */

let gameState = "start";

let score = 0;
let level = 1;

let oxygen = 100;
let flood = 0;

let collectedKeys = 0;
let requiredKeys = 1;

let lastTime = 0;
let animationStarted = false;

const pressed = Object.create(null);

/* =========================================
   PLAYER
========================================= */

const player = {
    x: 60,
    y: 250,
    radius: 11,
    speed: 3.4
};

/* =========================================
   EXIT DOOR
========================================= */

const door = {
    x: 740,
    y: 250,
    width: 42,
    height: 55
};

let keys = [];
let enemies = [];
let obstacles = [];

/* =========================================
   UTILITY FUNCTIONS
========================================= */

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
    return Math.floor(random(min, max + 1));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function circleRectCollision(circle, rect) {

    const closestX = clamp(
        circle.x,
        rect.x,
        rect.x + rect.width
    );

    const closestY = clamp(
        circle.y,
        rect.y,
        rect.y + rect.height
    );

    const dx = circle.x - closestX;
    const dy = circle.y - closestY;

    return (
        dx * dx + dy * dy <
        circle.radius * circle.radius
    );
}

/* =========================================
   FIND FREE POSITION
========================================= */

function validPosition(x, y, minDistanceFromPlayer = 0) {

    if (
        Math.hypot(
            x - player.x,
            y - player.y
        ) < minDistanceFromPlayer
    ) {
        return false;
    }

    for (const obstacle of obstacles) {

        if (
            x > obstacle.x - 20 &&
            x < obstacle.x + obstacle.width + 20 &&
            y > obstacle.y - 20 &&
            y < obstacle.y + obstacle.height + 20
        ) {
            return false;
        }
    }

    return true;
}

function findFreePosition(minDistance = 80) {

    for (let i = 0; i < 200; i++) {

        const x = randomInt(45, 755);
        const y = randomInt(45, 455);

        if (validPosition(x, y, minDistance)) {

            return {
                x: x,
                y: y
            };
        }
    }

    return {
        x: randomInt(100, 700),
        y: randomInt(60, 440)
    };
}

/* =========================================
   KEYBOARD CONTROLS
========================================= */

window.addEventListener("keydown", function(event) {

    const key = event.key.toLowerCase();

    pressed[key] = true;

    if (
        key === "arrowup" ||
        key === "arrowdown" ||
        key === "arrowleft" ||
        key === "arrowright" ||
        key === " "
    ) {
        event.preventDefault();
    }

    /* ENTER */

    if (event.code === "Enter") {

        event.preventDefault();

        if (gameState === "start") {

            startGame();

        } else if (gameState === "levelComplete") {

            nextLevel();

        } else if (
            gameState === "gameover" ||
            gameState === "win"
        ) {

            resetGame();
            startGame();
        }
    }
});

/* =========================================
   KEY RELEASE
========================================= */

window.addEventListener("keyup", function(event) {

    pressed[event.key.toLowerCase()] = false;
});

/* =========================================
   CLICK START / RESTART
========================================= */

startOverlay.addEventListener("click", function() {

    if (gameState === "start") {
        startGame();
    }
});

messageOverlay.addEventListener("click", function() {

    if (gameState === "levelComplete") {

        nextLevel();

    } else if (
        gameState === "gameover" ||
        gameState === "win"
    ) {

        resetGame();
        startGame();
    }
});

/* =========================================
   START GAME
========================================= */

function startGame() {

    score = 0;
    level = 1;

    gameState = "playing";

    startOverlay.classList.add("hidden");
    messageOverlay.classList.add("hidden");

    createLevel();

    if (!animationStarted) {

        animationStarted = true;

        lastTime = performance.now();

        requestAnimationFrame(gameLoop);
    }
}

/* =========================================
   RESET GAME
========================================= */

function resetGame() {

    score = 0;
    level = 1;

    oxygen = 100;
    flood = 0;

    collectedKeys = 0;

    keys = [];
    enemies = [];
    obstacles = [];
}

/* =========================================
   CREATE LEVEL
========================================= */

function createLevel() {

    const settings = levelSettings[level - 1];

    requiredKeys = settings.keys;

    collectedKeys = 0;

    oxygen = 100;
    flood = 0;

    /* PLAYER */

    player.x = 50;
    player.y = randomInt(60, 440);

    /* OBSTACLES */

    obstacles = [];

    for (
        let i = 0;
        i < settings.obstacles;
        i++
    ) {

        let placed = false;

        for (
            let attempt = 0;
            attempt < 100 && !placed;
            attempt++
        ) {

            const obstacle = {

                x: randomInt(120, 650),
                y: randomInt(50, 430),

                width: randomInt(35, 75),
                height: randomInt(22, 50)
            };

            if (
                Math.hypot(
                    obstacle.x +
                    obstacle.width / 2 -
                    player.x,

                    obstacle.y +
                    obstacle.height / 2 -
                    player.y
                ) > 100
            ) {

                const overlaps =
                    obstacles.some(existing =>

                        obstacle.x <
                        existing.x +
                        existing.width +
                        15 &&

                        obstacle.x +
                        obstacle.width +
                        15 >
                        existing.x &&

                        obstacle.y <
                        existing.y +
                        existing.height +
                        15 &&

                        obstacle.y +
                        obstacle.height +
                        15 >
                        existing.y
                    );

                if (!overlaps) {

                    obstacles.push(obstacle);

                    placed = true;
                }
            }
        }
    }

    /* EXIT */

    const doorPos = findFreePosition(250);

    door.x = clamp(
        doorPos.x,
        620,
        755
    );

    door.y = clamp(
        doorPos.y,
        55,
        445
    );

    /* KEYS */

    keys = [];

    for (
        let i = 0;
        i < requiredKeys;
        i++
    ) {

        const pos = findFreePosition(100);

        keys.push({

            x: pos.x,
            y: pos.y,

            collected: false,

            pulse:
                Math.random() *
                Math.PI * 2
        });
    }

    /* ENEMIES */

    enemies = [];

    for (
        let i = 0;
        i < settings.enemies;
        i++
    ) {

        const pos =
            findFreePosition(250);

        enemies.push({

            x: pos.x,
            y: pos.y,

            radius: 19,

            speed:
                settings.enemySpeed,

            angle:
                Math.random() *
                Math.PI * 2,

            wanderTimer:
                random(500, 1800)
        });
    }

    updateHUD();
}

/* =========================================
   NEXT LEVEL
========================================= */

function nextLevel() {

    if (level >= TOTAL_LEVELS) {

        gameState = "win";

        showMessage(
            "ALL LEVELS CLEARED!\n\n" +
            "YOU ESCAPED THE OCTOPUS!\n\n" +
            "FINAL SCORE: " +
            Math.floor(score) +
            "\n\n" +
            "PRESS ENTER TO PLAY AGAIN"
        );

        return;
    }

    level++;

    score += level * 500;

    gameState = "playing";

    messageOverlay.classList.add("hidden");

    createLevel();
}

/* =========================================
   MAIN GAME LOOP
========================================= */

function gameLoop(time) {

    const delta =
        Math.min(
            time - lastTime,
            50
        );

    lastTime = time;

    if (gameState === "playing") {

        update(delta);
    }

    draw();

    requestAnimationFrame(gameLoop);
}

/* =========================================
   UPDATE GAME
========================================= */

function update(delta) {

    const settings =
        levelSettings[level - 1];

    const dt =
        delta / 16.67;

    let dx = 0;
    let dy = 0;

    /* MOVEMENT */

    if (
        pressed["arrowup"] ||
        pressed["w"]
    ) {
        dy--;
    }

    if (
        pressed["arrowdown"] ||
        pressed["s"]
    ) {
        dy++;
    }

    if (
        pressed["arrowleft"] ||
        pressed["a"]
    ) {
        dx--;
    }

    if (
        pressed["arrowright"] ||
        pressed["d"]
    ) {
        dx++;
    }

    /* DIAGONAL NORMALIZATION */

    if (dx !== 0 && dy !== 0) {

        dx *= 0.707;
        dy *= 0.707;
    }

    const oldX = player.x;
    const oldY = player.y;

    player.x +=
        dx *
        player.speed *
        dt;

    player.y +=
        dy *
        player.speed *
        dt;

    /* SCREEN BOUNDARIES */

    player.x = clamp(
        player.x,
        15,
        canvas.width - 15
    );

    player.y = clamp(
        player.y,
        15,
        canvas.height - 15
    );

    /* OBSTACLE COLLISION */

    for (const obstacle of obstacles) {

        if (
            circleRectCollision(
                player,
                obstacle
            )
        ) {

            player.x = oldX;
            player.y = oldY;

            break;
        }
    }

    /* OXYGEN */

    oxygen -=
        settings.oxygenDrain *
        dt;

    oxygen = clamp(
        oxygen,
        0,
        100
    );

    /* FLOOD */

    flood +=
        settings.floodRate *
        dt;

    flood = clamp(
        flood,
        0,
        100
    );

    /* SCORE */

    score +=
        0.12 *
        level *
        dt;

    /* =====================================
       COLLECT KEYS
    ===================================== */

    for (const key of keys) {

        key.pulse +=
            0.08 * dt;

        if (
            !key.collected &&
            distance(player, key) < 25
        ) {

            key.collected = true;

            collectedKeys++;

            score +=
                100 * level;
        }
    }

    /* =====================================
       ENEMY AI
    ===================================== */

    for (const enemy of enemies) {

        const enemyDX =
            player.x - enemy.x;

        const enemyDY =
            player.y - enemy.y;

        const dist =
            Math.hypot(
                enemyDX,
                enemyDY
            );

        /* CHASE PLAYER */

        if (dist < 300) {

            if (dist > 1) {

                enemy.x +=
                    (enemyDX / dist) *
                    enemy.speed *
                    dt;

                enemy.y +=
                    (enemyDY / dist) *
                    enemy.speed *
                    dt;
            }

        } else {

            /* WANDER */

            enemy.wanderTimer -= delta;

            if (enemy.wanderTimer <= 0) {

                enemy.angle =
                    random(
                        0,
                        Math.PI * 2
                    );

                enemy.wanderTimer =
                    random(
                        500,
                        1800
                    );
            }

            enemy.x +=
                Math.cos(enemy.angle) *
                enemy.speed *
                0.25 *
                dt;

            enemy.y +=
                Math.sin(enemy.angle) *
                enemy.speed *
                0.25 *
                dt;
        }

        /* ENEMY BOUNDARIES */

        enemy.x = clamp(
            enemy.x,
            25,
            canvas.width - 25
        );

        enemy.y = clamp(
            enemy.y,
            25,
            canvas.height - 25
        );

        /* ENEMY / OBSTACLE */

        for (const obstacle of obstacles) {

            if (
                enemy.x >
                obstacle.x - enemy.radius &&

                enemy.x <
                obstacle.x +
                obstacle.width +
                enemy.radius &&

                enemy.y >
                obstacle.y - enemy.radius &&

                enemy.y <
                obstacle.y +
                obstacle.height +
                enemy.radius
            ) {

                enemy.angle += Math.PI;
            }
        }

        /* ENEMY / PLAYER */

        if (
            distance(player, enemy) <
            player.radius +
            enemy.radius
        ) {

            gameOver(
                "THE OCTOPUS CAUGHT YOU!"
            );

            return;
        }
    }

    /* =====================================
       EXIT
    ===================================== */

    if (
        collectedKeys >= requiredKeys &&

        player.x >
        door.x - 30 &&

        player.x <
        door.x + 30 &&

        player.y >
        door.y - 35 &&

        player.y <
        door.y + 35
    ) {

        score +=
            Math.floor(oxygen * 5) +

            Math.floor(
                (100 - flood) * 5
            );

        gameState =
            "levelComplete";

        showMessage(

            "LEVEL " +
            level +
            " COMPLETE!\n\n" +

            "KEYS: " +
            collectedKeys +
            "/" +
            requiredKeys +

            "\nOXYGEN: " +
            Math.floor(oxygen) +
            "%" +

            "\nFLOOD: " +
            Math.floor(flood) +
            "%" +

            "\nSCORE: " +
            Math.floor(score) +

            "\n\n" +

            "PRESS ENTER FOR NEXT LEVEL"
        );

        return;
    }

    /* =====================================
       OXYGEN GAME OVER
    ===================================== */

    if (oxygen <= 0) {

        gameOver(
            "OXYGEN DEPLETED!"
        );

        return;
    }

    /* =====================================
       FLOOD GAME OVER
    ===================================== */

    if (flood >= 100) {

        gameOver(
            "FLOOD REACHED 100%!\nYOU DROWNED!"
        );

        return;
    }

    updateHUD();
}

/* =========================================
   DRAW GAME
========================================= */

function draw() {

    /* BACKGROUND */

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    ctx.fillStyle = "#001010";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    /* GRID */

    ctx.strokeStyle =
        "rgba(0,255,65,.08)";

    ctx.lineWidth = 1;

    for (
        let x = 0;
        x <= canvas.width;
        x += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(x, 0);

        ctx.lineTo(
            x,
            canvas.height
        );

        ctx.stroke();
    }

    for (
        let y = 0;
        y <= canvas.height;
        y += 40
    ) {

        ctx.beginPath();

        ctx.moveTo(0, y);

        ctx.lineTo(
            canvas.width,
            y
        );

        ctx.stroke();
    }

    /* =====================================
       FLOOD WATER
    ===================================== */

    const floodHeight =
        canvas.height *
        flood /
        100;

    ctx.fillStyle =
        "rgba(0,90,190,.35)";

    ctx.fillRect(
        0,
        canvas.height - floodHeight,
        canvas.width,
        floodHeight
    );

    /* WATER WAVE */

    ctx.strokeStyle =
        "rgba(60,190,255,.55)";

    ctx.lineWidth = 2;

    const waveY =
        canvas.height -
        floodHeight;

    ctx.beginPath();

    for (
        let x = 0;
        x <= canvas.width;
        x += 10
    ) {

        const y =
            waveY +
            Math.sin(
                x * 0.04 +
                performance.now() * 0.003
            ) * 3;

        ctx.lineTo(x, y);
    }

    ctx.stroke();

    /* =====================================
       OBSTACLES
    ===================================== */

    for (const obstacle of obstacles) {

        ctx.fillStyle = "#00382b";

        ctx.strokeStyle = "#00a060";

        ctx.lineWidth = 2;

        ctx.fillRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );

        ctx.strokeRect(
            obstacle.x,
            obstacle.y,
            obstacle.width,
            obstacle.height
        );
    }

    /* =====================================
       KEYS
    ===================================== */

    for (const key of keys) {

        if (key.collected) {
            continue;
        }

        const glow =
            8 +
            Math.sin(key.pulse) * 4;

        ctx.save();

        ctx.shadowBlur = glow;
        ctx.shadowColor = "#ffe600";

        ctx.strokeStyle = "#ffe600";
        ctx.lineWidth = 3;

        /* KEY RING */

        ctx.beginPath();

        ctx.arc(
            key.x,
            key.y,
            8,
            0,
            Math.PI * 2
        );

        ctx.stroke();

        /* KEY SHAFT */

        ctx.beginPath();

        ctx.moveTo(
            key.x + 7,
            key.y
        );

        ctx.lineTo(
            key.x + 17,
            key.y
        );

        ctx.lineTo(
            key.x + 17,
            key.y + 5
        );

        ctx.lineTo(
            key.x + 12,
            key.y + 5
        );

        ctx.stroke();

        ctx.restore();
    }

    /* =====================================
       EXIT DOOR
    ===================================== */

    const unlocked =
        collectedKeys >= requiredKeys;

    ctx.save();

    ctx.strokeStyle =
        unlocked
            ? "#00ff41"
            : "#555";

    ctx.lineWidth = 4;

    ctx.shadowBlur =
        unlocked
            ? 15
            : 0;

    ctx.shadowColor =
        "#00ff41";

    ctx.strokeRect(

        door.x -
        door.width / 2,

        door.y -
        door.height / 2,

        door.width,
        door.height
    );

    ctx.fillStyle =
        unlocked
            ? "#00ff41"
            : "#555";

    ctx.font =
        "9px 'Press Start 2P'";

    ctx.textAlign = "center";

    ctx.fillText(

        unlocked
            ? "EXIT"
            : "LOCK",

        door.x,
        door.y + 3
    );

    ctx.restore();

    /* =====================================
       OCTOPUSES
    ===================================== */

    for (const enemy of enemies) {

        drawOctopus(
            enemy.x,
            enemy.y
        );
    }

    /* =====================================
       PLAYER
    ===================================== */

    ctx.save();

    ctx.fillStyle = "#3bffe9";

    ctx.shadowBlur = 15;

    ctx.shadowColor = "#3bffe9";

    ctx.beginPath();

    ctx.arc(
        player.x,
        player.y,
        player.radius,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();

    /* =====================================
       FLOOD WARNING
    ===================================== */

    if (flood > 70) {

        ctx.save();

        ctx.fillStyle = "#ff3030";

        ctx.font =
            "13px 'Press Start 2P'";

        ctx.textAlign = "center";

        ctx.shadowBlur = 10;

        ctx.shadowColor = "#ff3030";

        ctx.fillText(
            "!!! FLOOD WARNING !!!",
            canvas.width / 2,
            25
        );

        ctx.restore();
    }
}

/* =========================================
   DRAW OCTOPUS
========================================= */

function drawOctopus(x, y) {

    ctx.save();

    ctx.translate(x, y);

    ctx.fillStyle = "#ff3030";
    ctx.strokeStyle = "#ff3030";

    ctx.shadowBlur = 12;
    ctx.shadowColor = "#ff3030";

    /* HEAD */

    ctx.beginPath();

    ctx.arc(
        0,
        -6,
        18,
        Math.PI,
        0
    );

    ctx.lineTo(18, 10);
    ctx.lineTo(-18, 10);

    ctx.closePath();

    ctx.fill();

    /* TENTACLES */

    ctx.lineWidth = 4;

    for (
        let i = -3;
        i <= 3;
        i++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i * 5,
            7
        );

        ctx.lineTo(
            i * 6,
            23 +
            Math.abs(i) * 2
        );

        ctx.stroke();
    }

    /* EYES */

    ctx.shadowBlur = 0;

    ctx.fillStyle = "#fff";

    ctx.fillRect(
        -8,
        -10,
        5,
        5
    );

    ctx.fillRect(
        3,
        -10,
        5,
        5
    );

    ctx.restore();
}

/* =========================================
   UPDATE HUD
========================================= */

function updateHUD() {

    scoreEl.textContent =
        Math.floor(score);

    levelEl.textContent =
        level;

    keysEl.textContent =
        collectedKeys +
        "/" +
        requiredKeys;

    oxygenEl.textContent =
        Math.floor(oxygen);

    floodEl.textContent =
        Math.floor(flood);

    /* OXYGEN BAR */

    oxygenFill.style.width =
        oxygen + "%";

    oxygenReading.textContent =
        Math.floor(oxygen) + "%";

    /* CLOSEST ENEMY */

    let closest = Infinity;

    for (const enemy of enemies) {

        closest = Math.min(
            closest,
            distance(player, enemy)
        );
    }

    if (closest === Infinity) {

        proximityEl.textContent = "---";

    } else {

        proximityEl.textContent =
            Math.floor(closest);
    }

    /* DANGER */

    const danger =
        closest < 110;

    proximityBox.classList.toggle(
        "danger",
        danger
    );

    vignette.classList.toggle(
        "danger",
        danger
    );

    floodBox.classList.toggle(
        "danger",
        flood > 70
    );

    /* OXYGEN COLORS */

    if (oxygen < 25) {

        oxygenFill.style.background =
            "#ff3030";

        oxygenReading.style.color =
            "#ff3030";

    } else if (oxygen < 50) {

        oxygenFill.style.background =
            "#ffe600";

        oxygenReading.style.color =
            "#ffe600";

    } else {

        oxygenFill.style.background =
            "#3bffe9";

        oxygenReading.style.color =
            "#3bffe9";
    }

    updateRadar();
}

/* =========================================
   ENEMY RADAR
========================================= */

function updateRadar() {

    radarEnemies.innerHTML = "";

    let closest = Infinity;

    for (const enemy of enemies) {

        const dx =
            enemy.x - player.x;

        const dy =
            enemy.y - player.y;

        const dist =
            Math.hypot(dx, dy);

        closest =
            Math.min(
                closest,
                dist
            );

        const scale = 0.18;

        const rx =
            clamp(
                60 + dx * scale,
                4,
                116
            );

        const ry =
            clamp(
                60 + dy * scale,
                4,
                116
            );

        const dot =
            document.createElement("div");

        dot.className = "radar-dot";

        dot.style.left =
            rx + "px";

        dot.style.top =
            ry + "px";

        radarEnemies.appendChild(dot);
    }

    /* RADAR STATUS */

    if (closest < 100) {

        radarStatus.textContent =
            "!!! DANGER !!!";

        radarStatus.style.color =
            "#ff3030";

    } else if (closest < 200) {

        radarStatus.textContent =
            "ENEMY NEARBY";

        radarStatus.style.color =
            "#ffe600";

    } else {

        radarStatus.textContent =
            "SCANNING...";

        radarStatus.style.color =
            "#00ff41";
    }
}

/* =========================================
   GAME OVER
========================================= */

function gameOver(reason) {

    gameState = "gameover";

    screen.classList.remove("shake");

    void screen.offsetWidth;

    screen.classList.add("shake");

    showMessage(

        reason +

        "\n\nLEVEL: " +
        level +

        "\nSCORE: " +
        Math.floor(score) +

        "\n\nPRESS ENTER TO RESTART"
    );
}

/* =========================================
   MESSAGE
========================================= */

function showMessage(text) {

    messageText.textContent = text;

    messageOverlay.classList.remove(
        "hidden"
    );
}

/* =========================================
   INITIAL CANVAS
========================================= */

ctx.fillStyle = "#001010";

ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
);

ctx.fillStyle = "#00ff41";

ctx.font =
    "14px 'Press Start 2P'";

ctx.textAlign = "center";

ctx.fillText(
    "PRESS ENTER TO START",
    canvas.width / 2,
    canvas.height / 2
);

console.log(
    "OCTOPUS ESCAPE LOADED SUCCESSFULLY"
);