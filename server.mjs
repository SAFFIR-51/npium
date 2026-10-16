import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
const require=createRequire(import.meta.url);
if(existsSync('.env.local'))loadEnvFile('.env.local');
const inquiry=require('./api/inquiry.js');
import http from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,extname} from 'node:path';
const root=resolve('dist');const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.webp':'image/webp','.jpeg':'image/jpeg','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{if(new URL(req.url,'http://localhost').pathname==='/api/inquiry')return inquiry(req,res);try{const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(path!==root&&!path.startsWith(root+'/'))throw Error();const file=path===root?resolve(root,'index.html'):path;res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream'});res.end(await readFile(file))}catch{res.writeHead(404);res.end('Not found')}}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
