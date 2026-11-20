import {Muxer,ArrayBufferTarget} from './vendor/mp4-muxer.mjs';
import {WIDTH,HEIGHT,FPS,FRAMES} from './render.js';
export async function encode(canvas,paint,progress){
  if(!window.VideoEncoder)return record(canvas,paint,progress);
  let config;
  for(const acceleration of ['prefer-hardware','prefer-software','no-preference']){
    const candidate={codec:'avc1.42002a',width:WIDTH,height:HEIGHT,framerate:FPS,bitrate:7000000,hardwareAcceleration:acceleration,avc:{format:'avc'}};
    if((await VideoEncoder.isConfigSupported(candidate)).supported){config=candidate;break}
  }
  if(!config)return record(canvas,paint,progress);
  const target=new ArrayBufferTarget(),mux=new Muxer({target,video:{codec:'avc',width:WIDTH,height:HEIGHT},fastStart:'in-memory'});
  let failure;const encoder=new VideoEncoder({output:(chunk,meta)=>mux.addVideoChunk(chunk,meta),error:e=>failure=e});
  try{
    encoder.configure(config);
    for(let i=0;i<FRAMES;i++){
      paint(i);const frame=new VideoFrame(canvas,{timestamp:Math.round(i*1e6/FPS),duration:Math.round((i+1)*1e6/FPS)-Math.round(i*1e6/FPS)});
      try{encoder.encode(frame,{keyFrame:i%84===0})}finally{frame.close()}
      if(i%6===5){await encoder.flush();progress((i+1)/FRAMES);await new Promise(r=>setTimeout(r,0))}
      if(failure)throw failure;
    }
    await encoder.flush();mux.finalize();return new Blob([target.buffer],{type:'video/mp4'});
  }finally{if(encoder.state!=='closed')encoder.close()}
}
async function record(canvas,paint,progress){
  const type=['video/mp4','video/webm;codecs=vp9','video/webm'].find(t=>window.MediaRecorder?.isTypeSupported(t));
  if(!type)throw Error('Video export is unavailable in this browser.');
  const stream=canvas.captureStream(FPS);
  try{
    const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:7000000}),chunks=[];
    const result=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onerror=e=>reject(e.error);recorder.onstop=()=>resolve(new Blob(chunks,{type}))});
    paint(0);recorder.start();const start=performance.now();
    await new Promise(resolve=>{const timer=setInterval(()=>{const i=Math.floor((performance.now()-start)*FPS/1000);if(i>=FRAMES){clearInterval(timer);recorder.stop();resolve()}else{paint(i);progress(i/FRAMES)}},8)});
    return await result;
  }finally{stream.getTracks().forEach(t=>t.stop())}
}
