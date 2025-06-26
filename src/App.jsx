import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import DetailPage from './pages/DetailPage'; // Importa la nuova pagina
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* La rotta per la homepage */}
        <Route path="/" element={<Home />} />
        
        {/* La rotta per la pagina di dettaglio. 
            ":slug" è un parametro dinamico che useremo per identificare
            la regione/provincia/comune (es. /dettagli/lombardia) */}
        <Route path="/dettagli/:slug" element={<DetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;