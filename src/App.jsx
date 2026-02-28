import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UserApp from './UserApp';
import AdminPanel from './AdminPanel';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Customer ki website homepage par khulegi */}
        <Route path="/" element={<UserApp />} />
        
        {/* Admin panel /admin likhne par khulega */}
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;