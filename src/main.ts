import './style.css';
import { App } from './ui/app';

window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('app');
  if (root) {
    const app = new App();
    app.mount(root);
  }
});
