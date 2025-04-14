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


// For selected-works

// const sheetUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTQaSgaKtOJsrxmL9p_EJbB9QuXkYnf2i76iufB1-_kQ3git5Ir9we4pHAJmGsKQzc2K1S0BT4HM5_3/pub?output=csv';
// const selectedWorksContainer = document.querySelector('.slected-works-container');

// function convertGoogleDriveUrl(url) {
//   const match = url.match(/\/d\/([^/]+)\//);
//   if (match && match[1]) {
//     return `https://drive.google.com/uc?export=view&id=${match[1]}`;
//   }
//   return url;
// }

// fetch(sheetUrl)
//   .then(res => res.text())
//   .then(csvText => {
//     const parsed = Papa.parse(csvText, {
//       header: true,
//       skipEmptyLines: true,
//     });

//     parsed.data.forEach(row => {
//       const title = row["Title"]?.trim();
//       const rawImageUrl = row["Image Source"]?.trim();
//       if (!title || !rawImageUrl) return;

//       const imageUrl = convertGoogleDriveUrl(rawImageUrl);

//       const item = document.createElement('div');
//       item.classList.add('work-item');
//       item.innerHTML = `
//         <img src="${imageUrl}" alt="${title}" loading="lazy">
//         <div class="work-title fs-small fw-extra-bold">
//           ${title.replace(/\\n/g, '<br>')}
//         </div>
//       `;
//       selectedWorksContainer.appendChild(item);
//     });
//   })
//   .catch(err => console.error('Error loading or parsing CSV:', err));



// Working code for displaying work-items:
// const selectedWorksContainer = document.querySelector('.slected-works-container');

// fetch('assets/images/selected-works/work-titles.json')
//   .then(response => response.json())
//   .then(data => {
//     data.forEach(item => {
//       const workItem = document.createElement('div');
//       workItem.classList.add('work-item');

//       // Load from low-res folder based on sl no
//       const img = document.createElement('img');
//       img.src = `assets/images/selected-works/low-res/${item.sl}.jpg`;
//       img.alt = item.title;
//       img.loading = 'lazy';

//       const titleDiv = document.createElement('div');
//       titleDiv.classList.add('work-title', 'fs-small', 'fw-extra-bold');
//       titleDiv.innerHTML = `${item.title},<br>${item.size}`;

//       workItem.appendChild(img);
//       workItem.appendChild(titleDiv);

//       selectedWorksContainer.appendChild(workItem);
//     });
//   })
//   .catch(error => {
//     console.error("Error loading work-titles.json or images:", error);
//   });


// working code for displaying work-items with click event to open image viewer
const selectedWorksContainer = document.querySelector('.slected-works-container');
const viewer = document.getElementById('imageViewer');
const viewerImg = document.getElementById('viewerImage');

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
  viewer.classList.remove('hidden');
}

function closeViewer() {
  viewer.classList.add('hidden');
  viewerImg.src = '';
}

function nextImage() {
  currentIndex = (currentIndex + 1) % artworks.length;
  openImageViewer(currentIndex);
}

function prevImage() {
  currentIndex = (currentIndex - 1 + artworks.length) % artworks.length;
  openImageViewer(currentIndex);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    viewer.requestFullscreen().catch(err => console.error(err));
  } else {
    document.exitFullscreen();
  }
}

// Controls
document.getElementById('closeBtn').addEventListener('click', closeViewer);
document.getElementById('nextBtn').addEventListener('click', nextImage);
document.getElementById('prevBtn').addEventListener('click', prevImage);
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);