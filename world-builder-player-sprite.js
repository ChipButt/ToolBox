(() => {
'use strict';
const api={width:26,height:36,ready:false,canvas:null,sha256:'41281c57df7063e1bd33a359accc01f3f76f53f5f3cdce69fd834c079d392fdc'};
const img=new Image();
img.onload=()=>{
  const c=document.createElement('canvas');c.width=26;c.height=36;
  const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.drawImage(img,0,0);
  api.canvas=c;api.ready=true;
  window.dispatchEvent(new Event('worldbuilder-player-ready'));
};
img.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAkCAYAAACXOioTAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAGqADAAQAAAABAAAAJAAAAABS2LDtAAACNUlEQVRIDWNgGAWjITAaAqMhMBoCoyEw8CHASIoTcmy8/qOrn3JkG1FmEKUIZDjIkslCv9HtYch9xwoWI2QhC4ZOLAIgS/Ju3WZgsFBAkb194gFDHlCE69JWBoYQhv/4LCPKopMs/xhUkSwBWQAC0VrKYJohIo/BnIEJwsZB4pcFajJ18Phv/oeJAWY4zJzjKi8YQOIgcPrADkZ8vgGpwRlHu9M9wRG/8Sojg3SYPUO41nOGP1HAIAICkCW2TckMK69JMjxddZDBXxuSRlxnbsdpHlgjNgIUL58+HAXjJy9u/Ufmg8RBfJA4TA2Ij80cmBjOOAIHhQ/Df5BrWcMyGEDx9ObMapg+MP/O1esMv1fNYAD5muygg5kIiqOgIEcGS20NBhVtTZgwA8iS41dvMKxbtx8cR3AJHAy8iQEWHAc33wRbAjIchkGWgsRBAKYOhx34hUGaYeGfvPrjfw/XJHCcgOIFhEF8zbq7/0GJ5t6eAnCc4TMRr49gGo9dfsMgndbPkBLbAfYRiH5oWc0gf7yVQTlUHaYML403OcKC5A6nBNhgK10RuGEgy0EWqXx/AU4YoLwEl8TCwCsJUw9KEMKsUmDLYGI8h7LBTEIWwNQTFXQwxSAf7M76C/aJtKgAA8hyYgFBH8F8wyHwjeHHBy6wuSC2iLwSmH3xzDnKkzfIEnQXv/39DG7Jm4f3wNLY1KHrw1kyICsEGc7wGiTyASwM8gWpgGDQgQzE52JiEwOpDiNbPQApJgNIy+lqEgAAAABJRU5ErkJggg==';
window.WorldBuilderPlayerSprite=api;
})();
