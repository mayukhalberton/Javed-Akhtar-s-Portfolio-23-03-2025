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
let currentLoader = null; // Variable to hold the current loader element
let loadingTimeoutId = null; // << NEW: Variable to hold the loader timeout ID

// --- Loading Animation Functions ---
function showLoading(targetElement) {
    // Remove any existing loader first
    hideLoading();

    const loader = document.createElement('div');
    loader.classList.add('loader'); // Use the CSS class defined for the loader
    // Append to the wrapper containing the image, assuming viewerImg's parent is suitable
    if (targetElement.parentNode) {
        targetElement.parentNode.appendChild(loader);
        currentLoader = loader; // Store the reference
    } else {
        console.error("Cannot find parent node to attach loader.");
    }
}

function hideLoading() {
    if (currentLoader && currentLoader.parentNode) {
        currentLoader.parentNode.removeChild(currentLoader);
    }
    currentLoader = null; // Clear the reference
}
// --- End Loading Animation Functions ---


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
            img.loading = 'lazy'; // Keep lazy loading for thumbnails

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

    // Reset image state and show viewer
    viewerImg.style.visibility = 'hidden'; // Hide image initially until loaded
    viewerImg.src = ''; // Clear previous image source immediately
    imageTitle.innerHTML = `${item.title}, <span class="work-size fw-extra-bold">${item.year}</span><br><span class="fw-regular">${item.size} <br> ${item.type}</span>`;
    viewer.classList.remove('hidden');
    resetImageTransform();
    resetTouchState(); // Reset touch state when opening a new image

    // --- MODIFIED: Loading Animation Logic ---
    // Clear any previous timeout that might be pending
    clearTimeout(loadingTimeoutId);
    // Don't show loading immediately. Instead, set a timeout.
    loadingTimeoutId = setTimeout(() => {
        showLoading(viewerImg); // Show loader only if 1 second passes
        loadingTimeoutId = null; // Clear the ID after execution
    }, 1000); // 1000 milliseconds = 1 second
    // --- END MODIFIED ---

    // Set up load and error handlers
    viewerImg.onload = () => {
        clearTimeout(loadingTimeoutId); // << NEW: Cancel the scheduled loader if image loads quickly
        loadingTimeoutId = null;       // << NEW: Reset the timeout ID
        hideLoading();                  // Hide loader (if it was shown) on successful load
        viewerImg.style.visibility = 'visible'; // Show the loaded image
    };

    viewerImg.onerror = () => {
        clearTimeout(loadingTimeoutId); // << NEW: Cancel the scheduled loader on error
        loadingTimeoutId = null;       // << NEW: Reset the timeout ID
        hideLoading();                  // Hide loader (if it was shown) on error
        viewerImg.style.visibility = 'visible'; // Still show the space, maybe show a placeholder/alt text?
        console.error(`Error loading image: assets/images/selected-works/full-res/${item.sl}.jpg`);
        imageTitle.innerHTML = `Error loading image: ${item.title}`;
    };

    // Set the source to trigger loading
    viewerImg.src = `assets/images/selected-works/full-res/${item.sl}.jpg`;
}

function closeViewer() {
    clearTimeout(loadingTimeoutId); // << NEW: Cancel pending loader timeout on close
    loadingTimeoutId = null;       // << NEW: Reset the timeout ID
    viewer.classList.add('hidden');
    viewerImg.src = ''; // Clear image source
    viewerImg.style.visibility = 'hidden'; // Hide image area
    hideLoading(); // Ensure loader is hidden if viewer is closed prematurely
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
    resetImageTransform();
    resetTouchState(); // Reset touch state on close
}

// nextImage and prevImage implicitly call openImageViewer, which now handles loading
function nextImage() {
    currentIndex = (currentIndex + 1) % artworks.length;
    openImageViewer(currentIndex);
}

function prevImage() {
    currentIndex = (currentIndex - 1 + artworks.length) % artworks.length;
    openImageViewer(currentIndex);
}

// --- State variables for zoom/pan (Mouse & Touch) ---
let isMouseDown = false;
let isTouching = false;
let isDragging = false;
let isPinching = false;
let startX, startY;
let initialTranslateX = 0, initialTranslateY = 0;
let translateX = 0, translateY = 0;
let scale = 1;
const maxScale = 2.3;
const zoomFactor = 1.07;

// --- Touch specific state ---
let touchStartX = null;
let touchStartY = null;
let initialPinchDistance = null;
let initialScale = 1;
const swipeThreshold = 50;
const verticalSwipeThreshold = 75;

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
        resetImageTransform();
        viewerImg.style.cursor = 'grab';
        fullscreenBtn.textContent = '✕';
        // hideLoading(); // Should already be hidden by onload/onerror
    } else {
        if (viewer.classList.contains('fullscreen')) {
            viewer.classList.remove('fullscreen');
            resetImageTransform();
            viewerImg.style.cursor = 'default';
            fullscreenBtn.innerHTML = `<img src="assets/images/fullscreen-icon-black.svg" alt="">`;
        }
    }
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

function resetTouchState() {
    isTouching = false;
    isDragging = false;
    isPinching = false;
    touchStartX = null;
    touchStartY = null;
    initialPinchDistance = null;
    initialScale = scale;
    pinchCenterX = 0;
    pinchCenterY = 0;
    pinchImageX = 0;
    pinchImageY = 0;
}

function applyTransform() {
    if (scale > 1 && viewer.classList.contains('fullscreen')) {
        requestAnimationFrame(() => {
            const viewerWidth = viewer.clientWidth;
            const viewerHeight = viewer.clientHeight;
            const scaledWidth = viewerImg.offsetWidth * scale;
            const scaledHeight = viewerImg.offsetHeight * scale;

            const effectiveMinX = (scaledWidth > viewerWidth) ? (viewerWidth - scaledWidth) : 0;
            const effectiveMaxX = 0;
            const effectiveMinY = (scaledHeight > viewerHeight) ? (viewerHeight - scaledHeight) : 0;
            const effectiveMaxY = 0;

            translateX = Math.max(effectiveMinX, Math.min(effectiveMaxX, translateX));
            translateY = Math.max(effectiveMinY, Math.min(effectiveMaxY, translateY));

            viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
        });

    } else {
        if (scale < 1) scale = 1;
        translateX = 0;
        translateY = 0;
        viewerImg.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
    }
}


// === MOUSE Event Listeners ===

viewerImg.addEventListener('wheel', (e) => {
    if (isTouching || !viewer.classList.contains('fullscreen')) return;
    e.preventDefault();

    const rect = viewerImg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const imageContentX = (mouseX - translateX) / scale;
    const imageContentY = (mouseY - translateY) / scale;

    const oldScale = scale;
    if (e.deltaY < 0) { scale *= zoomFactor; }
    else { scale /= zoomFactor; }
    scale = Math.max(1, Math.min(scale, maxScale));

    if (scale === oldScale) return;

    translateX = mouseX - imageContentX * scale;
    translateY = mouseY - imageContentY * scale;
    viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
    applyTransform();
});

viewerImg.addEventListener('mousedown', (e) => {
    if (isTouching || !viewer.classList.contains('fullscreen') || scale <= 1 || viewerImg.style.visibility === 'hidden') return;
    e.preventDefault();

    isMouseDown = true;
    isDragging = false;
    startX = e.clientX;
    startY = e.clientY;
    initialTranslateX = translateX;
    initialTranslateY = translateY;
    viewerImg.style.cursor = 'grabbing';

    clearTimeout(holdTimeout);
    holdTimeout = setTimeout(() => {
        if (isMouseDown) {
            isDragging = true;
        }
    }, holdDelay);
});

document.addEventListener('mousemove', (e) => {
    if (!isMouseDown || !isDragging || !viewer.classList.contains('fullscreen') || scale <= 1) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    translateX = initialTranslateX + deltaX;
    translateY = initialTranslateY + deltaY;
    applyTransform();
});

document.addEventListener('mouseup', (e) => {
    if (!isMouseDown) return;

    clearTimeout(holdTimeout);
    const wasDragging = isDragging;

    isMouseDown = false;
    isDragging = false;
    viewerImg.style.cursor = scale > 1 && viewer.classList.contains('fullscreen') ? 'grab' : 'default';

    if (!wasDragging && !viewer.classList.contains('fullscreen') && viewerImg.style.visibility !== 'hidden') {
        const rect = viewerImg.getBoundingClientRect();
        const clickX = e.clientX;
        const relativeX = clickX - rect.left;

        if (relativeX < rect.width / 2) {
            prevImage();
        } else {
            nextImage();
        }
    }
});

viewerImg.addEventListener('mouseleave', () => {
    if (isMouseDown) {
        clearTimeout(holdTimeout);
        isMouseDown = false;
        isDragging = false;
        if (viewer.classList.contains('fullscreen')) {
            viewerImg.style.cursor = scale > 1 ? 'grab' : 'default';
        } else {
            viewerImg.style.cursor = 'default';
        }
    }
});

viewerImg.addEventListener('mouseenter', () => {
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
    if (isMouseDown || viewerImg.style.visibility === 'hidden') return;

    isTouching = true;
    const touches = e.touches;

    if (touches.length === 1) {
        const touch = touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isDragging = false;
        isPinching = false;

        if (viewer.classList.contains('fullscreen') && scale > 1) {
            e.preventDefault();
            startX = touch.clientX;
            startY = touch.clientY;
            initialTranslateX = translateX;
            initialTranslateY = translateY;
        }

    } else if (touches.length === 2 && viewer.classList.contains('fullscreen')) {
        e.preventDefault();
        isPinching = true;
        isDragging = false;
        initialPinchDistance = getPinchDistance(touches);
        initialScale = scale;

        const midpoint = getPinchMidpoint(touches);
        const rect = viewerImg.getBoundingClientRect();
        pinchCenterX = midpoint.x - rect.left;
        pinchCenterY = midpoint.y - rect.top;
        pinchImageX = (pinchCenterX - translateX) / scale;
        pinchImageY = (pinchCenterY - translateY) / scale;
    }

}, { passive: false });

viewerImg.addEventListener('touchmove', (e) => {
    if (!isTouching || viewerImg.style.visibility === 'hidden') return;

    const touches = e.touches;

    if (isPinching && touches.length === 2 && viewer.classList.contains('fullscreen')) {
        e.preventDefault();

        const currentDist = getPinchDistance(touches);
        if (initialPinchDistance === null || initialPinchDistance === 0) return;

        const scaleChange = currentDist / initialPinchDistance;
        let newScale = initialScale * scaleChange;
        newScale = Math.max(1, Math.min(newScale, maxScale));

        if (newScale !== scale) {
            scale = newScale;
            translateX = pinchCenterX - pinchImageX * scale;
            translateY = pinchCenterY - pinchImageY * scale;
            applyTransform();
        }

    } else if (!isPinching && touches.length === 1) {
        const touch = touches[0];
        const currentX = touch.clientX;
        const currentY = touch.clientY;

        if (touchStartX === null) return;

        const deltaX = currentX - touchStartX;
        const deltaY = currentY - touchStartY;

        if (viewer.classList.contains('fullscreen') && scale > 1) {
            if (!isDragging) {
                 isDragging = true;
            }
            e.preventDefault();
            translateX = initialTranslateX + deltaX;
            translateY = initialTranslateY + deltaY;
            applyTransform();
        } else if (!viewer.classList.contains('fullscreen')) {
            if (Math.abs(deltaX) > Math.abs(deltaY) * 1.5 && Math.abs(deltaX) > 10) {
                 e.preventDefault();
            }
        }
    }
}, { passive: false });

viewerImg.addEventListener('touchend', (e) => {
    if (!isTouching || viewerImg.style.visibility === 'hidden') return;

    const touches = e.touches;
    const changedTouches = e.changedTouches;

    if (isPinching) {
        if (touches.length < 2) {
            isPinching = false;
            if (touches.length === 1) {
                const touch = touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                if (viewer.classList.contains('fullscreen') && scale > 1) {
                     startX = touch.clientX;
                     startY = touch.clientY;
                     initialTranslateX = translateX;
                     initialTranslateY = translateY;
                }
            } else {
                 resetTouchState();
            }
        }
        applyTransform();

    } else if (touchStartX !== null && changedTouches.length === 1) {
        const touch = changedTouches[0];
        const endX = touch.clientX;
        const endY = touch.clientY;
        const deltaX = endX - touchStartX;
        const deltaY = endY - touchStartY;

        if (isDragging) {
             isDragging = false;
             applyTransform();
        } else if (!viewer.classList.contains('fullscreen')) {
             if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaY) < verticalSwipeThreshold) {
                  if (deltaX < 0) { nextImage(); }
                  else { prevImage(); }
                  return;
             }
        }
    }

    if (touches.length === 0) {
        resetTouchState();
    }

});

viewerImg.addEventListener('touchcancel', (e) => {
    resetTouchState();
    viewerImg.style.cursor = viewer.classList.contains('fullscreen') && scale > 1 ? 'grab' : 'default';
});


// === Other Controls ===
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

document.addEventListener('keydown', (e) => {
    if (viewer.classList.contains('hidden')) return;

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
        case 'f': case 'F':
             toggleFullscreen();
             break;
    }
});