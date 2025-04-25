// working code for displaying work-items with click event to open image viewer
const selectedWorksContainer = document.querySelector('.slected-works-container');
const viewer = document.getElementById('imageViewer');
const viewerImg = document.getElementById('viewerImage');
const imageTitle = document.getElementById('imageTitle'); // Get title element
const fullscreenBtn = document.getElementById('fullscreenBtn');

// Gemini Code
let holdTimeout;
const holdDelay = 50; // Milliseconds to wait before drag starts

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
      // Corrected template literal and added span for size
      titleDiv.innerHTML = `${item.title},<br><br><span class="work-size fw-regular">${item.size}</span>`;

      workItem.appendChild(img);
      workItem.appendChild(titleDiv);
      selectedWorksContainer.appendChild(workItem);

      // Attach click listener here
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
  // Use the correct title element
  imageTitle.innerHTML = `${item.title},<br><span class="work-size fw-regular">${item.size}</span>`;
  viewer.classList.remove('hidden');
  resetImageTransform(); // Reset transform when opening a new image
}

function closeViewer() {
  viewer.classList.add('hidden');
  viewerImg.src = ''; // Clear image src
  // Exit fullscreen if active when closing viewer
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  resetImageTransform(); // Ensure reset happens
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

// State variables for zoom/pan
let isMouseDown = false;
let isDragging = false;
let startX, startY;
let initialTranslateX = 0, initialTranslateY = 0;
let translateX = 0, translateY = 0;
let scale = 1;
const maxScale = 2.1; // <<< Set Maximum Zoom Level
const zoomFactor = 1.07; // How much to zoom per wheel step

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    // Request fullscreen on the viewer element
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
  if (document.fullscreenElement === viewer) { // Check if *our* element is fullscreen
    viewer.classList.add('fullscreen');
    resetImageTransform(); // Reset zoom/pan on entering fullscreen
    viewerImg.style.cursor = 'grab'; // Set initial cursor for fullscreen
    fullscreenBtn.textContent = '✕'; // Change button to Exit icon (or similar)
  } else {
    // Check if we *were* fullscreen before exiting
    if (viewer.classList.contains('fullscreen')) {
      viewer.classList.remove('fullscreen');
      resetImageTransform(); // Reset zoom/pan on exiting fullscreen
      viewerImg.style.cursor = 'default'; // Reset cursor
      fullscreenBtn.textContent = '⛶'; // Change button back to Fullscreen icon
    }
  }
});

function resetImageTransform() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  initialTranslateX = 0; // Reset initial state used for panning
  initialTranslateY = 0;
  viewerImg.style.transformOrigin = 'top left'; // Ensure origin is consistent
  viewerImg.style.transform = 'scale(1) translate(0px, 0px)';
  // Set cursor based on fullscreen state
  viewerImg.style.cursor = viewer.classList.contains('fullscreen') ? 'grab' : 'default';
}

// Apply transform and enforce boundaries
function applyTransform() {
  // Only apply boundaries if scaled beyond 1
  if (scale > 1 && viewer.classList.contains('fullscreen')) {
    const rect = viewerImg.getBoundingClientRect();
    const viewerWidth = viewer.clientWidth;
    const viewerHeight = viewer.clientHeight;

    // Calculate the dimensions of the image *content* based on its current rect and scale
    // BoundingClientRect width/height *include* the scaling effect.
    const scaledWidth = rect.width;
    const scaledHeight = rect.height;

    // Calculate maximum and minimum allowed translation
    // Max X (maxX): The left edge (translateX) cannot be > 0. So maxX = 0.
    // Min X (minX): The right edge (translateX + scaledWidth) cannot be < viewerWidth.
    // So, translateX >= viewerWidth - scaledWidth. minX = viewerWidth - scaledWidth.
    // Max Y (maxY): The top edge (translateY) cannot be > 0. So maxY = 0.
    // Min Y (minY): The bottom edge (translateY + scaledHeight) cannot be < viewerHeight.
    // So, translateY >= viewerHeight - scaledHeight. minY = viewerHeight - scaledHeight.

    // Ensure min is not greater than max (can happen if image is smaller than viewport)
    const minX = Math.min(0, viewerWidth - scaledWidth);
    const maxX = 0;
    const minY = Math.min(0, viewerHeight - scaledHeight);
    const maxY = 0;

    // Clamp the current translation values
    translateX = Math.max(minX, Math.min(maxX, translateX));
    translateY = Math.max(minY, Math.min(maxY, translateY));

  } else {
    // If scale is 1 or not fullscreen, force reset translation
    translateX = 0;
    translateY = 0;
  }

  viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
}


// Zoom Listener (Wheel event) - FIXED
viewerImg.addEventListener('wheel', (e) => {
  if (!viewer.classList.contains('fullscreen')) return;
  e.preventDefault(); // Prevent page scrolling

  const rect = viewerImg.getBoundingClientRect();

  // Mouse position relative to the viewport
  const mouseX = e.clientX;
  const mouseY = e.clientY;

  // Calculate mouse position relative to the image element's top-left corner
  const elementMouseX = mouseX - rect.left;
  const elementMouseY = mouseY - rect.top;

  // Calculate the point on the *unscaled* image content that the mouse is pointing at
  const imageContentX = (elementMouseX - translateX) / scale;
  const imageContentY = (elementMouseY - translateY) / scale;

  // Calculate new scale based on scroll direction
  const oldScale = scale;
  if (e.deltaY < 0) { // Zoom in
    scale *= zoomFactor;
  } else { // Zoom out
    scale /= zoomFactor;
  }

  // Apply scale limits (min=1, max=maxScale)
  scale = Math.max(1, Math.min(scale, maxScale)); // <<< THIS LINE APPLIES THE LIMIT

  // If scale didn't change (due to limits), exit
  if (scale === oldScale) return;

  // Calculate the new translation needed to keep the imageContentX/Y point
  // under the mouse cursor (elementMouseX/Y) at the new scale.
  // newTranslateX = elementMouseX - imageContentX * newScale
  // newTranslateY = elementMouseY - imageContentY * newScale
  translateX = elementMouseX - imageContentX * scale;
  translateY = elementMouseY - imageContentY * scale;

  // Apply the transform and boundary checks
  applyTransform();
});


// --- Drag Listeners (Panning) ---

viewerImg.addEventListener('mousedown', (e) => {
  if (!viewer.classList.contains('fullscreen') || scale <= 1) return; // Only allow pan if fullscreen and zoomed
  e.preventDefault(); // Prevent default image drag behavior

  isMouseDown = true;
  isDragging = false; // Not dragging yet
  startX = e.pageX; // Record mouse position relative to the page
  startY = e.pageY;
  initialTranslateX = translateX; // Record current image translation
  initialTranslateY = translateY;

  clearTimeout(holdTimeout);
  holdTimeout = setTimeout(() => {
    if (isMouseDown) { // Only set dragging if mouse is still down
      isDragging = true;
      viewerImg.style.cursor = 'grabbing'; // Change cursor when dragging starts
    }
  }, holdDelay);
});

// Use document event listeners for mousemove/mouseup to catch events outside the image
document.addEventListener('mousemove', (e) => {
  // Only move if dragging is active (hold delay passed AND mouse is down AND fullscreen AND zoomed)
  if (!isDragging || !isMouseDown || !viewer.classList.contains('fullscreen') || scale <= 1) return;

  e.preventDefault(); // Good practice during drag

  const currentX = e.pageX;
  const currentY = e.pageY;

  // Calculate the distance moved from the start position
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  // Calculate the new *potential* translation
  translateX = initialTranslateX + deltaX;
  translateY = initialTranslateY + deltaY;

  // Apply the transform with boundary checks
  applyTransform();
});

document.addEventListener('mouseup', (e) => {
  if (!viewer.classList.contains('fullscreen')) return;

  clearTimeout(holdTimeout); // Clear the hold timer

  if (isMouseDown) {
    isMouseDown = false;
    // No need to prevent click if not dragging, but reset cursor
    viewerImg.style.cursor = scale > 1 ? 'grab' : 'default'; // Revert cursor based on zoom
  }
  isDragging = false; // Always stop dragging on mouseup
});

// Handle mouse leaving the window while dragging
document.addEventListener('mouseleave', (e) => {
  // This event listener on document isn't standard for mouseleave detection when mouse is down.
  // A better approach is handled by the mouseup on document.
  // If mouseup happens outside the window, the 'mouseup' on document *will* fire.
});

// Optional: Reset cursor if mouse leaves image while NOT dragging
viewerImg.addEventListener('mouseleave', () => {
  if (!isDragging && viewer.classList.contains('fullscreen')) {
    viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
  }
});
// Optional: Set cursor back to grab when entering image if appropriate
viewerImg.addEventListener('mouseenter', () => {
  if (!isMouseDown && viewer.classList.contains('fullscreen')) {
    viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
  }
});


// --- Controls (No changes needed here from your original code) ---
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (viewer.classList.contains('hidden')) return;

  switch (e.key) {
    case 'Escape':
      // If fullscreen, exit fullscreen first, otherwise close viewer
      if (document.fullscreenElement === viewer) {
        document.exitFullscreen();
      } else {
        closeViewer();
      }
      break;
    case 'ArrowRight':
      nextImage();
      break;
    case 'ArrowLeft':
      prevImage();
      break;
    case 'f': // Allow 'f' for fullscreen toggle
    case 'F':
      toggleFullscreen();
      break;
  }
});

// Click outside image *in non-fullscreen mode* to close
viewer.addEventListener('click', (e) => {
  // Only close if click is on the backdrop itself (viewer) and not fullscreen
  if (!viewer.classList.contains('fullscreen') && e.target === viewer) {
    closeViewer();
  }
});