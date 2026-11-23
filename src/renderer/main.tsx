import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import BlobOverlay from './components/BlobOverlay';
import './styles.css';

const isOverlay = window.location.hash.startsWith('#overlay');
document.body.classList.add(isOverlay ? 'overlay-mode' : 'app-mode');

const root = createRoot(document.getElementById('root')!);
root.render(isOverlay ? <BlobOverlay /> : <App />);
