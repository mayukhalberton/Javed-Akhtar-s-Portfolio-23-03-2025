// Highlight nav link based on current URL
const currentPath = window.location.pathname.split('/').pop(); // Get current file name
const navLinks = document.querySelectorAll('.nav-links ul li a');

navLinks.forEach(link => {
  const href = link.getAttribute('href');

  if (href === currentPath) {
    link.classList.add('active');
  }

  // Optional: remove 'active' from others if needed on click
  link.addEventListener('click', (e) => {
    navLinks.forEach(l => l.classList.remove('active'));
    e.currentTarget.classList.add('active');
  });
});



// working code for displaying work-items with click event to open image viewer
const selectedWorksContainer = document.querySelector('.slected-works-container');
const viewer = document.getElementById('imageViewer');
const viewerImg = document.getElementById('viewerImage');

// Gemini Code
let holdTimeout;
const holdDelay = 50;

let artworks = [];
let currentIndex = 0;

fetch('assets/images/selected-works/work-titles.json')
  .then(response => response.json())
  .then(data => {
    artworks = data;

    data.forEach((item, index) => {
      const workItem = document.createElement('div');
      workItem.classList.add('work-item');

      const img = document.createElement('img');
      img.src = `assets/images/selected-works/low-res/${item.sl}.jpg`;
      img.alt = item.title;
      img.loading = 'lazy';

      const titleDiv = document.createElement('div');
      titleDiv.classList.add('work-title', 'fs-small', 'fw-extra-bold');
      titleDiv.innerHTML = `${item.title},<br>${item.size}`;

      workItem.appendChild(img);
      workItem.appendChild(titleDiv);
      selectedWorksContainer.appendChild(workItem);

      // Attach click listener here 👇
      workItem.addEventListener('click', () => {
        openImageViewer(index);
      });
    });
  })
  .catch(error => {
    console.error("Error loading work-titles.json or images:", error);
  });

// Image viewer functions
function openImageViewer(index) {
  currentIndex = index;
  const item = artworks[currentIndex];
  viewerImg.src = `assets/images/selected-works/full-res/${item.sl}.jpg`;
  const titleElement = document.getElementById('imageTitle');
  titleElement.textContent = item.title; // Dynamically set the title
  viewer.classList.remove('hidden');
}

function closeViewer() {
  viewer.classList.add('hidden');
  viewerImg.src = '';
  resetImageTransform();
}

function nextImage() {
  currentIndex = (currentIndex + 1) % artworks.length;
  openImageViewer(currentIndex);
}

function prevImage() {
  currentIndex = (currentIndex - 1 + artworks.length) % artworks.length;
  openImageViewer(currentIndex);
}

// --- Revised Dragging and Zooming Logic ---

// Add necessary variables
let isMouseDown = false;  // Flag if mouse button is currently pressed down on the image
let isDragging = false;   // Flag if dragging is active (after hold delay)
let startX, startY;       // Mouse position when mousedown occurred
let initialTranslateX = 0, initialTranslateY = 0; // Image translation when mousedown occurred
let translateX = 0, translateY = 0; // Current image translation
let scale = 1;            // Initial zoom scale
const fullscreenBtn = document.getElementById('fullscreenBtn'); // Assume you have this button

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        viewer.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        viewer.classList.add('fullscreen');
        resetImageTransform(); // Reset zoom/pan on entering fullscreen
        viewerImg.style.cursor = 'grab'; // Set initial cursor for fullscreen
        fullscreenBtn.textContent = '✕'; // Change button to Exit icon
    } else {
        viewer.classList.remove('fullscreen');
        resetImageTransform(); // Reset zoom/pan on exiting fullscreen
        viewerImg.style.cursor = 'default'; // Reset cursor
        fullscreenBtn.textContent = '⛶'; // Change button to Fullscreen icon
    }
});

function resetImageTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    initialTranslateX = 0; // Also reset initial translation state
    initialTranslateY = 0;
    viewerImg.style.transform = 'scale(1) translate(0px, 0px)';
    // Set cursor based on fullscreen state
    viewerImg.style.cursor = viewer.classList.contains('fullscreen') ? 'grab' : 'default';
}

// Zoom Listener (Wheel event) - Seems okay, ensure it uses updated translateX/Y
viewerImg.addEventListener('wheel', (e) => {
    if (!viewer.classList.contains('fullscreen')) return;

    e.preventDefault();

    const rect = viewerImg.getBoundingClientRect();

    // Calculate mouse position relative to the image element
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calculate the point on the image that the mouse is pointing at (considering current scale and translation)
    const imageX = (mouseX - translateX) / scale;
    const imageY = (mouseY - translateY) / scale;

    // Calculate new scale
    const zoomFactor = 1.1;
    const oldScale = scale;
    if (e.deltaY < 0) { // Zoom in
        scale *= zoomFactor;
    } else { // Zoom out
        scale /= zoomFactor;
        scale = Math.max(1, scale); // Prevent zooming out smaller than original
    }
    // Clamp scale if needed (e.g., scale = Math.min(Math.max(scale, 0.5), 5); )


    // Adjust translation so the point under the mouse stays in the same place
    translateX = mouseX - imageX * scale;
    translateY = mouseY - imageY * scale;

    // Boundary checks (optional - prevent panning too far)
    const maxTranslateX = (rect.width * scale - rect.width) / 2;
    const maxTranslateY = (rect.height * scale - rect.height) / 2;
    translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
    translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));


    viewerImg.style.transformOrigin = 'top left'; // Make sure transform origin is consistent
    viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
});


// --- Revised Drag Listeners ---

viewerImg.addEventListener('mousedown', (e) => {
    if (!viewer.classList.contains('fullscreen')) return;
    e.preventDefault(); // Prevent default image drag behavior

    isMouseDown = true;
    isDragging = false; // Not dragging yet
    startX = e.pageX;   // Record mouse position relative to the page
    startY = e.pageY;
    initialTranslateX = translateX; // Record current image translation
    initialTranslateY = translateY;

    // Clear any existing timeout just in case
    clearTimeout(holdTimeout);

    // Set the timeout to enable dragging
    holdTimeout = setTimeout(() => {
        if (isMouseDown) { // Only set dragging if mouse is still down
            isDragging = true;
            viewerImg.style.cursor = 'grabbing'; // Change cursor when dragging starts
        }
    }, holdDelay);
});

document.addEventListener('mousemove', (e) => {
    // Only move if dragging is active (hold delay passed AND mouse is down)
    if (!isDragging || !isMouseDown || !viewer.classList.contains('fullscreen')) return;

    e.preventDefault(); // Good practice during drag

    const currentX = e.pageX;
    const currentY = e.pageY;

    // Calculate the distance moved from the start position
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // Calculate the new translation based on initial translation + delta
    translateX = initialTranslateX + deltaX;
    translateY = initialTranslateY + deltaY;

    // Apply the transform
    viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
});

document.addEventListener('mouseup', (e) => {
    if (!viewer.classList.contains('fullscreen')) return;

    // Clear the hold timer regardless of whether it fired
    clearTimeout(holdTimeout);

    if (isMouseDown) {
        isMouseDown = false;
        isDragging = false; // Stop dragging
        viewerImg.style.cursor = 'grab'; // Revert cursor back to grab for fullscreen
    }
});

viewerImg.addEventListener('mouseleave', () => {
    // If the mouse leaves the image WHILE being held down, cancel the drag
    if (isMouseDown) {
        clearTimeout(holdTimeout);
        isMouseDown = false;
        isDragging = false;
        viewerImg.style.cursor = 'grab'; // Revert cursor
    }
});

// Controls (Keep existing code)
// ... (your existing button and keydown listeners) ...

// Click outside to close (Keep existing code)
// ... (your existing viewer click listener) ...

// Controls
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (viewer.classList.contains('hidden')) return;

  switch (e.key) {
    case 'Escape':
      closeViewer();
      break;
    case 'ArrowRight':
      nextImage();
      break;
    case 'ArrowLeft':
      prevImage();
      break;
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
  }
});



viewer.addEventListener('click', (e) => {
  if (!viewer.classList.contains('fullscreen') && e.target === viewer) {
    closeViewer();
  }
});