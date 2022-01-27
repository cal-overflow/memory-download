window.addEventListener('DOMContentLoaded', () => {
  const version = document.getElementById('version');

  version.innerHTML = process.env.npm_package_version;
  version.classList.remove('spinner-border', 'spinner-border-sm');
});