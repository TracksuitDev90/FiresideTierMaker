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
  // Non-mutating shuffle — delegates to the shared Fisher-Yates in script.js
  function shuffle(arr){
    return shuffleArray(arr.slice());
  }

  function pickCategory(){
    return CATEGORIES[Math.floor(Math.random()*CATEGORIES.length)];
  }

  function updateBattleUndoBtn(){
    var u = document.getElementById('undoBtn');
    if(!u) return;
    u.disabled = !battleState || battleState.currentRound <= 0;
  }

  function tokenMatch(a, b){
    if(!a || !b) return false;
    if(a.type === 'image' && b.type === 'image') return a.src === b.src;
    if(a.type === 'name' && b.type === 'name') return a.name === b.name;
    return false;
  }

  // Everyone in the list competes — people already ranked in tiers as well as
  // those still in Image Storage (quadrant pins are copies, so skip those).
  function getBattleTokens(){
    var tokens = [];
    var els = document.querySelectorAll('#tray .token, #tierBoard .tier-drop .token');
    for(var i=0;i<els.length;i++){
      var t = els[i];
      var img = t.querySelector('img');
      var lbl = t.querySelector('.label');
      if(img){
        if(!img.src) continue; // still loading from storage
        tokens.push({ type:'image', src:img.src, alt:img.alt||'', bg:'', crop: t.dataset.crop || '' });
      } else if(lbl){
        var bg = t.style.background || t.style.backgroundColor || '#888';
        tokens.push({ type:'name', name:lbl.textContent, bg:bg, textColor:lbl.style.color||'#fff' });
      }
    }
    return tokens;
  }
  function tokenLabel(tok){ return tok.name || tok.alt || 'this image'; }
  function fillCircle(circle, tok){
    if(tok.type === 'image'){
      var img = document.createElement('img');
      img.src = tok.src;
      img.alt = tok.alt || '';
      img.draggable = false;
      var c = (typeof parseCrop === 'function') ? parseCrop(tok.crop) : null;
      if(c && typeof cropTransform === 'function') img.style.transform = cropTransform(c);
      circle.appendChild(img);
    } else {
      circle.style.background = tok.bg;
      var lbl = document.createElement('div');
      lbl.className = 'battle-label';
      lbl.style.color = tok.textColor || '#fff';
      lbl.textContent = tok.name;
      circle.appendChild(lbl);
    }
  }

  function renderTokenCard(tok, side){
    var card = document.createElement('div');
    card.className = 'battle-card battle-card--' + side;
    card.setAttribute('role','button');
    card.setAttribute('tabindex','0');
    card.setAttribute('aria-label','Pick ' + tokenLabel(tok));

    var circle = document.createElement('div');
    circle.className = 'battle-circle';
    fillCircle(circle, tok);
    card.appendChild(circle);
    var lblEl = circle.querySelector('.battle-label');
    if(lblEl) fitBattleLabel(lblEl, circle);

    // Name tokens already show their name inside the circle; only images
    // need a caption underneath.
    if(tok.type === 'image' && tok.alt){
      var name = document.createElement('div');
      name.className = 'battle-name';
      name.textContent = tok.alt;
      card.appendChild(name);
    }
    return card;
  }

  function fitBattleLabel(lbl, container){
    if(!lbl || !container) return;
    var text = lbl.textContent || '';
    if(!text) return;
    var max = 34, min = 10;
    requestAnimationFrame(function(){
      var cw = container.offsetWidth * 0.75;
      if(cw <= 0) cw = 80;
      // Temporarily set width:auto so scrollWidth reflects actual text width
      lbl.style.width = 'auto';
      lbl.style.position = 'static';
      for(var sz = max; sz >= min; sz--){
        lbl.style.fontSize = sz + 'px';
        if(lbl.scrollWidth <= cw) break;
      }
      // Restore absolute positioning
      lbl.style.width = '';
      lbl.style.position = '';
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
      '  <div class="battle-actions" id="battleActions">',
      '  </div>',
      '  <div class="battle-empty hidden" id="battleEmpty" role="status">',
      '    <div class="battle-empty-icon" aria-hidden="true">VS</div>',
      '    <h3 class="battle-empty-title">Add at least 2 people to battle</h3>',
      '    <p class="battle-empty-sub">Type a name or add images above — the matchup starts automatically.</p>',
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

  /* ---------- Empty state ---------- */
  var _waitObs = null;
  function setEmptyState(on){
    var empty = document.getElementById('battleEmpty');
    ['battleVersus','battleActions','battleProgress'].forEach(function(id){
      var el = document.getElementById(id); if(el) el.classList.toggle('hidden', on);
    });
    var hdr = document.querySelector('#battleBoard .battle-header');
    if(hdr) hdr.classList.toggle('hidden', on);
    if(empty) empty.classList.toggle('hidden', !on);
    if(on){
      // Start by itself as soon as there are enough people
      if(!_waitObs && window.MutationObserver){
        _waitObs = new MutationObserver(function(){
          if(!window.isBattleMode || !window.isBattleMode()) return;
          if(getBattleTokens().length >= 2){ stopWaiting(); startBattle(); }
        });
        ['tray','tierBoard'].forEach(function(id){ var el = document.getElementById(id); if(el) _waitObs.observe(el, {childList:true, subtree:true}); });
      }
    } else stopWaiting();
  }
  function stopWaiting(){ if(_waitObs){ _waitObs.disconnect(); _waitObs = null; } }

  /* ---------- Opponent pool ----------
     Opponents are drawn from a shuffled pool that refills when used up. A draw
     never returns the current winner, so nobody ever battles themselves. */
  function drawOpponent(exclude){
    for(var guard = 0; guard < 500; guard++){
      if(battleState.poolIndex >= battleState.tokenPool.length){
        var more = shuffle(getBattleTokens());
        if(!more.length) return null;
        battleState.tokenPool = battleState.tokenPool.concat(more);
      }
      var t = battleState.tokenPool[battleState.poolIndex++];
      if(!tokenMatch(t, exclude)) return t;
    }
    return null;
  }

  /* ---------- Start / Reset ---------- */
  function startBattle(){
    var tokens = getBattleTokens();
    if(tokens.length < 2){
      setEmptyState(true);
      if(typeof live === 'function') live('Add at least 2 people to start a matchup.');
      updateBattleUndoBtn();
      return;
    }
    setEmptyState(false);
    battleState = {
      tokenPool: shuffle(tokens),
      poolIndex: 1,
      category: pickCategory(),
      rounds: [],
      currentRound: 0,
      left: null,
      right: null,
      winner: null
    };
    battleState.left = battleState.tokenPool[0];
    battleState.right = drawOpponent(battleState.left);
    if(!battleState.right){ setEmptyState(true); return; }

    showMatchup();
    document.getElementById('battleResults').classList.add('hidden');
    document.getElementById('battleVersus').classList.remove('hidden');
    document.getElementById('battleActions').classList.remove('hidden');
    updateBattleUndoBtn();
  }

  function snapshotState(){
    if(!battleState) return null;
    var snap = {};
    for(var k in battleState) if(Object.prototype.hasOwnProperty.call(battleState, k)) snap[k] = battleState[k];
    snap.rounds = battleState.rounds.slice();
    snap.tokenPool = battleState.tokenPool.slice();
    return snap;
  }
  function renderState(){
    if(!battleState) return;
    setEmptyState(false);
    if(battleState.winner){ showResults(); renderProgress(); }
    else {
      document.getElementById('battleResults').classList.add('hidden');
      document.getElementById('battleVersus').classList.remove('hidden');
      document.getElementById('battleActions').classList.remove('hidden');
      showMatchup();
    }
    updateBattleUndoBtn();
  }

  /* Restart same category from round 1 with reshuffled tokens. Picks already
     made are confirmed first and can be brought back from the toast. */
  function restartBattle(){
    if(!battleState) { startBattle(); return; }
    var hasProgress = battleState.currentRound > 0;
    function doRestart(){
      var tokens = getBattleTokens();
      if(tokens.length < 2){ startBattle(); return; }
      var snap = hasProgress ? snapshotState() : null;
      battleState.tokenPool = shuffle(tokens);
      battleState.poolIndex = 1;
      battleState.rounds = [];
      battleState.currentRound = 0;
      battleState.left = battleState.tokenPool[0];
      battleState.right = drawOpponent(battleState.left);
      battleState.winner = null;
      renderState();
      if(typeof live === 'function') live('Bracket restarted — ' + battleState.category);
      if(snap && typeof window.showSaveToast === 'function'){
        window.showSaveToast('Bracket restarted', false, { label:'Undo', onClick:function(){ battleState = snap; renderState(); } });
      }
    }
    if(hasProgress && typeof showConfirm === 'function'){
      showConfirm('Restart this bracket?', 'Your ' + battleState.currentRound + ' pick' + (battleState.currentRound === 1 ? '' : 's') + ' so far will be cleared and the matchups reshuffled.', doRestart, 'Restart');
    } else {
      doRestart();
    }
  }

  function showMatchup(){
    if(!battleState) return;
    var roundNum = document.getElementById('battleRoundNum');
    var catEl = document.getElementById('battleCategory');
    var leftSlot = document.getElementById('battleLeft');
    var rightSlot = document.getElementById('battleRight');

    if(roundNum) roundNum.textContent = battleState.currentRound + 1;
    if(catEl) catEl.textContent = battleState.category;

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

    // Wire click handlers. Picks are ignored briefly while the new cards
    // slide in, so a fast double-tap can't also decide the next round.
    var readyAt = Date.now() + 380;
    function pickWinner(chosen, loser){
      return function(e){
        e.preventDefault();
        if(Date.now() < readyAt) return;
        readyAt = Infinity; // one pick per matchup
        if(typeof vib === 'function') vib(10);

        // Record round (with the pool position, so Undo can rewind exactly)
        battleState.rounds.push({
          round: battleState.currentRound + 1,
          left: battleState.left,
          right: battleState.right,
          winner: chosen,
          loser: loser,
          category: battleState.category,
          poolIndex: battleState.poolIndex
        });

        battleState.currentRound++;

        if(battleState.currentRound >= TOTAL_ROUNDS){
          // Battle complete
          battleState.winner = chosen;
          showResults();
        } else {
          // Next round: winner stays, new opponent (never the winner itself)
          var next = drawOpponent(chosen);
          if(!next){ battleState.winner = chosen; showResults(); renderProgress(); updateBattleUndoBtn(); return; }
          battleState.left = chosen;
          battleState.right = next;
          showMatchup();
        }

        renderProgress();
        updateBattleUndoBtn();
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
    var actionsEl = document.getElementById('battleActions');
    var resultsEl = document.getElementById('battleResults');

    versusEl.classList.add('hidden');
    actionsEl.classList.add('hidden');
    resultsEl.classList.remove('hidden');

    var w = battleState.winner;

    // Build results with DOM nodes (never innerHTML) so user-supplied token
    // names/URLs can't inject markup or script.
    resultsEl.textContent = '';

    function makeCircle(tok, circleClass){
      var circle = document.createElement('div');
      circle.className = circleClass;
      fillCircle(circle, tok);
      return circle;
    }

    // Champion banner
    var champion = document.createElement('div');
    champion.className = 'battle-champion';

    var champTitle = document.createElement('div');
    champTitle.className = 'champion-title';
    champTitle.textContent = battleState.category;
    champion.appendChild(champTitle);

    var champToken = document.createElement('div');
    champToken.className = 'champion-token';
    champToken.appendChild(makeCircle(w, 'champion-circle'));

    // Name tokens carry their name inside the circle already
    if(w.type === 'image' && w.alt){
      var champName = document.createElement('div');
      champName.className = 'champion-name';
      champName.textContent = w.alt;
      champToken.appendChild(champName);
    }

    var champSub = document.createElement('div');
    champSub.className = 'champion-subtitle';
    champSub.textContent = 'ULTIMATE WINNER';
    champToken.appendChild(champSub);

    champion.appendChild(champToken);
    resultsEl.appendChild(champion);

    // Bracket grid
    var grid = document.createElement('div');
    grid.className = 'bracket-grid';
    var gridTitle = document.createElement('div');
    gridTitle.className = 'bracket-title';
    gridTitle.textContent = 'BRACKET RESULTS';
    grid.appendChild(gridTitle);

    for(var i = 0; i < battleState.rounds.length; i++){
      var r = battleState.rounds[i];
      var isWinnerLeft = (r.winner === r.left);

      var round = document.createElement('div');
      round.className = 'bracket-round';

      var header = document.createElement('div');
      header.className = 'bracket-round-header';
      var num = document.createElement('span');
      num.className = 'bracket-round-num';
      num.textContent = 'Round ' + r.round;
      header.appendChild(num);
      round.appendChild(header);

      var matchup = document.createElement('div');
      matchup.className = 'bracket-matchup';
      matchup.appendChild(renderBracketToken(r.left, isWinnerLeft));
      var vs = document.createElement('span');
      vs.className = 'bracket-vs';
      vs.textContent = 'VS';
      matchup.appendChild(vs);
      matchup.appendChild(renderBracketToken(r.right, !isWinnerLeft));
      round.appendChild(matchup);

      grid.appendChild(round);
    }
    resultsEl.appendChild(grid);

    // Bracket circle labels use CSS-only sizing (clamp + word-break)
    // Also fit champion label if text-only
    var champLabel = resultsEl.querySelector('.champion-circle .battle-label');
    if(champLabel) fitBattleLabel(champLabel, champLabel.parentElement);

    if(typeof live === 'function') live(tokenLabel(w) + ' is the Ultimate Champion!');
  }

  function renderBracketToken(tok, isWinner){
    var wrap = document.createElement('div');
    wrap.className = 'bracket-token' + (isWinner ? ' bracket-winner' : ' bracket-loser');

    var circle = document.createElement('div');
    circle.className = 'bracket-circle';
    fillCircle(circle, tok);
    wrap.appendChild(circle);

    if(tok.type === 'image' && tok.alt){
      var name = document.createElement('div');
      name.className = 'bracket-token-name';
      name.textContent = tok.alt;
      wrap.appendChild(name);
    }
    return wrap;
  }

  /* ---------- Save Bracket as PNG ---------- */
  function saveBracket(){
    var resultsEl = document.getElementById('battleResults');
    if(!resultsEl) return;

    // The bracket only exists once a champion is crowned — exporting earlier
    // would download a blank image.
    if(!battleState || !battleState.winner){
      if(typeof window.showSaveToast === 'function') window.showSaveToast('Finish all ' + TOTAL_ROUNDS + ' rounds first — then save the bracket', true);
      else if(typeof live === 'function') live('Finish the battle before saving the bracket.');
      return;
    }
    if(typeof window.runExport !== 'function') return;

    window.runExport(function(){
      var bgColor = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#0a0a0a';

      // Clone into an offscreen container for clean capture
      var cloneWrap = document.createElement('div');
      cloneWrap.style.position = 'fixed';
      cloneWrap.style.left = '-99999px';
      cloneWrap.style.top = '0';

      var clone = resultsEl.cloneNode(true);
      clone.removeAttribute('id');
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
        '.champion-circle{ box-shadow:none !important; }',
        '.bracket-winner .bracket-circle{ box-shadow:none !important; }',
        // One typeface across the app: Montserrat everywhere tokens/names appear
        '.battle-label, .champion-title{ font-family:"Montserrat",ui-sans-serif,system-ui,-apple-system,sans-serif !important; font-weight:900 !important; }',
        '.bracket-title, .bracket-round-num, .bracket-vs, .champion-subtitle{ font-family:"Montserrat",ui-sans-serif,system-ui,-apple-system,sans-serif !important; font-weight:900 !important; }'
      ];
      if(typeof _bowlbyFontFaceCSS === 'string' && _bowlbyFontFaceCSS) exportCSS.unshift(_bowlbyFontFaceCSS);
      if(typeof _montserratFontFaceCSS === 'string' && _montserratFontFaceCSS) exportCSS.unshift(_montserratFontFaceCSS);
      style.textContent = exportCSS.join('\n');
      clone.prepend(style);

      cloneWrap.appendChild(clone);
      document.body.appendChild(cloneWrap);
      var slug = String(battleState.category || 'bracket').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
      return { node: clone, wrap: cloneWrap, backgroundColor: bgColor, filename: (slug ? slug + '-' : '') + 'bracket.png' };
    });
  }

  /* ---------- Undo (go back one round) ---------- */
  function battleUndo(){
    if(!battleState || battleState.currentRound <= 0) return;
    var fromResults = !!battleState.winner;
    if(fromResults){
      // Was showing results, go back to last matchup
      battleState.winner = null;
      document.getElementById('battleResults').classList.add('hidden');
      document.getElementById('battleVersus').classList.remove('hidden');
      document.getElementById('battleActions').classList.remove('hidden');
    }

    var lastRound = battleState.rounds.pop();
    battleState.currentRound--;
    // Rewind the pool to exactly where it was before this round's draw
    if(typeof lastRound.poolIndex === 'number') battleState.poolIndex = lastRound.poolIndex;

    // Restore previous matchup
    battleState.left = lastRound.left;
    battleState.right = lastRound.right;
    battleState.category = lastRound.category;

    showMatchup();
    updateBattleUndoBtn();
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

    // Wire New Matchup button (in main controls area)
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
      setEmptyState(false);
      showMatchup();
    }
    updateBattleUndoBtn();
  }

  function hideBattleMode(){
    if(!bBoard) return;
    bBoard.classList.remove('active');
    document.body.classList.remove('battle-mode');
    stopWaiting();
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
