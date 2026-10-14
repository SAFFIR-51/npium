(() => {
 addEventListener('pageshow',()=>document.querySelector('.page-wipe')?.classList.remove('leaving'));
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const fine=matchMedia('(pointer: fine)').matches;
 const header=document.querySelector('header');
 const progress=document.querySelector('.scroll-progress');
 const hero=document.querySelector('.hero-visual>img');
 const intro=document.querySelector('.intro-image img');
 let ticking=false;
 function onScroll(){if(ticking)return;ticking=true;requestAnimationFrame(()=>{const y=scrollY;header?.classList.toggle('scrolled',y>35);if(progress)progress.style.transform=`scaleX(${y/Math.max(1,document.documentElement.scrollHeight-innerHeight)})`;if(!reduced){if(hero&&y<innerHeight*1.2)hero.style.translate=`0 ${y*.17}px`;if(intro){const r=intro.parentElement.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)intro.style.translate=`0 ${Math.max(-50,Math.min(50,(innerHeight/2-r.top)*.09))}px`}}ticking=false})}
 addEventListener('scroll',onScroll,{passive:true});onScroll();
 const name=location.pathname.split('/').pop()||'index.html';
 document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')===name));
 if(!reduced&&'IntersectionObserver'in window){document.body.classList.add('motion-ready');const io=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}},{threshold:.08,rootMargin:'0px 0px -25px 0px'});document.querySelectorAll('.section-heading,.about>div,.business-card,.work-card,.team,.global>div,.project-row,.contact-heading,.contact-body,.capability-grid article,.service-summary>div,.people-grid button,.steps article,.manifesto h2,.partner-list h2,.partner-list>div,.faq details,.next-service>a').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--reveal-delay',`${Math.min(i%3*75,150)}ms`);io.observe(el)});
 // Observe filtered portfolio entries as they are rendered.
 const grid=document.querySelector('#work-grid');if(grid)new MutationObserver(()=>grid.querySelectorAll('.work-card').forEach((el,i)=>{el.classList.add('reveal');el.style.setProperty('--reveal-delay',`${i%3*70}ms`);io.observe(el)})).observe(grid,{childList:true});}
 const sources=['media.webp','agency.webp','culture.webp'];const slides=[...document.querySelectorAll('[data-slide]')];let slideIndex=0,slideToken=0;
 function selectSlide(i){slideIndex=i;slides.forEach((b,n)=>b.setAttribute('aria-pressed',String(n===i)));if(!hero)return;const token=++slideToken;const next=new Image();next.onload=()=>{if(token!==slideToken)return;hero.style.opacity='0';setTimeout(()=>{if(token!==slideToken)return;hero.src=next.src;hero.alt=['미디어 제작 현장의 카메라','해외 인재와 산업 현장 이미지','문화 페스티벌 이미지'][i];hero.style.opacity='1'},reduced?0:250)};next.src='assets/'+sources[i]}
 slides.forEach((b,i)=>b.addEventListener('click',()=>selectSlide(i)));
 // Manual selection keeps the hero readable and avoids unexpected image changes.
 if(fine&&!reduced){const halo=document.querySelector('.cursor-halo');let x=0,y=0,cx=0,cy=0,visible=false;document.addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;if(!visible){cx=x;cy=y;visible=true;halo.style.opacity='1'}halo.classList.toggle('engaged',!!e.target.closest('a,button,summary'))},{passive:true});document.addEventListener('pointerleave',()=>{halo.style.opacity='0';visible=false});function cursor(){if(halo&&visible){cx+=(x-cx)*.18;cy+=(y-cy)*.18;halo.style.transform=`translate(${cx-halo.offsetWidth/2}px,${cy-halo.offsetHeight/2}px)`}requestAnimationFrame(cursor)}cursor();document.querySelectorAll('.business-card').forEach(card=>{card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;card.style.setProperty('--mx',px*100+'%');card.style.setProperty('--my',py*100+'%');card.style.transform=`perspective(1000px) rotateX(${(0.5-py)*5}deg) rotateY(${(px-.5)*6}deg)`});card.addEventListener('pointerleave',()=>{card.style.transform=''})});}
 document.querySelectorAll('a[href$=".html"]').forEach(a=>a.addEventListener('click',e=>{if(reduced||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0||a.target)return;const wipe=document.querySelector('.page-wipe');if(!wipe)return;e.preventDefault();wipe.classList.add('leaving');setTimeout(()=>location.assign(a.href),350)}));
 document.querySelectorAll('.contact').forEach(el=>el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.setProperty('--contact-x',(e.clientX-r.left)/r.width*100+'%')},{passive:true}));
})();
