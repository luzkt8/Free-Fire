
// ==========================================
// BERMUDA 3D - GAME ENGINE
// Babylon.js | Ultimate Edition
// ==========================================

const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
  antialias: true
});

let scene, camera, player, playerRoot;
let running = false;
let paused = false;
let health = 100;
let shield = 100;
let kills = 0;
let bots = [];
let projectiles = [];
let pickups = [];
let keys = {};
let lastShot = 0;
let jumpSpeed = 0;
let onGround = true;
let worldTime = 0;

const MAP_SIZE = 180;
const BOT_COUNT = 19;

const ui = id => document.getElementById(id);

const mat = (name, color, emissive = null) => {
  const m = new BABYLON.StandardMaterial(name, scene);
  m.diffuseColor = BABYLON.Color3.FromHexString(color);
  if (emissive) {
    m.emissiveColor = BABYLON.Color3.FromHexString(emissive);
  }
  return m;
};

const random = (min, max) =>
  min + Math.random() * (max - min);

// ==========================================
// SCENE
// ==========================================

function createScene() {
  scene = new BABYLON.Scene(engine);

  scene.clearColor = new BABYLON.Color4(0.52, 0.77, 0.88, 1);
  scene.collisionsEnabled = true;
  scene.gravity = new BABYLON.Vector3(0, -0.5, 0);

  const sky = new BABYLON.HemisphericLight(
    "skyLight",
    new BABYLON.Vector3(0, 1, 0),
    scene
  );
  sky.intensity = 0.85;

  const sun = new BABYLON.DirectionalLight(
    "sun",
    new BABYLON.Vector3(-0.5, -1, 0.4),
    scene
  );
  sun.intensity = 1.1;
  sun.position = new BABYLON.Vector3(50, 100, -50);

  createEnvironment();
  createPlayer();
  createBots();
  createPickups();
  createCamera();

  return scene;
}

// ==========================================
// MATERIALS
// ==========================================

let grassMat, sandMat, waterMat, treeMat;
let buildingMat, roofMat, roadMat, darkMat;
let playerMat, enemyMat, energyMat;

function createMaterials() {
  grassMat = mat("grass", "#568D50");
  sandMat = mat("sand", "#DCC58C");
  waterMat = mat("water", "#167DAD");
  treeMat = mat("tree", "#28623C");
  buildingMat = mat("building", "#C8C5B7");
  roofMat = mat("roof", "#84533D");
  roadMat = mat("road", "#555F65");
  darkMat = mat("dark", "#253746");
  playerMat = mat("player", "#17C9D7");
  enemyMat = mat("enemy", "#E5A342");
  energyMat = mat("energy", "#00EFFF", "#00A9FF");
}

// ==========================================
// ENVIRONMENT
// ==========================================

function createEnvironment() {
  createMaterials();

  const water = BABYLON.MeshBuilder.CreateGround(
    "ocean",
    { width: 650, height: 650 },
    scene
  );
  water.position.y = -1.5;
  water.material = waterMat;

  const island = BABYLON.MeshBuilder.CreateGround(
    "island",
    { width: MAP_SIZE * 2, height: MAP_SIZE * 2, subdivisions: 60 },
    scene
  );
  island.material = grassMat;
  island.checkCollisions = true;

  const positions = island.getVerticesData(
    BABYLON.VertexBuffer.PositionKind
  );

  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i];
    const z = positions[i + 2];

    positions[i + 1] =
      Math.sin(x * 0.035) * 1.5 +
      Math.cos(z * 0.04) * 1.2 +
      Math.sin((x + z) * 0.025) * 1.2;
  }

  island.updateVerticesData(
    BABYLON.VertexBuffer.PositionKind,
    positions
  );
  island.refreshBoundingInfo();

  createRoads();
  createBuildings();
  createTrees();
  createLandmarks();
  createMountains();
}

function createRoads() {
  const road1 = BABYLON.MeshBuilder.CreateBox(
    "road1",
    { width: 8, height: 0.12, depth: 260 },
    scene
  );

  road1.position.y = 0.08;
  road1.material = roadMat;

  const road2 = BABYLON.MeshBuilder.CreateBox(
    "road2",
    { width: 260, height: 0.12, depth: 8 },
    scene
  );

  road2.position.y = 0.08;
  road2.material = roadMat;
}

function createBuilding(x, z, width, depth, height, name) {
  const building = BABYLON.MeshBuilder.CreateBox(
    name,
    {
      width,
      height,
      depth
    },
    scene
  );

  building.position.set(x, height / 2 + 0.2, z);
  building.material = buildingMat;
  building.checkCollisions = true;

  const roof = BABYLON.MeshBuilder.CreateBox(
    name + "Roof",
    {
      width: width + 1,
      height: 0.7,
      depth: depth + 1
    },
    scene
  );

  roof.position.set(x, height + 0.55, z);
  roof.material = roofMat;
  roof.checkCollisions = true;

  // Decorative windows
  for (const side of [-1, 1]) {
    const window = BABYLON.MeshBuilder.CreateBox(
      "window",
      { width: 1.7, height: 1.4, depth: 0.12 },
      scene
    );

    window.position.set(
      x + side * width * 0.24,
      height * 0.65,
      z + depth / 2 + 0.08
    );

    window.material = mat(
      "glass" + x + z + side,
      "#45B8D1",
      "#124D70"
    );
  }

  // Decorative door
  const door = BABYLON.MeshBuilder.CreateBox(
    "door",
    { width: 1.5, height: 2.2, depth: 0.12 },
    scene
  );

  door.position.set(x, 1.3, z + depth / 2 + 0.1);
  door.material = darkMat;

  return building;
}

function createBuildings() {
  const locations = [
    { name: "PEAK", x: 0, z: -50 },
    { name: "FACTORY", x: 55, z: 15 },
    { name: "CLOCK TOWER", x: -55, z: 15 },
    { name: "OBSERVATORY", x: 30, z: 65 },
    { name: "RIVERSIDE", x: -65, z: -55 }
  ];

  locations.forEach(place => {
    for (let i = 0; i < 5; i++) {
      createBuilding(
        place.x + random(-12, 12),
        place.z + random(-12, 12),
        random(7, 12),
        random(7, 11),
        random(4, 9),
        place.name + i
      );
    }

    const marker = BABYLON.MeshBuilder.CreateCylinder(
      "locationMarker",
      { diameter: 1.5, height: 7 },
      scene
    );

    marker.position.set(place.x, 4, place.z);
    marker.material = mat(
      "marker" + place.name,
      "#00DFFF",
      "#007FBB"
    );
  });
}

function createTree(x, z, scale = 1) {
  const trunk = BABYLON.MeshBuilder.CreateCylinder(
    "treeTrunk",
    {
      diameterTop: 0.35 * scale,
      diameterBottom: 0.65 * scale,
      height: 3 * scale
    },
    scene
  );

  trunk.position.set(x, 1.5 * scale, z);
  trunk.material = darkMat;

  const leaves = BABYLON.MeshBuilder.CreateSphere(
    "treeLeaves",
    { diameter: 3.1 * scale, segments: 8 },
    scene
  );

  leaves.position.set(x, 3.6 * scale, z);
  leaves.scaling.y = 1.3;
  leaves.material = treeMat;
}

function createTrees() {
  for (let i = 0; i < 130; i++) {
    const x = random(-125, 125);
    const z = random(-125, 125);

    if (Math.abs(x) < 15 || Math.abs(z) < 15) continue;

    createTree(x, z, random(0.7, 1.4));
  }
}

function createMountains() {
  for (let i = 0; i < 24; i++) {
    const angle = i / 24 * Math.PI * 2;
    const distance = 125;

    const mountain = BABYLON.MeshBuilder.CreateSphere(
      "mountain",
      { diameter: random(16, 25), segments: 8 },
      scene
    );

    mountain.position.set(
      Math.cos(angle) * distance,
      6,
      Math.sin(angle) * distance
    );

    mountain.scaling.y = 1.7;
    mountain.material = treeMat;
  }
}

function createLandmarks() {
  const tower = BABYLON.MeshBuilder.CreateCylinder(
    "clockTower",
    { diameter: 5, height: 20 },
    scene
  );

  tower.position.set(-55, 10, 15);
  tower.material = darkMat;

  const top = BABYLON.MeshBuilder.CreateBox(
    "towerTop",
    { width: 8, height: 2, depth: 8 },
    scene
  );

  top.position.set(-55, 20, 15);
  top.material = roofMat;
}

// ==========================================
// CHARACTER CREATION
// ==========================================

function createCharacter(name, material) {
  const root = new BABYLON.TransformNode(name, scene);

  const body = BABYLON.MeshBuilder.CreateCapsule(
    name + "Body",
    { height: 1.8, radius: 0.48 },
    scene
  );

  body.position.y = 1.05;
  body.material = material;
  body.parent = root;

  const head = BABYLON.MeshBuilder.CreateSphere(
    name + "Head",
    { diameter: 0.7, segments: 12 },
    scene
  );

  head.position.y = 2.15;
  head.material = mat(name + "Skin", "#C99070");
  head.parent = root;

  const backpack = BABYLON.MeshBuilder.CreateBox(
    name + "Backpack",
    { width: 0.65, height: 0.85, depth: 0.35 },
    scene
  );

  backpack.position.set(0, 1.15, -0.45);
  backpack.material = darkMat;
  backpack.parent = root;

  const marker = BABYLON.MeshBuilder.CreateTorus(
    name + "Marker",
    { diameter: 1.5, thickness: 0.06 },
    scene
  );

  marker.rotation.x = Math.PI / 2;
  marker.position.y = 0.08;
  marker.material = energyMat;
  marker.parent = root;

  return root;
}

// ==========================================
// PLAYER
// ==========================================

function createPlayer() {
  playerRoot = createCharacter("Player", playerMat);

  player = {
    mesh: playerRoot,
    speed: 11,
    alive: true,
    direction: 0
  };

  playerRoot.position.set(0, 0, 0);
}

function createCamera() {
  camera = new BABYLON.ArcRotateCamera(
    "thirdPersonCamera",
    -Math.PI / 2,
    1.15,
    11,
    playerRoot.position.add(
      new BABYLON.Vector3(0, 1.5, 0)
    ),
    scene
  );

  camera.lowerRadiusLimit = 7;
  camera.upperRadiusLimit = 15;
  camera.lowerBetaLimit = 0.65;
  camera.upperBetaLimit = 1.45;
  camera.panningSensibility = 0;
  camera.wheelPrecision = 50;
  camera.attachControl(canvas, true);
  camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
}

// ==========================================
// RIVALS
// ==========================================

function createBots() {
  for (let i = 0; i < BOT_COUNT; i++) {
    const angle = i / BOT_COUNT * Math.PI * 2;
    const distance = random(35, 85);

    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const mesh = createCharacter(
      "Rival" + i,
      enemyMat
    );

    mesh.position.set(x, 0, z);

    bots.push({
      mesh,
      hp: 100,
      alive: true,
      speed: random(2, 4),
      direction: random(0, Math.PI * 2),
      timer: random(1, 4)
    });
  }
}

function updateBots(dt) {
  bots.forEach(bot => {
    if (!bot.alive) return;

    bot.timer -= dt;

    if (bot.timer <= 0) {
      bot.direction = random(0, Math.PI * 2);
      bot.timer = random(2, 5);
    }

    bot.mesh.position.x +=
      Math.sin(bot.direction) * bot.speed * dt;

    bot.mesh.position.z +=
      Math.cos(bot.direction) * bot.speed * dt;

    bot.mesh.position.x = Math.max(
      -MAP_SIZE,
      Math.min(MAP_SIZE, bot.mesh.position.x)
    );

    bot.mesh.position.z = Math.max(
      -MAP_SIZE,
      Math.min(MAP_SIZE, bot.mesh.position.z)
    );

    bot.mesh.rotation.y = bot.direction;

    bot.mesh.position.y =
      Math.sin(worldTime * 3 + bot.mesh.position.x) * 0.04;
  });
}

// ==========================================
// ENERGY PROJECTILES
// ==========================================

function shoot() {
  if (!running || paused || !player.alive) return;

  const now = performance.now();

  if (now - lastShot < 350) return;
  lastShot = now;

  const direction = camera.getForwardRay().direction;
  const start = camera.position.add(
    direction.scale(1.5)
  );

  const orb = BABYLON.MeshBuilder.CreateSphere(
    "energyOrb",
    { diameter: 0.42, segments: 12 },
    scene
  );

  orb.position = start;
  orb.material = energyMat;

  projectiles.push({
    mesh: orb,
    direction: direction.normalize(),
    life: 2.5,
    owner: "player"
  });
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];

    p.life -= dt;
    p.mesh.position.addInPlace(
      p.direction.scale(42 * dt)
    );

    let remove = p.life <= 0;

    if (p.owner === "player") {
      for (const bot of bots) {
        if (!bot.alive) continue;

        const distance = BABYLON.Vector3.Distance(
          p.mesh.position,
          bot.mesh.position.add(
            new BABYLON.Vector3(0, 1, 0)
          )
        );

        if (distance < 1.4) {
          bot.hp -= 50;
          remove = true;

          if (bot.hp <= 0) {
            bot.alive = false;
            bot.mesh.setEnabled(false);
            kills++;
            showMessage("¡RIVAL SUPERADO!");
            updateHUD();
          }

          break;
        }
      }
    }

    if (remove) {
      p.mesh.dispose();
      projectiles.splice(i, 1);
    }
  }
}

// ==========================================
// SUPPLIES
// ==========================================

function createPickups() {
  for (let i = 0; i < 24; i++) {
    const type = Math.random() > 0.5 ? "health" : "shield";

    const mesh = BABYLON.MeshBuilder.CreateBox(
      "supply",
      { size: 1.2 },
      scene
    );

    mesh.position.set(
      random(-100, 100),
      1,
      random(-100, 100)
    );

    mesh.material = mat(
      "supplyMat" + i,
      type === "health" ? "#00FF9D" : "#008EFF",
      type === "health" ? "#00A95D" : "#0055FF"
    );

    pickups.push({ mesh, type });
  }
}

function updatePickups() {
  pickups.forEach((item, index) => {
    if (!item.mesh) return;

    item.mesh.rotation.y += 0.025;
    item.mesh.position.y =
      1 + Math.sin(worldTime * 2 + index) * 0.2;

    const distance = BABYLON.Vector3.Distance(
      playerRoot.position,
      item.mesh.position
    );

    if (distance < 2.5) {
      if (item.type === "health") {
        health = Math.min(100, health + 30);
        showMessage("SALUD RECUPERADA");
      } else {
        shield = Math.min(100, shield + 35);
        showMessage("ESCUDO RECUPERADO");
      }

      item.mesh.dispose();
      item.mesh = null;
      updateHUD();
    }
  });
}

// ==========================================
// PLAYER MOVEMENT
// ==========================================

function updatePlayer(dt) {
  if (!player.alive) return;

  let forward = 0;
  let side = 0;

  if (keys["KeyW"] || keys["ArrowUp"]) forward++;
  if (keys["KeyS"] || keys["ArrowDown"]) forward--;
  if (keys["KeyD"] || keys["ArrowRight"]) side++;
  if (keys["KeyA"] || keys["ArrowLeft"]) side--;

  const length = Math.hypot(forward, side);

  if (length > 0) {
    forward /= length;
    side /= length;

    const speed = keys["ShiftLeft"] ? 17 : 11;
    const angle = camera.alpha;

    const dx =
      Math.sin(angle) * forward +
      Math.cos(angle) * side;

    const dz =
      Math.cos(angle) * forward -
      Math.sin(angle) * side;

    playerRoot.position.x += dx * speed * dt;
    playerRoot.position.z += dz * speed * dt;

    playerRoot.rotation.y = Math.atan2(dx, dz);
  }

  playerRoot.position.x = Math.max(
    -MAP_SIZE,
    Math.min(MAP_SIZE, playerRoot.position.x)
  );

  playerRoot.position.z = Math.max(
    -MAP_SIZE,
    Math.min(MAP_SIZE, playerRoot.position.z)
  );

  if (keys["Space"] && onGround) {
    jumpSpeed = 8;
    onGround = false;
  }

  jumpSpeed -= 20 * dt;
  playerRoot.position.y += jumpSpeed * dt;

  if (playerRoot.position.y <= 0) {
    playerRoot.position.y = 0;
    jumpSpeed = 0;
    onGround = true;
  }

  // Camera follows player
  camera.target.copyFrom(
    playerRoot.position.add(
      new BABYLON.Vector3(0, 1.5, 0)
    )
  );
}

// ==========================================
// HUD
// ==========================================

function updateHUD() {
  ui("healthValue").textContent = Math.ceil(health);
  ui("shieldValue").textContent = Math.ceil(shield);

  ui("healthBar").style.width = health + "%";
  ui("shieldBar").style.width = shield + "%";

  ui("killCount").textContent = kills;

  const alive = bots.filter(b => b.alive).length + 1;
  ui("aliveCount").textContent = alive;
}

let messageTimer;

function showMessage(text) {
  let message = document.getElementById("gameMessage");

  if (!message) {
    message = document.createElement("div");
    message.id = "gameMessage";
    message.style.cssText = `
      position:absolute;
      top:32%;
      left:50%;
      transform:translateX(-50%);
      color:#00efff;
      font-family:Orbitron,sans-serif;
      font-size:16px;
      text-shadow:0 0 15px #00efff;
      pointer-events:none;
    `;
    document.getElementById("game").appendChild(message);
  }

  message.textContent = text;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => {
    message.textContent = "";
  }, 1800);
}

function drawMinimap() {
  const map = ui("miniMap");
  const ctx = map.getContext("2d");

  map.width = 180;
  map.height = 180;

  ctx.fillStyle = "#326d49";
  ctx.fillRect(0, 0, 180, 180);

  const scale = 180 / (MAP_SIZE * 2);

  bots.forEach(bot => {
    if (!bot.alive) return;

    ctx.fillStyle = "#ff655c";
    ctx.fillRect(
      90 + bot.mesh.position.x * scale - 2,
      90 + bot.mesh.position.z * scale - 2,
      5,
      5
    );
  });

  ctx.fillStyle = "#00f5ff";
  ctx.beginPath();
  ctx.arc(
    90 + playerRoot.position.x * scale,
    90 + playerRoot.position.z * scale,
    5,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

// ==========================================
// GAME MANAGEMENT
// ==========================================

function finishGame(win) {
  running = false;

  ui("gameHUD").classList.add("hidden");
  ui("endMenu").classList.remove("hidden");

  ui("endTitle").textContent =
    win ? "¡VICTORIA!" : "PARTIDA TERMINADA";

  ui("endDescription").textContent =
    "Rivales superados: " + kills;
}

function checkWinner() {
  if (bots.every(b => !b.alive)) {
    finishGame(true);
  }
}

function resetGame() {
  running = false;
  paused = false;

  ui("pauseMenu").classList.add("hidden");
  ui("endMenu").classList.add("hidden");
  ui("mainMenu").classList.add("hidden");
  ui("gameHUD").classList.add("hidden");

  if (scene) scene.dispose();

  bots = [];
  projectiles = [];
  pickups = [];

  health = 100;
  shield = 100;
  kills = 0;
  lastShot = 0;
  worldTime = 0;

  createScene();

  updateHUD();

  running = true;

  ui("gameHUD").classList.remove("hidden");
  showMessage("¡BIENVENIDO A BERMUDA!");
}

function togglePause() {
  if (!running) return;

  paused = !paused;

  ui("pauseMenu").classList.toggle("hidden", !paused);
}

// ==========================================
// CONTROLS
// ==========================================

window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "Escape") {
    if (running) togglePause();
  }

  if (e.code === "Space") {
    e.preventDefault();
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

canvas.addEventListener("pointerdown", e => {
  if (!running || paused) return;

  if (e.button === 0) shoot();
});

ui("shootButton").addEventListener("click", shoot);

ui("startButton").addEventListener("click", () => {
  resetGame();
});

ui("continueButton").addEventListener("click", togglePause);
ui("pauseButton").addEventListener("click", togglePause);
ui("restartButton").addEventListener("click", resetGame);
ui("againButton").addEventListener("click", resetGame);

// ==========================================
// MAIN LOOP
// ==========================================

createScene();

let loading = 0;
const loadingInterval = setInterval(() => {
  loading += 10;
  ui("loadingProgress").style.width = loading + "%";

  if (loading >= 100) {
    clearInterval(loadingInterval);
    ui("loadingScreen").classList.add("hidden");
  }
}, 80);

engine.runRenderLoop(() => {
  const dt = Math.min(engine.getDeltaTime() / 1000, 0.04);

  if (running && !paused) {
    worldTime += dt;

    updatePlayer(dt);
    updateBots(dt);
    updateProjectiles(dt);
    updatePickups();
    drawMinimap();
    updateHUD();
    checkWinner();
  }

  if (scene) scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});
