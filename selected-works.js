// working code for displaying work-items with click event to open image viewer
const selectedWorksContainer = document.querySelector('.slected-works-container');
const viewer = document.getElementById('imageViewer');
const viewerImg = document.getElementById('viewerImage');
const imageTitle = document.getElementById('imageTitle'); // Get title element
const fullscreenBtn = document.getElementById('fullscreenBtn');

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
      titleDiv.innerHTML = `${item.title}<br><span class="work-size fw-regular">${item.year}</span>`;

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
  imageTitle.innerHTML = `${item.title}<br><span class="work-size fw-regular">${item.year}</span>`;
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
const maxScale = 2.3; // <<< Adjusted Max Zoom Level for touch
const zoomFactor = 1.07; // For wheel zoom

// --- Touch specific state ---
let touchStartX = null;
let touchStartY = null;
let initialPinchDistance = null;
let initialScale = 1; // Store scale at pinch start
const swipeThreshold = 50; // Min horizontal distance for a swipe
const verticalSwipeThreshold = 75; // Max vertical distance for a swipe

// --- Pinch zoom specific state ---
let pinchCenterX = 0, pinchCenterY = 0;
let pinchImageX = 0, pinchImageY = 0;


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
    resetImageTransform(); // Reset zoom/pan on entering fullscreen
    viewerImg.style.cursor = 'grab'; // Initial cursor for fullscreen
    fullscreenBtn.textContent = '✕';
    fullscreenBtn.setAttribute('color', 'white');
  } else {
    // Check if the viewer *was* the fullscreen element before exiting
    if (viewer.classList.contains('fullscreen')) {
         viewer.classList.remove('fullscreen');
         resetImageTransform(); // Reset zoom/pan on exiting fullscreen
         viewerImg.style.cursor = 'default'; // Reset cursor
         fullscreenBtn.innerHTML = `<img src="assets/images/fullscreen-icon-black.svg" alt="">`;
    }
  }
  // Reset touch state on fullscreen change regardless
  resetTouchState();
});

function resetImageTransform() {
  scale = 1;
  translateX = 0;
  translateY = 0;
  initialTranslateX = 0;
  initialTranslateY = 0;
  viewerImg.style.transformOrigin = 'top left'; // Keep origin consistent
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
    initialScale = scale; // Reset initial scale for pinch based on current scale
    // Reset pinch center variables too
    pinchCenterX = 0;
    pinchCenterY = 0;
    pinchImageX = 0;
    pinchImageY = 0;
}

// Apply transform and enforce boundaries
function applyTransform() {
  // Only apply boundaries when zoomed in and in fullscreen
  if (scale > 1 && viewer.classList.contains('fullscreen')) {
    // Use requestAnimationFrame to get dimensions after potential layout changes
    requestAnimationFrame(() => {
        const rect = viewerImg.getBoundingClientRect();
        const viewerWidth = viewer.clientWidth;
        const viewerHeight = viewer.clientHeight;
        // Image dimensions scaled, relative to viewport
        const scaledWidth = viewerImg.offsetWidth * scale;
        const scaledHeight = viewerImg.offsetHeight * scale;

        // Calculate boundaries based on the *visual* container size and scaled image size
        // Max translate allows the image edge to meet the container edge
        const maxX = 0; // Cannot move left past the container's left edge
        const minX = viewerWidth - scaledWidth; // Max leftward movement allowed
        const maxY = 0; // Cannot move up past the container's top edge
        const minY = viewerHeight - scaledHeight; // Max downward movement allowed

        // Clamp translation within calculated boundaries
        // Use Math.max(minX, ...) and Math.min(maxX, ...)
        translateX = Math.max(minX, Math.min(maxX, translateX));
        translateY = Math.max(minY, Math.min(maxY, translateY));

        viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    });

  } else {
    // If not zoomed or not fullscreen, reset/force default state
    if (scale < 1) scale = 1; // Ensure scale doesn't go below 1
    translateX = 0;
    translateY = 0;
    viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  }
}


// === MOUSE Event Listeners ===

// Zoom Listener (Wheel event)
viewerImg.addEventListener('wheel', (e) => {
  if (isTouching || !viewer.classList.contains('fullscreen')) return;
  e.preventDefault();

  const rect = viewerImg.getBoundingClientRect();
  // Calculate mouse position relative to the element's top-left corner
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  // Calculate where the mouse is pointing on the *unjomed, untranslated* image content
  const imageContentX = (mouseX - translateX) / scale;
  const imageContentY = (mouseY - translateY) / scale;

  const oldScale = scale;
  if (e.deltaY < 0) { scale *= zoomFactor; }
  else { scale /= zoomFactor; }
  scale = Math.max(1, Math.min(scale, maxScale)); // Clamp scale

  if (scale === oldScale) return; // No change, do nothing

  // Adjust translation to keep the pointed-at content under the mouse cursor
  translateX = mouseX - imageContentX * scale;
  translateY = mouseY - imageContentY * scale;

  // Update cursor based on new scale
  viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';

  applyTransform();
});

// Drag Listeners (Mouse Panning)
viewerImg.addEventListener('mousedown', (e) => {
  if (isTouching || !viewer.classList.contains('fullscreen') || scale <= 1) return;
  e.preventDefault();

  isMouseDown = true;
  isDragging = false; // Reset drag flag
  startX = e.clientX; // Use clientX for consistency
  startY = e.clientY;
  initialTranslateX = translateX;
  initialTranslateY = translateY;
  viewerImg.style.cursor = 'grabbing'; // Indicate potential drag

  // Keep the holdTimeout logic if you want a slight delay before drag confirms
  // If not, you can set isDragging = true immediately here (if scale > 1)
  // For simplicity, let's assume immediate drag intention if conditions met
  // isDragging = true; // Uncomment this if removing holdTimeout

   clearTimeout(holdTimeout); // Clear any previous timeout
   holdTimeout = setTimeout(() => {
     if (isMouseDown) { // Check if mouse is still down after delay
       isDragging = true; // Confirm drag start
       // Cursor is already set to grabbing on mousedown
     }
   }, holdDelay);
});

document.addEventListener('mousemove', (e) => {
  // Only pan if mouse is down AND dragging has been confirmed (or if no delay is used)
  if (!isMouseDown || !isDragging || !viewer.classList.contains('fullscreen') || scale <= 1) return;
  // No preventDefault here, handled by mousedown/touchstart if needed

  const currentX = e.clientX;
  const currentY = e.clientY;
  const deltaX = currentX - startX;
  const deltaY = currentY - startY;

  translateX = initialTranslateX + deltaX;
  translateY = initialTranslateY + deltaY;
  applyTransform();
});

document.addEventListener('mouseup', (e) => {
  if (!isMouseDown) return; // Ensure this mouseup corresponds to our mousedown

  clearTimeout(holdTimeout); // Clear delay timer
  const wasDragging = isDragging; // Check if a drag actually occurred

  // Reset mouse and drag states
  isMouseDown = false;
  isDragging = false;

  // Reset cursor based on whether it *can* be grabbed now
  viewerImg.style.cursor = scale > 1 && viewer.classList.contains('fullscreen') ? 'grab' : 'default';

  // --- NEW: Check for simple click for navigation ---
  // Only navigate if it wasn't a drag and not in fullscreen
  if (!wasDragging && !viewer.classList.contains('fullscreen')) {
      const rect = viewerImg.getBoundingClientRect();
      const clickX = e.clientX;
      const relativeX = clickX - rect.left;

      if (relativeX < rect.width / 2) {
          // Clicked on left half
          prevImage();
      } else {
          // Clicked on right half
          nextImage();
      }
  }
});

// Mouse Leave listeners
viewerImg.addEventListener('mouseleave', () => {
    if (isMouseDown) { // If mouse leaves while pressed, treat as mouseup
        clearTimeout(holdTimeout);
        isMouseDown = false;
        isDragging = false;
        // Reset cursor based on potential grab state if viewer still active
        if (viewer.classList.contains('fullscreen')) {
           viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
        } else {
           viewerImg.style.cursor = 'default';
        }
    }
    // No else needed, cursor reset handled by mouseup/fullscreenchange
});
// mouseenter doesn't need much change, cursor is set on open/zoom/fullscreenchange
viewerImg.addEventListener('mouseenter', () => {
    // Maybe reset cursor if needed, but other events should handle it
    if (!isMouseDown && viewer.classList.contains('fullscreen')) {
        viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
    } else if (!isMouseDown) {
         viewerImg.style.cursor = 'default';
    }
});


// === TOUCH Event Listeners ===

function getPinchDistance(touches) {
  const touch1 = touches[0];
  const touch2 = touches[1];
  return Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
}

function getPinchMidpoint(touches) {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
    };
}

viewerImg.addEventListener('touchstart', (e) => {
  if (isMouseDown) return; // Don't handle touch if mouse is already interacting

  isTouching = true; // General touch flag
  const touches = e.touches;

  // Prevent default actions like scrolling/zooming page ONLY if we intend to handle the touch
  // This needs to be conditional based on context (e.g., fullscreen, number of touches)

  if (touches.length === 1) {
    // Potential Pan or Swipe Start
    const touch = touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isDragging = false; // Reset flag for this interaction
    isPinching = false;

    // If fullscreen and zoomed, prepare for panning
    if (viewer.classList.contains('fullscreen') && scale > 1) {
        e.preventDefault(); // Prevent scrolling page when panning image
        startX = touch.clientX; // Use touch coords for panning start
        startY = touch.clientY;
        initialTranslateX = translateX;
        initialTranslateY = translateY;
        // Set isDragging immediately or use a delay like mouse? For touch, immediate often feels better.
        // Let's tentatively set isDragging flag later in touchmove if movement occurs.
    }
     // If NOT fullscreen, don't prevent default yet, allow potential vertical scroll

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
    // Calculate pinch center relative to the element's top-left
    pinchCenterX = midpoint.x - rect.left;
    pinchCenterY = midpoint.y - rect.top;
    // Calculate the image content point under the pinch center
    pinchImageX = (pinchCenterX - translateX) / scale;
    pinchImageY = (pinchCenterY - translateY) / scale;
  }
  // If > 2 touches or other scenarios, do nothing special / allow default

}, { passive: false }); // Need active listener to conditionally call preventDefault

viewerImg.addEventListener('touchmove', (e) => {
  if (!isTouching) return; // Only handle if touch started on the element

  const touches = e.touches;

  if (isPinching && touches.length === 2 && viewer.classList.contains('fullscreen')) {
    // Pinch Zoom Move
    e.preventDefault(); // Continue preventing default during pinch

    const currentDist = getPinchDistance(touches);
    if (initialPinchDistance === null || initialPinchDistance === 0) return; // Avoid division by zero

    const scaleChange = currentDist / initialPinchDistance;
    let newScale = initialScale * scaleChange;

    // Apply scale limits
    newScale = Math.max(1, Math.min(newScale, maxScale));

    // Only update if scale actually changed to avoid jitter
    if (newScale !== scale) {
        scale = newScale;

        // Adjust translation to keep pinch center stable relative to content
        translateX = pinchCenterX - pinchImageX * scale;
        translateY = pinchCenterY - pinchImageY * scale;

        applyTransform();
    }

  } else if (!isPinching && touches.length === 1) {
    // Single finger move: Potential Pan or Swipe
    const touch = touches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;

    if (touchStartX === null) return; // Should have been set in touchstart

    const deltaX = currentX - touchStartX;
    const deltaY = currentY - touchStartY;

    // Panning (only if fullscreen and zoomed)
    if (viewer.classList.contains('fullscreen') && scale > 1) {
        // If panning hasn't started yet (isDragging is false), check movement threshold? Or just start.
        if (!isDragging) {
            // Optionally add a small threshold check here if needed
             isDragging = true; // Start panning
        }
        // Prevent page scroll during image panning
        e.preventDefault();
        translateX = initialTranslateX + deltaX;
        translateY = initialTranslateY + deltaY;
        applyTransform();
    } else if (!viewer.classList.contains('fullscreen')) {
        // Swipe detection logic (Non-fullscreen only)
        // Prevent vertical scroll ONLY if horizontal movement is dominant, suggesting a swipe
        if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 10) { // Adjust multiplier as needed
            e.preventDefault();
        }
        // We don't set isDragging here, swipe is determined on touchend
    }
  }
}, { passive: false }); // Need active listener for preventDefault

viewerImg.addEventListener('touchend', (e) => {
  if (!isTouching) return;

  const touches = e.touches; // Touches still on the screen
  const changedTouches = e.changedTouches; // Touches that were lifted

  if (isPinching) {
    // Pinch ended
    if (touches.length < 2) {
      // Fewer than two fingers remain, pinch is definitely over
      isPinching = false;
      // If one finger remains, transition to potential pan state
      if (touches.length === 1) {
          const touch = touches[0];
          touchStartX = touch.clientX;
          touchStartY = touch.clientY;
          // Prepare for potential panning if conditions met
          if (viewer.classList.contains('fullscreen') && scale > 1) {
              startX = touch.clientX;
              startY = touch.clientY;
              initialTranslateX = translateX;
              initialTranslateY = translateY;
          }
      } else { // touches.length === 0
          resetTouchState();
      }
    }
    // applyTransform might be needed one last time if boundaries changed scale slightly
    applyTransform();

  } else if (touchStartX !== null && changedTouches.length === 1) {
      // Single finger interaction ended (Tap, Swipe, or Pan end)
      const touch = changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const deltaX = endX - touchStartX;
      const deltaY = endY - touchStartY;

      if (isDragging) {
          // Panning ended (was fullscreen and zoomed)
          // The final transform was applied in touchmove. Reset drag flag.
          isDragging = false;
          // Boundary check might be needed again if the last move was clamped
           applyTransform();
      } else if (!viewer.classList.contains('fullscreen')) {
          // Check for Swipe or Tap (Not fullscreen)

          // Check for SWIPE first
          if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < verticalSwipeThreshold) {
              if (deltaX < 0) { nextImage(); }
              else { prevImage(); }
              // State is reset inside openImageViewer/resetTouchState called by it
              resetTouchState(); // Explicitly reset here too just in case
              return; // Exit early, navigation happened
          }
          // Check for TAP navigation second (if it wasn't a swipe)
          // Make sure it wasn't a small drag attempt (e.g., check if deltaX/Y are small)
          else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) { // Threshold for tap vs accidental small move
                const rect = viewerImg.getBoundingClientRect();
                const clickX = endX; // Use end coordinates for tap location
                const relativeX = clickX - rect.left;
                if (relativeX < rect.width / 2) {
                    prevImage();
                } else {
                    nextImage();
                }
                resetTouchState(); // Reset state after tap navigation
                return; // Exit early
          }
      }
  }

  // If no specific action caused an early return, check if interaction fully ended
  if (touches.length === 0) {
      resetTouchState(); // Reset all touch states if no fingers remain
  }

});

// Handle touch cancellation (e.g., system interruption)
viewerImg.addEventListener('touchcancel', (e) => {
    // Treat cancellation same as touchend for resetting state
    resetTouchState();
    // Reset cursor maybe?
    viewerImg.style.cursor = viewer.classList.contains('fullscreen') && scale > 1 ? 'grab' : 'default';
});


// === Other Controls ===
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
  if (viewer.classList.contains('hidden')) return; // Only act if viewer is visible

  switch (e.key) {
    case 'Escape':
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
    case 'f': case 'F': // Toggle fullscreen with 'f' key
        toggleFullscreen();
        break;
    // Add '+' and '-' for zoom maybe?
    // case '+': if (viewer.classList.contains('fullscreen')) { /* zoom in logic */ } break;
    // case '-': if (viewer.classList.contains('fullscreen')) { /* zoom out logic */ } break;
  }
});

// --- REMOVED viewer background click listener ---
// viewer.addEventListener('click', (e) => {
//  // Allow click to close only if not fullscreen AND not a drag/touch interaction end
//  if (!viewer.classList.contains('fullscreen') && e.target === viewer && !isDragging && !isTouching) {
//    closeViewer();
//  }
// });