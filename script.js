const button = document.getElementById('colorButton');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const colorList = document.getElementById('colorList');
const redoList = document.getElementById('redoList');

let history = [];
let redoStack = [];

function getNiceColor() {
  let r, g, b;

  do {
    const randomChannel = () => Math.floor(Math.random() * (200 - 60) + 60);
    r = randomChannel();
    g = randomChannel();
    b = randomChannel();

    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const diffRG = Math.abs(r - g);
    const diffGB = Math.abs(g - b);
    const diffBR = Math.abs(b - r);

    if ((diffRG > 20 || diffGB > 20 || diffBR > 20) && luminance > 70 && luminance < 200)
      break;
  } while (true);

  return { r, g, b, rgb: `rgb(${r}, ${g}, ${b})`, hex: rgbToHex(r, g, b) };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function getComplementaryColor(r, g, b) {
  return `rgb(${255 - r}, ${255 - g}, ${255 - b})`;
}

function applyColor(color) {
  button.style.backgroundColor = color.rgb;
  button.style.color = getComplementaryColor(color.r, color.g, color.b);
}

function addToList(listElement, color) {
  const li = document.createElement('li');
  li.textContent = color.hex;
  li.style.backgroundColor = color.rgb;
  li.style.color = getComplementaryColor(color.r, color.g, color.b);
  li.draggable = true;

  li.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', null);
    li.classList.add('dragging');
  });
  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
  });

  if (listElement === colorList) {
    addDragOutEvents(li, colorList, redoList, history, redoStack);
  } else if (listElement === redoList) {
    addDragOutEvents(li, redoList, colorList, redoStack, history);
  }

  listElement.prepend(li);
}

[colorList, redoList].forEach(list => {
  list.addEventListener('dragover', e => {
    e.preventDefault();
    const dragging = document.querySelector('.dragging');
    const afterElement = getDragAfterElement(list, e.clientY);
    if (!afterElement) list.appendChild(dragging);
    else list.insertBefore(dragging, afterElement);
  });
});

function getDragAfterElement(list, y) {
  const draggableElements = [...list.querySelectorAll('li:not(.dragging)')];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset, element: child };
      else return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

button.addEventListener('click', () => {
  const color = getNiceColor();
  history.push(color);
  redoStack = [];
  redoList.innerHTML = '';

  applyColor(color);
  addToList(colorList, color);
  button.textContent = history.length;
});

undoBtn.addEventListener('click', () => {
  if (history.length > 0) {
    const undoneColor = history.pop();
    redoStack.push(undoneColor);

    if (colorList.firstChild) colorList.removeChild(colorList.firstChild);

    const prevColor = history[history.length - 1];
    if (prevColor) applyColor(prevColor);
    else {
      button.style.backgroundColor = '#ccc';
      button.style.color = '#000';
    }

    button.textContent = history.length;
    refreshList(redoList, redoStack);
  }
});

redoBtn.addEventListener('click', () => {
  if (redoStack.length > 0) {
    const redoneColor = redoStack.pop();
    history.push(redoneColor);

    applyColor(redoneColor);
    button.textContent = history.length;

    addToList(colorList, redoneColor);
    refreshList(redoList, redoStack);
  }
});

function refreshList(list, stack) {
  list.innerHTML = '';
  [...stack].slice().reverse().forEach(color => addToList(list, color));
}

function addDragOutEvents(li, fromList, toList, fromStack, toStack) {
  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  li.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    isDragging = true;
    li.classList.add('dragging-live');
  });

  li.addEventListener('touchmove', e => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX;
    const diffX = currentX - startX;
    li.style.transform = `translateX(${diffX}px)`;
    li.style.opacity = `${Math.max(1 - Math.abs(diffX) / 150, 0.4)}`;
  });

  li.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diffX = currentX - startX;
    li.classList.remove('dragging-live');

    const moveRight = diffX > 100;
    const moveLeft = diffX < -100;

    if (moveRight || moveLeft) {
      const colorHex = li.textContent.trim();
      const colorIndex = fromStack.findIndex(c => c.hex === colorHex);
      if (colorIndex !== -1) {
        const [movedColor] = fromStack.splice(colorIndex, 1);
        toStack.push(movedColor);

        li.classList.add(moveRight ? 'animate-leave-right' : 'animate-leave-left');

        li.addEventListener('animationend', () => {
          li.remove();
          fromList.innerHTML = '';
          fromStack.forEach(color => addToList(fromList, color));
          toList.innerHTML = '';
          toStack.forEach(color => addToList(toList, color));
        }, { once: true });
      }
    } else {
      li.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
      li.style.transform = 'translateX(0)';
      li.style.opacity = '1';
      setTimeout(() => {
        li.style.transition = '';
      }, 200);
    }
  });
}

let edgeStartX = 0;
let edgeEndX = 0;

const leftPanel = document.querySelector('.color-history');
const rightPanel = document.querySelector('.redo-history');

document.addEventListener('touchstart', e => {
  edgeStartX = e.touches[0].clientX;
});

document.addEventListener('touchend', e => {
  edgeEndX = e.changedTouches[0].clientX;
  const diff = edgeEndX - edgeStartX;
  const screenWidth = window.innerWidth;

  if (edgeStartX < 30 && diff > 60) {
    leftPanel.classList.add('show');
    rightPanel.classList.remove('show');
  }

  if (edgeStartX > screenWidth - 30 && diff < -60) {
    rightPanel.classList.add('show');
    leftPanel.classList.remove('show');
  }

  if (Math.abs(diff) > 60 && edgeStartX > 50 && edgeStartX < screenWidth - 50) {
    leftPanel.classList.remove('show');
    rightPanel.classList.remove('show');
  }
});
