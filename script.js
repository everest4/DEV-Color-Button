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

    if (
      (diffRG > 20 || diffGB > 20 || diffBR > 20) && 
      luminance > 70 && luminance < 200 
    ) break;
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

function addToList(listElement, color, index) {
  const li = document.createElement('li');
  li.textContent = `${index}. ${color.hex}`;
  li.style.backgroundColor = color.rgb;
  li.style.color = getComplementaryColor(color.r, color.g, color.b);
  li.draggable = true;

  li.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', null); 
    li.classList.add('dragging');
  });

  li.addEventListener('dragend', () => {
    li.classList.remove('dragging');
    updateIndexes(listElement);
  });

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
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function updateIndexes(listElement) {
  [...listElement.children].forEach((li, index) => {
    const text = li.textContent.split(' ').pop(); 
    li.textContent = `${index + 1}. ${text}`;
  });
}

function removeLast(listElement) {
  if (listElement.lastChild) listElement.removeChild(listElement.lastChild);
}

button.addEventListener('click', () => {
  const color = getNiceColor();
  history.push(color);
  redoStack = [];
  redoList.innerHTML = '';

  applyColor(color);
  addToList(colorList, color, history.length);
  button.textContent = history.length;
});

undoBtn.addEventListener('click', () => {
  if (history.length > 0) {
    const lastColor = history.pop();
    redoStack.push(lastColor);
    removeLast(colorList);

    const prevColor = history[history.length - 1];
    if (prevColor) {
      applyColor(prevColor);
      button.textContent = history.length;
    } else {
      button.style.backgroundColor = '#ccc';
      button.style.color = '#000';
      button.textContent = 0;
    }

    redoList.innerHTML = '';
    redoStack.forEach((color, i) => addToList(redoList, color, i + 1));
  }
});

redoBtn.addEventListener('click', () => {
  if (redoStack.length > 0) {
    const color = redoStack.pop();
    history.push(color);

    applyColor(color);
    button.textContent = history.length;

    addToList(colorList, color, history.length);

    redoList.innerHTML = '';
    redoStack.forEach((color, i) => addToList(redoList, color, i + 1));
  }
});
