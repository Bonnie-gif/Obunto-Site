import { playSound } from './audio.js';

export function initSystem(socket) {
    let progress = 0;
    const bar = document.querySelector('.progress-fill');
    const interval = setInterval(() => {
        progress += 5;
        if(bar) bar.style.width = `${progress}%`;
        if(progress >= 100) {
            clearInterval(interval);
            playSound('boot');
        }
    }, 100);
}