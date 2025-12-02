import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, Check, Share2, ExternalLink } from 'lucide-react';

// STYLES (Discord Dark Theme)
const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', paddingBottom: '50px' },
  imagePreview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  quoteBox: { background: '#2b2d31', borderLeft: '4px solid #5865F2', padding: '15px', borderRadius: '4px', fontSize: '1.1rem', marginBottom: '20px', textAlign: 'left', color: '#dbdee1' },
  inputGroup: { position: 'relative', marginBottom: '20px' },
  input: { width: '100%', padding: '15px', fontSize: '1rem', borderRadius: '8px', border: 'none', background: '#383a40', color: 'white', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  dropdown: { position: 'absolute', width: '100%', maxHeight: '200px', overflowY: 'auto', background: '#2b2d31', borderRadius: '0 0 8px 8px', zIndex: 10, textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  dropdownItem: { padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1' },
  disabledItem: { padding: '10px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1', opacity: 0.5, background: '#232428' }, // New style for duplicates
  grid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px' },
  cell: { padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 2px rgba(0,0,0,0.2)' },
  avatarSmall: { width: '30px', height: '30px', borderRadius: '50%' },
  btnPrimary: { background: '#5865F2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
  btnSecondary: { background: '#4f545c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' },
  resultsBox: { marginTop: '30px', padding: '20px', background: '#2b2d31', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }
};

const getDailySeed = () => Math.floor(Date.now() / 86400000); 

const seededRandom = (seed) => {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
};

export default function App() {
  const [data, setData] = useState(null);
  const [targetMsg, setTargetMsg] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    fetch('./game_data.json')
      .then(res => res.json())
      .then(json => {
        setData(json);
        const seed = getDailySeed();
        const randIndex = Math.floor(seededRandom(seed) * json.messages.length);
        setTargetMsg(json.messages[randIndex]);

        const savedState = localStorage.getItem('whosaidit_state');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          if (parsed.seed === seed) {
            setGuesses(parsed.guesses);
            setGameOver(parsed.gameOver);
          }
        }
      });
  }, []);

  useEffect(() => {
    if (!targetMsg) return;
    const seed = getDailySeed();
    localStorage.setItem('whosaidit_state', JSON.stringify({
      seed, guesses, gameOver
    }));
  }, [guesses, gameOver, targetMsg]);

  const filteredUsers = useMemo(() => {
    if (!data || !input) return [];
    const searchStr = input.toLowerCase();
    return Object.values(data.users).filter(u => 
      u.username.toLowerCase().includes(searchStr) || 
      u.nickname.toLowerCase().includes(searchStr) || 
      u.display_name.toLowerCase().includes(searchStr)
    ).slice(0, 5);