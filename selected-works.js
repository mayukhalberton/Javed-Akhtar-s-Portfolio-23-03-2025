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
      titleDiv.innerHTML = `${item.title},<br><br><span class="work-size fw-regular">${item.size}</span>`;

      workItem.appendChild(img);
      workItem.appendChild(titleDiv);
      selectedWorksContainer.appendChild(workItem);

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
  imageTitle.innerHTML = `${item.title},<br><span class="work-size fw-regular">${item.size}</span>`;
  viewer.classList.remove('hidden');
  resetImageTransform();
  // Reset touch state when opening
  resetTouchState();
}

function closeViewer() {
  viewer.classList.add('hidden');
  viewerImg.src = '';
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  resetImageTransform();
  resetTouchState(); // Reset touch state on close
}

function nextImage() {
  currentIndex = (currentIndex + 1) % artworks.length;
  openImageViewer(currentIndex);
}

function prevImage() {
  currentIndex = (currentIndex - 1 + artworks.length) % artworks.length;
  openImageViewer(currentIndex);
}

// --- State variables for zoom/pan (Mouse & Touch) ---
let isMouseDown = false; // For mouse dragging
let isTouching = false; // General flag for active touch
let isDragging = false; // For mouse or single-touch panning
let isPinching = false; // For pinch zoom
let startX, startY; // For mouse drag OR single touch pan/swipe start
let initialTranslateX = 0, initialTranslateY = 0; // Pan start position
let translateX = 0, translateY = 0; // Current translation
let scale = 1; // Current scale
const maxScale = 5; // <<< Adjusted Max Zoom Level for touch
const zoomFactor = 1.07; // For wheel zoom

// --- Touch specific state ---
let touchStartX = null;
let touchStartY = null;
let initialPinchDistance = null;
let initialScale = 1; // Store scale at pinch start
const swipeThreshold = 50; // Min horizontal distance for a swipe
const verticalSwipeThreshold = 75; // Max vertical distance for a swipe

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
  if (document.fullscreenElement === viewer) {
    viewer.classList.add('fullscreen');
    resetImageTransform();
    viewerImg.style.cursor = 'grab';
    fullscreenBtn.textContent = '✕';
  } else {
    if (viewer.classList.contains('fullscreen')) {
      viewer.classList.remove('fullscreen');
      resetImageTransform();
      viewerImg.style.cursor = 'default';
      fullscreenBtn.textContent = '⛶';
    }
  }
  // Reset touch state on fullscreen change
  resetTouchState();
});

function resetImageTransform() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  initialTranslateX = 0;
  initialTranslateY = 0;
  viewerImg.style.transformOrigin = 'top left';
  viewerImg.style.transform = 'scale(1) translate(0px, 0px)';
  viewerImg.style.cursor = viewer.classList.contains('fullscreen') ? 'grab' : 'default';
}

// Reset touch-specific state variables
function resetTouchState() {
    isTouching = false;
    isDragging = false;
    isPinching = false;
    touchStartX = null;
    touchStartY = null;
    initialPinchDistance = null;
    initialScale = scale; // Reset initial scale for pinch
}

// Apply transform and enforce boundaries
function applyTransform() {
  if (scale > 1 && viewer.classList.contains('fullscreen')) {
    const rect = viewerImg.getBoundingClientRect();
    const viewerWidth = viewer.clientWidth;
    const viewerHeight = viewer.clientHeight;
    const scaledWidth = rect.width;
    const scaledHeight = rect.height;

    const minX = Math.min(0, viewerWidth - scaledWidth);
    const maxX = 0;
    const minY = Math.min(0, viewerHeight - scaledHeight);
    const maxY = 0;

    translateX = Math.max(minX, Math.min(maxX, translateX));
    translateY = Math.max(minY, Math.min(maxY, translateY));

  } else {
    // Prevent panning if not zoomed or not fullscreen
    translateX = 0;
    translateY = 0;
    // If scale somehow became less than 1 (e.g., during pinch), reset it
    if (scale < 1) scale = 1;
  }

  viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
}


// === MOUSE Event Listeners (Keep Existing) ===

// Zoom Listener (Wheel event)
viewerImg.addEventListener('wheel', (e) => {
  // Prevent wheel zoom if a touch interaction is happening
  if (isTouching || !viewer.classList.contains('fullscreen')) return;
  e.preventDefault();

  const rect = viewerImg.getBoundingClientRect();
  const mouseX = e.clientX; // Use clientX for consistency with touch
  const mouseY = e.clientY;
  const elementMouseX = mouseX - rect.left;
  const elementMouseY = mouseY - rect.top;
  const imageContentX = (elementMouseX - translateX) / scale;
  const imageContentY = (elementMouseY - translateY) / scale;

  const oldScale = scale;
  if (e.deltaY < 0) { scale *= zoomFactor; }
  else { scale /= zoomFactor; }
  scale = Math.max(1, Math.min(scale, maxScale));

  if (scale === oldScale) return;

  translateX = elementMouseX - imageContentX * scale;
  translateY = elementMouseY - imageContentY * scale;
  applyTransform();
});

// Drag Listeners (Mouse Panning)
viewerImg.addEventListener('mousedown', (e) => {
  // Prevent mouse pan if touch is active or not suitable condition
  if (isTouching || !viewer.classList.contains('fullscreen') || scale <= 1) return;
  e.preventDefault();

  isMouseDown = true; // Use dedicated mouse flag
  isDragging = false;
  startX = e.pageX;
  startY = e.pageY;
  initialTranslateX = translateX;
  initialTranslateY = translateY;

  clearTimeout(holdTimeout);
  holdTimeout = setTimeout(() => {
    if (isMouseDown) { // Check mouse flag
      isDragging = true;
      viewerImg.style.cursor = 'grabbing';
    }
  }, holdDelay);
});

document.addEventListener('mousemove', (e) => {
  // Important: Check isMouseDown, not isTouching
  if (!isDragging || !isMouseDown || !viewer.classList.contains('fullscreen') || scale <= 1) return;
  e.preventDefault();

  const currentX = e.pageX;
  const currentY = e.pageY;
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  translateX = initialTranslateX + deltaX;
  translateY = initialTranslateY + deltaY;
  applyTransform();
});

document.addEventListener('mouseup', (e) => {
  // Check isMouseDown
  if (!isMouseDown) return; // Only handle mouseup if mousedown occurred

  clearTimeout(holdTimeout);
  isMouseDown = false; // Reset mouse flag
  if (isDragging) {
      isDragging = false; // Reset dragging flag specifically
      // Only reset cursor if dragging actually happened
      viewerImg.style.cursor = scale > 1 && viewer.classList.contains('fullscreen') ? 'grab' : 'default';
  }
});

// Mouse Leave listeners (mostly okay, ensure they check isMouseDown)
viewerImg.addEventListener('mouseleave', () => {
    if (isMouseDown) { // If mouse leaves while pressed, cancel the drag
        clearTimeout(holdTimeout);
        isMouseDown = false;
        isDragging = false;
         if (viewer.classList.contains('fullscreen')) {
             viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
         }
    } else if (!isTouching && viewer.classList.contains('fullscreen')) { // Reset cursor if just hovering out
         viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
    }
});
viewerImg.addEventListener('mouseenter', () => {
    if (!isMouseDown && !isTouching && viewer.classList.contains('fullscreen')) {
       viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
    }
});


// === TOUCH Event Listeners ===

// Function to calculate distance between two touches
function getPinchDistance(touches) {
  const touch1 = touches[0];
  const touch2 = touches[1];
  return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
}

// Function to calculate the midpoint between two touches
function getPinchMidpoint(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
}

viewerImg.addEventListener('touchstart', (e) => {
  // Don't interfere if mouse is already down (edge case for hybrid devices)
  if (isMouseDown) return;

  isTouching = true;
  const touches = e.touches;

  if (touches.length === 1) {
    // Potential Pan or Swipe Start
    const touch = touches[0];
    touchStartX = touch.clientX; // Use clientX for consistency
    touchStartY = touch.clientY;
    isDragging = false; // Reset drag flag for touch
    isPinching = false;

    // If fullscreen and zoomed, prepare for panning
    if (viewer.classList.contains('fullscreen') && scale > 1) {
        startX = touch.clientX; // Use touch coords for panning start
        startY = touch.clientY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
    }

  } else if (touches.length === 2 && viewer.classList.contains('fullscreen')) {
    // Pinch Start (only in fullscreen)
    e.preventDefault(); // Prevent default pinch actions like page zoom
    isPinching = true;
    isDragging = false; // Not panning when pinching
    initialPinchDistance = getPinchDistance(touches);
    initialScale = scale; // Store scale at the beginning of the pinch
    // Store pinch center relative to the element for zoom centering
    const midpoint = getPinchMidpoint(touches);
    const rect = viewerImg.getBoundingClientRect();
    pinchCenterX = midpoint.x - rect.left;
    pinchCenterY = midpoint.y - rect.top;
    // Calculate the image content point under the pinch center
    pinchImageX = (pinchCenterX - translateX) / scale;
    pinchImageY = (pinchCenterY - translateY) / scale;


  }
}, { passive: false }); // Need active listener to call preventDefault reliably

viewerImg.addEventListener('touchmove', (e) => {
  if (!isTouching) return; // Only handle if touch started on the element

  const touches = e.touches;

  if (isPinching && touches.length === 2 && viewer.classList.contains('fullscreen')) {
    // Pinch Zoom Move
    e.preventDefault(); // Prevent scrolling/other actions during pinch

    const currentDist = getPinchDistance(touches);
    if (initialPinchDistance === null || initialPinchDistance === 0) return; // Avoid division by zero

    const scaleChange = currentDist / initialPinchDistance;
    const newScale = initialScale * scaleChange;

    // Apply scale limits
    scale = Math.max(1, Math.min(newScale, maxScale));

    // Adjust translation to keep pinch center stable
    // newTranslateX = pinchCenterX - pinchImageX * newScale
    translateX = pinchCenterX - pinchImageX * scale;
    translateY = pinchCenterY - pinchImageY * scale;

    applyTransform();

  } else if (!isPinching && touches.length === 1) {
    // Single finger move: Pan (if fullscreen & zoomed) or Swipe detection
    const touch = touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    if (touchStartX === null) return; // Should have been set in touchstart

    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    if (viewer.classList.contains('fullscreen') && scale > 1) {
      // Panning
      e.preventDefault(); // Prevent page scroll during panning
      isDragging = true; // Indicate panning is happening
      translateX = initialTranslateX + deltaX;
      translateY = initialTranslateY + deltaY;
      applyTransform();
    } else if (!viewer.classList.contains('fullscreen')) {
        // Swipe detection (Non-fullscreen only)
        // Only prevent default if horizontal movement is dominant, indicating potential swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
             e.preventDefault(); // Prevent vertical scroll if swiping horizontally
        }
        // Optionally add visual feedback during swipe (e.g., slight horizontal move)
        // viewerImg.style.transform = `translateX(${deltaX * 0.3}px)`; // Example feedback
    }
  }
}, { passive: false }); // Need active listener for preventDefault

viewerImg.addEventListener('touchend', (e) => {
  if (!isTouching) return;

  // If pinch was active, finalize scale/position
  if (isPinching) {
    // The final transform is already applied in touchmove
     // No specific action needed here other than resetting state below
  } else if (touchStartX !== null) {
     // Single finger interaction ended
     if (isDragging) {
         // Panning ended (was fullscreen and zoomed)
         // Final transform applied in touchmove
     } else if (!viewer.classList.contains('fullscreen')) {
        // Check for Swipe (Not fullscreen)
        const touch = e.changedTouches[0]; // Use changedTouches for end coordinates
        const endX = touch.clientX;
        const endY = touch.clientY;
        const deltaX = endX - touchStartX;
        const deltaY = endY - touchStartY;

        // Reset visual feedback if any was applied
        // viewerImg.style.transform = 'translateX(0px)';

        if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < verticalSwipeThreshold) {
          // Significant horizontal swipe, minimal vertical movement
          if (deltaX < 0) {
            // Swiped Left
            nextImage();
          } else {
            // Swiped Right
            prevImage();
          }
           // Reset state immediately after navigation to prevent issues
           resetTouchState();
           return; // Exit early as navigation handles reset
        }
     }
  }

  // Reset all touch-related states if interaction ends
  // Check touches length because another finger might still be down
  if (e.touches.length === 0) {
     resetTouchState();
  } else if (e.touches.length === 1 && isPinching) {
      // If one finger lifts during a pinch, reset pinch state and treat as single touch start
      isPinching = false;
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      // Prepare for potential panning if needed
      if (viewer.classList.contains('fullscreen') && scale > 1) {
        startX = touch.clientX;
        startY = touch.clientY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
      }
  }

});

// Handle touch cancellation (e.g., system interruption)
viewerImg.addEventListener('touchcancel', (e) => {
    // Treat cancellation same as touchend for resetting state
    resetTouchState();
});


// === Other Controls (Keep Existing) ===
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (viewer.classList.contains('hidden')) return;

  switch (e.key) {
    case 'Escape':
      if (document.fullscreenElement === viewer) { document.exitFullscreen(); }
      else { closeViewer(); }
      break;
    case 'ArrowRight': nextImage(); break;
    case 'ArrowLeft': prevImage(); break;
    case 'f': case 'F': toggleFullscreen(); break;
  }
});

viewer.addEventListener('click', (e) => {
  // Allow click to close only if not fullscreen AND not a drag/touch interaction end
  if (!viewer.classList.contains('fullscreen') && e.target === viewer && !isDragging && !isTouching) {
    closeViewer();
  }
});