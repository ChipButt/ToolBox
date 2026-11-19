import {Muxer,ArrayBufferTarget} from './vendor/mp4-muxer.mjs';
import {WIDTH,HEIGHT,FPS,FRAMES} from './render.js';
async function addSound(mux){
  const response=await fetch('swipes.aac');if(!response.ok)throw Error('Could not load the swipe audio.');
  const bytes=new Uint8Array(await response.arrayBuffer());
  let offset=0,index=0;
  while(offset+7<=bytes.length){
    if(bytes[offset]!==255||(bytes[offset+1]&246)!==240)throw Error('Invalid swipe audio.');
    const length=((bytes[offset+3]&3)<<11)|(bytes[offset+4]<<3)|(bytes[offset+5]>>5);
    if(length<7||offset+length>bytes.length)throw Error('Incomplete swipe audio.');
    // The source MP4 has one AAC priming packet before time zero.
    if(index>0){const start=Math.round((index-1)*1024e6/44100),end=Math.min(10500000,Math.round(index*1024e6/44100));
      if(end>start)mux.addAudioChunkRaw(bytes.subarray(offset+7,offset+length),'key',start,end-start,index===1?{decoderConfig:{codec:'mp4a.40.2',sampleRate:44100,numberOfChannels:1,description:new Uint8Array([0x12,0x08])}}:undefined)}
    offset+=length;index++;
  }
}
export async function encode(canvas,paint,progress){
  if(!window.VideoEncoder)return record(canvas,paint,progress);
  let config;
  for(const acceleration of ['prefer-hardware','prefer-software','no-preference']){
    const candidate={codec:'avc1.42002a',width:WIDTH,height:HEIGHT,framerate:FPS,bitrate:7000000,hardwareAcceleration:acceleration,avc:{format:'avc'}};
    if((await VideoEncoder.isConfigSupported(candidate)).supported){config=candidate;break}
  }
  if(!config)return record(canvas,paint,progress);
  const target=new ArrayBufferTarget(),mux=new Muxer({target,video:{codec:'avc',width:WIDTH,height:HEIGHT},audio:{codec:'aac',sampleRate:44100,numberOfChannels:1},fastStart:'in-memory'});
  let failure;const encoder=new VideoEncoder({output:(chunk,meta)=>mux.addVideoChunk(chunk,meta),error:e=>failure=e});
  try{
    encoder.configure(config);await addSound(mux);
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
  const type=['video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(t=>window.MediaRecorder?.isTypeSupported(t));
  if(!type)throw Error('Video export is unavailable in this browser.');
  const ac=new AudioContext(),stream=canvas.captureStream(FPS),sound=ac.createBufferSource(),out=ac.createMediaStreamDestination();
  try{
    await ac.resume();sound.buffer=await ac.decodeAudioData(await (await fetch('art/swipes.m4a')).arrayBuffer());sound.connect(out);stream.addTrack(out.stream.getAudioTracks()[0]);
    const recorder=new MediaRecorder(stream,{mimeType:type,videoBitsPerSecond:7000000}),chunks=[];
    const result=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>chunks.push(e.data);recorder.onerror=e=>reject(e.error);recorder.onstop=()=>resolve(new Blob(chunks,{type}))});
    paint(0);recorder.start();const start=ac.currentTime;sound.start(start);
    await new Promise(resolve=>{const timer=setInterval(()=>{const i=Math.floor((ac.currentTime-start)*FPS);if(i>=FRAMES){clearInterval(timer);recorder.stop();resolve()}else{paint(i);progress(i/FRAMES)}},8)});
    return await result;
  }finally{stream.getTracks().forEach(t=>t.stop());await ac.close()}
}
