import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, Check, Share2, ExternalLink } from 'lucide-react';

// CONFIGURATION
const MAX_GUESSES = 5;

// FLAVOR TEXT OPTIONS
const WIN_MESSAGES = ["Oh??", "🤠", "👀", "Good job, bud.", "EZ."];
const LOSE_MESSAGES = ["Yikes.", "Bro??", "Skill Issue?", "Uhhh...", "Frick!"];

// STYLES (Discord Dark Theme)
const styles = {
  container: { maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', paddingBottom: '50px' },
  imagePreview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  quoteBox: { background: '#2b2d31', borderLeft: '4px solid #5865F2', padding: '15px', borderRadius: '4px', fontSize: '1.1rem', marginBottom: '20px', textAlign: 'left', color: '#dbdee1' },
  inputGroup: { position: 'relative', marginBottom: '10px' },
  input: { width: '100%', padding: '15px', fontSize: '1rem', borderRadius: '8px', border: 'none', background: '#383a40', color: 'white', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  dropdown: { position: 'absolute', width: '100%', maxHeight: '200px', overflowY: 'auto', background: '#2b2d31', borderRadius: '0 0 8px 8px', zIndex: 10, textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  dropdownItem: { padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1' },
  disabledItem: { padding: '10px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1', opacity: 0.5, background: '#232428' },
  grid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '8px' },
  cell: { padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 2px rgba(0,0,0,0.2)' },
  avatarSmall: { width: '30px', height: '30px', borderRadius: '50%' },
  btnPrimary: { background: '#5865F2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
  btnSecondary: { background: '#4f545c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' },
  resultsBox: { marginTop: '30px', padding: '20px', background: '#2b2d31', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' },
  guessCounter: { fontSize: '0.9rem', color: '#949BA4', marginBottom: '20px', marginTop: '5px' }
};

// 1. IMPROVED SEED GEN (Based on Local Time)
const getDailySeed = () => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; 
  }
  return Math.abs(hash);
};

// 2. IMPROVED RANDOM (Mulberry32)
const mulberry32 = (a) => {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

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
        const rng = mulberry32(seed); 
        const randIndex = Math.floor(rng() * json.messages.length);
        
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
  }, [data, input]);

  const handleGuess = (user) => {
    if (gameOver) return;
    if (guesses.some(g => g.user.id === user.id)) return;

    const targetUser = data.users[targetMsg.author_id];
    
    const rankDir = user.rank_val === targetUser.rank_val ? 'equal' : (user.rank_val > targetUser.rank_val ? 'higher' : 'lower');
    const joinDir = user.joined_at === targetUser.joined_at ? 'equal' : (user.joined_at > targetUser.joined_at ? 'earlier' : 'later');

    const newGuess = {
      user: user,
      correct: user.id === targetUser.id,
      rankHint: rankDir,
      joinHint: joinDir,
      sharedClues: user.clues.filter(c => targetUser.clues.includes(c))
    };

    const updatedGuesses = [...guesses, newGuess];
    setGuesses(updatedGuesses);
    setInput('');
    
    if (newGuess.correct || updatedGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
    }
  };

  const handleShare = () => {
    const dateStr = new Date().toLocaleDateString();
    
    const lastGuess = guesses[guesses.length - 1];
    const isWin = lastGuess && lastGuess.correct;
    const score = isWin ? guesses.length : 'X';
    
    let text = `Who Said It? ${dateStr}\n${score}/${MAX_GUESSES}\n`;
    
    guesses.forEach(g => {
        text += g.correct ? '🟩' : '⬛';
        text += g.rankHint === 'equal' ? '🟩' : (g.rankHint === 'higher' ? '⬆️' : '⬇️');
        text += g.joinHint === 'equal' ? '🟩' : (g.joinHint === 'earlier' ? '⬅️' : '➡️');
        if (g.correct) {
            text += '🟩';
        } else {
            text += g.sharedClues.length > 0 ? '🟨' : '⬛';
        }
        text += '\n';
    });

    text += 'https://vsporeddy.github.io/who-said-it/';

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to pick flavor text based on daily seed
  const getEndGameMessage = () => {
    if (guesses.length === 0) return "";
    const isWin = guesses[guesses.length - 1].correct;
    const seed = getDailySeed();
    const list = isWin ? WIN_MESSAGES : LOSE_MESSAGES;
    return list[seed % list.length];
  };

  const getDiscordLink = () => {
    if (!data || !targetMsg) return '#';
    return `https://discord.com/channels/${data.meta.guild_id}/${targetMsg.channel_id}/${targetMsg.msg_id}`;
  };

  if (!data || !targetMsg) return <div style={{padding:'20px', color:'white'}}>Loading...</div>;

  const guessesRemaining = MAX_GUESSES - guesses.length;

  return (
    <div style={styles.container}>
      <h1>Who Said It?</h1>
      
      {targetMsg.type === 'image' ? (
        <img src={targetMsg.content} style={styles.imagePreview} alt="Puzzle" />
      ) : (
        <div style={styles.quoteBox}>"{targetMsg.content}"</div>
      )}

      {/* INPUT */}
      {!gameOver && (
        <>
          <div style={styles.inputGroup}>
            <input 
              style={styles.input}
              placeholder="Type a name..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            {input && (
              <div style={styles.dropdown}>
                {filteredUsers.map(u => {
                  const isGuessed = guesses.some(g => g.user.id === u.id);
                  return (
                    <div 
                      key={u.id} 
                      style={isGuessed ? styles.disabledItem : styles.dropdownItem} 
                      onClick={() => !isGuessed && handleGuess(u)}
                    >
                      <img src={u.avatar} style={styles.avatarSmall} alt="" />
                      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start', lineHeight:'1.2'}}>
                        <span style={{fontWeight:'bold'}}>
                          {u.nickname} {isGuessed && "(Already Guessed)"}
                        </span>
                        <span style={{fontSize:'0.8rem', color:'#949BA4'}}>
                          {u.display_name !== u.nickname ? u.display_name : u.username}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={styles.guessCounter}>
            {guessesRemaining} guess{guessesRemaining !== 1 ? 'es' : ''} remaining
          </div>
        </>
      )}

      {/* GRID */}
      <div style={styles.grid}>
        {guesses.length > 0 && (
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:'5px', fontSize:'0.8rem', opacity: 0.7, marginBottom:'5px', color:'#dbdee1'}}>
              <span>User</span>
              <span>Rank</span>
              <span>Joined</span>
              <span>Roles</span>
          </div>
        )}
        
        {guesses.map((g, i) => (
          <GuessRow key={i} guess={g} />
        ))}
      </div>

      {/* GAME OVER UI */}
      {gameOver && (
        <div style={styles.resultsBox}>
          <h2 style={{marginTop:0}}>{getEndGameMessage()}</h2>
          
          <div style={{marginBottom: '20px'}}>
            The message was sent by: <br/>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', marginTop:'10px'}}>
                <img src={data.users[targetMsg.author_id].avatar} style={styles.avatarSmall} alt=""/>
                <strong>{data.users[targetMsg.author_id].nickname}</strong>
            </div>
          </div>

          <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
            <button onClick={handleShare} style={styles.btnPrimary}>
              <Share2 size={18} /> {copied ? "Copied!" : "Share Result"}
            </button>
            
            <a href={getDiscordLink()} target="_blank" rel="noopener noreferrer" style={styles.btnSecondary}>
              <ExternalLink size={18} /> Jump to Message
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function GuessRow({ guess }) {
  const GREEN = '#23a559';
  const YELLOW = '#f0b232';
  const GREY = '#4e5058';

  return (
    <div style={styles.row}>
      <div style={{...styles.cell, background: guess.correct ? GREEN : GREY, justifyContent: 'flex-start', gap: '10px'}}>
        <img src={guess.user.avatar} style={styles.avatarSmall} alt="" />
        {guess.user.nickname}
      </div>

      <div style={{...styles.cell, background: guess.correct ? GREEN : (guess.rankHint === 'equal' ? YELLOW : GREY)}}>
        {guess.rankHint === 'equal' ? <Check size={16}/> : 
         guess.rankHint === 'higher' ? <ArrowUp size={16}/> : 
         <ArrowDown size={16}/>}
      </div>

      <div style={{...styles.cell, background: guess.correct ? GREEN : (guess.joinHint === 'equal' ? YELLOW : GREY)}}>
        {guess.joinHint === 'equal' ? <Check size={16}/> : 
         guess.joinHint === 'earlier' ? <span>Earlier</span> : 
         <span>Later</span>}
      </div>

      <div style={{
        ...styles.cell, 
        background: guess.correct ? GREEN : (guess.sharedClues.length > 0 ? YELLOW : GREY), 
        fontSize: '0.6rem', 
        flexDirection:'column', 
        lineHeight:'1.1',
        textAlign: 'center',
        wordBreak: 'break-word',
        padding: '5px'
      }}>
        {guess.sharedClues.length > 0 ? guess.sharedClues.slice(0,5).join(', ') : "-"}
      </div>
    </div>
  );
}