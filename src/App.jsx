import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check, Share2, ExternalLink, CircleHelp } from 'lucide-react';

// CONFIGURATION
const MAX_GUESSES = 5;
const MODES = ['text', 'image', 'url'];
const MODE_EMOJI = { text: '💬', image: '📸', url: '🔗' };
const MODE_FILE = {
  text: 'filtered_text_data.json',
  image: 'filtered_image_data.json',
  url: 'filtered_url_data.json'
};
const MODE_SEED_OFFSET = { text: 0, image: 999, url: 1999 };

// Default emojis for unknown users (no repeats per mode)
const DEFAULT_USER_EMOJI_POOL = ['🤔', '🧐', '🐱', '🐶', '🤠', '🥚', '🙂', '🐸'];
const defaultEmojiState = {
  text: { shuffled: null, index: 0 },
  image: { shuffled: null, index: 0 },
  url: { shuffled: null, index: 0 }
};

const WIN_MESSAGES = ["Oh??", "🤠", "👀", "Good job, bud.", "EZ."];
const LOSE_MESSAGES = ["Yikes.", "Bro??", "Skill Issue?", "Uhhh...", "Frick!"];

const HOLIDAY_OVERRIDES = {
  '12/25/2025': {
    text: '1319050976698695760',
    image: '1056752019689459742'
  },
  '1/1/2026': {
    text: '1191265799466393600',
    image: '926701962035097660'
  },
  '3/16/2026': {
    text: '953880386772041758',
    image: '953880973974573097',
    url: '1187368996274700288'
  },
  '3/17/2026': {
    text: '1161929955882565632'
  },
  '4/1/2026': {
    text: '1445515695440920687',
    image: '616492595224510475',
    url: '1100267104948727859'
  },
  '4/5/2026': {
    text: '945906585358708776',
    image: '1465578066465128509',
    url: '1336552097201651823'
  }
};

// STYLES (Discord Dark Theme)
const styles = {
  title: { maxWidth: '600px', margin: '0 auto', padding: '2px', fontFamily: 'normal Helvetica', textAlign: 'center', letterSpacing: '5px', textShadow: '-5px 5px 10px rgba(0, 0, 0, 0.75)' },
  subtitle: { maxWidth: '300px', margin: '0 auto', padding: '2px', marginBottom: '10px', fontFamily: 'normal Helvetica', textAlign: 'center', letterSpacing: '1px' },
  container: { width: 'min(500px, 90%)', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', textAlign: 'center', paddingBottom: '50px' },
  imagePreview: { maxWidth: '100%', maxHeight: '300px', borderRadius: '8px', marginBottom: '20px', cursor: 'zoom-in', transition: 'transform 0.1s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' },
  quoteBox: { background: '#2b2d31', borderLeft: '4px solid #5865F2', padding: '15px', borderRadius: '4px', fontSize: '1.1rem', marginBottom: '20px', textAlign: 'left', color: '#dbdee1' },
  inputGroup: { position: 'relative', marginBottom: '10px' },
  input: { width: '100%', padding: '15px', fontSize: '1rem', borderRadius: '8px', border: 'none', background: '#383a40', color: 'white', outline: 'none', boxShadow: '0 2px 5px rgba(0,0,0,0.2)', boxSizing: 'border-box' },
  dropdown: { position: 'absolute', width: '100%', maxHeight: '200px', overflowY: 'auto', background: '#2b2d31', borderRadius: '0 0 8px 8px', zIndex: 10, textAlign: 'left', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  dropdownItem: { padding: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1' },
  disabledItem: { padding: '10px', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e1f22', color: '#dbdee1', opacity: 0.5, background: '#232428' },
  grid: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: { display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 2fr', gap: '8px' },
  cell: { padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', color: 'white', fontWeight: 'bold', boxShadow: '0 2px 2px rgba(0,0,0,0.2)', minWidth: 0, overflow: 'hidden' },
  avatarSmall: { width: '30px', height: '30px', borderRadius: '50%' },
  btnPrimary: { background: '#5865F2', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s' },
  btnSecondary: { background: '#4f545c', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none' },
  btnDanger: { background: '#6d3b3c', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  resultsBox: { marginTop: '30px', padding: '20px', background: '#2b2d31', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' },
  guessCounter: { fontSize: '0.9rem', color: '#949BA4', marginTop: '5px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalImage: { maxWidth: '95vw', maxHeight: '95vh', borderRadius: '4px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' },
  helpContent: { backgroundColor: '#4f545c', padding: '25px', borderRadius: '8px', maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto', textAlign: 'left', position: 'relative', lineHeight: '1.6' },
  closeBtn: { position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#666' },
  legendTable: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
  legendRow: { borderBottom: '1px solid #eee' },
  legendCell: { padding: '8px', fontSize: '0.9rem' },
  dateDisplay: { position: 'fixed', top: '10px', left: '10px', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', zIndex: 1000, backgroundColor: '#383a40', padding: '4px 8px', borderRadius: '4px', pointerEvents: 'none' }
};

const dateStr = new Date().toLocaleDateString("en-US", {
  timeZone: "America/New_York",
  year: 'numeric',
  month: 'numeric',
  day: 'numeric'
});

const todayStr = new Date().toLocaleDateString("en-US", {
  timeZone: "America/New_York",
  year: 'numeric',
  month: 'short',
  day: 'numeric'
});

// Seed gen based on Eastern time
const getDailySeed = () => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
};

// Mulberry32 PRNG
const mulberry32 = (a) => {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
};

const getPuzzleNumber = () => {
  const [month, day, year] = dateStr.split('/').map(Number);
  const current = Date.UTC(year, month - 1, day);
  const start = Date.UTC(2025, 11, 1); // Dec 1, 2025
  const diffDays = Math.floor((current - start) / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
};

const getNextDefaultEmoji = (mode) => {
  const state = defaultEmojiState[mode] || defaultEmojiState.text;
  if (!state.shuffled) {
    const seed = getDailySeed() + (MODE_SEED_OFFSET[mode] ?? 0);
    const rng = mulberry32(seed);
    const pool = [...DEFAULT_USER_EMOJI_POOL];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    state.shuffled = pool;
    state.index = 0;
  }

  const emoji = state.shuffled[state.index % state.shuffled.length];
  state.index += 1;
  return emoji;
};

const getUserEmoji = (username, mode = 'text') => {
  // Maintain alphabetical order
  if (!username) return `||${getNextDefaultEmoji(mode)}||`;
  switch (username) {
    case 'asura_of_war': return '||:BusyThatDay:||';
    case 'bcguy390': return '||:sus:||';
    case 'coldchowder': return '||:ChowderScuffed:||';
    case 'doncha7': return '||:DonchaHowdy:||';
    case 'dudeman27': return '||:DudemanEZ:||';
    case 'dvrx': return '||:dvrxApproved:||';
    case 'infinitori_': return '||:birb:||';
    case 'iron.urn': return '||:IronUrn:||';
    case 'misder': return '||:Misder:||';
    case 'mrshu': return '||:paperliskpog:||';
    case 'oxray': return '||:0xFEDORA:||';
    case 'phantah': return '||:PhantahBrim:||';
    case 'r0ffles': return '||:RofflesTeemo:||';
    case 'spatika': return '||:frick:||';
    case 'strawberryhoney': return '||:StrawberryKek:||';
    case 'timmy.tam': return '||:TimmahSuh:||';
    case 'tothemoonn': return '||:audacity:||';
    case 'zalteo': return '||:ZalteoSup:||';
    default: return `||${getNextDefaultEmoji(mode)}||`;
  }
};

const getRank = (modes, puzzleNum) => {
  let total = 0;
  for (const m of modes) {
    const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
    if (!saved) return null;
    const d = JSON.parse(saved);
    const g = d.guesses || [];
    const gu = d.gaveUp || false;
    if (gu) {
      total += 6;
    } else if (g.length > 0 && g[g.length - 1].correct) {
      total += g.length;
    } else {
      total += 6;
    }
  }
  switch (total) {
    case 3: return 'S';
    case 4: return 'S-';
    case 5: return 'A+';
    case 6: return 'A';
    case 7: return 'A-';
    case 8: return 'B+';
    case 9: return 'B';
    case 10: return 'B-';
    case 11: return 'C+';
    case 12: return 'C';
    case 13: return 'C-';
    case 14: return 'D+';
    case 15: return 'D';
    case 16: return 'D-';
    case 17: return 'F+';
    default: return 'F';
  }
};

const generateGridString = (guessesArray, gaveUp = false, mode = 'text') => {
  const isPerfect = !gaveUp && guessesArray.length === 1 && guessesArray[0].correct;

  if (isPerfect) return '🟪🟪🟪🟪';

  const rows = guessesArray.map(g => {
    let row = '';
    row += g.correct ? '🟩' : getUserEmoji(g.user.username, mode);
    row += g.rankHint === 'equal' ? '🟩' : (g.rankHint === 'higher' ? '⬆️' : '⬇️');
    row += g.correct ? '🟩' : (g.joinHint === 'earlier' ? '⬅️' : '➡️');
    row += g.correct ? '🟩' : ((g.roleClue === '-' || g.roleClue === 'No new shared roles!') ? '⬛' : '🟨');
    return row;
  });

  if (gaveUp) rows.push('🟥🟥🟥🟥');

  return rows.join('\n');
};

export default function App() {
  const shuffledModes = useMemo(() => {
    const seed = getDailySeed();
    const rng = mulberry32(seed);
    const modes = [...MODES];
    // Fisher-Yates shuffle with seeded RNG
    for (let i = modes.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [modes[i], modes[j]] = [modes[j], modes[i]];
    }
    return modes;
  }, []);

  const [currentMode, setCurrentMode] = useState(() => {
    const puzzleNum = getPuzzleNumber();
    for (const m of shuffledModes) {
      const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
      if (!saved || !JSON.parse(saved).gameOver) return m;
    }
    return shuffledModes[shuffledModes.length - 1]; // all modes complete, show last mode
  });

  const [showHelp, setShowHelp] = useState(false);

  const currentModeIndex = shuffledModes.indexOf(currentMode);
  const isLastMode = currentMode === shuffledModes[shuffledModes.length - 1];
  const advanceMode = () => setCurrentMode(shuffledModes[currentModeIndex + 1]);

  const puzzleNum = getPuzzleNumber();

  return (
    <div style={styles.container}>
      <div style={styles.dateDisplay}>{todayStr}</div>

      {/* HEADER */}
      <div style={styles.header}>
        <div style={{ width: '24px' }} />
        <h1 style={styles.title}>WHODLE <span style={{ fontSize: '0.8em', opacity: 0.5, letterSpacing: '2px' }}>#{puzzleNum}</span></h1>
        <CircleHelp
          size={24}
          style={{ cursor: 'pointer', color: '#555' }}
          onClick={() => setShowHelp(true)}
        />
      </div>

      {/* MODE PROGRESS INDICATOR */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '24px', fontSize: '1.2rem' }}>
        {(() => {
          const activeMode = shuffledModes.find(m => {
            const s = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
            return !s || !JSON.parse(s).gameOver;
          }) ?? shuffledModes[shuffledModes.length - 1];
          return shuffledModes.map(m => {
            const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
            const isDone = saved && JSON.parse(saved).gameOver;
            const isCurrent = m === currentMode;
            const isClickable = (isDone || m === activeMode) && !isCurrent;
            return (
              <React.Fragment key={m}>
                <span
                  title={m}
                  onClick={() => isClickable && setCurrentMode(m)}
                  style={{
                    opacity: isCurrent ? 1 : isDone || m === activeMode ? 1 : 0.25,
                    fontSize: isCurrent ? '2.5rem' : '1.1rem',
                    transition: 'all 0.2s',
                    cursor: isClickable ? 'pointer' : 'default',
                  }}
                >
                  {MODE_EMOJI[m]}
                </span>
              </React.Fragment>
            );
          });
        })()}
      </div>

      <Game
        key={currentMode}
        mode={currentMode}
        shuffledModes={shuffledModes}
        onNextRound={!isLastMode ? advanceMode : null}
      />

      {/* HELP MODAL */}
      {showHelp && (
        <div style={styles.modalOverlay} onClick={() => setShowHelp(false)}>
          <div style={styles.helpContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.closeBtn} onClick={() => setShowHelp(false)}>&times;</button>

            <h2 style={{ marginTop: 0 }}>How to Play</h2>
            <p>Guess which server member sent the message, image, or URL (three rounds played in order).</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>You have <strong>5 guesses</strong> per round.</li>
              <li>Complete all three rounds to share your combined results.</li>
              <li>A new puzzle is available every day at <strong>Midnight EST</strong>.</li>
              <li>Use <strong>Skip</strong> to skip a round and see the answer (counts as a loss).</li>
            </ul>

            <h3>Clues Legend</h3>
            <table style={styles.legendTable}>
              <tbody>
                <tr style={styles.legendRow}>
                  <td style={styles.legendCell}><strong>Rank</strong></td>
                  <td style={styles.legendCell}>
                    <ArrowUp size={16} style={{ verticalAlign: 'middle' }} /> Target is <strong>Higher</strong> rank in the server<br />
                    <ArrowDown size={16} style={{ verticalAlign: 'middle' }} /> Target is <strong>Lower</strong> rank in the server
                  </td>
                </tr>
                <tr style={styles.legendRow}>
                  <td style={styles.legendCell}><strong>Joined</strong></td>
                  <td style={styles.legendCell}>
                    <ArrowLeft size={16} style={{ verticalAlign: 'middle' }} /> Target joined the server <strong>Earlier</strong><br />
                    <ArrowRight size={16} style={{ verticalAlign: 'middle' }} /> Target joined the server <strong>Later</strong>
                  </td>
                </tr>
                <tr style={styles.legendRow}>
                  <td style={styles.legendCell}><strong>Roles</strong></td>
                  <td style={styles.legendCell}>
                    Each incorrect guess reveals a random role shared between the target and your guess (if any). Clues won't repeat.
                    <br /><br /><strong>Role Pool</strong>:<br /> arom?, boomer shooters, exiles, jelley-events, lost arknights, PTCGP, qb-dungeoneers, Rat Gang, readers, riot-games, seattleite, tft, tractor?, val?, variety gamers?
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function UrlPreview({ url, preview }) {
  const [meta, setMeta] = useState(preview ? {
    publisher: preview.publisher,
    title: preview.title,
    description: preview.description,
    image: preview.image ? { url: preview.image } : null,
  } : null);
  const [loading, setLoading] = useState(!preview);

  useEffect(() => {
    if (preview) return; // skip live fetch if pre-generated preview exists

    const isYouTube = /youtube\.com\/watch|youtu\.be\//.test(url);

    if (isYouTube) {
      fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`)
        .then(res => res.json())
        .then(data => setMeta({
          publisher: data.provider_name,
          title: data.title,
          description: data.author_name,
          image: { url: data.thumbnail_url },
        }))
        .catch(() => { })
        .finally(() => setLoading(false));
    } else {
      fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setMeta(data.data);
        })
        .catch(() => { })
        .finally(() => setLoading(false));
    }
  }, [url, preview]);

  let domain = url;
  try { domain = new URL(url).hostname; } catch (_) { }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={styles.quoteBox}>
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#00AFF4', wordBreak: 'break-all' }}>
          {url}
        </a>
      </div>

      {!loading && meta && (
        <div style={{
          border: '1px solid #1e1f22',
          borderLeft: '4px solid #5865F2',
          borderRadius: '0 0 4px 4px',
          padding: '12px',
          background: '#232428',
          textAlign: 'left',
          marginTop: '-16px',
        }}>
          <div style={{ fontSize: '0.75rem', color: '#949BA4', marginBottom: '4px' }}>
            {meta.publisher || domain}
          </div>
          {meta.title && (
            <div style={{ fontWeight: 'bold', color: '#00AFF4', marginBottom: '4px', fontSize: '0.95rem' }}>
              {meta.title}
            </div>
          )}
          {meta.description && (
            <div style={{
              fontSize: '0.85rem', color: '#dbdee1',
              marginBottom: meta.image?.url ? '8px' : 0,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
            }}>
              {meta.description}
            </div>
          )}
          {meta.image?.url && (
            <img
              src={meta.image.url}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '4px', objectFit: 'cover', display: 'block', marginTop: '8px' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Game({ mode, shuffledModes, onNextRound }) {
  const [data, setData] = useState(null);
  const [targetMsg, setTargetMsg] = useState(null);
  const [guesses, setGuesses] = useState([]);
  const [input, setInput] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [combinedRank, setCombinedRank] = useState(null);

  const puzzleNum = getPuzzleNumber();
  const storageKey = `whodle_${mode}_${puzzleNum}`;

  useEffect(() => {
    fetch(`./${MODE_FILE[mode]}`)
      .then(res => res.json())
      .then(json => {
        setData(json);

        let chosenMsg = null;
        const msgPool = json.messages;

        // Holiday overrides
        const override = HOLIDAY_OVERRIDES[dateStr];
        if (override && override[mode]) {
          chosenMsg = json.messages.find(m => m.msg_id === override[mode]) || null;
        }

        if (!chosenMsg) {
          const seed = getDailySeed() + MODE_SEED_OFFSET[mode];
          const rng = mulberry32(seed);
          const randIndex = Math.floor(rng() * msgPool.length);
          chosenMsg = msgPool[randIndex];
        }

        setTargetMsg(chosenMsg);

        const savedState = localStorage.getItem(storageKey);
        if (savedState) {
          const parsed = JSON.parse(savedState);
          setGuesses(parsed.guesses);
          setGameOver(parsed.gameOver);
          if (parsed.gaveUp) setGaveUp(true);
        }
      });
  }, [mode, storageKey]);

  useEffect(() => {
    if (!targetMsg) return;
    const seed = getDailySeed();
    localStorage.setItem(storageKey, JSON.stringify({ seed, guesses, gameOver, gaveUp }));

    // Update combined rank if all modes are complete
    const allComplete = MODES.every(m => {
      const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
      return saved && JSON.parse(saved).gameOver;
    });
    if (allComplete) {
      setCombinedRank(getRank(shuffledModes, puzzleNum));
    }
  }, [guesses, gameOver, gaveUp, targetMsg, shuffledModes, puzzleNum]);

  const filteredUsers = useMemo(() => {
    if (!data || !input) return [];
    const searchStr = input.toLowerCase();

    const matches = Object.values(data.users).filter(u =>
      u.username.toLowerCase().includes(searchStr) ||
      u.nickname.toLowerCase().includes(searchStr) ||
      u.display_name.toLowerCase().includes(searchStr)
    );

    matches.sort((a, b) => {
      const getScore = (u) => {
        const names = [u.username, u.nickname, u.display_name].map(n => n.toLowerCase());
        if (names.some(n => n === searchStr)) return 0;
        if (names.some(n => n.startsWith(searchStr))) return 1;
        return 2;
      };
      const scoreA = getScore(a);
      const scoreB = getScore(b);
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.nickname.length - b.nickname.length;
    });

    return matches;
  }, [data, input]);

  const handleGuess = (user) => {
    if (gameOver) return;
    if (guesses.some(g => g.user.id === user.id)) return;

    const targetUser = data.users[targetMsg.author_id];
    const rankDir = user.rank_val === targetUser.rank_val ? 'equal' : (user.rank_val > targetUser.rank_val ? 'higher' : 'lower');
    const joinDir = user.joined_at === targetUser.joined_at ? 'equal' : (user.joined_at > targetUser.joined_at ? 'earlier' : 'later');

    const isCorrect = user.id === targetUser.id;
    let roleClueText = '';

    if (isCorrect) {
      roleClueText = 'Correct!';
    } else {
      const sharedRoles = user.clues.filter(c => targetUser.clues.includes(c));
      if (sharedRoles.length === 0) {
        roleClueText = '-';
      } else {
        const previouslyRevealed = new Set(
          guesses.map(g => g.roleClue).filter(t => t && t !== '-' && t !== 'No new shared roles!' && t !== 'Correct!')
        );
        const candidates = sharedRoles.filter(r => !previouslyRevealed.has(r));
        roleClueText = candidates.length === 0 ? 'No new shared roles!' : candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    const newGuess = {
      user,
      correct: isCorrect,
      rankHint: rankDir,
      joinHint: joinDir,
      guessIndex: guesses.length,
      sharedClues: user.clues.filter(c => targetUser.clues.includes(c)),
      roleClue: roleClueText
    };

    const updatedGuesses = [...guesses, newGuess];
    setGuesses(updatedGuesses);
    setInput('');

    if (newGuess.correct || updatedGuesses.length >= MAX_GUESSES) {
      setGameOver(true);
    }
  };

  const handleGiveUp = () => {
    setGaveUp(true);
    setGameOver(true);
  };

  // All 3 modes must be complete before sharing
  const canShareCombined = gameOver && MODES.every(m => {
    if (m === mode) return gameOver;
    const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
    return saved && JSON.parse(saved).gameOver;
  });

  const handleCombinedShare = () => {
    const rank = combinedRank || getRank(shuffledModes, puzzleNum);

    let text = `WHODLE #${puzzleNum}\n`;

    for (const m of shuffledModes) {
      const saved = localStorage.getItem(`whodle_${m}_${puzzleNum}`);
      const d = saved ? JSON.parse(saved) : { guesses: [], gaveUp: false };
      const g = d.guesses || [];
      const gu = d.gaveUp || false;
      const isWin = !gu && g.length > 0 && g[g.length - 1].correct;
      const score = isWin ? g.length : 'X';
      text += `${MODE_EMOJI[m]}: ${score}/${MAX_GUESSES}\n${generateGridString(g, gu, m)}\n`;
    }
    text += `Rank: ${rank}\n`;
    text += 'https://vsporeddy.github.io/whodle/';

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getEndGameMessage = () => {
    if (guesses.length === 0 && !gaveUp) return "";
    const isWin = !gaveUp && guesses.length > 0 && guesses[guesses.length - 1].correct;
    if (isWin && guesses.length === 1) return "One shot! 🌟";
    const seed = getDailySeed();
    const list = isWin ? WIN_MESSAGES : LOSE_MESSAGES;
    return list[seed % list.length];
  };

  const getDiscordLink = () => {
    if (!data || !targetMsg) return '#';
    return `https://discord.com/channels/${data.meta.guild_id}/${targetMsg.channel_id}/${targetMsg.msg_id}`;
  };

  const formatMessageContent = (text) => {
    if (!text) return null;
    const regex = /(<@!?\d+>)/g;
    return text.split(regex).map((part, i) => {
      const match = part.match(/<@!?(\d+)>/);
      if (match) {
        const userId = match[1];
        const user = data.users[userId];
        const displayName = user ? `@${user.display_name}` : "@User";
        return (
          <span key={i} style={{ color: '#5865F2', backgroundColor: '#5865F21A', borderRadius: '3px', padding: '0 2px', fontWeight: '500' }}>
            {displayName}
          </span>
        );
      }
      return part;
    });
  };

  if (!data || !targetMsg) return <div style={{ padding: '20px', color: 'white' }}>Loading...</div>;

  const guessesRemaining = MAX_GUESSES - guesses.length;
  const placeholders = { text: 'Who said it...?', image: 'Who posted it...?', url: 'Who shared it...?' };
  const revealLabels = { text: 'message was sent', image: 'image was posted', url: 'link was shared' };

  function GuessRow({ guess }) {
    const GREEN = '#23a559';
    const YELLOW = '#f0b232';
    const GREY = '#4e5058';

    const getRoleBg = (text, isCorrect) => {
      if (isCorrect) return GREEN;
      if (text === '-' || text === 'No new shared roles!') return GREY;
      return YELLOW;
    };

    return (
      <div style={styles.row}>
        <div style={{ ...styles.cell, background: guess.correct ? GREEN : GREY, justifyContent: 'flex-start', gap: '10px', textOverflow: 'ellipsis' }}>
          <img src={guess.user.avatar} style={styles.avatarSmall} alt="" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{guess.user.display_name}</span>
        </div>
        <div style={{ ...styles.cell, background: guess.correct ? GREEN : (guess.rankHint === 'equal' ? GREEN : GREY) }}>
          {guess.rankHint === 'equal' ? <Check size={16} /> : guess.rankHint === 'higher' ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </div>
        <div style={{ ...styles.cell, background: guess.correct ? GREEN : (guess.joinHint === 'equal' ? YELLOW : GREY) }}>
          {guess.joinHint === 'equal' ? <Check size={16} /> : guess.joinHint === 'earlier' ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
        </div>
        <div style={{
          ...styles.cell,
          background: getRoleBg(guess.roleClue, guess.correct),
          fontSize: guess.roleClue === 'No new shared roles!' ? '0.7rem' : '0.85rem',
          flexDirection: 'column',
          lineHeight: '1.1',
          textAlign: 'center',
          wordBreak: 'break-word',
          padding: '5px'
        }}>
          {guess.roleClue === 'Correct!' ? <Check size={16} /> : guess.roleClue}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* MESSAGE DISPLAY */}
      {targetMsg.type === 'image' ? (
        <>
          <img
            src={targetMsg.content}
            style={styles.imagePreview}
            alt="Image"
            onClick={() => setIsZoomed(true)}
            title="Click to zoom"
          />
          {isZoomed && (
            <div style={styles.modalOverlay} onClick={() => setIsZoomed(false)}>
              <img src={targetMsg.content} style={styles.modalImage} alt="Zoomed" />
            </div>
          )}
        </>
      ) : targetMsg.type === 'url' ? (
        <UrlPreview url={targetMsg.content} preview={targetMsg.preview} />
      ) : (
        <div style={styles.quoteBox}>"{formatMessageContent(targetMsg.content)}"</div>
      )}

      {/* INPUT */}
      {!gameOver && (
        <>
          <div style={styles.inputGroup}>
            <input
              style={styles.input}
              placeholder={placeholders[mode]}
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
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.2' }}>
                        <span style={{ fontWeight: 'bold' }}>
                          {u.display_name} {isGuessed && "(Already Guessed)"}
                        </span>
                        <span><small style={{ color: '#666' }}>({u.username})</small></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={styles.guessCounter}>
              {guessesRemaining} guess{guessesRemaining !== 1 ? 'es' : ''} remaining
            </div>
          </div>
        </>
      )}

      {/* GUESS GRID */}
      <div style={styles.grid}>
        {guesses.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 2fr', gap: '5px', fontSize: '0.8rem', opacity: 0.7, marginBottom: '5px', color: '#dbdee1' }}>
            <span>User</span><span>Rank</span><span>Joined</span><span>Roles</span>
          </div>
        )}
        {guesses.map((g, i) => <GuessRow key={i} guess={g} />)}
      </div>

      {!gameOver && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <button style={styles.btnDanger} onClick={handleGiveUp}>
            SKIP
          </button>
        </div>
      )}

      {/* GAME OVER */}
      {gameOver && (
        <div style={styles.resultsBox}>
          <h2 style={{ marginTop: 0 }}>{getEndGameMessage()}</h2>

          <div style={{ marginBottom: '20px' }}>
            The {revealLabels[mode]} by:<br />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
              <img src={data.users[targetMsg.author_id].avatar} style={styles.avatarSmall} alt="" />
              <strong>{data.users[targetMsg.author_id].display_name}</strong>
            </div>
          </div>

          {canShareCombined && combinedRank && (
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '1.2rem' }}>Rank:</span>
              <strong style={{ fontSize: '2rem', color: '#5865F2', transform: 'translateY(3px)' }}>{combinedRank}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {onNextRound ? (
              <button onClick={onNextRound} style={styles.btnPrimary}>
                Next →
              </button>
            ) : (
              canShareCombined && (
                <button onClick={handleCombinedShare} style={styles.btnPrimary}>
                  <Share2 size={18} /> {copied ? "Copied!" : "Share Results"}
                </button>
              )
            )}
            <a href={getDiscordLink()} target="_blank" rel="noopener noreferrer" style={styles.btnSecondary}>
              <ExternalLink size={18} /> Jump to Message
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
