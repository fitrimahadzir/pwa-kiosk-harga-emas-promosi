import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {TabletOrientationGuard} from './components/TabletOrientationGuard';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <TabletOrientationGuard />
  </>,
);
