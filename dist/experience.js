/* nPIUM — original WebGL motion scenes. No remote runtime or scene dependency. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const mobile=matchMedia('(max-width: 700px)').matches;
 let paused=sessionStorage.getItem('npium-motion-paused')==='true';
 const scenes=[];
 const vertex=`attribute vec3 aPos;attribute vec2 aUV;varying vec2 vUV;varying float vLight;uniform float uTime,uPhase,uAspect,uBend;uniform vec3 uOffset,uRotation;uniform vec2 uScale;uniform vec2 uPointer;
 void main(){vUV=aUV;vec3 p=aPos;float wave=sin(p.x*3.8+uTime*.85+uPhase);p.z+=wave*uBend+pow(p.x,2.)*.26;p.y+=sin(p.x*2.4+uTime*.65+uPhase)*uBend*.25;p.xy*=uScale;float c=cos(uRotation.y),s=sin(uRotation.y);p=vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);c=cos(uRotation.x);s=sin(uRotation.x);p=vec3(p.x,c*p.y-s*p.z,s*p.y+c*p.z);c=cos(uRotation.z);s=sin(uRotation.z);p.xy=mat2(c,-s,s,c)*p.xy;p+=uOffset;p.xy+=uPointer*(.12+(.9+uOffset.z)*.065);float depth=6.-p.z;gl_Position=vec4(p.x*1.6/uAspect,p.y*1.6,0.1,depth);vLight=.86+wave*.12+sin(uRotation.y)*.12;}`;
 const fragment=`precision mediump float;varying vec2 vUV;varying float vLight;uniform sampler2D uTexture;uniform float uAlpha,uBlur,uTime;void main(){vec2 uv=vUV;float fringe=.0015;vec3 col=texture2D(uTexture,uv).rgb;if(uBlur>.0001){col=texture2D(uTexture,uv).rgb*.28;col+=texture2D(uTexture,uv+vec2(uBlur,0.)).rgb*.18;col+=texture2D(uTexture,uv-vec2(uBlur,0.)).rgb*.18;col+=texture2D(uTexture,uv+vec2(0.,uBlur)).rgb*.18;col+=texture2D(uTexture,uv-vec2(0.,uBlur)).rgb*.18;}col.r=mix(col.r,texture2D(uTexture,uv+vec2(fringe,0.)).r,.3);col.b=mix(col.b,texture2D(uTexture,uv-vec2(fringe,0.)).b,.3);float edge=smoothstep(0.,.018,uv.x)*smoothstep(0.,.018,1.-uv.x)*smoothstep(0.,.018,uv.y)*smoothstep(0.,.018,1.-uv.y);gl_FragColor=vec4(col*vLight,uAlpha*edge);}`;
 const bgVertex=`attribute vec3 aPos;varying vec2 vUV;void main(){vUV=aPos.xy*.5+.5;gl_Position=vec4(aPos,1.);}`;
 const bgFragment=`precision mediump float;varying vec2 vUV;uniform float uTime,uAspect,uMode;uniform vec2 uPointer;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}void main(){vec2 p=vUV-.5;p.x*=uAspect;vec2 m=uPointer*.16;float r=length(p-m);float a=atan(p.y-m.y,p.x-m.x);float w=sin(p.x*2.8+p.y*2.+uTime*.18)+sin(p.y*4.-p.x*1.4-uTime*.22);float ribbon=exp(-abs(p.y+.2*sin(p.x*2.+uTime*.18)-uPointer.y*.05)*10.);float halo=exp(-r*2.4);vec3 purple=vec3(.42,.18,.7);vec3 blue=vec3(.08,.32,.53);vec3 pink=vec3(.55,.15,.3);vec3 color=mix(purple,blue,sin(w+uTime*.12)*.5+.5);if(uMode>1.5&&uMode<2.5)color=mix(purple,pink,.5+.5*sin(a*2.+uTime*.15));float light=ribbon*.48+halo*.3;if(uMode>2.5){vec2 g=abs(fract(p*8.+.5)-.5);float grid=1.-smoothstep(.004,.015,min(g.x,g.y));light+=grid*.035;light+=exp(-abs(r-.72-.04*sin(uTime*.3))*70.)*.25;}vec2 cell=floor(vUV*vec2(140.,90.));float star=step(.995,hash(cell))*pow(max(0.,sin(hash(cell)*20.+uTime*.7)),3.)*.35;star*=1.-smoothstep(.05,.23,length(fract(vUV*vec2(140.,90.))-.5));float fineNoise=(hash(vUV+fract(uTime*.00001))-.5)*.02;gl_FragColor=vec4(vec3(.035,.025,.055)+color*light+star+fineNoise,.93);}`;
 function program(gl,vs,fs){function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,vs));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p}
 function buildScene(host){
 const mode=host.dataset.scene;const gallery=mode==='gallery';
 const canvas=document.createElement('canvas');canvas.className='scene-canvas';canvas.setAttribute('aria-hidden','true');host.prepend(canvas);
 const button=document.createElement('button');button.className='scene-pause';button.type='button';button.setAttribute('aria-label','시각 효과 일시정지');button.textContent='Ⅱ MOTION';host.append(button);
 const gl=canvas.getContext('webgl',{alpha:true,antialias:!mobile,premultipliedAlpha:false,powerPreference:'low-power'});
 if(!gl){canvas.remove();button.remove();host.classList.add('scene-fallback');return}
 try{
 const plane=program(gl,vertex,fragment),background=program(gl,bgVertex,bgFragment);
 const vertices=[],indices=[];const nx=mobile?16:26,ny=mobile?10:18;
 for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++)vertices.push((x/nx-.5)*2,(y/ny-.5)*2,0,x/nx,y/ny);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){const a=y*(nx+1)+x,b=a+1,c=a+nx+1;indices.push(a,b,c,b,c+1,c)}
 const vbo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);const ibo=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
 const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,0,1,-1,0,-1,1,0,1,1,0]),gl.STATIC_DRAW);
 const locations={};function u(p,name){const key=(p===plane?'p':'b')+name;return locations[key]??(locations[key]=gl.getUniformLocation(p,name))}
 const textures=[];const files=mode==='network'?['agency.webp','media.webp','culture.webp']:mode==='culture'?['culture.webp','seri.webp','sport.webp','golf.webp']:['seri.webp','opal.webp','sport.webp','korea.webp','minkyo.webp','golf.webp','media.webp','culture.webp','agency.webp'];
 files.forEach((file,index)=>{const img=new Image();img.onload=()=>{const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textures[index]={texture,ratio:img.width/img.height};scene.dirty=true;scene.schedule?.()};img.src='assets/'+file});
 let px=0,py=0,tx=0,ty=0,time=0,last=0;let width=1,height=1;let visible=true,raf=0;
 const count=mobile?(gallery?8:6):(gallery?15:12);const cards=Array.from({length:count},(_,i)=>({phase:i*2.399,depth:-2.8+(i%5)*.9,size:.48+(i%3)*.17,speed:.06+(i%4)*.012}));
 const scene={dirty:true,mode,canvas,host,button,variant:0,draw:render};scenes.push(scene);
 function resize(){const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,gallery?r.height:host.classList.contains('with-image')?Math.min(r.height,720):r.height);const dpr=Math.min(devicePixelRatio||1,mobile?1.25:1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.height=height+'px';gl.viewport(0,0,canvas.width,canvas.height);scene.dirty=true}
 const ro=new ResizeObserver(resize);ro.observe(host);resize();
 host.addEventListener('pointermove',e=>{if(reduced)return;const r=host.getBoundingClientRect();tx=((e.clientX-r.left)/width-.5)*2;ty=-((e.clientY-r.top)/height-.5)*2;scene.dirty=true},{passive:true});host.addEventListener('pointerleave',()=>{if(reduced)return;tx=ty=0;scene.dirty=true});
 function render(now){raf=0;if(!visible||document.hidden)return;const dt=Math.min((now-last)/1000||0,.05);last=now;if(!paused&&!reduced)time+=dt;px+=(tx-px)*.055;py+=(ty-py)*.055;gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);const aspect=width/height;
 gl.useProgram(background);gl.bindBuffer(gl.ARRAY_BUFFER,quad);const bgPos=gl.getAttribLocation(background,'aPos');gl.enableVertexAttribArray(bgPos);gl.vertexAttribPointer(bgPos,3,gl.FLOAT,false,0,0);gl.uniform1f(u(background,'uTime'),time);gl.uniform1f(u(background,'uAspect'),aspect);gl.uniform2f(u(background,'uPointer'),px,py);gl.uniform1f(u(background,'uMode'),mode==='network'||scene.variant===1?3:mode==='culture'||scene.variant===2?2:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
 gl.useProgram(plane);gl.bindBuffer(gl.ARRAY_BUFFER,vbo);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ibo);const pos=gl.getAttribLocation(plane,'aPos'),uv=gl.getAttribLocation(plane,'aUV');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,3,gl.FLOAT,false,20,0);gl.enableVertexAttribArray(uv);gl.vertexAttribPointer(uv,2,gl.FLOAT,false,20,12);gl.uniform1f(u(plane,'uTime'),time);gl.uniform1f(u(plane,'uAspect'),aspect);gl.uniform2f(u(plane,'uPointer'),px,py);
 if(textures.length)cards.forEach((card,i)=>{const tex=host.classList.contains('cinematic')&&scene.variant===1?textures[8]:host.classList.contains('cinematic')&&scene.variant===2?textures[7]:textures[i%textures.length];if(!tex)return;const phase=card.phase;const a=phase+time*card.speed;let x,y,z=card.depth;
 if(gallery){x=Math.cos(a)*aspect*(2.3+(i%2)*.45);y=Math.sin(a)*2.65;z+=Math.sin(a*.7)*.25}
 else{const right=mobile?0.6:aspect*1.45;x=right+Math.cos(a)*aspect*1.35;y=Math.sin(a)*2.9;z+=Math.cos(a)*.25}
 const scale=card.size*(gallery?1.1:.9);gl.uniform3f(u(plane,'uOffset'),x,y,z);gl.uniform3f(u(plane,'uRotation'),Math.sin(time*.27+phase)*.28,Math.sin(time*.22+phase)*.65,Math.sin(a*.7+phase)*.26);gl.uniform2f(u(plane,'uScale'),scale*Math.min(1.6,Math.sqrt(tex.ratio)),scale/Math.min(1.6,Math.sqrt(tex.ratio)));gl.uniform1f(u(plane,'uPhase'),phase);gl.uniform1f(u(plane,'uBend'),.26+(mode==='culture'?.1:0));gl.uniform1f(u(plane,'uAlpha'),gallery?.9:mobile?.38:.75);gl.uniform1f(u(plane,'uBlur'),Math.max(0,-z-.8)*.004);gl.bindTexture(gl.TEXTURE_2D,tex.texture);gl.uniform1i(u(plane,'uTexture'),0);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0)});
 host.dataset.sceneReady='true';scene.dirty=false;if(!reduced&&!paused)raf=requestAnimationFrame(render)}
 function schedule(){if(!raf&&visible&&!document.hidden)raf=requestAnimationFrame(render)}
 scene.schedule=schedule;
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible){last=performance.now();schedule()}else{cancelAnimationFrame(raf);raf=0}},{rootMargin:'60px'}).observe(host);
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else{last=performance.now();schedule()}});
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);host.classList.add('scene-fallback');canvas.style.display='none';button.hidden=true});
 button.addEventListener('click',()=>{paused=!paused;sessionStorage.setItem('npium-motion-paused',String(paused));syncPause();scenes.forEach(s=>s.schedule?.())});
 host.addEventListener('pointermove',()=>{if(paused||reduced)schedule()},{passive:true});
 schedule();
 }catch(error){canvas.remove();button.remove();host.classList.add('scene-fallback');}
 }
 function syncPause(){document.body.classList.toggle('effects-paused',paused||reduced);scenes.forEach(s=>{s.button.textContent=paused?'▶ MOTION':'Ⅱ MOTION';s.button.setAttribute('aria-label',paused?'시각 효과 재생':'시각 효과 일시정지');s.button.setAttribute('aria-pressed',String(paused));if(reduced)s.button.hidden=true})}
 document.querySelectorAll('[data-scene]').forEach(buildScene);syncPause();
 // Different reveal treatments, independent from upward position animation.
 document.querySelectorAll('.section-heading').forEach(el=>el.dataset.reveal='focus');
 document.querySelectorAll('.business-card').forEach((el,i)=>el.dataset.reveal=i%2?'iris':'curtain');
 document.querySelectorAll('.global>div:first-child,.service-summary>div:last-child').forEach(el=>el.dataset.reveal='horizontal');
 document.querySelectorAll('.project-row,.steps article,.capability-grid article,.faq details').forEach(el=>el.dataset.reveal='line');
 document.querySelectorAll('.work-card,.people-grid button').forEach(el=>el.dataset.reveal='shutter');
 document.querySelectorAll('.contact-heading,.next-service>a').forEach(el=>el.dataset.reveal='scale');
 const workGrid=document.querySelector('#work-grid');if(workGrid)new MutationObserver(()=>workGrid.querySelectorAll('.work-card').forEach(el=>el.dataset.reveal='shutter')).observe(workGrid,{childList:true});
 // Scroll-scrubbed manifesto: text fills from dim to solid as it crosses the viewport.
 const manifesto=document.querySelector('.manifesto');if(manifesto){const h=manifesto.querySelector('h2');const text=h.textContent;const original=h.innerHTML;h.setAttribute('aria-label',text);h.innerHTML='<span class="manifesto-ghost" aria-hidden="true">'+original+'</span><span class="manifesto-ink" aria-hidden="true">'+original+'</span>';const update=()=>{const r=manifesto.getBoundingClientRect(),p=Math.max(0,Math.min(1,(innerHeight*.88-r.top)/(r.height*.7)));manifesto.style.setProperty('--ink',reduced?'100%':p*100+'%')};addEventListener('scroll',update,{passive:true});update()}
 const fine=matchMedia('(pointer:fine)').matches;if(fine&&!reduced){document.querySelectorAll('.round-link,.pill-link,.contact-nav').forEach(el=>{el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.translate=`${(e.clientX-r.left-r.width/2)*.14}px ${(e.clientY-r.top-r.height/2)*.2}px`});el.addEventListener('pointerleave',()=>{el.style.translate='0 0'})});}
 // Light sweep and perspective opening for service images while scrolling.
 const image=document.querySelector('.intro-image');if(image&&!reduced){const update=()=>{const r=image.getBoundingClientRect();const p=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight*.8)));image.style.setProperty('--image-open',p);image.style.setProperty('--sweep',p*160-40+'%')};addEventListener('scroll',update,{passive:true});update()}
})();
