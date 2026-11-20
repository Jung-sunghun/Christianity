var S = {cur:null, era:'all', topic:null, layout:'one'};
var lastEntry = null;

function $(s, r){ return (r||document).querySelector(s); }
function $$(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function docById(id){ return DATA.filter(function(d){ return d.id===id; })[0]; }
/* ── 태블릿·휴대폰 목차 서랍 ─────────────────── */
function openDrawer(){ document.documentElement.classList.add('drawer-open');
  var b=$('#navBtn'); if(b) b.setAttribute('aria-expanded','true'); }
function closeDrawer(){ document.documentElement.classList.remove('drawer-open');
  var b=$('#navBtn'); if(b) b.setAttribute('aria-expanded','false'); }
function drawerOpen(){ return document.documentElement.classList.contains('drawer-open'); }
function toggleDrawer(){ if(drawerOpen()) closeDrawer(); else openDrawer(); }
function topicById(id){ return TOPICS.filter(function(t){ return t.id===id; })[0]; }
function topicNames(ids){ return (ids||[]).map(function(t){ var x=topicById(t); return x?x.name:''; })
  .filter(Boolean); }
function fmtYear(d){ return d.year_label; }

/* ── 테마 · 글자 ───────────────────────────────── */
var THEMES=['white','light','sepia','dark'], TL={white:'◐ 무색',light:'◐ 미색',sepia:'◐ 세피아',dark:'◐ 다크'};
var FS=17;
function setTheme(t){ document.documentElement.setAttribute('data-theme', t);
  var b=$('#themeBtn'); if(b) b.textContent=TL[t]||'◐ 무색'; try{ localStorage.setItem('conf-theme',t); }catch(e){} }
function setFS(v){ FS=Math.max(14, Math.min(24, v)); document.documentElement.style.setProperty('--fs', FS+'px');
  try{ localStorage.setItem('conf-fs', FS); }catch(e){} }

/* ── 검색 색인 ─────────────────────────────────── */
function docText(d){
  var t=[d.title, d.en, d.year_label, d.type_line, d.intro, d.compare, d.sermon,
         d.articles.map(function(a){ return a.n+' '+a.t+' '+a.note; }).join(' '),
         d.doctrine.map(function(x){ return x[0]+' '+x[1]; }).join(' '),
         d.verses.map(function(x){ return x[0]+' '+x[1]; }).join(' '),
         topicNames(d.topics||[]).join(' ')];
  return t.join(' ').toLowerCase();
}
function artText(a){ return (a.n+' '+a.t+' '+a.note+' '+topicNames(a.tp).join(' ')).toLowerCase(); }

function normQ(q){ return (q||'').replace(/[\s\u00a0]+/g,' ').trim(); }

/* 주제 이름·별칭으로 주제 찾기 */
function matchTopic(q){
  var s=q.replace(/\s+/g,''), hit=null;
  TOPICS.forEach(function(t){
    if(hit) return;
    var names=[t.name].concat(t.alias||[]);
    for(var i=0;i<names.length;i++){
      if(names[i].replace(/\s+/g,'')===s){ hit=t; return; }
    }
  });
  if(hit) return hit;
  TOPICS.forEach(function(t){
    if(hit) return;
    var names=[t.name].concat(t.alias||[]);
    for(var i=0;i<names.length;i++){
      if(s.length>=2 && names[i].replace(/\s+/g,'').indexOf(s)>=0){ hit=t; return; }
    }
  });
  return hit;
}
/* 연도·세기 찾기 */
function matchYear(q){
  var s=q.replace(/\s+/g,'');
  var m=s.match(/^(\d{1,2})세기$/);
  if(m){ var c=parseInt(m[1],10); return {type:'century', c:c,
    lo:(c-1)*100+1, hi:c*100, label:c+'세기'}; }
  m=s.match(/^(\d{3,4})년대?$/);
  if(m){ var y=parseInt(m[1],10); return {type:'year', y:y, label:y+'년'}; }
  m=s.match(/^(\d{3,4})$/);
  if(m){ var y2=parseInt(m[1],10); return {type:'year', y:y2, label:y2+'년'}; }
  return null;
}
function docInYear(d, ym){
  if(ym.type==='century') return d.year_sort>=ym.lo && d.year_sort<=ym.hi;
  return d.years && d.years.indexOf(ym.y)>=0 || d.year_sort===ym.y;
}
/* 제목으로 신조 찾기 */
function matchDocsByTitle(q){
  var s=q.toLowerCase().replace(/\s+/g,'');
  return DATA.filter(function(d){
    var hay=(d.title+' '+(d.en||'')).toLowerCase().replace(/\s+/g,'');
    return s.length>=2 && hay.indexOf(s)>=0;
  });
}

/* ── 비교 뷰 구성 ─────────────────────────────── */
function buildCompare(q){
  q=normQ(q); if(!q) return null;
  var out={q:q, kind:'', topic:null, year:null, groups:[], total:0, docsN:0};
  var tp=matchTopic(q);
  if(tp){
    out.kind='topic'; out.topic=tp;
    DATA.forEach(function(d){
      var hits=d.articles.filter(function(a){ return a.tp.indexOf(tp.id)>=0; });
      if(hits.length) out.groups.push({doc:d, arts:hits, mode:'topic'});
    });
  } else {
    var ym=matchYear(q);
    if(ym){
      out.kind='year'; out.year=ym;
      DATA.forEach(function(d){
        if(docInYear(d, ym)) out.groups.push({doc:d, arts:[], mode:'year'});
      });
    } else {
      var docs=matchDocsByTitle(q);
      if(docs.length){
        out.kind='title';
        docs.forEach(function(d){ out.groups.push({doc:d, arts:[], mode:'title'}); });
      } else {
        out.kind='text';
        var low=q.toLowerCase();
        DATA.forEach(function(d){
          var hits=d.articles.filter(function(a){ return artText(a).indexOf(low)>=0; });
          if(hits.length) out.groups.push({doc:d, arts:hits, mode:'text'});
        });
        if(!out.groups.length){
          DATA.forEach(function(d){
            if(docText(d).indexOf(low)>=0) out.groups.push({doc:d, arts:[], mode:'text'});
          });
        }
      }
    }
  }
  out.groups.sort(function(a,b){ return a.doc.year_sort-b.doc.year_sort; });
  out.docsN=out.groups.length;
  out.total=out.groups.reduce(function(n,g){ return n+(g.arts?g.arts.length:0); },0);
  return out;
}

function sumTable(res){
  var rows=res.groups.map(function(g){
    var d=g.doc;
    var arts=g.arts.length?g.arts:(d.articles.slice(0,1));
    var first=arts[0];
    var label=g.arts.length? g.arts.map(function(a){ return a.n; }).join(', ') : '전문 ' + d.articles.length + '개';
    var req=first ? first.t : '';
    if(req.length>70) req=req.slice(0,70)+'…';
    return '<tr class="docrow" data-goto="'+d.id+'"><td class="yr">'+esc(d.year_label.split(' ')[0])+
      '</td><td class="nm">'+esc(d.title)+(d.badge?' <span class="badge cmp">[비교 참고]</span>':'')+
      '</td><td>'+esc(label)+'</td><td>'+esc(req)+'</td></tr>';
  }).join('');
  return '<div class="scrollhint">표는 옆으로 넘겨 볼 수 있습니다 →</div><div class="tscroll"><table class="sumtable"><thead><tr><th>연도</th><th>신조</th><th>해당 조항</th><th>한 줄 요지</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}

function renderCompare(res, opts){
  opts=opts||{};
  var art=$('#artWrap');
  var h=[];
  h.push('<section class="cmpwrap">');
  h.push('<div class="cmpkicker">신조 주제 비교 뷰</div>');
  var kindName={topic:'주제',year:'연도',title:'신조 이름',text:'낱말'}[res.kind]||'검색';
  h.push('<h2>‘'+esc(res.q)+'’ — '+res.docsN+'개 신조를 연도순으로</h2>');
  var sub='';
  if(res.kind==='topic') sub='이 주제를 고백한 조항 '+res.total+'개를 담은 신조 '+res.docsN+'종을 연도순으로 배열했습니다.';
  else if(res.kind==='year') sub=res.year.label+'에 해당하는 신조 '+res.docsN+'종을 연도순으로 배열했습니다.';
  else if(res.kind==='title') sub='이 이름에 해당하는 신조 '+res.docsN+'종입니다.';
  else sub='이 낱말이 나오는 조항 '+res.total+'개를 신조별로 묶어 연도순으로 배열했습니다.';
  h.push('<p class="cmpsub">검색 종류 — <b>'+kindName+'</b> · '+esc(sub)+'</p>');
  h.push('<div class="cmpbar">');
  h.push('<button type="button" data-layout="one"'+(S.layout==='one'?' class="on"':'')+'>차례대로</button>');
  h.push('<button type="button" data-layout="two"'+(S.layout==='two'?' class="on"':'')+'>나란히</button>');
  h.push('<button type="button" id="mxOpen">직접 비교표 만들기 →</button>');
  h.push('<button type="button" data-home="1">표지로</button>');
  h.push('</div>');
  if(res.topic){
    h.push('<div class="topicnote"><div class="tn-row"><b>신조들이 함께 고백하는 것 · 공통점</b><br>'+esc(res.topic.common)+'</div>'+
      '<div class="tn-row"><b>신조마다 갈라지는 자리 · 차이점</b><br>'+esc(res.topic.diff)+'</div></div>');
  }
  if(res.kind==='year'){
    h.push('<div class="topicnote"><div class="tn-row"><b>이 연도의 자리</b><br>'+
      esc(res.groups.map(function(g){ return g.doc.year_label.split(' ')[0]+' '+g.doc.title; }).join(' · '))+
      '</div></div>');
  }
  h.push(sumTable(res));
  h.push('<div class="cmpcards'+(S.layout==='two'?' two':'')+'">');
  if(!res.groups.length){
    h.push('<div class="cmpcard"><b>해당하는 신조가 없습니다.</b><div class="small muted" style="margin-top:.4em">'+
      '주제 예 — 삼위일체 · 성경 · 예정 · 언약 · 율법 · 그리스도 · 성령 · 은혜 · 칭의 · 성화 · 성례 · 세례 · 성찬 · 교회 · 직분 · 예배 · 기도 · 부활 · 자유의지 · 국가<br>'+
      '연도 예 — 325 · 451 · 1536 · 1563 · 1618 · 1647 · 1907 · 16세기</div></div>');
  }
  res.groups.forEach(function(g){
    var d=g.doc;
    var list=(g.arts.length?g.arts:[]).slice(0, opts.allarts?99:6);
    h.push('<div class="cmpcard"><div class="ch" data-goto="'+d.id+'">'+
      '<span class="cy">'+esc(d.year_label.split(' ')[0])+'</span>'+
      '<span class="cn">'+esc(d.title)+'</span>'+
      (d.badge?'<span class="badge cmp">[비교 참고]</span>':'')+
      '<span class="cd">'+esc(d.type_line)+'</span></div>');
    if(g.arts.length){
      h.push('<ul class="hitlist">');
      list.forEach(function(a){
        h.push('<li><span class="hl-n">'+esc(a.n)+'</span>'+esc(a.t)+
          (a.note?'<span class="hl-nt">'+esc(a.note)+'</span>':'')+'</li>');
      });
      h.push('</ul>');
      if(g.arts.length>list.length){
        h.push('<span class="more" data-expand="'+esc(res.q)+'" data-doc="'+d.id+'" data-done="1">'+
          '이 신조의 나머지 '+(g.arts.length-list.length)+'개 조항 더 보기</span>');
      }
    } else {
      h.push('<div class="small muted" style="line-height:1.75">'+esc(d.intro)+'</div>');
      h.push('<div class="small" style="margin-top:.4em;color:var(--muted)">조항 '+d.articles.length+'개 · '+
        esc(d.articles.slice(0,3).map(function(a){ return a.n; }).join(' · '))+' …</div>');
    }
    h.push('</div>');
  });
  h.push('</div>');
  h.push('<div class="foot small muted">비교 뷰는 자료 전체를 대상으로 계산됩니다. 신조 이름을 누르면 그 신조의 전문으로 이동합니다.</div>');
  h.push('</section>');
  art.innerHTML=h.join('');
  art.style.display='block';
  $('#coverWrap').style.display='none'; $('#storyWrap').style.display='none';
  if(hlq) applyHL(hlq);
}

/* ── 직접 비교표 ──────────────────────────────── */
var MX={docs:[], topic:'all'};
/* 《기독교 강요》 초판(1536) ↔ 최종판(1559) 서로 바로 가는 연결 */
var REL={institutes1536:['institutes1559','1559년 최종판 — 4권 80장 전문 보기 →'],
         institutes1559:['institutes1536','1536년 초판 — 6장 전문 보기 ←']};
function mxTopics(){
  var ids=[]; var seen={};
  MX.docs.forEach(function(id){
    var d=docById(id); if(!d) return;
    d.articles.forEach(function(a){ a.tp.forEach(function(t){ if(!seen[t]){seen[t]=1; ids.push(t);} }); });
  });
  return ids;
}
function renderMatrix(){
  var art=$('#artWrap');
  var had=$('#artWrap').innerHTML.length>0;
  var h=[];
  h.push('<section class="mxwrap">');
  h.push('<div class="cmpkicker">직접 비교표</div>');
  h.push('<h2>신조를 골라 주제별로 나란히</h2>');
  h.push('<p class="cmpsub">2~4개 신조를 고르면 주제를 행으로, 신조를 열로 놓은 표가 만들어집니다. '+
    '프리셋을 누르면 바로 표가 서고, 칸의 신조 이름을 누르면 그 신조의 전문으로 갑니다.</p>');
  h.push('<div class="cmpbar">'+
    '<button type="button" data-preset="ancient4">고대 4대 신조 비교</button>'+
    '<button type="button" data-preset="ref3">개혁파 3대 신조 비교</button>'+
    '<button type="button" data-preset="west3">웨스트민스터 3표준서 비교</button>'+
    '<button type="button" data-back="1">← 비교 뷰로</button></div>');
  h.push('<div class="section-label">신조 고르기 — 2~4개</div><div class="mxsel" id="mxSel">');
  DATA.forEach(function(d){
    h.push('<button type="button" data-pick="'+d.id+'"'+(MX.docs.indexOf(d.id)>=0?' class="on"':'')+'>'+
      esc(d.title)+' <span class="small muted">'+esc(d.year_label.split(' ')[0])+'</span></button>');
  });
  h.push('</div>');
  if(MX.docs.length<2){
    h.push('<div class="topicnote">신조를 <b>2개 이상</b> 고르면 표가 만들어집니다. 위 프리셋을 누르면 바로 서는 표를 볼 수 있습니다.</div>');
  } else {
    var tids=mxTopics();
    h.push('<div class="scrollhint">표는 옆으로 넘겨 볼 수 있습니다 →</div>');
    h.push('<div class="mxscroll"><table class="mxtable"><thead><tr><th class="tpc">주제</th>');
    MX.docs.forEach(function(id){ var d=docById(id);
      h.push('<th>'+esc(d.title)+'<br><span class="small muted">'+esc(d.year_label)+'</span></th>'); });
    h.push('</tr></thead><tbody>');
    tids.forEach(function(t){
      var tp=topicById(t); if(!tp) return;
      h.push('<tr><th class="tpc">'+esc(tp.name)+'</th>');
      MX.docs.forEach(function(id){
        var d=docById(id);
        var hits=d.articles.filter(function(a){ return a.tp.indexOf(t)>=0; });
        if(!hits.length){ h.push('<td><span class="empty">—</span></td>'); }
        else {
          h.push('<td>'+hits.map(function(a){
            return '<span class="celln">'+esc(a.n)+'</span><span class="cellt">'+esc(a.t)+'</span>';
          }).join('<br>')+'</td>');
        }
      });
      h.push('</tr>');
    });
    h.push('</tbody></table></div>');
  }
  h.push('<div class="foot small muted">같은 주제를 다루지 않는 신조는 빈칸(—)으로 둡니다. 빈칸도 비교의 정보입니다 — '+
    '그 신조가 그 주제를 직접 다루지 않았다는 뜻입니다.</div>');
  h.push('</section>');
  art.innerHTML=h.join('');
  art.style.display='block';
  $('#coverWrap').style.display='none'; $('#storyWrap').style.display='none';
  window.scrollTo(0,0);
}

/* ── 신조 본문 ────────────────────────────────── */
function qbar(){
  var secs=[['bg','역사적 배경'],['text','전문 보기'],['doc','핵심 교리'],['verse','성경 근거'],['cmp','신조 비교'],['sermon','설교 적용']];
  var h=['<div class="quickbar qb">'];
  h.push('<div class="qb-row"><span class="qgo">바로가기</span><span class="qsep"></span><span class="grow"></span>');
  h.push('<button type="button" class="cpbtn" data-copy="body">본문 복사</button>');
  h.push('<button type="button" class="cpbtn" data-copy="all">전체 복사</button></div>');
  h.push('<div class="qb-row qbtns">');
  secs.forEach(function(s){ h.push('<button type="button" class="qnav" data-qsect="'+s[0]+'">'+s[1]+'</button>'); });
  h.push('</div></div>');
  return h.join('');
}
function sect(id, no, title, inner){
  return '<section class="sect open" id="s-'+id+'"><div class="sect-h"><span class="sn">'+no+'</span>'+
    '<span>'+title+'</span></div><div class="sect-body">'+inner+'</div></section>';
}
function articleHTML(d){
  var h=[];
  h.push('<article class="artpage">');
  h.push('<header class="ahead"><div class="ahead-top"><h2>'+esc(d.title)+
    (d.badge?' <span class="badge cmp">[비교 참고]</span>':'')+
    (!d.badge?' <span class="badge era">'+esc(d.type_line.split(' · ')[0])+'</span>':'')+
    '</h2></div></div>');
  h.push('<div class="ahead-meta">'+esc(d.year_label)+' · 조항 '+d.articles.length+'개 · 주제 '+
    (d.topics||[]).length+'개 · '+esc(d.type_line)+'</div></header>');
  if(REL[d.id]) h.push('<div class="relbar"><button type="button" class="cmpgo" data-goto="'+REL[d.id][0]+'">'+REL[d.id][1]+'</button></div>');
  h.push(qbar());
  /* ① 역사적 배경 */
  var bg=['<div class="bgbox"><div class="bg-title">[역사적 배경]</div><dl class="bglist">'];
  d.bg.forEach(function(x){ bg.push('<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>'); });
  bg.push('</dl></div>');
  bg.push('<p class="intro">'+esc(d.intro)+'</p>');
  if(d.topics&&d.topics.length){
    bg.push('<div class="section-label" style="margin:.2em 0 .35em">이 신조를 여는 주제 — 누르면 비교 뷰</div><div class="tagrow">');
    d.topics.forEach(function(t){ var tp=topicById(t); if(tp) bg.push('<span class="tag" data-topic="'+t+'">'+esc(tp.name)+'</span>'); });
    bg.push('</div>');
  }
  h.push(sect('bg','01','역사적 배경 — 전문 바로 앞', bg.join('')));
  /* ② 전문 */
  var txt=['<ol class="artlist">'];
  d.articles.forEach(function(a){
    txt.push('<li class="artitem" id="'+d.id+'-'+encodeURIComponent(a.n)+'"><div class="arthead"><b class="artn">'+esc(a.n)+'</b>'+
      (a.tp&&a.tp.length?'<span class="arttp">'+esc(topicNames(a.tp).join(' · '))+'</span>':'')+'</div>'+
      '<p class="artt">'+esc(a.t)+'</p>'+
      (a.note?'<p class="artnote">'+esc(a.note)+'</p>':'')+'</li>');
  });
  txt.push('</ol>');
  if(d.orig&&d.orig.length){
    txt.push('<details class="origbox"><summary>원문 병기 — '+esc(d.orig.map(function(o){return o[0];}).join(' · '))+'</summary>');
    d.orig.forEach(function(o){ txt.push('<div class="small muted" style="margin-top:.6em"><b>'+esc(o[0])+'</b></div><div class="orig">'+esc(o[1])+'</div>'); });
    txt.push('</details>');
  }
  h.push(sect('text','02','전문 (Full Text) — '+d.articles.length+'개 조항', txt.join('')));
  /* ③ 핵심 교리 */
  var dc=['<ul class="dlist">'];
  d.doctrine.forEach(function(x){ dc.push('<li><b>'+esc(x[0])+'</b>'+esc(x[1])+'</li>'); });
  dc.push('</ul>');
  h.push(sect('doc','03','핵심 교리', dc.join('')));
  /* ④ 성경 근거 */
  var vs=['<ul class="vlist">'];
  d.verses.forEach(function(x){ vs.push('<li><span class="vref">'+esc(x[0])+'</span>'+esc(x[1])+'</li>'); });
  vs.push('</ul>');
  h.push(sect('verse','04','성경 근거', vs.join('')));
  /* ⑤ 신조 비교 */
  h.push(sect('cmp','05','신조 비교', '<div class="cmptext">'+esc(d.compare)+'</div>'+
    '<div class="cmpbar" style="margin-top:.8em">'+
    '<button type="button" data-topic="'+(d.topics&&d.topics[0]||'trinity')+'">이 신조의 첫 주제로 비교 뷰 열기 →</button>'+
    '<button type="button" id="mxOpen2">직접 비교표에 이 신조 넣기 →</button></div>'));
  /* ⑥ 설교 적용 */
  h.push(sect('sermon','06','설교 적용', '<div class="smtxt">'+esc(d.sermon)+'</div>'));
  /* 이웃 신조 */
  var i=DATA.indexOf(d), prev=DATA[i-1], next=DATA[i+1];
  h.push('<div class="cmpbar" style="margin:22px 0 0">');
  if(prev) h.push('<button type="button" data-goto="'+prev.id+'">← '+esc(prev.title)+' ('+esc(prev.year_label.split(' ')[0])+')</button>');
  if(next) h.push('<button type="button" data-goto="'+next.id+'">'+esc(next.title)+' ('+esc(next.year_label.split(' ')[0])+') →</button>');
  h.push('<button type="button" data-home="1">표지로</button></div>');
  h.push('</article>');
  return h.join('');
}

function showEntry(id, push){
  var d=docById(id); if(!d) return;
  S.cur=id; lastEntry=id;
  var art=$('#artWrap');
  art.innerHTML=articleHTML(d);
  art.style.display='block';
  $('#coverWrap').style.display='none'; $('#storyWrap').style.display='none';
  document.title=d.title+' — 신앙고백 아카이브';
  window.scrollTo(0,0);
  if(push!==false) history.replaceState(null,'','#'+id);
  markToc();
}

/* ── 검색 실행 ────────────────────────────────── */
function runSearch(q, from){
  q=normQ(q);
  if(!q) return;
  var res=buildCompare(q);
  if(!res) return;
  hlq=q;
  renderCompare(res);
  hlq=q;
  var sr=$('#searchResults'); if(sr){ sr.style.display='none'; sr.innerHTML=''; }
  var cr=$('#coverResults'); if(cr) cr.innerHTML='';
  if(from==='side'){ var si=$('#searchInput'); if(si) si.blur(); }
}

/* 검색 제안 (사이드바 입력 중) */
function suggest(host, q){
  q=normQ(q);
  if(!q){ host.style.display='none'; host.innerHTML=''; return; }
  var res=buildCompare(q);
  if(!res){ host.style.display='none'; return; }
  var h=[];
  var kind={topic:'주제 비교',year:'연도 비교',title:'신조',text:'낱말 비교'}[res.kind];
  h.push('<div class="hit" data-run="'+esc(q)+'" style="grid-template-columns:1fr"><b>‘'+esc(q)+'’ — '+kind+
    ' · 신조 '+res.docsN+'종 · 조항 '+res.total+'개</b><span class="small muted">눌러서 [신조 주제 비교 뷰] 열기</span></div>');
  res.groups.slice(0,5).forEach(function(g){
    h.push('<div class="hit" data-goto="'+g.doc.id+'"><span class="small muted">'+esc(g.doc.year_label.split(' ')[0])+
      '</span><span><b>'+esc(g.doc.title)+'</b>'+(g.arts.length?' — '+esc(g.arts.slice(0,3).map(function(a){return a.n;}).join(', ')):'')+'</span></div>');
  });
  host.innerHTML=h.join('');
  host.style.display='grid';
}

/* ── 하이라이트 ───────────────────────────────── */
var hlq='';
function clearHL(){
  var aw=$('#artWrap'); if(!aw) return;
  $$('mark.search-hl', aw).forEach(function(m){
    var p=m.parentNode; if(!p) return;
    p.replaceChild(document.createTextNode(m.textContent), m); p.normalize();
  });
}
function termsOf(q){
  q=normQ(q); if(!q) return [];
  var out=[q];
  var t=matchTopic(q); if(t) out.push(t.name);
  q.split(/\s+/).forEach(function(w){ if(w.length>=2) out.push(w); });
  var seen={}; out=out.filter(function(x){ if(!x||seen[x]) return false; seen[x]=1; return true; });
  out.sort(function(a,b){ return b.length-a.length; });
  return out;
}
function applyHL(q){
  var aw=$('#artWrap'); if(!aw) return 0;
  clearHL();
  var terms=termsOf(q); if(!terms.length) return 0;
  var walker=document.createTreeWalker(aw, NodeFilter.SHOW_TEXT, {acceptNode:function(n){
    if(!n.nodeValue||!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
    var p=n.parentNode; if(!p) return NodeFilter.FILTER_REJECT;
    var tag=(p.nodeName||'').toUpperCase();
    if(tag==='SCRIPT'||tag==='STYLE'||tag==='MARK'||tag==='TEXTAREA') return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  var nodes=[]; while(walker.nextNode()) nodes.push(walker.currentNode);
  var count=0;
  nodes.forEach(function(node){
    var text=node.nodeValue, lower=text.toLowerCase(), hits=[];
    terms.forEach(function(t){
      var lt=t.toLowerCase(), from=0, i;
      while((i=lower.indexOf(lt, from))!==-1){ hits.push([i, i+t.length]); from=i+t.length; }
    });
    if(!hits.length) return;
    hits.sort(function(a,b){ return a[0]-b[0] || (b[1]-b[0])-(a[1]-a[0]); });
    var picked=[], last=-1;
    hits.forEach(function(h){ if(h[0]>=last){ picked.push(h); last=h[1]; } });
    var frag=document.createDocumentFragment(), pos=0;
    picked.forEach(function(h){
      if(h[0]>pos) frag.appendChild(document.createTextNode(text.slice(pos,h[0])));
      var m=document.createElement('mark'); m.className='search-hl';
      m.textContent=text.slice(h[0],h[1]); frag.appendChild(m); count++; pos=h[1];
    });
    if(pos<text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  });
  if(count){
    var first=$('mark.search-hl', aw);
    if(first){
      first.classList.add('first');
      try{ first.scrollIntoView({block:'start', behavior:'auto'}); }catch(e){ first.scrollIntoView(); }
      var tb=$('.topbar'), barH=tb?tb.getBoundingClientRect().height:0;
      var top=first.getBoundingClientRect().top;
      if(top<barH+16){ try{ window.scrollBy({top:top-barH-26, behavior:'auto'}); }catch(e){ window.scrollBy(0, top-barH-26); } }
    }
    toast('‘'+q+'’ <b>'+count+'</b>곳 표시');
  }
  return count;
}
function toast(html){
  var t=$('#hlToast');
  if(!t){ t=document.createElement('div'); t.id='hlToast'; t.className='hltoast'; document.body.appendChild(t); }
  t.innerHTML=html; t.classList.add('show');
  clearTimeout(t._tm); t._tm=setTimeout(function(){ t.classList.remove('show'); }, 3600);
}

/* ── 목차 · 태그 ──────────────────────────────── */
function eraOf(d){ return d.era_key; }
function tocHTML(){
  var groups=ERA.map(function(e){ return {key:e[0], name:e[1], label:e[2]}; });
  var h=[];
  groups.forEach(function(g){
    var docs=DATA.filter(function(d){ return d.era_key===g.key && (S.era==='all'||S.era===g.key); });
    if(!docs.length) return;
    h.push('<li class="grp2">'+esc(g.name)+' · '+esc(g.label)+'</li>');
    docs.forEach(function(d){
      h.push('<li><a data-goto="'+d.id+'" data-doc="'+d.id+'"><span class="yr">'+esc(d.year_label.split(' ')[0])+
        '</span><span class="ttl">'+esc(d.title)+'</span>'+(d.badge?'<span class="bd">비교</span>':'')+'</a></li>');
    });
  });
  if(S.era==='all'){
    var others=DATA.filter(function(d){ return !ERA.some(function(e){ return e[0]===d.era_key; }); });
    if(others.length){
      h.push('<li class="grp2">그 밖</li>');
      others.forEach(function(d){ h.push('<li><a data-goto="'+d.id+'"><span class="yr">'+esc(d.year_label.split(' ')[0])+'</span><span class="ttl">'+esc(d.title)+'</span></a></li>'); });
    }
  }
  return h.join('');
}
function markToc(){
  $$('#toc a').forEach(function(a){ a.classList.toggle('on', a.dataset.doc===S.cur); });
}
function buildToc(){ $('#toc').innerHTML=tocHTML(); markToc(); }
/* 시대 단추 — 목차를 그 시대로 걸러 두고, 오른쪽 본문도 그 시대의 첫 신조로 옮긴다.
   '전체'는 표지(23종 전체 연대기)로 돌아간다.
   태블릿·휴대폰에서 서랍이 열려 있으면 함께 닫혀, 열린 신조가 바로 보인다. */
function eraFirstDoc(key){ return DATA.filter(function(d){ return d.era_key===key; })[0] || null; }
function setEra(key){
  S.era=key;
  $$('#eraBar button').forEach(function(b){ b.classList.toggle('on', b.dataset.era===key); });
  buildToc();
  if(key==='all') showCover();
  else { var first=eraFirstDoc(key); if(first) showEntry(first.id); }
  closeDrawer();
  var a=$('aside'); if(a){ a.scrollTo({top:0,behavior:'smooth'}); }
}
function buildTags(){
  var h=[];
  TOPICS.forEach(function(t){
    h.push('<span class="tag" data-topic="'+t.id+'">'+esc(t.name)+'</span>');
  });
  $('#tagBox').innerHTML=h.join('');
  var c=$('#coverTopics');
  if(c) c.innerHTML=h.join('');
}
function buildYearGrid(){
  var g=$('#yearGrid'); if(!g) return;
  g.innerHTML=DATA.map(function(d){
    return '<button type="button" class="yearcard" data-goto="'+d.id+'"><span class="yy">'+
      esc(d.year_label.split(' ')[0])+'</span><span class="yy2">'+esc(d.title)+
      (d.badge?' <span class="bd2">[비교 참고]</span>':'')+'</span></button>';
  }).join('');
}

/* ── 표지 · 이야기 ────────────────────────────── */
function showCover(){
  S.cur=null;
  $('#coverWrap').style.display='block'; $('#storyWrap').style.display='none'; $('#artWrap').style.display='none';
  document.title='신앙고백 아카이브 — 개혁주의·장로교 정통 신앙고백 연도순 전문과 주제 비교';
  window.scrollTo(0,0); markToc(); history.replaceState(null,'','#home');
}
function showStory(){
  S.cur=null;
  $('#coverWrap').style.display='none'; $('#storyWrap').style.display='block'; $('#artWrap').style.display='none';
  $('#storyBtn').classList.add('on');
  document.title='만든 이야기 — 신앙고백 아카이브';
  window.scrollTo(0,0); markToc(); history.replaceState(null,'','#story');
}

/* ── 복사 ─────────────────────────────────────── */
function plainOf(d, all){
  var L=[];
  L.push(d.title+(d.badge?' [비교 참고]':''));
  L.push('['+d.year_label+'] '+d.type_line); L.push('');
  if(all){
    L.push('[역사적 배경]');
    d.bg.forEach(function(x){ L.push(x[0]+': '+x[1]); }); L.push('');
  }
  L.push('[전문]');
  d.articles.forEach(function(a){ L.push(a.n+'. '+a.t); if(all&&a.note) L.push('   ※ '+a.note); });
  if(all){
    L.push(''); L.push('[핵심 교리]');
    d.doctrine.forEach(function(x){ L.push('· '+x[0]+' — '+x[1]); });
    L.push(''); L.push('[성경 근거]');
    d.verses.forEach(function(x){ L.push('· '+x[0]+' — '+x[1]); });
    L.push(''); L.push('[신조 비교]'); L.push(d.compare);
    L.push(''); L.push('[설교 적용]'); L.push(d.sermon);
  }
  L.push(''); L.push('— 신앙고백 아카이브, '+d.year_label);
  return L.join('\n');
}
function copyText(txt){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(function(){ toast('복사했습니다'); }, function(){ fallbackCopy(txt); });
  } else fallbackCopy(txt);
}
function fallbackCopy(txt){
  var ta=document.createElement('textarea'); ta.value=txt; ta.style.position='fixed'; ta.style.left='-9999px';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('복사했습니다'); }catch(e){ toast('복사하지 못했습니다'); }
  document.body.removeChild(ta);
}

/* ── 이벤트 ───────────────────────────────────── */
function init(){
  try{ var t=localStorage.getItem('conf-theme'); if(t) setTheme(t); else setTheme('white');
       var f=localStorage.getItem('conf-fs'); if(f) setFS(parseInt(f,10)); }catch(e){ setTheme('white'); }
  buildToc(); buildTags(); buildYearGrid();

  /* 전역 클릭 */
  document.addEventListener('click', function(ev){
    var el=ev.target;
    if(el.closest('#navBtn')){ ev.preventDefault(); toggleDrawer(); return; }
    if(el.closest('#drawerClose')||el.closest('#drawerVeil')){ ev.preventDefault(); closeDrawer(); return; }
    if(drawerOpen() && el.closest('aside') &&
       (el.closest('[data-goto]')||el.closest('[data-home]')||el.closest('[data-topic]')||
        el.closest('[data-hub]')||el.closest('.brandbox')||el.closest('[data-runbox]'))) closeDrawer();
    var g=el.closest('[data-goto]');
    if(g){ ev.preventDefault(); showEntry(g.dataset.goto); return; }
    var h=el.closest('[data-home]'); if(h){ ev.preventDefault(); showCover(); return; }
    var tp=el.closest('[data-topic]');
    if(tp){ ev.preventDefault(); var t=topicById(tp.dataset.topic);
      if(t){ runSearch(t.name); S.topic=t.id; } return; }
    var hub=el.closest('[data-hub]');
    if(hub){ ev.preventDefault(); gotoHub(hub.dataset.hub); return; }
    var era=el.closest('[data-era]');
    if(era){ ev.preventDefault(); setEra(era.dataset.era); return; }
    var fs=el.closest('[data-fs]'); if(fs){ setFS(FS+(+fs.dataset.fs)*1); return; }
    if(el.closest('#themeBtn')){ var cur=document.documentElement.getAttribute('data-theme')||'white';
      var i=THEMES.indexOf(cur); setTheme(THEMES[(i+1)%THEMES.length]); return; }
    if(el.closest('#storyBtn')){ showStory(); return; }
    if(el.closest('#homeFab')||el.closest('#brandBox')){ showCover(); return; }
    var lay=el.closest('[data-layout]');
    if(lay){ S.layout=lay.dataset.layout;
      $$('[data-layout]').forEach(function(b){ b.classList.toggle('on', b===lay); });
      var c=$('.cmpcards'); if(c) c.classList.toggle('two', S.layout==='two'); return; }
    if(el.closest('#mxOpen')||el.closest('#mxOpen2')){
      ev.preventDefault();
      var cur=S.cur;
      if(el.closest('#mxOpen2')&&cur&&MX.docs.indexOf(cur)<0){ if(MX.docs.length>=4) MX.docs.shift(); MX.docs.push(cur); }
      renderMatrix(); return;
    }
    var pick=el.closest('[data-pick]');
    if(pick){ var id=pick.dataset.pick, i=MX.docs.indexOf(id);
      if(i>=0) MX.docs.splice(i,1); else { if(MX.docs.length>=4){ toast('4개까지만 고를 수 있습니다'); return; } MX.docs.push(id); }
      renderMatrix(); return; }
    var pre=el.closest('[data-preset]');
    if(pre){ var map={ancient4:['apostles','nicene','chalcedon','athanasian'],
                      ref3:['belgic','heidelberg','helvetic'],
                      west3:['wcf','wsc','wlc']};
      MX.docs=(map[pre.dataset.preset]||[]).filter(function(x){ return docById(x); });
      renderMatrix(); return; }
    if(el.closest('[data-back]')){ if(lastEntry) showEntry(lastEntry); else showCover(); return; }
    var run=el.closest('[data-run]'); if(run){ runSearch(run.dataset.run); return; }
    var rb=el.closest('[data-runbox]');
    if(rb){ var inp=document.getElementById(rb.dataset.runbox); if(inp && inp.value.trim()) runSearch(inp.value); return; }
    var exp=el.closest('[data-expand]');
    if(exp){ var d=docById(exp.dataset.doc); if(d){ showEntry(d.id); if(exp.dataset.expand) { window.setTimeout(function(){ applyHL(exp.dataset.expand); },60); } } return; }
    var cp=el.closest('[data-copy]');
    if(cp){ var doc=docById(S.cur); if(doc) copyText(plainOf(doc, cp.dataset.copy==='all')); return; }
    var qn=el.closest('[data-qsect]');
    if(qn){ var sid='#s-'+qn.dataset.qsect; var tgt=$(sid);
      if(tgt){ $$('.qnav').forEach(function(b){ b.classList.toggle('on', b===qn); });
        tgt.classList.add('open');
        var tb=$('.topbar'), hh=tb?tb.getBoundingClientRect().height:0;
        var dest=tgt.getBoundingClientRect().top + (window.pageYOffset||document.documentElement.scrollTop||0) - hh - 18;
        window.scrollTo({top:Math.max(0, Math.round(dest)), behavior:'smooth'}); }
      return; }
    var sh=el.closest('.sect-h');
    if(sh){ var s=sh.parentNode; s.classList.toggle('open'); return; }
  });

  /* 사이드바 검색 */
  var si=$('#searchInput'), sr=$('#searchResults');
  if(si){
    si.addEventListener('input', function(){ suggest(sr, si.value); });
    si.addEventListener('keydown', function(e){
      if(e.key==='Enter'){ e.preventDefault(); runSearch(si.value, 'side'); closeDrawer(); }
      if(e.key==='Escape'){ si.blur(); sr.style.display='none'; }
    });
    si.addEventListener('focus', function(){ if(si.value) suggest(sr, si.value); });
  }
  var cs=$('#coverSearch'), cr=$('#coverResults');
  if(cs){
    cs.addEventListener('input', function(){ suggest(cr, cs.value); });
    cs.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); runSearch(cs.value, 'cover'); } });
  }
  /* 키보드 */
  document.addEventListener('keydown', function(e){
    var tag=(e.target.tagName||'').toUpperCase();
    if(tag==='INPUT'||tag==='TEXTAREA') return;
    if(e.key==='/'){ e.preventDefault(); var i=$('#searchInput');
      if(i){ if(window.innerWidth<=1024) openDrawer(); i.focus(); i.select(); } return; }
    if(e.key==='Escape'){ if(drawerOpen()){ closeDrawer(); return; } showCover(); return; }
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){
      if(!S.cur) return;
      var i=DATA.map(function(d){ return d.id; }).indexOf(S.cur);
      var n=e.key==='ArrowRight'? i+1 : i-1;
      if(n>=0&&n<DATA.length){ e.preventDefault(); showEntry(DATA[n].id); }
    }
  });
  /* 맨 위로 */
  var t1=$('#toTop'), t2=$('#toTopLeft');
  window.addEventListener('scroll', function(){
    var y=window.pageYOffset||document.documentElement.scrollTop;
    [t1,t2].forEach(function(b){ if(b) b.classList.toggle('show', y>260); });
  });
  if(t1) t1.addEventListener('click', function(){ window.scrollTo({top:0,behavior:'smooth'}); });
  if(t2) t2.addEventListener('click', function(){ var a=$('aside'); if(a){ a.scrollTo({top:0,behavior:'smooth'}); } else window.scrollTo(0,0); });

  /* 창 폭이 PC 폭으로 커지면 서랍을 닫는다 */
  window.addEventListener('resize', function(){ if(window.innerWidth>1024) closeDrawer(); });

  /* 해시 */
  var hs=(location.hash||'').replace('#','');
  if(hs==='story') showStory();
  else if(hs&&hs!=='home'&&docById(hs)) showEntry(hs, false);
  else showCover();
}

/* 상단 메뉴에서 표지 안의 자리로 부드럽게 내려가기 (붙어 있는 상단 바 높이만큼 보정) */
function smoothTo(el){
  if(!el) return;
  var tb=$('.topbar'), hh=tb?tb.getBoundingClientRect().height:0;
  var y=el.getBoundingClientRect().top + (window.pageYOffset||document.documentElement.scrollTop||0) - hh - 16;
  window.scrollTo({top:Math.max(0, Math.round(y)), behavior:'smooth'});
}
function gotoHub(key){
  if(key==='chrono'){ showCover(); var h=$('#hubBox'); if(h) h.scrollIntoView({behavior:'smooth',block:'start'}); return; }
  if(key==='matrix'){ renderMatrix(); return; }
  if(key==='presets'){
    MX.docs=['belgic','heidelberg','helvetic'].filter(function(x){ return docById(x); });
    renderMatrix(); return; }
  if(key==='institutes'){ showEntry('institutes1559'); return; }
  if(key==='topics'){ showCover(); smoothTo($('#topicBox')); return; }
  if(key==='sources'){ showCover(); var sb=$('#srcBox'); if(sb){ sb.open=true; smoothTo(sb); } return; }
  var e=ERA.filter(function(x){ return x[0]===key; })[0];
  if(!e) return;
  setEra(key);
}
document.addEventListener('DOMContentLoaded', init);

</script>