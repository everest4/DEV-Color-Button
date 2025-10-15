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
      (diffRG > 20 || diffGB > 20 || diffBR > 20) && luminance > 70 && luminance < 200 
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

function removeLast(listElement) {
  if (listElement.lastChild) listElement.removeChild(listElement.lastChild);
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

    if (colorList.firstChild) {
      colorList.removeChild(colorList.firstChild);
    }

    const prevColor = history[history.length - 1];
    if (prevColor) {
      applyColor(prevColor);
    } else {
      button.style.backgroundColor = '#ccc';
      button.style.color = '#000';
    }

    button.textContent = history.length;

    redoList.innerHTML = '';

    [...redoStack].slice().reverse().forEach(color => {
      const li = document.createElement('li');
      li.textContent = color.hex;
      li.style.backgroundColor = color.rgb;
      li.style.color = getComplementaryColor(color.r, color.g, color.b);
      redoList.appendChild(li); 
    });
  }
});


redoBtn.addEventListener('click', () => {
  if (redoStack.length > 0) {
    const redoneColor = redoStack.pop();
    history.push(redoneColor);

    applyColor(redoneColor);
    button.textContent = history.length;

    addToList(colorList, redoneColor);

    redoList.innerHTML = '';
    [...redoStack].slice().reverse().forEach(color => {
      const li = document.createElement('li');
      li.textContent = color.hex;
      li.style.backgroundColor = color.rgb;
      li.style.color = getComplementaryColor(color.r, color.g, color.b);
      redoList.appendChild(li);
    });
  }
});


let touchStartX = 0;
let touchEndX = 0;

function handleSwipe(li, fromList, toList, fromStack, toStack) {
  const diff = touchEndX - touchStartX;

  if (Math.abs(diff) > 60) {

    const colorHex = li.textContent.trim();
    const colorIndex = fromStack.findIndex(c => c.hex === colorHex);
    if (colorIndex !== -1) {
      const [movedColor] = fromStack.splice(colorIndex, 1);
      toStack.push(movedColor);

      li.remove();

      fromList.innerHTML = '';
      fromStack.forEach(color => addToList(fromList, color));
      toList.innerHTML = '';
      toStack.forEach(color => addToList(toList, color));
    }
  }
}

function addSwipeEvents(li, fromList, toList, fromStack, toStack) {
  li.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
  });

  li.addEventListener('touchend', e => {
    touchEndX = e.changedTouches[0].clientX;
    handleSwipe(li, fromList, toList, fromStack, toStack);
  });
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
    addSwipeEvents(li, colorList, redoList, history, redoStack);
  } else if (listElement === redoList) {
    addSwipeEvents(li, redoList, colorList, redoStack, history);
  }

  listElement.prepend(li);
}
