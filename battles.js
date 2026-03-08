/* ========== Battles / Bracket Mode ========== */
(function(){
  'use strict';

  /* ---------- 50+ Battle Categories ---------- */
  var CATEGORIES = [
    // Physical
    'Fist Fight',
    'Arm Wrestling',
    'Running a Mile',
    'Obstacle Course',
    'Dance Battle',
    'Swimming Race',
    'Rock Climbing',
    'Tug of War',
    'Dodgeball',
    'Parkour Course',
    'Weightlifting Competition',
    'Boxing Match',
    'Yoga Flexibility Challenge',
    'Marathon',

    // Intellectual
    'Jeopardy',
    'Completing a Doctorate Program',
    'Spelling Bee',
    'Chess Match',
    'Trivia Night',
    'Debate Competition',
    'Crossword Puzzle Race',
    'Science Fair',
    'Math Olympics',
    'Rubik\'s Cube Speedrun',
    'Escape Room Challenge',
    'Hackathon',
    'Strategy Board Game',

    // Survival / Adventure
    'Zombie Apocalypse',
    'Survivor (the show)',
    'Deserted Island Survival',
    'Wilderness Camping',
    'Bear Encounter',
    'Hunger Games',
    'Space Mission',
    'Pirate Ship Takeover',
    'Haunted House Last One Standing',
    'Apocalypse Leader',

    // Creative / Personality
    'Cooking Competition',
    'Stand-Up Comedy Show',
    'Fashion Show',
    'Karaoke Contest',
    'Art Competition',
    'Talent Show',
    'Rap Battle',
    'Movie Directing',
    'Writing a Novel',
    'YouTube Channel Growth',
    'TikTok Viral Challenge',

    // Social / Mental
    'Job Interview',
    'First Date Impression',
    'Negotiating a Car Deal',
    'Leading a Team Meeting',
    'Babysitting a Toddler',
    'Public Speaking',
    'Lie Detector Test',
    'Silent Treatment Contest',
    'Persuasion Challenge',
    'Keeping a Secret the Longest',
    'Staying Awake the Longest',
    'Who Cries First Watching a Sad Movie',

    // Fun / Misc
    'Hot Dog Eating Contest',
    'Video Game Tournament',
    'Rock Paper Scissors',
    'Staring Contest',
    'Hide and Seek',
    'Who Gets More Followers',
    'Best Meme Creator',
    'Prank Wars',
    'Road Trip DJ'
  ];

  var TOTAL_ROUNDS = 10;
  var battleState = null; // { tokens:[], category:'', rounds:[], currentRound:0, left:null, right:null, winner:null }

  /* ---------- Helpers ---------- */
  function shuffle(arr){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){
      var j=Math.floor(Math.random()*(i+1));
      var tmp=a[i]; a[i]=a[j]; a[j]=tmp;
    }
    return a;
  }

  function pickCategory(){
    return CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)];
  }

  function tokenMatch(a, b){
    if(!a || !b) return false;
    if(a.type === 'image' && b.type === 'image') return a.src === b.src;
    if(a.type === 'name' && b.type === 'name') return a.name === b.name;
    return false;
  }

  function getTokensFromTray(){
    var tray = document.getElementById('tray');
    if(!tray) return [];
    var tokens = [];
    var els = tray.querySelectorAll('.token');
    for(var i=0;i<els.length;i++){
      var t = els[i];
      var img = t.querySelector('img');
      var lbl = t.querySelector('.label');
      if(img){
        tokens.push({ type:'image', src:img.src, alt:img.alt||'', bg:'' });
      } else if(lbl){
        var bg = t.style.background || t.style.backgroundColor || '#888';
        tokens.push({ type:'name', name:lbl.textContent, bg:bg, textColor:lbl.style.color||'#fff' });
      }
    }
    return tokens;
  }

  function renderTokenCard(tok, side){
    var card = document.createElement('div');
    card.className = 'battle-card battle-card--' + side;
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label','Pick ' + (tok.name || tok.alt || 'this token'));

    var circle = document.createElement('div');
    circle.className = 'battle-circle';

    if(tok.type === 'image'){
      var img = document.createElement('img');
      img.src = tok.src;
      img.alt = tok.alt || '';
      img.draggable = false;
      circle.appendChild(img);
    } else {
      circle.style.background = tok.bg;
      var lbl = document.createElement('div');
      lbl.className = 'battle-label';
      lbl.style.color = tok.textColor || '#fff';
      lbl.textContent = tok.name;
      circle.appendChild(lbl);
      fitBattleLabel(lbl, circle);
    }

    var name = document.createElement('div');
    name.className = 'battle-name';
    name.textContent = tok.name || tok.alt || '';

    card.appendChild(circle);
    card.appendChild(name);
    return card;
  }

  function fitBattleLabel(lbl, container){
    if(!lbl || !container) return;
    var text = lbl.textContent || '';
    if(!text) return;
    var isBracket = container.classList.contains('bracket-circle');
    var max = 32, min = isBracket ? 11 : 8;
    // Use a temp measurement approach
    lbl.style.fontSize = max + 'px';
    requestAnimationFrame(function(){
      var cw = container.offsetWidth * 0.8;
      if(cw <= 0) cw = 80;
      for(var sz = max; sz >= min; sz--){
        lbl.style.fontSize = sz + 'px';
        if(lbl.scrollWidth <= cw) break;
      }
    });
  }

  /* ---------- Battle Board DOM ---------- */
  var bBoard = null;

  function buildBattleBoard(){
    var wrap = document.createElement('div');
    wrap.id = 'battleBoard';
    wrap.innerHTML = [
      '<div class="battle-arena">',
      '  <div class="battle-header">',
      '    <div class="battle-round-label">ROUND <span id="battleRoundNum">1</span> / ' + TOTAL_ROUNDS + '</div>',
      '    <div class="battle-category" id="battleCategory">Loading...</div>',
      '    <div class="battle-progress" id="battleProgress"></div>',
      '  </div>',
      '  <div class="battle-versus" id="battleVersus">',
      '    <div class="battle-slot" id="battleLeft"></div>',
      '    <div class="battle-vs-badge">VS</div>',
      '    <div class="battle-slot" id="battleRight"></div>',
      '  </div>',
      '  <div class="battle-instructions" id="battleInstructions">Pick the winner!</div>',
      '  <div class="battle-actions" id="battleActions">',
      '    <button class="btn battle-btn battle-btn--shuffle" id="battleShuffle" type="button">',
      '      <span class="ico"><img class="btn-icon" src="icons/tournament-bracket-svgrepo-com.svg" alt="" width="18" height="18" /></span>',
      '      <span>New Matchup</span>',
      '    </button>',
      '  </div>',
      '</div>',
      '<div class="battle-results hidden" id="battleResults"></div>'
    ].join('\n');
    return wrap;
  }

  /* ---------- Progress dots ---------- */
  function renderProgress(){
    var el = document.getElementById('battleProgress');
    if(!el || !battleState) return;
    var html = '';
    for(var i = 0; i < TOTAL_ROUNDS; i++){
      var cls = 'progress-dot';
      if(i < battleState.currentRound) cls += ' done';
      else if(i === battleState.currentRound) cls += ' active';
      html += '<div class="' + cls + '"></div>';
    }
    el.innerHTML = html;
  }

  /* ---------- Start / Reset ---------- */
  function startBattle(){
    var tokens = getTokensFromTray();
    if(tokens.length < 2){
      if(typeof live === 'function') live('Need at least 2 tokens in the tray to battle!');
      return;
    }

    var shuffled = shuffle(tokens);
    // We need TOTAL_ROUNDS+1 unique tokens (1 initial + 10 opponents)
    // Build pool that avoids back-to-back repeats when possible
    var pool = shuffled.slice();
    while(pool.length < TOTAL_ROUNDS + 1){
      var batch = shuffle(tokens);
      // Avoid last token of pool being same as first of new batch
      if(pool.length > 0 && batch.length > 1 && tokenMatch(pool[pool.length-1], batch[0])){
        var tmp = batch[0]; batch[0] = batch[1]; batch[1] = tmp;
      }
      pool = pool.concat(batch);
    }

    var category = pickCategory();
    battleState = {
      tokenPool: pool,
      poolIndex: 2, // next unused token index
      category: category,
      rounds: [],
      currentRound: 0,
      left: pool[0],
      right: pool[1],
      winner: null
    };

    showMatchup();
    document.getElementById('battleResults').classList.add('hidden');
    document.getElementById('battleVersus').classList.remove('hidden');
    document.getElementById('battleInstructions').classList.remove('hidden');
    document.getElementById('battleActions').classList.remove('hidden');
  }

  /* Restart same category from round 1 with reshuffled tokens */
  function restartBattle(){
    if(!battleState) { startBattle(); return; }
    var tokens = getTokensFromTray();
    if(tokens.length < 2){
      if(typeof live === 'function') live('Need at least 2 tokens in the tray to battle!');
      return;
    }
    var shuffled = shuffle(tokens);
    var pool = shuffled.slice();
    while(pool.length < TOTAL_ROUNDS + 1){
      var batch = shuffle(tokens);
      if(pool.length > 0 && batch.length > 1 && tokenMatch(pool[pool.length-1], batch[0])){
        var tmp = batch[0]; batch[0] = batch[1]; batch[1] = tmp;
      }
      pool = pool.concat(batch);
    }
    battleState.tokenPool = pool;
    battleState.poolIndex = 2;
    battleState.rounds = [];
    battleState.currentRound = 0;
    battleState.left = pool[0];
    battleState.right = pool[1];
    battleState.winner = null;

    showMatchup();
    document.getElementById('battleResults').classList.add('hidden');
    document.getElementById('battleVersus').classList.remove('hidden');
    document.getElementById('battleInstructions').classList.remove('hidden');
    document.getElementById('battleActions').classList.remove('hidden');
    if(typeof live === 'function') live('Bracket restarted — ' + battleState.category);
  }

  function showMatchup(){
    if(!battleState) return;
    var roundNum = document.getElementById('battleRoundNum');
    var catEl = document.getElementById('battleCategory');
    var leftSlot = document.getElementById('battleLeft');
    var rightSlot = document.getElementById('battleRight');
    var instrEl = document.getElementById('battleInstructions');

    if(roundNum) roundNum.textContent = battleState.currentRound + 1;
    if(catEl) catEl.textContent = battleState.category;
    if(instrEl) instrEl.textContent = 'Who would win at ' + battleState.category + '?';

    // Render left card
    leftSlot.innerHTML = '';
    var leftCard = renderTokenCard(battleState.left, 'left');
    leftSlot.appendChild(leftCard);

    // Render right card
    rightSlot.innerHTML = '';
    var rightCard = renderTokenCard(battleState.right, 'right');
    rightSlot.appendChild(rightCard);

    // Animate entrance
    leftCard.classList.add('enter-left');
    rightCard.classList.add('enter-right');
    setTimeout(function(){
      leftCard.classList.remove('enter-left');
      rightCard.classList.remove('enter-right');
    }, 400);

    // Wire click handlers
    function pickWinner(chosen, loser){
      return function(e){
        e.preventDefault();
        if(typeof vib === 'function') vib(10);

        // Record round
        battleState.rounds.push({
          round: battleState.currentRound + 1,
          left: battleState.left,
          right: battleState.right,
          winner: chosen,
          loser: loser,
          category: battleState.category
        });

        battleState.currentRound++;

        if(battleState.currentRound >= TOTAL_ROUNDS){
          // Battle complete
          battleState.winner = chosen;
          showResults();
        } else {
          // Next round: winner stays, new opponent, same category
          battleState.left = chosen;
          battleState.right = battleState.tokenPool[battleState.poolIndex];
          battleState.poolIndex++;
          // If pool exhausted, refill
          if(battleState.poolIndex >= battleState.tokenPool.length){
            var more = shuffle(getTokensFromTray());
            battleState.tokenPool = battleState.tokenPool.concat(more);
          }
          showMatchup();
        }

        renderProgress();
      };
    }

    leftCard.addEventListener('click', pickWinner(battleState.left, battleState.right));
    leftCard.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); leftCard.click(); }});
    rightCard.addEventListener('click', pickWinner(battleState.right, battleState.left));
    rightCard.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); rightCard.click(); }});

    renderProgress();
  }

  /* ---------- Results ---------- */
  function showResults(){
    if(!battleState) return;
    var versusEl = document.getElementById('battleVersus');
    var instrEl = document.getElementById('battleInstructions');
    var actionsEl = document.getElementById('battleActions');
    var resultsEl = document.getElementById('battleResults');

    versusEl.classList.add('hidden');
    instrEl.classList.add('hidden');
    actionsEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');

    var w = battleState.winner;
    var html = '';

    // Champion banner
    html += '<div class="battle-champion">';
    html += '  <div class="champion-title">' + battleState.category + '</div>';
    html += '  <div class="champion-token">';
    if(w.type === 'image'){
      html += '    <div class="champion-circle"><img src="' + w.src + '" alt="' + (w.alt||'') + '" draggable="false" /></div>';
    } else {
      html += '    <div class="champion-circle" style="background:' + w.bg + '"><div class="battle-label" style="color:' + (w.textColor||'#fff') + '">' + w.name + '</div></div>';
    }
    html += '    <div class="champion-name">' + (w.name || w.alt || '') + '</div>';
    html += '    <div class="champion-subtitle">ULTIMATE WINNER</div>';
    html += '  </div>';
    html += '</div>';

    // Bracket grid
    html += '<div class="bracket-grid">';
    html += '  <div class="bracket-title">BRACKET RESULTS</div>';
    for(var i = 0; i < battleState.rounds.length; i++){
      var r = battleState.rounds[i];
      var isWinnerLeft = (r.winner === r.left);
      html += '<div class="bracket-round">';
      html += '  <div class="bracket-round-header">';
      html += '    <span class="bracket-round-num">Round ' + r.round + '</span>';
      html += '  </div>';
      html += '  <div class="bracket-matchup">';
      html += renderBracketToken(r.left, isWinnerLeft);
      html += '    <span class="bracket-vs">VS</span>';
      html += renderBracketToken(r.right, !isWinnerLeft);
      html += '  </div>';
      html += '</div>';
    }
    html += '</div>';

    resultsEl.innerHTML = html;

    // Bracket circle labels use CSS-only sizing (clamp + word-break)
    // Also fit champion label if text-only
    var champLabel = resultsEl.querySelector('.champion-circle .battle-label');
    if(champLabel) fitBattleLabel(champLabel, champLabel.parentElement);

    if(typeof live === 'function') live((w.name||w.alt||'Champion') + ' is the Ultimate Champion!');
  }

  function renderBracketToken(tok, isWinner){
    var cls = 'bracket-token' + (isWinner ? ' bracket-winner' : ' bracket-loser');
    var html = '<div class="' + cls + '">';
    if(tok.type === 'image'){
      html += '<div class="bracket-circle"><img src="' + tok.src + '" alt="' + (tok.alt||'') + '" draggable="false" /></div>';
    } else {
      html += '<div class="bracket-circle" style="background:' + tok.bg + '"><div class="battle-label" style="color:' + (tok.textColor||'#fff') + '">' + tok.name + '</div></div>';
    }
    html += '<div class="bracket-token-name">' + (tok.name || tok.alt || '') + '</div>';
    html += '</div>';
    return html;
  }

  /* ---------- Save Bracket as PNG ---------- */
  function saveBracket(){
    var resultsEl = document.getElementById('battleResults');
    if(!resultsEl || typeof htmlToImage === 'undefined') return;

    var bgColor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#0e0d1a';

    // Clone into an offscreen container for clean capture
    var cloneWrap = document.createElement('div');
    cloneWrap.style.position = 'fixed';
    cloneWrap.style.left = '-99999px';
    cloneWrap.style.top = '0';

    var clone = resultsEl.cloneNode(true);
    clone.classList.remove('hidden');
    clone.style.width = '800px';
    clone.style.maxWidth = '800px';
    clone.style.padding = '32px';
    clone.style.backgroundColor = bgColor;
    clone.style.boxShadow = 'none';
    clone.style.border = 'none';

    // Inject export styles to ensure consistent rendering
    var style = document.createElement('style');
    var exportCSS = [
      '.battle-champion{ box-shadow:none !important; }',
      '.bracket-round{ box-shadow:none !important; }',
      '.bracket-circle{ width:90px !important; height:90px !important; box-shadow:none !important; }',
      '.bracket-circle .battle-label{ font-size:20px !important; }',
      '.bracket-token-name{ font-size:13px !important; }',
      '.champion-circle{ box-shadow:none !important; border:4px solid #8b7dff !important; }',
      '.bracket-winner .bracket-circle{ box-shadow:none !important; }',
      '.battle-label{ font-family:"Bowlby One",sans-serif !important; }',
      '.champion-title{ font-family:"Bowlby One",sans-serif !important; }',
      '.bracket-title{ font-family:"Bowlby One",sans-serif !important; }',
      '.bracket-round-num{ font-family:"Bowlby One",sans-serif !important; }',
      '.bracket-vs{ font-family:"Bowlby One",sans-serif !important; }',
      '.champion-subtitle{ font-family:"Bowlby One",sans-serif !important; }'
    ];
    if(typeof _bowlbyFontFaceCSS === 'string'){
      exportCSS.unshift(_bowlbyFontFaceCSS);
    }
    style.textContent = exportCSS.join('\n');
    clone.prepend(style);

    cloneWrap.appendChild(clone);
    document.body.appendChild(cloneWrap);

    htmlToImage.toPng(clone, {
      backgroundColor: bgColor,
      pixelRatio: 2
    }).then(function(dataUrl){
      cloneWrap.remove();
      var link = document.createElement('a');
      link.download = 'bracket-results.png';
      link.href = dataUrl;
      link.click();
      if(typeof live === 'function') live('Bracket saved!');
    }).catch(function(err){
      cloneWrap.remove();
      console.error('Bracket save failed:', err);
      if(typeof live === 'function') live('Save failed. Try again.');
    });
  }

  /* ---------- Undo (go back one round) ---------- */
  function battleUndo(){
    if(!battleState || battleState.currentRound <= 0) return;
    if(battleState.winner){
      // Was showing results, go back to last matchup
      battleState.winner = null;
      document.getElementById('battleResults').classList.add('hidden');
      document.getElementById('battleVersus').classList.remove('hidden');
      document.getElementById('battleInstructions').classList.remove('hidden');
      document.getElementById('battleActions').classList.remove('hidden');
    }

    var lastRound = battleState.rounds.pop();
    battleState.currentRound--;
    battleState.poolIndex--;

    // Restore previous matchup
    battleState.left = lastRound.left;
    battleState.right = lastRound.right;
    battleState.category = lastRound.category;

    showMatchup();
    if(typeof live === 'function') live('Undid round ' + (battleState.currentRound + 1));
  }

  /* ---------- Mode Integration ---------- */
  function initBattles(){
    var boardPanel = document.getElementById('boardPanel');
    var tierBoard = document.getElementById('tierBoard');
    if(!boardPanel || !tierBoard) return;

    // Build board
    var container = buildBattleBoard();
    tierBoard.parentNode.insertBefore(container, tierBoard.nextSibling);
    bBoard = container;

    // Wire shuffle button
    var shuffleBtn = document.getElementById('battleShuffle');
    if(shuffleBtn){
      shuffleBtn.addEventListener('click', function(){
        if(typeof animateBtn === 'function') animateBtn(this);
        startBattle();
      });
    }

    // Wire New Bracket button (in main controls area)
    var newBracketBtn = document.getElementById('newBracketBtn');
    if(newBracketBtn){
      newBracketBtn.addEventListener('click', function(){
        if(typeof animateBtn === 'function') animateBtn(this);
        startBattle();
      });
    }
  }

  function showBattleMode(){
    if(!bBoard) return;
    bBoard.classList.add('active');
    document.body.classList.add('battle-mode');
    var tierBoard = document.getElementById('tierBoard');
    if(tierBoard) tierBoard.classList.add('hidden-mode');
    var qBoard = document.getElementById('quadrantBoard');
    if(qBoard) qBoard.classList.remove('active');
    if(typeof hidePromptStack === 'function') hidePromptStack();

    // Start a battle if none active
    if(!battleState || battleState.winner){
      startBattle();
    } else {
      showMatchup();
    }
  }

  function hideBattleMode(){
    if(!bBoard) return;
    bBoard.classList.remove('active');
    document.body.classList.remove('battle-mode');
  }

  /* ---------- Expose globals ---------- */
  window.initBattles = initBattles;
  window.showBattleMode = showBattleMode;
  window.hideBattleMode = hideBattleMode;
  window.battleUndo = battleUndo;
  window.startBattle = startBattle;
  window.restartBattle = restartBattle;
  window.isBattleMode = function(){ return document.body.classList.contains('battle-mode'); };
  window.battleState = function(){ return battleState; };
  window.saveBracket = saveBracket;

})();
