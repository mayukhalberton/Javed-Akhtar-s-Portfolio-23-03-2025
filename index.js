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