// Parametri griglia
const GRID_SIZE = 5;
const CUBE_SIZE = 1.0;
const CUBE_HEIGHT = 1.0;
const SHOW_TIME = 1500; // ms

let N = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE * 3 - 1)) + 1; // Fino a 3 cubi per cella
let cubeGrid = [];
let scene, camera, renderer;
let cubes = [];
let livello = 1;
let lives = 3;
let Flag = 1;

// Genera una griglia 5x5 dove ogni cella può avere 0 o più cubi impilati
function randomCubeGrid(n) {
  // Inizializza la griglia vuota
  const grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  let placed = 0;
  while (placed < n) {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    // Limita a massimo 4 cubi per cella
    if (grid[x][y] < 4) {
      grid[x][y]++;
      placed++;
    }
  }
  return grid;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xfafafa); // chiaro

  // Camera isometrica
  const container = document.getElementById('scene-container');
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;
  const d = 4;
  camera = new THREE.OrthographicCamera(
    -d * aspect, d * aspect, d, -d, 1, 100
  );
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);

  // Luce forte stile giorno
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(10, 20, 10);
  scene.add(dir);

    // Griglia base: solo linee orizzontali e verticali, senza diagonali
    const gridLines = [];
    const half = (GRID_SIZE - 1) / 2;
    // Linee verticali
    for (let x = 0; x <= GRID_SIZE; x++) {
      gridLines.push(
        new THREE.Vector3(x - half - 0.5, 0, -half - 0.5),
        new THREE.Vector3(x - half - 0.5, 0, half + 0.5)
      );
    }
    // Linee orizzontali
    for (let y = 0; y <= GRID_SIZE; y++) {
      gridLines.push(
        new THREE.Vector3(-half - 0.5, 0, y - half - 0.5),
        new THREE.Vector3(half + 0.5, 0, y - half - 0.5)
      );
    }
    const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridLines);
    //colore griglia
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0xa8a8a8, linewidth: 0.5 });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.position.y = -0.01;
    scene.add(grid);
}

function addCubes(grid) {
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let h = 0; h < grid[x][y]; h++) {
                const cubeGeo = new THREE.BoxGeometry(CUBE_SIZE * 0.98, CUBE_HEIGHT * 0.98, CUBE_SIZE * 0.98);
                // Materiali: [right, left, top, bottom, front, back]
                const materials = [
                  new THREE.MeshBasicMaterial({ color: 0x888888 }), // right (grigio scuro)
                  new THREE.MeshBasicMaterial({ color: 0xfafafa }), // left (grigio chiaro)
                  new THREE.MeshBasicMaterial({ color: 0xffffff }), // top (bianco)
                  new THREE.MeshBasicMaterial({ color: 0xfafafa }), // bottom (sfondo)
                  new THREE.MeshBasicMaterial({ color: 0xe9e9e9 }), // front (sfondo)
                  new THREE.MeshBasicMaterial({ color: 0xfafafa })  // back (sfondo)
                ];
                const cube = new THREE.Mesh(cubeGeo, materials);
        cube.position.set(
          x - (GRID_SIZE - 1) / 2,
          (CUBE_HEIGHT / 2) + h * CUBE_HEIGHT,
          y - (GRID_SIZE - 1) / 2
        );
        scene.add(cube);
        cubes.push(cube);
        // Bordo grigio scuro per ogni cubo
        const edgeGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(CUBE_SIZE *1, CUBE_HEIGHT *1, CUBE_SIZE *1));
        const edgeMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
        const wire = new THREE.LineSegments(edgeGeo, edgeMat);
        wire.position.copy(cube.position);
        scene.add(wire);
        cubes.push(wire);
      }
    }
  }
}

function removeCubes() {
  for (const cube of cubes) {
    scene.remove(cube);
  }
  cubes = [];
}

function animate() {
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function countVisibleCubes(grid) {
  let visibleCount = 0;
  
  // Funzione helper per verificare se esiste un cubo a (x, y, h)
  function hasCube(x, y, h) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE || h < 0) return false;
    return grid[x][y] > h;
  }
  
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let h = 0; h < grid[x][y]; h++) {
        // Un cubo (x, y, h) è visibile se per ogni k >= 1 NON vale:
        // x+k,y+k,h+k ||
        // (x+1+k,y+k,h+k && x+k,y+1+k,h+k &&
        //   (x+k,y+k,h+1+k || (x+1+k,y+k,h+1+k && x+k,y+1+k,h+1+k)))
        
        let isVisible = true;
        
        let hasDiag = false;
        let hasRight = false;
        let hasFront = false;
        let hasTop = false;
        let hasTopRight = false;
        let hasTopFront = false;
        
        for (let k = 0; k < GRID_SIZE; k++) {
          hasDiag ||= hasCube(x + 1 + k, y + 1 + k, h + 1 + k);
          hasRight ||= hasCube(x + 1 + k, y + k, h + k);
          hasFront ||= hasCube(x + k, y + 1 + k, h + k);
          hasTop ||= hasCube(x + k, y + k, h + 1 + k);
          hasTopRight ||= hasCube(x + 1 + k, y + k, h + 1 + k);
          hasTopFront ||= hasCube(x + k, y + 1 + k, h + 1 + k);
        }

        // Il cubo è NOT visibile se:
        // hasDiag OR (hasRight AND hasFront AND (hasTop OR (hasTopRight AND hasTopFront)))
        if (!(hasDiag || (hasRight && hasFront && (hasTop || (hasTopRight && hasTopFront))))) {
          console.log(`Cubo visibile in: ${x}, ${y}, ${h}`);
          visibleCount++;
        }
      }
    }
  }
  console.log('Visible cubes:', visibleCount);
  return visibleCount;
}

function startGame(livello) {
  // Genera un numero casuale di cubi totali, ma la risposta è quanti sono visibili
  // Progressione più lineare e incrementi piccoli
  console.log(`------ Livello ${livello} ------`);
  updateLivesCounter();
  let minCubes = 2 + livello;
  let maxCubes = Math.min(GRID_SIZE * GRID_SIZE, minCubes + 2 + Math.floor(livello/2));
  if (livello > 7 && livello%2 && Math.random() < 0.5) {
    minCubes = 4;
    maxCubes = 6;
    flag = 0;
  }
  else {
    flag = 1;
  }
  let totalCubes = Math.floor(Math.random() * (maxCubes - minCubes + 1)) + minCubes;
  cubeGrid = randomCubeGrid(totalCubes);
  N = countVisibleCubes(cubeGrid);
  addCubes(cubeGrid);
  // Animazione movimento scene-container
  const sceneDiv = document.getElementById('scene-container');
  if (sceneDiv) {
    sceneDiv.classList.remove('move-right');
    // Imposta la durata in base a SHOW_TIME
    sceneDiv.style.setProperty('--show-time', (SHOW_TIME + livello * 100) + 'ms');
    void sceneDiv.offsetWidth; // force reflow
    sceneDiv.classList.add('move-right');
  }
  setTimeout(() => {
    if (sceneDiv) sceneDiv.classList.remove('move-right');
    removeCubes();
    document.getElementById('input-section').style.display = 'block';
    const input = document.getElementById('user-answer');
    input.value = '';
    if (input) {
      input.focus();
      // Su mobile, seleziona tutto il contenuto e apri la tastiera
      setTimeout(() => {
        input.select();
        input.setSelectionRange(0, 99);
      }, 100);
    }
  }, SHOW_TIME * flag + livello * 85);
}

function updateLivesCounter() {
  const el = document.getElementById('lives-counter');
  if (!el) return;
  let hearts = '';
  for (let i = 0; i < lives; i++) hearts += '❤️';
  el.textContent = hearts;
}

window.onload = function () {
  const container = document.getElementById('scene-container');
  renderer = new THREE.WebGLRenderer({ antialias: true });
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);
  setupScene();
  animate();
  startGame(livello);

  // Gestione resize
  window.addEventListener('resize', function() {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    renderer.setSize(newWidth, newHeight);
    const aspect = newWidth / newHeight;
    const d = 4;
    camera.left = -d * aspect;
    camera.right = d * aspect;
    camera.top = d;
    camera.bottom = -d;
    camera.updateProjectionMatrix();
  });

  const input = document.getElementById('user-answer');
  const submitBtn = document.getElementById('submit-btn');
        submitBtn.onclick = function () {
          if (submitBtn.disabled) return;
          submitBtn.disabled = true;
          const val = parseInt(input.value, 10);
          const result = document.getElementById('result');
          if (val === N) {
            result.textContent = 'Corretto!';
            result.style.color = '#4caf50';
            livello++;
          } else {
          result.textContent = `Sbagliato! Erano ${N} cubi.`;
          result.style.color = '#f44336';
          lives--;
          updateLivesCounter();
          if (lives <= 0) {
            result.innerHTML += `<br>Game Over! Hai raggiunto il livello ${livello}.`;
            livello = 1;
            lives = 3;
          }
            // Stampa posizione cubi in console
            console.log('Griglia cubi (grid[x][y] = altezza):');
            for (let x = 0; x < GRID_SIZE; x++) {
              for (let y = 0; y < GRID_SIZE; y++) {
                if (cubeGrid[x][y] > 0) {
                  console.log(`  Cella (${x}, ${y}): ${cubeGrid[x][y]} cubi impilati`);
                }
              }
            }
          }
          addCubes(cubeGrid);
          setTimeout(() => {
            document.getElementById('input-section').style.display = 'none';
            removeCubes();
            result.textContent = `Livello: ${livello}`;
            result.style.color = '#000';
            startGame(livello);
            submitBtn.disabled = false;
          }, 2000);
  };

  // Gestione tastiera
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      submitBtn.click();
    } else if (e.key === 'ArrowUp') {
      let val = parseInt(input.value, 10) || 0;
      if (val < 25) input.value = val + 1;
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      let val = parseInt(input.value, 10) || 0;
      if (val > 1) input.value = val - 1;
      e.preventDefault();
    }
  });
};
