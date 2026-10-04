/* Curved photographic surfaces, rendered only while their view changes. */
(() => {
 const vertex = `attribute vec3 aPosition;attribute vec2 aUV;attribute vec3 aNormal;uniform mat4 uMVP;uniform mat4 uModel;uniform vec2 uOffset;varying vec2 vUV;varying vec3 vNormal;void main(){gl_Position=uMVP*vec4(aPosition,1.0);gl_Position.xy+=uOffset*gl_Position.w;vUV=aUV;vNormal=mat3(uModel)*aNormal;}`;
 const fragment = `precision mediump float;uniform sampler2D uImage;uniform vec2 uCrop;uniform float uCenterY;varying vec2 vUV;varying vec3 vNormal;void main(){vec2 q=abs((vUV-.5)*vec2(1.20,1.0))-vec2(.60,.50)+.018;float d=length(max(q,0.0))+min(max(q.x,q.y),0.0)-.018;if(d>0.0)discard;vec2 uv=(vUV-.5)*uCrop+vec2(.5,uCenterY);vec3 color=texture2D(uImage,uv).rgb;float light=mix(.29,1.0,smoothstep(-.65,.5,normalize(vNormal).z));vec3 front=color*vec3(1.0,.975,.96)*light;float visible=smoothstep(-.85,-.25,normalize(vNormal).z);gl_FragColor=vec4(mix(vec3(.16,.09,.13),front,visible),1.0);}`;
 const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 const multiply=(a,b)=>{const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
 const rotateX=a=>{const m=identity(),c=Math.cos(a),s=Math.sin(a);m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
 const rotateY=a=>{const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
 const rotateZ=a=>{const m=identity(),c=Math.cos(a),s=Math.sin(a);m[0]=c;m[1]=s;m[4]=-s;m[5]=c;return m;};
 const translate=(x,y,z)=>{const m=identity();m[12]=x;m[13]=y;m[14]=z;return m;};
 const perspective=(aspect)=>{const f=1/Math.tan(Math.PI/8),near=.1,far=80;return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);};
 class WeddingGalleryRenderer {
  constructor(canvas,images,onReady,onFallback=()=>{}){
   this.canvas=canvas;this.images=images;this.onReady=onReady;this.onFallback=onFallback;this.ready=false;this.initGeneration=0;this.slotCount=10;this.angle=0;
   try{this.gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,powerPreference:'low-power'});}catch{this.onFallback();return;}
   if(!this.gl){this.onFallback();return;}
   canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.initGeneration++;this.ready=false;document.documentElement.classList.remove('ring-has3d');this.onFallback();});
   canvas.addEventListener('webglcontextrestored',()=>{this.startObserver?.disconnect();this.init();});
   // Reserve the ring layout immediately, but decode photos only as guests approach it.
   if('IntersectionObserver' in window){
    this.startObserver=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){this.startObserver.disconnect();this.init();}},{rootMargin:'2000px 0px'});
    this.startObserver.observe(canvas);
   }else this.init();
  }
  shader(type,source){const gl=this.gl,s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error('Gallery shader unavailable');return s;}
  async init(){
   const gl=this.gl,generation=++this.initGeneration;this.failed=false;
   if(gl.isContextLost())return;
   try{
    const program=gl.createProgram();const vs=this.shader(gl.VERTEX_SHADER,vertex),fs=this.shader(gl.FRAGMENT_SHADER,fragment);
    gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Gallery program unavailable');
    this.program=program;gl.useProgram(program);
    this.locations={};['uMVP','uModel','uOffset','uImage','uCrop','uCenterY'].forEach(n=>this.locations[n]=gl.getUniformLocation(program,n));
    this.attributes={};['aPosition','aUV','aNormal'].forEach(n=>this.attributes[n]=gl.getAttribLocation(program,n));
    const positions=[],uvs=[],normals=[],indices=[];
    const columns=64,rows=4,radius=4,height=1.95,arc=(Math.PI*2/this.slotCount)-.026;
    this.photoAspect=radius*arc/height;
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
     const angle=-arc/2+x/columns*arc;
     positions.push(Math.sin(angle)*radius,(y/rows-.5)*height,Math.cos(angle)*radius);
     normals.push(Math.sin(angle),0,Math.cos(angle));uvs.push(x/columns,y/rows);
    }
    for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
     const a=y*(columns+1)+x,b=a+columns+1;indices.push(a,a+1,b,a+1,b+1,b);
    }
    this.mesh={positions,uvs,indices};this.pickFrames=[];
    this.buffers={};
    [['position',positions],['uv',uvs],['normal',normals]].forEach(([name,data])=>{const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);this.buffers[name]=b;});
    this.indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);this.indexCount=indices.length;
    this.textures=await Promise.all(this.images.map((source)=>new Promise((resolve,reject)=>{
     const image=new Image();image.onload=()=>{
      if(generation!==this.initGeneration||gl.isContextLost()){reject(new Error('Gallery context changed'));return;}
      let texture;
      try{
       // Keep GPU memory bounded even when the couple replaces these photos later.
       const limit=Math.min(innerWidth<=700?512:768,gl.getParameter(gl.MAX_TEXTURE_SIZE));
       const ratio=Math.min(1,limit/Math.max(image.naturalWidth,image.naturalHeight));
       let pixels=image;
       if(ratio<1){pixels=document.createElement('canvas');pixels.width=Math.max(1,Math.round(image.naturalWidth*ratio));pixels.height=Math.max(1,Math.round(image.naturalHeight*ratio));pixels.getContext('2d').drawImage(image,0,0,pixels.width,pixels.height);}
       texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
       gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
       if(gl.getError()!==gl.NO_ERROR)throw new Error('Gallery texture unavailable');
       resolve({texture,aspect:image.naturalWidth/image.naturalHeight});
      }catch(error){if(texture)gl.deleteTexture(texture);reject(error);}
     };image.onerror=reject;image.src=source;
    })));
    if(generation!==this.initGeneration||gl.isContextLost())return;
    this.lastFrame=null;this.ready=true;this.onReady();
   }catch{if(generation!==this.initGeneration)return;this.failed=true;this.ready=false;document.documentElement.classList.remove('ring-has3d');this.onFallback();}
  }
  // Pick the visible photographic surface using the same geometry and last-rendered camera.
  pick(clientX,clientY){
   if(!this.ready||!this.pickFrames?.length)return null;
   const rect=this.canvas.getBoundingClientRect(),px=(clientX-rect.left)/rect.width*2-1,py=1-(clientY-rect.top)/rect.height*2;
   if(px<-1||px>1||py<-1||py>1)return null;
   const {positions,uvs,indices}=this.mesh;let nearest=Infinity,result=null;
   for(const frame of this.pickFrames){
    const m=frame.mvp,vertices=[];
    for(let i=0;i<positions.length;i+=3){
     const x=positions[i],y=positions[i+1],z=positions[i+2],w=m[3]*x+m[7]*y+m[11]*z+m[15];
     vertices.push([(m[0]*x+m[4]*y+m[8]*z+m[12])/w,(m[1]*x+m[5]*y+m[9]*z+m[13])/w+this.pickOffset,(m[2]*x+m[6]*y+m[10]*z+m[14])/w,1/w]);
    }
    for(let t=0;t<indices.length;t+=3){
     const ai=indices[t],bi=indices[t+1],ci=indices[t+2],a=vertices[ai],b=vertices[bi],c=vertices[ci];
     const denominator=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(denominator)<1e-10)continue;
     const u=((b[1]-c[1])*(px-c[0])+(c[0]-b[0])*(py-c[1]))/denominator,v=((c[1]-a[1])*(px-c[0])+(a[0]-c[0])*(py-c[1]))/denominator,w=1-u-v;
     if(u<0||v<0||w<0)continue;
     const depth=u*a[2]+v*b[2]+w*c[2];if(depth>=nearest||depth<-1||depth>1)continue;
     const iw=u*a[3]+v*b[3]+w*c[3];
     const tx=(u*uvs[ai*2]*a[3]+v*uvs[bi*2]*b[3]+w*uvs[ci*2]*c[3])/iw,ty=(u*uvs[ai*2+1]*a[3]+v*uvs[bi*2+1]*b[3]+w*uvs[ci*2+1]*c[3])/iw;
     const qx=Math.abs((tx-.5)*1.2)-.6+.018,qy=Math.abs(ty-.5)-.5+.018;
     if(Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-.018>0)continue;
     nearest=depth;result=frame.index;
    }
   }
   return result;
  }
  draw(degrees,tiltX=-15,tiltZ=8){
   if(!this.ready)return;this.angle=degrees;
   const gl=this.gl,canvas=this.canvas,rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
   const dpr=Math.min(devicePixelRatio||1,2);
   const frameKey=`${degrees.toFixed(4)}:${tiltX.toFixed(4)}:${tiltZ.toFixed(4)}:${rect.width}:${rect.height}:${dpr}`;if(this.lastFrame===frameKey)return;this.lastFrame=frameKey;
   const width=Math.round(rect.width*dpr),height=Math.round(rect.height*dpr);
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   gl.viewport(0,0,width,height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.useProgram(this.program);
   [['position','aPosition',3],['uv','aUV',2],['normal','aNormal',3]].forEach(([name,attr,size])=>{gl.bindBuffer(gl.ARRAY_BUFFER,this.buffers[name]);gl.enableVertexAttribArray(this.attributes[attr]);gl.vertexAttribPointer(this.attributes[attr],size,gl.FLOAT,false,0,0);});
   gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.indexBuffer);
   const diameter=Math.min(rect.width*(rect.width<700?1.10:.86),1130);
   let distance=Math.sqrt(16+Math.pow(rect.height/Math.tan(Math.PI/8)*4/diameter,2));
   const heightScale=rect.width<700?1.6:1;
   const stretch=identity();stretch[5]=heightScale;
   const tilt=multiply(multiply(rotateZ(tiltZ*Math.PI/180),rotateX(tiltX*Math.PI/180)),stretch);
   const projection=perspective(rect.width/rect.height);
   // Fit the full rocking envelope once per viewport. The camera never jumps during a tilt.
   const fitKey=`${rect.width}:${rect.height}`;
   if(this.cameraFit?.key!==fitKey){
    for(let fit=0;fit<24;fit++){
     const view=multiply(projection,translate(0,0,-distance));let lowX=Infinity,highX=-Infinity,lowY=Infinity,highY=-Infinity;
     for(const rx of [-21,-15,-9])for(const rz of [-8,0,10]){
      const envelope=multiply(multiply(rotateZ(rz*Math.PI/180),rotateX(rx*Math.PI/180)),stretch),bounds=multiply(view,envelope);
      for(let i=0;i<64;i++)for(const y of [-.975,.975]){const theta=i*Math.PI*2/64,x=Math.sin(theta)*4,z=Math.cos(theta)*4,clipW=bounds[3]*x+bounds[7]*y+bounds[11]*z+bounds[15],cx=(bounds[0]*x+bounds[4]*y+bounds[8]*z+bounds[12])/clipW,cy=(bounds[1]*x+bounds[5]*y+bounds[9]*z+bounds[13])/clipW;lowX=Math.min(lowX,cx);highX=Math.max(highX,cx);lowY=Math.min(lowY,cy);highY=Math.max(highY,cy);}
     }
     if(highY-lowY<1.8&&highX-lowX<(rect.width<700?2.08:1.9))break;distance*=1.035;
    }
    this.cameraFit={key:fitKey,distance};
   }
   distance=this.cameraFit.distance;
   const vp=multiply(projection,translate(0,0,-distance)),bounds=multiply(vp,tilt);let minY=Infinity,maxY=-Infinity;
   for(let i=0;i<96;i++)for(const y of [-.975,.975]){const theta=i*Math.PI*2/96,x=Math.sin(theta)*4,z=Math.cos(theta)*4,cy=(bounds[1]*x+bounds[5]*y+bounds[9]*z+bounds[13])/(bounds[3]*x+bounds[7]*y+bounds[11]*z+bounds[15]);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);}
   const offsetY=-(minY+maxY)/2;this.pickFrames=[];this.pickOffset=offsetY;
   gl.uniform2f(this.locations.uOffset,0,offsetY);
   gl.activeTexture(gl.TEXTURE0);gl.uniform1i(this.locations.uImage,0);
   const photoPosition=-degrees/(360/this.slotCount);
   for(let i=0;i<this.slotCount;i++){
    // Reassign a panel only at the rear; image selection is independent of the ten-panel mesh.
    const logical=i+this.slotCount*Math.floor((photoPosition-i+this.slotCount/2)/this.slotCount);
    const imageIndex=((logical%this.images.length)+this.images.length)%this.images.length;
    const photo=this.textures[imageIndex];
    const model=multiply(tilt,rotateY((degrees+i*360/this.slotCount)*Math.PI/180));
    const mvp=multiply(vp,model);this.pickFrames.push({mvp,index:imageIndex});
    gl.uniformMatrix4fv(this.locations.uModel,false,model);gl.uniformMatrix4fv(this.locations.uMVP,false,mvp);
    const displayAspect=this.photoAspect/heightScale;const cropX=Math.min(1,displayAspect/photo.aspect),cropY=Math.min(1,photo.aspect/displayAspect);
    gl.uniform2f(this.locations.uCrop,cropX,cropY);gl.uniform1f(this.locations.uCenterY,cropY<1?Math.min(.62,1-cropY/2):.5);
    gl.bindTexture(gl.TEXTURE_2D,photo.texture);gl.drawElements(gl.TRIANGLES,this.indexCount,gl.UNSIGNED_SHORT,0);
   }
  }
 }
 window.WeddingGalleryRenderer=WeddingGalleryRenderer;
})();
